# Scénarios de test — recette et soutenance

Un scénario par fonctionnalité : **ce qu'on fait**, **ce qu'on doit voir**, et **la règle que ça prouve**.
Le fonctionnement est expliqué dans [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md) (« étape N » = parcours
A → Z du §4, « §N » = partie du flux).

- **Recette** : dérouler les scénarios et cocher ce qui marche.
- **Soutenance** : suivre le **parcours ⭐** (environ 20 min). Les autres scénarios servent à répondre au
  jury (« montrez-moi… »).

**Lire un scénario.** Chaque ligne : *Faire* → *Attendu*. Sous le titre : **Prouve** = la règle démontrée,
**Derrière** = la route et la fonction appelées (pour répondre si le jury demande « que fait le serveur ? »).
Codes d'erreur : 400 mal rempli · 401 pas connecté · 403 pas le droit · 409 déjà fait / impossible · 429 trop d'essais.

---

## Préparation

1. Remettre la base de démonstration :
   ```bash
   cd backend-imtech
   mysql -u root -p < reinit.sql
   mysql -u root -p < donneesTest.sql
   node scripts/fichiersDemo.js
   ```
2. Lancer le backend (`npm run dev`), le web (`npm run dev`) et Expo (`npx expo start`).
3. Avoir **deux navigateurs** (Chrome + Edge) et un **téléphone** sur le même Wi-Fi que le PC.
4. Ouvrir l'onglet **Réseau** (F12) pour montrer les requêtes.

| Compte (mot de passe `admin123`) | Rôle | Sert à montrer |
|---|---|---|
| `tljelia374@gmail.com` | Super Admin | Comptes, formations, fond de la vitrine |
| `test123acceuil@gmail.com` | Accueil | Dossiers, inscriptions, paiements, échéances, assistance |
| `tolojanaharyelia845@gmail.com` | Formateur | Cours, cours programmés, classement et notes |
| `prenom.nom@imtech.test` (ex. `toky.ravelojaona@imtech.test`) | Étudiant | Application mobile |

**Qui est qui dans les données de démo** (dates fixes, juillet → octobre 2026, prévues pour le **26/10/2026** :
un autre jour, certains statuts « retard » ou « J-2 » changent) :

| Personne | Situation | Sert dans |
|---|---|---|
| **Toky**, **Fano** | 2ᵉ et 3ᵉ tranches en retard | A7 |
| **Tsiory** (aujourd'hui), **Andry**, **Onja** (28/10) | Tranches à rappeler (J-2) | A7 |
| **Miora** | Inscription en ligne à valider | A5 |
| **Fitiavana** | Inscription Accueil pas encore validée | A5 |
| **Sitraka** | 1ʳᵉ tranche de Réseaux payée sur le mobile, en attente ; n'ouvre plus aucun cours depuis le 14/10 → « à contacter » | A6, A11 |
| **Andry** (Python) | Irrégulier depuis le 12/10 → « à surveiller » | A11 |
| **Tsiory** (Bureautique) | Attend sa note de présentation ; n'a pas commenté son formateur → attestation bloquée | F4, A10 |
| **Rindra** (Python), **Onja** (Maintenance) | Attestations envoyées automatiquement au démarrage du serveur | A10 |
| Cours « Projet : site vitrine » | Programmé le 28/10 | F3 |

Formateurs : **Tiana** et **Hery** ont une note sur 20 ; **Voahangy** affiche « 4/5 commentés » (il manque Tsiory) ;
**Rivo** « 1 à noter » (le commentaire d'Onja) ; **Lalaina** pas de note (moins de 5 réactions).

---

## Parcours de soutenance ⭐ (≈ 20 min)

| Ordre | Scénario | Ce que ça montre au jury |
|:-:|---|---|
| 1 | **M1** Vitrine et inscription en ligne | Parcours public, transaction « tout ou rien », anti-abus |
| 2 | **A5** Validation d'une inscription en ligne | Rôle de l'Accueil, fiche PDF |
| 3 | **M5** Paiement mobile puis **A6** Validation | Règle clé : paiement en attente, montant imposé, validé par un humain, facture automatique |
| 4 | **A7** Échéances et rappels | Couleurs, alerte jamais envoyée deux fois |
| 5 | **F2** Cours mis en forme + **M3** Consultation sécurisée | Script bloqué, filigrane, capture bloquée |
| 6 | **F4** Classement et note + **A10** Attestation | Calcul automatique, QR code vérifiable |
| 7 | **A11** Étudiants à risque de décrochage | Anticiper : règle simple, alerte unique, relance encadrée |
| 8 | **S1 à S4** Sécurité | Rôles, force brute, sessions révocables |
| 9 | **T1 à T3** Recherche, fiches, pagination | Ergonomie et montée en charge |

---

## S. Sécurité et accès

### S1 Connexion et pages par rôle ⭐
**Prouve** : la vraie protection est dans l'API, le menu ne fait que cacher (§7 Droits).
**Derrière** : `POST /auth/login` → `authentifier` ; à chaque requête `verifyToken`, puis `checkRole`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Se connecter en Accueil | Tableau de bord, menu de l'Accueil |
| 2 | Taper `/dashboard/utilisateurs` dans l'adresse | Renvoyé au tableau de bord |
| 3 | En Formateur, taper `/dashboard/paiements` | Renvoyé au tableau de bord |
| 4 | (Postman) Appeler une route du personnel avec un token d'étudiant, puis sans token | **403**, puis **401** |

### S2 Limite des essais de connexion ⭐
**Prouve** : protection contre la force brute (étape 4).
**Derrière** : `limiteRequetes` : 5 échecs / 15 min par compte, 20 par appareil ; une réussite remet à zéro.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | 5 mauvais mots de passe sur un compte | 401 « Identifiants incorrects » |
| 2 | 6ᵉ essai, même avec l'e-mail en majuscules | **429** « Réessayez dans 15 minutes » (web et mobile) |
| 3 | Se connecter avec un **autre** compte | Connexion possible |
| 4 | 6 demandes « mot de passe oublié » en une heure | **429** |

*Redémarrer le backend remet les compteurs à zéro.*

### S3 Mot de passe oublié
**Prouve** : on ne révèle pas quels e-mails existent ; un code ne sert qu'une fois.
**Derrière** : `POST /auth/forgot-password` → `demanderReinitialisation` ; `POST /auth/reset-password` → `reinitialiserMotDePasse`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | « Mot de passe oublié » avec un e-mail existant, puis inexistant | **Même message** ; code reçu par e-mail (valable 30 min) |
| 2 | Saisir le code + un nouveau mot de passe | Mot de passe changé, **toutes** les sessions fermées |
| 3 | Réutiliser le même code | Refusé (« déjà utilisé ») |

### S4 Sessions et « Se déconnecter partout » ⭐
**Prouve** : un token volé peut être coupé à distance (la session est vérifiée à chaque requête).
**Derrière** : `PUT /auth/logout-all` ; `PUT /auth/change-password` → `changerMotDePasse`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Se connecter avec le même compte dans Chrome, Edge et sur le téléphone | 3 sessions dans Paramètres → Sécurité |
| 2 | Chrome : **Se déconnecter partout** | Edge et le téléphone renvoyés à la connexion en **moins d'une minute** (mobile : « Session fermée ») |
| 3 | Changer son mot de passe : trop court, puis confirmation différente, puis correct | 2 erreurs claires, puis succès ; les autres appareils sont déconnectés |

---

## A. Web — Super Admin et Accueil

### A1 Tableau de bord
**Prouve** : les chiffres ne comptent que l'argent **validé** (§5 Tableau de bord).
**Derrière** : `GET /dashboard/kpi`, `/evolution`… → `dashboardService` (gardé 1 min en mémoire).

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Ouvrir le tableau de bord | 3 parties : « À traiter aujourd'hui », « Activité du centre » (filtre de dates, indicateurs, paiements à surveiller, graphiques), « Formateurs » |
| 2 | **Exporter CSV** | Fichier téléchargé, lisible dans Excel |
| 3 | Carte « Étudiants à risque » | Sitraka « À contacter », Andry « À surveiller » (détail : A11) |
| 4 | Classement des formateurs, en bas | Tiana et Hery sur 20, Voahangy « 4/5 commentés », Rivo « 1 à noter », Lalaina sans note |

### A2 Comptes utilisateurs (Super Admin)
**Prouve** : mot de passe jamais en clair ; désactiver un compte coupe ses connexions.
**Derrière** : `POST /utilisateurs` → `creerUtilisateur` ; `DELETE /utilisateurs/:id`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Créer un compte Formateur | Dans la liste, connexion possible |
| 2 | Le modifier | Modifié, photo conservée si on n'en choisit pas d'autre |
| 3 | Le désactiver | Ses sessions sont fermées, il ne peut plus se connecter |

### A3 Formations (Super Admin)
**Prouve** : une formation créée apparaît partout (web et vitrine mobile).
**Derrière** : `POST /formations`, `PUT /formations/:id/image`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Créer une formation (durée, tarif, formateur, engagement) | Dans la liste et sur la vitrine mobile |
| 2 | Changer l'image de couverture | Nouvelle image sur la vitrine |
| 3 | Ouvrir la fiche puis **Modifier**, appuyer sur F5 | Le formulaire reste ouvert |
| 4 | Regarder le tableau puis une fiche | Vignette dans le tableau, grande image sur la fiche ; sans image : initiales (« DW ») |

### A4 Dossier étudiant et inscription au guichet
**Prouve** : tranches au centime près ; pas de double inscription (étape 2).
**Derrière** : `POST /etudiants` (transaction) ; `POST /inscriptions` → `creerInscription` → `calculerEcheancier`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Étudiants → Nouveau : identité, e-mail, photo, pièces | Dossier créé (rôle Étudiant imposé par le serveur) |
| 2 | Inscriptions → Nouvelle : cet étudiant, une formation, 3 tranches | 3 tranches dont la somme = le tarif exact (la dernière prend l'arrondi) |
| 3 | Réinscrire le même étudiant à la même formation | **409** déjà inscrit |

### A5 Validation d'une inscription en ligne et fiche PDF ⭐
**Prouve** : l'Accueil garde la main ; un double clic ne valide pas deux fois (étape 3).
**Derrière** : `POST /inscriptions/:id/valid` → `validerInscription`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Inscriptions → filtres « En ligne » et « Non validée » | Miora, avec son paiement déclaré |
| 2 | **Valider** | Le paiement déclaré devient validé ; Miora est prévenue et reçoit sa fiche PDF |
| 3 | Valider une 2ᵉ fois | **409** déjà validée |
| 4 | Ouvrir la fiche d'inscription | PDF dans un nouvel onglet |
| 5 | Inscription en ligne avec un dossier incomplet → Valider | Bouton désactivé / **409** avec les pièces manquantes. Au guichet : « Valider quand même » |

### A6 Paiements : validation, refus, guichet, facture ⭐
**Prouve** : un paiement n'est traité qu'une fois ; la facture part toute seule ; le montant ne dépasse jamais le reste à payer (étape 5).
**Derrière** : `PUT /paiements/:id/valider` → `traiterPaiementEnAttente` → `envoyerFactureAuto` ; `PUT /paiements/:id/refuser`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Paiements : regarder le bandeau « à valider » | Nombre de paiements en attente sur **toute** la base |
| 2 | **Valider** le paiement de Sitraka | Statut validé, reste à payer à jour ; « facture envoyée à Sitraka » ; Sitraka reçoit une notification + l'e-mail avec la facture PDF |
| 3 | **Refuser** un autre paiement en attente | Statut refusé ; l'étudiant est prévenu et peut repayer |
| 4 | Bouton **Facture** d'un paiement validé, puis d'un refusé | PDF ouvert (pas de 2ᵉ e-mail) ; **409** pour le refusé |
| 5 | Cliquer **Facture** deux fois sur le même paiement | Le même numéro revient, aucun doublon |
| 6 | Payer au guichet un montant **supérieur** au reste | **400** |
| 7 | Échéances → **Payer** au guichet, montant correct | « Paiement enregistré : la facture est envoyée à … » ; e-mail reçu |
| 8 | Ouvrir le détail d'un paiement traité | « Traité par » = l'employé ; « Non renseigné » pour un ancien paiement |

### A7 Échéances et rappels ⭐
**Prouve** : les couleurs suivent les dates ; une alerte n'est jamais envoyée deux fois (étape 6).
**Derrière** : `GET /echeances?statut=ROUGE` ; `POST /echeances/:id/rappeler` → `rappelerEcheance` ; chaque heure `verifierAlertes`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Échéances → filtre **rouge** (en retard) | Toky et Fano (2 chacun) : 4, comme l'indicateur du tableau de bord |
| 2 | **Rappeler** Toky | Notification + e-mail ; date du dernier rappel affichée |
| 3 | Rappeler une tranche déjà réglée, ou payée mais pas encore validée | **409** |
| 4 | Regarder les notifications de l'Accueil | **Une seule** alerte groupée pour les tranches à J-2 |

### A8 Assistance
**Prouve** : l'étudiant est prévenu quand sa demande est traitée.
**Derrière** : `PUT /assistances/:id/resoudre` → `resoudreDemande`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Ouvrir Assistance | 3 demandes en attente |
| 2 | **Résoudre** une demande | « Résolu », l'étudiant est notifié sur le mobile |
| 3 | La résoudre encore | **409** |

### A9 Notifications envoyées par le personnel
**Derrière** : `POST /notifications/in-app`, `POST /notifications/email/piece-jointe`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Envoyer une notification à un étudiant | Reçue sur le mobile |
| 2 | Envoyer un e-mail avec pièce jointe | E-mail reçu avec le fichier |

### A10 Attestation et QR code ⭐
**Prouve** : pas d'attestation sans les conditions ; n'importe qui peut vérifier qu'elle est vraie (étape 9).
**Derrière** : `creerAttestation`, `envoyerAttestation` ; `GET /verification/:uuid` (public) → `verifierAuthenticite`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Attestation de Tsiory (Bureautique) **avant** sa note de présentation | Refusé : la note manque |
| 2 | Après F4 (note) et M7 (commentaire) : générer et envoyer | PDF avec note /20 et QR code, envoyé par e-mail ; l'inscription devient « Réussie » |
| 3 | Scanner le QR code avec le téléphone (même Wi-Fi) | Page « Attestation authentique » : nom, formation, durée, date |
| 4 | Ouvrir l'adresse avec un uuid modifié | « Document non reconnu » |
| 5 | Documents : déposer puis désactiver un document administratif | Ajouté, puis retiré de la liste |

### A11 Étudiants à risque de décrochage et relance ⭐
**Prouve** : on repère l'élève qui lâche **maintenant**, sans le sanctionner (étape 8b).
**Derrière** : `GET /decrochage` → `listerEtudiantsARisque` ; `POST /inscriptions/:id/relancer` → `relancer` ; chaque heure `signalerDecrochages`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Tableau de bord → carte « Étudiants à risque » | **Sitraka** « À contacter » (plus aucun cours ouvert depuis le 14/10) ; **Andry** « À surveiller » (irrégulier) ; raisons affichées, lien vers l'inscription |
| 2 | Vérifier qui n'y est **pas** | Toky et Fano (formation terminée) ; Tsiory et Onja (assidus : une tranche à rappeler seule ne suffit pas) |
| 3 | **Relancer** Sitraka | Notification + e-mail « Tout va bien ? », sans le mot « risque » ; « Relancé le … », bouton grisé |
| 4 | (Postman) Relancer encore | **409** une relance tous les 3 jours au plus |
| 5 | Notifications de l'Accueil après le démarrage | **Une** notification « 1 étudiant à contacter » ; rien de nouveau l'heure suivante |

### A12 Page Formateurs : ce qui reste et notation des commentaires
**Prouve** : la note d'un formateur n'apparaît que quand tout est complet (étape 8c).
**Derrière** : `GET /formateurs/avis` ; `PUT /formateurs/commentaires/:id/note` → `noterCommentaire`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Tableau de bord → cliquer « 4/5 commentés » de Voahangy (ou menu **Formateurs**, SA ou Accueil) | « Ce qui reste » : Voahangy (Tsiory pas encore commenté, lien vers son inscription) ; Rivo (1 commentaire à noter) |
| 2 | Noter le commentaire d'Onja **7,5** | Rivo disparaît de « Ce qui reste » ; au tableau de bord, Rivo a sa note sur 20 |

---

## F. Web — Formateur

### F1 Espace formateur et mentions
**Prouve** : un formateur ne voit que ses formations ; il ne mentionne que ses inscrits.
**Derrière** : `GET /formations/:id/etudiants` ; `POST /commentaires` → `verifierMentions`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Se connecter en formateur | Menu : Espace formateur, Supports, Supports programmés |
| 2 | Cliquer sur une de ses formations | La liste de ses étudiants |
| 3 | Sous un de ses cours, taper `@` + 2 lettres, choisir un étudiant, publier | L'étudiant reçoit « … vous a mentionné » sur le mobile |
| 4 | (Postman) Mentionner un étudiant d'une autre formation | **400** |
| 5 | Cloche avec plus de 9 non lues | Badge **« 9+ »**, qui baisse quand on lit |

### F2 Publier un cours mis en forme ⭐
**Prouve** : aucun script caché ne peut passer (protection XSS) (étape 7).
**Derrière** : `POST /supports` → `creerSupports` → `nettoyerContenu`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Supports : titre, texte en gras / liste / lien, PDF joint → Envoyer | Visible sur le mobile, étudiants notifiés |
| 2 | Coller `<script>alert(1)</script>` et un lien `javascript:` dans le texte | Supprimés à l'enregistrement |
| 3 | Publier un cours **audio** ou **vidéo** | Lecteur intégré, sans bouton Télécharger |
| 4 | Rechercher, filtrer, trier, « Voir plus » | Liste filtrée |
| 5 | Titre « Chapitre 3 », choisir **3 fichiers** d'un coup → Envoyer | **3 supports** : « Chapitre 3 — nom du fichier » ; étudiants notifiés pour chacun |
| 6 | Choisir 11 fichiers | Message « 10 au plus », bouton désactivé (Postman : **400**) |

### F3 Cours programmés
**Prouve** : le serveur publie tout seul à l'heure (§6).
**Derrière** : `POST /supports` avec une date ; chaque minute `verifierSupportsProgrammes` ; `POST /supports/:id/envoyer`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Programmer un cours dans 2 minutes | Dans « Supports programmés », invisible des étudiants |
| 2 | Attendre l'heure | Publié automatiquement, étudiants notifiés |
| 3 | « Projet : site vitrine » → **Envoyer maintenant** | Publié tout de suite |
| 4 | Programmer dans le passé | **400** |

### F4 Classement et note d'attestation ⭐
**Prouve** : la note est calculée automatiquement, avec une règle simple (étape 8).
**Derrière** : `GET /formations/:id/classement` → `calculerClassement` ; `PUT /inscriptions/:id/note` → `definirNote`.

Rappel : note système /10 = 10 − malus présence (0 / −1 / −2 / −4) − malus paiement (−1 par tranche en
retard, −2 par tranche non réglée, −4 au plus). Note finale /20 = note système + présentation.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Espace formateur → Classement d'une formation | Rang, colonnes Présence (« 91 % · 0 »), Paiement (« À temps · 0 » ou « 1 non réglée · −2 »), note /10 |
| 2 | Bureautique : **Rindra** | 100 % (0) + tout à temps (0) → **10/10** ; avec 8 : 18/20 |
| 3 | Développement web : **Toky** | 40 % (−4) + 2 tranches non réglées (−4) → **2/10** |
| 4 | Infographie : **Miora** | 91 % (0) + 2ᵉ tranche réglée le lendemain (−1) → **9/10** ; avec 7 : 16/20 |
| 5 | Réseaux : **Sitraka**, payé sur le mobile le jour même, pas encore validé | **Aucun** malus : c'est la date du paiement qui compte, pas la validation |
| 6 | Saisir **12** en présentation | Refusé : 10 au maximum |
| 7 | Saisir **8** puis Entrée | Note /20 affichée (ex. Tsiory : 9 + 8 = 17/20) |

---

## M. Mobile — Étudiant et visiteur

### M1 Vitrine et inscription en ligne ⭐
**Prouve** : tout ou rien (transaction) ; limite contre les abus (étapes 1 et 2).
**Derrière** : `GET /public/vitrine` → `contenuVitrine` ; `POST /public/inscriptions` → `inscriptionEnLigne`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Ouvrir l'app sans compte → Découvrir | Fond plein écran, formations, formateurs « compétents » |
| 2 | Choisir 2 formations → S'inscrire | Compte créé, 2 inscriptions « en attente de validation » |
| 3 | Recommencer avec un e-mail déjà utilisé | **409** |
| 4 | 6 envois en une heure | **429** |
| 5 | « Nous contacter » : Site web, Facebook, E-mail | Ouvrent `imtechinfo.com`, la page Facebook d'IMTECH, un e-mail à `im.techinfo.mdg@gmail.com` |

### M2 Accueil et formations
**Derrière** : `GET /etudiants/:id/formations`, `/dashboard-paiement`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Se connecter en étudiant → Accueil | Dernière formation, prochaine tranche, derniers cours et commentaires |
| 2 | Formations → une formation | Détail ; formation non validée : « En attente de validation » |
| 3 | Première connexion d'un étudiant | Écran « Conditions » à accepter ; « Je refuse » = déconnexion |
| 3b | Étudiant qui avait accepté l'ancienne version (1), se reconnecter | Écran « Conditions » redemandé (version 2) ; Présence : « quand vous ouvrez un cours » |

### M3 Consultation sécurisée d'un cours ⭐
**Prouve** : les cours ne fuient pas facilement (étape 7).
**Derrière** : `servirFichiers` (droits + filigrane) ; `FLAG_SECURE` sur Android.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Documents → ouvrir un PDF | Lecteur intégré, **filigrane** nom + e-mail + date |
| 2 | Capture d'écran (Android) | Écran noir sur la capture |
| 3 | Ouvrir l'adresse du fichier dans un navigateur, sans token | **401** |
| 4 | Fichier d'une formation où l'étudiant n'est pas inscrit | Refusé |

### M4 Commentaires et réactions
**Prouve** : un étudiant répond mais ne mentionne pas ; une réaction par cours.
**Derrière** : `POST /commentaires` → `creerCommentaire` ; `POST /supports/:id/reactions`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Commenter un cours | Le **formateur** est notifié |
| 2 | Répondre à un commentaire | Réponse sous le commentaire ; son auteur est notifié |
| 3 | (Postman, token étudiant) Commentaire avec `"mentions": [2]` | **403** |
| 4 | 👍 puis 👎 | Une seule réaction, remplacée |

### M5 Paiement d'une tranche ⭐
**Prouve** : le montant est imposé par le serveur ; pas de double déclaration (étape 5).
**Derrière** : `POST /paiements` → `enregistrerPaiement`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Accueil → **Payer** la prochaine tranche (mode, référence) | « En attente de validation » ; montant **fixé par le serveur** ; Accueil notifié |
| 2 | Repayer la même tranche | **409** un paiement est déjà en attente |
| 3 | Après A6 (validation) | Notification « paiement validé », reste à payer à jour, facture par e-mail |

### M6 Assistance, notifications, présence
**Prouve** : ouvrir l'appli ne suffit pas pour être présent.
**Derrière** : `POST /assistances` ; `presenceSurCours` → `marquerPresence`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | ⋮ → Assistance → envoyer une demande | Visible côté web (A8) |
| 2 | Notifications : marquer lue, supprimer | Une notification supprimée ne revient pas ; « 9+ » au-delà de 9 non lues |
| 3 | Un jour de semaine : ouvrir seulement l'accueil, puis ouvrir un cours | L'accueil seul ne compte pas ; après le cours, une présence de plus dans F4 |

### M7 Commentaire de fin de formation
**Prouve** : le commentaire est obligatoire pour l'attestation et n'est pas visible du formateur (étape 8c).
**Derrière** : `POST /inscriptions/:id/commentaire-formateur` → `commenter` → `envoyerSiPrete`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | À partir de J-2 : Formations → bandeau → **Commenter mon formateur** | Écran du commentaire (demandé à J-2, puis relancé chaque jour) |
| 2 | Envoyer le commentaire | Web : « Le commentaire formateur de X a été envoyé » ; si tout est prêt, l'attestation part tout de suite |
| 3 | Commenter une 2ᵉ fois | **409** |

---

## T. Fonctions transverses

### T1 Recherche globale ⭐
**Prouve** : chacun ne trouve que ce que son rôle a le droit de voir.
**Derrière** : `GET /recherche?q=` → `rechercher`.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Web : **Ctrl+K** → un nom d'étudiant, une formation, « paie » → Entrée | La bonne fiche s'ouvre ; l'Accueil ne trouve pas les comptes |
| 2 | Formateur : chercher un étudiant, un cours | Seulement ses étudiants et ses cours |
| 3 | Mobile : loupe → titre d'un cours, « payer », « theme » | Cours / formation / écran ouvert ; jamais d'étudiants ni de comptes |

### T2 Une adresse par fiche ⭐
**Prouve** : on peut partager le lien d'une fiche, F5 ne perd rien.

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Ouvrir une fiche étudiant | Adresse `/dashboard/etudiants/12` |
| 2 | **F5**, puis « Précédent » | La fiche reste ouverte ; retour à la liste |
| 3 | Copier le lien dans l'autre navigateur (non connecté) | Connexion, puis arrivée directe sur la fiche |
| 4 | Taper `/dashboard/etudiants/abc` | Retour à la liste |

### T3 Pagination par le serveur ⭐
**Prouve** : seule la page affichée voyage sur le réseau (la base peut grossir).
**Derrière** : `GET /…?page=1&limite=…` (`LIMIT / OFFSET` + total).

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Paiements / Étudiants / Inscriptions / Échéances | Pied « 1–10 sur N », boutons de pages ; onglet Réseau : une seule page transférée |
| 2 | Rechercher ou filtrer depuis la page 3 | Retour page 1, total mis à jour |
| 3 | Désactiver la dernière ligne de la dernière page | Retour à la page précédente |

### T4 Apparence
| # | Faire | Attendu |
|:-:|---|---|
| 1 | Paramètres → mode sombre, autre couleur, taille, densité | Tout reste lisible ; « Modifications enregistrées » |
| 2 | Mobile : Paramètres → thème sombre | Lecteur et détail d'un cours lisibles |
| 3 | Super Admin → **Fond de la vitrine** → remplacer, puis « Par défaut » | Visible sur Découvrir (M1) |
| 4 | Mobile en mode sombre : Découvrir, Accueil, Paiements, Connexion | Toutes les icônes visibles |
| 5 | Mobile en mode sombre, couleur « Bleu IMTECH » : bouton Payer, bandeau « EN COURS » | Bleu clair avec texte foncé, lisible |

### T5 Ergonomie : confirmations, messages, petit écran
**Prouve** : l'appli parle à un utilisateur non informaticien (§7).

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Étudiants → Désactiver, puis **Annuler** ; recommencer et confirmer | Fenêtre de l'appli (pas du navigateur) avec le nom, bouton rouge ; puis bandeau vert « Étudiant désactivé » |
| 2 | Ajouter un étudiant, modifier une formation | Bandeau vert « Étudiant ajouté » / « Modifications enregistrées » |
| 3 | Valider / Refuser un paiement, Rappeler, Attestation | Le message cite l'étudiant et le montant ou la formation |
| 4 | **Arrêter le backend**, puis changer de page (web) ou tirer pour actualiser (mobile) | « Impossible de joindre le serveur… » en français |
| 5 | Fenêtre du navigateur sous 900 px | Menu réduit aux icônes ; revient en agrandissant |
| 6 | Mobile → Connexion | « Découvrir nos formations » centré, séparé du bouton « Se connecter » |
| 7 | Tableau de bord, Paiements, Échéances, facture PDF | Montants « 3 160 000 Ar » |

### T6 Désactiver / réactiver et éléments dépendants ⭐
**Prouve** : rien n'est effacé ; on ne peut pas agir sur un élément dont le « parent » est désactivé (§7 Suppression).
**Derrière** : `etatService` (désactiver / réactiver + historique) ; `dependanceService.verifier…` (409).

| # | Faire | Attendu |
|:-:|---|---|
| 1 | Désactiver un étudiant qui a une inscription | Il disparaît de la liste (filtre « Actifs » par défaut) |
| 2 | Inscriptions : la ligne de cet étudiant | Badge orange « Étudiant désactivé » |
| 3 | Sur cette ligne : Valider ou Fiche ; dans Échéances : Payer ou Rappeler | **409** « L'étudiant … est désactivé. Réactivez-le d'abord (page Étudiants, filtre « Désactivés ») » |
| 4 | Désactiver cette inscription puis la réactiver | **409** : réactiver l'étudiant d'abord |
| 5 | Désactiver un étudiant puis **Annuler** dans le bandeau vert (7 s) | Il revient aussitôt |
| 6 | Filtre « Désactivés » → **Réactiver** l'étudiant, puis l'inscription | Tout revient dans « Actifs », les actions marchent |
| 7 | Paiements : désactiver un paiement en attente ; regarder un paiement facturé | Le 1ᵉʳ passe dans « Désactivés » ; le facturé n'a pas de bouton « Désactiver » |
| 8 | Formations → « Désactivés » → **Réactiver** | Elle revient dans la liste et sur la vitrine |
| 9 | Documents : désactiver un document et un cours, puis les réactiver | Badge « Désactivé » ; le cours réapparaît chez les étudiants |

---

## Vérification du code

```bash
cd web && npx eslint src && npx vite build
cd mobile && npx tsc --noEmit && npx expo lint
cd backend-imtech && npm test      # tests automatiques, sans base de données
```

---

## Questions probables du jury (réponses courtes)

| Question | Réponse |
|---|---|
| Pourquoi ne pas montrer le score de décrochage à l'étudiant ? | La note est transparente parce qu'elle **juge** : elle est sur l'attestation, ses règles sont dans les conditions. Le décrochage est discret parce qu'il sert à **aider** : si les seuils étaient connus, un étudiant pourrait ouvrir un cours tous les 6 jours juste pour ne pas être repéré. La politique de confidentialité dit quand même que l'équipe suit l'activité pour accompagner l'étudiant |
| Le décrochage est-il automatique ? | La détection oui (score calculé, Accueil prévenu une fois, chaque heure) ; la relance non : l'Accueil clique « Relancer » (une fois tous les 3 jours au plus, message bienveillant sans le mot « risque ») |
| Pourquoi le rappel de paiement n'est pas automatique pour l'étudiant ? | Le système détecte et alerte l'Accueil à J-2 (une fois, automatiquement) ; l'Accueil décide, car il sait ce que le serveur ignore : paiement en espèces annoncé, délai accordé, étudiant déjà appelé. Un rappel automatique pourrait relancer quelqu'un qui est en règle |
| Pourquoi un paiement étudiant est « en attente » ? | L'Accueil vérifie que l'argent est arrivé avant de le compter. L'étudiant n'est pas pénalisé pendant ce temps : c'est la date d'envoi qui compte pour la note |
| Comment est calculée la note ? | 10 points de départ, moins la présence (−1, −2 ou −4) et les retards de paiement (−1 / −2 par tranche, −4 au plus), plus la présentation sur 10. Ex. 80 % de présence et une tranche en retard : 8/10, avec 7 → 15/20 |
| Comment un token volé est-il bloqué ? | Chaque requête vérifie la table `sessions` : « Se déconnecter partout » ou changer le mot de passe coupe vraiment le token |
| Et la force brute ? | 5 échecs en 15 min par compte, 20 par appareil, puis 429 |
| Un étudiant peut-il voir les données d'un autre ? | Non : le serveur vérifie le rôle **et** le propriétaire ; les menus ne font que cacher |
| Comment empêchez-vous la fuite des cours ? | Fichiers servis seulement aux inscrits validés, filigrane au nom de l'étudiant, captures bloquées sur Android |
| Deux employés valident en même temps ? | Le SQL ne change que ce qui est encore « en attente » / « non validé » : un seul passe, l'autre reçoit 409 |
| Une erreur au milieu d'une inscription ? | Transaction : tout est annulé, jamais un compte sans inscription |
| Et si la base grossit ? | Listes paginées par le serveur, recherche en SQL avec index, statistiques gardées 1 min en mémoire |
| Comment l'application est-elle testée ? | Tests automatiques sur les règles du serveur (`npm test`), Postman pour les routes, ces scénarios pour le web et le mobile, lint et build |
| Limites ? | Un seul serveur, paiement mobile déclaratif (MVola prévu : `paiement Mvola.md`), pas encore en ligne en HTTPS (§10 du flux) |
