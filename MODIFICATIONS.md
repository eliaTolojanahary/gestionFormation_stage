# Journal des modifications — revue sécurité & qualité (07/10/2026)

Ce document liste toutes les modifications apportées au projet lors de la revue de code,
partie par partie (backend, base de données, web, mobile).

**État final vérifié :**
- Backend : 40 tests automatisés, tous verts (`npm test`).
- Web : 0 erreur ESLint, `vite build` OK.
- Mobile : `tsc --noEmit` OK, 0 erreur ESLint.
- Routes testées en lecture sur la vraie base locale : réponses conformes.

---

## Sommaire

1. [Failles de sécurité corrigées](#1-failles-de-sécurité-corrigées)
2. [Bugs corrigés](#2-bugs-corrigés)
3. [Nouvelle règle métier : paiements en attente de validation](#3-nouvelle-règle-métier--paiements-en-attente-de-validation)
4. [Backend — détail par fichier](#4-backend--détail-par-fichier)
5. [Base de données](#5-base-de-données)
6. [Web — détail par fichier](#6-web--détail-par-fichier)
7. [Mobile — détail par fichier](#7-mobile--détail-par-fichier)
8. [Actions à faire de ton côté](#8-actions-à-faire-de-ton-côté)
9. [Ce qui reste à faire](#9-ce-qui-reste-à-faire)
10. [Lot 2 : assistance, notifications, classement et notes](#10-lot-2--assistance-notifications-classement-et-notes)
11. [Lot 3 : protection des documents](#11-lot-3--protection-des-documents)
12. [Lot 4 : présence automatique et nouvelle note d'attestation](#12-lot-4--présence-automatique-et-nouvelle-note-dattestation)
13. [Lot 5 : envoi programmé des supports](#13-lot-5--envoi-programmé-des-supports)
14. [Lot 6 : fil de discussion, réaction « Je n'aime pas » et avis sur les formateurs](#14-lot-6--fil-de-discussion-réaction--je-naime-pas--et-avis-sur-les-formateurs)
15. [Lot 7 : vitrine publique et inscription en ligne](#15-lot-7--vitrine-publique-et-inscription-en-ligne)

---

## 1. Failles de sécurité corrigées

| # | Faille | Avant | Après |
|---|---|---|---|
| 1 | `PUT /utilisateurs/:id` | N'importe quel utilisateur connecté pouvait modifier **n'importe quel compte**, se donner le rôle Super Admin ou changer le mot de passe d'un autre | Seulement son propre compte, ou le Super Admin. Un non-admin ne peut pas changer `id_role` ni `mot_de_passe` (champs ignorés) |
| 2 | `GET /utilisateurs/:id` | Tout utilisateur pouvait lire les infos de n'importe qui | Soi-même ou Super Admin |
| 3 | `POST/PUT /etudiants` | `id_role` lu depuis le body : un compte Accueil pouvait créer un **Super Admin** | Le rôle Étudiant est imposé par le serveur ; `id_role` n'est plus modifiable par cette route |
| 4 | `POST /paiements` (étudiant) | L'étudiant enregistrait un paiement **déjà validé**, avec le montant qu'il voulait, sur n'importe quelle échéance | Uniquement sur **sa** propre échéance, montant imposé par le serveur, statut `en_attente`, un seul paiement en attente par échéance |
| 5 | `GET /paiements` (étudiant) | Renvoyait les paiements de **tous** les étudiants (noms, emails) | Uniquement ses propres paiements (liste vide s'il n'a pas de fiche étudiant) |
| 6 | `GET /paiements/:id` (étudiant) | Pouvait lire n'importe quel paiement | Uniquement les siens (404 sinon) |
| 7 | `/etudiants/:id/dashboard-paiement` | Changer l'id dans l'URL donnait les données d'un autre étudiant | 403 si l'id n'est pas le sien |
| 8 | `/etudiants/:id/formations` | Même problème | Même correction |
| 9 | Logout / « déconnecter les autres appareils » | Le token restait valide 24 h : la déconnexion ne servait à rien côté serveur | `verifyToken` vérifie que la session est **active** en base à chaque requête |
| 10 | `POST /auth/logout` | N'était pas protégé et ne faisait rien | Exige le token et désactive la session |
| 11 | Changement / réinitialisation du mot de passe | Les autres sessions restaient connectées | Change : les autres appareils sont déconnectés. Reset : tous les appareils |
| 12 | Suppression d'un utilisateur | Ses sessions restaient actives | Toutes ses sessions sont désactivées |
| 13 | `GET /auth/sessions` | Renvoyait les **tokens** de toutes les sessions de l'utilisateur | Plus aucun token renvoyé, seulement `est_courante` |
| 14 | `verifyToken` | Affichait l'en-tête Authorization et le token dans les logs | Logs supprimés |
| 15 | `changerMotDePasse` | Affichait le **hash du mot de passe** dans les logs | Logs supprimés |
| 16 | Secret JWT | Valeur de secours écrite en dur (`super_secret_key_imtech`) | Supprimée : le serveur refuse de démarrer sans `JWT_SECRET` |
| 17 | Erreurs 500 | Le message technique de l'erreur (SQL…) était renvoyé au client | Toujours `"Erreur serveur."`, le détail reste dans les logs serveur |
| 18 | `DELETE /supports/:id` (formateur) | Un formateur pouvait supprimer les supports des autres | Uniquement ses propres supports (le Super Admin peut tout supprimer) |
| 19 | `POST /supports` | Un formateur pouvait publier dans n'importe quelle formation | Uniquement dans les formations qui lui sont attribuées |
| 20 | `GET /formations/:id/etudiants` (formateur) | Voyait les étudiants de toutes les formations | Uniquement ceux de ses formations |
| 21 | Factures | On pouvait générer une facture pour un paiement non validé | 409 si le paiement n'est pas `valide` |

---

## 2. Bugs corrigés

| Bug | Fichier | Conséquence avant correction |
|---|---|---|
| `db` utilisé sans être importé dans `notifierMention` | `services/notifService.js` | Les notifications de mention **plantaient toujours** (erreur masquée par un `console.warn`) |
| La liste des notifications ne filtrait pas `etat` | `models/notifModel.js` | Une notification « supprimée » réapparaissait |
| `updateUser` ignorait le mot de passe et mettait `photo = null` si absente | `models/userModel.js` | Modifier un utilisateur sans nouvelle photo **effaçait sa photo** ; le mot de passe saisi par l'admin n'était jamais enregistré |
| `updatePaiement` lisait `reference` au lieu de `reference_virement` | `models/paiementModel.js` | La modification de la référence ne marchait jamais |
| `paiementsByEtudiant` appelait la mauvaise fonction et son résultat était ignoré | `services/paiementService.js` | Code mort (supprimé) |
| Inscription créée **hors** de la transaction de l'échéancier | `services/inscriptionService.js` | Si l'échéancier échouait : inscription sans échéances |
| `validerInscription` pouvait être appelée plusieurs fois | `services/inscriptionService.js` | La première échéance était **payée deux fois** |
| Arrondi des tranches | `services/echeanceService.js` | 100 000 en 3 tranches → total 99 999,99 (la dernière tranche absorbe maintenant l'écart) |
| `paiements_en_retard` comparait chaque paiement au lieu de leur somme | `models/dashboardModel.js` | Une échéance payée en 2 fois était comptée en retard |
| Mises à jour partielles écrasant les champs non envoyés | `etudiantModel`, `formationModel`, `echeanceModel` | Champs mis à `NULL` si absents du formulaire (`COALESCE` ajouté) |
| Mise à jour étudiant en 2 requêtes sans transaction | `services/etudiantService.js` | État incohérent possible en cas d'erreur |
| Notification de mention envoyée **avant** le commit | `services/commentaireService.js` | Notification envoyée même si le commentaire était annulé |
| `getFileUrl` importée du mauvais module | `mobile/src/hooks/use-doc-detail.ts` | Ouvrir un support depuis le détail **plantait** |
| `displayedError` et `message` calculés mais jamais affichés | `web/src/components/profile/ProfileModal.jsx` | L'utilisateur ne voyait ni les erreurs ni la confirmation |
| `EXPO_PUBLIC_API_URL` défini dans `.env` mais jamais lu | `mobile/src/constants/api.ts` | IP écrite en dur dans le code |
| `ENDPOINTS.ECHEANCE = '/echeance'` | `mobile/src/constants/api.ts` | Route inexistante (supprimée) |
| `documentError` jamais affiché | `web/src/pages/inscriptions/Inscriptions.jsx` | Erreurs de génération de fiche invisibles |

---

## 3. Nouvelle règle métier : paiements en attente de validation

Décision : **l'étudiant paie depuis le mobile, l'Accueil valide sur le web.**

```
Étudiant (mobile)            Serveur                       Accueil (web)
      │  POST /paiements        │                                │
      │ ───────────────────────►│  statut = 'en_attente'         │
      │                         │  montant = montant prévu       │
      │                         │                                │
      │                         │◄────── PUT /paiements/:id/valider (ou /refuser)
      │  notification in-app    │  statut = 'valide' / 'refuse'  │
      │ ◄───────────────────────│                                │
```

- Nouvelle colonne `paiement.statut` : `en_attente` | `valide` | `refuse`.
- `etat` garde son rôle habituel de suppression logique.
- **Seuls les paiements `valide`** comptent dans les totaux, le reste à payer, le dashboard, la vue des échéances et les factures.
- Constante `PAIEMENT_VALIDE()` dans `models/paiementModel.js` : à utiliser dans toute nouvelle requête qui somme des paiements.
- Le personnel (Accueil / Super Admin) enregistre toujours des paiements directement `valide` ; le paiement partiel reste autorisé, mais plafonné au reste à payer.
- La prochaine échéance proposée à l'étudiant exclut celles qui ont déjà un paiement en attente (pas de double paiement).

---

## 4. Backend — détail par fichier

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `config/roles.js` | Constantes `ROLES` (`SUPER_ADMIN`, `ACCUEIL`, `FORMATEUR`, `ETUDIANT`), `STAFF`, `TOUS` — fini les chaînes `'Étudiant'` répétées 100 fois |
| `utils/errors.js` | Classe `AppError` (erreur + code HTTP), raccourcis `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, et `exigerChamps(body, [...])` pour les champs obligatoires |
| `utils/transaction.js` | `avecTransaction(fn)` : commit / rollback / release automatiques |
| `migrations/002_paiement_statut.sql` | Ajoute `paiement.statut` + index sur `sessions(token)` |
| `.env.example` | Liste des variables d'environnement à remplir |
| `tests/setup.js` | Prépare l'environnement de test (sans base de données) |
| `tests/echeancier.test.js` | 4 tests : montants, arrondi, dates, validation du nombre de tranches |
| `tests/paiementService.test.js` | 10 tests : règles de paiement étudiant / staff, validation, refus |
| `tests/autorisations.test.js` | 11 tests HTTP sur la vraie application Express : 401, 403, session révoquée, tokens jamais renvoyés, erreur 500 sans fuite |

### `app.js`
- Gestionnaire d'erreurs **unique** : `AppError` → son code ; erreurs multer → 400 ; JSON invalide → 400 ; email en double (`ER_DUP_ENTRY`) → 409 ; le reste → 500 générique.
- Express 5 transmet automatiquement les erreurs des fonctions `async` : plus besoin de `try/catch` dans chaque controller.
- Détection automatique des IP Wi-Fi au démarrage (plus d'IP `192.168.1.185` écrite en dur).
- `CORS_ORIGIN` optionnel pour restreindre les origines.
- Le serveur ne démarre que si le fichier est lancé directement : les tests peuvent importer `app`.

### `routes/routes.js`
- Réécrit avec les constantes de rôles et des raccourcis `staff` / `roles(...)`.
- Routes regroupées par domaine avec des titres de section.
- Nouvelles routes : `PUT /paiements/:id/valider` et `PUT /paiements/:id/refuser`.
- Nouveaux middlewares appliqués : `exigerSoiOuAdmin()` sur `/utilisateurs/:id`, `exigerEtudiantProprietaire()` sur `/etudiants/:id/formations` et `/dashboard-paiement`.
- `POST /auth/logout` est maintenant protégé par `verifyToken`.

### `middlewares/authMiddleware.js`
- `verifyToken` : vérifie le JWT **et** la session active en base ; complète `req.user.id_etudiant` pour les étudiants ; plus de logs, plus de secret de secours.
- Nouveaux middlewares : `exigerEtudiantProprietaire(param)` et `exigerSoiOuAdmin(param)`.
- Les erreurs sont levées (`throw`), donc renvoyées au format standard par `app.js`.

### Controllers (tous réécrits)
Tous les controllers ont été simplifiés selon le même modèle : lecture de la requête → appel du service → réponse. Les `try/catch` et `console.error` répétés ont été supprimés (gérés dans `app.js`).

| Controller | Changements notables |
|---|---|
| `authController.js` | Longueur minimale du mot de passe (8) aussi au reset ; `logout` désactive la session ; `getSessions` sans tokens |
| `userController.js` | Passe `req.user` au service (règles de rôle) ; le mot de passe n'est jamais renvoyé dans la réponse |
| `etudiantController.js` | `id_role` n'est plus lu ; fonction `cheminsFichiers()` factorisée |
| `paiementController.js` | Nouveaux `validerPaiementController` / `refuserPaiementController` ; message adapté pour l'étudiant (« en attente de validation ») |
| `commentaireController.js` | `deleteCommentaireControler` renommé `deleteCommentaireController` ; plus de détection d'erreurs par le texte du message |
| `supportController.js`, `documentController.js` | `id_utilisateur` pris uniquement dans le token (plus de repli sur `req.body`) |
| `formationController.js`, `inscriptionController.js`, `echeanceController.js`, `notifController.js`, `reactionController.js`, `dashboardController.js` | Simplifiés, champs obligatoires vérifiés avec `exigerChamps` |

### Services

| Service | Changements |
|---|---|
| `authService.js` | `id_etudiant` dans le JWT et la réponse de login ; durée de session unique (24 h) pour JWT et session ; `changerMotDePasse` lève des erreurs claires et déconnecte les autres appareils ; nouvelle fonction `deconnecter` ; logs supprimés ; ne dépend plus de `commentaireModel` |
| `userService.js` | Règles : seul le Super Admin change rôle / mot de passe ; sessions désactivées après reset, changement imposé par l'admin ou suppression |
| `paiementService.js` | Réécrit : règles étudiant / staff, plafond au reste à payer, validation / refus avec notification à l'étudiant, `paiements_en_attente` dans le tableau de bord étudiant |
| `inscriptionService.js` | Création inscription + échéancier dans **une** transaction ; vérifie étudiant, formation et doublon ; validation unique en transaction |
| `echeanceService.js` | Nouvelle fonction pure `calculerEcheancier` (testée) ; arrondi au centime corrigé ; `genererEcheancier` participe à la transaction de l'inscription |
| `etudiantService.js` | Utilise `avecTransaction` ; erreurs 404 explicites |
| `formationService.js` | Filtre formateur basé sur `req.user` ; contrôle « ses formations » pour la liste des étudiants |
| `supportService.js` | `creerSupports` (plusieurs fichiers) avec contrôle de la formation ; suppression réservée au propriétaire |
| `commentaireService.js` | Plus de SQL brut (déplacé dans les models) ; utilise `AppError` ; notification après le commit |
| `notifService.js` | `notifierMention` passe par le model (bug `db` corrigé) |
| `documentService.js` | Factures réservées aux paiements validés ; erreurs 404 / 409 explicites |

### Models

| Model | Changements |
|---|---|
| `paiementModel.js` | Réécrit : constantes `STATUTS_PAIEMENT`, `PAIEMENT_VALIDE()`, `PAIEMENT_ACTIF()` ; requête de liste commune avec filtres (`id_etudiant`, `statut`) ; `changerStatutPaiementEnAttente` ; `getEcheanceAvecSituation` ; `insererPaiement` accepte une connexion de transaction ; fonction morte `getPaiementsByEtudiant` supprimée |
| `userModel.js` | `updateUser` partiel (COALESCE) avec mot de passe ; `findActiveSession` ; `deactivateAllSessions` ; `findSessionsByUser` ne renvoie plus le token |
| `etudiantModel.js` | Rôle imposé à la création ; mise à jour partielle en transaction ; `getIdEtudiantByUtilisateur` (déplacée depuis `commentaireModel`) ; import `bcrypt` inutile supprimé |
| `inscriptionModel.js` | Fonctions compatibles transaction ; `inscriptionActiveExiste`, `findFormationActive` ; `setInscriptionValidee` refuse une double validation |
| `echeanceModel.js` | Ne compte que les paiements validés dans la vue globale ; compatible transaction |
| `dashboardModel.js` | KPI, évolution et retards basés sur les paiements validés ; calcul des retards corrigé (somme) |
| `documentModel.js` | Reste à payer basé sur les paiements validés ; `statut` renvoyé pour la facture |
| `commentaireModel.js` | `getCommentaireAvecFormateur` (SQL sorti du service) |
| `notifModel.js` | Filtre `etat = true` ; `insertNotificationsInApp`, `getContexteMention`, `getIdsUtilisateursEtudiants` |
| `formationModel.js` | Mise à jour partielle (COALESCE) |

### `package.json`
- Scripts ajoutés : `npm start`, `npm run dev` (nodemon), `npm test` (runner intégré à Node, aucune dépendance à installer).
- `main` corrigé (`app.js`) et description ajoutée.

### `api.md`
- Réécrit sous forme de tableaux : chaque route avec les rôles autorisés, les règles de propriété, le format des réponses et les codes d'erreur.
- Routes inexistantes (`/assistances`) retirées de la liste.

---

## 5. Base de données

| Changement | Où | Appliqué sur ta base locale ? |
|---|---|---|
| Colonne `paiement.statut ENUM('en_attente','valide','refuse') DEFAULT 'valide'` | `migrations/002_paiement_statut.sql` + `base.sql` | ✅ Oui (tes 3 paiements existants sont en `valide`) |
| Index `idx_sessions_token` sur `sessions(token)` | idem | ✅ Oui |
| Colonne `notification_inapp.etat` | `base.sql` uniquement (elle existait déjà dans ta vraie base, mais pas dans le script) | Déjà présente |

---

## 6. Web — détail par fichier

| Fichier | Changements |
|---|---|
| `src/utils/api.js` | Centralise le stockage de session (`readStoredToken`, `storeSession`, `clearSession`…) ; `fileUrl()` pour les fichiers ; lit les réponses qui ne sont pas du JSON ; **401 avec session → retour automatique à la page de connexion** |
| `src/hooks/useAuth.js` | `login` passe par `apiRequest` (plus de `fetch` dupliqué) ; utilise les fonctions de stockage partagées |
| `src/hooks/usePaiement.js` | `STATUTS_PAIEMENT`, `validerPaiement`, `refuserPaiement` |
| `src/pages/paiements/Paiements.jsx` | Colonne **Statut** (badge), boutons **Valider / Refuser** avec confirmation, bandeau « X paiements attendent votre validation », filtre par statut, facture seulement pour les paiements validés, dates formatées ; code mort et `console.log` supprimés |
| `src/pages/paiements/Paiements.css` | Styles des badges de statut, des boutons et du bandeau |
| `src/components/profile/ProfileModal.jsx` | Erreurs et message de succès **affichés** ; état mot de passe inutilisé et `useNavigate` inutile supprimés |
| `src/pages/inscriptions/Inscriptions.jsx` | `fileUrl()` ; erreur de génération de fiche affichée ; logs supprimés |
| `src/pages/dashboard/DashboardLayout.jsx`, `formateur/AccueilFormateur.jsx`, `etudiants/EtudiantDetail.jsx` | Variables inutilisées supprimées |
| `src/pages/documents/Documents.jsx`, `notifications/Notifications.jsx`, `parametres/Parametres.jsx` | Import `formatRelative` inutilisé supprimé |
| `src/hooks/useDocument.js`, `useEtudiant.js`, `useUser.js`, `pages/etudiants/EtudiantForm.jsx`, `pages/users/UserForm.jsx` | `console.log` de debug supprimés |
| `eslint.config.js` | `set-state-in-effect` passé en avertissement (chargement au montage voulu, commenté) ; exception pour le fichier de contexte |
| `.gitignore` / `.env.example` | `.env` ignoré, exemple fourni |

Résultat : 32 problèmes ESLint (25 erreurs) → **0 erreur**, 17 avertissements.

---

## 7. Mobile — détail par fichier

| Fichier | Changements |
|---|---|
| `src/constants/api.ts` | URL lue depuis `EXPO_PUBLIC_API_URL`, sinon l'IP du PC est déduite du serveur Expo (plus d'IP en dur) ; `ECHEANCE` (route inexistante) supprimé ; ajout de `DASHBOARD_PAIEMENT(id)` et `UTILISATEUR(id)` |
| `src/utils/api.ts` | Stockage de session centralisé ; 401 → session effacée et retour à la connexion via `setOnSessionExpiree` ; JSON corrompu en stockage géré |
| `src/hooks/use-auth.ts` | `login` via `apiRequest` ; logs de debug supprimés ; constantes `ENDPOINTS` utilisées partout ; fonctions de stockage dupliquées supprimées ; `user` typé `User` |
| `src/context/AuthContext.tsx` | Type `User` complet (`role`, `role_nom`, `id_etudiant`, `photo`, …) |
| `src/hooks/use-paiement.ts` | Types `StatutPaiement`, `Paiement`, `paiements_en_attente` ; le montant n'est plus envoyé (imposé par le serveur) ; message « en attente de validation » ; chargement via `useCallback` |
| `src/app/paiements.tsx` | Nouvelle section **« En attente de validation »** |
| `src/styles/paiements.styles.ts` | Styles de la carte « en attente » |
| `src/components/paiement/paiemet-modal.tsx` → `paiement-modal.tsx` | Fichier renommé (faute de frappe) ; type `ModePaiement` dédupliqué ; bouton « Envoyer le paiement » + mention de la validation par l'accueil |
| `src/styles/components/paiement-modal.styles.ts` | Style de la mention sous le bouton |
| `src/hooks/use-doc-detail.ts` | **Import `getFileUrl` corrigé** ; accepte `id_etudiant = null` |
| `src/hooks/use-document-lists.ts` | Accepte `id_etudiant = null` ; import inutilisé supprimé |
| `src/app/(tabs)/index.tsx` | Import du modal renommé ; typage d'index corrigé ; log supprimé |
| `src/components/profile/profile-modal.tsx`, `src/hooks/use-formation.ts` | `console.log` supprimés |
| Plusieurs écrans (`documents`, `formations`, `notifications`, `profile`, `login`, `parametres`) | Imports inutilisés supprimés |
| `eslint.config.js` | `react/no-unescaped-entities` désactivé (règle HTML, inutile en React Native) ; `set-state-in-effect` en avertissement |
| `.env` | `/api` ajouté à la fin de l'URL (sinon toutes les requêtes tombaient en 404) |
| `.gitignore` / `.env.example` | `.env` ignoré, exemple fourni |

Résultat : 20 erreurs ESLint → **0 erreur** ; `tsc --noEmit` OK.

---

## 8. Actions à faire de ton côté

1. **Retirer `web/.env` du suivi git** (il reste suivi même s'il est dans le `.gitignore`) :
   ```bash
   git rm --cached web/.env
   ```
2. **Se reconnecter** sur le web et le mobile : les anciens tokens sans session active sont refusés.
3. **Sur une autre machine / base** : exécuter `backend-imtech/migrations/002_paiement_statut.sql`.
4. **Commiter** en plusieurs commits clairs, par exemple :
   - `fix(backend): contrôles d'accès, sessions révocables, logs sensibles`
   - `feat(paiements): paiements étudiants en attente + validation par l'accueil`
   - `refactor(backend): gestion d'erreurs centralisée, transactions, tests`
   - `fix(web): page paiements, apiRequest, nettoyage lint`
   - `feat(mobile): suivi des paiements en attente, config API par .env`

---

## 9. Ce qui reste à faire

| Priorité | Point | Pourquoi |
|---|---|---|
| ~~Haute~~ | ~~Protéger les fichiers servis en statique~~ | ✅ Fait au [lot 3](#11-lot-3--protection-des-documents) |
| Moyenne | Remplacer les `useEffect` de chargement par TanStack Query | Supprime les 17 + 13 avertissements de hooks restants et ajoute cache / rechargement |
| Moyenne | Tests front (Vitest côté web) | Aucun test pour l'instant |
| Basse | Validation des entrées avec un schéma (ex. `zod`) | Les types et formats (email, montants) sont encore vérifiés au cas par cas |

---

## 10. Lot 2 : assistance, notifications, classement et notes

### 10.1 Décisions prises avec le porteur du projet

| Sujet | Décision |
|---|---|
| Assistance | L'**étudiant** écrit depuis le mobile, l'**Accueil / Super Admin** traite sur le web et clique **« Résoudre »** |
| Rappels J-2 | Le système **prévient l'Accueil** (in-app) ; c'est l'Accueil qui envoie le rappel à l'étudiant avec le bouton **« Rappeler »** |
| Fin de formation | Le système prévient l'Accueil « envoyez-lui son attestation » ; l'Accueil envoie l'attestation avec le bouton **« Attestation »** |
| Critères d'activité | Comparés à la **moyenne de la formation** (commentaires, réactions) + **paiement à temps** |
| Paiement à temps | C'est **la date d'envoi** du paiement qui compte, même avant la validation par l'Accueil (les paiements refusés ne comptent pas). Idem pour la couleur de l'échéance et les rappels ; seuls les montants encaissés exigent la validation |
| Barème | 0 critère = **14**, 1 = **16**, 2 = **17**, 3 = **18**, et **19** pour le 1er du classement avec les 3 critères |
| Note finale | La note suggérée s'applique tant que le **formateur** n'en fixe pas une lui-même |

### 10.2 Notifications

| Événement | Étudiant (mobile) | Accueil / Super Admin (web) | Déclenchement |
|---|---|---|---|
| Inscription confirmée | in-app + e-mail | — | Accueil (validation de l'inscription) — existait déjà |
| Paiement envoyé depuis le mobile | — | in-app « Étudiant A a payé X MGA… Paiement à valider » | **nouveau**, automatique |
| Paiement validé / refusé | in-app | — | automatique (lot 1) |
| Échéance passée au JAUNE (J-2, non soldée) | — | in-app « Étudiant A doit être rappelé… » | **nouveau**, automatique (toutes les heures) |
| Rappel de paiement | in-app + e-mail | — | **nouveau** bouton « Rappeler » (Échéances) |
| Facture | in-app + e-mail (PDF) | — | Accueil (page Paiements) — existait déjà |
| Formation terminée | — | in-app « Étudiant A a fini sa formation, envoyez-lui son attestation » | **nouveau**, automatique |
| Attestation | in-app + e-mail (PDF avec la note) | — | **nouveau** bouton « Attestation » (Inscriptions) |
| Nouvelle demande d'assistance | — | in-app « Étudiant A a envoyé une demande d'assistance… » | **nouveau**, automatique |
| Demande résolue | in-app | — | **nouveau**, bouton « Résoudre » |

Si l'e-mail ne peut pas partir (Gmail indisponible), la notification in-app est quand même envoyée
et l'interface affiche « l'e-mail n'a pas pu partir ».

### 10.3 Base de données — `migrations/003_assistance_rappels_notes.sql` (✅ appliquée sur ta base locale)

| Changement | Rôle |
|---|---|
| Valeurs `En attente` et `Résolu` dans la table `statut` (elle était vide) | Statuts des demandes d'assistance |
| `assistance.date_resolution` | Date à laquelle l'Accueil a résolu la demande |
| `echeance.date_dernier_rappel` | Date du dernier rappel envoyé par l'Accueil |
| `inscription.criteres_atteints`, `note_suggeree`, `note_attestation` | Note d'attestation : suggestion calculée + note choisie par le formateur |
| Nouvelle table `alerte_envoyee (type, id_reference)` UNIQUE | Garantit qu'une alerte automatique n'est envoyée qu'une fois |

`base.sql`, `donneesTest.sql` et `reinit.sql` sont mis à jour en conséquence.

### 10.4 Backend

| Fichier | Contenu |
|---|---|
| `models/assistanceModel.js` (nouveau) | Création, liste filtrée, résolution (seulement si encore en attente) |
| `services/assistanceService.js` (nouveau) | Règles : l'étudiant ne voit que ses demandes, objet ≤ 150 caractères, notifications |
| `controllers/assistanceController.js` (nouveau) | `POST /assistances`, `GET /assistances`, `PUT /assistances/:id/resoudre` |
| `models/classementModel.js` (nouveau) | Activité par étudiant : commentaires et réactions sur les supports de la formation, échéances payées en retard |
| `services/classementService.js` (nouveau) | `calculerClassement` (fonction pure testée), barème, enregistrement des suggestions, note du formateur (0–20) |
| `controllers/classementController.js` (nouveau) | `GET /formations/:id/classement`, `PUT /inscriptions/:id/note` |
| `models/alerteModel.js`, `services/alerteService.js` (nouveaux) | Alertes automatiques J-2 et fin de formation, lancées au démarrage puis toutes les heures |
| `services/notifService.js` | `notifierPersonnel` (tout l'Accueil + Super Admin), `notifierEtudiant` (in-app + e-mail, e-mail non bloquant) |
| `models/userModel.js` | `findIdsByRoles` |
| `services/paiementService.js` | Notifie le personnel quand un étudiant paie |
| `services/echeanceService.js`, `models/echeanceModel.js` | `rappelerEcheance` + `POST /echeances/:id/rappeler` ; `date_dernier_rappel` dans la liste ; statuts simplifiés en **VERT** (payée ou loin) / **JAUNE** (J-2, J-1, J) / **ROUGE** (en retard) ; règle unique `ECHEANCE_PROCHE` partagée par le statut et l'alerte automatique (avant : ORANGE le jour J seulement + « À relancer bientôt » le jour exact de J-2) |
| `services/documentService.js`, `models/documentModel.js` | `envoyerAttestation` + `POST /attestations/:id/envoyer` ; la note est recalculée puis imprimée sur l'attestation |
| `utils/pdf.js` | **Bug corrigé** : les PDF étaient renvoyés avant la fin de l'écriture du fichier (un e-mail pouvait joindre un fichier incomplet) ; ligne « Note obtenue : X / 20 » sur l'attestation |
| `routes/routes.js`, `app.js` | Nouvelles routes ; démarrage des alertes automatiques |
| `tests/classement.test.js` (nouveau), `tests/autorisations.test.js` | +15 tests (barème, moyenne, égalités, assistance, droits sur les notes) |

### 10.5 Web

| Fichier | Changements |
|---|---|
| `pages/assistance/Assistance.jsx` | La maquette (données en dur) est remplacée par la vraie liste des demandes des étudiants : filtres En attente / Résolues / Toutes, détail, bouton **Résoudre** |
| `hooks/useAssistance.js` (nouveau) | Chargement et résolution des demandes |
| `components/sidebar/Sidebar.jsx` | Menu Assistance retiré pour les formateurs (réservé à l'Accueil / Super Admin) |
| `utils/dashboardUtils.js`, `components/dashboard/DashboardContent.jsx` | Libellés À jour / À rappeler / En retard ; le bouton « Rappeler » du tableau de bord (qui ne faisait rien) mène à la page Échéances ; lien « Filtres avancés » corrigé (pointait vers une route inexistante) |
| `pages/echeances/Echeances.jsx`, `hooks/useEcheance.js` | Badges vert / jaune / rouge et filtre par statut. **Bug corrigé** : la page envoyait automatiquement une relance à chaque ouverture. Remplacé par le bouton **Rappeler** (confirmation, message de résultat, date du dernier rappel) |
| `pages/inscriptions/Inscriptions.jsx`, `hooks/useDocument.js` | Bouton **Attestation** (génère + envoie) ; « Générer » renommé « Fiche » |
| `components/classement/ClassementFormation.jsx` + `.css`, `hooks/useClassement.js` (nouveaux) | Tableau de classement dans l'Espace formateur : rang, critères ✓/✗, note suggérée, saisie de la note + Rétablir |
| `pages/formateur/AccueilFormateur.jsx` | Affiche le classement |
| `pages/notifications/Notifications.jsx` | Catégories Assistance et Attestation ; « payé » et « rappel » classés en Paiement |
| `hooks/useNotifEvent.js` | `relancePaiement` et `attestationPrete` supprimés (le serveur envoie désormais) |

### 10.6 Mobile

| Fichier | Changements |
|---|---|
| `app/assistance.tsx` (nouveau) | Formulaire (objet + message) et liste « Mes demandes » avec statut, tirer pour rafraîchir |
| `hooks/use-assistance.ts`, `styles/assistance.styles.ts` (nouveaux) | Données et styles (suivent le thème) |
| `components/detail-header.tsx` | Le menu « Assistance » ouvre l'écran (avant : simple message d'alerte) |
| `app/_layout.tsx`, `constants/api.ts` | Écran déclaré, endpoint `ASSISTANCES` |
| `app/(tabs)/notifications/index.tsx` | Icône et couleur déduites du message (paiement, formation, message, alerte) |

---

## 11. Lot 3 : protection des documents

### 11.1 Décisions prises avec le porteur du projet

- Les fichiers ne sont plus accessibles sans connexion ni sans droit, **en gardant les mêmes URL**
  (le moins de code possible à changer côté web et mobile).
- **Filigrane** « IMTECH INFO · Nom · e-mail · date » sur les documents consultés (web et mobile),
  ajouté par le serveur au moment de l'envoi.
- **Supports de cours limités aux PDF et aux images** (PNG, JPEG, WEBP, GIF).
- **Mobile** : supports ouverts dans un lecteur intégré (WebView) au lieu du navigateur, captures
  d'écran et enregistrements bloqués dans ce lecteur.
- **Pas de consultation hors ligne** pour l'instant (reportée : demande un stockage chiffré).

### 11.2 Faille corrigée

| Faille | Avant | Après |
|---|---|---|
| Fichiers uploadés (`/api/etudiants`, `/api/documents`, `/api/supports`, `/api/utilisateurs`) | Servis par `express.static` **sans authentification** : une URL suffisait pour télécharger une copie de CIN ou un support | Connexion obligatoire (token en en-tête ou `?token=`), session active, droits vérifiés par dossier ; `Cache-Control: no-store` |
| Supports | Un étudiant pouvait ouvrir le support de n'importe quelle formation | Uniquement ceux des formations où il est inscrit |
| Pièces des étudiants | Visibles par tous | Accueil / Super Admin, ou l'étudiant pour ses propres pièces |
| Mobile | Support ouvert dans le navigateur : téléchargeable et partageable | Lecteur intégré sans téléchargement, captures bloquées |

### 11.3 Backend

| Fichier | Contenu |
|---|---|
| `middlewares/fichierMiddleware.js` (nouveau) | Remplace `express.static` : vérifie que le fichier existe (sinon la requête continue vers les routes `/supports/:id`...), le token, les droits par dossier, puis envoie le fichier filigrané. Protégé contre `../` |
| `utils/filigrane.js` (nouveau) | Filigrane répété en diagonale : PDF avec `pdf-lib`, images avec `sharp`. Le fichier sur disque n'est pas modifié. Pas de filigrane sur les fiches, factures et attestations générées (documents officiels remis à l'étudiant) ni sur les photos de profil |
| `models/fichierModel.js` (nouveau) | `etudiantPeutVoirSupport` (inscription à la formation du support), `estPieceDeLEtudiant` |
| `middlewares/authMiddleware.js` | `verifyFileToken` : comme `verifyToken`, mais accepte aussi le token dans l'URL (réservé aux fichiers) ; logique commune dans `authentifier` |
| `middlewares/docUpload.js` | Option `types` + message d'erreur clair (400) quand un type est refusé ; `TYPES_SUPPORT` = PDF + images |
| `routes/routes.js` | Upload des supports limité à `TYPES_SUPPORT` |
| `app.js` | `servirFichiers(...)` à la place des 4 `express.static` |
| `package.json` | Dépendances `pdf-lib` et `sharp` |
| `tests/fichiers.test.js` (nouveau) | +8 tests (48 au total, tous verts) |

### 11.4 Web

| Fichier | Changements |
|---|---|
| `utils/api.js` | `fileUrl` ajoute `?token=...` : tous les liens et images de fichiers restent fonctionnels sans toucher aux pages |
| `utils/files.js` | `getFileUrl` passe par `fileUrl` (utilise `VITE_URL_BASE` au lieu de `http://localhost:3000` écrit en dur) |
| `pages/documents/Documents.jsx` | Le sélecteur « Ajouter un support » n'accepte plus que PDF et images |

### 11.5 Mobile

| Fichier | Changements |
|---|---|
| `app/lecteur.tsx` (nouveau) | Lecteur sécurisé : WebView, PDF rendu avec pdf.js, image affichée directement ; pas de téléchargement, d'appui long ni de navigation ; pas de cache ; captures bloquées (`preventScreenCaptureAsync`). Dans la version navigateur d'Expo (où la WebView n'existe pas), le même contenu est affiché dans une `<iframe>`, sans blocage des captures |
| `hooks/use-doc-detail.ts` | `ouvrirFichier` ouvre le lecteur (avant : `Linking.openURL` vers le navigateur) |
| `utils/api.ts` | Copie du token en mémoire (`getTokenEnMemoire`) pour les fonctions synchrones |
| `utils/format.ts` | `getFileUrl` ajoute `?token=...` (photos de profil et supports) |
| `app/_layout.tsx` | Écran `lecteur` déclaré |
| `package.json` | `react-native-webview`, `expo-screen-capture` (compatibles Expo Go) |

### 11.6 Limites connues

- **Web** : un navigateur ne permet pas de bloquer les captures d'écran ; le filigrane permet
  d'identifier la personne en cas de fuite.
- **Photo de l'écran avec un autre téléphone** : impossible à empêcher, d'où le filigrane.
- **Token dans l'URL des fichiers** : il peut apparaître dans l'historique du navigateur. Il est
  révoqué à la déconnexion. Amélioration possible : des liens signés de quelques minutes.
- Le lecteur mobile charge **pdf.js depuis un CDN** : il faut une connexion internet.
- Les supports déjà publiés dans un autre format (Word, PowerPoint...) restent consultables, mais
  sans filigrane et ne s'affichent pas dans le lecteur mobile (message « type non pris en charge »).
- Si un PDF est illisible pour `pdf-lib` (PDF corrompu), il est servi **sans filigrane** plutôt
  que bloqué (un message est écrit dans les logs du serveur).

---

## 12. Lot 4 : présence automatique et nouvelle note d'attestation

*10/10/2026* — remplace le barème du lot 2 (§10).

### 12.1 Décisions

| Sujet | Décision |
|---|---|
| Note d'attestation | Sur **20** = note système **/10** (paiement + présence) + présentation **/10** (formateur) |
| Paiement | **5** si régulier (aucune échéance due payée en retard, date d'envoi), sinon **2** |
| Présence | **+2** sous la moitié des jours de cours, **+3** à partir de la moitié, **+5** si présent jusqu'à 2 semaines (14 jours) avant la fin |
| Présence automatique | Un étudiant est présent un jour dès qu'il utilise l'application ce jour-là |
| Jours de cours | Du lundi au vendredi entre la date d'inscription et la fin (`duree_jours`), week-ends comptés sur les vraies dates (90 jours → 65 jours de cours si début un lundi) |
| Présentation | Libre, de 0 à 10 ; au-delà, le système refuse avec « Vous devez attribuer une note de 10 au maximum » |
| Attestation | Refusée (409) tant que le formateur n'a pas noté la présentation |
| Commentaires / réactions | Ne comptent plus dans la note |

### 12.2 Base de données — `migrations/004_presence_note_attestation.sql`

| Élément | Rôle |
|---|---|
| Table `presence` (`id_utilisateur`, `jour`, `UNIQUE`) | Un jour de présence par étudiant ; reprise de l'historique depuis `sessions.cree_le` |
| `inscription.note_suggeree` | Désormais la note système **/10** |
| `inscription.nb_presences` (nouveau) | Jours de présence au dernier calcul |
| `inscription.note_presentation` | Renommée depuis `note_attestation` ; note du formateur **/10** |
| `inscription.criteres_atteints` | Supprimée |
| Anciennes notes | Remises à `NULL` (elles étaient sur 20) |

`base.sql` est mis à jour de la même façon pour une installation neuve.

Pourquoi pas seulement la table `sessions` : une session n'est créée qu'à la connexion et dure
24 h ; un étudiant resté connecté d'un jour sur l'autre ne serait pas compté présent le lendemain.

### 12.3 Backend

| Fichier | Changements |
|---|---|
| `models/presenceModel.js` (nouveau) | `marquerPresence` : `INSERT IGNORE` du jour courant, mémorisé en mémoire pour ne faire qu'une requête par étudiant et par jour |
| `middlewares/authMiddleware.js` | Après vérification de la session, marque l'étudiant présent (sans attendre ; une erreur est seulement journalisée) |
| `models/classementModel.js` | Requête : date de début, durée, présences du lundi au vendredi pendant la formation, échéances en retard ; enregistre `note_suggeree` et `nb_presences` ; `setNotePresentation` |
| `services/classementService.js` | `joursOuvres`, `POINTS_PAIEMENT`, `POINTS_PRESENCE`, `calculerClassement` (note système, note finale, rang), `definirNote` borné à 0–10 |
| `controllers/classementController.js` | Lit `note_presentation` dans le body |
| `models/documentModel.js` | Note de l'attestation = `note_suggeree + note_presentation` |
| `services/documentService.js` | Refus (409) si la présentation n'est pas notée |
| `tests/classement.test.js` | Réécrit : jours de cours, points de paiement et de présence, note système, note finale, rang |
| `tests/autorisations.test.js`, `tests/fichiers.test.js` | Note bornée à 10, présence marquée pour un étudiant et pas pour le personnel ; présence simulée (pas de base) |

**49 tests, tous verts.**

### 12.4 Web

| Fichier | Changements |
|---|---|
| `components/classement/ClassementFormation.jsx` | Colonnes : rang, jours présents / jours de cours, points paiement et présence, note système /10, saisie de la présentation /10 (bouton Effacer), note finale /20 ; contrôle « 10 au maximum » avant l'envoi |
| `hooks/useClassement.js` | Envoie `note_presentation`, recalcule la note finale affichée |

ESLint : 0 erreur.

### 12.5 À faire de ton côté

1. Exécuter `backend-imtech/migrations/004_presence_note_attestation.sql` sur la base locale.
2. Relancer le backend, puis demander aux formateurs de noter la présentation avant d'envoyer les
   attestations.

### 12.6 Limites

- « Présent » = a utilisé l'application ce jour-là, pas une présence physique en cours.
- Les jours fériés sont comptés comme jours de cours.
- Les présences antérieures à la migration ne sont connues que par les jours de connexion
  (`sessions.cree_le`).

---

## 13. Lot 5 : envoi programmé des supports

*10/10/2026*

### 13.1 Décisions

| Sujet | Décision |
|---|---|
| Programmation | Le formateur choisit une date et une heure d'envoi lors du dépôt ; sans date, envoi immédiat comme avant |
| Brouillon | Un support programmé est invisible pour les étudiants et modifiable (titre, heure, fichier), envoyable tout de suite ou supprimable, jusqu'à son envoi |
| Annonce | 1 h avant : « *Prénom Nom* va envoyer le support « X » dans la formation Y dans une heure (le JJ/MM à HH:MM) » aux étudiants inscrits |
| Envoi | À l'heure prévue, automatiquement : « Le support « X » a été envoyé dans la formation Y. » aux étudiants inscrits **et** au formateur |
| Envoi immédiat | Les étudiants inscrits reçoivent aussi « Le support … a été envoyé … » (avant : aucune notification) |
| Canal | Notifications in-app (cloche du web, page Notifications du mobile) |

### 13.2 Base de données — `migrations/005_support_programme.sql`

| Élément | Rôle |
|---|---|
| `support.statut` (`programme` / `publie`, défaut `publie`) | Brouillon ou visible ; les supports existants restent publiés |
| `support.date_envoi_prevue` | Heure de publication automatique |
| `support.annonce_envoyee` | L'annonce « dans une heure » est partie (une seule fois) |
| Index `idx_support_programme (statut, date_envoi_prevue)` | Recherche rapide par le planificateur |

`base.sql` est mis à jour de la même façon.

### 13.3 Backend

| Fichier | Changements |
|---|---|
| `services/supportProgrammeService.js` (nouveau) | Planificateur (chaque minute, une vérification à la fois) : publie les supports arrivés à l'heure, annonce ceux qui partent dans moins d'une heure ; textes des notifications ; `formatDelai` (« dans une heure », « dans 20 minutes ») |
| `models/supportModel.js` | `STATUTS_SUPPORT` ; listes et détail limités aux supports publiés ; `getSupportsProgrammes`, `getSupportProgramme`, `getSupportsAAnnoncer`, `getSupportsAPublier`, `updateSupportProgramme` (l'annonce repart si l'heure change), `marquerAnnonceEnvoyee` et `publierSupport` (réussissent une seule fois : pas de doublon), `getIdsUtilisateursInscrits`, `getSupportPourSuppression` |
| `services/supportService.js` | `lireDateEnvoi` (valide, dans le futur), création programmée ou immédiate (+ notification), `listerSupportsProgrammes`, `modifierSupportProgramme` (auteur ou Super Admin, 409 si déjà envoyé), `envoyerMaintenant` ; la suppression fonctionne aussi sur un brouillon |
| `controllers/supportController.js`, `routes/routes.js` | `GET /supports/programmes`, `PUT /supports/:id`, `POST /supports/:id/envoyer` ; `date_envoi_prevue` acceptée par `POST /supports` |
| `models/fichierModel.js` | Un étudiant ne peut pas ouvrir le fichier d'un support programmé |
| `app.js` | Démarre le planificateur avec le serveur |
| `tests/supportProgramme.test.js` (nouveau) | +6 tests : annonce, envoi automatique, pas de doublon, validation de la date, droits sur les brouillons |

**55 tests, tous verts.**

### 13.4 Web

| Fichier | Changements |
|---|---|
| `pages/formateur/AccueilFormateur.jsx` + `.css` | Formulaire de dépôt : case « Programmer l'envoi » + date et heure, bouton « Envoyer maintenant » / « Programmer l'envoi » (avant : envoi dès le choix du fichier) ; panneau des supports programmés |
| `components/support/SupportsProgrammes.jsx` + `.css` (nouveaux) | Liste des brouillons : heure d'envoi, « étudiants prévenus », boutons Modifier (titre, heure, fichier), Envoyer maintenant, Supprimer |
| `hooks/useSupport.js` | `getSupportsProgrammes`, `updateSupportProgramme`, `envoyerSupport` |
| `utils/time.js` | `formatDateHeureLocale`, `toDatetimeLocal` |

ESLint : 0 erreur ; `vite build` OK. Le mobile n'a pas besoin de changement : l'API ne lui
renvoie que les supports publiés, et les notifications s'affichent dans la page existante.

### 13.5 À faire de ton côté

1. Exécuter `backend-imtech/migrations/005_support_programme.sql`.
2. Relancer le backend (le planificateur démarre avec lui ; message « 📚 Supports programmés… »
   dans la console à chaque envoi ou annonce).
3. Tester : programmer un support dans 2 minutes → l'annonce « dans 2 minutes » arrive à la
   vérification suivante, puis l'envoi ; vérifier que l'étudiant ne le voit pas avant.

### 13.6 Limites

- Notifications **in-app** seulement : un étudiant qui n'ouvre pas l'application ne voit l'annonce
  qu'à sa prochaine visite (piste : notifications push).
- Précision d'environ **une minute** (fréquence du planificateur).
- Si l'heure est repoussée après l'annonce, aucun message « reporté » n'est envoyé : une nouvelle
  annonce part une heure avant la nouvelle heure.
- Un fichier remplacé dans un brouillon reste sur le disque (comme les supports supprimés).

---

## 14. Lot 6 : fil de discussion, réaction « Je n'aime pas » et avis sur les formateurs

*10/10/2026*

### 14.1 Décisions

| Sujet | Décision |
|---|---|
| Commentaires | Comme sur les réseaux sociaux : commentaire principal + « Voir les N réponses » ; un seul niveau de réponses (répondre à une réponse la rattache au même commentaire principal, avec « @Prénom Nom ») |
| Affichage web | 3 commentaires principaux, puis « Voir plus de commentaires » |
| Notification | L'auteur d'un commentaire est prévenu quand on lui répond |
| Réaction 👎 | Nouveau type `dislike` (« Je n'aime pas ») |
| Avis formateurs | Tableau de bord (Super Admin, Accueil) : compétent si ≥ 5 réactions et ≥ 60 % positives (👍 ❤️ 💡), non compétent sinon, « pas assez d'avis » sous 5 réactions — seuils à ajuster si besoin |

### 14.2 Base de données — `migrations/006_reponses_dislike.sql`

| Élément | Rôle |
|---|---|
| `commentaire.id_parent` (FK vers `commentaire`, `ON DELETE CASCADE`) + index | `NULL` = commentaire principal, sinon réponse |
| `type_reaction` : ligne `dislike` / 👎 | Réaction négative (ajoutée seulement si elle n'existe pas) |

`base.sql` et `donneesTest.sql` mis à jour.

### 14.3 Backend

| Fichier | Changements |
|---|---|
| `models/commentaireModel.js` | `id_support`, `id_parent` renvoyés ; `getCommentaireParent` (support + auteur du commentaire visé) ; `insertCommentaire` avec `idParent` |
| `services/commentaireService.js` | `construireFil` (fonction pure : principaux du plus récent au plus ancien, réponses chronologiques, `nb_reponses`) ; réponse vérifiée (même support) et rattachée au principal ; notification de réponse |
| `services/notifService.js` | `notifierReponse` |
| `controllers/commentaireController.js` | `id_parent` accepté |
| `models/reactionModel.js` | `getTypeReaction` (par nom ou id), `getReactionsParFormateur` (supports publiés, réactions par type) |
| `services/reactionService.js` | Type résolu par son nom, réaction refusée sur un support non publié ; `evaluerFormateurs` (fonction pure : % positif, avis, tri) |
| `controllers/reactionController.js`, `routes/routes.js` | `type_reaction` accepté ; `GET /formateurs/avis` (Super Admin, Accueil) |
| `tests/commentairesReactions.test.js` (nouveau), `tests/autorisations.test.js` | +8 tests |

**63 tests, tous verts.**

### 14.4 Web

| Fichier | Changements |
|---|---|
| `components/support/SupportItem.jsx` + `.css` | Fil de discussion : « Répondre » sur chaque commentaire, formulaire de réponse sous le commentaire principal, « Voir les N réponses / Masquer », « Voir plus de commentaires » ; bouton 👎 ; compteur par réaction |
| `components/dashboard/AvisFormateurs.jsx` + `.css`, `hooks/useAvisFormateurs.js` (nouveaux) | Tableau : formateur, supports, 👍 ❤️ 💡 👎, % positif, badge Compétent / Non compétent / Pas assez d'avis ; filtre par avis, tri par réaction |
| `components/dashboard/DashboardContent.jsx` | Affiche le panneau d'avis |
| `hooks/useReaction.js`, `hooks/useSupport.js` | Réaction envoyée par son nom ; `idParent` pour répondre |

ESLint : 0 erreur ; `vite build` OK.

### 14.5 Mobile

| Fichier | Changements |
|---|---|
| `components/comment/commentaire-block.tsx` | Réponses repliées sous le commentaire principal (« Voir les N réponses »), réponses en retrait ; `ReponseBanniere` « Réponse à X » avec annulation |
| `hooks/use-doc-detail.ts` | `reponseA` / `annulerReponse` ; la réponse est envoyée avec `id_parent` ; `nbEchanges` compte aussi les réponses |
| `hooks/use-support.ts` | Type `Commentaire` : `id_parent`, `reponses`, `nb_reponses` ; `createCommentaire(…, idParent)` |
| `hooks/use-reaction.ts` | Type 👎 ajouté ; réaction envoyée par son nom |
| `app/(tabs)/documents/[id].tsx`, `app/(tabs)/formations/[id].tsx` | Bandeau de réponse, placeholder « Écrire une réponse… », nombre d'échanges |
| `styles/components/commentaire-block.styles.ts` | Styles des réponses et du bandeau |

`tsc --noEmit` OK, ESLint : 0 erreur.

### 14.6 À faire de ton côté

1. Exécuter `backend-imtech/migrations/006_reponses_dislike.sql`.
2. Relancer le backend, le web et Expo.
3. Tester : répondre à un commentaire (web et mobile), répondre à une réponse, « Voir les réponses »,
   réagir 👎, puis ouvrir le tableau de bord (Accueil) → panneau « Avis des étudiants sur les formateurs ».

### 14.7 Limites

- L'avis repose uniquement sur les réactions : un étudiant peut réagir sans avoir lu le support,
  et les réactions du personnel comptent aussi.
- Pas de « Voir plus » sur le mobile pour les commentaires principaux (tous affichés ; seules les
  réponses sont repliées).

---

## 15. Lot 7 : vitrine publique et inscription en ligne

*10/10/2026*

### 15.1 Décisions

| Sujet | Décision |
|---|---|
| Vitrine | Premier écran du mobile sans connexion (façon Wattpad) : formations en couvertures, formateurs compétents, engagement, contacts Facebook / e-mail / WhatsApp |
| Engagement du formateur | Texte par formation (`formation.engagement_formateur`), saisi dans le back-office ; texte par défaut sinon |
| Inscription | Depuis la fiche d'une formation (« S'inscrire ») ou plusieurs à la fois (« + » sur les couvertures puis « S'inscrire ») |
| Méthode | Comme l'Accueil : compte + dossier, puis pour chaque formation inscription + échéancier (même fonction), premier paiement déclaré **en attente** |
| Validation | Par l'Accueil, inscription par inscription, depuis la liste (badge et filtre « En ligne », paiement déclaré affiché) |
| Accès aux cours | Connexion possible tout de suite ; fichiers des supports seulement après validation |
| Pièces du dossier | Pas demandées en ligne : complétées par l'Accueil |
| Anti-abus | 5 inscriptions en ligne par heure et par adresse IP |

### 15.2 Base de données — `migrations/007_vitrine_inscription_en_ligne.sql`

| Élément | Rôle |
|---|---|
| `formation.engagement_formateur` (TEXT) | Disponibilité promise par le formateur, affichée dans la vitrine |
| `inscription.origine` (`accueil` / `en_ligne`) | Distingue les inscriptions faites en ligne |

`base.sql` mis à jour.

### 15.3 Backend

| Fichier | Changements |
|---|---|
| `config/vitrine.js` (nouveau) | Contacts et présentation lus dans `.env` (`IMTECH_FACEBOOK_URL`, `IMTECH_EMAIL`, `IMTECH_WHATSAPP`, `IMTECH_TELEPHONE`, `IMTECH_ADRESSE`, `IMTECH_SLOGAN`, `IMTECH_DESCRIPTION`) ; engagement par défaut |
| `models/vitrineModel.js` (nouveau) | Formations publiques (formateur, nombre d'inscrits), modes de paiement |
| `services/vitrineService.js` (nouveau) | `contenuVitrine` ; `verifierDemande` ; `inscriptionEnLigne` : une transaction, compte + dossier, boucle sur les formations avec `creerInscriptionDans`, premier paiement en attente ; notifications Accueil et étudiant |
| `controllers/vitrineController.js` (nouveau), `routes/routes.js` | `GET /public/vitrine`, `POST /public/inscriptions` |
| `middlewares/limiteRequetes.js` (nouveau) | Limite de requêtes par IP (429) |
| `services/inscriptionService.js` | `creerInscriptionDans` (partagée Accueil / en ligne) ; `validerInscription` valide le paiement déclaré s'il existe |
| `models/inscriptionModel.js` | `origine` ; liste avec `reference_declaree` et `montant_declare` |
| `models/paiementModel.js` | `getPaiementEnAttenteEcheance`, `validerPaiementDeclare` ; `changerStatutPaiementEnAttente` accepte une transaction |
| `models/formationModel.js`, `services/formationService.js`, `controllers/formationController.js` | `engagement_formateur` |
| `models/fichierModel.js` | Supports réservés aux inscriptions **validées** |
| `models/etudiantModel.js` | `valide` renvoyé dans les formations de l'étudiant |
| `.env.example` | Variables de la vitrine |
| `tests/vitrine.test.js` (nouveau) | +6 tests |

**69 tests, tous verts.**

### 15.4 Web (back-office)

| Fichier | Changements |
|---|---|
| `pages/inscriptions/Inscriptions.jsx` + `.css` | Badge « En ligne », paiement déclaré (montant, référence) sous le statut, filtre « Origine » |
| `components/paiements/PaymentFormModal.jsx` | Validation d'une inscription en ligne : rappel du paiement déclaré, référence déclarée pré-remplie |
| `pages/formations/FormationForm.jsx` | Champ « Engagement du formateur (vitrine) » |

ESLint : 0 erreur ; `vite build` OK.

### 15.5 Mobile

| Fichier | Changements |
|---|---|
| `app/decouvrir.tsx` (nouveau) | Vitrine : bandeau, carrousel de formations, formateurs les mieux notés, engagement, contacts, barre « N formation(s) choisie(s) · S'inscrire » |
| `components/vitrine/formation-detail-modal.tsx` (nouveau) | Fiche d'une formation (feuille du bas) |
| `components/vitrine/inscription-modal.tsx` (nouveau) | Inscription : formations + tranches, informations, mot de passe, premier paiement (mode, référence), confirmation puis « Se connecter » |
| `components/vitrine/format-vitrine.ts`, `styles/vitrine.styles.ts`, `hooks/use-vitrine.ts` (nouveaux) | Formats, styles, appels à l'API |
| `app/index.tsx`, `app/_layout.tsx`, `app/login.tsx` | Sans session : ouverture sur la vitrine ; lien « Pas encore inscrit ? Découvrir nos formations » ; e-mail pré-rempli après inscription |
| `components/formation/carte-formation.tsx`, `hooks/use-formation.ts` | « En attente de validation par l'accueil » sur une formation non validée |
| `constants/api.ts` | Routes publiques |

`tsc --noEmit` OK, ESLint : 0 erreur.

### 15.6 À faire de ton côté

1. Exécuter `backend-imtech/migrations/007_vitrine_inscription_en_ligne.sql`.
2. **Renseigner les contacts réels** d'IMTECH INFO dans `backend-imtech/.env` (voir `.env.example`) :
   lien Facebook, e-mail, numéro WhatsApp au format 2613XXXXXXXX.
3. Dans le back-office, remplir « Engagement du formateur » pour chaque formation.
4. Relancer le backend, le web et Expo, se déconnecter du mobile → la vitrine s'affiche ;
   s'inscrire à 2 formations, puis valider les 2 inscriptions depuis Inscriptions (filtre « En ligne »).

### 15.7 Limites

- Pas de vérification de l'adresse e-mail (pas de code de confirmation).
- Un étudiant déjà inscrit ne peut pas encore ajouter une formation depuis l'application : il passe par l'Accueil.
- Les photos des formateurs ne sont pas affichées dans la vitrine (fichiers protégés par connexion) : initiales à la place.
- Le montant affiché avant l'envoi est une estimation (tarif / tranches) ; le montant exact, calculé par l'échéancier, est affiché après l'envoi.

---

## 16. Mise à jour de la base locale — `alter2.sql`

*10/10/2026*

Erreur au démarrage du backend : `Vérification des supports programmés échouée : Unknown column 's.statut'`.
Cause : les migrations 004 à 007 n'avaient pas été exécutées sur la base locale (le code était correct).

| Fichier | Rôle |
|---|---|
| `backend-imtech/alter2.sql` (nouveau) | Regroupe **toutes** les évolutions du schéma, blocs **001 à 007** dans l'ordre (commentaires, statut des paiements, assistance, présence et note /20, supports programmés, réponses et « Je n'aime pas », vitrine et inscription en ligne). Chaque bloc s'exécute **une seule fois**. |
| `backend-imtech/migrations/` | **Supprimé** : son contenu est dans `alter2.sql`. Les prochaines évolutions s'ajoutent à la fin de `alter2.sql` (bloc 008, 009...). |

Blocs 004 à 007 exécutés sur `gestion_formation_db` (001 à 003 l'étaient déjà) : table `presence` créée (4 jours repris depuis `sessions`),
`support.statut`, `commentaire.id_parent`, `formation.engagement_formateur`, `inscription.origine`
ajoutés ; réaction `dislike` créée. Les notes système des inscriptions existantes ont été remises à zéro
(prévu par la migration 004 : elles étaient calculées sur 20 avec l'ancien barème).

---

## 17. Tableau « Avis des étudiants sur les formateurs » (web)

*10/10/2026*

Le tableau n'utilisait pas le composant `Tableau` : il s'affichait sans style. Il reprend maintenant
la présentation de la page Paiements.

| Fichier | Changements |
|---|---|
| `components/dashboard/AvisFormateurs.jsx` | Composants communs `Tableau` et `SearchFilterBar` (recherche d'un formateur, filtre Avis, tri, Réinitialiser). Colonnes : rang, formateur (photo, nom, nombre de supports), réactions en pastilles 👍 ❤️ 💡 👎, total, % positif avec barre de progression (vert ≥ 60 %, orange ≥ 40 %, rouge en dessous), badge d'avis. Nouveaux tris : nombre de réactions, nombre de supports |
| `components/dashboard/AvisFormateurs.css` | Styles des pastilles, de la barre de progression, du rang ; badges aux couleurs des statuts de paiement |

ESLint : 0 erreur ; `vite build` OK.

---

## 18. Remise à zéro et nouvelles données de démonstration

*10/10/2026*

### 18.1 Décisions

| Sujet | Décision |
|---|---|
| Remise à zéro | `reinit.sql` **vide** les tables (TRUNCATE) au lieu de les supprimer : la structure reste, pas besoin de relancer `base.sql` |
| Mot de passe | `admin123` pour tous les comptes |
| Photos de profil | Vraies photos téléchargées sur randomuser.me (portraits libres pour les tests) |
| Adresses e-mail | Domaine `.test` (réservé) sauf le Super Admin : aucun e-mail de test chez une vraie personne |
| Dates | Relatives au jour d'exécution : les retards et les échéances restent réalistes |

### 18.2 Fichiers

| Fichier | Changements |
|---|---|
| `backend-imtech/reinit.sql` | Réécrit : `SET FOREIGN_KEY_CHECKS = 0`, TRUNCATE des **25** tables (compteurs remis à 1). L'ancien script (`DROP TABLE`) oubliait `presence` et échouait sur `utilisateur` |
| `backend-imtech/donneesTest.sql` | Réécrit : 19 comptes (1 Super Admin, 2 Accueil, 4 formateurs, 12 étudiants), 6 formations, 17 inscriptions, 31 échéances (même calcul que `calculerEcheancier`), 19 paiements, 11 supports, 27 réactions, 11 commentaires, 5 mentions, 5 demandes d'assistance, 18 notifications, ~200 jours de présence |
| `backend-imtech/scripts/fichiersDemo.js` (nouveau) | Télécharge les photos de profil, crée les pièces du dossier (photo, CIN et certificat de résidence factices) et génère les supports PDF (pdfkit) et une image (sharp). Relançable : garde les fichiers existants |

### 18.3 Vérifications

- Les 19 mots de passe correspondent à `admin123` (bcrypt) ; les 74 fichiers référencés en base existent.
- Avis calculés par `reactionService.avisFormateurs` : Tiana 92 % et Voahangy 83 % « Compétent »,
  Hery 33 % « Non compétent », Lalaina 3 réactions « Pas assez d'avis ».
- API réelle : connexion d'un étudiant, ouverture de sa photo, de sa CIN et d'un support de sa
  formation (filigrane ajouté) ; support d'une autre formation refusé (403).

### 18.4 Remarques

- Les anciens fichiers de `uploads/` (avant la remise à zéro) n'ont pas été supprimés : ils ne sont
  plus référencés en base. Les fichiers de démonstration commencent par `demo-`.
- Factures et attestations ne sont pas pré-remplies : elles se génèrent depuis l'application.

---

## 19. Fiche étudiant (web) : documents repoussés par une longue description

*10/10/2026*

Avec les nouvelles données de démonstration (descriptions de formation longues), la liste des
documents de la fiche étudiant partait très loin à droite.

Causes : le composant `Tableau` interdit le retour à la ligne (`white-space: nowrap`), donc la
colonne Description élargissait tout le tableau ; et la règle `.detail-layout` de
`WorkspacePages.css` (`1fr 1.5fr`, sans `minmax(0, …)`) laissait la colonne grandir avec son contenu.

| Fichier | Changements |
|---|---|
| `web/src/pages/etudiants/EtudiantDetail.jsx` | Description rendue dans un `<span>` limité à 2 lignes, texte complet au survol (`title`) |
| `web/src/pages/etudiants/Etudiants.css` | Colonnes de la fiche fixées (`.etudiant-page .detail-layout`, `min-width: 0`), cellule Description entre 180 et 320 px avec retour à la ligne, une seule colonne sous 900 px conservée |

ESLint : 0 erreur ; `vite build` OK.

---

## 20. Mode sombre : lecteur et détail d'un support (mobile)

*10/10/2026*

En mode sombre, le lecteur de documents gardait un fond gris clair autour du PDF ou de l'image, et
l'écran « Détail du support » avait des icônes en couleurs fixes (bleu foncé sur fond sombre, peu lisibles).

| Fichier | Changements |
|---|---|
| `mobile/src/app/lecteur.tsx` | Le fond de la page HTML affichée dans la WebView (`#E5E7EB` en dur) prend `palette.pageBg` : `styleCommun(fond)`, `pagePdf(url, fond)`, `pageImage(url, fond)`. Les pages du PDF restent blanches |
| `mobile/src/app/(tabs)/documents/[id].tsx` | Couleurs en dur remplacées par la palette du thème : chargement et lien de téléchargement (`accent`), pièce jointe (`danger`), icône commentaires et texte indicatif (`textMuted`), bouton envoyer (`onAccent`) |

`tsc --noEmit` OK, ESLint : 0 erreur.

---

## 21. Aperçu d'un document (web) : barre du haut non assombrie

*10/10/2026*

Sur la fiche étudiant, cliquer sur la miniature d'une pièce du dossier ouvre un aperçu sur un voile
sombre. La barre du haut (`components/header`) restait affichée **par-dessus** le voile, claire,
alors que tout le reste de la page était assombri.

Cause : la barre du haut est collante (`position: sticky`) avec `z-index: 100`, le voile de l'aperçu
n'avait que `z-index: 30`.

| Fichier | Changements |
|---|---|
| `web/src/components/doc/DocumentAffichage.css` | `.document-lightbox` : `z-index: 9999`, comme `Modal` et `ImageLightBox` |
