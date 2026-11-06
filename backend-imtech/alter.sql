-- ============================================
-- MIGRATION : DATE → DATETIME (garde l'heure)
-- ============================================

USE gestion_formation_db;

-- 1. Utilisateur — date_creation
ALTER TABLE utilisateur
  MODIFY date_creation DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 2. Inscription — date_inscription
ALTER TABLE inscription
  MODIFY date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 3. Paiement — date_paiement
ALTER TABLE paiement
  MODIFY date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 4. Facture — date_emission
ALTER TABLE facture
  MODIFY date_emission DATETIME DEFAULT CURRENT_TIMESTAMP;

-- 5. Attestation — date_delivrance
ALTER TABLE attestation
  MODIFY date_delivrance DATETIME DEFAULT CURRENT_TIMESTAMP;


-- ============================================
-- Pagination des notifications in-app
-- ============================================
-- GET /notifications?limite=20&avant=<id> : filtre sur l'utilisateur puis tri par id décroissant
CREATE INDEX IF NOT EXISTS idx_notification_pagination
  ON notification_inapp(id_utilisateur, etat, id_notification);


-- ============================================
-- Journal d'activité retiré ; envoi des attestations toujours automatique — 26/10/2026
-- ============================================
DROP TABLE IF EXISTS journal_activite;
DELETE FROM parametre_application WHERE cle = 'attestations_auto';
DELETE FROM alerte_envoyee WHERE type = 'attestation_prete';


-- ============================================
-- Pagination des supports et des commentaires (curseur ?limite=&avant=) — 29/10/2026
-- ============================================
-- Supports publiés d'une formation, du plus récent au plus ancien
CREATE INDEX IF NOT EXISTS idx_support_formation_fil
  ON support(id_formation, statut, etat, date_publication, id_support);
-- Commentaires principaux d'un support (id_parent NULL), du plus récent au plus ancien
CREATE INDEX IF NOT EXISTS idx_commentaire_fil
  ON commentaire(id_support, id_parent, etat, date_commentaire, id_commentaire);


-- ============================================
-- Scalabilité : page Échéances et alertes de paiement (index seulement) — 29/10/2026
-- ============================================
-- Somme des paiements d'une échéance (montant validé, montant envoyé) lue dans l'index seul
CREATE INDEX IF NOT EXISTS idx_paiement_echeance_somme
  ON paiement(id_echeance, etat, statut, montant);
-- Échéances par date : tri de la page Échéances, filtres ROUGE / JAUNE, alerte J-2, période
CREATE INDEX IF NOT EXISTS idx_echeance_date
  ON echeance(date_echeance, id_echeance);


-- ============================================
-- Scalabilité : tableau de bord (index seulement) — 29/10/2026
-- ============================================
-- Montant encaissé et évolution des encaissements : paiements validés par date, montant lu dans l'index
CREATE INDEX IF NOT EXISTS idx_paiement_encaisse
  ON paiement(statut, etat, date_paiement, montant);
-- Inscriptions par mois : inscriptions actives par date
CREATE INDEX IF NOT EXISTS idx_inscription_date
  ON inscription(etat, date_inscription);
-- Formations les plus suivies : inscriptions d'une formation sur la période
CREATE INDEX IF NOT EXISTS idx_inscription_formation_date
  ON inscription(id_formation, etat, date_inscription);


-- ============================================
-- Scalabilité : tri des listes, recherche plein texte, avis des formateurs (index seulement) — 29/10/2026
-- ============================================
-- Tri des listes paginées : MariaDB lit les lignes déjà dans l'ordre et s'arrête après la page
CREATE INDEX IF NOT EXISTS idx_utilisateur_nom ON utilisateur(nom, prenom, id_utilisateur);       -- Étudiants, Utilisateurs
CREATE INDEX IF NOT EXISTS idx_paiement_date ON paiement(date_paiement, id_paiement);              -- Paiements (lu à l'envers)
CREATE INDEX IF NOT EXISTS idx_inscription_liste
  ON inscription(valide, date_inscription DESC, id_inscription DESC);                              -- Inscriptions (à valider d'abord)
CREATE INDEX IF NOT EXISTS idx_assistance_liste ON assistance(etat, date_envoi, id_assistance);    -- Assistance
CREATE INDEX IF NOT EXISTS idx_support_publie ON support(statut, etat, date_publication, id_support); -- Supports / Documents
-- Recherche : chaque mot tapé doit commencer un mot du champ (voir utils/recherche.js)
CREATE FULLTEXT INDEX IF NOT EXISTS ft_utilisateur ON utilisateur(nom, prenom, email, telephone);
CREATE FULLTEXT INDEX IF NOT EXISTS ft_assistance ON assistance(objet, contenu);
CREATE FULLTEXT INDEX IF NOT EXISTS ft_support ON support(titre, contenu);
-- Avis sur les formateurs (tableau de bord, vitrine) : réactions d'un support sur une période, lues dans l'index
CREATE INDEX IF NOT EXISTS idx_reaction_avis ON reaction(id_support, date_reaction, id_type_reaction);
-- Purge quotidienne (services/purgeService.js) : lignes mortes retrouvées par date, sans lire toute la table
CREATE INDEX IF NOT EXISTS idx_sessions_expiration ON sessions(expire_le);
CREATE INDEX IF NOT EXISTS idx_reset_expiration ON reset_password(date_expiration);
CREATE INDEX IF NOT EXISTS idx_notification_supprimee ON notification_inapp(etat, date_creation);


-- ============================================
-- Historique des désactivations et réactivations — 06/11/2026
-- ============================================
CREATE TABLE IF NOT EXISTS historique_etat (
    id_historique INT AUTO_INCREMENT PRIMARY KEY,
    table_origine VARCHAR(30) NOT NULL,  -- table de l'élément (liste TABLES de models/dependanceModel.js)
    id_origine INT NOT NULL,             -- pas de clé étrangère : pointe vers plusieurs tables
    actif BOOLEAN NOT NULL,              -- false = désactivation, true = réactivation
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_historique_element (table_origine, id_origine, date_action)
);


-- ============================================
-- Une seule facture par paiement — 06/11/2026
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_facture_paiement ON facture(id_paiement);


-- ============================================
-- Agent qui a saisi ou traité un paiement (NULL : anciens paiements, déclaration pas encore traitée) — 06/11/2026
-- ============================================
ALTER TABLE paiement ADD COLUMN IF NOT EXISTS id_utilisateur INT NULL AFTER id_mode_paiement;
ALTER TABLE paiement ADD CONSTRAINT fk_paiement_utilisateur
  FOREIGN KEY IF NOT EXISTS (id_utilisateur) REFERENCES utilisateur(id_utilisateur);


-- ============================================
-- Une seule attestation par inscription — 06/11/2026
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_attestation_inscription ON attestation(id_inscription);


-- ============================================
-- Commentaire de fin de formation sur le formateur, noté sur 10 — 06/11/2026
-- ============================================
CREATE TABLE IF NOT EXISTS formateur_note (
    id_note INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,   -- formateur commenté
    id_etudiant INT NOT NULL,
    id_inscription INT NOT NULL,
    note DECIMAL(4,2) NULL,        -- sur 10, donnée par l'Accueil ou le Super Admin ; NULL = à noter
    commentaire TEXT NOT NULL,
    date_commentaire DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_formateur_note_inscription UNIQUE (id_inscription),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    FOREIGN KEY (id_inscription) REFERENCES inscription(id_inscription),
    INDEX idx_formateur_note_classement (id_utilisateur, date_commentaire)
);
