# À faire — état au 11/10/2026

Note de l'audit du 11/10/2026 : **7/10** (structure backend 8,5 · sécurité 7,5 · tests 7 ·
structure web / mobile 6,5 · scalabilité 5,5 · documentation 9).
Les points ci-dessous sont ce qui reste pour aller plus haut, par ordre d'importance.

---

## 1. Améliorations restantes (audit)

### 1.1 Pagination côté serveur — priorité haute (scalabilité)
`GET /etudiants`, `/paiements`, `/inscriptions`, `/notifications` (et `/echeances`, `/documents`,
`/assistances`, `/utilisateurs`) renvoient **toutes** les lignes. Avec quelques milliers de
paiements, la page devient lente.
- [ ] Accepter `?page=1&limite=20` (+ filtres / recherche) dans les models (`LIMIT ? OFFSET ?`)
      et renvoyer `{ data, total, page, limite }`.
- [ ] Web : brancher les hooks (`useEtudiant`, `usePaiement`, `useInscription`…) et la pagination
      existante sur ces paramètres au lieu de tout charger.
- [ ] Commencer par **Paiements** et **Étudiants** (les plus gros).

### 1.2 Limiter les essais de connexion — priorité haute (sécurité, petit correctif)
`POST /auth/login`, `/auth/forgot-password`, `/auth/reset-password` n'ont aucune limite : on peut
essayer des mots de passe à l'infini.
- [ ] Réutiliser `middlewares/limiteRequetes.js` (déjà utilisé pour l'inscription en ligne),
      ex. 10 essais / 15 min par IP sur la connexion, 5 / heure sur le mot de passe oublié.
- [ ] Test dans `tests/autorisations.test.js` (429 au-delà de la limite).

### 1.3 Mettre les fiches dans l'URL (web)
Les vues ouvertes (fiche étudiant, formation, inscription, formulaire) sont gardées en mémoire
dans `DashboardLayout` : un rechargement (F5) revient à la liste, et on ne peut pas partager un
lien vers une fiche.
- [ ] Routes du type `/dashboard/etudiants/:id`, `/dashboard/inscriptions/:id`,
      `/dashboard/formations/:id/modifier` (react-router `useParams`).
- [ ] Remplacer `studentView`, `formationView`, `inscriptionView`, `userView` par ces routes ;
      `ouvrirResultat()` de la recherche globale devient un simple `navigate()`.

### 1.4 Préparer plusieurs serveurs (seulement si l'application grandit)
Aujourd'hui tout vit dans un seul processus Node, ce qui suffit pour IMTECH INFO.
- [ ] Limiteur de requêtes et tâches automatiques (rappels, supports programmés) : compteur dans
      Redis / tâches dans un seul processus dédié. (Les mises à jour sont déjà atomiques : pas de
      double envoi, mais des vérifications en double.)
- [ ] Fichiers uploadés : stockage objet (S3, Cloudinary…) au lieu du disque local `uploads/`.
- [ ] Pool MySQL : `connectionLimit` dans le `.env` (10 aujourd'hui).

### 1.5 Qualité du code
- [ ] Découper les gros fichiers : `web/src/pages/parametres/Parametres.jsx` (531 lignes : un
      composant par onglet), `web/src/pages/dashboard/DashboardLayout.jsx` (415),
      `mobile/src/app/(tabs)/index.tsx` (569), `mobile/src/app/parametres.tsx` (409).
- [ ] Corriger les avertissements ESLint : **17 web**, **14 mobile** (surtout `exhaustive-deps`).
- [ ] Ajouter quelques tests front (Vitest + Testing Library sur le web) : recherche globale,
      redirection par rôle (`utils/navigation.js`), formulaire de paiement.
- [ ] En-têtes de sécurité HTTP (`helmet`) sur le backend.

---

## 2. Tester les nouveautés du 11/10 (dans l'application)

Avant : **relancer le backend** (`cd backend-imtech && npm run dev`), le web et Expo.
Base déjà à jour (bloc **010** de `alter2.sql` exécuté).

### Web
- [ ] **Recherche globale** : bouton « Rechercher… » ou **Ctrl+K** ; essayer un nom d'étudiant,
      une formation, « paie » (page Paiements) ; ↑ ↓ + Entrée ouvre la bonne fiche.
- [ ] Recherche en **formateur** : un étudiant ouvre l'espace formateur avec la fenêtre des
      étudiants ; un support ouvre la page Supports filtrée.
- [ ] **Mode sombre** : parcourir Paiements, Échéances, Espace formateur, Classement, Paramètres,
      Profil → plus de texte illisible ; tester aussi avec une autre couleur principale.
- [ ] **Redirection par rôle** : en Accueil, taper `/dashboard/utilisateurs` → retour au tableau
      de bord ; en formateur, `/dashboard/paiements` → idem.
- [ ] **Formateur** : menus Espace formateur / Supports / Supports programmés / Notifications ;
      clic sur une formation → fenêtre des étudiants ; recherche, filtres, tri et « Voir plus »
      des supports ; tableau des notes (saisie + Entrée, couleurs de la note finale).
- [ ] **Fond de la vitrine** (Super Admin, Paramètres > Apparence) : remplacer l'image, puis
      « Par défaut ».
- [ ] **Se déconnecter partout** (Paramètres > Sécurité) avec **deux navigateurs différents**
      (ou web + téléphone) : l'autre est renvoyé à la connexion en moins d'une minute.

### Mobile
- [ ] Page **Découvrir** : le fond remplit tout le haut (sous la barre d'état) et affiche le fond
      choisi par le Super Admin.
- [ ] Session révoquée depuis le web → alerte « Session fermée » puis écran de connexion.
- [ ] Lecteur de support : bouton retour sans l'avertissement « GO_BACK ».

---

## 3. Transformer l'application mobile en APK (Android) — pas encore fait

### 3.1 Préparer le projet
- [ ] **`app.json`** : vrai nom et identifiant Android (aujourd'hui `"name": "mobile"`)
  ```json
  "name": "IMTECH INFO",
  "android": { "package": "mg.imtech.app", ... }
  ```
  (optionnel : icône et splash aux couleurs d'IMTECH)
- [ ] **Autoriser le HTTP** (sinon une app compilée refuse `http://192.168...`) :
  ```bash
  cd mobile
  npx expo install expo-build-properties
  ```
  puis dans `app.json` → `plugins` :
  ```json
  ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
  ```
- [ ] **`eas.json`** (n'existe pas encore) avec l'adresse de l'API : dans un APK, `__DEV__` vaut
  `false` et le `.env` n'est pas envoyé à EAS (ignoré par git).
  ```json
  {
    "build": {
      "preview": {
        "distribution": "internal",
        "android": { "buildType": "apk" },
        "env": { "EXPO_PUBLIC_API_URL": "http://192.168.1.185:3000/api" }
      }
    }
  }
  ```
  ⚠️ Vérifier l'IP du PC le jour du test (`ipconfig`).

### 3.2 Lancer le build
```bash
npm install -g eas-cli
eas login                 # compte gratuit sur expo.dev
cd mobile
eas build:configure       # crée eas.json (y ajouter le profil "preview" ci-dessus)
eas build -p android --profile preview
```
- 10 à 30 min ; à la fin, lien + QR code pour installer l'APK (autoriser les sources inconnues).

### 3.3 Pour que l'app fonctionne
- [ ] PC du backend allumé, **même Wi-Fi** que le téléphone, port **3000** autorisé dans le pare-feu.
- [ ] Tester : connexion, Découvrir, formations, lecteur (filigrane, capture bloquée), paiement,
      assistance, session révoquée.

### 3.4 Plus tard
- [ ] Héberger backend + MySQL en ligne **en HTTPS** (Railway, Render, VPS…), mettre l'URL dans
      `eas.json`, retirer `usesCleartextTraffic`, rebuild.
- iPhone : compte Apple Developer obligatoire → pour une démo, **Expo Go**.

---

## 4. Commit (à faire soi-même)

Fichiers encore **non suivis** à ajouter :
- Backend : `controllers/rechercheController.js`, `models/rechercheModel.js`,
  `services/rechercheService.js`, `tests/recherche.test.js`
- Web : `src/components/recherche/` (RechercheGlobale.jsx / .css), `src/utils/theme.js`

Plus les fichiers modifiés (`git status`). Messages proposés, si commit séparé :
- `feat(web): recherche globale (Ctrl+K) selon le rôle`
- `fix(web): couleurs lisibles en mode sombre`
- `feat(web): pages par rôle, notifications du formateur`
- `fix(mobile): retour du lecteur sans écran précédent`
- Doc : `MODIFICATIONS.md` (sections 24 à 33), `FLUX-APPLICATION.md`, `api.md`, `A-FAIRE.md`
