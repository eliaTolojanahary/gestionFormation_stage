# Aide-mémoire Node.js / JavaScript / Express

Syntaxe et motifs courants, pour écrire du code sans IA. Exemples dans le style du projet
(voir aussi [`../CHEAT-SHEET.md`](../CHEAT-SHEET.md) pour le projet lui-même).

---

## 1. Variables et types

```js
const taux = 0.2;            // ne sera pas réassignée (à préférer)
let total = 0;               // sera réassignée
// var : ancienne syntaxe, à éviter

typeof 'abc'      // 'string'    typeof 12      // 'number'
typeof true       // 'boolean'   typeof {}      // 'object'
typeof []         // 'object'  → Array.isArray([]) // true
typeof null       // 'object' (piège historique)   typeof undefined // 'undefined'

Number('12.5')    // 12.5        parseInt('12px', 10) // 12
String(12)        // '12'        Boolean('')          // false
Number.isNaN(Number('abc'))      // true
```

**Valeurs « fausses »** : `false`, `0`, `''`, `null`, `undefined`, `NaN`. Tout le reste est vrai.

```js
a === b          // égalité stricte (toujours utiliser === et !==)
a ?? 'défaut'    // si a est null ou undefined
a || 'défaut'    // si a est faux (attention : 0 et '' aussi)
user?.role       // undefined au lieu d'une erreur si user est null
user?.adresse?.ville
```

---

## 2. Fonctions

```js
// Déclaration (utilisable avant sa ligne)
function addition(a, b) {
  return a + b;
}

// Fléchée
const carre = (x) => x * x;                  // retour implicite
const creer = (nom) => ({ nom, etat: true }); // renvoyer un objet : parenthèses
const log = () => { console.log('ok'); };    // bloc : return explicite

// Paramètres par défaut, objet en paramètre (lisible à l'appel)
function lister({ page = 1, limite = 20, recherche } = {}) {
  return { page, limite, recherche };
}
lister({ recherche: 'rabe' });

// Reste / étalement
function somme(...nombres) { return nombres.reduce((s, n) => s + n, 0); }
somme(1, 2, 3);
Math.max(...[4, 9, 2]);

// Fonction qui renvoie une fonction (fermeture) — ex. middlewares
function limiter(max) {
  let compteur = 0;              // gardé entre les appels
  return () => ++compteur <= max;
}
const essai = limiter(3);
essai(); essai(); essai(); essai(); // true true true false

// Fonction en paramètre (callback)
[3, 1, 2].sort((a, b) => a - b);   // [1, 2, 3]
```

**Bonnes pratiques** : une fonction = une tâche ; nom en verbe (`calculerEcheancier`,
`listerPaiements`) ; renvoyer tôt pour les cas d'erreur :
```js
function prixRemise(prix, remise) {
  if (prix <= 0) throw new Error('Prix invalide.');
  if (!remise) return prix;
  return prix * (1 - remise);
}
```

---

## 3. Objets

```js
const etudiant = { nom: 'Rabe', prenom: 'Toky', age: 22 };

etudiant.nom                     // lire
etudiant['prenom']               // lire avec une clé dynamique
etudiant.email = 'a@b.mg';       // ajouter / modifier (même avec const)
delete etudiant.age;

const { nom, prenom: p, ville = 'Tana' } = etudiant;  // déstructuration (+ renommage, défaut)
const copie = { ...etudiant, actif: true };           // copie + modification
const fusion = { ...a, ...b };                        // b écrase a

Object.keys(obj)       // ['nom', 'prenom']
Object.values(obj)     // ['Rabe', 'Toky']
Object.entries(obj)    // [['nom','Rabe'], ['prenom','Toky']]
Object.freeze(obj)     // constantes (ex. ROLES)
JSON.stringify(obj)    // objet → texte
JSON.parse(texte)      // texte → objet (try/catch si le texte peut être invalide)

const cle = 'statut';
const filtre = { [cle]: 'valide' };   // clé calculée
```

---

## 4. Tableaux

```js
const notes = [12, 15, 9];

notes.length                     notes[0]          notes.at(-1)   // dernier
notes.push(18)    // ajoute à la fin      notes.pop()     // retire le dernier
notes.unshift(5)  // ajoute au début      notes.shift()   // retire le premier
notes.includes(15)               notes.indexOf(15)          // -1 si absent
notes.slice(0, 2) // copie partielle      notes.splice(1, 1) // retire (modifie !)
[...notes]        // copie                [...a, ...b]       // concaténer

// Les plus utiles (ne modifient pas le tableau d'origine)
notes.map((n) => n * 2)                       // transformer chaque élément
notes.filter((n) => n >= 10)                  // garder ceux qui passent
notes.find((n) => n > 10)                     // premier trouvé, ou undefined
notes.findIndex((n) => n > 10)
notes.some((n) => n < 10)                     // au moins un ?
notes.every((n) => n >= 0)                    // tous ?
notes.reduce((somme, n) => somme + n, 0)      // réduire à une valeur
notes.forEach((n, i) => console.log(i, n))    // parcourir (pas de valeur renvoyée)

// Trier (sort MODIFIE : copier avant)
[...notes].sort((a, b) => a - b)              // croissant
[...etudiants].sort((a, b) => a.nom.localeCompare(b.nom))

// Grouper
const parFormation = paiements.reduce((acc, p) => {
  (acc[p.id_formation] ||= []).push(p);
  return acc;
}, {});

// Sans doublon
[...new Set([1, 1, 2])]   // [1, 2]

// Boucles
for (const n of notes) { /* valeurs */ }
for (const [cle, valeur] of Object.entries(obj)) { }
for (let i = 0; i < notes.length; i++) { }
```

---

## 5. Chaînes, nombres, dates

```js
const t = `Bonjour ${prenom}, vous devez ${montant} MGA`;   // gabarit
s.trim()   s.toLowerCase()   s.toUpperCase()
s.includes('web')   s.startsWith('http')   s.endsWith('.pdf')
s.split(',')        ['a', 'b'].join(', ')
s.replace(/\s+/g, ' ')        s.slice(0, 100)     s.padStart(2, '0')
s.normalize('NFD').replace(/[̀-ͯ]/g, '')  // retirer les accents

(1234.5).toFixed(2)                       // '1234.50'
Math.round(x)  Math.floor(x)  Math.ceil(x)  Math.min(a, b)  Math.max(a, b)
Math.round(x * 100) / 100                 // arrondi à 2 décimales
new Intl.NumberFormat('fr-FR').format(150000)   // '150 000'

const maintenant = new Date();
const d = new Date('2026-10-11');
d.getFullYear()  d.getMonth() /* 0 = janvier */  d.getDate()  d.getDay() /* 0 = dimanche */
d.toISOString()                           // '2026-10-11T00:00:00.000Z'
d.toLocaleDateString('fr-FR')             // '11/10/2026'
const demain = new Date(d); demain.setDate(d.getDate() + 1);
const jours = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));   // écart en jours
```

---

## 6. Asynchrone : promesses, async / await

```js
// Une fonction async renvoie toujours une promesse
async function charger(id) {
  const etudiant = await etudiantModel.getEtudiantById(id);  // attend le résultat
  if (!etudiant) throw notFound('Étudiant introuvable.');
  return etudiant;
}

// Gérer l'erreur
try {
  const e = await charger(3);
} catch (error) {
  console.error(error.message);
} finally {
  // toujours exécuté
}

// En parallèle (plus rapide que deux await à la suite)
const [lignes, total] = await Promise.all([model.lister(f), model.compter(f)]);
await Promise.allSettled([...])     // n'échoue pas si une promesse échoue

// Attendre / répéter
setTimeout(() => { /* une fois dans 1 s */ }, 1000);
const id = setInterval(() => { /* toutes les heures */ }, 60 * 60 * 1000);
clearInterval(id);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await pause(500);
```
**Pièges** : oublier `await` (on récupère une promesse au lieu de la valeur) ; `await` dans un
`forEach` n'attend pas → utiliser `for…of` ou `Promise.all(liste.map(async …))`.

---

## 7. Classes et erreurs

```js
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
throw new AppError(409, 'Paiement déjà traité.');

class Compteur {
  #valeur = 0;                         // champ privé
  incrementer() { return ++this.#valeur; }
  static creer() { return new Compteur(); }
}
```

---

## 8. Modules

```js
// CommonJS (backend du projet)
const express = require('express');
const { ROLES } = require('../config/roles');
module.exports = { listerPaiements, recupererPaiement };

// ES modules (web React, mobile)
import { useState } from 'react';
import Pagination from './Pagination';
export function numerosDePages() {}
export default Pagination;
```

---

## 9. Modules intégrés de Node

```js
require('dotenv').config();            // lit le fichier .env
process.env.PORT                       // variable d'environnement (toujours une chaîne)

const path = require('path');
path.join(__dirname, 'uploads', nom)   // chemin sûr (Windows / Linux)
path.extname('cours.pdf')              // '.pdf'
path.basename('/a/b/cours.pdf')        // 'cours.pdf'

const fs = require('fs/promises');
await fs.readFile(chemin, 'utf8');     await fs.writeFile(chemin, texte);
await fs.unlink(chemin);               // supprimer un fichier
await fs.mkdir(dossier, { recursive: true });

const crypto = require('crypto');
crypto.randomBytes(32).toString('hex') // code aléatoire (reset de mot de passe)
crypto.randomUUID()                    // identifiant unique (attestation)
```

---

## 10. npm

```bash
npm init -y                     # créer package.json
npm install express             # dépendance
npm install -D nodemon          # dépendance de développement
npm uninstall paquet
npm run dev                     # script "dev" de package.json
npm test                        # script "test"
npm outdated                    # versions en retard
npx outil                       # lancer un outil sans l'installer
```
`package.json` → `"scripts": { "dev": "nodemon app.js", "test": "node --test \"tests/**/*.test.js\"" }`.
`node_modules/` ne se commite jamais ; `package-lock.json` oui.

---

## 11. Express

```js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());                      // autoriser le web / mobile à appeler l'API
app.use(express.json());              // lire le JSON des requêtes (req.body)
app.use('/api', require('./routes/routes'));

// Gestionnaire d'erreurs : 4 paramètres, déclaré EN DERNIER
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ status: 'error', message: status === 500 ? 'Erreur serveur.' : err.message });
});

app.listen(process.env.PORT || 3000, () => console.log('API démarrée'));
```

**Routes**
```js
const router = express.Router();
router.get('/formations', lister);               // lire
router.get('/formations/:id', detail);           // req.params.id
router.post('/formations', creer);               // req.body
router.put('/formations/:id', modifier);
router.delete('/formations/:id', supprimer);
router.get('/x', middleware1, middleware2, controller);   // chaîne de fonctions
module.exports = router;
```
⚠️ Ordre : `/supports/programmes` doit être déclarée **avant** `/supports/:id`.

**Requête / réponse**
```js
req.params   req.query   req.body   req.headers.authorization   req.ip   req.file / req.files
res.json(data)                        res.status(201).json(data)
res.status(204).end()                 res.download(chemin)   res.sendFile(chemin)
res.setHeader('Cache-Control', 'no-store')
```

**Middleware** (s'exécute avant le controller ; appelle `next()` pour continuer)
```js
function checkRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) throw new AppError(403, 'Accès refusé.');
    next();
  };
}
```
Avec Express 5, une erreur levée dans une fonction `async` part toute seule au gestionnaire
d'erreurs (pas besoin de `try/catch` dans chaque controller).

**Upload (multer)**
```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/supports', limits: { fileSize: 50 * 1024 * 1024 } });
router.post('/supports', upload.single('fichier'), creerSupport);     // req.file
router.post('/etudiants', upload.fields([{ name: 'photo_1' }, { name: 'photo_2' }]), creer); // req.files
```

---

## 12. Authentification : bcrypt et JWT

```js
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash(motDePasse, 10);          // à l'inscription
const ok = await bcrypt.compare(motDePasse, hash);       // à la connexion

const jwt = require('jsonwebtoken');
const token = jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '24h' });
const payload = jwt.verify(token, process.env.JWT_SECRET);   // lève une erreur si invalide / expiré
// Client : en-tête  Authorization: Bearer <token>
const token2 = req.headers.authorization?.split(' ')[1];
```

---

## 13. MySQL depuis Node (mysql2)

```js
const mysql = require('mysql2/promise');
const db = mysql.createPool({ host, user, password, database, connectionLimit: 10 });

const [rows] = await db.query('SELECT * FROM formation WHERE id_formation = ?', [id]);
const [res] = await db.query('INSERT INTO formation (nom, tarif) VALUES (?, ?)', [nom, tarif]);
res.insertId;  res.affectedRows;
```
**Toujours des `?`** (jamais `'... WHERE id = ' + id`) : sinon injection SQL.
Plusieurs valeurs : `WHERE id IN (?)` avec `[[1, 2, 3]]`.

---

## 14. E-mail (nodemailer)

```js
const nodemailer = require('nodemailer');
const transporteur = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }, // mot de passe d'application
});
await transporteur.sendMail({ from: process.env.EMAIL_USER, to, subject, html,
  attachments: [{ filename: 'facture.pdf', path: chemin }] });
```

---

## 15. Tests (node:test)

```js
const { test, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

test('calcule la somme exacte des tranches', () => {
  const tranches = calculerEcheancier(100000, 3);
  assert.equal(tranches.reduce((s, t) => s + t.montant, 0), 100000);
});

test('refuse un paiement déjà traité', async () => {
  mock.method(paiementModel, 'getPaiementById', async () => ({ statut: 'valide' }));
  await assert.rejects(() => validerPaiement(1), { status: 409 });
});
afterEach(() => mock.restoreAll());
```
`assert.equal`, `assert.deepEqual` (objets / tableaux), `assert.ok(valeur)`, `assert.match(texte, /regex/)`,
`assert.throws(fn)`, `assert.rejects(asyncFn)`. Lancer : `node --test` ou `npm test`.

---

## 16. Déboguer

```js
console.log('valeur :', x);       console.table(liste);      console.error(err);
console.log(JSON.stringify(obj, null, 2));   // objet lisible
```
- `node --inspect app.js` puis `chrome://inspect` : points d'arrêt dans Chrome.
- Lire la **pile d'erreur** de bas en haut jusqu'à la première ligne de **son** code (fichier:ligne).

| Erreur | Signification |
|---|---|
| `Cannot read properties of undefined (reading 'x')` | L'objet avant `.x` n'existe pas → vérifier / `?.` |
| `x is not a function` | Mauvais import, ou faute de nom |
| `Cannot find module` | Chemin du `require` faux, ou `npm install` oublié |
| `EADDRINUSE` | Port déjà utilisé |
| `UnhandledPromiseRejection` | `await` sans `try/catch` en dehors d'Express |
| `ER_PARSE_ERROR` | Faute de syntaxe SQL |
