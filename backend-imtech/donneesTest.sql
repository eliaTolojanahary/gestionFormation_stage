-- ============================================
-- DONNÉES DE DÉMONSTRATION IMTECH INFO
-- ============================================
-- Ordre : reinit.sql (vide la base) -> donneesTest.sql -> node scripts/fichiersDemo.js (photos, supports).
-- Mot de passe de TOUS les comptes : admin123
-- Les dates sont relatives au jour d'exécution (CURDATE / NOW) : retards, échéances proches et
-- formation terminée restent réalistes quel que soit le jour où le script est lancé.
-- Adresses e-mail en .test (domaine réservé) : aucun e-mail ne part chez une vraie personne,
-- sauf le compte Super Admin.
--
-- Scénarios couverts :
--   - formateurs « Compétent » (Tiana, Voahangy), « Non compétent » (Hery), « Pas assez d'avis » (Lalaina)
--   - paiements validés, en attente (mobile), refusé ; échéances en retard (Toky, Fano)
--   - 2 inscriptions en ligne à valider (Mahery, Miora), 1 inscription Accueil non validée (Haja)
--   - formation terminée (Fitiavana, Bureautique) et formation qui se termine bientôt (Nomena)
--   - support programmé (publication dans 2 jours), support image, fil de discussion avec mentions
--   - demandes d'assistance en attente et résolues, notifications, présences

USE gestion_formation_db;

-- ============================================
-- 1. TABLES DE RÉFÉRENCE
-- ============================================
INSERT INTO role (id_role, nom, etat) VALUES
(1, 'Super Admin', true),
(2, 'Accueil', true),
(3, 'Formateur', true),
(4, 'Étudiant', true);

-- id_tranche = nombre de tranches (T1 = 1 ... T4 = 4)
INSERT INTO tranche (id_tranche, code, nom, etat) VALUES
(1, 'T1', 'Paiement Comptant (1 tranche)', true),
(2, 'T2', 'Paiement en 2 Tranches', true),
(3, 'T3', 'Paiement en 3 Tranches', true),
(4, 'T4', 'Paiement en 4 Tranches', true);

INSERT INTO statut (id_statut, nom, etat) VALUES
(1, 'En attente', true),
(2, 'Résolu', true);

INSERT INTO mode_paiement (id_mode_paiement, nom) VALUES
(1, 'Cash'),
(2, 'Virement bancaire');

INSERT INTO type_reaction (id_type_reaction, nom, icone, etat) VALUES
(1, 'like', '👍', true),
(2, 'coeur', '❤️', true),
(3, 'utile', '💡', true),
(4, 'dislike', '👎', true);

-- ============================================
-- 2. UTILISATEURS (mot de passe : admin123)
-- ============================================
SET @mdp = '$2b$10$7lwNEvUWq.rBC8xU5jVF1.pOAJ22UiPHlNMglbth3OtRXlxcndDU6';

INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, telephone, id_role, photo, date_creation, etat) VALUES
-- Personnel
(1,  'Nantenaina',      'Elia',          'tljelia374@gmail.com',                @mdp, '0321234567', 1, 'utilisateurs/demo-elia.jpg',      DATE_SUB(NOW(), INTERVAL 120 DAY), true),
(2,  'Rasoanaivo',      'Hanitra',       'hanitra.rasoanaivo@imtech.test',      @mdp, '0340211458', 2, 'utilisateurs/demo-hanitra.jpg',   DATE_SUB(NOW(), INTERVAL 110 DAY), true),
(3,  'Andriamanana',    'Mamy',          'mamy.andriamanana@imtech.test',       @mdp, '0331478520', 2, 'utilisateurs/demo-mamy.jpg',      DATE_SUB(NOW(), INTERVAL 100 DAY), true),
-- Formateurs
(4,  'Randrianarisoa',  'Tiana',         'tiana.randrianarisoa@imtech.test',    @mdp, '0345589632', 3, 'utilisateurs/demo-tiana.jpg',     DATE_SUB(NOW(), INTERVAL 100 DAY), true),
(5,  'Rakotomalala',    'Voahangy',      'voahangy.rakotomalala@imtech.test',   @mdp, '0326647851', 3, 'utilisateurs/demo-voahangy.jpg',  DATE_SUB(NOW(), INTERVAL 95 DAY),  true),
(6,  'Rajaonarison',    'Hery',          'hery.rajaonarison@imtech.test',       @mdp, '0347785412', 3, 'utilisateurs/demo-hery.jpg',      DATE_SUB(NOW(), INTERVAL 90 DAY),  true),
(7,  'Razafindrabe',    'Lalaina',       'lalaina.razafindrabe@imtech.test',    @mdp, '0332254789', 3, 'utilisateurs/demo-lalaina.jpg',   DATE_SUB(NOW(), INTERVAL 60 DAY),  true),
-- Étudiants
(8,  'Rakotoarisoa',    'Andry',         'andry.rakotoarisoa@imtech.test',      @mdp, '0341122334', 4, 'utilisateurs/demo-andry.jpg',     DATE_SUB(NOW(), INTERVAL 50 DAY),  true),
(9,  'Randriamampionona','Miora',        'miora.randriamampionona@imtech.test', @mdp, '0322233445', 4, 'utilisateurs/demo-miora.jpg',     DATE_SUB(NOW(), INTERVAL 50 DAY),  true),
(10, 'Rasolofo',        'Fitiavana',     'fitiavana.rasolofo@imtech.test',      @mdp, '0333344556', 4, 'utilisateurs/demo-fitiavana.jpg', DATE_SUB(NOW(), INTERVAL 50 DAY),  true),
(11, 'Ravelojaona',     'Toky',          'toky.ravelojaona@imtech.test',        @mdp, '0344455667', 4, 'utilisateurs/demo-toky.jpg',      DATE_SUB(NOW(), INTERVAL 75 DAY),  true),
(12, 'Andrianjafy',     'Nomena',        'nomena.andrianjafy@imtech.test',      @mdp, '0325566778', 4, 'utilisateurs/demo-nomena.jpg',    DATE_SUB(NOW(), INTERVAL 26 DAY),  true),
(13, 'Rakotondrabe',    'Sitraka',       'sitraka.rakotondrabe@imtech.test',    @mdp, '0336677889', 4, 'utilisateurs/demo-sitraka.jpg',   DATE_SUB(NOW(), INTERVAL 45 DAY),  true),
(14, 'Raharimanana',    'Onja',          'onja.raharimanana@imtech.test',       @mdp, '0347788990', 4, 'utilisateurs/demo-onja.jpg',      DATE_SUB(NOW(), INTERVAL 45 DAY),  true),
(15, 'Rabe',            'Fanomezantsoa', 'fanomezantsoa.rabe@imtech.test',      @mdp, '0328899001', 4, 'utilisateurs/demo-fano.jpg',      DATE_SUB(NOW(), INTERVAL 45 DAY),  true),
(16, 'Ramanantsoa',     'Ny Aina',       'nyaina.ramanantsoa@imtech.test',      @mdp, '0339900112', 4, 'utilisateurs/demo-nyaina.jpg',    DATE_SUB(NOW(), INTERVAL 20 DAY),  true),
(17, 'Randrianasolo',   'Haja',          'haja.randrianasolo@imtech.test',      @mdp, '0341011121', 4, 'utilisateurs/demo-haja.jpg',      DATE_SUB(NOW(), INTERVAL 20 DAY),  true),
(18, 'Razanakoto',      'Tsiory',        'tsiory.razanakoto@imtech.test',       @mdp, '0321213141', 4, 'utilisateurs/demo-tsiory.jpg',    DATE_SUB(NOW(), INTERVAL 12 DAY),  true),
(19, 'Rabemananjara',   'Mahery',        'mahery.rabemananjara@imtech.test',    @mdp, '0331314151', 4, 'utilisateurs/demo-mahery.jpg',    DATE_SUB(NOW(), INTERVAL 2 DAY),   true);

-- Dossiers étudiants (Mahery, inscrit en ligne : pièces pas encore fournies)
INSERT INTO etudiant (id_etudiant, id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat) VALUES
(1,  8,  'etudiants/demo-andry-photo.jpg',     'etudiants/demo-andry-photo.jpg',     'etudiants/demo-andry-residence.png',     'etudiants/demo-andry-cin.png',     true),
(2,  9,  'etudiants/demo-miora-photo.jpg',     'etudiants/demo-miora-photo.jpg',     'etudiants/demo-miora-residence.png',     'etudiants/demo-miora-cin.png',     true),
(3,  10, 'etudiants/demo-fitiavana-photo.jpg', 'etudiants/demo-fitiavana-photo.jpg', 'etudiants/demo-fitiavana-residence.png', 'etudiants/demo-fitiavana-cin.png', true),
(4,  11, 'etudiants/demo-toky-photo.jpg',      'etudiants/demo-toky-photo.jpg',      'etudiants/demo-toky-residence.png',      'etudiants/demo-toky-cin.png',      true),
(5,  12, 'etudiants/demo-nomena-photo.jpg',    'etudiants/demo-nomena-photo.jpg',    'etudiants/demo-nomena-residence.png',    'etudiants/demo-nomena-cin.png',    true),
(6,  13, 'etudiants/demo-sitraka-photo.jpg',   'etudiants/demo-sitraka-photo.jpg',   'etudiants/demo-sitraka-residence.png',   'etudiants/demo-sitraka-cin.png',   true),
(7,  14, 'etudiants/demo-onja-photo.jpg',      'etudiants/demo-onja-photo.jpg',      'etudiants/demo-onja-residence.png',      'etudiants/demo-onja-cin.png',      true),
(8,  15, 'etudiants/demo-fano-photo.jpg',      'etudiants/demo-fano-photo.jpg',      'etudiants/demo-fano-residence.png',      'etudiants/demo-fano-cin.png',      true),
(9,  16, 'etudiants/demo-nyaina-photo.jpg',    'etudiants/demo-nyaina-photo.jpg',    'etudiants/demo-nyaina-residence.png',    'etudiants/demo-nyaina-cin.png',    true),
(10, 17, 'etudiants/demo-haja-photo.jpg',      'etudiants/demo-haja-photo.jpg',      'etudiants/demo-haja-residence.png',      'etudiants/demo-haja-cin.png',      true),
(11, 18, 'etudiants/demo-tsiory-photo.jpg',    'etudiants/demo-tsiory-photo.jpg',    'etudiants/demo-tsiory-residence.png',    'etudiants/demo-tsiory-cin.png',    true),
(12, 19, NULL, NULL, NULL, NULL, true);

-- ============================================
-- 3. FORMATIONS
-- ============================================
INSERT INTO formation (id_formation, id_utilisateur, nom, description, engagement_formateur, tarif, duree, duree_jours, etat) VALUES
(1, 4, 'Développement web',
 'Créer des sites web modernes avec HTML, CSS et JavaScript : structure des pages, mise en page responsive, interactions. Projet final : un site vitrine complet.',
 'Disponible du lundi au vendredi de 8 h à 17 h. Réponse aux questions sous 24 h, correction des exercices chaque semaine.',
 450000, '3 mois', 90, true),
(2, 5, 'Bureautique',
 'Maîtriser Word, Excel et PowerPoint pour le travail de bureau : documents professionnels, tableaux de calcul, présentations.',
 'Disponible tous les matins. Séance de questions-réponses chaque vendredi.',
 200000, '1 mois', 30, true),
(3, 6, 'Réseaux informatiques',
 'Comprendre et installer un réseau local : modèle OSI, adressage IP, câblage, configuration d''un routeur et maintenance de base.',
 'Disponible le mardi et le jeudi après-midi.',
 350000, '2 mois', 60, true),
(4, 7, 'Infographie',
 'Créer des visuels avec Photoshop et Illustrator : retouche photo, logos, affiches et charte graphique.',
 NULL, -- pas encore renseigné : la vitrine affiche le texte par défaut
 300000, '2 mois', 60, true),
(5, 4, 'Python pour débutants',
 'Apprendre à programmer avec Python : variables, conditions, boucles, fonctions et petits programmes utiles.',
 'Disponible du lundi au vendredi. Les exercices sont corrigés sous 48 h.',
 300000, '2 mois', 60, true),
(6, 5, 'Excel avancé',
 'Tableaux croisés dynamiques, RECHERCHEV, graphiques et tableaux de bord pour suivre une activité.',
 'Disponible tous les matins, accompagnement individuel sur demande.',
 180000, '1 mois', 30, true);

-- ============================================
-- 4. INSCRIPTIONS ET ÉCHÉANCIERS
-- ============================================
-- jours = ancienneté de l'inscription ; nb = nombre de tranches
CREATE TEMPORARY TABLE seed_inscription (
  id_inscription INT, id_etudiant INT, id_utilisateur INT, id_formation INT,
  jours INT, nb INT, valide BOOLEAN, origine VARCHAR(10)
);
INSERT INTO seed_inscription VALUES
(1,  1,  8,  1, 50, 3, true,  'accueil'),  -- Andry      : Développement web, à jour
(2,  2,  9,  1, 50, 1, true,  'accueil'),  -- Miora      : Développement web, payé comptant
(3,  3,  10, 1, 50, 2, true,  'accueil'),  -- Fitiavana  : Développement web
(4,  4,  11, 1, 75, 3, true,  'accueil'),  -- Toky       : 2e tranche EN RETARD (virement refusé)
(5,  5,  12, 2, 26, 1, true,  'accueil'),  -- Nomena     : Bureautique, se termine dans 4 jours
(6,  6,  13, 2, 26, 2, true,  'accueil'),  -- Sitraka    : 2e tranche payée sur mobile, à valider
(7,  7,  14, 3, 45, 3, true,  'accueil'),  -- Onja       : Réseaux, à jour
(8,  8,  15, 3, 45, 3, true,  'accueil'),  -- Fano       : 2e tranche EN RETARD
(9,  9,  16, 4, 20, 2, true,  'accueil'),  -- Ny Aina    : Infographie
(10, 10, 17, 4, 20, 1, true,  'accueil'),  -- Haja       : Infographie
(11, 11, 18, 5, 12, 2, true,  'accueil'),  -- Tsiory     : Python
(12, 1,  8,  5, 12, 2, true,  'accueil'),  -- Andry      : 2e formation (Python)
(13, 12, 19, 6, 2,  1, false, 'en_ligne'), -- Mahery     : inscription en ligne À VALIDER
(14, 2,  9,  6, 1,  2, false, 'en_ligne'), -- Miora      : inscription en ligne À VALIDER
(15, 10, 17, 2, 0,  1, false, 'accueil'),  -- Haja       : saisie par l'Accueil, pas encore payée
(16, 3,  10, 2, 35, 1, true,  'accueil'),  -- Fitiavana  : Bureautique TERMINÉE (attestation à faire)
(17, 6,  13, 3, 45, 1, true,  'accueil');  -- Sitraka    : Réseaux, payé comptant

INSERT INTO inscription (id_inscription, id_etudiant, id_utilisateur, id_formation, date_inscription, valide, origine, etat)
SELECT id_inscription, id_etudiant, id_utilisateur, id_formation,
       DATE_SUB(NOW(), INTERVAL jours DAY), valide, origine, true
FROM seed_inscription ORDER BY id_inscription;

-- Même calcul que echeanceService.calculerEcheancier :
-- tranche n à date d'inscription + n × (durée / nb) jours ; la dernière absorbe l'écart d'arrondi.
INSERT INTO echeance (id_inscription, id_tranche, montant_prevu, date_echeance, genere_auto, etat)
SELECT s.id_inscription, s.nb,
       CASE WHEN n.n = s.nb
            THEN f.tarif - FLOOR(f.tarif * 100 / s.nb) / 100 * (s.nb - 1)
            ELSE FLOOR(f.tarif * 100 / s.nb) / 100 END,
       DATE_ADD(DATE(i.date_inscription), INTERVAL FLOOR(f.duree_jours / s.nb) * n.n DAY),
       true, true
FROM seed_inscription s
JOIN inscription i ON i.id_inscription = s.id_inscription
JOIN formation f ON f.id_formation = s.id_formation
JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) n ON n.n <= s.nb
ORDER BY s.id_inscription, n.n;

-- ============================================
-- 5. PAIEMENTS
-- ============================================
-- numero = rang de l'échéance dans l'inscription ; montant = montant prévu de l'échéance
CREATE TEMPORARY TABLE seed_paiement (
  ordre INT, id_inscription INT, numero INT, id_mode_paiement INT,
  reference VARCHAR(100), jours INT, statut VARCHAR(10)
);
INSERT INTO seed_paiement VALUES
(1,  1,  1, 1, NULL,            50, 'valide'),
(2,  2,  1, 2, 'VIR-2026-0412', 50, 'valide'),
(3,  3,  1, 1, NULL,            50, 'valide'),
(4,  4,  1, 1, NULL,            75, 'valide'),
(5,  4,  2, 2, 'VIR-2026-0587', 13, 'refuse'),     -- référence introuvable à la banque
(6,  5,  1, 1, NULL,            26, 'valide'),
(7,  6,  1, 1, NULL,            26, 'valide'),
(8,  6,  2, 2, 'VIR-2026-0733', 1,  'en_attente'), -- payé depuis le mobile
(9,  7,  1, 2, 'VIR-2026-0498', 45, 'valide'),
(10, 7,  2, 2, 'VIR-2026-0701', 6,  'valide'),
(11, 8,  1, 1, NULL,            45, 'valide'),
(12, 9,  1, 1, NULL,            20, 'valide'),
(13, 10, 1, 2, 'VIR-2026-0655', 20, 'valide'),
(14, 11, 1, 1, NULL,            12, 'valide'),
(15, 12, 1, 1, NULL,            12, 'valide'),
(16, 13, 1, 2, 'VIR-2026-0761', 2,  'en_attente'), -- déclaré à l'inscription en ligne
(17, 14, 1, 2, 'VIR-2026-0768', 1,  'en_attente'), -- déclaré à l'inscription en ligne
(18, 16, 1, 1, NULL,            35, 'valide'),
(19, 17, 1, 1, NULL,            45, 'valide');

INSERT INTO paiement (id_echeance, id_mode_paiement, montant, date_paiement, reference_virement, statut, etat)
SELECT e.id_echeance, p.id_mode_paiement, e.montant_prevu,
       DATE_SUB(CURDATE(), INTERVAL p.jours DAY), p.reference, p.statut, true
FROM seed_paiement p
JOIN (
  SELECT id_echeance, id_inscription, montant_prevu,
         ROW_NUMBER() OVER (PARTITION BY id_inscription ORDER BY date_echeance, id_echeance) AS numero
  FROM echeance
) e ON e.id_inscription = p.id_inscription AND e.numero = p.numero
ORDER BY p.ordre;

-- ============================================
-- 6. SUPPORTS DE COURS
-- ============================================
INSERT INTO support (id_support, id_formation, id_utilisateur, titre, fichier, statut, date_envoi_prevue, annonce_envoyee, date_publication, etat) VALUES
(1,  1, 4, 'Introduction au HTML',                    'supports/demo-introduction-html.pdf',   'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 48 DAY), true),
(2,  1, 4, 'Mise en page avec CSS',                   'supports/demo-mise-en-page-css.pdf',    'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 30 DAY), true),
(3,  1, 4, 'Les bases de JavaScript',                 'supports/demo-bases-javascript.pdf',    'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 10 DAY), true),
-- Programmé : publié automatiquement dans 2 jours à 8 h (étudiants prévenus 1 h avant)
(4,  1, 4, 'Projet : site vitrine',                   'supports/demo-projet-site-vitrine.pdf', 'programme',
     DATE_ADD(CURDATE(), INTERVAL '2 8' DAY_HOUR), false, DATE_ADD(CURDATE(), INTERVAL '2 8' DAY_HOUR), true),
(5,  2, 5, 'Word : mise en forme d''un document',     'supports/demo-word-mise-en-forme.pdf',  'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 24 DAY), true),
(6,  2, 5, 'Excel : formules de base',                'supports/demo-excel-formules.pdf',      'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 15 DAY), true),
(7,  3, 6, 'Le modèle OSI',                           'supports/demo-modele-osi.pdf',          'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 43 DAY), true),
(8,  3, 6, 'Adressage IP et sous-réseaux',            'supports/demo-adressage-ip.pdf',        'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 20 DAY), true),
(9,  4, 7, 'Palette de couleurs (charte graphique)',  'supports/demo-palette-couleurs.png',    'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 15 DAY), true),
(10, 4, 7, 'Illustrator : outils de base',            'supports/demo-illustrator-outils.pdf',  'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 8 DAY),  true),
(11, 5, 4, 'Variables et types en Python',            'supports/demo-python-variables.pdf',    'publie', NULL, false, DATE_SUB(NOW(), INTERVAL 10 DAY), true);

-- ============================================
-- 7. RÉACTIONS (avis sur les formateurs)
-- ============================================
-- 1 = 👍, 2 = ❤️, 3 = 💡, 4 = 👎
-- Tiana    : 12 réactions, 92 % positives -> Compétent
-- Voahangy :  6 réactions, 83 % positives -> Compétent
-- Hery     :  6 réactions, 33 % positives -> Non compétent
-- Lalaina  :  3 réactions                 -> Pas assez d'avis
INSERT INTO reaction (id_support, id_utilisateur, id_type_reaction, date_reaction) VALUES
(1, 8, 1, DATE_SUB(NOW(), INTERVAL 47 DAY)), (1, 9, 2, DATE_SUB(NOW(), INTERVAL 47 DAY)),
(1, 10, 3, DATE_SUB(NOW(), INTERVAL 46 DAY)), (1, 11, 1, DATE_SUB(NOW(), INTERVAL 45 DAY)),
(2, 8, 3, DATE_SUB(NOW(), INTERVAL 29 DAY)), (2, 9, 1, DATE_SUB(NOW(), INTERVAL 29 DAY)),
(2, 10, 2, DATE_SUB(NOW(), INTERVAL 28 DAY)), (2, 11, 4, DATE_SUB(NOW(), INTERVAL 27 DAY)),
(3, 8, 1, DATE_SUB(NOW(), INTERVAL 9 DAY)),  (3, 9, 3, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(11, 18, 2, DATE_SUB(NOW(), INTERVAL 9 DAY)), (11, 8, 1, DATE_SUB(NOW(), INTERVAL 8 DAY)),
(5, 12, 1, DATE_SUB(NOW(), INTERVAL 23 DAY)), (5, 13, 3, DATE_SUB(NOW(), INTERVAL 22 DAY)),
(5, 10, 2, DATE_SUB(NOW(), INTERVAL 22 DAY)), (6, 12, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)),
(6, 13, 4, DATE_SUB(NOW(), INTERVAL 13 DAY)), (6, 10, 1, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(7, 14, 4, DATE_SUB(NOW(), INTERVAL 41 DAY)), (7, 15, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
(7, 13, 4, DATE_SUB(NOW(), INTERVAL 40 DAY)), (8, 14, 4, DATE_SUB(NOW(), INTERVAL 19 DAY)),
(8, 15, 4, DATE_SUB(NOW(), INTERVAL 18 DAY)), (8, 13, 3, DATE_SUB(NOW(), INTERVAL 18 DAY)),
(9, 16, 2, DATE_SUB(NOW(), INTERVAL 14 DAY)), (9, 17, 1, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(10, 16, 3, DATE_SUB(NOW(), INTERVAL 7 DAY));

-- ============================================
-- 8. COMMENTAIRES (fil de discussion) ET MENTIONS
-- ============================================
-- id_parent NULL = commentaire principal ; id_etudiant renseigné seulement si l'auteur est un étudiant
INSERT INTO commentaire (id_commentaire, id_support, id_parent, id_etudiant, id_utilisateur, contenu, date_commentaire, etat) VALUES
(1,  1, NULL, 1,    8,  'Est-ce qu''on peut utiliser VS Code pour les exercices ?', DATE_SUB(NOW(), INTERVAL 46 DAY), true),
(2,  1, 1,    NULL, 4,  '@Andry Rakotoarisoa Oui, VS Code est recommandé. Installez aussi l''extension Live Server pour voir les changements en direct.', DATE_SUB(NOW(), INTERVAL 46 DAY), true),
(3,  1, 1,    2,    9,  '@Andry Rakotoarisoa Je l''utilise aussi, ça marche très bien.', DATE_SUB(NOW(), INTERVAL 45 DAY), true),
(4,  2, NULL, 3,    10, 'Je n''ai pas bien compris la différence entre margin et padding.', DATE_SUB(NOW(), INTERVAL 28 DAY), true),
(5,  2, 4,    NULL, 4,  '@Fitiavana Rasolofo margin = espace extérieur, padding = espace intérieur. Regardez la partie 2 du support.', DATE_SUB(NOW(), INTERVAL 28 DAY), true),
(6,  3, NULL, 4,    11, 'Le support est très clair, merci !', DATE_SUB(NOW(), INTERVAL 9 DAY), true),
(7,  6, NULL, 5,    12, 'Pourriez-vous ajouter un exercice sur RECHERCHEV ?', DATE_SUB(NOW(), INTERVAL 14 DAY), true),
(8,  6, 7,    NULL, 5,  '@Nomena Andrianjafy Bonne idée, je l''ajoute au prochain support.', DATE_SUB(NOW(), INTERVAL 13 DAY), true),
(9,  7, NULL, 7,    14, 'Les schémas sont difficiles à lire, l''image est de mauvaise qualité.', DATE_SUB(NOW(), INTERVAL 40 DAY), true),
(10, 7, 9,    8,    15, '@Onja Raharimanana Pareil pour moi, surtout la partie sur la couche transport.', DATE_SUB(NOW(), INTERVAL 39 DAY), true),
(11, 11, NULL, 11,  18, 'Est-ce qu''il y aura un TP noté sur les variables ?', DATE_SUB(NOW(), INTERVAL 8 DAY), true);

INSERT INTO commentaire_mention (id_commentaire, id_etudiant_mentionne) VALUES
(2, 1), (3, 1), (5, 3), (8, 5), (10, 7);

-- ============================================
-- 9. ASSISTANCE
-- ============================================
-- id_statut : 1 = En attente, 2 = Résolu ; id_utilisateur = membre du personnel qui l'a résolue
INSERT INTO assistance (id_etudiant, id_utilisateur, id_statut, objet, contenu, date_envoi, date_resolution, etat) VALUES
(4, NULL, 1, 'Paiement refusé',
 'Mon virement pour la 2e tranche a été refusé alors que j''ai bien payé. Que dois-je faire ?',
 DATE_SUB(NOW(), INTERVAL 12 DAY), NULL, true),
(8, NULL, 1, 'Retard de paiement',
 'Je pourrai régler la 2e tranche la semaine prochaine, est-ce possible ?',
 DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, true),
(5, NULL, 1, 'Attestation',
 'Ma formation se termine bientôt, quand pourrai-je recevoir mon attestation ?',
 DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, true),
(1, 2, 2, 'Accès aux supports',
 'Je ne voyais pas le support de CSS dans l''application.',
 DATE_SUB(NOW(), INTERVAL 29 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY), true),
(9, 3, 2, 'Mot de passe oublié',
 'Je n''arrive plus à me connecter, je n''ai pas reçu le code de réinitialisation.',
 DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), true);

-- ============================================
-- 10. NOTIFICATIONS
-- ============================================
INSERT INTO notification_inapp (id_utilisateur, message, lu, etat, date_creation) VALUES
-- Accueil (Hanitra et Mamy)
(2, 'Nouvelle inscription en ligne : Mahery Rabemananjara, 1 formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions.', false, true, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 'Nouvelle inscription en ligne : Mahery Rabemananjara, 1 formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions.', false, true, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Nouvelle inscription en ligne : Miora Randriamampionona, 1 formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions.', false, true, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 'Nouvelle inscription en ligne : Miora Randriamampionona, 1 formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions.', false, true, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'Sitraka Rakotondrabe a payé 100 000 MGA (Bureautique) via Virement bancaire. Paiement à valider.', false, true, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, 'Sitraka Rakotondrabe a payé 100 000 MGA (Bureautique) via Virement bancaire. Paiement à valider.', false, true, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'Toky Ravelojaona a envoyé une demande d''assistance : « Paiement refusé ».', true, true, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(2, 'Fanomezantsoa Rabe a envoyé une demande d''assistance : « Retard de paiement ».', false, true, DATE_SUB(NOW(), INTERVAL 2 DAY)),
(2, 'Nomena Andrianjafy a envoyé une demande d''assistance : « Attestation ».', false, true, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 'Fitiavana Rasolofo a fini sa formation Bureautique, envoyez-lui son attestation.', false, true, DATE_SUB(NOW(), INTERVAL 5 DAY)),
-- Étudiants
(8,  'Votre inscription a été confirmée.', true, true, DATE_SUB(NOW(), INTERVAL 50 DAY)),
(8,  'Tiana Randrianarisoa a répondu à votre commentaire.', true, true, DATE_SUB(NOW(), INTERVAL 46 DAY)),
(8,  'Votre demande d''assistance « Accès aux supports » a été résolue.', true, true, DATE_SUB(NOW(), INTERVAL 28 DAY)),
(11, 'Votre paiement de 150 000 MGA (Développement web) a été refusé. Contactez l''accueil.', false, true, DATE_SUB(NOW(), INTERVAL 12 DAY)),
(15, CONCAT('Rappel : 116 666,66 MGA à régler pour la formation Réseaux informatiques avant le ',
            DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '%d/%m/%Y'), '.'), false, true, DATE_SUB(NOW(), INTERVAL 3 DAY)),
(12, 'Voahangy Rakotomalala vous a mentionné dans un commentaire.', false, true, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(18, 'Nouveau support disponible : Variables et types en Python (Python pour débutants).', true, true, DATE_SUB(NOW(), INTERVAL 10 DAY)),
(19, 'Votre inscription en ligne a bien été reçue. Elle sera validée par l''accueil après vérification de votre paiement.', false, true, DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ============================================
-- 11. PRÉSENCES (jours ouvrés où l'étudiant a utilisé l'application)
-- ============================================
-- taux = assiduité sur 10 (10 = tous les jours) ; à partir de sa première inscription validée
CREATE TEMPORARY TABLE seed_assiduite (id_utilisateur INT, taux INT);
INSERT INTO seed_assiduite VALUES
(8, 9), (9, 8), (10, 9), (11, 4), (12, 10), (13, 6), (14, 7), (15, 3), (16, 8), (17, 6), (18, 9);

INSERT INTO presence (id_utilisateur, jour)
SELECT a.id_utilisateur, j.jour
FROM seed_assiduite a
JOIN (SELECT id_utilisateur, MIN(DATE(date_inscription)) AS debut
      FROM inscription WHERE valide = true GROUP BY id_utilisateur) d ON d.id_utilisateur = a.id_utilisateur
JOIN (SELECT DATE_SUB(CURDATE(), INTERVAL (u.n + 10 * t.n) DAY) AS jour
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) u
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) t
     ) j ON j.jour >= d.debut
WHERE WEEKDAY(j.jour) < 5
  AND MOD(DAYOFYEAR(j.jour) * 7 + a.id_utilisateur * 3, 10) < a.taux
ORDER BY a.id_utilisateur, j.jour;

DROP TEMPORARY TABLE seed_inscription;
DROP TEMPORARY TABLE seed_paiement;
DROP TEMPORARY TABLE seed_assiduite;
