INSERT INTO role (nom, etat) VALUES 
('Super Admin', true),
('Accueil', true),
('Professeur', true),
('Étudiant', true);
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, etat) 
VALUES ('Admin', 'Test', 'admin@imtechinfo.com', '$2b$10$qyRHLKxNI2pJrxtPB/43euelDM3o/7Njdob/sHOAuocBPbRISekLi', '0340000000', 1, true);