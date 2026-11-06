-- ============================================
-- DONNÉES DE DÉMONSTRATION IMTECH INFO (juillet -> octobre 2026)
-- ============================================
-- Ordre : reinit.sql (vide la base) -> donneesTest.sql -> node scripts/fichiersDemo.js (photos, supports).
-- Mot de passe de TOUS les comptes : admin123
-- Dates FIXES (pas relatives au jour d'exécution) : les états et les chiffres du mémoire restent
-- identiques à chaque rechargement. Le jeu est pensé pour être consulté le lundi 26/10/2026 :
-- lancé plus tard, d'autres échéances passent en retard et d'autres formations se terminent.
-- Adresses e-mail en .test (domaine réservé) : aucun e-mail ne part chez une vraie personne,
-- sauf les comptes Super Admin, Accueil et Tiana (formateur) : vraies boîtes Gmail. Données fictives.
--
-- Volume : 1 Super Admin, 1 Accueil, 5 formateurs, 7 formations, 10 étudiants, 25 inscriptions
-- (juillet 6, août 8, septembre 5, octobre 6), leurs échéanciers et paiements, 18 supports,
-- 47 réactions, commentaires, demandes d'assistance, notifications et présences.
--
-- Scénarios couverts (au 26/10/2026) :
--   - formateurs « Compétent » (Tiana, Voahangy, Rivo), « Non compétent » (Hery), « Pas assez d'avis » (Lalaina)
--   - échéances EN RETARD (rouge) : Toky (virement refusé puis rien), Fanomezantsoa (2e et 3e tranches)
--   - échéances À RAPPELER (jaune) : Tsiory (aujourd'hui), Andry et Onja (28/10)
--   - paiements en attente de validation : Sitraka (mobile), Miora (inscription en ligne)
--   - 1 inscription en ligne à valider (Miora), 1 inscription Accueil non validée (Fitiavana)
--   - attestations délivrées pour les formations terminées et soldées ; bloquées pour Toky et
--     Fanomezantsoa (reste à payer), Tsiory (note de présentation à attribuer) ; Rindra (Python) et
--     Onja (Maintenance) : prêtes, envoyées automatiquement au démarrage du serveur
--   - notes : retards d'un jour (Miora, Fitiavana, Onja), tranche réglée 4 jours après (Rindra)
--   - support programmé (28/10 à 8 h), supports texte, support image, fils de discussion avec mentions

USE gestion_formation_db;

-- Accents corrects même avec le client mysql en ligne de commande
SET NAMES utf8mb4;

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
-- Personnel : Super Admin, Accueil, 5 formateurs
(1, 'Nantenaina', 'Elia', 'tljelia374@gmail.com', @mdp, '0321234567', 1, 'utilisateurs/demo-elia.jpg', '2026-06-01 08:00:00', true),
(2, 'Rasoanaivo', 'Hanitra', 'test123acceuil@gmail.com', @mdp, '0340211458', 2, 'utilisateurs/demo-hanitra.jpg', '2026-06-02 08:30:00', true),
(3, 'Randrianarisoa', 'Tiana', 'tolojanaharyelia845@gmail.com', @mdp, '0345589632', 3, 'utilisateurs/demo-tiana.jpg', '2026-06-03 09:00:00', true),
(4, 'Rakotomalala', 'Voahangy', 'voahangy.rakotomalala@imtech.test', @mdp, '0326647851', 3, 'utilisateurs/demo-voahangy.jpg', '2026-06-03 09:30:00', true),
(5, 'Rajaonarison', 'Hery', 'hery.rajaonarison@imtech.test', @mdp, '0347785412', 3, 'utilisateurs/demo-hery.jpg', '2026-06-04 10:00:00', true),
(6, 'Razafindrabe', 'Lalaina', 'lalaina.razafindrabe@imtech.test', @mdp, '0332254789', 3, 'utilisateurs/demo-lalaina.jpg', '2026-06-15 10:00:00', true),
(7, 'Andrianaivo', 'Rivo', 'rivo.andrianaivo@imtech.test', @mdp, '0348812345', 3, 'utilisateurs/demo-rivo.jpg', '2026-07-01 09:00:00', true),
-- Étudiants (compte créé à leur première inscription)
(8, 'Rakotoarisoa', 'Andry', 'andry.rakotoarisoa@imtech.test', @mdp, '0341122334', 4, 'utilisateurs/demo-andry.jpg', '2026-07-06 09:15:00', true),
(9, 'Ravelojaona', 'Toky', 'toky.ravelojaona@imtech.test', @mdp, '0344455667', 4, 'utilisateurs/demo-toky.jpg', '2026-07-06 10:40:00', true),
(10, 'Randriamampionona', 'Miora', 'miora.randriamampionona@imtech.test', @mdp, '0322233445', 4, 'utilisateurs/demo-miora.jpg', '2026-07-08 08:50:00', true),
(11, 'Rasolofo', 'Fitiavana', 'fitiavana.rasolofo@imtech.test', @mdp, '0333344556', 4, 'utilisateurs/demo-fitiavana.jpg', '2026-07-13 14:20:00', true),
(12, 'Rasoamanarivo', 'Rindra', 'rindra.rasoamanarivo@imtech.test', @mdp, '0341203040', 4, 'utilisateurs/demo-rindra.jpg', '2026-07-15 09:05:00', true),
(13, 'Andriamihaja', 'Lova', 'lova.andriamihaja@imtech.test', @mdp, '0322304050', 4, 'utilisateurs/demo-lova.jpg', '2026-07-15 11:30:00', true),
(14, 'Raharimanana', 'Onja', 'onja.raharimanana@imtech.test', @mdp, '0347788990', 4, 'utilisateurs/demo-onja.jpg', '2026-08-03 09:00:00', true),
(15, 'Rabe', 'Fanomezantsoa', 'fanomezantsoa.rabe@imtech.test', @mdp, '0328899001', 4, 'utilisateurs/demo-fano.jpg', '2026-08-03 09:40:00', true),
(16, 'Rakotondrabe', 'Sitraka', 'sitraka.rakotondrabe@imtech.test', @mdp, '0336677889', 4, 'utilisateurs/demo-sitraka.jpg', '2026-08-05 10:15:00', true),
(17, 'Razanakoto', 'Tsiory', 'tsiory.razanakoto@imtech.test', @mdp, '0321213141', 4, 'utilisateurs/demo-tsiory.jpg', '2026-09-15 15:00:00', true);

-- Dossiers étudiants
INSERT INTO etudiant (id_etudiant, id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat) VALUES
(1, 8, 'etudiants/demo-andry-photo.jpg', 'etudiants/demo-andry-photo.jpg', 'etudiants/demo-andry-residence.png', 'etudiants/demo-andry-cin.png', true),
(2, 9, 'etudiants/demo-toky-photo.jpg', 'etudiants/demo-toky-photo.jpg', 'etudiants/demo-toky-residence.png', 'etudiants/demo-toky-cin.png', true),
(3, 10, 'etudiants/demo-miora-photo.jpg', 'etudiants/demo-miora-photo.jpg', 'etudiants/demo-miora-residence.png', 'etudiants/demo-miora-cin.png', true),
(4, 11, 'etudiants/demo-fitiavana-photo.jpg', 'etudiants/demo-fitiavana-photo.jpg', 'etudiants/demo-fitiavana-residence.png', 'etudiants/demo-fitiavana-cin.png', true),
(5, 12, 'etudiants/demo-rindra-photo.jpg', 'etudiants/demo-rindra-photo.jpg', 'etudiants/demo-rindra-residence.png', 'etudiants/demo-rindra-cin.png', true),
(6, 13, 'etudiants/demo-lova-photo.jpg', 'etudiants/demo-lova-photo.jpg', 'etudiants/demo-lova-residence.png', 'etudiants/demo-lova-cin.png', true),
(7, 14, 'etudiants/demo-onja-photo.jpg', 'etudiants/demo-onja-photo.jpg', 'etudiants/demo-onja-residence.png', 'etudiants/demo-onja-cin.png', true),
(8, 15, 'etudiants/demo-fano-photo.jpg', 'etudiants/demo-fano-photo.jpg', 'etudiants/demo-fano-residence.png', 'etudiants/demo-fano-cin.png', true),
(9, 16, 'etudiants/demo-sitraka-photo.jpg', 'etudiants/demo-sitraka-photo.jpg', 'etudiants/demo-sitraka-residence.png', 'etudiants/demo-sitraka-cin.png', true),
(10, 17, 'etudiants/demo-tsiory-photo.jpg', 'etudiants/demo-tsiory-photo.jpg', 'etudiants/demo-tsiory-residence.png', 'etudiants/demo-tsiory-cin.png', true);

-- ============================================
-- 3. FORMATIONS
-- ============================================
INSERT INTO formation (id_formation, id_utilisateur, nom, description, engagement_formateur, image, tarif, duree, duree_jours, etat) VALUES
(1, 3, 'Développement web',
 'Créer des sites web modernes avec HTML, CSS et JavaScript : structure des pages, mise en page responsive, interactions. Projet final : un site vitrine complet.',
 'Disponible du lundi au vendredi de 8 h à 17 h. Réponse aux questions sous 24 h, correction des exercices chaque semaine.',
 'formations/demo-developpement-web.jpg',
 450000, '3 mois', 90, true),
(2, 4, 'Bureautique',
 'Maîtriser Word, Excel et PowerPoint pour le travail de bureau : documents professionnels, tableaux de calcul, présentations.',
 'Disponible tous les matins. Séance de questions-réponses chaque vendredi.',
 'formations/demo-bureautique.jpg',
 200000, '1 mois', 30, true),
(3, 5, 'Réseaux informatiques',
 'Comprendre et installer un réseau local : modèle OSI, adressage IP, câblage, configuration d''un routeur et maintenance de base.',
 'Disponible le mardi et le jeudi après-midi.',
 'formations/demo-reseaux.jpg',
 350000, '2 mois', 60, true),
(4, 6, 'Infographie',
 'Créer des visuels avec Photoshop et Illustrator : retouche photo, logos, affiches et charte graphique.',
 NULL, -- pas encore renseigné : la vitrine affiche le texte par défaut
 'formations/demo-infographie.jpg',
 300000, '2 mois', 60, true),
(5, 3, 'Python pour débutants',
 'Apprendre à programmer avec Python : variables, conditions, boucles, fonctions et petits programmes utiles.',
 'Disponible du lundi au vendredi. Les exercices sont corrigés sous 48 h.',
 'formations/demo-python.jpg',
 300000, '2 mois', 60, true),
(6, 4, 'Excel avancé',
 'Tableaux croisés dynamiques, RECHERCHEV, graphiques et tableaux de bord pour suivre une activité.',
 'Disponible tous les matins, accompagnement individuel sur demande.',
 'formations/demo-excel.jpg',
 180000, '1 mois', 30, true),
(7, 7, 'Maintenance informatique',
 'Diagnostiquer et réparer un ordinateur : démontage, remplacement de pièces, installation de Windows et des pilotes, sauvegardes.',
 'Atelier pratique le lundi, le mercredi et le vendredi matin. Matériel fourni.',
 'formations/demo-maintenance.jpg',
 250000, '6 semaines', 45, true);

-- ============================================
-- 4. INSCRIPTIONS ET ÉCHÉANCIERS
-- ============================================
-- 25 inscriptions : juillet 6, août 8, septembre 5, octobre 6 (dont 2 pas encore validées).
-- Fin de formation = date d'inscription + durée ; nb = nombre de tranches.
CREATE TEMPORARY TABLE seed_inscription (
  id_inscription INT, id_etudiant INT, id_utilisateur INT, id_formation INT,
  date_inscription DATETIME, nb INT, valide BOOLEAN, origine VARCHAR(10), note_presentation DECIMAL(4,2)
);
INSERT INTO seed_inscription VALUES
-- Juillet
(1 , 1 , 8 , 1, '2026-07-06 09:15:00', 3, true , 'accueil' , 8),  -- Andry     : Développement web (fin 04/10), à jour, attestation envoyée
(2 , 2 , 9 , 1, '2026-07-06 10:40:00', 3, true , 'accueil' , 6),  -- Toky      : Développement web (fin 04/10), 2e virement refusé, 2e et 3e tranches impayées : attestation bloquée
(3 , 3 , 10, 1, '2026-07-08 08:50:00', 1, true , 'accueil' , 9),  -- Miora     : Développement web (fin 06/10), payé comptant, attestation envoyée
(4 , 4 , 11, 2, '2026-07-13 14:20:00', 1, true , 'accueil' , 7),  -- Fitiavana : Bureautique (fin 12/08), attestation envoyée
(5 , 5 , 12, 2, '2026-07-15 09:05:00', 2, true , 'accueil' , 8),  -- Rindra    : Bureautique (fin 14/08), attestation envoyée
(6 , 6 , 13, 4, '2026-07-15 11:30:00', 2, true , 'accueil' , 9),  -- Lova      : Infographie (fin 13/09), attestation envoyée
-- Août
(7 , 7 , 14, 3, '2026-08-03 09:00:00', 3, true , 'accueil' , 8),  -- Onja      : Réseaux informatiques (fin 02/10), attestation envoyée
(8 , 8 , 15, 3, '2026-08-03 09:40:00', 3, true , 'accueil' , 4),  -- Fanomezantsoa : Réseaux informatiques (fin 02/10), 2e et 3e tranches impayées : attestation bloquée
(9 , 9 , 16, 2, '2026-08-05 10:15:00', 2, true , 'accueil' , 7),  -- Sitraka   : Bureautique (fin 04/09), attestation envoyée
(10, 3 , 10, 4, '2026-08-10 14:00:00', 2, true , 'accueil' , 7),  -- Miora     : Infographie (fin 09/10), 2e tranche réglée le jour suivant (−1)
(11, 4 , 11, 1, '2026-08-17 10:30:00', 2, true , 'accueil' , NULL),  -- Fitiavana : Développement web (fin 15/11), en cours, 1re tranche réglée le jour suivant (−1)
(12, 5 , 12, 5, '2026-08-19 15:30:00', 2, true , 'accueil' , 7),  -- Rindra    : Python pour débutants (fin 18/10), soldé le 22/10 (−2) : attestation envoyée automatiquement
(13, 6 , 13, 7, '2026-08-24 09:45:00', 2, true , 'accueil' , 8),  -- Lova      : Maintenance informatique (fin 08/10), attestation envoyée
(14, 5 , 12, 6, '2026-08-26 13:00:00', 1, true , 'accueil' , 9),  -- Rindra    : Excel avancé (fin 25/09), payé comptant, attestation envoyée
-- Septembre
(15, 7 , 14, 7, '2026-09-08 11:00:00', 2, true , 'accueil' , 8),  -- Onja      : Maintenance informatique (fin 23/10), 2e tranche réglée le jour suivant (−1) : attestation envoyée automatiquement
(16, 10, 17, 2, '2026-09-15 15:00:00', 2, true , 'accueil' , NULL),  -- Tsiory    : Bureautique (fin 15/10), terminée, note de présentation pas encore attribuée
(17, 9 , 16, 3, '2026-09-21 10:00:00', 2, true , 'accueil' , NULL),  -- Sitraka   : Réseaux informatiques (fin 20/11), 1re tranche payée sur mobile, à valider
(18, 10, 17, 5, '2026-09-26 09:00:00', 2, true , 'accueil' , NULL),  -- Tsiory    : Python pour débutants (fin 25/11), 1re tranche due aujourd'hui (26/10) : à rappeler
(19, 1 , 8 , 5, '2026-09-28 16:00:00', 2, true , 'accueil' , NULL),  -- Andry     : Python pour débutants (fin 27/11), 1re tranche due le 28/10 : à rappeler
-- Octobre
(20, 10, 17, 4, '2026-10-05 10:45:00', 1, true , 'accueil' , NULL),  -- Tsiory    : Infographie (fin 04/12), payé comptant, en cours
(21, 5 , 12, 7, '2026-10-08 11:15:00', 1, true , 'accueil' , NULL),  -- Rindra    : Maintenance informatique (fin 22/11), payé comptant, en cours
(22, 7 , 14, 6, '2026-10-13 15:40:00', 2, true , 'accueil' , NULL),  -- Onja      : Excel avancé (fin 12/11), 1re tranche due le 28/10 : à rappeler
(23, 6 , 13, 1, '2026-10-19 10:10:00', 3, true , 'accueil' , NULL),  -- Lova      : Développement web (fin 17/01), en cours
(24, 4 , 11, 6, '2026-10-24 11:00:00', 1, false, 'accueil' , NULL),  -- Fitiavana : Excel avancé (fin 23/11), saisie par l'Accueil, pas encore payée ni validée
(25, 3 , 10, 6, '2026-10-25 20:05:00', 2, false, 'en_ligne', NULL);  -- Miora     : Excel avancé (fin 24/11), inscription en ligne À VALIDER

INSERT INTO inscription (id_inscription, id_etudiant, id_utilisateur, id_formation, date_inscription, valide, origine, note_presentation, etat)
SELECT id_inscription, id_etudiant, id_utilisateur, id_formation, date_inscription, valide, origine, note_presentation, true
FROM seed_inscription ORDER BY id_inscription;

-- Même calcul que echeanceService.calculerEcheancier :
-- tranche n à date d'inscription + n × (durée / nb) jours ; la dernière absorbe l'écart d'arrondi.
INSERT INTO echeance (id_inscription, id_tranche, montant_prevu, date_echeance, genere_auto, etat)
SELECT s.id_inscription, s.nb,
       CASE WHEN n.n = s.nb
            THEN f.tarif - FLOOR(f.tarif * 100 / s.nb) / 100 * (s.nb - 1)
            ELSE FLOOR(f.tarif * 100 / s.nb) / 100 END,
       DATE_ADD(DATE(s.date_inscription), INTERVAL FLOOR(f.duree_jours / s.nb) * n.n DAY),
       true, true
FROM seed_inscription s
JOIN formation f ON f.id_formation = s.id_formation
JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) n ON n.n <= s.nb
ORDER BY s.id_inscription, n.n;

-- ============================================
-- 5. PAIEMENTS
-- ============================================
-- numero = rang de l'échéance dans l'inscription ; montant = montant prévu de l'échéance.
-- Payée à la date (ou avant) : à temps ; le jour suivant : −1 sur la note ; plus tard : −2.
CREATE TEMPORARY TABLE seed_paiement (
  id_inscription INT, numero INT, id_mode_paiement INT, reference VARCHAR(100),
  date_paiement DATETIME, statut VARCHAR(10)
);
INSERT INTO seed_paiement VALUES
(1 , 1, 2, 'VIR-2026-0407', '2026-08-03 11:20:00', 'valide'    ),  -- Andry, tranche 1 (due le 05/08) : à temps
(1 , 2, 1, NULL           , '2026-09-01 12:33:00', 'valide'    ),  -- Andry, tranche 2 (due le 04/09) : à temps
(1 , 3, 2, 'VIR-2026-0414', '2026-10-04 13:46:00', 'valide'    ),  -- Andry, tranche 3 (due le 04/10) : à temps
(2 , 1, 1, NULL           , '2026-08-02 12:27:00', 'valide'    ),  -- Toky, tranche 1 (due le 05/08) : à temps
(2 , 2, 2, 'VIR-2026-0421', '2026-09-03 13:40:00', 'refuse'    ),  -- Toky, tranche 2 (due le 04/09) : virement refusé (référence introuvable)
(3 , 1, 2, 'VIR-2026-0428', '2026-07-08 09:10:00', 'valide'    ),  -- Miora, tranche 1 (due le 06/10) : comptant, à l'inscription
(4 , 1, 2, 'VIR-2026-0435', '2026-07-13 14:40:00', 'valide'    ),  -- Fitiavana, tranche 1 (due le 12/08) : comptant, à l'inscription
(5 , 1, 1, NULL           , '2026-07-28 15:48:00', 'valide'    ),  -- Rindra, tranche 1 (due le 30/07) : à temps
(5 , 2, 2, 'VIR-2026-0442', '2026-08-11 16:01:00', 'valide'    ),  -- Rindra, tranche 2 (due le 14/08) : à temps
(6 , 1, 2, 'VIR-2026-0449', '2026-08-11 16:55:00', 'valide'    ),  -- Lova, tranche 1 (due le 14/08) : à temps
(6 , 2, 2, 'VIR-2026-0456', '2026-09-13 09:08:00', 'valide'    ),  -- Lova, tranche 2 (due le 13/09) : à temps
(7 , 1, 1, NULL           , '2026-08-23 13:30:00', 'valide'    ),  -- Onja, tranche 1 (due le 23/08) : à temps
(7 , 2, 2, 'VIR-2026-0463', '2026-09-11 14:43:00', 'valide'    ),  -- Onja, tranche 2 (due le 12/09) : à temps
(7 , 3, 2, 'VIR-2026-0470', '2026-09-30 15:56:00', 'valide'    ),  -- Onja, tranche 3 (due le 02/10) : à temps
(8 , 1, 2, 'VIR-2026-0477', '2026-08-22 14:37:00', 'valide'    ),  -- Fanomezantsoa, tranche 1 (due le 23/08) : à temps
(9 , 1, 2, 'VIR-2026-0484', '2026-08-18 15:44:00', 'valide'    ),  -- Sitraka, tranche 1 (due le 20/08) : à temps
(9 , 2, 1, NULL           , '2026-09-01 16:57:00', 'valide'    ),  -- Sitraka, tranche 2 (due le 04/09) : à temps
(10, 1, 2, 'VIR-2026-0491', '2026-09-09 09:58:00', 'valide'    ),  -- Miora, tranche 1 (due le 09/09) : à temps
(10, 2, 2, 'VIR-2026-0498', '2026-10-10 10:11:00', 'valide'    ),  -- Miora, tranche 2 (due le 09/10) : le jour suivant (−1)
(11, 1, 1, NULL           , '2026-10-02 11:12:00', 'valide'    ),  -- Fitiavana, tranche 1 (due le 01/10) : le jour suivant (−1)
(12, 1, 2, 'VIR-2026-0505', '2026-09-18 13:26:00', 'valide'    ),  -- Rindra, tranche 1 (due le 18/09) : à temps
(12, 2, 1, NULL           , '2026-10-22 14:39:00', 'valide'    ),  -- Rindra, tranche 2 (due le 18/10) : 4 jours après (−2)
(13, 1, 1, NULL           , '2026-09-14 14:33:00', 'valide'    ),  -- Lova, tranche 1 (due le 15/09) : à temps
(13, 2, 2, 'VIR-2026-0512', '2026-10-05 15:46:00', 'valide'    ),  -- Lova, tranche 2 (due le 07/10) : à temps
(14, 1, 2, 'VIR-2026-0519', '2026-08-26 13:20:00', 'valide'    ),  -- Rindra, tranche 1 (due le 25/09) : comptant, à l'inscription
(15, 1, 1, NULL           , '2026-09-27 12:15:00', 'valide'    ),  -- Onja, tranche 1 (due le 30/09) : à temps
(15, 2, 2, 'VIR-2026-0526', '2026-10-23 13:28:00', 'valide'    ),  -- Onja, tranche 2 (due le 22/10) : le jour suivant (−1)
(16, 1, 2, 'VIR-2026-0533', '2026-09-29 14:29:00', 'valide'    ),  -- Tsiory, tranche 1 (due le 30/09) : à temps
(16, 2, 1, NULL           , '2026-10-13 15:42:00', 'valide'    ),  -- Tsiory, tranche 2 (due le 15/10) : à temps
(17, 1, 2, 'VIR-2026-0540', '2026-10-21 15:36:00', 'en_attente'),  -- Sitraka, tranche 1 (due le 21/10) : payé depuis le mobile, à valider
(20, 1, 2, 'VIR-2026-0547', '2026-10-05 11:05:00', 'valide'    ),  -- Tsiory, tranche 1 (due le 04/12) : comptant, à l'inscription
(21, 1, 1, NULL           , '2026-10-08 11:35:00', 'valide'    ),  -- Rindra, tranche 1 (due le 22/11) : comptant, à l'inscription
(25, 1, 2, 'VIR-2026-0554', '2026-10-25 20:10:00', 'en_attente');  -- Miora, tranche 1 (due le 09/11) : payé depuis le mobile, à valider

INSERT INTO paiement (id_echeance, id_mode_paiement, montant, date_paiement, reference_virement, statut, etat)
SELECT e.id_echeance, p.id_mode_paiement, e.montant_prevu, p.date_paiement, p.reference, p.statut, true
FROM seed_paiement p
JOIN (
  SELECT id_echeance, id_inscription, montant_prevu,
         ROW_NUMBER() OVER (PARTITION BY id_inscription ORDER BY date_echeance, id_echeance) AS numero
  FROM echeance
) e ON e.id_inscription = p.id_inscription AND e.numero = p.numero
ORDER BY p.date_paiement;

-- Dernier rappel envoyé par l'Accueil pour les échéances en retard
UPDATE echeance e JOIN seed_inscription s ON s.id_inscription = e.id_inscription
SET e.date_dernier_rappel = '2026-10-20 10:00:00'
WHERE e.date_echeance < '2026-10-20' AND s.id_inscription IN (2, 8)
  AND NOT EXISTS (SELECT 1 FROM paiement p WHERE p.id_echeance = e.id_echeance AND p.statut <> 'refuse');

-- ============================================
-- 6. ATTESTATIONS DÉJÀ DÉLIVRÉES
-- ============================================
-- Formations terminées, soldées et notées : attestation délivrée le jour de fin (envoi automatique).
-- Le PDF n'est pas fourni (fichier_pdf NULL) ; le QR code (uuid) reste vérifiable.
-- Rindra (Python) et Onja (Maintenance), prêts depuis peu, sont envoyés par le serveur au démarrage.
INSERT INTO attestation (id_inscription, uuid_verification, date_delivrance, fichier_pdf) VALUES
(1, '63166e40-7a06-57e6-9998-b68e5543918f', '2026-10-04 10:01:00', NULL),  -- Andry Rakotoarisoa (Développement web)
(3, '567fac55-89cd-5787-b74f-536999a94bc0', '2026-10-06 10:03:00', NULL),  -- Miora Randriamampionona (Développement web)
(4, '94d935d9-fbbf-5171-8728-3d22f56c31d9', '2026-08-12 10:04:00', NULL),  -- Fitiavana Rasolofo (Bureautique)
(5, '2ce0564c-c8a1-530b-9f43-862474043b6b', '2026-08-14 10:05:00', NULL),  -- Rindra Rasoamanarivo (Bureautique)
(6, '161108ac-b78a-5755-b766-d5b33d87ef75', '2026-09-13 10:06:00', NULL),  -- Lova Andriamihaja (Infographie)
(7, '08215222-928a-51e6-8fe4-a538dc7773df', '2026-10-02 10:07:00', NULL),  -- Onja Raharimanana (Réseaux informatiques)
(9, '81213f1b-6a12-58da-ba5c-374888f795fd', '2026-09-04 10:09:00', NULL),  -- Sitraka Rakotondrabe (Bureautique)
(10, 'b4e62629-243e-5a3f-a26b-651530bceef2', '2026-10-10 10:10:00', NULL),  -- Miora Randriamampionona (Infographie)
(13, '9b4e811f-2392-588d-b1b7-cac42967de3e', '2026-10-08 10:13:00', NULL),  -- Lova Andriamihaja (Maintenance informatique)
(14, '8e751971-e174-5673-a9e5-77a27d2337d9', '2026-09-25 10:14:00', NULL);  -- Rindra Rasoamanarivo (Excel avancé)

-- ============================================
-- 7. SUPPORTS DE COURS
-- ============================================
-- fichier NULL = support texte (contenu mis en forme) ; le 4 est programmé (publication le 28/10 à 8 h)
INSERT INTO support (id_support, id_formation, id_utilisateur, titre, contenu, fichier, statut, date_envoi_prevue, annonce_envoyee, date_publication, etat) VALUES
(1, 1, 3, 'Introduction au HTML', NULL, 'supports/demo-introduction-html.pdf', 'publie', NULL, false, '2026-07-07 08:00:00', true),
(2, 1, 3, 'Mise en page avec CSS', NULL, 'supports/demo-mise-en-page-css.pdf', 'publie', NULL, false, '2026-08-03 08:00:00', true),
(3, 1, 3, 'Les bases de JavaScript', NULL, 'supports/demo-bases-javascript.pdf', 'publie', NULL, false, '2026-09-01 08:00:00', true),
(4, 1, 3, 'Projet : site vitrine', NULL, 'supports/demo-projet-site-vitrine.pdf', 'programme', '2026-10-28 08:00:00', false, '2026-10-28 08:00:00', true),
(5, 2, 4, 'Word : mise en forme d''un document', NULL, 'supports/demo-word-mise-en-forme.pdf', 'publie', NULL, false, '2026-07-14 08:00:00', true),
(6, 2, 4, 'Excel : formules de base', NULL, 'supports/demo-excel-formules.pdf', 'publie', NULL, false, '2026-07-28 08:00:00', true),
(7, 3, 5, 'Le modèle OSI', NULL, 'supports/demo-modele-osi.pdf', 'publie', NULL, false, '2026-07-21 08:00:00', true),
(8, 3, 5, 'Adressage IP et sous-réseaux', NULL, 'supports/demo-adressage-ip.pdf', 'publie', NULL, false, '2026-08-25 08:00:00', true),
(9, 4, 6, 'Palette de couleurs (charte graphique)', NULL, 'supports/demo-palette-couleurs.png', 'publie', NULL, false, '2026-07-17 08:00:00', true),
(10, 4, 6, 'Illustrator : outils de base', NULL, 'supports/demo-illustrator-outils.pdf', 'publie', NULL, false, '2026-08-12 08:00:00', true),
(11, 5, 3, 'Variables et types en Python', NULL, 'supports/demo-python-variables.pdf', 'publie', NULL, false, '2026-07-27 08:00:00', true),
(12, 5, 3, 'Conditions et boucles', '<h2>Conditions</h2><p><strong>if</strong>, <strong>elif</strong> et <strong>else</strong> choisissent quel bloc exécuter. L''indentation (4 espaces) délimite le bloc.</p><h2>Boucles</h2><ul><li><strong>for</strong> parcourt une liste ou un <em>range</em> ;</li><li><strong>while</strong> répète tant qu''une condition est vraie.</li></ul><p>Exercice : affichez la table de multiplication d''un nombre saisi au clavier.</p>', NULL, 'publie', NULL, false, '2026-09-21 08:00:00', true),
(13, 2, 4, 'PowerPoint : une présentation efficace', '<h2>Une idée par diapositive</h2><p>Un titre court, trois points au plus, une image qui illustre.</p><h2>Le mode Présentateur</h2><p>Il affiche vos notes et la diapositive suivante sur votre écran seulement.</p><p>Exercice : présentez votre parcours en 5 diapositives.</p>', NULL, 'publie', NULL, false, '2026-08-25 08:00:00', true),
(14, 6, 4, 'Tableaux croisés dynamiques', '<h2>Créer un tableau croisé</h2><p>Insertion → Tableau croisé dynamique, puis glissez les champs dans <strong>Lignes</strong>, <strong>Colonnes</strong> et <strong>Valeurs</strong>.</p><p>Exercice : total des ventes par mois et par vendeur.</p>', NULL, 'publie', NULL, false, '2026-07-22 08:00:00', true),
(15, 6, 4, 'RECHERCHEV et RECHERCHEX', '<h2>RECHERCHEV</h2><p>=RECHERCHEV(valeur ; tableau ; n° de colonne ; FAUX) cherche une valeur dans la première colonne.</p><h2>RECHERCHEX</h2><p>Plus souple : elle cherche dans n''importe quelle colonne et gère l''absence de résultat.</p>', NULL, 'publie', NULL, false, '2026-08-28 08:00:00', true),
(16, 3, 5, 'Configuration d''un routeur', '<h2>Accès à la console</h2><p>Câble console, puis <strong>enable</strong> et <strong>configure terminal</strong>.</p><p>Exercice : donnez une adresse IP à deux interfaces et vérifiez avec <em>ping</em>.</p>', NULL, 'publie', NULL, false, '2026-09-22 08:00:00', true),
(17, 7, 7, 'Démonter et remonter un PC', '<h2>Avant de commencer</h2><p>Débranchez l''alimentation et touchez une partie métallique pour décharger l''électricité statique.</p><h2>Les composants</h2><ul><li>carte mère, processeur et ventirad ;</li><li>mémoire vive (RAM) ;</li><li>disque SSD ou HDD ;</li><li>alimentation.</li></ul>', NULL, 'publie', NULL, false, '2026-08-13 08:00:00', true),
(18, 7, 7, 'Installer Windows et les pilotes', '<h2>Clé d''installation</h2><p>Créez la clé avec l''outil de création de support de Microsoft, puis démarrez dessus (touche F12 ou Échap).</p><h2>Pilotes</h2><p>Commencez par le chipset, puis la carte graphique et le réseau.</p>', NULL, 'publie', NULL, false, '2026-09-10 08:00:00', true);

-- ============================================
-- 8. RÉACTIONS (avis sur les formateurs)
-- ============================================
-- 1 = 👍, 2 = ❤️, 3 = 💡, 4 = 👎 ; « Compétent » : au moins 5 réactions et 60 % de positives
-- Tiana    : 18 réactions,  94 % positives -> Compétent
-- Voahangy : 12 réactions,  83 % positives -> Compétent
-- Rivo     :  6 réactions,  83 % positives -> Compétent
-- Hery     :  7 réactions,  29 % positives -> Non compétent
-- Lalaina  :  4 réactions, 100 % positives -> Pas assez d'avis
-- Chaque réaction vient d'un étudiant inscrit à la formation du support.
INSERT INTO reaction (id_support, id_utilisateur, id_type_reaction, date_reaction) VALUES
-- Tiana : Développement web (1, 2, 3) et Python (11, 12)
(1, 8, 1, '2026-07-08 11:00:00'),
(1, 9, 2, '2026-07-09 12:00:00'),
(1, 10, 3, '2026-07-11 13:00:00'),
(1, 11, 1, '2026-08-21 14:00:00'),
(1, 13, 2, '2026-10-20 15:00:00'),
(2, 8, 3, '2026-08-04 11:00:00'),
(2, 10, 1, '2026-08-05 12:00:00'),
(2, 9, 4, '2026-08-06 13:00:00'),
(2, 11, 2, '2026-08-21 14:00:00'),
(3, 8, 1, '2026-09-02 11:00:00'),
(3, 10, 3, '2026-09-03 12:00:00'),
(3, 11, 1, '2026-09-05 14:00:00'),
(3, 13, 1, '2026-10-21 15:00:00'),
(11, 12, 2, '2026-08-21 11:00:00'),
(11, 17, 1, '2026-09-28 12:00:00'),
(11, 8, 3, '2026-09-30 13:00:00'),
(12, 12, 1, '2026-09-22 11:00:00'),
(12, 17, 3, '2026-09-29 12:00:00'),
-- Voahangy : Bureautique (5, 6, 13) et Excel avancé (14, 15)
(5, 11, 1, '2026-07-15 11:00:00'),
(5, 12, 3, '2026-07-17 12:00:00'),
(5, 16, 4, '2026-08-21 14:00:00'),
(6, 12, 2, '2026-07-29 11:00:00'),
(6, 16, 1, '2026-08-07 12:00:00'),
(6, 11, 1, '2026-08-01 14:00:00'),
(13, 16, 3, '2026-08-26 11:00:00'),
(13, 17, 2, '2026-09-18 13:00:00'),
(14, 12, 1, '2026-08-28 11:00:00'),
(14, 14, 2, '2026-10-15 12:00:00'),
(15, 12, 4, '2026-09-05 12:00:00'),
(15, 14, 1, '2026-10-16 13:00:00'),
-- Hery : Réseaux informatiques (7, 8, 16)
(7, 14, 1, '2026-08-05 12:00:00'),
(7, 15, 4, '2026-08-06 13:00:00'),
(7, 16, 4, '2026-09-25 14:00:00'),
(8, 14, 4, '2026-08-26 11:00:00'),
(8, 15, 4, '2026-08-27 12:00:00'),
(16, 14, 2, '2026-09-24 12:00:00'),
(16, 16, 4, '2026-09-25 13:00:00'),
-- Lalaina : Infographie (9, 10)
(9, 13, 2, '2026-07-18 11:00:00'),
(9, 10, 1, '2026-08-12 12:00:00'),
(10, 13, 3, '2026-08-13 11:00:00'),
(10, 17, 1, '2026-10-14 12:00:00'),
-- Rivo : Maintenance informatique (17, 18)
(17, 13, 1, '2026-08-25 11:00:00'),
(17, 14, 2, '2026-09-10 12:00:00'),
(17, 12, 3, '2026-10-12 13:00:00'),
(18, 13, 3, '2026-09-11 11:00:00'),
(18, 14, 4, '2026-09-13 13:00:00'),
(18, 12, 1, '2026-10-13 14:00:00');

-- ============================================
-- 9. COMMENTAIRES (fils de discussion) ET MENTIONS
-- ============================================
-- id_parent NULL = commentaire principal ; id_etudiant renseigné seulement si l'auteur est un étudiant
INSERT INTO commentaire (id_commentaire, id_support, id_parent, id_etudiant, id_utilisateur, contenu, date_commentaire, etat) VALUES
(1, 1, NULL, 1, 8, 'Est-ce qu''on peut utiliser VS Code pour les exercices ?', '2026-07-08 10:12:00', true),
(2, 1, 1, NULL, 3, '@Andry Rakotoarisoa Oui, VS Code est recommandé. Installez aussi l''extension Live Server pour voir les changements en direct.', '2026-07-08 11:30:00', true),
(3, 1, 1, 3, 10, '@Andry Rakotoarisoa Je l''utilise aussi, ça marche très bien.', '2026-07-08 14:05:00', true),
(4, 2, NULL, 4, 11, 'Je n''ai pas bien compris la différence entre margin et padding.', '2026-08-20 09:40:00', true),
(5, 2, 4, NULL, 3, '@Fitiavana Rasolofo margin = espace extérieur, padding = espace intérieur. Regardez la partie 2 du support.', '2026-08-20 11:02:00', true),
(6, 3, NULL, 3, 10, 'Le support est très clair, merci !', '2026-09-03 18:20:00', true),
(7, 3, NULL, 4, 11, 'Faut-il rendre l''exercice sur le DOM avant vendredi ?', '2026-09-08 08:15:00', true),
(8, 3, 7, NULL, 3, '@Fitiavana Rasolofo Oui, avant vendredi 17 h, par message ou en classe.', '2026-09-08 09:00:00', true),
(9, 6, NULL, 5, 12, 'Pourriez-vous ajouter un exercice sur les pourcentages ?', '2026-07-30 15:10:00', true),
(10, 6, 9, NULL, 4, '@Rindra Rasoamanarivo Bonne idée, je l''ajoute au prochain support.', '2026-07-31 08:20:00', true),
(11, 15, NULL, 7, 14, 'RECHERCHEX ne marche pas sur ma version d''Excel (2016).', '2026-10-16 10:00:00', true),
(12, 15, 11, NULL, 4, '@Onja Raharimanana RECHERCHEX existe à partir d''Excel 2021 : utilisez RECHERCHEV en attendant.', '2026-10-16 11:45:00', true),
(13, 7, NULL, 7, 14, 'Les schémas sont difficiles à lire, l''image est de mauvaise qualité.', '2026-08-05 16:00:00', true),
(14, 7, 13, 8, 15, '@Onja Raharimanana Pareil pour moi, surtout la partie sur la couche transport.', '2026-08-06 09:30:00', true),
(15, 16, NULL, 9, 16, 'On n''a pas de routeur pour s''entraîner, comment faire l''exercice ?', '2026-09-23 10:10:00', true),
(16, 11, NULL, 5, 12, 'Est-ce qu''il y aura un TP noté sur les variables ?', '2026-08-21 09:00:00', true),
(17, 11, 16, NULL, 3, '@Rindra Rasoamanarivo Oui, un petit TP la semaine prochaine, sans surprise : tout est dans le support.', '2026-08-21 10:30:00', true),
(18, 12, NULL, 10, 17, 'Merci pour les exemples de boucles, enfin compris !', '2026-10-05 19:45:00', true),
(19, 17, NULL, 6, 13, 'Peut-on apporter notre propre PC pour le démonter ?', '2026-08-25 08:50:00', true),
(20, 17, 19, NULL, 7, '@Lova Andriamihaja Oui, c''est même conseillé : on regardera ensemble ce qu''il faut changer.', '2026-08-25 09:30:00', true),
(21, 18, NULL, 7, 14, 'La clé USB ne démarre pas sur mon portable.', '2026-09-15 14:00:00', true),
(22, 18, 21, NULL, 7, '@Onja Raharimanana Désactivez le « Secure Boot » dans le BIOS, puis réessayez avec F12.', '2026-09-15 15:20:00', true),
(23, 10, NULL, 6, 13, 'Quelle version d''Illustrator faut-il installer ?', '2026-08-14 10:00:00', true);

INSERT INTO commentaire_mention (id_commentaire, id_etudiant_mentionne) VALUES
(2, 1), (3, 1), (5, 4), (8, 4), (10, 5), (12, 7), (14, 7), (17, 5), (20, 6), (22, 7);

-- ============================================
-- 10. ASSISTANCE
-- ============================================
-- id_statut : 1 = En attente, 2 = Résolu ; id_utilisateur = membre du personnel qui l'a résolue
INSERT INTO assistance (id_etudiant, id_utilisateur, id_statut, objet, contenu, date_envoi, date_resolution, etat) VALUES
(2, NULL, 1, 'Paiement refusé', 'Mon virement pour la 2e tranche a été refusé alors que j''ai bien payé. Que dois-je faire ?', '2026-09-05 10:20:00', NULL, true),
(8, NULL, 1, 'Retard de paiement', 'Je pourrai régler la 2e tranche à la fin du mois, est-ce possible ?', '2026-10-20 08:45:00', NULL, true),
(10, NULL, 1, 'Paiement de la 1re tranche', 'Puis-je payer la 1re tranche de Python en deux fois ?', '2026-10-12 17:30:00', NULL, true),
(10, NULL, 1, 'Attestation', 'Ma formation Bureautique est terminée depuis le 15/10, quand pourrai-je recevoir mon attestation ?', '2026-10-25 09:10:00', NULL, true),
(3, NULL, 1, 'Inscription en ligne', 'J''ai payé la 1re tranche d''Excel avancé depuis l''application : quand mon inscription sera-t-elle validée ?', '2026-10-25 21:00:00', NULL, true),
(1, 2, 2, 'Accès aux supports', 'Je ne voyais pas le support de HTML dans l''application.', '2026-07-07 15:00:00', '2026-07-07 16:10:00', true),
(7, 2, 2, 'Support illisible', 'Le schéma du modèle OSI est flou sur mon téléphone.', '2026-08-06 09:30:00', '2026-08-06 14:00:00', true),
(4, 2, 2, 'Changement d''horaire', 'Puis-je suivre les séances de l''après-midi au lieu du matin ?', '2026-08-24 10:00:00', '2026-08-24 11:30:00', true),
(5, 1, 2, 'Facture', 'Je n''ai pas reçu la facture de ma 1re tranche par e-mail.', '2026-09-19 08:40:00', '2026-09-19 10:05:00', true),
(9, 2, 2, 'Mot de passe oublié', 'Je n''arrive plus à me connecter, je n''ai pas reçu le code de réinitialisation.', '2026-10-02 18:20:00', '2026-10-03 08:30:00', true);

-- ============================================
-- 11. NOTIFICATIONS
-- ============================================
INSERT INTO notification_inapp (id_utilisateur, message, lu, etat, date_creation) VALUES
(2, 'Nouvelle inscription en ligne : Miora Randriamampionona, 1 formation(s). Premier paiement déclaré à vérifier dans la page Inscriptions.', false, true, '2026-10-25 20:10:00'),
(2, 'Sitraka Rakotondrabe a payé 175 000 Ar (Réseaux informatiques) via Virement bancaire. Paiement à valider.', false, true, '2026-10-21 15:40:00'),
(2, 'Toky Ravelojaona a envoyé une demande d''assistance : « Paiement refusé ».', true, true, '2026-09-05 10:20:00'),
(2, 'Fanomezantsoa Rabe a envoyé une demande d''assistance : « Retard de paiement ».', false, true, '2026-10-20 08:45:00'),
(2, 'Tsiory Razanakoto a envoyé une demande d''assistance : « Paiement de la 1re tranche ».', false, true, '2026-10-12 17:30:00'),
(2, 'Tsiory Razanakoto a envoyé une demande d''assistance : « Attestation ».', false, true, '2026-10-25 09:10:00'),
(2, 'Miora Randriamampionona a envoyé une demande d''assistance : « Inscription en ligne ».', false, true, '2026-10-25 21:00:00'),
(4, 'Formation terminée : attribuez la note de présentation (sur 10) de Tsiory Razanakoto (Bureautique) pour que l''accueil puisse envoyer son attestation.', false, true, '2026-10-15 09:00:00'),
(9, 'Votre paiement de 150 000 Ar (Développement web) a été refusé. Contactez l''accueil.', true, true, '2026-09-04 11:00:00'),
(9, 'Rappel : 150 000 Ar à régler pour la formation Développement web avant le 04/10/2026.', false, true, '2026-10-20 10:00:00'),
(15, 'Rappel : 116 667 Ar à régler pour la formation Réseaux informatiques avant le 12/09/2026.', false, true, '2026-10-20 10:00:00'),
(8, 'Tiana Randrianarisoa a répondu à votre commentaire.', true, true, '2026-07-08 11:30:00'),
(8, 'Votre demande d''assistance « Accès aux supports » a été résolue.', true, true, '2026-07-07 16:10:00'),
(12, 'Voahangy Rakotomalala vous a mentionné dans un commentaire.', true, true, '2026-07-31 08:20:00'),
(12, 'Nouveau support disponible : Conditions et boucles (Python pour débutants).', true, true, '2026-09-21 08:00:00'),
(10, 'Votre inscription en ligne a bien été reçue. Elle sera validée par l''accueil après vérification de votre paiement.', false, true, '2026-10-25 20:10:00'),
(8, 'Votre attestation de la formation Développement web est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-10-04 10:01:00'),
(10, 'Votre attestation de la formation Développement web est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-10-06 10:03:00'),
(11, 'Votre attestation de la formation Bureautique est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-08-12 10:04:00'),
(12, 'Votre attestation de la formation Bureautique est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-08-14 10:05:00'),
(13, 'Votre attestation de la formation Infographie est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-09-13 10:06:00'),
(14, 'Votre attestation de la formation Réseaux informatiques est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-10-02 10:07:00'),
(16, 'Votre attestation de la formation Bureautique est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-09-04 10:09:00'),
(10, 'Votre attestation de la formation Infographie est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-10-10 10:10:00'),
(13, 'Votre attestation de la formation Maintenance informatique est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-10-08 10:13:00'),
(12, 'Votre attestation de la formation Excel avancé est disponible. Elle vous a été envoyée par e-mail.', true, true, '2026-09-25 10:14:00');

-- ============================================
-- 12. PRÉSENCES (jours ouvrés où l'étudiant a utilisé l'application)
-- ============================================
-- taux = assiduité sur 10 (10 = tous les jours) ; pendant chaque formation validée, jusqu'à sa fin
-- (ou aujourd'hui si elle est en cours). Même règle pour tout le monde, donc taux de présence ≈ taux × 10 %.
CREATE TEMPORARY TABLE seed_assiduite (id_utilisateur INT, taux INT);
INSERT INTO seed_assiduite VALUES
(8, 9), (9, 4), (10, 9), (11, 9), (12, 10), (13, 10), (14, 9), (15, 3), (16, 7), (17, 8);

INSERT IGNORE INTO presence (id_utilisateur, jour)
SELECT a.id_utilisateur, DATE_ADD(DATE(i.date_inscription), INTERVAL n.n DAY) AS jour
FROM seed_assiduite a
JOIN inscription i ON i.id_utilisateur = a.id_utilisateur AND i.valide = true
JOIN formation f ON f.id_formation = i.id_formation
JOIN (SELECT u.n + 10 * d.n AS n
      FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) u
      CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
            UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d
     ) n ON n.n < f.duree_jours
WHERE DATE_ADD(DATE(i.date_inscription), INTERVAL n.n DAY) <= CURDATE()
  AND WEEKDAY(DATE_ADD(DATE(i.date_inscription), INTERVAL n.n DAY)) < 5
  AND MOD(DAYOFYEAR(DATE_ADD(DATE(i.date_inscription), INTERVAL n.n DAY)) * 7 + a.id_utilisateur * 3, 10) < a.taux;

DROP TEMPORARY TABLE seed_inscription;
DROP TEMPORARY TABLE seed_paiement;
DROP TEMPORARY TABLE seed_assiduite;
