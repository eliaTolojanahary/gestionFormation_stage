ALTER TABLE commentaire
  MODIFY id_etudiant INT NULL,
  ADD COLUMN id_utilisateur INT NULL AFTER id_etudiant,
  ADD CONSTRAINT fk_commentaire_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateur(id_utilisateur);
