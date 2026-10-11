# Cheat sheet IMTECH INFO — React, Node, MySQL

Aide-mémoire pour travailler **sans IA** (panne, démo, question du jury) : démarrer, retrouver
où se trouve quoi, ajouter une fonctionnalité dans le style du projet, interroger la base, dépanner.

> Le front du projet est en **React** (web, avec Vite) et **React Native / Expo** (mobile), pas en
> Vue. Le fonctionnement complet est dans [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md).
>
> Aide-mémoires généraux de syntaxe (créer une fonction, un composant, une requête…) :
> [`cheat-sheets/node.md`](cheat-sheets/node.md) · [`cheat-sheets/react.md`](cheat-sheets/react.md) (+ React Native) · [`cheat-sheets/mysql.md`](cheat-sheets/mysql.md)

---

## 1. Démarrer / arrêter

| Quoi | Commande (dans le dossier) | Adresse |
|---|---|---|
| Backend (rechargement auto) | `cd backend-imtech` → `npm run dev` | <http://localhost:3000/api> |
| Backend (sans rechargement) | `npm start` | idem |
| Web | `cd web` → `npm run dev` | <http://localhost:5173> |
| Mobile | `cd mobile` → `npx expo start` (puis QR code avec Expo Go) | port 8081 |
| Mobile, cache vidé | `npx expo start -c` | |
| Tests backend | `cd backend-imtech` → `npm test` | 101 tests, sans base |
| Lint / build web | `cd web` → `npx eslint src` · `npx vite build` | |
| Vérif mobile | `cd mobile` → `npx tsc --noEmit` · `npx expo lint` | |
| Arrêter un serveur | `Ctrl + C` dans son terminal | |
| Installer les dépendances | `npm install` (dans chaque dossier, après un `git clone`) | |

**Fichiers `.env`** (jamais commités ; modèles dans `.env.example`) :

| Dossier | Variables essentielles |
|---|---|
| `backend-imtech/.env` | `PORT=3000`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=gestion_formation_db`, **`JWT_SECRET`** (obligatoire), `EMAIL_USER`, `EMAIL_PASSWORD` (mot de passe d'application Gmail) |
| `web/.env` | `VITE_URL_BASE=http://localhost:3000/api` |
| `mobile/.env` | `EXPO_PUBLIC_API_URL=http://<IP du PC>:3000/api` (optionnel : sinon l'IP est déduite d'Expo) |

Générer un `JWT_SECRET` : `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
IP du PC (pour le téléphone) : `ipconfig` → « Adresse IPv4 » de la carte Wi-Fi.

**Base de démo** (mot de passe de tous les comptes : `admin123`) :
```bash
cd backend-imtech
mysql -u root -p < reinit.sql         # vide toutes les tables
mysql -u root -p < donneesTest.sql    # recharge les données
node scripts/fichiersDemo.js          # photos, pièces, supports PDF
```
Comptes : `tljelia374@gmail.com` (Super Admin), `hanitra.rasoanaivo@imtech.test` (Accueil),
`tiana.randrianarisoa@imtech.test` (Formateur), `toky.ravelojaona@imtech.test` (Étudiant).

---

## 2. Où est quoi

```
Requête :  Page / écran  →  hook (apiRequest)  →  routes.js  →  middlewares  →  controller  →  service  →  model  →  MySQL
           web/src/pages    web/src/hooks         (rôles)       auth, upload    lit req      règles      SQL ?
           mobile/src/app   mobile/src/hooks
```

| Je cherche… | Fichier |
|---|---|
| Une route de l'API et ses rôles | `backend-imtech/routes/routes.js` (liste lisible : `backend-imtech/api.md`) |
| Ce que fait une route | `controllers/xxxController.js` → `services/xxxService.js` (règles) → `models/xxxModel.js` (SQL) |
| Vérification du token / du rôle / du propriétaire | `middlewares/authMiddleware.js` (`verifyToken`, `checkRole`, `exigerEtudiantProprietaire`, `exigerSoiOuAdmin`) |
| Upload de fichiers | `middlewares/docUpload.js` (multer) ; fichiers dans `backend-imtech/uploads/<dossier>/` |
| Accès protégé aux fichiers + filigrane | `middlewares/fichierMiddleware.js`, `utils/filigrane.js` |
| Erreurs HTTP | `utils/errors.js` (`badRequest`, `notFound`, `forbidden`, `conflict`, `exigerChamps`) |
| Transaction SQL | `utils/transaction.js` (`avecTransaction`) |
| Pagination / recherche `LIKE` | `utils/pagination.js` |
| Limite d'essais (429) | `middlewares/limiteRequetes.js` |
| Noms des rôles | `config/roles.js` (`ROLES.ETUDIANT` = `'Étudiant'`, avec accent) |
| Connexion MySQL | `config/db.js` (pool, lit le `.env`) |
| Schéma de la base | `base.sql` ; évolutions : **`alter2.sql`** (blocs numérotés) |
| Menu et pages par rôle (web) | `web/src/utils/navigation.js` (`NAVIGATION`, `peutOuvrir`, `CHEMINS`) |
| Routes du web | `web/src/App.jsx` (connexion), `pages/dashboard/DashboardLayout.jsx` (pages), `pages/dashboard/SectionsRoutes.jsx` (fiches) |
| Appel API web / mobile | `web/src/utils/api.js`, `mobile/src/utils/api.ts` (`apiRequest`) ; chemins mobile : `mobile/src/constants/api.ts` (`ENDPOINTS`) |
| Écrans mobiles | `mobile/src/app/` (Expo Router : un fichier = un écran ; `(tabs)/` = barre du bas) |
| Thème mobile | `mobile/src/context/SettingsContext.tsx`, styles dans `mobile/src/styles/` |

---

## 3. Ajouter une fonctionnalité de bout en bout (dans le style du projet)

Exemple : « l'Accueil peut **archiver** une demande d'assistance ».

**① Base** — nouveau bloc à la **fin** de `alter2.sql` (et la même colonne dans `base.sql`) :
```sql
-- ============================================
-- MIGRATION 011 : archivage des demandes d'assistance
-- ============================================
USE gestion_formation_db;
ALTER TABLE assistance ADD COLUMN archivee BOOLEAN NOT NULL DEFAULT FALSE;
```
Exécuter **seulement ce bloc** sur la base existante (copier-coller dans MySQL Workbench ou le client `mysql`).

**② Model** (`models/assistanceModel.js`) — SQL seulement, toujours avec des `?` :
```js
async function archiverAssistance(id_assistance) {
  const [result] = await db.query(
    'UPDATE assistance SET archivee = true WHERE id_assistance = ? AND etat = true',
    [id_assistance]
  );
  return result.affectedRows; // 0 = rien trouvé
}
module.exports = { /* …existants… */ archiverAssistance };
```

**③ Service** (`services/assistanceService.js`) — les règles et les erreurs :
```js
const { notFound, conflict } = require('../utils/errors');

async function archiverDemande(id) {
  const demande = await assistanceModel.getAssistanceById(id);
  if (!demande) throw notFound('Demande introuvable.');           // → 404
  if (demande.statut !== 'Résolu') throw conflict('Résolvez la demande avant de l\'archiver.'); // → 409
  await assistanceModel.archiverAssistance(id);
  return assistanceModel.getAssistanceById(id);
}
```

**④ Controller** (`controllers/assistanceController.js`) — lit la requête, répond en JSON. Pas de
`try/catch` : Express 5 transmet les erreurs des fonctions `async` au gestionnaire unique (`app.js`).
```js
// PUT /assistances/:id/archiver (personnel)
async function archiverAssistanceController(req, res) {
  const demande = await assistanceService.archiverDemande(req.params.id);
  res.json({ status: 'success', message: 'Demande archivée.', data: demande });
}
```

**⑤ Route** (`routes/routes.js`) :
```js
router.put('/assistances/:id/archiver', staff, assistance.archiverAssistanceController);
// staff = [verifyToken, checkRole(Super Admin, Accueil)] ; sinon roles(FORMATEUR), roles(...TOUS)…
```
Puis ajouter la ligne dans `api.md`.

**⑥ Test** (`tests/xxx.test.js`, voir §7) → `npm test`.

**⑦ Web** — fonction dans le hook (`web/src/hooks/useAssistance.js`) puis bouton dans la page :
```js
async function archiverDemande(id) {
  const result = await apiRequest(`/assistances/${id}/archiver`, { method: 'PUT' })
  setDemandes((liste) => liste.map((d) => (d.id_assistance === id ? result.data : d)))
  return result.data
}
```
```jsx
<button className="secondary-button" type="button" onClick={() => archiverDemande(d.id_assistance)}>
  Archiver
</button>
```

**⑧ Doc** : flux (§6 tableau de la page, §7 règle, §12.2 historique) + un scénario dans `SCENARIOS-TESTS.md`.

---

## 4. Node / Express

```js
// Dans un controller
req.params.id        // /assistances/:id
req.query.page       // ?page=2 (toujours une chaîne : Number(req.query.page))
req.body.email       // JSON envoyé (POST / PUT)
req.file / req.files // fichier(s) envoyé(s) par multer
req.user             // { id, role, id_etudiant } : posé par verifyToken (token JWT)

res.json({ status: 'success', data })          // 200
res.status(201).json({ status: 'success', data }) // créé
throw badRequest('Message clair.')             // 400 ; aussi notFound, forbidden, conflict
exigerChamps(req.body, ['objet', 'contenu'])   // 400 si un champ manque
```

**Transaction** (plusieurs écritures liées : tout ou rien) :
```js
const { avecTransaction } = require('../utils/transaction');
return avecTransaction(async (connection) => {
  const [r] = await connection.query('INSERT INTO inscription (...) VALUES (?, ?)', [a, b]);
  await connection.query('INSERT INTO echeance (...) VALUES (?, ?)', [r.insertId, x]);
  return r.insertId; // une erreur → ROLLBACK automatique
});
```

**Lire le résultat de `db.query`** (mysql2) :
```js
const [rows] = await db.query('SELECT … WHERE id = ?', [id]);   // tableau de lignes
const ligne = rows[0];                                            // ou undefined
const [result] = await db.query('INSERT …', [...]);               // result.insertId
const [r2] = await db.query('UPDATE …', [...]);                   // r2.affectedRows
const [[{ total }]] = await db.query('SELECT COUNT(*) AS total …'); // une valeur
```

**Rappels JavaScript**
```js
const { nom, prenom = '' } = objet;          // déstructuration + valeur par défaut
const copie = { ...objet, etat: false };     // copie modifiée
liste.map((x) => x.id)                       // transformer
liste.filter((x) => x.actif)                 // filtrer
liste.find((x) => x.id === id)               // premier trouvé (ou undefined)
liste.reduce((somme, p) => somme + Number(p.montant), 0) // total
await Promise.all([f1(), f2()])              // en parallèle
user?.role                                   // pas d'erreur si user est null
valeur ?? 'défaut'                           // seulement si null / undefined
`Bonjour ${prenom}`                          // gabarit de texte
```
Les montants `DECIMAL` reviennent de MySQL en **chaîne** : `Number(p.montant)` avant de calculer.

---

## 5. React (web)

**Composant + état + chargement** (le motif de tous les hooks du projet) :
```jsx
import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

function MaPage() {
  const [lignes, setLignes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let annule = false                      // évite de modifier l'état d'une page quittée
    apiRequest('/assistances')
      .then((r) => { if (!annule) setLignes(r.data || []) })
      .catch((e) => { if (!annule) setError(e.message) })
      .finally(() => { if (!annule) setIsLoading(false) })
    return () => { annule = true }
  }, [])                                    // [] = une seule fois au montage

  if (isLoading) return <p>Chargement…</p>
  return (
    <>
      {error && <div className="form-message error" role="alert">{error}</div>}
      <ul>{lignes.map((l) => <li key={l.id_assistance}>{l.objet}</li>)}</ul>
    </>
  )
}
```

| Besoin | Code |
|---|---|
| Appel API (token ajouté tout seul) | `apiRequest('/route', { method: 'POST', body: JSON.stringify(data) })` |
| Envoyer un fichier | `const fd = new FormData(); fd.append('fichier', file);` puis `apiRequest('/supports', { method: 'POST', body: fd })` |
| Champ de formulaire | `<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />` |
| Valeur calculée | `const total = useMemo(() => lignes.length, [lignes])` |
| Aller vers une page | `const navigate = useNavigate(); navigate(CHEMINS.etudiant(12))` |
| Lire `:id` de l'adresse | `const { id } = useParams()` |
| Rediriger | `<Navigate to="/dashboard" replace />` |
| Liste paginée par le serveur | `const liste = useListePaginee('/paiements', { recherche, statut })` → `liste.lignes`, `liste.page`, `liste.setPage`, `liste.recharger()` |
| Pied de pagination | `<Pagination page={liste.page} pages={liste.pages} total={liste.total} limite={liste.limite} onChange={liste.setPage} />` |
| Ajouter une page au menu | une ligne dans `NAVIGATION` (`utils/navigation.js`) + une `<Route>` dans `DashboardLayout.jsx` |
| Couleurs | toujours `var(--accent)`, `var(--success)`, `var(--danger)`, `var(--on-accent)` (jamais de `#xxxxxx` en dur : sinon le mode sombre casse) |

---

## 6. React Native / Expo (mobile)

| Besoin | Code |
|---|---|
| Ouvrir un écran | `const router = useRouter(); router.push('/paiements')` |
| Écran avec paramètre | `router.push({ pathname: '/(tabs)/documents/[id]', params: { id: String(id) } })` |
| Lire le paramètre | `const { id } = useLocalSearchParams<{ id: string }>()` |
| Retour sûr | `router.canGoBack() ? router.back() : router.replace('/(tabs)')` |
| Appel API | `apiRequest(ENDPOINTS.PAIEMENTS)` (ajouter le chemin dans `constants/api.ts`) |
| Utilisateur connecté | `const { user } = useAuth()` (`user.id_etudiant`) |
| Styles selon le thème | `const styles = useThemedStyles(createXxxStyles)` ; `const { palette } = useSettings()` → `palette.accent` |
| Texte / bloc / bouton | `<Text>`, `<View>`, `<TouchableOpacity onPress={…}>` (pas de `<div>` ni `<p>`) |
| Liste qui défile | `<ScrollView>` (court) ou `<FlatList data={…} renderItem={…} keyExtractor={…} />` (long) |
| Fenêtre | `<Modal visible={ouvert} animationType="slide" onRequestClose={fermer}>` |

Nouvel écran = nouveau fichier dans `mobile/src/app/` (ex. `app/historique.tsx` → `router.push('/historique')`).

---

## 7. Tests backend (`node:test`)

```js
require('./setup');                                  // JWT_SECRET de test, pas de vraie base
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const assistanceModel = require('../models/assistanceModel');
const { archiverDemande } = require('../services/assistanceService');

afterEach(() => mock.restoreAll());

test('archiver : refusé si la demande n\'est pas résolue', async () => {
  mock.method(assistanceModel, 'getAssistanceById', async () => ({ id_assistance: 1, statut: 'En attente' }));
  await assert.rejects(() => archiverDemande(1), { status: 409 });
});
```
`mock.method(objet, 'fonction', faux)` remplace une fonction du model : le test ne touche jamais MySQL.
Lancer un seul fichier : `node --test tests/recherche.test.js`.

---

## 8. MySQL

**Se connecter** : `mysql -u root -p` puis `USE gestion_formation_db;` (ou MySQL Workbench).

**Tables** : `role`, `utilisateur`, `sessions`, `etudiant`, `formation`, `inscription`, `tranche`,
`echeance`, `paiement`, `mode_paiement`, `facture`, `attestation`, `document_administratif`,
`support`, `commentaire`, `commentaire_mention`, `reaction`, `type_reaction`, `assistance`, `statut`,
`notification_inapp`, `notification_email`, `reset_password`, `alerte_envoyee`, `presence`,
`parametre_application`.
Conventions : `etat = false` = supprimé (suppression logique) ; `paiement.statut` = `en_attente` /
`valide` / `refuse` ; seuls les paiements **validés** comptent dans les montants.

**Commandes de base**
```sql
SHOW TABLES;                 DESCRIBE paiement;
SELECT * FROM formation WHERE etat = true ORDER BY nom LIMIT 20 OFFSET 0;
SELECT COUNT(*) FROM paiement WHERE statut = 'en_attente';
SELECT f.nom, COUNT(i.id_inscription) AS inscrits
FROM formation f LEFT JOIN inscription i ON i.id_formation = f.id_formation AND i.etat = true
GROUP BY f.id_formation ORDER BY inscrits DESC;
START TRANSACTION; UPDATE …; ROLLBACK;   -- essayer sans rien casser (COMMIT pour garder)
```

**Requêtes utiles en démo / dépannage**
```sql
-- Comptes et rôles
SELECT u.id_utilisateur, u.email, r.nom AS role, u.etat
FROM utilisateur u JOIN role r ON r.id_role = u.id_role ORDER BY r.nom;

-- Réactiver un compte désactivé
UPDATE utilisateur SET etat = true WHERE email = 'x@imtech.test';

-- Sessions actives d'un compte (déconnecter de force : actif = 0)
SELECT id_session, user_agent, ip, cree_le, expire_le FROM sessions
WHERE id_utilisateur = 2 AND actif = 1;
UPDATE sessions SET actif = 0 WHERE id_utilisateur = 2;

-- Paiements en attente avec l'étudiant
SELECT p.id_paiement, u.prenom, u.nom, p.montant, p.date_paiement
FROM paiement p
JOIN echeance e ON e.id_echeance = p.id_echeance
JOIN inscription i ON i.id_inscription = e.id_inscription
JOIN etudiant et ON et.id_etudiant = i.id_etudiant
JOIN utilisateur u ON u.id_utilisateur = et.id_utilisateur
WHERE p.statut = 'en_attente' AND p.etat = true;

-- Échéances en retard (sans paiement envoyé suffisant)
SELECT e.id_echeance, e.date_echeance, e.montant_prevu FROM echeance e
WHERE e.etat = true AND e.date_echeance < CURDATE()
  AND e.montant_prevu > (SELECT COALESCE(SUM(p.montant), 0) FROM paiement p
                         WHERE p.id_echeance = e.id_echeance AND p.etat = true AND p.statut <> 'refuse');

-- Présences d'un étudiant (une ligne par jour d'utilisation)
SELECT jour FROM presence WHERE id_utilisateur = 10 ORDER BY jour DESC;

-- Code « mot de passe oublié » (si l'e-mail n'arrive pas)
SELECT token, date_expiration, utilise FROM reset_password ORDER BY date_creation DESC LIMIT 1;
```

**Changer un mot de passe à la main** (il est haché avec bcrypt, jamais en clair) :
```bash
cd backend-imtech
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```
```sql
UPDATE utilisateur SET mot_de_passe = '<hash affiché>' WHERE email = 'x@imtech.test';
```

**Modifier le schéma** : jamais directement « pour voir » → un bloc numéroté à la fin de
`alter2.sql` + même changement dans `base.sql` ; nouvelle table → l'ajouter aussi dans `reinit.sql`.

---

## 9. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Backend : `JWT_SECRET manquant` | `.env` absent ou incomplet | Copier `.env.example` en `.env`, remplir `JWT_SECRET` |
| `ER_ACCESS_DENIED_ERROR` | Mauvais utilisateur / mot de passe MySQL | Corriger `DB_USER` / `DB_PASSWORD` |
| `ER_BAD_DB_ERROR` | Base pas créée | `mysql -u root -p < base.sql` puis `donneesTest.sql` |
| `ER_BAD_FIELD_ERROR` / `Unknown column` | Bloc de `alter2.sql` pas exécuté | Exécuter le bloc manquant |
| `EADDRINUSE :3000` | Backend déjà lancé ailleurs | Fermer l'autre terminal (ou `npx kill-port 3000`) |
| Web : « Failed to fetch » | Backend arrêté, ou `VITE_URL_BASE` faux | Lancer le backend ; vérifier `web/.env` puis relancer `npm run dev` |
| Mobile : « Network request failed » | Téléphone pas sur le même Wi-Fi, IP changée, pare-feu | Même Wi-Fi ; `ipconfig` ; autoriser le port 3000 dans le pare-feu Windows ; `npx expo start -c` |
| 401 partout | Session expirée ou révoquée | Se reconnecter |
| 403 | Mauvais rôle, ou données d'un autre | Normal : vérifier le compte utilisé |
| 429 « Trop de tentatives » | Limite d'essais atteinte | Attendre 15 min ou **redémarrer le backend** (compteurs en mémoire) |
| E-mails non reçus | `EMAIL_USER` / `EMAIL_PASSWORD` faux | Mot de passe d'application Gmail ; en démo, lire le code dans `reset_password` (§8) |
| Images / PDF absents en démo | Fichiers de démo pas générés | `node scripts/fichiersDemo.js` |
| Page blanche (web) | Erreur JavaScript | Console du navigateur (F12) : le message indique fichier et ligne |
| Modif non visible (mobile) | Cache Metro | `npx expo start -c`, ou secouer le téléphone → Reload |
| Données de démo « périmées » | Dates relatives au jour du chargement | Recharger la base (§1) le jour de la démo |

Lire une erreur : backend → terminal du `npm run dev` ; web → console F12 + onglet Réseau (statut et
réponse JSON de la requête) ; mobile → terminal d'Expo.

---

## 10. Git (commits faits soi-même)

```bash
git status                       # ce qui a changé
git diff fichier                 # le détail d'un fichier
git add -A                       # tout préparer (y compris les suppressions)
git commit -m "feat(web): ..."   # feat = nouveauté, fix = correction, refactor, docs
git log --oneline -10            # derniers commits
git restore fichier              # annuler ses modifs non commitées sur un fichier (définitif !)
git show <commit>:chemin         # revoir un fichier tel qu'il était dans un commit
```

---

## 11. Codes HTTP du projet

| Code | Sens | Exemple |
|---|---|---|
| 200 / 201 | OK / créé | Liste, enregistrement |
| 400 | Requête invalide | Champ manquant, montant supérieur au reste |
| 401 | Non connecté | Token absent, expiré ou session révoquée |
| 403 | Interdit | Mauvais rôle, données d'un autre |
| 404 | Introuvable | Id inexistant (ou paiement d'un autre étudiant) |
| 409 | Conflit | Déjà validé, déjà payé, e-mail déjà utilisé |
| 429 | Trop de requêtes | Essais de connexion, inscription en ligne |
| 500 | Erreur serveur | Message générique ; détail dans le terminal du backend |
