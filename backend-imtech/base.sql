
CREATE TABLE role (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);


CREATE TABLE utilisateur (
    id_utilisateur INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    id_role INT NOT NULL,
    date_creation DATE DEFAULT (CURRENT_DATE),
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_role) REFERENCES role(id_role)
);


CREATE TABLE etudiant (
    id_etudiant INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL UNIQUE,
    photo_1 VARCHAR(255),
    photo_2 VARCHAR(255),
    certificat_residence VARCHAR(255),
    photocopie_cin VARCHAR(255),
    option_type VARCHAR(50),
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);


CREATE TABLE formation (
    id_formation INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    tarif DECIMAL(10,2) NOT NULL,
    duree VARCHAR(50),
    duree_jours INT NOT NULL DEFAULT 30,
    id_utilisateur INT NOT NULL,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur)
);


CREATE TABLE inscription (
    id_inscription INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    id_formation INT NOT NULL,
    date_inscription DATE DEFAULT (CURRENT_DATE),
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    FOREIGN KEY (id_formation) REFERENCES formation(id_formation),
    CONSTRAINT uq_etudiant_formation UNIQUE (id_etudiant, id_formation)
);


CREATE TABLE tranche (
    id_tranche INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(50),
    etat BOOLEAN DEFAULT TRUE
);


CREATE TABLE echeance (
    id_echeance INT AUTO_INCREMENT PRIMARY KEY,
    id_inscription INT NOT NULL,
    id_tranche INT NOT NULL,
    montant_prevu DECIMAL(10,2) NOT NULL,
    date_echeance DATE NOT NULL,
    genere_auto BOOLEAN DEFAULT TRUE,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_inscription) REFERENCES inscription(id_inscription),
    FOREIGN KEY (id_tranche) REFERENCES tranche(id_tranche)
);


CREATE TABLE mode_paiement (
    id_mode_paiement INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);


CREATE TABLE paiement (
    id_paiement INT AUTO_INCREMENT PRIMARY KEY,
    id_echeance INT NOT NULL,
    id_mode_paiement INT NOT NULL,
    montant DECIMAL(10,2) NOT NULL,
    date_paiement DATE DEFAULT (CURRENT_DATE),
    reference_virement VARCHAR(100),
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_echeance) REFERENCES echeance(id_echeance),
    FOREIGN KEY (id_mode_paiement) REFERENCES mode_paiement(id_mode_paiement)
);


CREATE TABLE facture (
    id_facture INT AUTO_INCREMENT PRIMARY KEY,
    id_paiement INT NOT NULL UNIQUE,
    numero_facture VARCHAR(50) NOT NULL UNIQUE,
    date_emission DATE DEFAULT (CURRENT_DATE),
    fichier_pdf VARCHAR(255),
    FOREIGN KEY (id_paiement) REFERENCES paiement(id_paiement)
);


CREATE TABLE attestation (
    id_attestation INT AUTO_INCREMENT PRIMARY KEY,
    id_inscription INT NOT NULL UNIQUE,
    uuid_verification VARCHAR(36) NOT NULL UNIQUE,
    date_delivrance DATE DEFAULT (CURRENT_DATE),
    fichier_pdf VARCHAR(255),
    FOREIGN KEY (id_inscription) REFERENCES inscription(id_inscription)
);


CREATE TABLE type_support (
    id_type_support INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);


CREATE TABLE support (
    id_support INT AUTO_INCREMENT PRIMARY KEY,
    id_formation INT NOT NULL,
    id_utilisateur INT NOT NULL,
    id_type_support INT NOT NULL,
    titre VARCHAR(150) NOT NULL,
    fichier VARCHAR(255),
    date_publication DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_formation) REFERENCES formation(id_formation),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    FOREIGN KEY (id_type_support) REFERENCES type_support(id_type_support)
);

-- COMMENTAIRE
CREATE TABLE commentaire (
    id_commentaire INT AUTO_INCREMENT PRIMARY KEY,
    id_support INT NOT NULL,
    id_etudiant INT NOT NULL,
    contenu TEXT NOT NULL,
    date_commentaire DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_support) REFERENCES support(id_support) ON DELETE CASCADE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant)
);

-- COMMENTAIRE_MENTION
CREATE TABLE commentaire_mention (
    id_mention INT AUTO_INCREMENT PRIMARY KEY,
    id_commentaire INT NOT NULL,
    id_etudiant_mentionne INT NOT NULL,
    FOREIGN KEY (id_commentaire) REFERENCES commentaire(id_commentaire) ON DELETE CASCADE,
    FOREIGN KEY (id_etudiant_mentionne) REFERENCES etudiant(id_etudiant)
);

-- STATUT
CREATE TABLE statut (
    id_statut INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    etat BOOLEAN DEFAULT TRUE
);

-- ASSISTANCE
CREATE TABLE assistance (
    id_assistance INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    id_utilisateur INT NULL,
    id_statut INT NOT NULL,
    objet VARCHAR(150),
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur),
    FOREIGN KEY (id_statut) REFERENCES statut(id_statut)
);

-- NOTIFICATION_INAPP
CREATE TABLE notification_inapp (
    id_notification INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    message TEXT NOT NULL,
    lu BOOLEAN DEFAULT FALSE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- NOTIFICATION_EMAIL
CREATE TABLE notification_email (
    id_notification_email INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    email VARCHAR(150) NOT NULL,
    contenu TEXT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- RESET_PASSWORD
CREATE TABLE reset_password (
    id_reset INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    date_expiration DATETIME NOT NULL,
    utilise BOOLEAN DEFAULT FALSE,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- INDEX DE PERFORMANCE
CREATE INDEX idx_inscription_etudiant ON inscription(id_etudiant);
CREATE INDEX idx_inscription_formation ON inscription(id_formation);
CREATE INDEX idx_echeance_inscription ON echeance(id_inscription);
CREATE INDEX idx_paiement_echeance ON paiement(id_echeance);
CREATE INDEX idx_commentaire_support ON commentaire(id_support);
CREATE INDEX idx_notification_utilisateur ON notification_inapp(id_utilisateur, lu);