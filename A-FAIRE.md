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
- [x] Pagination côté serveur (étudiants, paiements, inscriptions, échéances) — flux §7.20
- [x] Limite des essais de connexion et de « mot de passe oublié » — flux §7.1
- [x] Une adresse par fiche (web) — flux §7.19
- [x] Recherche globale sur le mobile (loupe de l'en-tête) — flux §7.18
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

### 1.2 Seulement si l'application grandit (à présenter comme perspectives, flux §13)
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
- [ ] Relire le flux : §6 (flux par page), §7 (règles), §8 (sécurité), §12 (évolutions), §13 (limites).
- [ ] Exporter 3 ou 4 schémas Mermaid en image pour le mémoire (<https://mermaid.live>) :
      connexion (§7.1), paiement (§7.6), note d'attestation (§7.13), pagination (§7.20).
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
- [ ] Héberger backend + MySQL en ligne **en HTTPS** (Railway, Render, VPS…), mettre l'URL dans
      `eas.json`, retirer `usesCleartextTraffic`, rebuild.
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
