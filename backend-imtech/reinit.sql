-- ============================================
-- RÉINITIALISATION DE LA BASE IMTECH INFO
-- ============================================
-- Vide TOUTES les tables et remet les compteurs AUTO_INCREMENT à 1.
-- La structure (tables, colonnes, index) est conservée : pas besoin de relancer base.sql.
-- Ensuite : exécuter donneesTest.sql (données de démonstration).
--
-- Les contrôles de clés étrangères sont coupés le temps du vidage : l'ordre des tables
-- n'a donc plus d'importance (l'ancien script échouait sur `utilisateur`, référencée par `presence`).
-- Penser à ajouter ici toute nouvelle table créée dans alter2.sql.

USE gestion_formation_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Journal et suivi
TRUNCATE TABLE alerte_envoyee;
TRUNCATE TABLE presence;
TRUNCATE TABLE reset_password;
TRUNCATE TABLE sessions;

-- Notifications et assistance
TRUNCATE TABLE notification_email;
TRUNCATE TABLE notification_inapp;
TRUNCATE TABLE assistance;

-- Documents
TRUNCATE TABLE attestation;
TRUNCATE TABLE document_administratif;
TRUNCATE TABLE facture;

-- Paiements et échéances
TRUNCATE TABLE paiement;
TRUNCATE TABLE echeance;

-- Supports, commentaires, réactions
TRUNCATE TABLE reaction;
TRUNCATE TABLE commentaire_mention;
TRUNCATE TABLE commentaire;
TRUNCATE TABLE support;

-- Inscriptions, formations, personnes
TRUNCATE TABLE inscription;
TRUNCATE TABLE formation;
TRUNCATE TABLE etudiant;
TRUNCATE TABLE utilisateur;

-- Tables de référence (remplies à nouveau par donneesTest.sql)
TRUNCATE TABLE statut;
TRUNCATE TABLE type_reaction;
TRUNCATE TABLE mode_paiement;
TRUNCATE TABLE tranche;
TRUNCATE TABLE role;

SET FOREIGN_KEY_CHECKS = 1;
