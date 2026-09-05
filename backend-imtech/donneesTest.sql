INSERT INTO role (nom, etat) VALUES 
('Super Admin', true),
('Accueil', true),
('Formateur', true),
('Étudiant', true);

INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, etat) 
VALUES ('Admin', 'Test', 'admin@imtechinfo.com', '$2b$10$qyRHLKxNI2pJrxtPB/43euelDM3o/7Njdob/sHOAuocBPbRISekLi', '0340000000', 1, true);

INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, id_role, etat) VALUES
('RABEMANANJARA', 'Lova', 'lova.admin@imtechinfo.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGGa31lW','0340000000', 1, true),
('RAKOTO', 'Hery', 'hery.accueil@imtechinfo.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGGa31lW','0340000000', 2, true),
('RASOLtemplate', 'Mamy', 'mamy.formateur@imtechinfo.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGGa31lW','0340000000', 3, true),
('ANDRIANINA', 'Aina', 'aina.admin@imtechinfo.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQOEg6Lruj3vjPGGa31lW','0340000000', 1, true);
