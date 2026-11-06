# IMTECH INFO — Comprendre l'application (document de reprise)

Ce document est écrit pour **quelqu'un qui découvre le projet** et doit le reprendre. Lis-le dans
l'ordre :

1. **En une minute** : ce que fait l'application.
2. **Démarrer** : l'installer et la lancer.
3. **Le code** : où se trouve chaque chose, et le chemin d'un clic.
4. **Le parcours A → Z** : un étudiant, de l'inscription à l'attestation. On y voit chaque page,
   chaque bouton, chaque route et chaque fonction, avec la syntaxe expliquée.
5. **Les autres modules**, en bref.
6. Les règles à connaître, la base de données, les pièges, et ce qu'il reste à faire.

Autres documents (ils renvoient tous aux parties de celui-ci) :

| Document | Contenu |
|---|---|
| [`backend-imtech/api.md`](backend-imtech/api.md) | Toutes les routes et leurs droits, exemples de requêtes Postman |
| [`SCENARIOS-TESTS.md`](SCENARIOS-TESTS.md) | Un scénario par fonctionnalité, parcours de soutenance |
| [`CHEAT-SHEET.md`](CHEAT-SHEET.md) | Aide-mémoire : commandes, ajouter une fonctionnalité, requêtes SQL, dépannage |
| [`cheat-sheets/`](cheat-sheets/) | Syntaxe générale Node, React (+ React Native), MySQL |
| [`paiement Mvola.md`](paiement%20Mvola.md) | Prochaine évolution (§10) : paiement MVola |
| [`FLUX-MEMOIRE.md`](FLUX-MEMOIRE.md) | Support de rédaction du mémoire |
| [`A-FAIRE.md`](A-FAIRE.md) | Tâches en cours, soutenance, APK, remise du projet |

---

## 1. En une minute

IMTECH INFO est un centre de formation. L'application remplace les cahiers et les fichiers Excel.
Elle gère les **inscriptions**, les **paiements en plusieurs tranches**, les **cours en ligne** et
les **attestations**.

| Partie | Technologie | Pour qui |
|---|---|---|
| **Serveur (API)** `backend-imtech/` | Node.js + Express + MySQL (MariaDB avec XAMPP) | Tout le monde passe par lui |
| **Site web** `web/` | React + Vite | Super Admin, Accueil, Formateur |
| **Application mobile** `mobile/` | React Native + Expo (TypeScript) | Étudiant, et visiteur sans compte |

| Rôle | Ce qu'il fait |
|---|---|
| **Super Admin** | Tout : comptes, formations, réglages (logo, fond de la vitrine), et tout ce que fait l'Accueil |
| **Accueil** | Dossiers étudiants, inscriptions, paiements, rappels, factures, attestations, demandes d'aide |
| **Formateur** | Ses formations, ses supports de cours (tout de suite ou à une heure choisie), la note de présentation |
| **Étudiant** (mobile) | Suit ses cours, commente, paie ses tranches, demande de l'aide |
| **Visiteur** (mobile) | Sans compte : voit les formations et s'inscrit en ligne |

---

## 2. Démarrer le projet

**Prérequis.** Node.js 18 ou plus, XAMPP (MariaDB) et, pour tester sur téléphone, l'appli Expo Go
(ou un build de développement), le téléphone étant sur le même Wi-Fi que le PC.

**Fichiers `.env`** (non versionnés) :

| Dossier | Variables |
|---|---|
| `backend-imtech/.env` | `PORT`, `URL_BASE` (adresse publique, utilisée dans le QR code), `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`gestion_formation_db`), `JWT_SECRET` (**obligatoire** : sans lui, le serveur refuse de démarrer), `APP_NAME`, `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail) ; optionnel : `IMTECH_SITE_WEB`, `IMTECH_FACEBOOK_URL`, `IMTECH_EMAIL`, `IMTECH_WHATSAPP`, `IMTECH_TELEPHONE`, `IMTECH_ADRESSE` (contacts de la vitrine ; vides = vrais contacts d'IMTECH, dans `config/vitrine.js`) |
| `web/.env` | `VITE_URL_BASE=http://localhost:3000/api` |
| `mobile/.env` | `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:3000/api` (l'IP s'affiche au démarrage du serveur) |

**Base de données** (dans `backend-imtech/`) :

| Fichier | Rôle |
|---|---|
| `base.sql` | Crée toute la base, à jour |
| `alter.sql` | **Changements de schéma** à appliquer sur une base existante. Les écrire **rejouables** (`IF NOT EXISTS`, `INSERT … WHERE NOT EXISTS`) et les reporter aussi dans `base.sql` |
| `alter2.sql` | Anciennes évolutions numérotées (001 à 010), déjà appliquées : ne plus y ajouter |
| `reinit.sql` / `donneesTest.sql` / `scripts/fichiersDemo.js` | Vider la base / données de démonstration / photos et supports de démonstration |

```bash
# Base neuve + démonstration
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gestion_formation_db CHARACTER SET utf8mb4"
mysql -u root --default-character-set=utf8mb4 gestion_formation_db < backend-imtech/base.sql
mysql -u root < backend-imtech/donneesTest.sql
node backend-imtech/scripts/fichiersDemo.js

cd backend-imtech && npm install && npm run dev   # API sur http://localhost:3000/api
cd web            && npm install && npm run dev   # site sur http://localhost:5173
cd mobile         && npm install && npx expo start
cd backend-imtech && npm test                     # tests automatiques (node --test)
```

**Comptes de démonstration** (mot de passe `admin123`) :
- Super Admin : `tljelia374@gmail.com`.
- Accueil : `test123acceuil@gmail.com`.
- Formateur : `tolojanaharyelia845@gmail.com`.
- Étudiants : `prenom.nom@imtech.test` (par exemple `andry.rakotoarisoa@imtech.test`).

Les dates de démonstration sont calculées à partir du jour où on les charge : il y a donc toujours
des retards, des échéances proches et une formation qui vient de se terminer.

---

## 3. Comment le code est organisé

```
backend-imtech/
├── app.js              démarrage, fichiers protégés, gestion des erreurs, tâches automatiques
├── routes/routes.js    TOUTES les adresses /api/... (commence par là pour trouver une fonction)
├── middlewares/        verifyToken (connexion), checkRole (rôle), docUpload (fichiers), limiteRequetes
├── controllers/        lisent la requête et répondent en JSON
├── services/           les RÈGLES du centre
├── models/             le SQL uniquement
├── utils/              e-mails, PDF, QR code, filigrane, pagination, transaction, montants (format),
│                       filtre actif / désactivé (etat)
├── config/             connexion MySQL, rôles, textes et contacts de la vitrine
└── tests/              tests node --test
web/src/      pages/ (un dossier par menu) · hooks/ (appels API) · components/ · utils/api.js
              utils/format.js (montants) · utils/etat.js + components/etat/ (éléments désactivés)
mobile/src/   app/ (un fichier = un écran, Expo Router) · hooks/ · components/ · context/ · utils/api.ts
```

### Le chemin d'un clic

```
Page (bouton)  →  hook (use…)  →  apiRequest()  →  route  →  middleware  →  controller  →  service  →  model  →  MySQL
```

| Couche | Son rôle, en une phrase |
|---|---|
| Page | Affiche et réagit au clic |
| Hook | Appelle l'API et garde les données (`useState`) |
| `apiRequest` | Ajoute le token, envoie la requête, renvoie le JSON ou lève une erreur avec le message du serveur. Serveur injoignable ou réponse sans message : phrase en français (`MESSAGE_HORS_LIGNE`, `messageErreurHttp`), jamais « Failed to fetch » ni « Erreur 500 » |
| Route | Associe une adresse (`POST /paiements`) à un controller, et dit quels rôles y ont droit |
| Middleware | `verifyToken` : la connexion est-elle valide ? `checkRole` : le rôle est-il autorisé ? |
| Controller | Lit `req.body` (formulaire), `req.params` (`:id` de l'adresse), `req.query` (`?page=`), appelle le service |
| Service | Les règles : montant imposé, déjà inscrit ?, note ≤ 10… Lève une erreur (`throw`) si une règle n'est pas respectée |
| Model | Les requêtes SQL, toujours avec des `?`, jamais en collant les valeurs dans le texte |

Toutes les réponses ont la même forme : `{ status: 'success', data }` ou `{ status: 'error', message }`.
Une erreur levée par un service (`badRequest`, `notFound`, `conflict`… dans `utils/errors.js`) est
transformée en réponse par un seul endroit, à la fin de `app.js`.

### Mini-lexique de syntaxe (on le retrouve partout)

| Syntaxe | Exemple du projet | Ce que ça veut dire |
|---|---|---|
| `async` / `await` | `const user = await userModel.findUserByEmail(email)` | Attendre la réponse de la base avant de continuer |
| Déstructuration `{ }` | `const { email, mot_de_passe } = req.body` | Sortir des champs d'un objet en une ligne |
| Déstructuration `[ ]` | `const [premiere] = await …getEcheancesByInscription(…)` | Prendre le 1er élément d'un tableau |
| Spread `...` | `{ ...donnees, date_delivrance }` | Copier un objet et ajouter ou remplacer des champs |
| `?.` | `email?.trim()` | « Si `email` existe, alors `.trim()` », sinon `undefined` sans planter |
| `??` / `\|\|` | `a?.taux_positif ?? null` | Valeur par défaut (`??` seulement si `null` / `undefined`) |
| Gabarit `` ` ` `` | `` `Bonjour ${prenom}` `` | Texte avec des variables dedans |
| `throw` | `throw conflict('Déjà inscrit.')` | Arrêter et renvoyer une erreur HTTP (409 ici) |
| `try / catch / finally` | `apiRequest`, `avecTransaction` | Attraper une erreur ; `finally` s'exécute toujours |
| `Promise.all([...])` | `contenuVitrine` | Lancer plusieurs requêtes **en même temps** |
| `.map` / `.filter` / `.reduce` | `inscriptions.reduce((s, i) => s + i.montant, 0)` | Transformer / trier / additionner un tableau |
| `new Map()` | `verifierDemande` | Dictionnaire clé → valeur (ici : retire les doublons) |
| `useState` | `const [vitrine, setVitrine] = useState(null)` | Donnée affichée ; `setVitrine` la change et réaffiche |
| `useEffect` | chargement au montage | Lancer du code quand la page s'ouvre (ou quand une valeur change) |

---

## 4. Le parcours A → Z : de l'inscription à l'attestation

On suit **Andry**, un étudiant. Chaque étape donne la page, le bouton, la route, la chaîne de
fonctions, puis **la fonction clé expliquée**.

### Étape 1 — Andry découvre les formations (mobile, sans compte)

| | |
|---|---|
| **Page** | `mobile/src/app/decouvrir.tsx` (écran « Découvrir ») |
| **Action** | Ouverture de l'écran |
| **Route** | `GET /public/vitrine` (publique, sans token) |
| **Fonctions** | `useVitrine().chargerVitrine` → `vitrineController` → `vitrineService.contenuVitrine` → `vitrineModel.getFormationsPubliques`, `reactionService.avisFormateurs`, `vitrineModel.getModesPaiement`, `parametreModel.getParametre` |

**Fonction clé : `contenuVitrine()`** (`services/vitrineService.js`). Elle rassemble tout ce que la vitrine affiche.

```js
const [formations, avis, modesPaiement, fond] = await Promise.all([
  vitrineModel.getFormationsPubliques(),
  reactionService.avisFormateurs(),
  vitrineModel.getModesPaiement(),
  parametreModel.getParametre(FOND_VITRINE),
]);
```
- `Promise.all` lance les **4 requêtes en même temps**, au lieu de les attendre l'une après l'autre.
- `[formations, avis, …]` range chaque résultat dans sa variable, **dans le même ordre**.
- Ensuite, `formations.map(f => ({ ...f, tarif: Number(f.tarif) }))` ajoute à chaque formation l'avis
  sur son formateur. `Number()` convertit le `DECIMAL` de MySQL (renvoyé en texte) en nombre.

**Contacts** (section « Nous contacter ») : boutons Site web, Facebook, E-mail (et WhatsApp si un numéro est
renseigné), lus dans `config/vitrine.js` (`CONTACTS`) : `https://www.imtechinfo.com/`, la page Facebook
d'IMTECH et `im.techinfo.mdg@gmail.com`. Le `.env` peut les remplacer (§2).

### Étape 2 — Andry s'inscrit en ligne

| | |
|---|---|
| **Page** | `decouvrir.tsx` → il coche des formations → bouton du bas → fenêtre `components/vitrine/inscription-modal.tsx` |
| **Bouton** | **« Envoyer mon inscription (n) »** → fonction `envoyer()` |
| **Paramètres envoyés** | `{ nom, prenom, email, telephone, mot_de_passe, formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }` |
| **Route** | `POST /public/inscriptions` (publique, **5 par heure** par appareil : `limiteInscription`) |
| **Fonctions** | `useVitrine().inscrire` → `inscriptionEnLigneController` → `vitrineService.inscriptionEnLigne` → `verifierDemande`, `etudiantModel.insertUtilisateurEtEtudiant`, `inscriptionService.creerInscriptionDans` → `echeanceService.genererEcheancier`, `paiementModel.insererPaiement`, puis `notifService.notifierPersonnel` |
| **Tables** | utilisateur, etudiant, inscription, echeance, paiement (`en_attente`), notification_inapp |

**Fonction clé : `inscriptionEnLigne(demande)`.** Elle crée le compte, les inscriptions, l'échéancier et le
1ᵉʳ paiement, **tout ou rien**.

```js
const resultat = await avecTransaction(async (connection) => {
  const id_etudiant = await etudiantModel.insertUtilisateurEtEtudiant(connection, { … });
  for (const { id_formation, nombre_tranches } of formations) {
    const id_inscription = await inscriptionService.creerInscriptionDans(connection, { … origine: 'en_ligne' });
    const [premiere] = await echeanceModel.getEcheancesByInscription(id_inscription, connection);
    await paiementModel.insererPaiement({ id_echeance: premiere.id_echeance, statut: EN_ATTENTE, … }, connection);
  }
  return { id_etudiant, id_utilisateur, inscriptions };
});
```
- `avecTransaction(fn)` (`utils/transaction.js`) ouvre une **transaction** : si une seule requête échoue,
  `rollback` annule tout, donc pas de compte sans inscription. Toutes les requêtes reçoivent la même `connection`.
- `for (const { id_formation, nombre_tranches } of formations)` parcourt le tableau en **déstructurant chaque élément**.
- Le mot de passe est haché **avant** (`bcrypt.hash(mot_de_passe, 10)`) : la base ne garde jamais le mot de passe en clair.
- Les notifications partent **après** la transaction, dans un `try/catch` : un e-mail en panne n'annule pas l'inscription.
- Le formulaire demande le mot de passe **deux fois** (`confirmation_mot_de_passe`, vérifié aussi par le serveur).
- **Étape 4 du formulaire, « Votre dossier »** : Andry choisit « Les ajouter maintenant » (photos prises ou
  choisies, envoyées en multipart avec l'inscription) ou « Plus tard » (menu ⋮ > **Mon dossier** après connexion,
  `mobile/src/app/dossier.tsx`, `GET/PUT /mon-dossier`). Il peut y remplacer une pièce à tout moment ; l'Accueil
  est notifié. Les 4 pièces obligatoires sont listées dans `backend-imtech/config/dossier.js`.

**Sous-fonction : `calculerEcheancier()`** (`services/echeanceService.js`). Elle divise le tarif en tranches.
- Le calcul se fait **en centimes** (`Math.round(tarif * 100)`), sur des entiers, pour éviter les erreurs d'arrondi.
- `Array.from({ length: nb }, (_, index) => …)` fabrique un tableau de `nb` tranches.
- La **dernière tranche** récupère les centimes restants, pour que le total soit exact.

> L'Accueil peut aussi inscrire au guichet (web : **Étudiants → Nouveau dossier**, puis **Inscriptions →
> Nouvelle inscription**, `POST /etudiants` puis `POST /inscriptions`). Les deux chemins utilisent la même
> `creerInscriptionDans`. Dans **Nouvelle inscription**, l'étudiant se cherche en tapant son nom, son e-mail
> ou son téléphone (`ChampRecherche.jsx` : `GET /etudiants?page=1&limite=8&recherche=`, 8 propositions) ;
> la liste complète des étudiants n'est plus chargée.

**Découvrir, 5 par 5.** `GET /public/vitrine` n'envoie que les 5 premières formations et les 5 premiers
formateurs compétents, avec leurs totaux (chiffres du bandeau). Les carrousels sont des `FlatList`
horizontales : arrivé au bout, `onEndReached` appelle `chargerPlusFormations` / `chargerPlusFormateurs`
(`use-vitrine.ts`), qui demandent `GET /public/formations?page=2` ou `GET /public/formateurs?page=2`.
Côté serveur : `vitrineService.pageFormations` / `pageFormateurs` (le classement des formateurs est calculé
sur tous, puis découpé).

**Plus tard, Andry (déjà inscrit) choisit une autre formation.**

| | |
|---|---|
| **Page** | Onglet **Formations** → bouton **« Voir plus de formations et s'inscrire »** → `decouvrir.tsx` en mode connecté (`useAuth().user.id_etudiant`) |
| **Liste** | `useVitrine(etudiantId)` → `GET /etudiants/:id/formations-disponibles?page=` : seulement les formations qu'il ne suit pas encore (`vitrineModel.filtreFormations`, `NOT EXISTS` sur ses inscriptions actives) |
| **Bouton** | **« Envoyer mon inscription (n) »** dans `inscription-modal.tsx` (prop `etudiantConnecte` : ni identité, ni mot de passe, ni dossier, déjà enregistrés) |
| **Route** | `POST /etudiants/:id/inscriptions` (Étudiant, `exigerEtudiantProprietaire`) |
| **Fonctions** | `inscriptionCompteController` → `vitrineService.inscriptionCompteExistant` → `verifierFormations`, `inscrireFormationsDans` (la même boucle que l'inscription en ligne : `creerInscriptionDans` origine `en_ligne` + premier paiement en attente), puis `notifierInscriptionEnLigne` |

- Tout se fait dans **une transaction** : s'il est déjà inscrit à une des formations choisies, `creerInscriptionDans`
  lève un 409 et rien n'est créé.
- Son dossier existe déjà : s'il est complet, l'Accueil peut valider tout de suite.

### Étape 3 — L'accueil valide l'inscription (site web)

| | |
|---|---|
| **Page** | `web/src/pages/inscriptions/Inscriptions.jsx` (badge « En ligne ») |
| **Bouton** | **« Valider »** → `handleAction('validate', row)` → fenêtre de paiement → `handleValidation(payment)` |
| **Paramètres** | `id` de l'inscription (dans l'URL) + `{ id_mode_paiement, reference_virement }` |
| **Route** | `POST /inscriptions/:id/valid` (staff : Super Admin, Accueil) |
| **Fonctions** | `useInscription` → `validerInscriptionController` → `inscriptionService.validerInscription` → `inscriptionModel.setInscriptionValidee`, `paiementModel.getPaiementEnAttenteEcheance`, `validerPaiementDeclare`. Puis, côté web, `useNotifEvent().confirmationInscription` (notification + e-mail) |

**Fonction clé : `validerInscription(id_inscription, id_mode_paiement, reference_virement)`**
```js
const validee = await inscriptionModel.setInscriptionValidee(id_inscription, connection);
if (!validee) throw conflict('Inscription introuvable ou déjà validée.');
const declare = await paiementModel.getPaiementEnAttenteEcheance(premiereEcheance.id_echeance, connection);
if (declare) { await paiementModel.validerPaiementDeclare(declare.id_paiement, …); return …; }
```
- **Comment le serveur sait que l'inscription vient du mobile** : la colonne `inscription.origine` vaut
  `'en_ligne'` (posée par `inscriptionEnLigne`) ou `'accueil'`. Pour `'en_ligne'`, `verifierDossierComplet`
  refuse la validation (409, liste des pièces manquantes) tant que le dossier n'est pas complet. Sur la page,
  le filtre **Dossier** (Complet / Incomplet) retrouve ces inscriptions (pas de badge dans le tableau), et le
  **Détail** affiche le badge « Dossier incomplet · 2/4 » à côté du titre et liste les pièces fournies et manquantes.
  Les inscriptions **pas encore validées s'affichent en premier**.
- **Inscription faite à l'Accueil, dossier incomplet** : pas de blocage (c'est l'Accueil qui complète le
  dossier). `validerInscription` renvoie `pieces_manquantes`, le contrôleur ajoute `avertissement`. Dans
  `PaymentFormModal.jsx`, la fenêtre l'annonce avant (« Dossier incomplet (2/4 pièces) ») et le bouton
  devient **« Valider quand même »** ; pour une inscription en ligne, le bouton est désactivé.
- Elle renvoie `false` si l'inscription était **déjà validée** : un double clic ne valide pas deux fois (409).
- Si Andry avait **déclaré** son 1ᵉʳ paiement, on le **valide**. Sinon (inscription au guichet), on en
  **crée** un directement « validé ».
- Dans le controller : `exigerChamps(req.body, ['id_mode_paiement'])` répond 400 si un champ manque, et
  `req.params.id` est le `:id` de l'adresse.

### Étape 4 — Andry se connecte (mobile)

| | |
|---|---|
| **Page** | `mobile/src/app/login.tsx` |
| **Bouton** | **« Se connecter »** → `useAuth().login(email, password)` |
| **Route** | `POST /auth/login` (limite d'essais ratés par compte et par appareil) |
| **Fonctions** | `authController.login` → `authService.authentifier` → `userModel.findUserByEmail`, `bcrypt.compare`, `jwt.sign`, `userModel.createSession` |

**Fonction clé : `authentifier(email, mot_de_passe, { userAgent, ip })`**
```js
const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
if (!isMatch) return null;
const token = jwt.sign({ id, role, id_etudiant }, process.env.JWT_SECRET, { expiresIn: '24h' });
await userModel.createSession(user.id_utilisateur, token, userAgent, ip, DUREE_SESSION_HEURES);
```
- `bcrypt.compare` compare le mot de passe tapé au **hash** stocké.
- `jwt.sign` fabrique le **badge** (token) que l'appli renverra à chaque requête
  (`Authorization: Bearer <token>`).
- La **session** en base permet de couper l'accès à distance (« Se déconnecter partout »). Son expiration
  est calculée par MySQL (`DATE_ADD(NOW(), INTERVAL 24 HOUR)`).

**Ensuite, à chaque requête : `verifyToken`** (`middlewares/authMiddleware.js`). Il lit le token, le vérifie
(`jwt.verify`), contrôle que la session est encore active (`findActiveSession`), puis place l'utilisateur
dans `req.user`. Pour un étudiant, il **marque aussi sa présence du jour** (utilisé à l'étape 8).
`checkRole(...)` refuse (403) si le rôle n'est pas autorisé sur la route.

**Mot de passe oublié** (connexion → « Mot de passe oublié ») :
1. `POST /auth/forgot-password` envoie par e-mail un code valable 30 min (`userService.demanderReinitialisation`).
2. `POST /auth/reset-password` change le mot de passe (`reinitialiserMotDePasse`). Le message dit
   précisément si le code est incorrect, déjà utilisé ou expiré.

### Étape 5 — Andry paie ses tranches, l'accueil valide, la facture part toute seule

| | |
|---|---|
| **Page (mobile)** | `mobile/src/app/paiements.tsx` → fenêtre `components/paiement/paiement-modal.tsx` |
| **Bouton** | **« Payer X Ar »** → choix du mode → `onPayer(mode)` → `usePaiement().payerProchaineEcheance(mode)` |
| **Paramètres** | `{ id_echeance, id_mode_paiement, reference_virement }`, **sans montant** : c'est le serveur qui l'impose |
| **Route** | `POST /paiements` |
| **Fonctions** | `enregistrerPaiementController` → `paiementService.enregistrerPaiement` → `getEcheanceAvecSituation`, `insererPaiement` (`en_attente`), `prevenirPersonnelPaiement` |
| **Page (web)** | `web/src/pages/paiements/Paiements.jsx`, bouton **« Valider »** → `handleStatut(row, 'valider')` |
| **Route** | `PUT /paiements/:id/valider` → `paiementService.validerPaiement` → `traiterPaiementEnAttente` |
| **Facture** | **Automatique** dès que le paiement est validé : `paiementService.envoyerFactureAuto` → `documentService.envoyerFacture` (PDF + notification + e-mail avec le PDF), en arrière-plan. Aussi pour un paiement au guichet et le premier paiement d'une inscription validée. Le bouton **Facture** ne fait plus que l'ouvrir (`POST /factures/:id_paiement/generer`) |

**Fonction clé : `enregistrerPaiement({ id_echeance, … }, auteur)`**
```js
const resteAPayer = Number(echeance.montant_prevu) - Number(echeance.montant_valide);
if (resteAPayer <= 0) throw conflict('Cette échéance est déjà réglée.');
if (Number(echeance.id_etudiant) !== Number(auteur.id_etudiant)) throw forbidden('…');
if (Number(echeance.nb_en_attente) > 0) throw conflict('Un paiement est déjà en attente…');
await paiementModel.insererPaiement({ id_echeance, montant: resteAPayer, statut: EN_ATTENTE, … });
```
- Le **montant est calculé par le serveur** : un étudiant ne peut pas « payer » 1 Ar.
- `auteur` est `req.user`, fourni par `verifyToken` : on vérifie que l'échéance est bien la sienne.
- Le personnel peut aussi encaisser au guichet (web : **Échéances → Payer**). Son paiement est alors
  « validé » directement, et un paiement partiel est accepté.
- **Facture automatique** : `envoyerFactureAuto(id_paiement)` n'est pas attendue (`.catch` sans `await`) :
  l'Accueil a sa réponse tout de suite, l'e-mail part ensuite. Si la facture échoue (Gmail en panne…),
  l'étudiant reçoit quand même « Votre paiement … a été validé » en notification.

**Fonction clé : `traiterPaiementEnAttente(id_paiement, statut)`**
- Elle appelle `changerStatutPaiementEnAttente`, dont le SQL contient `WHERE statut = 'en_attente'` : un
  paiement n'est validé **qu'une seule fois**, même si deux employés cliquent en même temps.
- Puis elle notifie Andry : « Votre paiement … a été validé. »

### Étape 6 — Les rappels (tout seul, chaque heure)

| | |
|---|---|
| **Déclenché par** | `app.js` → `alerteService.demarrerAlertesAutomatiques()` (au démarrage, puis toutes les heures) |
| **Fonctions** | `verifierAlertes` → `alerteModel.getEcheancesARappeler`, `reserverAlerte`, `notifService.notifierPersonnel` |
| **Page (web)** | `pages/echeances/Echeances.jsx` (vert « À jour », jaune « À rappeler », rouge « En retard »), bouton **« Rappeler »** → `POST /echeances/:id/rappeler` → `echeanceService.rappelerEcheance` (notification + e-mail à Andry) |

**Fonction clé : `verifierAlertes()`**
```js
for (const e of await alerteModel.getEcheancesARappeler()) {
  if (!(await alerteModel.reserverAlerte(TYPES_ALERTE.ECHEANCE_J2, e.id_echeance))) continue;
  await notifService.notifierPersonnel(`${e.etudiant_prenom} … doit être rappelé …`);
}
```
- `reserverAlerte` renvoie `false` si l'alerte a **déjà été envoyée**, et `continue` passe alors à la
  suivante : jamais deux fois la même alerte.
- La même boucle prévient l'accueil quand une formation est **terminée** (`getFormationsTerminees`),
  ce qui mène à l'étape 9.

### Étape 7 — Le formateur publie un cours, Andry le lit

| | |
|---|---|
| **Page (web, formateur)** | `pages/formateur/SupportsFormateur.jsx`, formulaire **« Publier un support »** → `handleUpload` → `useSupport().uploadSupport(formData)` |
| **Paramètres** | FormData : `id_formation`, `titre`, `contenu`, `fichier`, et `date_envoi_prevue` (facultatif) |
| **Route** | `POST /supports` (Formateur ; `supportUpload.single('fichier')` enregistre le fichier) |
| **Fonctions** | `creerSupportController` → `supportService.creerSupports` → `supportModel.createSupport`, `supportProgrammeService.notifierSupportEnvoye` |
| **Page (mobile)** | Onglet **Formations** → `use-formation` (`GET /etudiants/:id/formations`) → détail `use-doc-detail` : supports `pageSupports` (`GET /formations/:id/supports?limite=5&avant=`) et commentaires `pageCommentairesFormation` (`GET /formations/:id/commentaires?limite=5&avant=`), 5 par 5 avec « Voir plus » → `lecteur.tsx` (`GET /supports/:id`). Onglet **Documents** : `use-document-lists` → `GET /supports?page=&limite=5&recherche=&id_formation=&id_formateur=` |
| **Page (web, liste)** | `ListeSupports.jsx` → `useSupport().listerSupports` (`GET /supports?page=&limite=5&recherche=&id_formation=&type=&tri=`) ; chaque carte `SupportItem.jsx` → `pageCommentaires` (`GET /supports/:id/commentaires?limite=3&avant=`) |

**Fonction clé : `creerSupports({ id_formation, titre, contenu, fichiers = [], date_envoi_prevue }, auteur)`**
- `fichiers = []` est une **valeur par défaut** : sans fichier, on a un tableau vide et non `undefined`.
- Elle vérifie que la formation est **celle du formateur** (`forbidden` sinon).
- `const pieces = fichiers.length ? fichiers : [null]` donne un support par fichier, ou un seul support texte.
- Sans date : les inscrits sont **prévenus tout de suite**. Avec une date : `supportProgrammeService`
  (vérifié chaque minute) les prévient 1 h avant, puis publie à l'heure.
- Le texte est nettoyé par `utils/contenuRiche.js` (pas de script caché). Le PDF ou l'image ouvert par
  Andry porte en filigrane **son nom et son e-mail** (`utils/filigrane.js`).

Sur un support, on peut **commenter, répondre, mentionner** avec `@` (`POST /commentaires`) et **réagir**
(`POST /supports/:id/reactions`). Les réactions servent à l'**avis sur les formateurs** (§5).

### Étape 8 — La présence et la note

| | |
|---|---|
| **Présence** | Automatique : chaque requête d'Andry passe par `verifyToken`, qui appelle `presenceModel.marquerPresence` (une ligne par jour) |
| **Page (web, formateur)** | `pages/formateur/AccueilFormateur.jsx` : classement et champ **note de présentation** → `useClassement` |
| **Routes** | `GET /formations/:id/classement` ; `PUT /inscriptions/:id/note` `{ note_presentation }` |
| **Fonctions** | `classementService.classementFormation`, `calculerClassement`, `malusPresence`, `malusPaiement`, `definirNote` |

**La note d'attestation sur 20** (commentaire en tête de `classementService.js`) :
- **note système sur 10** : chaque étudiant part de 10 et perd des points (jamais sous 0) ;
- **présence** (jours présents / jours de cours du lundi au vendredi déjà passés) : ≥ 90 % → 0,
  75–90 % → −1, 50–75 % → −2, < 50 % → −4 ;
- **paiement** (payée le jour de l'échéance → 0) : −1 par échéance payée en retard (réglée le jour
  suivant), −2 par échéance non réglée (pas réglée le jour suivant, même si payée plus tard), −4 au plus ;
  c'est la **date du paiement** (envoi Mvola ou guichet) qui compte, pas sa validation par l'Accueil :
  un paiement en attente compte déjà, seul un paiement refusé est ignoré ;
- on y ajoute la **présentation**, de 0 à 10, donnée par le formateur.
- Exemple : présence 80 % (−1) + une échéance payée en retard (−1) → 8/10 ; avec 7 en présentation → 15/20.

**Fonction clé : `definirNote(id_inscription, note, auteur)`**
```js
valeur = Number(String(note).replace(',', '.'));
if (!Number.isFinite(valeur) || valeur < 0 || valeur > NOTE_PRESENTATION_MAX) throw badRequest(…);
valeur = Math.round(valeur * 100) / 100;
```
- `String(note).replace(',', '.')` accepte « 7,5 » comme « 7.5 ».
- `Number.isFinite` refuse « abc », `NaN` et `Infinity`.
- `Math.round(x * 100) / 100` arrondit à 2 décimales.

### Étape 9 — L'attestation

| | |
|---|---|
| **Signal** | Étape 6 : « Andry a fini sa formation …, envoyez-lui son attestation. » |
| **Page (web)** | `pages/inscriptions/Inscriptions.jsx`, bouton **« Attestation »** → `handleAction('attestation', row)` → confirmation → `useDocument().envoyerAttestation(id_inscription)` |
| **Route** | `POST /attestations/:id_inscription/envoyer` (staff) |
| **Fonctions** | `envoyerAttestationController` → `documentService.envoyerAttestation` → `creerAttestation` → `classementService.actualiserClassement`, `genererQRCodeBuffer`, `genererAttestationPDF`, `documentModel.insertAttestation` → `notifService.notifierEtudiant` (notification + e-mail avec le PDF) |
| **Vérification** | Le QR code ouvre `GET /verification/:uuid` (public) → `verifierAuthenticite` (404 = faux document) |

**Fonction clé : `creerAttestation(id_inscription)`**
```js
await classementService.actualiserClassement(inscription.id_formation);
const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);
if (donnees.note_presentation === null) throw conflict("Le formateur n'a pas encore attribué la note…");
const uuid = crypto.randomUUID();
const qrBuffer = await genererQRCodeBuffer(`${URL_BASE}/verification/${uuid}`);
const cheminRelatif = await genererAttestationPDF({ ...donnees, date_delivrance: new Date() }, qrBuffer, nomFichier);
```
- La note est **recalculée juste avant** l'impression : elle est toujours à jour.
- Pas de note du formateur, pas d'attestation (409).
- `crypto.randomUUID()` produit un identifiant impossible à deviner ; il est imprimé dans le QR code.
- `{ ...donnees, date_delivrance }` copie les données et y ajoute la date du jour.

**Fonction clé : `envoyerAttestation(id_inscription)`**
- `const { cheminRelatif, uuid } = await creerAttestation(id_inscription)` : on récupère deux valeurs du résultat.
- `notifierEtudiant({ …, pieceJointe })` envoie la notification **dans tous les cas**, puis l'e-mail avec le
  PDF. Si l'e-mail échoue, elle renvoie `{ emailEnvoye: false }` et la page l'affiche, sans annuler l'attestation.

**Inscription « Réussie »** : dès qu'une attestation existe pour l'inscription, celle-ci est
réussie. Rien n'est enregistré en plus : le statut est **calculé par la requête**
(`STATUT_INSCRIPTION` dans `inscriptionModel.js` : `'reussi'` si l'`id_inscription` est dans
`attestation`, sinon `'en_cours'`). Il est renvoyé par `/inscriptions` (filtre `?statut=en_cours|reussi`,
badge et filtre « Réussie » sur la page Inscriptions), la fiche d'inscription, le dossier étudiant, la
recherche et l'appli mobile (badge « RÉUSSIE » sur la carte de la formation). Les montants de
l'inscription restent comptés dans les totaux.

🎓 **Fin du parcours** : Andry reçoit « Votre attestation … est disponible » dans l'appli et le PDF par
e-mail. N'importe qui peut scanner le QR code pour vérifier qu'elle est authentique.

### Le parcours en une ligne par étape

| # | Qui | Où | Route | Fonction clé |
|:-:|---|---|---|---|
| 1 | Visiteur | Mobile — Découvrir | `GET /public/vitrine` | `contenuVitrine` |
| 2 | Visiteur | Mobile — Inscription | `POST /public/inscriptions` | `inscriptionEnLigne` (transaction) |
| 3 | Accueil | Web — Inscriptions « Valider » | `POST /inscriptions/:id/valid` | `validerInscription` |
| 4 | Étudiant | Mobile — Connexion | `POST /auth/login` | `authentifier` + `verifyToken` |
| 5 | Étudiant puis Accueil | Mobile — Payer / Web — Paiements « Valider » (facture envoyée seule) | `POST /paiements`, `PUT /paiements/:id/valider` | `enregistrerPaiement`, `traiterPaiementEnAttente`, `envoyerFactureAuto` |
| 6 | Serveur | Tout seul, chaque heure | — | `verifierAlertes` |
| 7 | Formateur puis Étudiant | Web — Publier / Mobile — Formations | `POST /supports`, `GET /supports/:id` | `creerSupports` |
| 8 | Serveur + Formateur | Automatique / Web — note | `PUT /inscriptions/:id/note` | `marquerPresence`, `definirNote` |
| 9 | Accueil | Web — Inscriptions « Attestation » | `POST /attestations/:id/envoyer` | `creerAttestation`, `envoyerAttestation` |

---

## 5. Les autres modules, en bref

| Module | Page | Routes principales | Fonctions (service) | À savoir |
|---|---|---|---|---|
| **Comptes** | Web — Utilisateurs (Super Admin) | `GET/POST /utilisateurs`, `PUT/DELETE /utilisateurs/:id`, `PUT /utilisateurs/:id/reactiver` | `userService.creerUtilisateur`, `modifierUtilisateur`, `supprimerUtilisateur`, `etatService.reactiverUtilisateur` | Seul le Super Admin change un rôle. Désactiver un compte ferme toutes ses sessions ; filtre « État » (actifs par défaut) et colonne Statut : un compte désactivé n'a qu'un bouton « Réactiver » |
| **Mon profil** | Web — fenêtre Profil ; Mobile — Profil | `GET/PUT /utilisateurs/:id` (soi-même ou SA, multipart `photo`) | `userService.modifierUtilisateur` | Mobile : la photo est envoyée en `File` d'`expo-file-system` |
| **Dossiers étudiants** | Web — Étudiants (liste, fiche, formulaire) | `GET/POST /etudiants`, `PUT/DELETE /etudiants/:id`, `GET/PUT /mon-dossier` (étudiant) | `etudiantService.creerEtudiant` → `insertUtilisateurEtEtudiant` | Pièces (photos, CIN, certificat) dans `uploads/etudiants` ; « Désactiver » = masqué, pas effacé, réactivable (voir **Éléments désactivés**) ; 4 pièces obligatoires (`config/dossier.js`) : l'étudiant les dépose ou les remplace depuis le mobile (menu ⋮ > Mon dossier), l'Accueil est notifié |
| **Formations** | Web — Formations | `GET/POST /formations`, `PUT /formations/:id`, `PUT /formations/:id/image` | `formationService.*` | Un formateur ne voit que les siennes ; la couverture est publique (vitrine) et s'affiche aussi dans le tableau et la fiche (`CouvertureFormation.jsx` : initiales si pas d'image) |
| **Documents** | Web — Documents ; fiche d'inscription | `POST /fiche/:id/generer`, `GET/POST/DELETE /documents` | `documentService.creerFiche`, `creerDocument` | PDF créés par `utils/pdf.js` (pdfkit). « Désactiver » un document ou un support : masqué, réactivable (`PUT /documents/:id/reactiver`, `PUT /supports/:id/reactiver`) |
| **Commentaires et avis** | Support (web et mobile) ; tableau de bord | `POST /commentaires`, `POST /supports/:id/reactions`, `GET /formateurs/avis` | `commentaireService.creerCommentaire`, `reactionService.avisFormateurs` | Avis « Compétent / Non compétent / Pas assez d'avis » calculé à partir des réactions ; `?debut=&fin=` : seules les réactions données pendant la période |
| **Notifications** | Cloche et page Notifications (web) ; onglet Notifications (mobile) | `GET /notifications?limite=10&avant=<id>` / `?apres=<id>`, `GET /notifications/compteur`, `PUT /notifications/lu-tout` | `notifService.listerNotifications` | Les 10 dernières, bouton « précédentes », les nouvelles arrivent toutes les **10 s** ; pagination par curseur (id), pas par numéro de page |
| **Assistance** | Mobile — Assistance ; Web — Assistance | `POST /assistances` (ET), `GET /assistances`, `PUT /assistances/:id/resoudre` | `assistanceService.*` | L'Accueil est prévenu, l'étudiant aussi quand c'est résolu |
| **Recherche** | En-tête (web et mobile), Ctrl+K sur le web | `GET /recherche?q=` | `rechercheService.rechercher` | Résultats filtrés selon le rôle ; 2 lettres minimum |
| **Sessions** | Paramètres → Sécurité | `GET /auth/sessions`, `PUT /auth/logout-all`, `PUT /auth/change-password` | `authService.*` | Le site et l'appli revérifient la session chaque minute |
| **Apparence** | Paramètres → Apparence | `PUT/DELETE /parametres/logo`, `PUT/DELETE /vitrine/fond` (SA), `GET /public/logo` | `vitrineService.modifierLogo`, `modifierFondVitrine` | Thème, couleur, police, menu réduit : propres au navigateur. Écran de moins de 900 px (tablette, téléphone) : menu toujours réduit aux icônes (`usePreferences`). **Logo et fond** : Super Admin seulement, enregistrés sur le serveur, les mêmes pour tous. Mobile : icônes et textes prennent leurs couleurs dans `palette` (jamais en dur) ; en mode sombre, la couleur principale est éclaircie (`ACCENT_SOMBRE` dans `constants/theme.ts`, comme `web/src/utils/theme.js`) et le texte posé dessus devient foncé (`onAccent`) |
| **Tableau de bord** | Web — Tableau de bord | `GET /dashboard/kpi`, `/evolution`, `/export-csv`, `/inscriptionParMois`, `/topInscription`, `/echeances`, `/formateurs/avis` | `dashboardService.*` (cache d'1 minute par période), `dashboardModel.getSituationEcheances` | **Filtre « Du … au … »** (`FiltreDates.jsx`, `?debut=&fin=` contrôlé par `utils/periode.js`) commun aux indicateurs, inscriptions par mois, formations les plus suivies, paiements à surveiller et avis sur les formateurs. Sous les cartes, barre « Détail du reste à encaisser » : à venir / à valider / en retard, chacun avec son montant et son nombre d'échéances (somme des montants = total). Barres des encaissements : montant au-dessus des barres non vides, libellé sur deux lignes sous l'axe (jour puis mois, ou mois puis année), évolution vs période précédente en vert / rouge ; nombre d'inscriptions sous chaque mois. Paiements à surveiller : retards puis J-2 en tête (5 lignes par couleur demandées au serveur, `?statut=&page=1&limite=5`, totaux de la pagination) ; « Filtres avancés » ouvre Échéances avec la même période. Export CSV |
| **Supports et commentaires** | Détail d'une formation et d'un support (mobile), onglet Documents (mobile), page Supports du formateur (web) | `?limite=5&avant=<id>` (curseur) ; `GET /supports?page=&limite=5` (recherche, filtres) | `lireCurseur`, `clauseCurseur`, `reponseCurseur` (`utils/pagination.js`) ; `commentaireService.listerFil` | Le serveur n'envoie que 5 éléments à la fois ; « Voir plus » demande la suite. Commentaires : la page compte les commentaires principaux, leurs réponses sont lues en **une** requête (`getReponses`). Un appel unique `GET /formations/:id/commentaires` remplace l'ancien appel par support |
| **Listes** | Étudiants, Paiements, Inscriptions, Échéances | `?page=&limite=&recherche=` | `utils/pagination.js` | 10 lignes par page (100 max), filtres faits par le serveur. Échéances : statut (à jour / J-2 / en retard) **et** dates « Du … au … » sur la date d'échéance, combinables (ex. en retard du X au Y), période gardée dans l'adresse ; Utilisateurs et Documents encore paginés dans le navigateur ; « Exporter CSV » = la liste filtrée sans `?page=`, plafonnée à 10 000 lignes par le serveur (message si coupée, `BoutonExportCSV.jsx`) ; formulaire Formation : seuls les formateurs sont chargés (`/utilisateurs?role=Formateur`) ; mobile : liste des formations « Voir plus » par 10 dans le téléphone |
| **Éléments désactivés** | Utilisateurs, Étudiants, Formations, Inscriptions, Échéances, Paiements, Documents (administratifs et supports) : filtre « État » | `?etat=actif\|inactif\|tous`, `DELETE /…/:id` (désactiver), `PUT /…/:id/reactiver` | `etatService.*`, `dependanceService.verifierInscription / verifierEcheance / verifierPaiement` | Actifs par défaut ; une ligne désactivée n'a qu'un bouton « Réactiver » (Super Admin). Badge orange (« Étudiant désactivé »…) sur une ligne dont un élément parent est désactivé : toute action dessus renvoie **409** avec ce qu'il faut réactiver. Réactivation refusée tant qu'un parent est désactivé (un support : sa formation ; un formateur ne réactive que ses supports) |
| **Montants** | Partout (web, mobile, PDF, e-mails, notifications) | — | `formatMontant` | « 3 160 000 Ar » : séparateur de milliers, arrondi à l'ariary ; les exports CSV gardent le nombre brut |

---

## 6. Ce que le serveur fait tout seul

| Quand | Quoi | Où |
|---|---|---|
| À chaque requête d'un étudiant | Le noter présent pour la journée | `verifyToken` → `presenceModel.marquerPresence` |
| Chaque minute | Annoncer les supports 1 h avant, puis les publier à l'heure | `supportProgrammeService.demarrerEnvoisProgrammes` |
| Chaque heure | Prévenir l'accueil des échéances à rappeler et des formations terminées (une seule fois chacune) | `alerteService.demarrerAlertesAutomatiques` |

---

## 7. Les règles à connaître avant de modifier le code

- **Droits** : chaque route dit qui y a droit (`roles(...)`, `staff`). Le menu du site (`web/src/utils/navigation.js`)
  ne fait que **masquer** des liens ; la vraie protection est dans l'API. Un étudiant ne voit que ses
  données (`exigerEtudiantProprietaire`).
- **Argent** : le montant d'un paiement étudiant est **imposé par le serveur**. Un paiement passe
  `en_attente` → `valide` / `refuse` **une seule fois**. Les montants se calculent en centimes.
- **Dates** : colonnes `DATETIME` en **heure locale de Madagascar** (UTC+3). Une expiration se calcule
  **dans MySQL** (`NOW()`, `DATE_ADD`), jamais dans Node. Les écrans affichent l'heure locale ; une date à
  00:00 s'affiche sans heure.
- **Tout ou rien** : ce qui va ensemble (compte + inscription + échéances + paiement) passe par `avecTransaction`.
- **Notifications** : toujours **après** l'enregistrement, dans un `try/catch`. Un e-mail en panne n'annule jamais une action.
- **Suppression** : on désactive (`etat = false`), on n'efface pas, et on peut réactiver (`PUT /…/:id/reactiver`,
  `services/etatService.js`). Toujours passer par `etatService` / `dependanceModel.changerEtat`, jamais par un
  `UPDATE … SET etat` direct : la même transaction écrit la ligne de `historique_etat` (quelle table, quel élément,
  dans quel sens, quand ; pas qui). Les listes ne montrent que les éléments actifs, sauf `?etat=inactif|tous`
  (personnel seulement : `utils/etat.js`). **Avant une action** sur une inscription, une échéance ou un paiement,
  appeler `dependanceService.verifierInscription / verifierEcheance / verifierPaiement` : 409 si l'élément, son
  échéance, son inscription, son étudiant ou sa formation est désactivé, avec un message qui dit quoi réactiver.
- **Montants** : toujours affichés avec `formatMontant` (« 3 160 000 Ar ») : `web/src/utils/format.js`,
  `mobile/src/utils/format.ts`, `backend-imtech/utils/format.js` (PDF, e-mails, notifications). Jamais « MGA »,
  jamais de `toLocaleString` à la main.
- **Icônes, pas d'emoji** : aucun emoji dans l'interface (web, mobile, PDF, e-mails, notifications), sauf les
  réactions 👍 ❤️ 💡 👎. Web : composant `web/src/components/icon/Icon.jsx` (`<Icon name="check" />` ; ajouter un
  tracé SVG si l'icône manque ; `className="icon-inline"` = icône à la taille du texte, dans une phrase ou un
  bouton). Mobile : `lucide-react-native` (`<Star size={11} color={palette.success} />`).
- **Couleurs (mobile)** : pas de couleur en dur pour une icône ou un texte : `palette.heading`, `textMuted`,
  `success`, `danger`, `warning`, `onAccent` (`const { palette } = useSettings()`), sinon invisible en mode sombre.
- **Retours à l'utilisateur (web)** : confirmation par `useRetour().confirmer({ titre, message, bouton, danger })`,
  jamais `window.confirm` ; réussite par `notifier('Étudiant ajouté')` (bandeau vert en bas de l'écran).
  Après une désactivation : `notifier('Étudiant désactivé', { annuler: () => reactiver(ligne) })` affiche
  un bouton **Annuler** pendant 7 s.
  Le message dit **sur quoi** porte l'action (nom de l'étudiant, de la formation…), avec des mots de tous
  les jours. Composants dans `web/src/components/retour/`, fournis à toute l'appli par `main.jsx`.
- **Fichiers** : servis par l'API avec contrôle des droits (`middlewares/fichierMiddleware.js`). Seuls
  `formations/` et `vitrine/` sont publics.
- **Schéma SQL** : modifier `alter.sql` (rejouable) **et** `base.sql`, puis exécuter `alter.sql`.
- **Tests** : `npm test` dans `backend-imtech` (`node --test`, `mock.method` pour simuler la base). Ajouter un
  test quand on touche une règle.

**Codes d'erreur** (`utils/errors.js`) :

| Code | Sens | Exemple |
|---|---|---|
| 400 | Demande mal remplie | Champ manquant, montant négatif, fichier trop lourd |
| 401 | Pas connecté | Token absent ou expiré, session fermée |
| 403 | Pas le droit | Mauvais rôle, données de quelqu'un d'autre |
| 404 | Introuvable | Paiement ou étudiant inexistant |
| 409 | Déjà fait, ou impossible dans l'état actuel | E-mail déjà utilisé, échéance déjà payée, inscription déjà validée, étudiant / formation / inscription désactivé |
| 429 | Trop d'essais | Connexions ratées, demandes de mot de passe, inscriptions en ligne |
| 500 | Imprévu | Message général ; le détail reste dans la console du serveur |

---

## 8. La base de données

Les colonnes qui commencent par `#` renvoient à une autre table.

```
ROLE (id_role, nom, etat)
UTILISATEUR (id_utilisateur, nom, prenom, email, mot_de_passe, photo, telephone, date_creation, #id_role, etat)
SESSIONS (id_session, #id_utilisateur, token, user_agent, ip, cree_le, expire_le, actif)
ETUDIANT (id_etudiant, #id_utilisateur, photo_1, photo_2, certificat_residence, photocopie_cin, etat)
FORMATION (id_formation, #id_utilisateur, nom, description, engagement_formateur, image, tarif, duree, duree_jours, etat)
INSCRIPTION (id_inscription, #id_etudiant, #id_formation, #id_utilisateur, date_inscription, valide, origine,
             note_suggeree, nb_presences, note_presentation, etat)
TRANCHE (id_tranche, code, nom, etat)
ECHEANCE (id_echeance, #id_inscription, #id_tranche, montant_prevu, date_echeance, genere_auto, date_dernier_rappel, etat)
MODE_PAIEMENT (id_mode_paiement, nom, etat)
PAIEMENT (id_paiement, #id_echeance, #id_mode_paiement, montant, date_paiement, reference_virement, statut, etat)
FACTURE (id_facture, #id_paiement, numero_facture, date_emission, fichier_pdf)
ATTESTATION (id_attestation, #id_inscription, uuid_verification, date_delivrance, fichier_pdf)
DOCUMENT_ADMINISTRATIF (id_document, #id_utilisateur, nom_document, fichier, date_creation, etat)
SUPPORT (id_support, #id_formation, #id_utilisateur, titre, contenu, fichier, statut, date_envoi_prevue,
         annonce_envoyee, date_publication, etat)
COMMENTAIRE (id_commentaire, #id_support, #id_parent, #id_etudiant, #id_utilisateur, contenu, date_commentaire, etat)
COMMENTAIRE_MENTION (id_mention, #id_commentaire, #id_etudiant_mentionne)
TYPE_REACTION (id_type_reaction, nom, icone, etat)
REACTION (id_reaction, #id_support, #id_utilisateur, #id_type_reaction, date_reaction)
PRESENCE (id_presence, #id_utilisateur, jour)
STATUT (id_statut, nom, etat)
ASSISTANCE (id_assistance, #id_etudiant, #id_utilisateur, #id_statut, objet, contenu, date_envoi, date_resolution, etat)
NOTIFICATION_INAPP (id_notification, #id_utilisateur, message, lu, date_creation, etat)
NOTIFICATION_EMAIL (id_notification_email, #id_utilisateur, email, contenu, date_creation)
ALERTE_ENVOYEE (id_alerte, type, id_reference, date_envoi)
RESET_PASSWORD (id_reset, #id_utilisateur, token, date_expiration, utilise, date_creation)
PARAMETRE_APPLICATION (cle, valeur, modifie_le)        -- fond_vitrine, logo
HISTORIQUE_ETAT (id_historique, table_origine, id_origine, actif, date_action)  -- id_origine sans clé étrangère : pointe vers 8 tables
```

La base refuse aussi certains doublons : une réaction par personne et par support, une présence par
personne et par jour, une alerte par sujet.

---

## 9. Pièges déjà rencontrés (à ne pas réintroduire)

| Piège | Ce qui a été fait |
|---|---|
| Une heure calculée par Node et comparée par MySQL : code ou session expiré dès sa création | Expirations calculées dans MySQL |
| Le site affichait les heures en UTC (3 h de retard) | Affichage dans le fuseau local (`web/src/utils/time.js`, `mobile/src/utils/format.ts`) |
| Une fonction du hook dans les dépendances d'un `useEffect` : rechargement à chaque frappe, saisie effacée | Dépendre de l'**id**, pas de la fonction (`ProfileModal.jsx`) |
| Mobile : `{ uri, name, type }` dans un FormData → « Unsupported FormDataPart implementation » | Envoyer un `File` d'`expo-file-system` |
| Pagination par OFFSET sur une liste qui reçoit des lignes en direct → doublons | Curseur par id (`avant` / `apres`) pour les notifications, puis pour les supports et commentaires |
| Supports et commentaires chargés en entier (le mobile faisait **un appel par support** pour les commentaires d'une formation) : de plus en plus lent avec le volume | Pagination par le serveur, 5 par 5 : curseur `(date, id)` + index `idx_support_formation_fil` et `idx_commentaire_fil` ; une seule route `GET /formations/:id/commentaires` |
| Page Échéances : la somme des paiements recalculée pour **toutes** les échéances avant de garder une page de 10 ; filtre couleur et alerte J-2 (`DATEDIFF`) sans index → toute la table lue à chaque affichage et chaque heure | Les 10 lignes de la page sont choisies d'abord (sous-requête `page`), les montants calculés ensuite ; filtres ROUGE / JAUNE / VERT et alerte écrits sur `date_echeance` seule ; index `idx_echeance_date` et `idx_paiement_echeance_somme` (somme lue dans l'index) — aucune colonne ajoutée |
| Tableau de bord sans période : les échéances relues 4 fois (reste, retards, détail) et toutes les sommes de paiements recalculées à chaque ouverture, pour chaque membre du personnel | Une seule lecture des échéances (`getSituationEcheances`) ; index `idx_paiement_encaisse`, `idx_inscription_date`, `idx_inscription_formation_date` (calculs faits dans l'index) ; résultats gardés 1 minute par période (`dashboardService`, demandes simultanées partagées) — chiffres identiques, vérifiés sur 5 périodes |
| Listes chargées en entier dans le navigateur : menu déroulant de **tous** les étudiants (Nouvelle inscription), de **tous** les comptes pour choisir un formateur, **toutes** les échéances de la période pour 5 lignes du tableau de bord, exports CSV sans limite | Recherche au serveur (`ChampRecherche.jsx`), `?role=Formateur`, 5 lignes par couleur + totaux, listes sans `?page=` plafonnées à 10 000 lignes (`clauseLimite` / `reponseListe`, `tronque: true`) |
| Barre d'onglets mobile à hauteur fixe : libellés coupés sous la barre système | Hauteur + marge du téléphone (`useSafeAreaInsets`) |
| Double clic ou deux employés en même temps | `UPDATE … WHERE statut = 'en_attente'` et contraintes d'unicité |
| L'adresse d'un fichier se confondait avec celle d'un support (`/api/supports/cours.pdf`) | Le serveur regarde d'abord si le fichier existe |
| Erreurs techniques montrées à l'utilisateur (« Failed to fetch », « Network request failed », « Erreur 500 », page HTML) | `apiRequest` (web et mobile) les remplace par une phrase en français |
| Boîte `window.confirm` du navigateur (« localhost:5173 indique… ») | Fenêtre de l'application : `useRetour().confirmer` |
| Montants bruts (« 3160000.02 ») et mélange « MGA » / « Ar » | `formatMontant` partout (§7) |
| PDF : `toLocaleString('fr-FR')` sépare les milliers par une espace fine que la police des PDF (Helvetica) n'affiche pas | Espace ordinaire dans `backend-imtech/utils/format.js` |
| Mobile : icônes bleu marine en dur, invisibles en mode sombre ; couleur principale foncée illisible sur fond sombre | Couleurs de `palette` ; `accentSombre()` dans `constants/theme.ts` |
| Formations : filtre « Inactif » toujours vide (l'API ne renvoyait que les formations actives) | Filtre « État » envoyé au serveur (`?etat=`) |
| `base.sql` échouait sur une base neuve (table `sessions` créée avant `utilisateur`, colonne `etat` ajoutée deux fois) : les dernières tables n'étaient jamais créées | `SET FOREIGN_KEY_CHECKS = 0` le temps de la création, doublon retiré ; vérifié sur une base vide le 26/10 |
| Accents abîmés (« envoy├® ») en chargeant un `.sql` avec le client `mysql` de XAMPP | `SET NAMES utf8mb4;` en tête de `donneesTest.sql`, ou `--default-character-set=utf8mb4` |
| Remplacement automatique dans plusieurs fichiers : des `import './X.css'` supprimés, pages sans style | Après un remplacement en masse : relire `git diff`, puis `npx vite build` |

---

## 10. Ce qu'il reste à faire

| Priorité | Manque | Piste |
|---|---|---|
| Haute | Vrai paiement en ligne | **MVola Merchant Pay** : plan détaillé dans [`paiement Mvola.md`](paiement%20Mvola.md) |
| Moyenne | Lecture des supports sans internet | Garder les supports sur le téléphone, protégés |
| Moyenne | Inscription en ligne sans vérifier l'e-mail | Code par e-mail (les pièces, elles, sont exigées avant la validation) |
| Moyenne | Avis sur les formateurs basé seulement sur les réactions | Questionnaire de fin de formation |
| Moyenne | Mobile : logo intégré à l'appli (pas le logo choisi par le Super Admin) | Lire `GET /public/logo` comme le site |
| Basse | Pas de notification quand l'appli est fermée | Notifications « push » |
| Basse | Présence = « a ouvert l'appli ce jour-là » ; jours fériés comptés | QR code en classe ; liste des jours fériés |
| Basse | L'accueil ne peut pas répondre par écrit à une demande d'aide | Réponse visible sur le téléphone |
| Basse | Installation à la main sur un seul serveur | Mise en ligne en HTTPS, vérifications automatiques à chaque modification |
