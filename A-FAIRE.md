# À faire — état au 11/10/2026

Note de l'audit du 11/10/2026 : **7/10** (structure backend 8,5 · sécurité 7,5 · tests 7 ·
structure web / mobile 6,5 · scalabilité 5,5 · documentation 9).
Les points ci-dessous sont ce qui reste pour aller plus haut, par ordre d'importance.

---

## 1. Améliorations restantes (audit)

### ✅ 1.1 à 1.3 — faits le 11/10/2026
- [x] **Pagination côté serveur** : `GET /etudiants`, `/paiements`, `/inscriptions`, `/echeances`
      acceptent `?page=&limite=` + filtres (SQL) ; pages web branchées (`useListePaginee`).
      Restent chargées en entier : formations, documents, assistances, utilisateurs, notifications
      (petites listes, à paginer seulement si elles grossissent).
- [x] **Limite des essais de connexion** : 5 échecs / 15 min par compte, 20 par IP ; mot de passe
      oublié 5 / heure ; réinitialisation 10 échecs / 15 min (`tests/limiteConnexion.test.js`).
- [x] **Fiches dans l'URL** : `/dashboard/etudiants/:id`, `/formations/:id/modifier`… (`SectionsRoutes.jsx`).
- Documenté : `FLUX-APPLICATION.md` §7.1, §7.19, §7.20 (+ §6, 8 à 14), `MODIFICATIONS.md` §35 à 38, `api.md`.

### 1.4 Préparer plusieurs serveurs (seulement si l'application grandit)
Aujourd'hui tout vit dans un seul processus Node, ce qui suffit pour IMTECH INFO.
- [ ] Limiteur de requêtes et tâches automatiques (rappels, supports programmés) : compteur dans
      Redis / tâches dans un seul processus dédié. (Les mises à jour sont déjà atomiques : pas de
      double envoi, mais des vérifications en double.)
- [ ] Fichiers uploadés : stockage objet (S3, Cloudinary…) au lieu du disque local `uploads/`.
- [ ] Pool MySQL : `connectionLimit` dans le `.env` (10 aujourd'hui).

### 1.5 Qualité du code — en cours
- [ ] Découper les gros fichiers : `web/src/pages/parametres/Parametres.jsx` (531 lignes : un
      composant par onglet), `mobile/src/app/(tabs)/index.tsx` (569), `mobile/src/app/parametres.tsx` (409).
      (`DashboardLayout.jsx` : fait, 415 → 144 lignes avec les fiches dans l'URL.)
- [ ] Corriger les avertissements ESLint : **15 web** (17 avant), **14 mobile** (surtout `exhaustive-deps`).
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

- [ ] **Fiches dans l'URL** : ouvrir une fiche étudiant → adresse `/dashboard/etudiants/12` ; F5 garde
      la fiche ; « Précédent » revient à la liste ; même chose pour formation, inscription,
      modification d'un compte ; `/dashboard/etudiants/abc` → liste.
- [ ] Copier le lien d'une fiche dans un **autre navigateur non connecté** → connexion → arrivée sur la fiche.
- [ ] **Pagination** : Paiements, Étudiants, Inscriptions, Échéances → pied « 1–20 sur N », changer
      de page, rechercher / filtrer (retour page 1, total à jour) ; valider un paiement → bandeau
      « à valider » mis à jour ; supprimer la dernière ligne d'une page → page précédente.
- [ ] **Limite de connexion** : 6 mauvais mots de passe sur un compte → message « Réessayez dans
      15 minutes » (web et mobile) ; un autre compte reste accessible. (Redémarrer le backend
      remet les compteurs à zéro.)

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
- Backend : `utils/pagination.js`, `tests/pagination.test.js`, `tests/limiteConnexion.test.js`
- Web : `src/components/pagination/`, `src/hooks/useListePaginee.js`, `src/hooks/usePreferences.js`,
  `src/pages/dashboard/SectionsRoutes.jsx`, `src/utils/pagination.js`
- Doc : `SCENARIOS-TESTS.md`

Plus les fichiers modifiés (`git status`). Messages proposés, si commit séparé :
- `feat(web): recherche globale (Ctrl+K) selon le rôle`
- `fix(web): couleurs lisibles en mode sombre`
- `feat(web): pages par rôle, notifications du formateur`
- `fix(mobile): retour du lecteur sans écran précédent`
- `feat(api): limite des essais de connexion et de mot de passe oublié`
- `feat: pagination côté serveur (étudiants, paiements, inscriptions, échéances)`
- `feat(web): une adresse par fiche (étudiant, formation, inscription, compte)`
- Doc : `MODIFICATIONS.md` (sections 24 à 38), `FLUX-APPLICATION.md`, `api.md`, `A-FAIRE.md`
