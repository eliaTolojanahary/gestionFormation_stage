# Scénarios de test — recette et soutenance

Un scénario par fonctionnalité, au format **page → action → route / fonctions métier → base →
résultat attendu**. Le fonctionnement est expliqué dans [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md) :
« étape N » renvoie au parcours A → Z (partie 4), « §N » à une partie du document.

- **Recette** : dérouler tous les scénarios et cocher ce qui marche.
- **Soutenance** : suivre le parcours ⭐ ci-dessous (environ 20 min). Les autres scénarios servent
  à répondre aux questions du jury (« montrez-moi… »).

---

## Préparation

1. Base de démonstration remise à zéro (les dates sont relatives au jour du chargement) :
   ```bash
   cd backend-imtech
   mysql -u root -p < reinit.sql
   mysql -u root -p < donneesTest.sql
   node scripts/fichiersDemo.js
   ```
2. Lancer le backend (`npm run dev`), le web (`npm run dev`) et Expo (`npx expo start`).
3. Avoir **deux navigateurs** (Chrome + Edge) et un **téléphone** sur le même Wi-Fi que le PC.
4. Ouvrir l'onglet **Réseau** des outils de développement (pour montrer les requêtes).

| Compte (mot de passe `admin123`) | Rôle | Sert à montrer |
|---|---|---|
| `tljelia374@gmail.com` | Super Admin | Utilisateurs, formations, avis, fond de la vitrine |
| `test123acceuil@gmail.com` | Accueil | Dossiers, inscriptions, paiements, échéances, assistance |
| `tolojanaharyelia845@gmail.com` | Formateur | Supports, supports programmés, classement et notes |
| `prenom.nom@imtech.test` (ex. `toky.ravelojaona@imtech.test`) | Étudiant | Application mobile |

Données de démo (dates fixes, juillet → octobre 2026, à consulter le 26/10/2026) : 10 étudiants,
7 formations, 5 formateurs, 25 inscriptions. **Toky** et **Fano** ont leurs 2ᵉ et 3ᵉ tranches en
retard ; **Tsiory** (aujourd'hui), **Andry** et **Onja** (28/10) sont à rappeler ; **Miora** a fait une
inscription en ligne (à valider) et **Fitiavana** a une inscription Accueil non validée ; **Sitraka** a
payé sa 1ʳᵉ tranche de Réseaux sur le mobile (en attente) ; **Tsiory** attend sa note de
présentation (Bureautique) ; les attestations de **Rindra** (Python) et **Onja** (Maintenance) partent
automatiquement au démarrage du serveur ; le support « Projet : site vitrine » est programmé le 28/10.
12 commentaires de fin de formation sont déjà écrits : 9 notés, 3 à noter (Rindra en Python et en Excel avancé,
Onja en Maintenance). **Toky**, **Fano** et **Tsiory** n'ont pas encore commenté : leur attestation reste bloquée.
Classement : Tiana, Voahangy, Rivo et Hery ont une note sur 20 ; Lalaina n'en a pas (moins de 5 réactions).

---

## Parcours de soutenance ⭐ (≈ 20 min)

| Ordre | Scénario | Ce que ça montre au jury |
|:-:|---|---|
| 1 | **M1 Vitrine et inscription en ligne** | Parcours public, transaction, anti-abus |
| 2 | **A5 Validation d'une inscription en ligne** | Rôle de l'Accueil, documents PDF |
| 3 | **M5 Paiement mobile** puis **A6 Validation** | Règle métier clé : paiement en attente, validé par un humain |
| 4 | **A7 Échéances et rappels** | Couleurs, alerte unique, envoi volontaire |
| 5 | **F2 Support mis en forme** + **M3 Consultation sécurisée** | XSS bloqué, filigrane, captures bloquées |
| 6 | **F4 Classement et note** + **A10 Attestation** | Calcul automatique, QR code vérifiable |
| 7 | **S1 à S4 Sécurité** | Rôles, force brute, sessions révocables |
| 8 | **T1 à T3 Recherche, fiches, pagination** | Ergonomie et passage à l'échelle |

---

## S. Sécurité et accès

### S1 Connexion et pages par rôle (étape 4, §1, §7) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter (Accueil) | `POST /auth/login` → `authService.authentifier` | L utilisateur · É sessions | Tableau de bord, menu de l'Accueil |
| 2 | Taper `/dashboard/utilisateurs` dans l'adresse | `utils/navigation.peutOuvrir` | — | Retour au tableau de bord |
| 3 | Formateur : taper `/dashboard/paiements` | idem | — | Retour au tableau de bord |
| 4 | Appeler une route du personnel avec un token d'étudiant (ou sans token) | `checkRole` / `verifyToken` | L sessions | **403** / **401** |

### S2 Limite des essais de connexion (étape 4) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | 5 mauvais mots de passe sur un compte | `limiteRequetes` (échecs seulement) | — | 401 « Identifiants incorrects » |
| 2 | 6ᵉ essai, même avec l'e-mail en majuscules | idem | — | **429** « Réessayez dans 15 minutes » (web et mobile) |
| 3 | Se connecter avec un **autre** compte | limite par compte | — | Connexion possible |
| 4 | 6 demandes « mot de passe oublié » en une heure | limite 5 / h / IP | — | **429** |

*(Redémarrer le backend remet les compteurs à zéro.)*

### S3 Mot de passe oublié (étape 4)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | « Mot de passe oublié » avec un e-mail existant, puis inexistant | `POST /auth/forgot-password` → `userService.demanderReinitialisation` | É reset_password | **Même message** dans les deux cas ; code reçu par e-mail (30 min) |
| 2 | Saisir le code + nouveau mot de passe | `POST /auth/reset-password` | É utilisateur, reset_password, sessions | Mot de passe changé, **toutes** les sessions fermées |
| 3 | Réutiliser le même code | idem | — | Refusé (code déjà utilisé) |

### S4 Sessions et « Se déconnecter partout » (étape 4, §5 Sessions) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter avec le même compte dans Chrome, Edge et sur le téléphone | `POST /auth/login` | É sessions | 3 sessions dans Paramètres > Sécurité (aucun token affiché) |
| 2 | Chrome : Paramètres > Sécurité > **Se déconnecter partout** | `PUT /auth/logout-all` → `deactivateAllExcept` | É sessions | Edge et le téléphone renvoyés à la connexion en **moins d'une minute** (mobile : alerte « Session fermée ») |
| 3 | Changer son mot de passe (moins de 8 caractères, puis confirmation différente, puis correct) | `PUT /auth/change-password` | É utilisateur, sessions | 2 erreurs claires, puis succès ; autres appareils déconnectés |

---

## A. Web — Super Admin et Accueil

### A1 Tableau de bord (§5 Tableau de bord)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir le tableau de bord | `GET /dashboard/kpi`, `/evolution`, `/inscriptionParMois`, `/topInscription` | L paiement, echeance, inscription | Indicateurs (paiements **validés** seulement), courbes |
| 2 | Export CSV | `GET /dashboard/export-csv` | L inscription… | Fichier CSV téléchargé |
| 3 | Bloc « Avis sur les formateurs » | `GET /formateurs/avis` | L reaction, support | Tiana / Voahangy / Rivo « Compétent », Hery « Non compétent », Lalaina « Pas assez d'avis » |

### A2 Comptes utilisateurs (Super Admin) (§5 Comptes, §7)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Créer un compte Formateur | `POST /utilisateurs` → `userService.creerUtilisateur` (mot de passe haché) | É utilisateur | Compte dans la liste, connexion possible |
| 2 | Modifier ce compte (adresse `/dashboard/utilisateurs/:id/modifier`) | `PUT /utilisateurs/:id` | É utilisateur | Modifié, photo conservée si non changée |
| 3 | Désactiver le compte | `DELETE /utilisateurs/:id` | É utilisateur, sessions | Sessions de ce compte fermées |

### A3 Formations (Super Admin)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Créer une formation (durée, tarif, formateur, engagement) | `POST /formations` | É formation | Visible dans la liste et sur la vitrine mobile |
| 2 | Changer l'image de couverture | `PUT /formations/:id/image` | É formation | Nouvelle image sur la vitrine |
| 3 | Ouvrir la fiche puis Modifier (`/dashboard/formations/:id/modifier`) | `GET` / `PUT /formations/:id` | É formation | F5 garde le formulaire ouvert |
| 4 | Regarder le tableau puis une fiche | `CouvertureFormation.jsx` | L formation | Vignette de couverture dans le tableau, grande image sur la fiche ; initiales (ex. « DW ») sans image |

### A4 Dossier étudiant et inscription au guichet (§5 Dossiers étudiants, étape 2)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Étudiants → Nouveau : identité, e-mail, photo, pièces | `POST /etudiants` → `insertUtilisateurEtEtudiant` (transaction) | É utilisateur, etudiant | Dossier créé (rôle Étudiant imposé par le serveur) |
| 2 | Inscriptions → Nouvelle : cet étudiant, une formation, 3 tranches | `POST /inscriptions` → `creerInscription` (transaction + échéancier) | É inscription, echeance | 3 échéances dont la somme = tarif exact (la dernière absorbe l'arrondi) |
| 3 | Réinscrire le même étudiant à la même formation | idem | — | **409** inscription déjà active |

### A5 Validation d'une inscription en ligne et fiche PDF (étape 3, §5 Documents) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Inscriptions → filtre « En ligne » / « Non validée » | `GET /inscriptions?page=1&origine=en_ligne&valide=non` | L inscription… | Miora (paiement déclaré visible) |
| 2 | **Valider** | `POST /inscriptions/:id/valid` → `validerInscription` | É inscription, paiement | Le paiement déclaré devient validé ; l'étudiant est notifié |
| 3 | Valider une seconde fois | idem | — | **409** déjà validée |
| 4 | Générer la fiche d'inscription | `POST /fiche/:id_inscription/generer` | L inscription… | PDF ouvert dans un nouvel onglet |

### A6 Paiements : guichet, validation, facture (étape 5) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paiements : bandeau « à valider » | `GET /paiements?page=1` (+ `compteurs.en_attente`) | L paiement… | Nombre de paiements en attente sur **toute** la base |
| 2 | Valider le paiement de Sitraka | `PUT /paiements/:id/valider` → `traiterPaiementEnAttente` → `envoyerFactureAuto` | É paiement, facture, notification_inapp, notification_email | Statut validé, reste à payer mis à jour ; bandeau « facture envoyée à Sitraka … » ; Sitraka reçoit **une** notification et l'e-mail avec la facture PDF |
| 3 | Refuser un autre paiement en attente | `PUT /paiements/:id/refuser` | É paiement, notification_inapp | Statut refusé ; l'étudiant pourra repayer |
| 4 | Bouton **Facture** d'un paiement validé, puis d'un refusé | `POST /factures/:id_paiement/generer` | É facture | PDF ouvert (pas de second e-mail) ; **409** pour le paiement non validé |
| 5 | Enregistrer un paiement au guichet supérieur au reste | `POST /paiements` | — | **400** montant supérieur au reste à payer |
| 6 | Échéances → **Payer** au guichet (montant correct) | `POST /paiements` → `envoyerFactureAuto` | É paiement, facture | Bandeau « Paiement enregistré : la facture est envoyée à … » ; e-mail reçu |

### A7 Échéances et rappels (étape 6) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Échéances → filtre ROUGE | `GET /echeances?page=1&statut=ROUGE` | L echeance… | Toky et Fano (2 chacun) en retard : 4, comme l'indicateur du tableau de bord |
| 2 | **Rappeler** Toky | `POST /echeances/:id/rappeler` → `rappelerEcheance` | É echeance, notification_inapp | Notification + e-mail, date du dernier rappel affichée |
| 3 | Rappeler une échéance déjà réglée ou « payée, à valider » | idem | — | **409** (l'étudiant attend la validation de l'Accueil) |
| 4 | Notifications de l'Accueil | traitement automatique (`alerteService`) | É alerte_envoyee | Une **seule** alerte « doit être rappelé » par échéance à J-2 |

### A8 Assistance (§5 Assistance)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Assistance : demandes en attente | `GET /assistances` | L assistance | 3 demandes en attente |
| 2 | **Résoudre** une demande | `PUT /assistances/:id/resoudre` | É assistance, notification_inapp | Statut « Résolu », étudiant notifié sur le mobile |
| 3 | Résoudre à nouveau | idem | — | **409** |

### A9 Notifications envoyées par le personnel (§5 Notifications)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Envoyer une notification in-app à un étudiant | `POST /notifications/in-app` | É notification_inapp | Reçue sur le mobile |
| 2 | Envoyer un e-mail avec pièce jointe | `POST /notifications/email/piece-jointe` | É notification_email | E-mail reçu avec le fichier |

### A10 Documents et attestation vérifiée par QR code (étape 9, §5 Documents) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Générer l'attestation de Tsiory (Bureautique) **avant** la note de présentation | `POST /attestations/:id/generer` | — | Refusé : le formateur doit noter la présentation |
| 2 | Après F4 : générer puis envoyer | `/generer`, `/envoyer` | É attestation | PDF avec note /20 et QR code, envoyé par e-mail |
| 3 | Scanner le QR code (ou ouvrir `/verification/:uuid`) | `GET /verification/:uuid` [public] | L attestation | Page « attestation authentique » |
| 4 | Documents : déposer puis supprimer un document administratif | `POST /documents`, `DELETE /documents/:id` | É document_administratif | Ajouté / retiré de la liste |

---

## F. Web — Formateur

### F1 Espace formateur (étape 8)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter en formateur | — | — | Menu : Espace formateur, Supports, Supports programmés (Notifications : cloche du header) |
| 2 | Cliquer sur une formation | `GET /formations/:id/etudiants` | L inscription, etudiant | Fenêtre des étudiants (seulement ses formations) |
| 3 | Sous un de ses supports, taper `@` puis 2 lettres → choisir un étudiant → Publier | `GET /formations/:id/etudiants` puis `POST /commentaires` (`mentions`) → `verifierMentions` | É commentaire, commentaire_mention, notification_inapp | Liste des inscrits (flèches + Entrée) ; l'étudiant reçoit « … vous a mentionné » sur le mobile |
| 4 | (Postman) mentionner un étudiant d'une autre formation | idem | — | **400** seuls les inscrits de la formation |
| 5 | Cloche du header avec plus de 9 non lues | `GET /notifications` | L notification_inapp | Badge **« 9+ »** ; lire une notification fait baisser le compteur |

### F2 Publier un support mis en forme (étape 7) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Supports : titre, texte en gras / liste / lien, PDF joint → Envoyer | `POST /supports` → `creerSupports` (HTML nettoyé) | É support, notification_inapp | Visible sur le mobile, étudiants notifiés |
| 2 | Coller `<script>alert(1)</script>` et un lien `javascript:` dans le texte | `utils/contenuRiche` (liste blanche) | — | Code supprimé à l'enregistrement (XSS impossible) |
| 3 | Publier un support **audio** ou **vidéo** | idem | É support | Lecteur intégré sans bouton Télécharger |
| 4 | Recherche, filtre, tri et « Voir plus » dans la liste | côté navigateur | — | Liste filtrée |

### F3 Supports programmés (étape 7, §6)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Programmer un support dans 2 minutes | `POST /supports` (date d'envoi) | É support (programmé) | Dans « Supports programmés », invisible des étudiants |
| 2 | Attendre l'heure | `supportProgrammeService` (vérification périodique) | É support, notification_inapp | Publié automatiquement, étudiants notifiés |
| 3 | « Projet : site vitrine » : **Envoyer maintenant** | `POST /supports/:id/envoyer` | É support | Publié tout de suite |
| 4 | Programmer dans le passé | idem | — | **400** la date doit être dans le futur |

### F4 Classement et note d'attestation (étape 8) ⭐
Barème de la note système /10 : départ à **10**, on retire des points (jamais sous 0).
- Présence (jours présents / jours de cours déjà passés) : ≥ 90 % → 0 · 75–90 % → −1 · 50–75 % → −2 · < 50 % → −4
- Paiement, par échéance : payée le jour de l'échéance → 0 · réglée le jour suivant → −1 ·
  pas réglée le jour suivant (même si payée plus tard) → −2 · −4 au plus. C'est la date du paiement
  qui compte, pas sa validation ; un paiement en attente compte, un refusé est ignoré.

| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Espace formateur → Classement d'une formation | `GET /formations/:id/classement` → `classementService.calculerClassement` | L presence, paiement · É inscription (`note_suggeree`) | Rang ; colonne Présence « 91 % · 0 » ; colonne Paiement « ✓ À temps · 0 » ou « ✗ 1 non réglée · −2 » ; note système /10 |
| 2 | Bureautique : **Rindra** | idem | — | 100 % de présence (0), tout payé à temps (0) → **10/10**, avec 8 en présentation : 18/20 |
| 3 | Développement web : **Toky** | idem | — | 40 % de présence (−4), 2 échéances non réglées (−4) → **2/10** |
| 4 | Infographie : **Miora** | idem | — | 91 % de présence (0), 2ᵉ tranche réglée le jour suivant (−1) → **9/10**, avec 7 : 16/20 |
| 5 | Réseaux : **Sitraka**, 1ʳᵉ tranche payée sur le mobile le jour de l'échéance, pas encore validée | `POST /paiements` (statut en attente) | L paiement | **Aucun** point de paiement retiré : c'est la date du paiement qui compte, pas la validation |
| 6 | Saisir **12** en présentation | `PUT /inscriptions/:id/note` | — | Refus : 10 au maximum |
| 7 | Saisir **8** → Entrée | idem | É inscription | Note finale /20 colorée (ex. Tsiory, Bureautique : 9 + 8 = 17/20) |

---

## M. Mobile — Étudiant et visiteur

### M1 Vitrine et inscription en ligne (étapes 1 et 2) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir l'app sans compte → Découvrir | `GET /public/vitrine` | L formation, reaction, parametre_application | Fond plein écran, formations en couverture, formateurs « compétents » |
| 2 | Ajouter 2 formations à la sélection → S'inscrire | `POST /public/inscriptions` → `inscriptionEnLigne` (une transaction) | É utilisateur, etudiant, 2 inscriptions + échéances, paiement en attente | Compte créé, « en attente de validation » |
| 3 | Réessayer avec un e-mail déjà utilisé | idem | — | **409** |
| 4 | 6 envois en une heure | limite 5 / h / IP | — | **429** |
| 5 | « Nous contacter » : Site web, Facebook, E-mail | `config/vitrine.js` (`CONTACTS`) | — | Ouvrent `imtechinfo.com`, la page Facebook d'IMTECH et un e-mail à `im.techinfo.mdg@gmail.com` |

### M2 Accueil et formations
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter (étudiant) → Accueil | `GET /etudiants/:id/formations`, `/dashboard-paiement` | L inscription, paiement | Dernière formation, prochaine échéance, derniers supports et commentaires |
| 2 | Formations → détail | `GET /formations/:id` | L formation | Détail ; formation non validée : « En attente de validation » |

### M3 Consultation sécurisée d'un support (étape 7) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Documents → ouvrir un PDF | `GET /supports/<fichier>?token=` → `fichierMiddleware` | L sessions, inscription | Lecteur intégré, **filigrane** nom + e-mail + date |
| 2 | Capture d'écran (Android) | `FLAG_SECURE` | — | Écran noir sur la capture |
| 3 | Ouvrir l'URL du fichier dans un navigateur sans `?token=` | idem | — | **401** |
| 4 | Fichier d'une formation où l'étudiant n'est pas inscrit | idem | — | Refusé |

### M4 Commentaires et réactions (étape 7, §5 Commentaires et avis)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Commenter un support (commentaire principal) | `POST /commentaires` | É commentaire, notification_inapp | Le **formateur** de la formation est notifié ; pas de liste `@` côté étudiant |
| 2 | Répondre à un commentaire | idem | É commentaire, notification_inapp | Réponse sous le commentaire (« Voir les réponses ») ; son auteur est notifié |
| 2b | (Postman, token étudiant) `POST /commentaires` avec `"mentions": [2]` | `verifierMentions` | — | **403** un étudiant ne mentionne pas |
| 3 | 👍 puis 👎 | `POST /supports/:id/reactions` | É reaction | Une seule réaction par support, modifiable |

### M5 Paiement d'une échéance (mobile) (étape 5) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Accueil → **Payer** la prochaine échéance (mode, référence) | `POST /paiements` → `enregistrerPaiement` | É paiement (en attente), notification_inapp | « En attente de validation » ; montant **imposé** par le serveur ; Accueil notifié |
| 2 | Repayer la même échéance | idem | — | **409** un paiement est déjà en attente |
| 3 | Après validation (A6) | — | — | Notification « paiement validé », reste à payer mis à jour |

### M6 Assistance, notifications, présence
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Menu ⋮ → Assistance → envoyer une demande | `POST /assistances` | É assistance, notification_inapp | Visible côté web (A8) |
| 2 | Notifications : marquer lue, supprimer | `PUT /notifications/:id/lu`, `DELETE /notifications/:id` | É notification_inapp | Une notification supprimée ne revient pas |
| 2b | Regarder l'onglet Notifications (cloche) | `GET /notifications` | L notification_inapp | Nombre de non lues, **« 9+ »** au-delà de 9 ; baisse dès qu'on lit, disparaît quand tout est lu |
| 3 | Utiliser l'app un jour de semaine | `authMiddleware` → `marquerPresence` | É presence | Une présence de plus dans le classement (F4) |

---

## T. Fonctions transverses

### T1 Recherche globale (§5 Recherche) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Web : **Ctrl+K** → nom d'étudiant, formation, « paie » → Entrée | `GET /recherche?q=` | L etudiant, formation, inscription | La bonne fiche s'ouvre ; résultats limités au rôle (Accueil : pas de comptes) |
| 2 | Formateur : chercher un étudiant, un support | idem | L support | Espace formateur avec la fenêtre des étudiants ; page Supports filtrée |
| 3 | Mobile : loupe 🔍 de l'Accueil ou d'un en-tête → titre d'un support, « payer », « theme » | `GET /recherche?q=` [ET] | L formation, inscription, support | Support / formation / écran ouvert ; jamais d'étudiants ni de comptes |

### T2 Une adresse par fiche (§5 Listes) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir une fiche étudiant | `SectionsRoutes.jsx` | — | Adresse `/dashboard/etudiants/12` |
| 2 | **F5**, puis « Précédent » | — | — | La fiche reste ouverte ; retour à la liste |
| 3 | Copier le lien dans l'autre navigateur (non connecté) | `App.jsx` (`state.depuis`) | — | Connexion, puis arrivée directe sur la fiche |
| 4 | Taper `/dashboard/etudiants/abc` | — | — | Retour à la liste |

### T3 Pagination côté serveur (§5 Listes) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paiements / Étudiants / Inscriptions / Échéances | `GET /…?page=1&limite=20` | `LIMIT / OFFSET` + `COUNT(*)` | Pied « 1–20 sur N », boutons de pages ; onglet Réseau : une seule page transférée |
| 2 | Rechercher ou filtrer depuis la page 3 | idem + filtres | — | Retour page 1, total mis à jour |
| 3 | Supprimer la dernière ligne de la dernière page | `useListePaginee` | — | Retour à la page précédente |

### T4 Apparence (§5 Apparence)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paramètres → mode sombre + autre couleur, taille, densité | `usePreferences` (navigateur) | — | Tout reste lisible ; « Modifications enregistrées » |
| 2 | Mobile : Paramètres → thème sombre | `SettingsContext` | — | Lecteur et détail d'un support lisibles |
| 3 | Super Admin → Paramètres → **Fond de la vitrine** → remplacer, puis « Par défaut » | `PUT` / `DELETE /vitrine/fond` | É parametre_application | Visible sur Découvrir (M1) |
| 4 | Mobile en mode sombre : Découvrir, Accueil, Paiements, Connexion | `palette` (`SettingsContext`) | — | Toutes les icônes visibles (plus de bleu marine sur fond sombre) |
| 5 | Mobile en mode sombre, couleur « Bleu IMTECH » : bouton Payer, bandeau « EN COURS » | `buildPalette` → `accentSombre` | — | Couleur principale bleu ciel, texte foncé dessus, lisible |

### T5 Ergonomie : confirmations, messages, petit écran (§7 Retours à l'utilisateur, §9)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Étudiants → Désactiver une ligne, puis **Annuler** ; recommencer et **Désactiver** | `useRetour().confirmer` | É etudiant (`etat`) | Fenêtre de l'appli (pas celle du navigateur) avec le nom de l'étudiant, bouton rouge ; Annuler ne change rien ; puis bandeau vert « Étudiant désactivé » |
| 2 | Ajouter un étudiant, modifier une formation | `notifier` (`SectionsRoutes.jsx`) | — | Bandeau vert « Étudiant ajouté » / « Modifications enregistrées » pendant 3 s |
| 3 | Paiements → Valider / Refuser ; Échéances → Rappeler ; Inscriptions → Attestation | `confirmer` | — | Le message cite l'étudiant et le montant ou la formation |
| 4 | **Arrêter le backend**, puis changer de page (web) et tirer pour actualiser (mobile) | `apiRequest` | — | « Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez. » (plus de texte en anglais) |
| 5 | Réduire la fenêtre du navigateur sous 900 px (ou F12 → mode téléphone) | `usePreferences` | — | Menu réduit aux icônes, nom au survol ; contenu lisible ; revient à la normale en agrandissant |
| 6 | Mobile → Connexion | `login.tsx` | — | « Pas encore inscrit ? Découvrir nos formations » centré, séparé du bouton « Se connecter » |
| 7 | Tableau de bord, Paiements, Échéances, facture PDF | `formatMontant` | — | Montants « 3 160 000 Ar » (plus de « MGA » ni de décimales) |

### T6 Désactiver / réactiver, éléments dépendants (§5 Éléments désactivés, §7) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Étudiants → **Désactiver** un étudiant qui a une inscription | `DELETE /etudiants/:id` | É etudiant (`etat`) | Il disparaît de la liste (filtre « Actifs » par défaut) |
| 2 | Inscriptions : la ligne de cet étudiant | `GET /inscriptions?page=1` (`etudiant_actif`) | L inscription, etudiant | Badge orange « Étudiant désactivé » ; Détail : bandeau d'avertissement |
| 3 | Sur cette ligne : **Valider** ou **Fiche** ; Échéances : **Payer** ou **Rappeler** | `dependanceService.verifier*` | — | **409** « L'étudiant … est désactivé. Réactivez-le d'abord (page Étudiants, filtre « Désactivés ») » |
| 4 | Désactiver cette inscription, puis la **Réactiver** (filtre « Désactivés ») | `PUT /inscriptions/:id/reactiver` → `etatService.reactiverInscription` | — | **409** : l'étudiant doit être réactivé d'abord |
| 5 | Désactiver un étudiant puis cliquer **Annuler** dans le bandeau vert (7 s) | `notifier(…, { annuler })` → `PUT /etudiants/:id/reactiver` | É etudiant | L'étudiant revient aussitôt dans la liste |
| 5 bis | Étudiants → filtre « Désactivés » → **Réactiver** ; puis réactiver l'inscription | `PUT /etudiants/:id/reactiver` | É etudiant, inscription | Bandeau vert « … réactivé(e) », la ligne revient dans « Actifs », les actions marchent |
| 6 | Paiements → **Désactiver** un paiement en attente ; un paiement facturé n'a pas ce bouton | `DELETE /paiements/:id` (409 si facturé) | É paiement | Le paiement passe dans le filtre « Désactivés », réactivable ; un paiement facturé reste encaissé |
| 6 bis | Paiements → ouvrir le détail d'un paiement traité | `GET /paiements/:id` | É paiement | « Traité par » affiche l'agent ; « Non renseigné » pour un ancien paiement |
| 6 ter | Paiements → **Facture** deux fois sur le même paiement | `POST /factures/:id_paiement/generer` | É paiement | Le même numéro de facture revient, aucun doublon en base |
| 6 quater | Mobile, à partir de J-1 : Formations → bandeau → **Commenter mon formateur** | `POST /inscriptions/:id/commentaire-formateur` | É formateur_note | L'Accueil est notifié ; sans ce commentaire, l'attestation est bloquée |
| 6 quinquies | Tableau de bord → **Commentaires des étudiants** → noter sur 10 | `PUT /formateurs/commentaires/:id/note` | É classement | La note sur 20 du formateur et le classement sont mis à jour |
| 7 | Formations → filtre « Désactivés » → **Réactiver** | `PUT /formations/:id/reactiver` (Super Admin) | É formation | La formation revient dans la liste et sur la vitrine |
| 8 | Documents → **Désactiver** un document administratif et un support, puis filtre « Désactivés » → **Réactiver** | `DELETE` / `PUT /documents/:id/reactiver`, `/supports/:id/reactiver` | É document_administratif, support | Badge « Désactivé » dans le filtre ; le support réapparaît chez les étudiants une fois réactivé |

---

## Vérification du code

```bash
cd web && npx eslint src && npx vite build
cd mobile && npx tsc --noEmit && npx expo lint
cd backend-imtech && npm test      # 135 tests, sans base de données
```

Règles sur les tests : §7 du flux.

## Questions probables du jury (réponses courtes)

- *Pourquoi un paiement étudiant est « en attente » ?* L'argent est vérifié par l'Accueil avant
  d'être compté ; l'étudiant n'est pas pénalisé pendant ce temps (la date d'envoi compte).
- *Comment est calculée la note système ?* Chaque étudiant part de 10 et perd des points :
  présence (−1, −2 ou −4 sous 90 %, 75 % et 50 % des jours de cours) et paiement (−1 si l'échéance
  est réglée le jour suivant, −2 si elle ne l'est pas, −4 au plus). Ex. 80 % de présence et une
  échéance réglée le jour suivant : 10 − 1 − 1 = 8/10.
- *Comment un token volé est-il bloqué ?* Chaque requête vérifie la table `sessions` : une
  déconnexion révoque vraiment le token.
- *Et la force brute sur la connexion ?* 5 échecs / 15 min par compte, 20 par adresse IP, puis 429.
- *Un étudiant peut-il voir les données d'un autre ?* Non : rôle **et** propriétaire vérifiés côté
  serveur (contrôles du propriétaire, §7 du flux) ; les menus ne font que masquer.
- *Comment empêchez-vous la fuite des supports ?* Fichiers servis seulement aux ayants droit,
  filigrane au nom de la personne, captures bloquées sur Android ; sur le web, le filigrane permet
  d'identifier l'origine d'une fuite.
- *Et si la base grossit ?* Les grosses listes sont paginées côté serveur (20 lignes, filtres en SQL).
- *Comment l'application est-elle testée ?* Le serveur a des tests automatiques (`npm test` dans
  `backend-imtech`, `node --test`) sur les règles importantes ; les adresses sont aussi essayées avec
  Postman, le site et le mobile avec ces scénarios, et le code est relu par lint et build.
- *Limites ?* Un seul serveur (compteurs en mémoire, fichiers sur disque), paiement mobile
  déclaratif (MVola prévu : `paiement Mvola.md`), pas encore en ligne en HTTPS : voir §10 du flux.
