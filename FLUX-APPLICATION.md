# Imteaching Formation (IMTECH INFO) — Comprendre l'application (document de reprise)

> Nom de l'application (web et mobile) : **Imteaching Formation**, avec le logo IMTECH INFO. Il apparaît dans la barre latérale et la page de connexion (web), sur la connexion et la vitrine « Découvrir » (mobile), ainsi que dans les e-mails (objet, bandeau, signature, nom d'expéditeur) et les PDF (en-tête, pied de page, attestation, filigrane). La page de vérification d'attestation (QR code) et les messages d'erreur nomment encore l'organisme **IMTECH INFO**.

Ce document est écrit pour **quelqu'un qui découvre le projet** et doit le comprendre vite, **sans
chercher dans le code**. Chaque fonction importante est expliquée en mots simples, avec une
comparaison de la vie courante. Les 4 fonctions les plus importantes ont leur code commenté ligne par ligne.

**Programme en 2 jours**

| Quand | Lire | Ce que tu sauras après |
|---|---|---|
| Jour 1, matin | §1, §2, §3, puis `api.md` partie « Comprendre une route et ses `?` » | Qui utilise quoi, lancer le projet, le trajet d'un clic jusqu'à la base, lire une adresse comme `/paiements?statut=en_attente&page=2` |
| Jour 1, après-midi | §4 (parcours A → Z) | Toute la vie d'un étudiant : inscription, paiement, cours, note, attestation |
| Jour 2, matin | §5, §6, §7 | Les autres modules, ce que le serveur fait tout seul, les règles à ne jamais casser |
| Jour 2, après-midi | `SCENARIOS-TESTS.md`, en gardant §11 ouvert | Tester dans l'appli ce que tu as lu ; §11 pour retrouver une fonction (Ctrl+F) |
| Si besoin | §8, §9, §10 | Les tables, les pièges déjà rencontrés, ce qu'il reste à faire |

Autres documents (ils renvoient aux parties de celui-ci, « flux §N ») :

| Document | Contenu |
|---|---|
| [`backend-imtech/api.md`](backend-imtech/api.md) | Toutes les routes et leurs droits, exemples Postman |
| [`SCENARIOS-TESTS.md`](SCENARIOS-TESTS.md) | Un scénario par fonctionnalité, parcours de soutenance |
| [`CHEAT-SHEET.md`](CHEAT-SHEET.md) | Commandes, ajouter une fonctionnalité, requêtes SQL, dépannage |
| [`cheat-sheets/`](cheat-sheets/) | Syntaxe générale Node, React (+ React Native), MySQL |
| [`paiement Mvola.md`](paiement%20Mvola.md) | Prochaine évolution : paiement MVola |
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
| **Formateur** | Ses formations, ses cours (tout de suite ou à une heure choisie), la note de présentation |
| **Étudiant** (mobile) | Suit ses cours, commente, paie ses tranches, demande de l'aide |
| **Visiteur** (mobile) | Sans compte : voit les formations et s'inscrit en ligne |

---

## 2. Démarrer le projet

**Prérequis.** Node.js 18 ou plus, XAMPP (MariaDB), et Expo Go sur un téléphone **sur le même Wi-Fi** que le PC.

**Fichiers `.env`** (jamais dans git) :

| Dossier | Variables |
|---|---|
| `backend-imtech/.env` | `PORT`, `URL_BASE` (adresse du PC **avec `/api`**, imprimée dans le QR code), `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`gestion_formation_db`), `JWT_SECRET` (**obligatoire**, sinon le serveur refuse de démarrer), `APP_NAME`, `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail). Optionnel : contacts de la vitrine `IMTECH_SITE_WEB`, `IMTECH_FACEBOOK_URL`, `IMTECH_EMAIL`, `IMTECH_WHATSAPP`… (vides = vrais contacts d'IMTECH, dans `config/vitrine.js`) |
| `web/.env` | `VITE_URL_BASE=http://localhost:3000/api` |
| `mobile/.env` | `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:3000/api` (l'IP s'affiche au démarrage du serveur) |

**Base de données** (dans `backend-imtech/`) :

| Fichier | Rôle |
|---|---|
| `base.sql` | Crée toute la base, à jour |
| `alter.sql` | Changements de schéma pour une base existante : **rejouables** (`IF NOT EXISTS`…) et recopiés dans `base.sql` |
| `alter2.sql` | Anciennes évolutions, déjà appliquées : ne plus y toucher |
| `reinit.sql` / `donneesTest.sql` / `scripts/fichiersDemo.js` | Vider la base / données de démo / photos et cours de démo |

```bash
# Base neuve + démonstration
mysql -u root -e "CREATE DATABASE IF NOT EXISTS gestion_formation_db CHARACTER SET utf8mb4"
mysql -u root --default-character-set=utf8mb4 gestion_formation_db < backend-imtech/base.sql
mysql -u root < backend-imtech/donneesTest.sql
node backend-imtech/scripts/fichiersDemo.js

cd backend-imtech && npm install && npm run dev   # API sur http://localhost:3000/api
cd web            && npm install && npm run dev   # site sur http://localhost:5173
cd mobile         && npm install && npx expo start
cd backend-imtech && npm test                     # tests automatiques
```

**Comptes de démonstration** (mot de passe `admin123`) :
- Super Admin : `tljelia374@gmail.com`
- Accueil : `test123acceuil@gmail.com`
- Formateur : `tolojanaharyelia845@gmail.com`
- Étudiants : `prenom.nom@imtech.test` (ex. `andry.rakotoarisoa@imtech.test`)

Les données de démo ont des dates fixes (juillet → octobre 2026), prévues pour une démonstration le
26/10/2026 : un autre jour, certains statuts (retard, J-2) changent. Qui est qui : `SCENARIOS-TESTS.md`.

---

## 3. Comment le code est organisé

```
backend-imtech/
├── app.js              démarrage, fichiers protégés, gestion des erreurs, tâches automatiques
├── routes/routes.js    TOUTES les adresses /api/... (commence par là pour trouver une fonction)
├── middlewares/        les vigiles : connexion, rôle, fichiers reçus, limite d'essais, présence
├── controllers/        lisent la requête et répondent en JSON
├── services/           les RÈGLES du centre
├── models/             le SQL uniquement
├── utils/              outils : e-mails, PDF, QR code, filigrane, pagination, transaction, montants
├── config/             connexion MySQL, rôles, contacts de la vitrine, pièces du dossier
└── tests/              tests automatiques
web/src/      pages/ (un dossier par menu) · hooks/ (appels API) · components/ · utils/api.js
mobile/src/   app/ (un fichier = un écran) · hooks/ · components/ · context/ · utils/api.ts
```

### Le chemin d'un clic

```
Page (bouton) → hook → apiRequest() → route → middleware → controller → service → model → MySQL
```

**Comparaison : une lettre envoyée à l'administration.**

| Couche | Comme… | Son rôle |
|---|---|---|
| Page | Le formulaire papier | Affiche et réagit au clic |
| Hook | La personne qui poste la lettre | Appelle l'API et garde les données reçues pour l'affichage |
| `apiRequest` | L'enveloppe timbrée | Ajoute le badge (token), envoie, rapporte la réponse ; serveur muet → une phrase en français, jamais « Failed to fetch » |
| Route | L'adresse sur l'enveloppe | `POST /paiements` : quel guichet, et quels rôles y ont droit |
| Middleware | Le vigile à l'entrée | `verifyToken` : badge valide ? `checkRole` : droit d'entrer dans ce bureau ? |
| Controller | Le guichetier | Ouvre la lettre (`req.body` = formulaire, `req.params` = le `:id` de l'adresse, `req.query` = `?page=`), la passe au chef, renvoie la réponse |
| Service | Le chef qui connaît le règlement | Applique les règles ; refuse (`throw`) si une règle n'est pas respectée |
| Model | L'archiviste | Le seul qui touche aux armoires : SQL, toujours avec des `?` (protège de l'injection SQL) |
| MySQL | Les armoires | Les tables (§8) |

Toutes les réponses ont la même forme : `{ status: 'success', data }` ou `{ status: 'error', message }`.
Une erreur levée par un service (`badRequest`, `notFound`, `conflict`… dans `utils/errors.js`) est
transformée en réponse à un seul endroit, à la fin de `app.js`.

### Les mots de syntaxe à connaître

| Syntaxe | Ce que ça veut dire |
|---|---|
| `async` / `await` | « Attends la réponse (de la base, d'un e-mail…) avant de continuer » |
| `const { email } = req.body` | Sortir un champ d'un objet en une ligne |
| `const [premiere] = liste` | Prendre le 1ᵉʳ élément d'une liste |
| `{ ...donnees, date }` | Copier un objet et y ajouter un champ |
| `a ? b : c` | Si `a`, alors `b`, sinon `c` |
| `throw conflict('…')` | Arrêter tout et renvoyer une erreur (ici 409) |
| `Promise.all([...])` | Lancer plusieurs demandes **en même temps** |
| `useState` | Donnée affichée à l'écran ; la changer réaffiche la page |
| `useEffect` | Lancer du code quand la page s'ouvre (ou quand une valeur change) |

---

## 4. Le parcours A → Z : de l'inscription à l'attestation

On suit **Andry**, un étudiant. Chaque étape donne : qui, la page, le bouton, la route, la fonction
principale **en clair**, et ce qu'il faut savoir pour les scénarios.

### Étape 1 — Andry découvre les formations (mobile, sans compte)

| | |
|---|---|
| **Page** | Mobile, écran **Découvrir** (`decouvrir.tsx`) |
| **Route** | `GET /public/vitrine` (publique, sans connexion) |
| **Fonction** | `vitrineService.contenuVitrine` |

**En clair : `contenuVitrine()`** prépare la vitrine du magasin. Elle va chercher **en même temps** les 5
premières formations, l'avis des étudiants sur chaque formateur (« Compétent », « Non compétent »,
« Pas assez d'avis »), les modes de paiement et l'image de fond. *Comme envoyer quatre personnes faire
quatre courses en parallèle.*

À savoir :
- Les carrousels chargent la suite **5 par 5** en glissant (`GET /public/formations?page=2`).
- Section « Nous contacter » : site web, Facebook, e-mail d'IMTECH (`config/vitrine.js`).

### Étape 2 — Andry s'inscrit en ligne

| | |
|---|---|
| **Page** | Découvrir → il coche des formations → fenêtre d'inscription |
| **Bouton** | **« Envoyer mon inscription (n) »** (actif seulement si les Conditions sont acceptées) |
| **Envoyé** | Nom, prénom, e-mail, téléphone, mot de passe (deux fois), formations + nombre de tranches, mode de paiement, référence |
| **Route** | `POST /public/inscriptions` (publique, **5 par heure** par appareil) |
| **Fonction** | `vitrineService.inscriptionEnLigne` |
| **Tables remplies** | utilisateur, etudiant, inscription, echeance, paiement (`en_attente`), notification |

**En clair : `inscriptionEnLigne(demande)`** fait toute l'inscription, **tout ou rien**.
1. Contrôle le formulaire : champs remplis, mots de passe identiques, 1 à 4 tranches par formation.
2. **Hache** le mot de passe (`bcrypt`) : la base garde une empreinte, jamais le mot de passe.
   *Comme une empreinte digitale : on vérifie qu'elle correspond, on ne retrouve pas le doigt.*
3. Dans **une transaction** : crée le compte + le dossier, puis pour **chaque** formation : l'inscription,
   ses tranches, et le 1ᵉʳ paiement « en attente » (l'Accueil vérifiera l'argent).
   *Une transaction, c'est comme un virement bancaire : soit tout passe, soit rien.*
4. **Après** seulement : notification à l'Accueil, e-mail d'accusé de réception à Andry. Gmail en
   panne → l'inscription reste faite.

**Le code, ligne par ligne :**
```js
// avecTransaction(...) ouvre une transaction et nous donne `connection`.
// Tout ce qui est fait avec `connection` est validé ENSEMBLE à la fin, ou annulé ensemble.
const resultat = await avecTransaction(async (connection) => {

  // 1. Crée la ligne `utilisateur` (le compte) et la ligne `etudiant` (le dossier).
  const id_etudiant = await etudiantModel.insertUtilisateurEtEtudiant(connection, { … });

  // 2. « Pour chaque formation cochée » ; on sort directement ses deux champs.
  for (const { id_formation, nombre_tranches } of formations) {

    // Crée l'inscription + ses tranches. `origine: 'en_ligne'` = l'Accueil saura qu'elle vient du mobile.
    const id_inscription = await inscriptionService.creerInscriptionDans(connection, { … origine: 'en_ligne' });

    // Relit les tranches créées ; `[premiere]` garde seulement la 1ʳᵉ.
    const [premiere] = await echeanceModel.getEcheancesByInscription(id_inscription, connection);

    // Le 1er paiement déclaré par l'étudiant, EN ATTENTE de vérification par l'Accueil.
    await paiementModel.insererPaiement({ id_echeance: premiere.id_echeance, statut: EN_ATTENTE, … }, connection);
  }

  return { id_etudiant, id_utilisateur, inscriptions };
});
// Si une ligne au-dessus lève une erreur (ex. déjà inscrit à une formation), RIEN n'est enregistré.
```

**Les tranches : `calculerEcheancier()`** découpe le prix. Exemple : 300 000 Ar, 90 jours, 3 tranches →
100 000 Ar à J+30, J+60, J+90. Calcul **en centimes** (les ordinateurs se trompent sur les virgules) ; la
**dernière tranche** prend les centimes qui restent pour que le total tombe juste.

À savoir pour les scénarios :
- **Le dossier** (4 pièces : 2 photos, CIN, certificat de résidence) : Andry les joint tout de suite ou
  plus tard depuis **⋮ → Mon dossier**. L'Accueil est prévenu à chaque dépôt.
- **Au guichet** : l'Accueil fait la même chose sur le web (Étudiants → Nouveau dossier, puis
  Inscriptions → Nouvelle inscription). Même fonction `creerInscriptionDans`.
- **Déjà inscrit qui veut une autre formation** : onglet Formations → « Voir plus de formations et
  s'inscrire ». Seules les formations qu'il ne suit pas sont proposées ; pas de nouveau compte.

### Étape 3 — L'Accueil valide l'inscription (site web)

| | |
|---|---|
| **Page** | Web, **Inscriptions** (les non validées en premier) |
| **Bouton** | **« Valider »** → fenêtre de paiement (mode, référence) |
| **Route** | `POST /inscriptions/:id/valid` (Super Admin, Accueil) |
| **Fonction** | `inscriptionService.validerInscription` |

**En clair : `validerInscription()`** — *un tampon « validé » sur le dossier.*
1. Vérifie que rien n'est désactivé (étudiant, formation, inscription).
2. **Inscription en ligne** : refusée (409) tant que le dossier n'a pas ses 4 pièces.
   **Inscription au guichet** : jamais bloquée, mais la fenêtre prévient « Dossier incomplet (2/4) »
   et le bouton devient « Valider quand même ».
3. Tamponne l'inscription « validée ». Le SQL ne change la ligne que si elle n'est **pas encore**
   validée (`WHERE … AND valide = false`) : un double clic donne 409, jamais deux validations.
4. Le 1ᵉʳ paiement : déclaré sur le mobile → il est **validé** ; au guichet → il est **créé** « validé ».
5. Après coup, sans faire attendre l'employé : fiche d'inscription PDF + facture envoyées à Andry.

**Refuser une inscription ?** Pas de bouton « Refuser » : on la **désactive** (cachée, pas effacée,
réactivable). Aucun message automatique : l'Accueil prévient l'étudiant par la page Notifications.

### Étape 4 — Andry se connecte (mobile)

| | |
|---|---|
| **Page** | Mobile, **Connexion** |
| **Route** | `POST /auth/login` |
| **Fonction** | `authService.authentifier`, puis `verifyToken` à chaque requête |

**En clair : `authentifier()`** — *l'accueil d'un hôtel qui donne une carte-clé.*
1. Cherche le compte **actif** par e-mail.
2. Compare le mot de passe à l'empreinte (`bcrypt.compare`). Faux mot de passe ou e-mail inconnu :
   **même réponse**, pour ne pas dire à un pirate quels e-mails existent.
3. Fabrique le **token** (`jwt.sign`) : la carte-clé, valable 24 h, signée avec `JWT_SECRET`.
4. Note une **session** en base : *la carte est inscrite au registre de l'hôtel*, on peut la
   désactiver à distance (« Se déconnecter partout »).
5. 5 essais ratés sur un compte (ou 20 depuis un appareil) en 15 min → bloqué 15 min (429).

**Le code, ligne par ligne :**
```js
// Cherche parmi les comptes ACTIFS : un compte désactivé est traité comme un e-mail inconnu.
const user = await userModel.findUserByEmail(email);
if (!user) return null;               // null = « identifiants incorrects » (le controller répond 401)

// bcrypt refait l'empreinte du mot de passe tapé et la compare à celle de la base.
const isMatch = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
if (!isMatch) return null;            // même réponse que l'e-mail inconnu : aucun indice

// Pour un étudiant, on retient aussi l'id de son dossier (mis dans le token).
const id_etudiant = user.role_nom === ROLES.ETUDIANT
  ? await etudiantModel.getIdEtudiantByUtilisateur(user.id_utilisateur)
  : null;

// Le token contient { qui, quel rôle, quel dossier }, signé avec le secret du .env, valable 24 h.
const token = jwt.sign(
  { id: user.id_utilisateur, role: user.role_nom, id_etudiant },
  process.env.JWT_SECRET,
  { expiresIn: `${DUREE_SESSION_HEURES}h` }     // `${...}` met la valeur dans le texte : '24h'
);

// La session en base : appareil, IP, expiration (calculée par MySQL).
await userModel.createSession(user.id_utilisateur, token, userAgent, ip, DUREE_SESSION_HEURES);

return { token, user: { id: user.id_utilisateur, nom: user.nom, role: user.role_nom, id_etudiant, … } };
```
L'appli garde le token et l'envoie à chaque requête (`Authorization: Bearer <token>`).

**Ensuite, à chaque requête : `verifyToken`** — *le lecteur de carte de chaque porte.* Il vérifie la
signature du token, vérifie au registre que la session est encore active, puis range la personne dans
`req.user` : le service sait ainsi **qui** demande. `checkRole` refuse (403) un rôle non autorisé.

À savoir :
- **Conditions d'utilisation** : à la 1ʳᵉ connexion, l'étudiant doit les accepter (« Je refuse » =
  déconnexion). L'accord est gardé sur le téléphone ; relecture : ⋮ → « Conditions et confidentialité ».
  Texte dans `mobile/src/constants/conditions.ts` : s'il change, augmenter `VERSION_CONDITIONS`
  (actuellement `'2'`) pour redemander l'accord à tout le monde.
- **Mot de passe oublié** : un code par e-mail, valable 30 min, utilisable une fois.

### Étape 5 — Andry paie, l'Accueil valide, la facture part toute seule

| | |
|---|---|
| **Page (mobile)** | **Paiements** → bouton **« Payer X Ar »** → choix du mode |
| **Route** | `POST /paiements` (sans montant : c'est le serveur qui le fixe) |
| **Page (web)** | **Paiements** → **« Valider »** ou **« Refuser »** |
| **Routes** | `PUT /paiements/:id/valider`, `PUT /paiements/:id/refuser` |
| **Fonctions** | `paiementService.enregistrerPaiement`, `traiterPaiementEnAttente`, `envoyerFactureAuto` |

**En clair : `enregistrerPaiement()`** — *la caisse affiche elle-même le montant : le client ne tape pas le prix.*
1. Vérifie que la tranche est **bien celle de l'étudiant connecté** (sinon 403).
2. Calcule le **reste à payer** ; déjà réglée → 409.
3. Un paiement déjà « en attente » sur cette tranche → 409 (pas de double déclaration).
4. Enregistre le paiement **en attente** et prévient l'Accueil.
5. Le tout en **verrouillant la tranche** : *comme un ticket de file d'attente, deux paiements
   simultanés passent l'un après l'autre.*

**Le code, ligne par ligne :**
```js
// MySQL renvoie les montants en texte ('150000.00') : Number(...) les remet en nombres.
// montant_valide = somme des paiements déjà validés sur cette tranche.
const resteAPayer = Number(echeance.montant_prevu) - Number(echeance.montant_valide);
if (resteAPayer <= 0) throw conflict('Cette échéance est déjà réglée.');            // 409

// `auteur` = l'étudiant connecté (rempli par verifyToken). `!==` = « différent de ».
if (Number(echeance.id_etudiant) !== Number(auteur.id_etudiant)) throw forbidden('…'); // 403

// Un paiement de cette tranche attend déjà l'Accueil ?
if (Number(echeance.nb_en_attente) > 0) throw conflict('Un paiement est déjà en attente…');

// Le montant vient du SERVEUR (resteAPayer), jamais du téléphone : impossible de « payer » 1 Ar.
await paiementModel.insererPaiement({ id_echeance, montant: resteAPayer, statut: EN_ATTENTE, … });
```

**En clair : `traiterPaiementEnAttente()`** (derrière « Valider » et « Refuser »). Le SQL ne change le
paiement que s'il est encore `en_attente` : *même si deux employés cliquent en même temps, un seul
passe.* L'agent qui a traité est retenu, et Andry est prévenu.

À savoir pour les scénarios :
- **Validé** → la **facture part toute seule** (PDF + notification + e-mail), sans faire attendre
  l'employé. Une facture par paiement ; le bouton **Facture** ne fait plus que l'ouvrir.
- **Refusé** → Andry reçoit « Votre paiement … a été refusé. Contactez l'accueil. » ; la tranche
  redevient payable.
- **Au guichet** (web : Échéances → Payer) : le paiement est validé tout de suite, un paiement partiel
  est accepté.
- **Un paiement facturé** ne se désactive plus, son montant et son mode sont figés.
- **Modifier une échéance** (web : Échéances → **Modifier**, **Super Admin seulement**) : nouvelle date
  et/ou nouveau montant (`echeanceService.planifierModification`, puis `modifierEcheance`).
  *Comme décaler un rendez-vous : on peut déplacer ou réduire une tranche, mais le prix total ne change pas.*
  - La **différence de montant** est reportée sur la **dernière autre échéance non réglée** (la plus
    lointaine), dans la même transaction : le total dû reste égal au tarif. Ex. 3 × 100 000 Ar, la
    2ᵉ passe à 80 000 → la 3ᵉ passe à 120 000.
  - Refusé : échéance **déjà réglée** (validé + en attente ≥ prévu) → 409 ; montant ≤ 0 ou **inférieur à
    ce que l'étudiant a déjà payé** → 400 ; l'autre échéance tomberait sous 1 Ar (ou sous ce qu'elle a
    déjà reçu) → 400 avec le **montant maximal** ; aucune autre échéance non réglée → 409 (la date
    seule reste modifiable).
  - Les échéances modifiées passent `genere_auto = false`. Andry reçoit une **notification + un e-mail**
    « Modification de votre échéancier » (ancienne et nouvelle échéance, et le report).

### Étape 6 — Les rappels : le serveur alerte l'Accueil, l'Accueil rappelle l'étudiant

| | |
|---|---|
| **Déclenché par** | Le serveur, chaque heure : `alerteService.verifierAlertes` |
| **Page (web)** | **Échéances** : vert « À jour », jaune « À rappeler » (J-2), rouge « En retard » ; bouton **« Rappeler »** ; bouton **« Modifier »** (Super Admin, étape 5) |

**En clair : `verifierAlertes()`** — *un réveil qui sonne chaque heure et regarde le calendrier.* Il liste
les tranches à J-2 pas encore réglées et envoie **une seule** notification groupée à l'Accueil. Chaque
alerte est notée dans `alerte_envoyee`, où elle est **unique** : jamais envoyée deux fois.

C'est ensuite l'Accueil qui prévient Andry, avec le bouton **« Rappeler »** (notification + e-mail).

**Pourquoi le rappel à l'étudiant n'est pas automatique ?** C'est un choix, pas un oubli. L'Accueil sait
des choses que le serveur ignore : un paiement en espèces annoncé, un délai accordé, un étudiant déjà
appelé au téléphone. Un rappel automatique pourrait relancer quelqu'un qui est en règle. Le système
**détecte et alerte** (notification à J-2, couleur jaune puis rouge), l'humain **décide**.

| Qui | Automatique ? | Quoi |
|---|---|---|
| Serveur → Accueil | **Oui**, chaque heure, une seule fois par tranche | « X étudiants doivent être rappelés » |
| Accueil → étudiant | **Non**, bouton « Rappeler » (une ligne ou plusieurs lignes sélectionnées) | Notification sur le mobile + e-mail |

### Étape 7 — Le formateur publie un cours, Andry le lit

| | |
|---|---|
| **Page (web, formateur)** | **Supports** → formulaire **« Publier un support »** (titre, texte, un ou plusieurs fichiers, heure d'envoi facultative) |
| **Route** | `POST /supports` |
| **Fonction** | `supportService.creerSupports` |
| **Page (mobile)** | Onglet **Formations** → une formation → ses cours (5 par 5) → lecteur |

**En clair : `creerSupports()`** — *le formateur dépose un cours dans le casier de la classe, tout de
suite ou à une heure choisie.*
- Refuse si ce n'est pas **sa** formation (403). Il faut un texte ou un fichier.
- **Plusieurs fichiers** (10 au plus, choisis ensemble) → **un cours par fichier**, avec le même texte et la
  même heure d'envoi. Titre : « Titre — nom du fichier » (ou seulement le nom du fichier sans titre).
  Si la demande est refusée (formation d'un autre, plus de 10 fichiers…), les fichiers reçus sont supprimés.
- **Sans heure** : les inscrits sont prévenus tout de suite. **Avec une heure** : le serveur (chaque
  minute) les prévient 1 h avant, puis publie à l'heure. Avant ça, le formateur peut modifier le
  brouillon ou cliquer « Envoyer maintenant ».

À savoir :
- Le texte est nettoyé : aucun script caché ne peut passer.
- Le PDF ou l'image ouvert par Andry porte en **filigrane son nom et son e-mail** (dissuade le partage).
- Un étudiant ne voit les cours que si son inscription est **validée**.
- Sur un cours : **commenter**, **répondre**, **réagir** (👍 ❤️ 💡 👎). Le formateur peut **mentionner** un
  étudiant avec `@`. Les réactions servent à l'avis sur les formateurs.

### Étape 8 — La présence et la note d'attestation

| | |
|---|---|
| **Présence** | Andry est **présent** un jour où il ouvre un cours, réagit ou commente (une ligne par jour). Ouvrir l'appli ne suffit pas |
| **Page (web, formateur)** | **Accueil formateur** : classement + champ **note de présentation** |
| **Routes** | `GET /formations/:id/classement` ; `PUT /inscriptions/:id/note` |
| **Fonctions** | `classementService.calculerClassement`, `definirNote` |

**La note d'attestation sur 20 = note système /10 + présentation /10.**

| Partie | Comment |
|---|---|
| **Présence** (jours présents / jours de cours lundi-vendredi déjà passés) | ≥ 90 % → 0 · 75-90 % → −1 · 50-75 % → −2 · < 50 % → −4 |
| **Paiement**, par tranche | payée à la date → 0 · payée en retard → −1 · non réglée → −2 · au plus −4 en tout |
| **Note système** | 10 moins les malus, jamais sous 0 |
| **Présentation** | 0 à 10, donnée par le formateur |

Exemple : présence 80 % (−1) + une tranche payée en retard (−1) → 8/10 ; présentation 7 → **15/20**.
C'est la **date du paiement** qui compte (pas sa validation) ; un paiement refusé est ignoré.

**En clair : `calculerClassement()`** — *le bulletin calculé tout seul* : il applique ces malus à chaque
étudiant, ajoute la présentation, et trie du meilleur au moins bon.

**En clair : `definirNote()`** — le formateur saisit la présentation : « 7,5 » accepté, hors 0-10 refusé
(400). Seul le formateur **de cette formation** (ou le Super Admin). Après l'attestation, la note est
**figée** (409) : *on ne corrige pas un diplôme déjà imprimé.*

### Étape 8b — Andry décroche : l'Accueil le relance

| | |
|---|---|
| **Page (web)** | **Tableau de bord**, carte **« Étudiants à risque de décrochage »**, bouton **« Relancer »** ; sélection multiple → « Relancer » groupé (une requête par étudiant, ceux relancés il y a moins de 3 jours ignorés) |
| **Routes** | `GET /decrochage?page=&limite=10&recherche=&niveau=` (10 par page, les plus urgents d'abord ; filtre à contacter / à surveiller ; compteurs sur toute la liste) ; `POST /inscriptions/:id/relancer` |
| **Fonctions** | `decrochageService.listerPageARisque` (classe tout, puis filtre par niveau, recherche et découpe), `listerEtudiantsARisque`, `relancer` |

**Score sur 6**, trois critères notés 0, 1 ou 2 :

| Critère | 0 | 1 | 2 |
|---|---|---|---|
| Assiduité (10 derniers jours de cours) | ≥ 75 % | 50-74 % | < 50 % |
| Silence (jours sans ouvrir un cours) | < 7 | — | ≥ 7 |
| Tranches en retard | 0 | 1 | 2 ou plus |

2-3 = « à surveiller », 4-6 = « à contacter ». Exemple : venu 4 jours sur 10 (2) + rien ouvert depuis 8
jours (2) = 4 → « à contacter ». *Comme un voyant moteur : il ne juge pas, il prévient qu'il faut regarder.*

À savoir :
- Ce n'est **pas** la note : la note juge toute la formation, le risque regarde **maintenant**.
- Jamais montré à l'étudiant, jamais stocké, jamais une sanction. Pas de jugement avant 5 jours de cours.
- **Pas décrit dans les conditions de l'application**, par choix : la politique de confidentialité dit
  seulement que l'équipe suit l'activité pour accompagner l'étudiant et peut le contacter. Les critères
  et les seuils restent internes : un étudiant qui les connaîtrait pourrait ouvrir un cours tous les
  6 jours juste pour ne pas être repéré. À l'inverse, les règles de la **note** sont détaillées, car
  elle figure sur l'attestation : l'étudiant doit pouvoir la vérifier.
- L'Accueil est prévenu une fois (tâche horaire). « Relancer » : au plus une fois tous les 3 jours,
  message bienveillant sans le mot « risque ».

### Étape 8c — Andry commente son formateur ; la note du formateur

| | |
|---|---|
| **Déclenché par** | À partir de **J-2 avant la fin**, Andry est prévenu, puis relancé **chaque jour** |
| **Page (mobile)** | Onglet **Formations** : carte « à commenter » → écran du commentaire |
| **Page (web)** | **Formateurs** (SA, Accueil) : ce qui reste, puis noter chaque commentaire sur 10 |
| **Fonctions** | `formateurNoteService.commenter`, `noterCommentaire`, `classementFormateurs` |

**En clair : `commenter()`** — *la fiche d'évaluation de fin de stage, remise à la direction et pas au
professeur.* Un seul commentaire par inscription, pas avant J-2. Il va à l'Accueil et au Super Admin,
**jamais au formateur**. Puis, si tout le reste est prêt, **l'attestation part tout de suite**.

**La note du formateur sur 20** = réactions /10 (% de réactions positives ÷ 10, à partir de 5 réactions)
+ commentaires /10 (moyenne des notes données par l'Accueil). La partie commentaires ne compte que quand
**tous** les étudiants ont commenté et que **tous** les commentaires sont notés ; sinon le tableau de bord
affiche « x/y commentés » ou « n à noter ». Exemple : 85 % positives (8,5) + commentaires à 7 → 15,5/20.

Un étudiant qui a abandonné : désactiver son inscription, il n'est plus attendu.

### Étape 9 — L'attestation

| | |
|---|---|
| **Prête quand** | Formation terminée + tout payé + note de présentation + commentaire sur le formateur |
| **Automatique** | Envoyée **toute seule** : dès le commentaire d'Andry, ou par la tâche horaire |
| **À la main (web)** | **Inscriptions** → bouton **« Attestation »** (`POST /attestations/:id_inscription/envoyer`) |
| **Vérification** | Le QR code ouvre `GET /verification/:uuid` (public) : page « Attestation authentique » ou « Document non reconnu » |
| **Fonctions** | `documentService.creerAttestation`, `envoyerAttestation`, `verifierAuthenticite` |

**En clair : `creerAttestation()`** — *l'imprimerie du diplôme.*
1. Déjà créée → la renvoie telle quelle (une seule par inscription).
2. **Recalcule la note juste avant** l'impression.
3. Sans note de présentation ou sans commentaire → 409.
4. Tire un identifiant **impossible à deviner** (uuid), en fait un QR code, dessine le PDF.
   *Comme le numéro de série d'un billet : on vérifie auprès de la banque qu'il existe.*

**Le code, ligne par ligne :**
```js
// Recalcule les notes de toute la formation, pour imprimer la note à jour.
await classementService.actualiserClassement(inscription.id_formation);

// Lit tout ce qu'il faut imprimer : nom, formation, durée, notes...
const donnees = await documentModel.findInscriptionPourAttestation(id_inscription);

// `=== null` : case vide en base -> le formateur n'a pas noté -> 409.
if (donnees.note_presentation === null) throw conflict("Le formateur n'a pas encore attribué la note…");

// Identifiant aléatoire (ex. 'f47ac10b-58cc-4372-a567-0e02b2c3d479') : impossible à deviner.
const uuid = crypto.randomUUID();

// Image du QR code contenant l'adresse de vérification (URL_BASE vient du .env).
const qrBuffer = await genererQRCodeBuffer(`${URL_BASE}/verification/${uuid}`);

// Dessine le PDF avec une copie des données + la date du jour. Renvoie 'documents/xxx.pdf'.
const cheminRelatif = await genererAttestationPDF({ ...donnees, date_delivrance: new Date() }, qrBuffer, nomFichier);
```

**En clair : `envoyerAttestation()`** — crée l'attestation puis prévient Andry : notification **toujours**,
puis e-mail avec le PDF. Si l'e-mail échoue, l'attestation reste créée et la page affiche « e-mail non envoyé ».

À savoir : dès qu'une attestation existe, l'inscription apparaît **« Réussie »** (badge et filtre sur le
web, badge sur le mobile). Rien n'est enregistré en plus : c'est calculé par la requête.

### Le parcours en une ligne par étape

| # | Qui | Où | Fonction principale |
|:-:|---|---|---|
| 1 | Visiteur | Mobile — Découvrir | `contenuVitrine` |
| 2 | Visiteur | Mobile — Inscription | `inscriptionEnLigne` (transaction) |
| 3 | Accueil | Web — Inscriptions « Valider » | `validerInscription` |
| 4 | Étudiant | Mobile — Connexion | `authentifier` + `verifyToken` |
| 5 | Étudiant puis Accueil | Mobile — Payer / Web — Paiements « Valider » | `enregistrerPaiement`, `traiterPaiementEnAttente` (facture automatique) |
| 6 | Serveur | Chaque heure | `verifierAlertes` |
| 7 | Formateur puis Étudiant | Web — Publier / Mobile — Formations | `creerSupports` |
| 8 | Serveur + Formateur | Automatique / Web — note | `calculerClassement`, `definirNote` |
| 8b | Serveur puis Accueil | Tableau de bord « Relancer » | `listerEtudiantsARisque`, `relancer` |
| 8c | Étudiant puis Accueil | Mobile — Commenter / Web — Formateurs | `commenter`, `noterCommentaire` |
| 9 | Serveur (ou Accueil) | Automatique / Web — « Attestation » | `creerAttestation`, `envoyerAttestation` |

Cas de refus : inscription → « Désactiver » (étape 3) ; paiement → « Refuser » (étape 5).

---

## 5. Les autres modules, en bref

| Module | Où | Ce qu'il faut savoir |
|---|---|---|
| **Comptes** | Web — Utilisateurs (Super Admin) | Seul le SA crée un compte du personnel ou change un rôle. Désactiver un compte ferme toutes ses sessions |
| **Mon profil** | Web — fenêtre Profil ; mobile — Profil | Nom, téléphone, photo |
| **Dossiers étudiants** | Web — Étudiants | 4 pièces obligatoires ; l'étudiant les dépose ou remplace depuis le mobile (⋮ → Mon dossier), l'Accueil est prévenu |
| **Formations** | Web — Formations | Un formateur ne voit que les siennes ; image de couverture visible dans la vitrine, le tableau et la fiche |
| **Documents** | Web — Documents | Documents administratifs du personnel + fichiers des cours. PDF créés par le serveur (fiche, facture, attestation) |
| **Commentaires et avis** | Sous chaque cours (web et mobile) | Avis sur un formateur : « Compétent » si ≥ 60 % de réactions positives sur au moins 5 |
| **Notifications** | Cloche (web), onglet Notifications (mobile) | Les 10 dernières, les nouvelles arrivent toutes les **10 s**, bouton « précédentes » |
| **Assistance** | Mobile — Assistance ; web — Assistance | L'étudiant écrit, l'Accueil clique « Résoudre », l'étudiant est prévenu |
| **Recherche** | En-tête (web : Ctrl+K ; mobile : loupe) | 2 lettres minimum ; chacun ne trouve que ce que son rôle a le droit de voir |
| **Sessions** | Paramètres → Sécurité | Liste des appareils connectés, « Se déconnecter partout », changer le mot de passe. Le site et l'appli revérifient la session chaque minute |
| **Apparence** | Paramètres → Apparence | Thème, couleur, police : propres au navigateur. **Logo et fond de la vitrine** : Super Admin seulement, les mêmes pour tous. Écran < 900 px : menu réduit aux icônes |
| **Tableau de bord** | Web — Tableau de bord | 3 parties : **À traiter aujourd'hui** (étudiants à risque), **Activité du centre** (filtre « Du … au … », indicateurs, reste à encaisser, paiements à surveiller, graphiques), **Formateurs** (classement sur 20). Export CSV. Chiffres gardés 1 minute en mémoire |
| **Risque de décrochage** | Tableau de bord | Voir §4 étape 8b |
| **Formateurs** | Web — Formateurs (SA, Accueil) | Ce qui reste avant la note de chaque formateur (étudiants pas encore commentés, commentaires à noter), puis la notation sur 10. Ne pas confondre avec `pages/formateur/` (l'espace du formateur) |
| **Supports et commentaires** | Mobile et web | Chargés **5 par 5** (« Voir plus ») |
| **Listes** | Étudiants, Paiements, Inscriptions, Échéances | 10 lignes par page, recherche et filtres faits par le serveur. Échéances : filtre couleur **et** dates combinables. Export CSV = la liste filtrée, 10 000 lignes au plus |
| **Éléments désactivés** | Toutes les listes : filtre « État » | Voir §7 « Suppression ». Badge orange quand un élément parent est désactivé ; toute action dessus → 409 qui dit quoi réactiver |
| **Montants** | Partout | Toujours « 3 160 000 Ar » (`formatMontant`) ; les exports CSV gardent le nombre brut |

---

## 6. Ce que le serveur fait tout seul

| Quand | Quoi | Fonction |
|---|---|---|
| Quand un étudiant ouvre un cours, réagit ou commente | Le noter présent pour la journée | `presenceSurCours` → `marquerPresence` |
| Chaque minute | Annoncer les cours programmés 1 h avant, puis les publier à l'heure | `supportProgrammeService.verifierSupportsProgrammes` |
| Chaque heure | Rappels J-2 à l'Accueil ; étudiants passés « à contacter » ; demande et relance du commentaire sur le formateur ; envoi des attestations prêtes ; note de présentation manquante signalée au formateur | `alerteService` : `verifierAlertes`, `signalerDecrochages`, `demanderCommentaires`, `verifierAttestations` |
| Chaque jour | Ménage : sessions expirées depuis plus de 180 jours, codes « mot de passe oublié » périmés, notifications supprimées depuis plus de 30 jours | `purgeService.purger` |

Les tâches démarrent avec le serveur (`app.js`). Une erreur est écrite dans la console mais n'arrête
jamais le serveur : *comme un employé qui note l'incident dans le cahier et continue sa tournée.*

---

## 7. Les règles à connaître avant de modifier le code

- **Droits** : chaque route dit qui y a droit. Le menu du site ne fait que **cacher** des liens ; la vraie
  protection est dans l'API. Un étudiant ne voit que **ses** données.
- **Argent** : le montant d'un paiement étudiant est **imposé par le serveur**. Un paiement passe
  `en_attente` → `valide` / `refuse` **une seule fois**. Les montants se calculent en centimes.
  Toute opération qui dépend du reste à payer **verrouille la tranche** (`verrouillerEcheance`) dans une transaction.
- **Agent d'un paiement** : `paiement.id_utilisateur` retient qui l'a saisi, validé ou refusé.
- **Paiements facturés** : pas de désactivation, montant et mode figés. Pas d'avoir : une erreur sur un
  paiement facturé se règle hors application.
- **Dates** : heure de Madagascar. Une expiration se calcule **dans MySQL** (`NOW()`), jamais dans Node.
- **Tout ou rien** : ce qui va ensemble (compte + inscription + tranches + paiement) passe par `avecTransaction`.
- **Notifications** : toujours **après** l'enregistrement ; un e-mail en panne n'annule jamais une action.
- **Suppression** : on **désactive** (`etat = false`), on n'efface pas, on peut réactiver. Toujours
  passer par `etatService` : il écrit aussi la ligne de `historique_etat`. Avant une action sur une
  inscription, une tranche ou un paiement : `dependanceService.verifier…` (409 si un parent est désactivé).
  Réactivation refusée tant qu'un parent est désactivé.
- **Attestation** : une seule par inscription ; après elle, la note de présentation ne change plus.
- **Commentaire de fin de formation** : ouvert à J-2, un par inscription, obligatoire pour l'attestation,
  jamais visible par le formateur.
- **Risque de décrochage** : ne pas le confondre avec la note (§4 étape 8b). Seuils dans `REGLES` (`decrochageService.js`).
- **Montants affichés** : toujours `formatMontant` (« 3 160 000 Ar »), jamais « MGA ».
- **Icônes, pas d'emoji** : aucun emoji dans l'interface, sauf les réactions 👍 ❤️ 💡 👎. Web : `<Icon name="…" />` ;
  mobile : `lucide-react-native`.
- **Couleurs (mobile)** : jamais de couleur en dur, toujours `palette.…` (sinon invisible en mode sombre).
- **Web** : confirmation par `useRetour().confirmer(…)` (jamais `window.confirm`) ; réussite par `notifier('…')`
  (bandeau vert, avec « Annuler » après une désactivation).
- **Fichiers** : servis par l'API avec contrôle des droits ; seuls `formations/` et `vitrine/` sont publics.
- **Schéma SQL** : modifier `alter.sql` (rejouable) **et** `base.sql`, puis exécuter `alter.sql`.
- **Tests** : `npm test` dans `backend-imtech` ; ajouter un test quand on touche une règle.

**Codes d'erreur** :

| Code | Sens | Exemple |
|---|---|---|
| 400 | Demande mal remplie | Champ manquant, note hors 0-10, fichier trop lourd |
| 401 | Pas connecté | Token absent ou expiré, session fermée |
| 403 | Pas le droit | Mauvais rôle, données de quelqu'un d'autre |
| 404 | Introuvable | Paiement ou étudiant inexistant |
| 409 | Déjà fait, ou impossible maintenant | E-mail déjà utilisé, tranche déjà payée, inscription déjà validée, élément désactivé |
| 429 | Trop d'essais | Connexions ratées, mots de passe oubliés, inscriptions en ligne |
| 500 | Imprévu | Message général ; le détail est dans la console du serveur |

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
PAIEMENT (id_paiement, #id_echeance, #id_mode_paiement, #id_utilisateur, montant, date_paiement, reference_virement, statut, etat)
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
FORMATEUR_NOTE (id_note, #id_utilisateur, #id_etudiant, #id_inscription, note, commentaire, date_commentaire)
HISTORIQUE_ETAT (id_historique, table_origine, id_origine, actif, date_action)
```

La base refuse elle-même certains doublons : une réaction par personne et par cours, une présence par
personne et par jour, une alerte par sujet, une facture par paiement, une attestation par inscription,
un commentaire de fin de formation par inscription.

---

## 9. Pièges déjà rencontrés (à ne pas réintroduire)

| Piège | Ce qui a été fait |
|---|---|
| QR code de l'attestation sans réponse au scan (`URL_BASE` en `localhost` ou sans `/api`) | `URL_BASE` = adresse du PC sur le réseau **avec `/api`** ; une attestation déjà imprimée garde l'ancien lien |
| Heure calculée par Node et comparée par MySQL : code ou session expiré dès sa création | Expirations calculées dans MySQL |
| Le site affichait les heures en UTC (3 h de retard) | Affichage dans l'heure locale |
| Double clic, ou deux employés en même temps | `UPDATE … WHERE statut = 'en_attente'` et contraintes d'unicité |
| Listes chargées en entier (lent avec le volume) | Pagination par le serveur, recherche au serveur, exports plafonnés à 10 000 lignes |
| Listes qui reçoivent des lignes en direct : doublons en paginant | Pagination « les suivants après tel id » (curseur) pour les notifications, cours, commentaires |
| Erreurs techniques montrées à l'utilisateur (« Failed to fetch », « Erreur 500 ») | `apiRequest` les remplace par une phrase en français |
| Montants bruts (« 3160000.02 ») et mélange « MGA » / « Ar » | `formatMontant` partout |
| Mobile : icônes invisibles en mode sombre | Couleurs de `palette` |
| Accents abîmés en chargeant un `.sql` avec XAMPP | `--default-character-set=utf8mb4` |
| `base.sql` échouait sur une base neuve | Corrigé et vérifié sur une base vide le 26/10 |
| Mobile : photo envoyée en `{ uri, name, type }` → « Unsupported FormDataPart » | Envoyer un `File` d'`expo-file-system` |
| Remplacement automatique dans plusieurs fichiers : des `import './X.css'` supprimés | Après un remplacement en masse : relire `git diff`, puis `npx vite build` |
| Audit Lighthouse lancé sur `npm run dev` (port 5173) : performance à 18, code non compressé | Toujours mesurer le build : `npm run build` puis `npm run preview` (port 4173), et comparer les mêmes pages |
| Tableau de bord qui « saute » au chargement (CLS 0,38) : « Chargement... » ajouté puis retiré en haut, cartes qui grandissent à l'arrivée des données | « Chargement... » en pastille fixe en bas à droite (`.dashboard-chargement`) ; place réservée dans les cartes en cours de chargement (`.carte-chargement`, 220 px) |
| Police chargée chez Google Fonts : la page attendait ce fichier externe avant de s'afficher | Police Inter fournie par le paquet `@fontsource/inter`, importée dans `web/src/main.jsx` |
| Texte secondaire gris clair illisible (contraste 3:1) | `--text-muted` à `#5b6f80` en thème clair (5,2:1, minimum 4,5:1) |
| `npm test` ne se terminait jamais : `tests/fichiers.test.js` laissait une connexion ouverte (tous les tests passaient pourtant) | Option `--test-force-exit` dans le script `test` de `backend-imtech/package.json` |
| Lint mobile : « Cannot access refs during render » dans `use-notification.ts` (`listeRef.current = notifications` écrit pendant le rendu) | Écrire une ref dans un `useEffect`, jamais directement dans le corps du composant ou du hook |
| Photos de profil de plusieurs Mo affichées en avatars de 30 px | Réduites à 400 px à l'upload (`reduirePhoto`) ; anciennes photos : `node scripts/reduirePhotos.js` (copie de `uploads/` avant) |

---

## 10. Ce qu'il reste à faire

| Priorité | Manque | Piste |
|---|---|---|
| Haute | Vrai paiement en ligne | **MVola Merchant Pay** : plan dans [`paiement Mvola.md`](paiement%20Mvola.md) |
| Moyenne | Lecture des cours sans internet | Garder les cours sur le téléphone, protégés |
| Moyenne | Inscription en ligne sans vérifier l'e-mail | Code par e-mail |
| Moyenne | Mobile : logo intégré à l'appli (pas celui choisi par le SA) | Lire `GET /public/logo` comme le site |
| Basse | Pas de notification quand l'appli est fermée | Notifications « push » |
| Basse | Présence = « a ouvert un cours ce jour-là » ; jours fériés comptés | QR code en classe ; liste des jours fériés |
| Basse | L'Accueil ne peut pas répondre par écrit à une demande d'aide | Réponse visible sur le téléphone |
| Basse | Installation à la main sur un seul serveur | Mise en ligne en HTTPS, vérifications automatiques |

---

## 11. Dictionnaire des fonctions principales

À ne pas lire de haut en bas : on y cherche une fonction (Ctrl+F) quand on la rencontre. Les `models/`
(le SQL) et les `controllers/` (qui ne font que relayer vers le service du même nom) ne sont pas listés.

**Mots qui reviennent :** `auteur` = la personne connectée (`req.user`) ; `id_auteur` = son id (il signe
l'e-mail) ; `connection` = la transaction en cours.

### Services (les règles)

| Fonction | Ce qu'elle fait |
|---|---|
| **Inscription** | |
| `vitrineService.contenuVitrine` | Tout l'écran Découvrir en une fois |
| `vitrineService.inscriptionEnLigne` | Compte + dossier + inscriptions + tranches + 1ᵉʳ paiement en attente, tout ou rien |
| `vitrineService.inscriptionCompteExistant` | Un étudiant déjà inscrit choisit d'autres formations |
| `inscriptionService.creerInscriptionDans` | Une inscription + ses tranches ; 409 si déjà inscrit. Utilisée par le mobile **et** l'Accueil |
| `inscriptionService.validerInscription` | Tampon « validé », 1ᵉʳ paiement validé, fiche PDF et facture envoyées |
| `echeanceService.calculerEcheancier` | Découpe le prix en tranches et en dates |
| `echeanceService.rappelerEcheance` | Bouton « Rappeler » : notification + e-mail à l'étudiant |
| `etudiantService.deposerPieces` | L'étudiant dépose ou remplace une pièce du dossier ; l'Accueil est prévenu |
| **Paiement** | |
| `paiementService.enregistrerPaiement` | Étudiant : paiement en attente, montant imposé. Guichet : validé tout de suite |
| `paiementService.traiterPaiementEnAttente` | « Valider » / « Refuser », une seule fois, prévient l'étudiant |
| `paiementService.envoyerFactureAuto` | Après validation : facture envoyée sans faire attendre l'employé |
| `paiementService.modifierPaiement` | Corrige un paiement ; figé s'il est facturé |
| `paiementService.dashboardPaiementEtudiant` | Carte du mobile : prochaine tranche, total dû, payé, reste |
| **Documents** | |
| `documentService.creerFacture` / `envoyerFacture` | Facture `FAC-2026-0042`, une par paiement, envoyée par e-mail |
| `documentService.creerAttestation` / `envoyerAttestation` | Attestation avec QR code, puis envoi |
| `documentService.verifierAuthenticite` | Scan du QR code : authentique ou non |
| `attestationService.raisonsBlocage` | Ce qui manque avant l'attestation (vide = prête) |
| `attestationService.envoyerSiPrete` | Envoie l'attestation si elle est prête (appelée après le commentaire) |
| **Notes** | |
| `classementService.calculerClassement` | Note système + présentation, trié |
| `classementService.definirNote` | Le formateur saisit la présentation sur 10 |
| `decrochageService.evaluerInscription` | Score de risque sur 6 d'un étudiant, avec les raisons |
| `decrochageService.relancer` | Bouton « Relancer », au plus tous les 3 jours |
| `formateurNoteService.commenter` | Commentaire de fin de formation, puis attestation si prête |
| `formateurNoteService.noterCommentaire` | L'Accueil note un commentaire sur 10 |
| `formateurNoteService.classementFormateurs` | Note des formateurs sur 20, ou ce qui manque |
| `reactionService.avisFormateurs` | « Compétent » / « Non compétent » / « Pas assez d'avis » |
| **Cours** | |
| `supportService.creerSupports` | Publie un cours maintenant ou à une heure choisie |
| `supportService.envoyerMaintenant` | Publie un cours programmé sans attendre |
| `supportProgrammeService.verifierSupportsProgrammes` | Chaque minute : annonce 1 h avant, publie à l'heure |
| `commentaireService.creerCommentaire` | Commentaire ou réponse ; prévient les mentionnés, l'auteur, le formateur |
| **Comptes** | |
| `authService.authentifier` | Connexion : token + session |
| `authService.changerMotDePasse` | Change le mot de passe, déconnecte les **autres** appareils |
| `authService.deconnecter` | Ferme la session : le token ne marche plus |
| `userService.demanderReinitialisation` / `reinitialiserMotDePasse` | Mot de passe oublié : code de 30 min, utilisable une fois |
| **Désactivation** | |
| `etatService.desactiverX` / `reactiverX` | Désactive / réactive (et écrit l'historique) ; réactivation refusée si un parent est désactivé |
| `dependanceService.verifierInscription` / `verifierEcheance` / `verifierPaiement` | Avant une action : 409 si un élément ou un parent est désactivé |
| **Notifications** | |
| `notifService.notifierPersonnel` | Notification à tout l'Accueil et au SA |
| `notifService.notifierEtudiant` | Notification **toujours**, puis e-mail ; dit si l'e-mail a échoué |
| **Tâches automatiques** | |
| `alerteService.verifierAlertes` | Chaque heure : rappels J-2 groupés à l'Accueil |
| `alerteService.demanderCommentaires` | Chaque heure : demande / relance du commentaire à partir de J-2 |
| `alerteService.verifierAttestations` | Chaque heure : envoie les attestations prêtes |
| `purgeService.purger` | Chaque jour : le ménage |

### Middlewares (les vigiles)

| Fonction | Ce qu'elle fait |
|---|---|
| `verifyToken` | Badge valide + session active → `req.user` ; sinon 401 |
| `checkRole(...)` | Seuls les rôles listés passent ; sinon 403 |
| `exigerEtudiantProprietaire` | Un étudiant ne passe que pour **ses** données |
| `exigerAccesFormation` / `exigerAccesSupport` | Un étudiant ne voit une formation que si son inscription est validée |
| `servirFichiers` | Sert un fichier : connecté ? a le droit ? puis filigrane |
| `limiteRequetes` | Trop d'essais → 429 |
| `presenceSurCours` | Ouvrir un cours, réagir, commenter = présent ce jour-là |
| `reduirePhoto` | Après l'upload : la photo de profil (champ `photo`) est réduite à 400 px, même fichier, même format ; les pièces du dossier ne sont pas touchées |

### Utils (les outils)

| Fonction | Ce qu'elle fait |
|---|---|
| `avecTransaction` | Le « tout ou rien » |
| `badRequest`, `forbidden`, `notFound`, `conflict` | Fabriquent une erreur 400 / 403 / 404 / 409 |
| `formatMontant` | 3160000.02 → « 3 160 000 Ar » |
| `genererFacturePDF`, `genererAttestationPDF` | Dessinent les PDF |
| `filigraner` | Écrit le nom de l'étudiant en travers d'un PDF ou d'une image |
| `nettoyerContenu` | Retire tout script caché du texte d'un cours |
| `envoyerEmail` | Envoie par Gmail, au nom de l'employé qui a agi |

### Web et mobile (les hooks)

Un hook = *le coursier d'une page* : il appelle l'API et garde les données pour l'affichage.
Nom du hook = nom du menu : `useInscription` (web) ↔ page Inscriptions ; `use-paiement` (mobile) ↔ écran
Paiements. Les plus utiles à connaître :

| Hook | Rôle |
|---|---|
| `useAuth` / `use-auth` | Connexion, déconnexion, mots de passe, sessions |
| `useListePaginee` (web) | Une liste paginée par le serveur (Étudiants, Paiements, Inscriptions, Échéances) |
| `use-vitrine` (mobile) | Découvrir et inscription en ligne |
| `use-dossier` (mobile) | Mon dossier (les 4 pièces) |
| `useNotification` / `use-notification` | La cloche, rafraîchie toutes les 10 s |
