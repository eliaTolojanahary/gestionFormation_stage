# À faire — état au 06/11/2026

Note actuelle : **8/10** (structure backend 8,5 · sécurité 8 · tests 7,5 · structure web / mobile 7,5 ·
scalabilité 7 · documentation 9,5). Audit du matin : 7/10.

Documents à jour (référence : `FLUX-APPLICATION.md`, les autres renvoient à ses parties) :
- [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md) : **document de reprise** (§1 en une minute, §2 démarrer,
  §3 organisation du code, §4 parcours A → Z de l'inscription à l'attestation, §5 modules, §6 tâches
  automatiques, §7 règles, §8 base, §9 pièges déjà rencontrés, §10 reste à faire).
- [`backend-imtech/api.md`](backend-imtech/api.md) : toutes les routes et leurs droits.
- [`FLUX-MEMOIRE.md`](FLUX-MEMOIRE.md) : support de rédaction du mémoire (plan du mémoire).
- [`SCENARIOS-TESTS.md`](SCENARIOS-TESTS.md) : un scénario par fonctionnalité + parcours de soutenance ⭐.
- [`paiement Mvola.md`](paiement%20Mvola.md) : plan d'intégration du paiement MVola (flux §10).
- [`CHEAT-SHEET.md`](CHEAT-SHEET.md) : aide-mémoire du projet, sans IA (démarrage, ajout d'une fonctionnalité, requêtes, dépannage).
- [`cheat-sheets/`](cheat-sheets/) : aide-mémoires généraux `node.md`, `react.md` (+ React Native), `mysql.md`.

Dans ce fichier, « flux §N » = partie N de `FLUX-APPLICATION.md`, « mémoire §N » = `FLUX-MEMOIRE.md`.

---

## 1. Améliorations

### ✅ Fait le 26/10/2026
- [x] `README.md` à la racine (présentation, captures, démarrage) et `.gitignore` racine complété
      (`uploads/`, builds, journaux). **Reste à faire soi-même** : `git rm -r --cached uploads` (les PDF
      d'étudiants sont encore suivis par git).
- [x] Montants affichés « 3 160 000 Ar » partout (web, mobile, PDF, e-mails, notifications) — flux §7
- [x] Vitrine mobile : vrais contacts d'IMTECH (site web, Facebook, e-mail) — flux §4 étape 1
- [x] Couverture des formations dans le tableau et la fiche (web) — flux §5 Formations
- [x] Mobile, mode sombre : icônes aux couleurs du thème, couleur principale éclaircie — flux §5 Apparence
- [x] Désactiver / réactiver (étudiants, formations, inscriptions, échéances, paiements, documents et
      supports), filtre « État », message clair quand un élément parent est désactivé — flux §5 Éléments
      désactivés, §7
- [x] Facture envoyée automatiquement à l'étudiant à chaque validation de paiement (flux étape 5) et
      bouton **Annuler** dans le bandeau vert après une désactivation (flux §7)
- [x] **Journal d'activité** : menu Journal (tableau Utilisateur / Action / Élément / Horaire, recherche,
      filtre, export) et bloc « Activité récente » du tableau de bord (5 dernières, toutes les 30 s) —
      flux §5 ; table `journal_activite` (`alter.sql` exécuté sur la base locale) ; 135 tests
- [x] Données de démo du journal (25 activités, `donneesTest.sql` §12, `reinit.sql` les vide) ; montants des
      notifications de démo en « Ar ». `base.sql` réparé : il échouait sur une base neuve (flux §9)

### ✅ Fait le 25/10/2026 — ergonomie (pour un utilisateur non informaticien)
- [x] Erreurs réseau et erreurs sans message traduites en français (web et mobile, `apiRequest`) — flux §3, §9
- [x] Fenêtre de confirmation de l'appli à la place des 13 `window.confirm`, avec le nom de ce qui est
      concerné ; bouton rouge pour supprimer / refuser / désactiver — flux §7
- [x] Bandeau vert de réussite après enregistrement, suppression, validation de paiement — flux §7
- [x] Menu : accents (« Étudiants », « Paramètres ») et une icône différente par entrée
- [x] Web sur écran de moins de 900 px : menu automatiquement réduit aux icônes — flux §5 Apparence
- [x] Bouton « Réduire le menu » retiré de la barre latérale (l'option reste dans Paramètres → Apparence)
- [x] Mobile, connexion : lien « Découvrir nos formations » centré et séparé du bouton

### 1.0 Ergonomie encore possible
- [ ] Mobile, « Mot de passe oublié ? » : afficher le vrai contact du support IMTECH
      (aujourd'hui « Contactez le support IMTECH. ») : e-mail `im.techinfo.mdg@gmail.com` connu,
      numéro de téléphone / WhatsApp à demander (à mettre aussi dans `IMTECH_WHATSAPP` pour la vitrine).
- [ ] Une phrase d'explication sous le titre des pages au vocabulaire métier (Supports programmés,
      Échéances, Sessions actives).

### ✅ Fait le 11/10/2026
- [x] Pagination côté serveur (étudiants, paiements, inscriptions, échéances) — flux §5 Listes
- [x] Limite des essais de connexion et de « mot de passe oublié » — flux §4 étape 4
- [x] Une adresse par fiche (web) — flux §5 Listes
- [x] Recherche globale sur le mobile (loupe de l'en-tête) — flux §5 Recherche
- [x] `Parametres.jsx` découpé (531 → 80 lignes) et `DashboardLayout.jsx` (415 → 144)
- [x] Documentation : flux = seul support, scénarios refaits, cheat sheet

### 1.0 Priorité (06/11/2026)
- [ ] **PDF publics** : retirés de `preproduct`, mais toujours dans son historique et sur `sprint1/testAPI`, dépôt public.
      Reste : passer le dépôt en privé, purger l'historique (push forcé à lancer par le propriétaire du dépôt).
- [ ] À faire valider par IMTECH : présence comptée sur l'usage de l'application, retard de paiement qui baisse la note,
      absence de session / promotion, traitement d'une erreur sur un paiement facturé (pas d'avoir).
- [ ] Reporter dans le mémoire `.docx`, les slides et les schémas MCD / MLD : `historique_etat`, `formateur_note` et `paiement.id_utilisateur` (28 tables).
- [ ] Tester à l'écran : bouton « Désactiver » masqué, « Traité par », bouton « Facture », note refusée après attestation, écran mobile du commentaire, classement sur 20.

Fait le 06/11/2026 :
- [x] Historique des désactivations et réactivations (`historique_etat`)
- [x] Paiements : verrou sur l'échéance, plafond du reste à payer (saisie, validation, correction, réactivation)
- [x] Une facture par paiement ; paiement facturé non désactivable, montant et mode figés
- [x] Agent d'un paiement (`paiement.id_utilisateur`, exception au schéma figé)
- [x] Une attestation par inscription ; note de présentation figée après délivrance
- [x] Note des formateurs sur 20 : commentaire de fin de formation (`formateur_note`), obligatoire pour l'attestation
- [x] Données de démo : 12 commentaires (`donneesTest.sql` §13)

### 1.1 Pour viser 8,5 (par ordre de rapport effort / gain)
- [ ] **Tests front** (Vitest sur le web) : `utils/navigation.js` (`peutOuvrir`, `cheminResultat`),
      `utils/pagination.js` (`numerosDePages`), `utils/appareil.js`. Environ 1 h ; répond à la
      question « comment testez-vous l'interface ? ».
- [ ] **`helmet`** sur le backend (en-têtes de sécurité HTTP) : 10 min.
- [ ] Découper les gros écrans mobiles : `mobile/src/app/(tabs)/index.tsx` (569 lignes : carte
      paiement, supports, commentaires), `mobile/src/app/parametres.tsx` (409).
- [ ] Corriger ESLint : web **1 erreur** (`hooks/useNotification.js:25`, ref lue pendant le rendu) et
      **21 avertissements** ; mobile **14** (surtout `exhaustive-deps`).

### 1.2 Seulement si l'application grandit (à présenter comme perspectives : mémoire §3.3, flux §10)
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
- [ ] **T5** Ergonomie (25/10) : confirmations, bandeau de réussite, backend arrêté, fenêtre < 900 px, lien vitrine mobile
- [ ] **T6** Désactiver / réactiver et éléments dépendants (26/10)
- [x] Journal d'activité retiré (26/10) ; attestations envoyées automatiquement à la date de fin
- [ ] **T4** étapes 4-5 : mobile en mode sombre (icônes, boutons, bandeaux) ; **M1** étape 5 : contacts de la vitrine
- [ ] **A3** étape 4 : couverture dans le tableau des formations ; montants « … Ar » sur le tableau de bord et les PDF

Puis répéter le **parcours ⭐** en entier, chronomètre en main (≈ 20 min).

---

## 3. Préparer la soutenance
- [ ] Relire `FLUX-APPLICATION.md` §4 (parcours A → Z : ce qu'on montre en démo) et §7 (règles).
- [ ] Relire le mémoire : §2.1.2 (conception, droits), §2.2 (modules : page → action → métier → base), §2.3 (états), §2.4 (problèmes), §3.3 (évolutions), annexe A (sécurité).
- [ ] Exporter les schémas Mermaid du mémoire en image (<https://mermaid.live>) : Gantt (Figure 1),
      architecture (Figure 2), cas d'utilisation (Figure 3), MCD (Figure 4), séquence d'un paiement
      (Figure 9, §2.2.2), séquence de la connexion (Figure 15, §2.2.4).
- [ ] Préparer les réponses aux questions du jury (fin de `SCENARIOS-TESTS.md`).
- [ ] Le jour J : base de démo rechargée, IP du PC vérifiée (`ipconfig`), `CHEAT-SHEET.md` ouvert.

---

## 4. Transformer l'application mobile en APK (Android) — configuration faite le 13/10, build à lancer (`.env` mobile : flux §2)

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

Fichiers **non suivis** à ajouter (26/10) :
- Racine : `README.md`, `paiement Mvola.md`
- Backend : `controllers/journalController.js`, `models/journalModel.js`, `services/journalService.js`,
  `middlewares/journalMiddleware.js`, `tests/journal.test.js`, `controllers/etatController.js`, `models/dependanceModel.js`, `services/dependanceService.js`,
  `services/etatService.js`, `utils/etat.js`, `utils/format.js`, `tests/etat.test.js`,
  `tests/simulerDependances.js` (et les tests `logo`, `motDePasseOublie`, `notifications`)
- Web : `src/pages/journal/`, `src/components/dashboard/ActivitesRecentes.*`, `src/components/etat/`, `src/components/retour/`, `src/utils/etat.js`, `src/utils/format.js`,
  `src/pages/formations/CouvertureFormation.jsx`, `src/hooks/useLogo.js`, `src/pages/parametres/ImageParametre.jsx`
- Mobile : `src/components/voir-plus.tsx`, `src/hooks/use-affichage-progressif.ts`,
  `src/styles/components/voir-plus.styles.ts`

Avant le commit : `git rm -r --cached uploads` (données personnelles, désormais ignorées).
Messages proposés :
- `feat: désactiver / réactiver avec filtre « État » et contrôle des éléments dépendants`
- `feat: montants « 150 000 Ar » partout, contacts de la vitrine, couverture des formations (web)`
- `fix(mobile): icônes et couleur principale lisibles en mode sombre`
- `feat: journal d'activité (page Journal + activité récente du tableau de bord)`
- `docs: README, flux, scénarios et cheat sheet à jour`

Anciens fichiers non suivis (11/10), s'ils ne sont pas encore commités :
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
- [ ] **`README.md` à la racine** (manquant) = guide d'installation, à partir de flux §2 (les README
      de `web/` et `mobile/` renvoient maintenant au flux). Contenu :
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
- [ ] **Ordre des scripts SQL** à clarifier (dans le README ou un en-tête de `base.sql` ; tableau des fichiers : flux §2) :
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
