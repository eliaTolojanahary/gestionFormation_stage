-- ============================================
-- BASE DE DONNÉES IMTECH INFO - VERSION CORRIGÉE ET STRUCTURÉE
-- ============================================

-- 1. role
CREATE TABLE role (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);
CREATE TABLE sessions (
  id_session INT AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255),
  ip VARCHAR(45),
  cree_le DATETIME DEFAULT CURRENT_TIMESTAMP,
  expire_le DATETIME,
  actif TINYINT(1) DEFAULT 1,
  FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);
-- 2. tranche
CREATE TABLE tranche (
    id_tranche INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(50),
    etat BOOLEAN DEFAULT TRUE
);

-- 3. mode_paiement
CREATE TABLE mode_paiement (
    id_mode_paiement INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);

-- 4. type_reaction
CREATE TABLE type_reaction (
    id_type_reaction INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    icone VARCHAR(255) NULL,
    etat BOOLEAN DEFAULT TRUE
);

-- 5. statut
CREATE TABLE statut (
    id_statut INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);

CREATE TABLE utilisateur (
    id_utilisateur INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo VARCHAR(255) NULL, -- Libellé ajouté pour la photo de profil
    date_creation DATE DEFAULT CURRENT_DATE,
    telephone VARCHAR(20),
    id_role INT NOT NULL,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_role) REFERENCES role(id_role)
);
-- 7. etudiant
CREATE TABLE etudiant (
    id_etudiant INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL UNIQUE,
    photo_1 VARCHAR(255),
    photo_2 VARCHAR(255),
    certificat_residence VARCHAR(255),
    photocopie_cin VARCHAR(255),
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- 8. formation
CREATE TABLE formation (
    id_formation INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    engagement_formateur TEXT NULL, -- disponibilité promise par le formateur (vitrine)
    image VARCHAR(255) NULL,        -- couverture "formations/xxx.jpg" (publique, vitrine)
    tarif DECIMAL(10,2) NOT NULL,
    duree VARCHAR(50),
    duree_jours INT NOT NULL DEFAULT 30,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);

-- 9. inscription (intégration de ALTER TABLE : valide)
CREATE TABLE inscription (
    id_inscription INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NULL,
    id_utilisateur INT NULL,
    id_formation INT NOT NULL,
    date_inscription DATE DEFAULT CURRENT_DATE,
    valide BOOLEAN DEFAULT TRUE,
    origine ENUM('accueil', 'en_ligne') NOT NULL DEFAULT 'accueil', -- en_ligne = depuis la vitrine mobile
    etat BOOLEAN DEFAULT TRUE,
    note_suggeree DECIMAL(4,2) NULL,      -- note système /10 : paiement + présence
    nb_presences INT NULL,                -- jours de présence au dernier calcul
    note_presentation DECIMAL(4,2) NULL,  -- note libre du formateur /10
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    FOREIGN KEY (id_formation) REFERENCES formation(id_formation)
);

-- 10. echeance
CREATE TABLE echeance (
    id_echeance INT AUTO_INCREMENT PRIMARY KEY,
    id_inscription INT NOT NULL,
    id_tranche INT NOT NULL,
    montant_prevu DECIMAL(10,2) NOT NULL,
    date_echeance DATE NOT NULL,
    genere_auto BOOLEAN DEFAULT TRUE,
    etat BOOLEAN DEFAULT TRUE,
    date_dernier_rappel DATETIME NULL,
    FOREIGN KEY (id_inscription) REFERENCES inscription(id_inscription),
    FOREIGN KEY (id_tranche) REFERENCES tranche(id_tranche)
);

-- 11. support
CREATE TABLE support (
    id_support INT AUTO_INCREMENT PRIMARY KEY,
    id_formation INT NOT NULL,
    id_utilisateur INT NOT NULL,
    titre VARCHAR(150) NOT NULL,
    contenu MEDIUMTEXT NULL,                                       -- texte mis en forme (HTML nettoyé)
    fichier VARCHAR(255),                                          -- NULL = support texte seul
    statut ENUM('programme', 'publie') NOT NULL DEFAULT 'publie', -- programme = brouillon invisible des étudiants
    date_envoi_prevue DATETIME NULL,                               -- heure de publication automatique
    annonce_envoyee BOOLEAN NOT NULL DEFAULT FALSE,                -- étudiants prévenus 1 h avant
    date_publication DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_formation) REFERENCES formation(id_formation),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);

-- 12. commentaire (intégration de ALTER TABLE : id_etudiant NULL + id_utilisateur + clé étrangère)
CREATE TABLE commentaire (
    id_commentaire INT AUTO_INCREMENT PRIMARY KEY,
    id_support INT NOT NULL,
    id_parent INT NULL, -- NULL = commentaire principal, sinon réponse à ce commentaire
    id_etudiant INT NULL,
    id_utilisateur INT NULL,
    contenu TEXT NOT NULL,
    date_commentaire DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_support) REFERENCES support(id_support) ON DELETE CASCADE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    CONSTRAINT fk_commentaire_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    CONSTRAINT fk_commentaire_parent FOREIGN KEY (id_parent) REFERENCES commentaire(id_commentaire) ON DELETE CASCADE
);

-- 13. commentaire_mention
CREATE TABLE commentaire_mention (
    id_mention INT AUTO_INCREMENT PRIMARY KEY,
    id_commentaire INT NOT NULL,
    id_etudiant_mentionne INT NOT NULL,
    FOREIGN KEY (id_commentaire) REFERENCES commentaire(id_commentaire) ON DELETE CASCADE,
    FOREIGN KEY (id_etudiant_mentionne) REFERENCES etudiant(id_etudiant)
);

-- 14. reaction
CREATE TABLE reaction (
    id_reaction INT AUTO_INCREMENT PRIMARY KEY,
    id_support INT NOT NULL,
    id_utilisateur INT NOT NULL,
    id_type_reaction INT NOT NULL,
    date_reaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_support) REFERENCES support(id_support) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_type_reaction) REFERENCES type_reaction(id_type_reaction),
    CONSTRAINT uq_utilisateur_support_reaction UNIQUE (id_utilisateur, id_support)
);

-- 15. paiement
CREATE TABLE paiement (
    id_paiement INT AUTO_INCREMENT PRIMARY KEY,
    id_echeance INT NOT NULL,
    id_mode_paiement INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    date_paiement DATE DEFAULT CURRENT_DATE,
    reference_virement VARCHAR(100),
    statut ENUM('en_attente', 'valide', 'refuse') NOT NULL DEFAULT 'valide',
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_echeance) REFERENCES echeance(id_echeance),
    FOREIGN KEY (id_mode_paiement) REFERENCES mode_paiement(id_mode_paiement)
);

-- 16. facture
CREATE TABLE facture (
    id_facture INT AUTO_INCREMENT PRIMARY KEY,
    id_paiement INT NOT NULL,
    numero_facture VARCHAR(50) NOT NULL UNIQUE,
    date_emission DATE DEFAULT CURRENT_DATE,
    fichier_pdf VARCHAR(255),
    FOREIGN KEY (id_paiement) REFERENCES paiement(id_paiement)
);

-- 17. document_administratif
CREATE TABLE document_administratif (
    id_document INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    nom_document VARCHAR(150) NOT NULL,
    fichier VARCHAR(255) NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- 18. attestation
CREATE TABLE attestation (
    id_attestation INT AUTO_INCREMENT PRIMARY KEY,
    id_inscription INT NOT NULL,
    uuid_verification VARCHAR(36) NOT NULL UNIQUE,
    date_delivrance DATE DEFAULT CURRENT_DATE,
    fichier_pdf VARCHAR(255),
    FOREIGN KEY (id_inscription) REFERENCES inscription(id_inscription)
);

-- 19. assistance
CREATE TABLE assistance (
    id_assistance INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    id_utilisateur INT NULL,
    id_statut INT NOT NULL,
    objet VARCHAR(150),
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_resolution DATETIME NULL,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    FOREIGN KEY (id_statut) REFERENCES statut(id_statut)
);

-- 20. notification_inapp
CREATE TABLE notification_inapp (
    id_notification INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    message TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    etat BOOLEAN DEFAULT TRUE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- 21. notification_email
CREATE TABLE notification_email (
    id_notification_email INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    email VARCHAR(150) NOT NULL,
    contenu TEXT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- 22. reset_password
CREATE TABLE reset_password (
    id_reset INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    date_expiration DATETIME NOT NULL,
    utilise BOOLEAN DEFAULT FALSE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);
ALTER TABLE notification_inapp
ADD COLUMN etat TINYINT(1) NOT NULL DEFAULT 1
AFTER lu;
-- ============================================
-- INDEX D'OPTIMISATION
-- ============================================

CREATE INDEX idx_inscription_etudiant ON inscription(id_etudiant);
CREATE INDEX idx_inscription_formation ON inscription(id_formation);
CREATE INDEX idx_echeance_inscription ON echeance(id_inscription);
CREATE INDEX idx_paiement_echeance ON paiement(id_echeance);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_support_programme ON support(statut, date_envoi_prevue);

-- Alertes automatiques déjà envoyées au personnel (évite les doublons)
CREATE TABLE alerte_envoyee (
    id_alerte INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    id_reference INT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_alerte UNIQUE (type, id_reference)
);

-- Présence : un jour où l'étudiant a utilisé l'application (rempli automatiquement)
CREATE TABLE presence (
    id_presence INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    jour DATE NOT NULL,
    CONSTRAINT uq_presence UNIQUE (id_utilisateur, jour),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);
-- Paramètres de l'application modifiables par le Super Admin (clé -> valeur)
--   fond_vitrine : image du bandeau « Découvrir » de l'application mobile ("vitrine/xxx.jpg"), NULL = image par défaut
CREATE TABLE parametre_application (
    cle VARCHAR(50) PRIMARY KEY,
    valeur VARCHAR(255) NULL,
    modifie_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_commentaire_support ON commentaire(id_support);
CREATE INDEX idx_commentaire_parent ON commentaire(id_parent);
CREATE INDEX idx_notification_utilisateur ON notification_inapp(id_utilisateur, lu);
CREATE INDEX idx_reaction_support ON reaction(id_support);