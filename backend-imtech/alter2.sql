-- ============================================
-- ALTER 2 : toutes les évolutions du schéma (ex-dossier migrations/, 001 à 007)
-- ============================================
-- Chaque bloc s'exécute UNE SEULE FOIS, dans l'ordre, sur une base existante.
-- Base locale (gestion_formation_db) : à jour jusqu'au bloc 007 inclus (10/10/2026).
-- Nouvelle évolution : l'ajouter À LA FIN avec un nouveau numéro (008, 009...)
-- et n'exécuter que ce nouveau bloc.

-- ============================================
-- MIGRATION 001 : commentaires écrits par n'importe quel utilisateur
-- ============================================
USE gestion_formation_db;

ALTER TABLE commentaire
  MODIFY id_etudiant INT NULL,
  ADD COLUMN id_utilisateur INT NULL AFTER id_etudiant,
  ADD CONSTRAINT fk_commentaire_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur);


-- ============================================
-- MIGRATION 002 : statut de validation des paiements
-- ============================================
-- Un paiement fait par un étudiant (app mobile) est "en_attente"
-- jusqu'à ce que l'Accueil / le Super Admin le valide ou le refuse.
-- Seuls les paiements "valide" comptent dans les totaux, le dashboard et les factures.
-- `etat` garde son rôle habituel de suppression logique.

USE gestion_formation_db;

ALTER TABLE paiement
  ADD COLUMN statut ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'valide' AFTER reference_virement;

-- Les paiements existants ont été saisis par le personnel : ils sont considérés comme validés.
UPDATE paiement SET statut = 'valide';

-- Accélère la recherche de la session à chaque requête authentifiée.
CREATE INDEX idx_sessions_token ON sessions(token);


-- ============================================
-- MIGRATION 003 : assistance, rappels, notes d'attestation
-- ============================================
USE gestion_formation_db;

-- 1. Statuts des demandes d'assistance (table `statut` jusqu'ici vide)
INSERT INTO statut (nom, etat)
SELECT 'En attente', true FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM statut WHERE nom = 'En attente');

INSERT INTO statut (nom, etat)
SELECT 'Résolu', true FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM statut WHERE nom = 'Résolu');

-- 2. Date de résolution d'une demande d'assistance
ALTER TABLE assistance
  ADD COLUMN date_resolution DATETIME NULL AFTER date_envoi;

-- 3. Dernier rappel de paiement envoyé manuellement par l'Accueil
ALTER TABLE echeance
  ADD COLUMN date_dernier_rappel DATETIME NULL;

-- 4. Note d'attestation
--    note_suggeree     : calculée selon l'activité de l'étudiant (commentaires, réactions, paiements)
--    criteres_atteints : nombre de critères d'activité atteints (0 à 3)
--    note_attestation  : note choisie par le formateur (NULL = on garde la suggestion)
ALTER TABLE inscription
  ADD COLUMN criteres_atteints TINYINT NULL,
  ADD COLUMN note_suggeree DECIMAL(4,2) NULL,
  ADD COLUMN note_attestation DECIMAL(4,2) NULL;

-- 5. Alertes automatiques déjà envoyées au personnel (évite les doublons)
--    type : 'echeance_j2' (id_reference = id_echeance) ou 'fin_formation' (id_reference = id_inscription)
CREATE TABLE alerte_envoyee (
    id_alerte INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    id_reference INT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_alerte UNIQUE (type, id_reference)
);


-- ============================================
-- MIGRATION 004 : présence automatique et nouvelle note d'attestation (/20)
-- ============================================
-- Note /20 = paiement (2 ou 5) + présence (2, 3 ou 5) -> note système sur 10
--          + présentation (0 à 10, libre, donnée par le formateur)
USE gestion_formation_db;

-- 1. Présence : une ligne par étudiant et par jour où il a utilisé l'application.
--    Remplie automatiquement à chaque requête authentifiée d'un étudiant.
--    (La table `sessions` ne suffit pas : une session dure 24 h et n'est créée qu'à la
--     connexion, un étudiant resté connecté ne crée pas de nouvelle session le lendemain.)
CREATE TABLE presence (
    id_presence INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    jour DATE NOT NULL,
    CONSTRAINT uq_presence UNIQUE (id_utilisateur, jour),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);

-- 2. Reprise de l'historique : chaque jour où un étudiant s'est connecté (table sessions)
INSERT IGNORE INTO presence (id_utilisateur, jour)
SELECT DISTINCT s.id_utilisateur, DATE(s.cree_le)
FROM sessions s
JOIN etudiant e ON e.id_utilisateur = s.id_utilisateur;

-- 3. Inscription :
--    note_suggeree     : désormais la note SYSTÈME sur 10 (paiement + présence)
--    nb_presences      : jours de présence comptés lors du dernier calcul
--    note_presentation : note libre du formateur sur 10 (remplace note_attestation, qui était sur 20)
--    criteres_atteints : supprimé (ancien barème commentaires / réactions / paiement)
ALTER TABLE inscription
  DROP COLUMN criteres_atteints,
  ADD COLUMN nb_presences INT NULL AFTER note_suggeree,
  CHANGE COLUMN note_attestation note_presentation DECIMAL(4,2) NULL;

-- Les anciennes notes étaient sur 20 : elles ne sont plus valables
UPDATE inscription SET note_suggeree = NULL, note_presentation = NULL;


-- ============================================
-- MIGRATION 005 : envoi programmé des supports de cours
-- ============================================
-- Un formateur peut programmer l'envoi d'un support : il reste un brouillon modifiable
-- (invisible pour les étudiants) jusqu'à l'heure prévue, puis il est publié automatiquement.
--   1 h avant : les étudiants inscrits sont prévenus (« ... va envoyer le support X dans une heure »)
--   à l'heure : publication + notification aux étudiants et au formateur
USE gestion_formation_db;

ALTER TABLE support
  ADD COLUMN statut ENUM('programme', 'publie') NOT NULL DEFAULT 'publie' AFTER fichier,
  ADD COLUMN date_envoi_prevue DATETIME NULL AFTER statut,
  ADD COLUMN annonce_envoyee BOOLEAN NOT NULL DEFAULT FALSE AFTER date_envoi_prevue;

-- Le planificateur cherche chaque minute les supports programmés arrivés à échéance
CREATE INDEX idx_support_programme ON support(statut, date_envoi_prevue);


-- ============================================
-- MIGRATION 006 : réponses aux commentaires et réaction « Je n'aime pas »
-- ============================================
USE gestion_formation_db;

-- 1. Fil de discussion comme sur les réseaux sociaux :
--    id_parent NULL = commentaire principal ; sinon réponse à ce commentaire principal.
--    Un seul niveau : une réponse à une réponse est rattachée au même commentaire principal.
ALTER TABLE commentaire
  ADD COLUMN id_parent INT NULL AFTER id_support,
  ADD CONSTRAINT fk_commentaire_parent FOREIGN KEY (id_parent) REFERENCES commentaire(id_commentaire) ON DELETE CASCADE;

CREATE INDEX idx_commentaire_parent ON commentaire(id_parent);

-- 2. Réaction négative : sert, avec les autres, à évaluer les formateurs (avis par réaction)
INSERT INTO type_reaction (nom, icone, etat)
SELECT 'dislike', '👎', true FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM type_reaction WHERE nom = 'dislike');


-- ============================================
-- MIGRATION 007 : vitrine publique et inscription en ligne
-- ============================================
USE gestion_formation_db;

-- 1. Engagement du formateur sur sa disponibilité, affiché dans la vitrine
--    (ex. « Disponible du lundi au vendredi, réponse aux questions sous 24 h »)
ALTER TABLE formation
  ADD COLUMN engagement_formateur TEXT NULL AFTER description;

-- 2. Origine de l'inscription : saisie par l'Accueil, ou faite en ligne depuis l'application mobile
--    (dans ce cas le premier paiement est déclaré par l'étudiant et attend la validation)
ALTER TABLE inscription
  ADD COLUMN origine ENUM('accueil', 'en_ligne') NOT NULL DEFAULT 'accueil' AFTER valide;




-- ============================================
-- MIGRATION 008 : supports mis en forme (texte riche) et supports audio / vidéo
-- ============================================
-- Un support peut désormais être un texte mis en forme (gras, italique, titres, listes, liens),
-- avec ou sans pièce jointe. La pièce jointe peut aussi être un audio ou une vidéo.
--   contenu : HTML nettoyé par le serveur (balises autorisées seulement, voir utils/contenuRiche.js)
--   fichier : déjà NULL autorisé ; NULL = support texte seul
USE gestion_formation_db;

ALTER TABLE support
  ADD COLUMN contenu MEDIUMTEXT NULL AFTER titre;


-- ============================================
-- MIGRATION 009 : image de couverture des formations (vitrine « Découvrir »)
-- ============================================
-- Chemin "formations/xxx.jpg" dans uploads/ ; les couvertures sont publiques (vitrine sans connexion).
-- Les images de démonstration sont téléchargées par : node scripts/fichiersDemo.js
USE gestion_formation_db;

ALTER TABLE formation
  ADD COLUMN image VARCHAR(255) NULL AFTER engagement_formateur;

-- Formations de démonstration (donneesTest.sql) : couvertures téléchargées par le script
UPDATE formation SET image = 'formations/demo-developpement-web.jpg' WHERE nom = 'Développement web' AND image IS NULL;
UPDATE formation SET image = 'formations/demo-bureautique.jpg' WHERE nom = 'Bureautique' AND image IS NULL;
UPDATE formation SET image = 'formations/demo-reseaux.jpg' WHERE nom = 'Réseaux informatiques' AND image IS NULL;
UPDATE formation SET image = 'formations/demo-infographie.jpg' WHERE nom = 'Infographie' AND image IS NULL;
UPDATE formation SET image = 'formations/demo-python.jpg' WHERE nom = 'Python pour débutants' AND image IS NULL;
UPDATE formation SET image = 'formations/demo-excel.jpg' WHERE nom = 'Excel avancé' AND image IS NULL;


-- ============================================
-- MIGRATION 010 : paramètres de l'application (fond de la vitrine « Découvrir »)
-- ============================================
-- Clé -> valeur, modifiées par le Super Admin depuis Paramètres > Apparence (web).
--   fond_vitrine : "vitrine/xxx.jpg" dans uploads/ (public), NULL = image par défaut de l'application mobile
USE gestion_formation_db;

CREATE TABLE IF NOT EXISTS parametre_application (
    cle VARCHAR(50) PRIMARY KEY,
    valeur VARCHAR(255) NULL,
    modifie_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
