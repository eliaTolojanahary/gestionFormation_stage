# Aide-mémoire MySQL

Syntaxe SQL courante, pour créer et interroger une base sans IA. Exemples sur les tables du projet
(voir aussi [`../CHEAT-SHEET.md`](../CHEAT-SHEET.md) §8 pour les requêtes de démo et de dépannage).

---

## 1. Se connecter, naviguer

```bash
mysql -u root -p                          # se connecter (mot de passe demandé)
mysql -u root -p gestion_formation_db     # directement dans une base
mysql -u root -p < base.sql               # exécuter un fichier
```
```sql
SHOW DATABASES;
USE gestion_formation_db;
SHOW TABLES;
DESCRIBE paiement;                -- colonnes, types, clés
SHOW CREATE TABLE paiement;       -- la commande CREATE complète
SELECT DATABASE(), VERSION(), NOW();
SOURCE C:/chemin/fichier.sql;     -- exécuter un fichier depuis le client mysql
EXIT;
```

---

## 2. Types de colonnes

| Type | Pour | Exemple |
|---|---|---|
| `INT` | Entiers, identifiants | `id_formation INT AUTO_INCREMENT PRIMARY KEY` |
| `DECIMAL(10,2)` | **Argent** (exact, jamais `FLOAT`) | `montant DECIMAL(10,2)` |
| `VARCHAR(n)` | Texte court | `email VARCHAR(150)` |
| `TEXT` / `MEDIUMTEXT` | Texte long (64 Ko / 16 Mo) | `contenu MEDIUMTEXT` |
| `BOOLEAN` (= `TINYINT(1)`) | Vrai / faux (1 / 0) | `etat BOOLEAN DEFAULT TRUE` |
| `DATE` | Jour | `date_echeance DATE` |
| `DATETIME` / `TIMESTAMP` | Jour + heure | `cree_le DATETIME DEFAULT CURRENT_TIMESTAMP` |
| `ENUM(...)` | Liste fermée de valeurs | `statut ENUM('en_attente','valide','refuse')` |
| `JSON` | Données structurées | `options JSON` |

---

## 3. Créer et modifier la structure

```sql
CREATE DATABASE IF NOT EXISTS gestion_formation_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;     -- accents et emojis

CREATE TABLE IF NOT EXISTS assistance (
    id_assistance INT AUTO_INCREMENT PRIMARY KEY,
    id_etudiant INT NOT NULL,
    objet VARCHAR(150) NOT NULL,
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    etat BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiant(id_etudiant) ON DELETE CASCADE
);

-- Contraintes
email VARCHAR(150) NOT NULL UNIQUE
CONSTRAINT uq_presence UNIQUE (id_utilisateur, jour)      -- unicité sur 2 colonnes
CHECK (montant >= 0)

-- Modifier une table
ALTER TABLE formation ADD COLUMN image VARCHAR(255) NULL AFTER description;
ALTER TABLE formation MODIFY COLUMN nom VARCHAR(200) NOT NULL;
ALTER TABLE formation RENAME COLUMN duree TO duree_texte;
ALTER TABLE formation DROP COLUMN ancienne;
ALTER TABLE paiement ADD CONSTRAINT fk_mode FOREIGN KEY (id_mode_paiement) REFERENCES mode_paiement(id_mode_paiement);
ALTER TABLE paiement ADD INDEX idx_statut (statut);

DROP TABLE IF EXISTS table_test;   -- ⚠️ définitif
TRUNCATE TABLE notification_inapp; -- vide la table et remet le compteur à 1 (⚠️ définitif)
```
`ON DELETE CASCADE` : supprimer le parent supprime les enfants ; `ON DELETE SET NULL` : met la clé à NULL.

---

## 4. Insérer, modifier, supprimer

```sql
INSERT INTO formation (nom, tarif, duree_jours) VALUES ('Python', 300000, 60);
INSERT INTO mode_paiement (nom) VALUES ('Cash'), ('MVola'), ('Virement');   -- plusieurs lignes
INSERT INTO presence (id_utilisateur, jour) VALUES (10, CURDATE())
  ON DUPLICATE KEY UPDATE jour = jour;       -- ignore si déjà présent (ou INSERT IGNORE)
INSERT INTO assistance (id_etudiant, id_statut, objet, contenu)
  VALUES (3, (SELECT id_statut FROM statut WHERE nom = 'En attente'), 'Accès', '…');  -- valeur trouvée par sous-requête

UPDATE paiement SET statut = 'valide' WHERE id_paiement = 12;
UPDATE formation SET tarif = tarif * 1.1, nom = TRIM(nom) WHERE etat = true;
UPDATE utilisateur SET photo = COALESCE(?, photo) WHERE id_utilisateur = ?;  -- garder l'ancienne si NULL

DELETE FROM notification_inapp WHERE id_notification = 5;
UPDATE formation SET etat = false WHERE id_formation = 3;   -- suppression LOGIQUE (le choix du projet)
```
⚠️ **Toujours un `WHERE`** sur `UPDATE` / `DELETE` : sans lui, **toutes** les lignes sont touchées.
Vérifier d'abord avec un `SELECT` portant le même `WHERE`.

---

## 5. Lire : SELECT

```sql
SELECT nom, tarif FROM formation;
SELECT * FROM formation WHERE etat = true;
SELECT DISTINCT statut FROM paiement;
SELECT nom AS formation, tarif * 0.9 AS tarif_remise FROM formation;   -- alias, calcul

-- Filtres
WHERE tarif > 100000 AND etat = true
WHERE statut = 'valide' OR statut = 'en_attente'
WHERE statut IN ('valide', 'en_attente')
WHERE statut <> 'refuse'                       -- différent
WHERE tarif BETWEEN 100000 AND 300000
WHERE date_echeance < CURDATE()
WHERE photo IS NULL          -- ⚠️ jamais « = NULL »
WHERE photo IS NOT NULL
WHERE nom LIKE 'Dév%'        -- commence par
WHERE nom LIKE '%web%'       -- contient (% = n'importe quoi, _ = un caractère)
WHERE CONCAT(prenom, ' ', nom) LIKE '%toky rabe%'

-- Trier, paginer
ORDER BY nom ASC, prenom ASC
ORDER BY date_paiement DESC, id_paiement DESC       -- un id en dernier = ordre stable
LIMIT 20                       -- les 20 premières lignes
LIMIT 20 OFFSET 40             -- page 3 (offset = (page - 1) × limite)
```

---

## 6. Fonctions utiles

```sql
-- Agrégats (une valeur pour plusieurs lignes)
COUNT(*)   COUNT(DISTINCT id_etudiant)   SUM(montant)   AVG(note)   MIN(date_echeance)   MAX(montant)

-- NULL
COALESCE(SUM(montant), 0)      -- première valeur non NULL (somme vide = NULL → 0)
IFNULL(photo, 'defaut.png')
NULLIF(a, 0)                   -- NULL si a = 0 (évite la division par 0)

-- Texte
CONCAT(prenom, ' ', nom)   UPPER(nom)   LOWER(email)   TRIM(nom)   LENGTH(nom)
SUBSTRING(nom, 1, 3)       REPLACE(tel, ' ', '')       LEFT(texte, 100)

-- Nombres
ROUND(montant, 2)   FLOOR(x)   CEIL(x)   ABS(x)   MOD(a, b)

-- Dates
NOW()                       -- '2026-10-11 14:30:00'
CURDATE()                   -- '2026-10-11'
DATE(cree_le)               -- partie jour d'un DATETIME
DATE_ADD(CURDATE(), INTERVAL 2 DAY)      DATE_SUB(NOW(), INTERVAL 1 HOUR)
DATEDIFF(date_echeance, CURDATE())       -- nombre de jours entre deux dates
DATE_FORMAT(date_paiement, '%d/%m/%Y')   -- '11/10/2026'
YEAR(d)  MONTH(d)  DAY(d)  DAYOFWEEK(d)  -- DAYOFWEEK : 1 = dimanche, 7 = samedi
DATE_FORMAT(date_inscription, '%Y-%m')   -- regrouper par mois

-- Conditions
CASE
  WHEN paye >= montant_prevu THEN 'VERT'
  WHEN CURDATE() > date_echeance THEN 'ROUGE'
  ELSE 'JAUNE'
END AS statut
IF(valide, 'Validée', 'En attente')
```

---

## 7. Jointures

```sql
-- INNER JOIN : seulement les lignes qui ont une correspondance des deux côtés
SELECT i.id_inscription, u.nom, u.prenom, f.nom AS formation
FROM inscription i
JOIN etudiant e    ON e.id_etudiant = i.id_etudiant
JOIN utilisateur u ON u.id_utilisateur = e.id_utilisateur
JOIN formation f   ON f.id_formation = i.id_formation
WHERE i.etat = true;

-- LEFT JOIN : toutes les lignes de gauche, même sans correspondance (colonnes de droite = NULL)
SELECT f.nom, COUNT(i.id_inscription) AS inscrits
FROM formation f
LEFT JOIN inscription i ON i.id_formation = f.id_formation AND i.etat = true   -- condition dans le ON
GROUP BY f.id_formation, f.nom;

-- Trouver ce qui n'a PAS de correspondance
SELECT f.nom FROM formation f
LEFT JOIN inscription i ON i.id_formation = f.id_formation
WHERE i.id_inscription IS NULL;            -- formations sans aucun inscrit

-- Même table deux fois : alias différents
SELECT a.objet, ue.nom AS etudiant, ur.nom AS resolu_par
FROM assistance a
JOIN etudiant e ON e.id_etudiant = a.id_etudiant
JOIN utilisateur ue ON ue.id_utilisateur = e.id_utilisateur
LEFT JOIN utilisateur ur ON ur.id_utilisateur = a.id_utilisateur;
```
⚠️ Avec un `LEFT JOIN`, un filtre sur la table de droite mis dans le `WHERE` le transforme en
`INNER JOIN` : le mettre dans le `ON`.

---

## 8. Regrouper : GROUP BY / HAVING

```sql
-- Total encaissé par formation (paiements validés seulement)
SELECT f.nom, SUM(p.montant) AS encaisse, COUNT(*) AS nb_paiements
FROM paiement p
JOIN echeance e    ON e.id_echeance = p.id_echeance
JOIN inscription i ON i.id_inscription = e.id_inscription
JOIN formation f   ON f.id_formation = i.id_formation
WHERE p.statut = 'valide' AND p.etat = true          -- WHERE : filtre AVANT le regroupement
GROUP BY f.id_formation, f.nom
HAVING SUM(p.montant) > 500000                       -- HAVING : filtre APRÈS (sur les agrégats)
ORDER BY encaisse DESC;

-- Inscriptions par mois
SELECT DATE_FORMAT(date_inscription, '%Y-%m') AS mois, COUNT(*) AS total
FROM inscription GROUP BY mois ORDER BY mois;
```
Toute colonne du `SELECT` qui n'est pas un agrégat doit être dans le `GROUP BY`
(sinon erreur `ONLY_FULL_GROUP_BY`).

---

## 9. Sous-requêtes, EXISTS, UNION

```sql
-- Valeur calculée par ligne
SELECT e.id_echeance, e.montant_prevu,
       (SELECT COALESCE(SUM(p.montant), 0) FROM paiement p
        WHERE p.id_echeance = e.id_echeance AND p.statut = 'valide') AS paye
FROM echeance e;

-- Dans le WHERE
SELECT * FROM formation WHERE tarif > (SELECT AVG(tarif) FROM formation);
SELECT * FROM etudiant WHERE id_etudiant IN (SELECT id_etudiant FROM inscription WHERE valide = false);

-- EXISTS : « au moins une ligne correspond » (rapide)
SELECT u.nom FROM utilisateur u
WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.id_utilisateur = u.id_utilisateur AND s.actif = 1);

-- UNION : empiler deux résultats de mêmes colonnes (UNION ALL garde les doublons)
SELECT email FROM utilisateur WHERE id_role = 1
UNION
SELECT email FROM utilisateur WHERE id_role = 2;

-- Table temporaire nommée (WITH)
WITH totaux AS (
  SELECT id_echeance, SUM(montant) AS paye FROM paiement WHERE statut = 'valide' GROUP BY id_echeance
)
SELECT e.*, COALESCE(t.paye, 0) AS paye FROM echeance e LEFT JOIN totaux t USING (id_echeance);
```

---

## 10. Transactions

```sql
START TRANSACTION;
INSERT INTO inscription (id_etudiant, id_formation) VALUES (3, 2);
SET @id = LAST_INSERT_ID();
INSERT INTO echeance (id_inscription, montant_prevu, date_echeance) VALUES (@id, 100000, CURDATE());
COMMIT;        -- tout est gardé
-- ROLLBACK;   -- tout est annulé
```
Tout ou rien : si une étape échoue, `ROLLBACK`. Pratique aussi pour **essayer** un `UPDATE` :
`START TRANSACTION; UPDATE …; SELECT …; ROLLBACK;`.

---

## 11. Vues, index, procédures

```sql
-- Vue : requête enregistrée, utilisée comme une table
CREATE OR REPLACE VIEW v_paiements_valides AS
SELECT p.*, f.nom AS formation FROM paiement p
JOIN echeance e ON e.id_echeance = p.id_echeance
JOIN inscription i ON i.id_inscription = e.id_inscription
JOIN formation f ON f.id_formation = i.id_formation
WHERE p.statut = 'valide';
SELECT * FROM v_paiements_valides;

-- Index : accélère les WHERE / JOIN / ORDER BY sur une colonne souvent filtrée
CREATE INDEX idx_paiement_statut ON paiement (statut);
SHOW INDEX FROM paiement;
EXPLAIN SELECT * FROM paiement WHERE statut = 'en_attente';   -- la requête utilise-t-elle un index ?

-- Procédure stockée
DELIMITER //
CREATE PROCEDURE encaisse_formation(IN p_id INT)
BEGIN
  SELECT SUM(p.montant) FROM paiement p
  JOIN echeance e ON e.id_echeance = p.id_echeance
  JOIN inscription i ON i.id_inscription = e.id_inscription
  WHERE i.id_formation = p_id AND p.statut = 'valide';
END //
DELIMITER ;
CALL encaisse_formation(2);
```
Les clés primaires et étrangères ont déjà un index.

---

## 12. Utilisateurs, droits, sauvegarde

```sql
CREATE USER 'imtech'@'localhost' IDENTIFIED BY 'motdepasse';
GRANT SELECT, INSERT, UPDATE, DELETE ON gestion_formation_db.* TO 'imtech'@'localhost';
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'imtech'@'localhost';
```
```bash
mysqldump -u root -p gestion_formation_db > sauvegarde.sql            # sauvegarder
mysqldump -u root -p --no-data gestion_formation_db > schema.sql       # structure seule
mysql -u root -p gestion_formation_db < sauvegarde.sql                 # restaurer
```

---

## 13. Depuis Node (mysql2)

```js
const [rows] = await db.query(
  'SELECT * FROM paiement WHERE statut = ? AND montant > ? LIMIT ? OFFSET ?',
  [statut, 1000, 20, 0]
);
// LIKE : le % va dans la valeur, pas dans le SQL
await db.query('SELECT * FROM utilisateur WHERE nom LIKE ?', [`%${recherche}%`]);
// IN : un tableau dans un tableau
await db.query('SELECT * FROM formation WHERE id_formation IN (?)', [[1, 2, 3]]);
```
**Jamais** de concaténation : `'... WHERE email = ' + email` → **injection SQL**
(`' OR '1'='1` renverrait tous les comptes).

---

## 14. Pièges et erreurs fréquentes

| Erreur / symptôme | Cause | Correction |
|---|---|---|
| `= NULL` ne renvoie rien | NULL ne s'égale à rien | `IS NULL` / `IS NOT NULL` |
| `SUM` renvoie NULL | Aucune ligne | `COALESCE(SUM(x), 0)` |
| Montant `99999.99` au lieu de `100000` | `FLOAT` ou arrondis | `DECIMAL(10,2)` ; la dernière tranche absorbe l'écart |
| `Error 1175: safe update mode` (Workbench) | `UPDATE` / `DELETE` sans clé dans le `WHERE` | Ajouter `WHERE id = …` ou `SET SQL_SAFE_UPDATES = 0;` (prudence) |
| `ER_NO_REFERENCED_ROW` / `Cannot add or update a child row` | Clé étrangère vers une ligne inexistante | Créer le parent d'abord |
| `Cannot delete or update a parent row` | Des lignes enfants existent | Supprimer les enfants, `ON DELETE CASCADE`, ou suppression logique |
| `ER_DUP_ENTRY` | Valeur déjà présente dans une colonne `UNIQUE` | Vérifier avant, ou `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE` |
| `Unknown column` | Faute de nom, ou migration non exécutée | `DESCRIBE table` |
| `ONLY_FULL_GROUP_BY` | Colonne du `SELECT` absente du `GROUP BY` | L'ajouter au `GROUP BY` |
| Accents mal affichés (`Ã©`) | Mauvais encodage | `utf8mb4` partout (base, tables, connexion) |
| `'Etudiant'` ≠ `'Étudiant'` | Accent dans une valeur comparée | Copier la valeur exacte depuis la table (`SELECT nom FROM role`) |
| Dates décalées d'un jour | Fuseau horaire (UTC) | Comparer avec `CURDATE()` côté SQL plutôt qu'avec une date JS |

---

## 15. Ordre d'exécution d'un SELECT (pour comprendre WHERE / HAVING / alias)

```
FROM / JOIN  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  DISTINCT  →  ORDER BY  →  LIMIT
```
C'est pour cela qu'un alias du `SELECT` est utilisable dans `ORDER BY` mais pas dans `WHERE`.
