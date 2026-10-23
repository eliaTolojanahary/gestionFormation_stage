# À faire — état au 11/10/2026 (soir)

Note actuelle : **8/10** (structure backend 8,5 · sécurité 8 · tests 7,5 · structure web / mobile 7,5 ·
scalabilité 7 · documentation 9,5). Audit du matin : 7/10.

Documents à jour :
- [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md) : **seul support de référence** (mémoire, soutenance) ;
  l'historique des évolutions, les failles et les bugs corrigés sont en §12 (`MODIFICATIONS.md` supprimé).
- [`SCENARIOS-TESTS.md`](SCENARIOS-TESTS.md) : un scénario par fonctionnalité + parcours de soutenance ⭐.
- [`CHEAT-SHEET.md`](CHEAT-SHEET.md) : aide-mémoire du projet, sans IA (démarrage, ajout d'une fonctionnalité, requêtes, dépannage).
- [`cheat-sheets/`](cheat-sheets/) : aide-mémoires généraux `node.md`, `react.md` (+ React Native), `mysql.md`.

---

## 1. Améliorations

### ✅ Fait le 11/10/2026
- [x] Pagination côté serveur (étudiants, paiements, inscriptions, échéances) — flux §2.2.16
- [x] Limite des essais de connexion et de « mot de passe oublié » — flux §2.2.1
- [x] Une adresse par fiche (web) — flux §2.2.16
- [x] Recherche globale sur le mobile (loupe de l'en-tête) — flux §2.2.15
- [x] `Parametres.jsx` découpé (531 → 80 lignes) et `DashboardLayout.jsx` (415 → 144)
- [x] Documentation : flux = seul support, scénarios refaits, cheat sheet

### 1.1 Pour viser 8,5 (par ordre de rapport effort / gain)
- [ ] **Tests front** (Vitest sur le web) : `utils/navigation.js` (`peutOuvrir`, `cheminResultat`),
      `utils/pagination.js` (`numerosDePages`), `utils/appareil.js`. Environ 1 h ; répond à la
      question « comment testez-vous l'interface ? ».
- [ ] **`helmet`** sur le backend (en-têtes de sécurité HTTP) : 10 min.
- [ ] Découper les gros écrans mobiles : `mobile/src/app/(tabs)/index.tsx` (569 lignes : carte
      paiement, supports, commentaires), `mobile/src/app/parametres.tsx` (409).
- [ ] Corriger les avertissements ESLint : **15 web**, **14 mobile** (surtout `exhaustive-deps`).

### 1.2 Seulement si l'application grandit (à présenter comme perspectives, flux §3.3)
- [ ] Plusieurs serveurs : compteurs d'essais et tâches automatiques dans Redis / un processus dédié.
- [ ] Fichiers uploadés : stockage objet (S3, Cloudinary…) au lieu du disque local `uploads/`.
- [ ] Hébergement en ligne en HTTPS + intégration continue (tests et lint à chaque push).

---

## 2. Tester dans l'application avant la soutenance

Suivre [`SCENARIOS-TESTS.md`](SCENARIOS-TESTS.md) (préparation, comptes de démo, résultat attendu de
chaque étape). Relancer le backend, le web et Expo avant ; base remise en état de démo.

Pas encore testés à la main (nouveautés du 11/10) :
- [ ] **S2** Limite de connexion (web et mobile)
- [ ] **S4** Se déconnecter partout (deux navigateurs + téléphone)
- [ ] **T1** Recherche globale web (Ctrl+K, Accueil et formateur) et **mobile** (loupe)
- [ ] **T2** Fiches dans l'URL (F5, « Précédent », lien ouvert sans être connecté)
- [ ] **T3** Pagination (Paiements, Étudiants, Inscriptions, Échéances)
- [ ] **T4** Apparence : mode sombre partout, Paramètres après découpage, fond de la vitrine
- [ ] **F1 / F3 / F4** Espace formateur, supports programmés, tableau des notes
- [ ] **M1** Découvrir (fond plein écran) ; lecteur : retour sans avertissement « GO_BACK »

Puis répéter le **parcours ⭐** en entier, chronomètre en main (≈ 20 min).

---

## 3. Préparer la soutenance
- [ ] Relire le flux : §2.1.2 (conception, droits), §2.2 (modules : page → action → métier → base), §2.3 (états), §2.4 (problèmes), §3.3 (évolutions), annexe A (sécurité).
- [ ] Exporter 3 ou 4 schémas Mermaid en image pour le mémoire (<https://mermaid.live>) :
      connexion (§2.2.1), paiement (§2.2.6), note d'attestation (§2.2.11), pagination (§2.2.16).
- [ ] Préparer les réponses aux questions du jury (fin de `SCENARIOS-TESTS.md`).
- [ ] Le jour J : base de démo rechargée, IP du PC vérifiée (`ipconfig`), `CHEAT-SHEET.md` ouvert.

---

## 4. Transformer l'application mobile en APK (Android) — configuration faite le 13/10, build à lancer (flux §2.4)

### 4.1 Préparer le projet
- [x] **`app.json`** : vrai nom et identifiant Android (aujourd'hui `"name": "mobile"`)
  ```json
  "name": "IMTECH INFO",
  "android": { "package": "mg.imtech.app", ... }
  ```
  (optionnel : icône et splash aux couleurs d'IMTECH)
- [x] **Autoriser le HTTP** (sinon une app compilée refuse `http://192.168...`) :
  ```bash
  cd mobile
  npx expo install expo-build-properties
  ```
  puis dans `app.json` → `plugins` :
  ```json
  ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
  ```
- [x] **`eas.json`** (créé) avec l'adresse de l'API : dans un APK, `__DEV__` vaut
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

### 4.2 Lancer le build
```bash
npm install -g eas-cli
eas login                 # compte gratuit sur expo.dev
cd mobile
eas build -p android --profile preview
```
- 10 à 30 min ; à la fin, lien + QR code pour installer l'APK (autoriser les sources inconnues).

### 4.3 Pour que l'app fonctionne
- [ ] PC du backend allumé, **même Wi-Fi** que le téléphone, port **3000** autorisé dans le pare-feu.
- [ ] Tester : connexion, Découvrir, formations, lecteur (filigrane, capture bloquée), paiement,
      assistance, session révoquée.

### 4.4 Plus tard
- Hébergement en ligne : **fait par l'entreprise** (confirmé le 17/10/2026), pas par moi.
  Ma part : la remise du projet, voir §6.
- iPhone : compte Apple Developer obligatoire → pour une démo, **Expo Go**.

---

## 5. Commit (à faire soi-même)

Fichiers **non suivis** à ajouter :
- Web : `src/pages/parametres/OngletApparence.jsx`, `OngletSecurite.jsx`, `FormulaireMotDePasse.jsx`,
  `src/utils/appareil.js`
- Mobile : `src/components/recherche/`, `src/hooks/use-recherche.ts`,
  `src/styles/components/recherche-globale.styles.ts`
- Doc : `CHEAT-SHEET.md`, dossier `cheat-sheets/`

Fichier **supprimé** : `MODIFICATIONS.md` (`git add -A` ou `git rm MODIFICATIONS.md`).
Plus les fichiers modifiés (`git status`). Messages proposés, si commit séparé :
- `refactor(web): Paramètres découpé en un composant par onglet`
- `feat(mobile): recherche globale dans l'en-tête (formations, supports, écrans)`
- `docs: flux seul support de référence, scénarios par fonctionnalité, cheat sheet`

---

## 6. Remise du projet à l'entreprise (c'est elle qui déploie) — vérifié le 17/10/2026

Démo de soutenance : **en local**. Objectif ici : qu'un développeur d'IMTECH installe tout sans moi.

### ✅ Déjà en place
- `.env.example` dans `backend-imtech/`, `web/` et `mobile/`, bien commentés.
- `.env` ignorés par git (racine + chaque dossier). `web/.env` a été commité une fois
  (`64282fb`) mais ne contenait que `VITE_URL_BASE=http://localhost:3000` → rien de sensible.
- `node_modules/` ignorés ; `backend-imtech/uploads/` ignoré.
- Adresses de l'API lues depuis l'environnement (`URL_BASE`, `DB_HOST`, `VITE_URL_BASE`,
  `EXPO_PUBLIC_API_URL`) : rien d'écrit en dur dans le code.
- `base.sql` contient déjà les tables de `alter2.sql` (`presence`, `alerte_envoyee`, `parametre_application`).

### À faire
- [ ] **`README.md` à la racine** (manquant) = guide d'installation. Les README de `web/` et
      `mobile/` sont ceux des modèles Vite / Expo, à remplacer ou supprimer. Contenu :
  - prérequis : Node (version), MySQL 8, compte Expo pour l'APK ;
  - ordre d'installation : base → backend → web → mobile ;
  - variables de chaque `.env.example` à remplir (surtout `JWT_SECRET`, `EMAIL_USER` /
    `EMAIL_PASSWORD` = mot de passe d'application Gmail, `CORS_ORIGIN` = adresse du site web) ;
  - le web : `VITE_URL_BASE` est lu **au moment du `npm run build`** → le définir avant le build,
    puis servir le dossier `dist/` ;
  - le backend stocke les fichiers dans `backend-imtech/uploads/` → dossier **persistant** sur le
    serveur, à sauvegarder avec la base ;
  - le mobile : mettre l'URL HTTPS de leur API dans `eas.json`, retirer `usesCleartextTraffic`
    de `app.json`, relancer `eas build`.
- [ ] **Ordre des scripts SQL** à clarifier (dans le README ou un en-tête de `base.sql`) :
  - nouvelle installation = `base.sql` seul ; `alter.sql` / `alter2.sql` = uniquement pour une
    base créée avant le 10/10 (vérifier que `base.sql` contient bien aussi `alter.sql`, DATE → DATETIME) ;
  - `base.sql` n'a ni `CREATE DATABASE` ni `USE`, alors que les autres scripts font
    `USE gestion_formation_db` → ajouter en tête :
    `CREATE DATABASE IF NOT EXISTS gestion_formation_db CHARACTER SET utf8mb4; USE gestion_formation_db;`
  - `reinit.sql` **vide toutes les tables** → bien écrire « jamais en production ».
- [ ] **Données de départ pour la production** (manquant) : les rôles, tranches, statuts et le
      compte Super Admin ne sont créés que dans `donneesTest.sql`, avec les données de démo et le
      mot de passe `admin123` partout. Créer `donneesInitiales.sql` : tables de référence + **un**
      Super Admin dont le mot de passe est à changer à la première connexion.
- [ ] **Retirer de git `uploads/` à la racine** : 13 PDF suivis (`uploads/documents/` : factures,
      attestations, fiches), alors que le backend utilise `backend-imtech/uploads/`. Ce sont des
      fichiers générés, avec des noms d'étudiants :
  ```bash
  git rm -r --cached uploads
  echo "uploads/" >> .gitignore
  ```
- [ ] `mobile/eas.json` : l'IP `10.42.212.120` est celle de mon réseau → laisser un commentaire
      dans le README (« à remplacer par l'URL HTTPS de l'API »).
- [ ] `backend-imtech/package.json` : ajouter la version de Node attendue
      (`"engines": { "node": ">=20" }`, à ajuster à ma version : `node -v`).
- [ ] `web/vite.config.js` : proxy `/auth` vers `localhost` sans doute inutile (l'API passe par
      `VITE_URL_BASE`) → vérifier puis supprimer.
- [ ] Faire un essai d'installation **de zéro** (`git clone` dans un autre dossier, nouvelle base)
      en suivant uniquement le README.
- [ ] Le jour de la remise : pousser sur la branche principale (aujourd'hui je suis sur
      `preproduct`) et donner à l'entreprise les vraies valeurs des `.env` **hors git**.
