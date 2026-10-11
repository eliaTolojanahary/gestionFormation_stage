# À faire — tests et mise en application mobile (prévu le 08/10/2026)

---

## 1. Tester la protection des documents (lot 3)

Avant tout : **relancer le backend** (`cd backend-imtech && npm run dev`) et **relancer Expo** (`cd mobile && npx expo start`).

### Backend / web
- [ ] Copier l'URL d'un support **sans** `?token=...` dans un nouvel onglet → doit répondre **401**.
- [ ] Se déconnecter, puis rouvrir un ancien lien de fichier (avec token) → doit répondre **401**.
- [ ] Ouvrir un support PDF depuis le web → le **filigrane** « IMTECH INFO · Nom · e-mail · date » apparaît en diagonale.
- [ ] Ouvrir une image (support ou pièce d'un étudiant) → filigrane présent.
- [ ] Ouvrir une **facture / attestation / fiche** → **pas** de filigrane (documents officiels).
- [ ] Les photos de profil (avatars) s'affichent toujours, sans filigrane.
- [ ] Ajouter un support **Word** → refusé avec le message « Un support doit être un PDF ou une image ».
- [ ] Ajouter un support PDF et un support PNG → acceptés.

### Mobile (Expo web, dans le navigateur)
- [ ] Ouvrir un support PDF → s'affiche dans le lecteur (iframe), page par page, avec filigrane.
- [ ] Ouvrir un support image → s'affiche avec filigrane.
- [ ] Vérifier la console : plus d'erreur « React Native WebView does not support this platform ».

### Mobile (vrai téléphone, Expo Go)
- [ ] Ouvrir un support PDF → s'affiche **dans l'app** (plus de navigateur externe).
- [ ] **Android** : faire une capture d'écran dans le lecteur → écran **noir** (ou capture refusée).
- [ ] **Android** : lancer un enregistrement d'écran → le lecteur apparaît noir.
- [ ] Appui long sur une image → pas de menu « Enregistrer l'image ».
- [ ] Revenir en arrière → les captures sont de nouveau autorisées ailleurs dans l'app.
- [ ] Étudiant non inscrit à une formation → ne peut pas ouvrir ses supports (message d'erreur dans le lecteur).

### Si l'erreur web « does not provide an export named 'getFileUrl' » revient
1. Recharger avec **Ctrl+F5**.
2. Sinon arrêter puis relancer `npm run dev` (web).
3. En dernier recours : supprimer `web/node_modules/.vite` puis relancer.

> L'erreur `_sender is not defined` vient d'une **extension du navigateur**, pas de l'application
> (vérifier en navigation privée).

---

## 2. Transformer l'application mobile en APK (Android)

### 2.1 Préparer le projet (à faire avant le build)

- [ ] **`app.json`** : donner un vrai nom et un identifiant Android
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

- [ ] **Adresse de l'API dans `eas.json`** : dans un APK, `__DEV__` vaut `false`. Sans
  `EXPO_PUBLIC_API_URL`, l'app appelle `https://api.imtech.info/api`, qui n'existe pas.
  Le `.env` est ignoré par git, donc **EAS ne l'envoie pas** : il faut mettre l'URL dans `eas.json`.
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
  ⚠️ Vérifier l'IP du PC le jour du test (`ipconfig`) : elle peut changer.

### 2.2 Lancer le build

```bash
npm install -g eas-cli
eas login                 # compte gratuit sur expo.dev
cd mobile
eas build:configure       # crée eas.json (puis y ajouter le profil "preview" ci-dessus)
eas build -p android --profile preview
```

- Durée : 10 à 30 min (file d'attente du compte gratuit).
- À la fin : un **lien + QR code** pour télécharger l'APK sur le téléphone.
- Sur le téléphone : autoriser l'installation depuis des **sources inconnues**.

### 2.3 Pour que l'app fonctionne

- [ ] Le **PC du backend allumé** et sur le **même Wi-Fi** que le téléphone.
- [ ] **Pare-feu Windows** : autoriser le port **3000** (entrant) pour Node.
- [ ] Tester sur le téléphone : connexion, formations, ouverture d'un support (lecteur + filigrane),
      capture d'écran bloquée, paiement, assistance.

### 2.4 Plus tard (hors Wi-Fi local)

- [ ] Héberger le backend + MySQL en ligne **avec HTTPS** (Railway, Render, VPS...).
- [ ] Mettre cette URL dans `eas.json` → plus besoin de `usesCleartextTraffic`.
- [ ] Rebuild : `eas build -p android --profile preview`.

### Autres options (pour info)
- **Sans EAS** : `npx expo run:android --variant release` → compile sur le PC, mais demande Android Studio + SDK.
- **iPhone** : compte Apple Developer obligatoire (99 $/an) → pour une démo, utiliser **Expo Go**.

---

## 3. Commit (à faire soi-même)

Commit proposé pour le lot 3 :
`feat(securite): fichiers protégés, filigrane, lecteur mobile sécurisé`

- Backend : `middlewares/fichierMiddleware.js`, `models/fichierModel.js`, `utils/filigrane.js`,
  `tests/fichiers.test.js` (nouveaux) ; `app.js`, `middlewares/authMiddleware.js`,
  `middlewares/docUpload.js`, `routes/routes.js`, `package.json`, `package-lock.json`
- Web : `src/utils/api.js`, `src/utils/files.js`, `src/pages/documents/Documents.jsx`
- Mobile : `src/app/lecteur.tsx` (nouveau) ; `src/utils/api.ts`, `src/utils/format.ts`,
  `src/hooks/use-doc-detail.ts`, `src/app/_layout.tsx`, `package.json`, `package-lock.json`
- Doc : `FLUX-APPLICATION.md`, `MODIFICATIONS.md`, `A-FAIRE.md`
