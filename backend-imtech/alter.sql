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