# API REST IMTECH INFO

Liste de toutes les routes et de leurs droits. Le fonctionnement (quelle page appelle quelle route,
quelle fonction répond) est expliqué dans [`FLUX-APPLICATION.md`](../FLUX-APPLICATION.md) : parcours
A → Z (§4, « étape N » ci-dessous), autres modules (§5), tâches automatiques (§6), règles (§7).
Pour trouver le code d'une route : `routes/routes.js` → controller → service → model (flux §3).

Préfixe : `/api`. Toutes les routes sauf celles marquées **public** exigent l'en-tête
`Authorization: Bearer <token>` **et** une session active (un logout invalide réellement le token).

Rôles : **SA** = Super Admin, **AC** = Accueil, **FO** = Formateur, **ET** = Étudiant.

Format des réponses : `{ "status": "success", ... }` ou `{ "status": "error", "message": "..." }`.
Codes d'erreur (détail : flux §7) : 400 (champ manquant / invalide), 401 (non connecté / session révoquée),
403 (rôle ou propriétaire incorrect), 404 (introuvable), 409 (conflit : doublon, déjà traité),
429 (trop d'essais), 500.

---

## Comprendre une route et ses `?` (à lire en premier si tu découvres le projet)

Tu viens de récupérer le projet et tu vois des choses comme `/paiements?statut=en_attente&page=2`.
Cette partie explique, avec des mots simples, comment lire ces adresses, ce que fait le `?`, et
comment une demande voyage du bouton du site jusqu'à la base de données. Compte environ 1 heure.

### 1. Une route, c'est une adresse de guichet

Le serveur est comme une administration avec beaucoup de guichets. Chaque **route** est l'adresse
d'un guichet. Exemple complet :

```
GET  http://localhost:3000/api/paiements?statut=en_attente&page=2&limite=10
───  ─────────────────────  ───  ─────────  ──────────────────────────────────
 1            2              3       4                     5
```

| N° | Partie | Ce que c'est | Exemple de comparaison |
|---|---|---|---|
| 1 | **Méthode** | Ce qu'on veut faire : `GET` lire, `POST` créer, `PUT` modifier, `DELETE` désactiver | « Je viens consulter » ou « je viens déposer » |
| 2 | **Adresse du serveur** | Le PC où tourne l'API (port `3000`). Sur le téléphone : l'IP du PC | L'adresse du bâtiment |
| 3 | **`/api`** | Préfixe ajouté à toutes les routes (`app.js` : `app.use('/api', …)`) | L'étage |
| 4 | **Chemin** | Le guichet : `/paiements`. Il peut contenir un `:id` (voir plus bas) | Le numéro du bureau |
| 5 | **Après le `?`** | Des **options** : filtrer, chercher, découper en pages. Toujours facultatives | « Montrez-moi seulement ceux en attente, page 2 » |

Dans les tableaux de ce document, on écrit seulement la méthode et le chemin (`GET /paiements`) :
l'adresse du serveur et `/api` sont sous-entendus.

### 2. Les 4 endroits où l'on peut mettre une information

Une demande peut porter des informations à 4 endroits. Le controller (le « guichetier ») les lit
chacun avec un nom différent :

| Où | Exemple | Lu dans le code avec | Sert à dire… | Obligatoire ? |
|---|---|---|---|---|
| Dans le chemin, `:id` | `/paiements/12` | `req.params.id` → `"12"` | **QUI** : un élément précis | Oui, sinon ce n'est pas la même route |
| Après le `?` | `?statut=en_attente` | `req.query.statut` → `"en_attente"` | **COMMENT** : trier, filtrer, découper une liste | Non, jamais |
| Dans le corps (JSON ou formulaire avec fichiers) | `{ "montant": 50000 }` | `req.body.montant` | **QUOI** : les données à enregistrer (`POST`, `PUT`) | Selon la route |
| Dans l'en-tête `Authorization` | `Bearer eyJhbGci…` | `req.user` (rempli par `verifyToken`) | **QUI DEMANDE** : l'utilisateur connecté et son rôle | Oui, sauf routes **public** |

Règle facile à retenir :
- `:id` = **un** élément (« le paiement n° 12 »). Sans lui, la route n'a pas de sens.
- `?…` = **une liste** qu'on veut voir autrement (« les paiements, mais seulement… »). Sans lui, la
  route marche quand même et donne le résultat par défaut.
- Corps = ce qu'on **envoie** pour créer ou modifier. Un `GET` n'a jamais de corps.
- On ne met **jamais** l'identité dans le `?` : « qui je suis » vient toujours du token. Un étudiant ne
  peut donc pas écrire `?id_etudiant=5` pour voir les paiements d'un autre : le serveur prend son
  numéro dans le token (`paiementService.listerPaiements`).

### 3. Comment s'écrit ce qui suit le `?`

```
/paiements ? statut=en_attente & recherche=andry & page=2 & limite=10
           │  ──────┬─────────   ──────┬───────   ──┬───   ────┬────
           │     nom=valeur         nom=valeur     ...        ...
           └ début des options        └ « & » sépare deux options
```

| Règle | Exemple |
|---|---|
| Le premier séparateur est `?`, les suivants sont `&` | `?page=2&limite=10` (et pas `?page=2?limite=10`) |
| L'ordre ne compte pas | `?limite=10&page=2` = `?page=2&limite=10` |
| Tout arrive en **texte** : le code doit convertir les nombres | `?page=2` donne `"2"` ; `lirePagination` fait `Number.parseInt(...)` |
| Espaces, accents et caractères spéciaux sont **encodés** | `?statut=En attente` part sous la forme `?statut=En%20attente` ; Express redonne `"En attente"` tout seul |
| Une option absente = la valeur par défaut | Pas de `?etat=` → `actif` ; pas de `?page=` → toute la liste |
| Une valeur inconnue est presque toujours ignorée | `?statut=bleu` sur `/echeances` → filtre ignoré (exception plus bas) |

Dans les tableaux de ce document :
- `?statut=VERT\|JAUNE\|ROUGE` veut dire « une seule de ces valeurs » (le `\|` se lit « ou »).
- `?debut=&fin=` veut dire « ces options existent, mets ta valeur après le `=` ».
- `?page=&limite=` et « paginable » veulent dire que la liste peut être découpée en pages.

### 4. Les familles de `?` du projet

Il n'y a pas 50 sortes d'options : presque toutes les routes réutilisent les mêmes. Chaque famille
est lue par une seule petite fonction dans `utils/`, appelée au début du controller.

| Famille | Options | Ce que ça fait | Lue par | Si la valeur est fausse |
|---|---|---|---|---|
| **Pages** | `?page=2&limite=10` | Donne la page 2, 10 lignes par page (10 par défaut, 100 max). La réponse ajoute `pagination: { page, limite, total, pages }` | `lirePagination` (`utils/pagination.js`) | Page < 1 → page 1 ; limite > 100 → 100 |
| **Curseur** (listes qu'on fait défiler) | `?limite=5&avant=87` | Donne les 5 éléments plus anciens que l'élément n° 87. La réponse donne `curseur.suivant` : le prochain `avant` à envoyer | `lireCurseur` | `avant` non numérique → depuis le début |
| **Actif / désactivé** | `?etat=actif\|inactif\|tous` | Les suppressions sont « logiques » (colonne `etat`) : on peut revoir et réactiver ce qui a été désactivé | `lireEtat` (`utils/etat.js`) | Toujours `actif` pour un étudiant ou un formateur, même s'il demande autre chose |
| **Recherche** | `?recherche=andry` (`?q=` pour `/recherche`) | Cherche dans nom, prénom, e-mail, téléphone, ou nom de formation | `texteRecherche` (`utils/pagination.js`) puis `utils/recherche.js` | Texte vide → pas de recherche ; coupé à 100 caractères |
| **Choix dans une liste** | `?statut=`, `?valide=oui\|non`, `?origine=`, `?dossier=`, `?type=`, `?tri=`, `?role=`, `?mode=` | Garde seulement les lignes qui ont cette valeur | Directement dans le controller (`['VERT','JAUNE','ROUGE'].includes(...)`) | Ignorée (voir l'exception plus bas) |
| **Période** | `?debut=2026-09-01&fin=2026-09-30` | Entre deux dates, **les deux incluses**, chacune facultative | `lirePeriode` (`utils/periode.js`) | **Erreur 400** : format autre que AAAA-MM-JJ, ou début après la fin |
| **Regroupement** | `?periode=quotidien\|hebdomadaire\|mensuel\|annuel` | Pour la courbe du tableau de bord (`/dashboard/evolution`) | `dashboardService` | Valeur par défaut |
| **Notifications** | `?limite=20&avant=<id>&apres=<id>&nonLues=1` | Plus anciennes (`avant`), nouvelles arrivées (`apres`), seulement non lues | `notifController` | **Erreur 400** si ce n'est pas un nombre entier positif |

**Pages ou curseur, pourquoi deux façons ?**
- **Pages** (`?page=`) : pour les **tableaux du site** avec des boutons « page 1, 2, 3 ». On veut connaître
  le total et sauter directement à la page 5.
- **Curseur** (`?avant=`) : pour les **fils qu'on fait défiler** sur le mobile (cours, commentaires).
  Si un nouveau commentaire arrive pendant que tu fais défiler, une page numérotée se décalerait
  d'une ligne (on verrait un commentaire en double). Avec « donne-moi ceux **avant** le n° 87 », rien
  ne se décale.

```
1ʳᵉ demande : GET /supports/4/commentaires?limite=5           → 5 commentaires, curseur.suivant = 87
2ᵉ demande  : GET /supports/4/commentaires?limite=5&avant=87  → 5 suivants,     curseur.suivant = 61
...
Dernière    :                                                  → curseur.suivant = null : c'est fini
```

**Sans aucun `?`**, une liste renvoie **tout** (plafonné à 10 000 lignes). Le mobile et le bouton
« Exporter en CSV » du site s'en servent. Le détail est juste en dessous (« Listes paginées »).

**Exception à connaître** : sur `/paiements`, `?statut=` n'est pas vérifié. Une valeur fausse
(`?statut=payé`) ne lève pas d'erreur mais renvoie une **liste vide**. Valeurs correctes :
`en_attente`, `valide`, `refuse`.

### 5. Une demande suivie de bout en bout

Situation : l'Accueil ouvre **Paiements** sur le site, choisit le statut « En attente » et tape
« andry » dans la recherche. Voici tout ce qui se passe, fichier par fichier.

**① La page prépare les filtres** — `web/src/pages/paiements/Paiements.jsx`
```js
const liste = useListePaginee('/paiements', {
  recherche: search.trim(),            // "andry"
  statut: CODE_STATUT[statutFilter] || '', // "en_attente"
  mode: '',                            // vide → ne sera pas envoyé
  etat: ETATS[etat],                   // "actif"
})
```

**② Le hook fabrique l'adresse avec le `?`** — `web/src/hooks/useListePaginee.js`
```js
const params = new URLSearchParams({ page: String(page), limite: String(limite) })
// on ajoute chaque filtre non vide
params.set('recherche', 'andry'); params.set('statut', 'en_attente'); params.set('etat', 'actif')
await apiRequest(`/paiements?${params}`)
// → GET /api/paiements?page=1&limite=10&recherche=andry&statut=en_attente&etat=actif
```
`URLSearchParams` s'occupe des `&` et de l'encodage des espaces et accents : on n'écrit jamais
l'adresse à la main. Le hook attend aussi 250 ms après la dernière touche tapée, pour ne pas envoyer
une demande par lettre.

**③ La route choisit le guichet et les vigiles** — `routes/routes.js`
```js
router.get('/paiements', roles(SUPER_ADMIN, ACCUEIL, ETUDIANT), paiement.listerPaiementsController);
```
Express compare seulement le **chemin** (`/paiements`). Tout ce qui suit le `?` ne change **pas** la
route choisie : `/paiements` et `/paiements?statut=valide` arrivent au même endroit.
`roles(...)` = `verifyToken` (le token est-il valide ?) puis `checkRole` (ce rôle a-t-il le droit ?).
Si non : 401 ou 403, et le controller n'est jamais appelé.

**④ Le controller lit le `?`** — `controllers/paiementController.js`
```js
const pagination = lirePagination(req.query);   // { page: 1, limite: 10, offset: 0 }
const filtres = {
  statut: req.query.statut || undefined,          // "en_attente"
  mode: texteRecherche(req.query.mode) || undefined,  // undefined
  recherche: texteRecherche(req.query.recherche),  // "andry"
  etat: lireEtat(req.query, req.user.role !== ROLES.ETUDIANT), // "actif"
};
```
`req.query` est un simple objet : `{ page: "1", limite: "10", recherche: "andry", statut: "en_attente", etat: "actif" }`.

**⑤ Le service applique les règles** — `services/paiementService.js`
Si c'est un étudiant, il ajoute de force `id_etudiant` = celui du token. Ensuite il lance **en même
temps** (`Promise.all`) : la page de lignes, le total (pour « page 1 sur 3 ») et le nombre de paiements
en attente (le badge rouge).

**⑥ Le model écrit le SQL** — `models/paiementModel.js` (`filtresPaiements`)
Chaque filtre reçu ajoute une condition. Le SQL final ressemble à :
```sql
SELECT ... FROM paiement p ...
WHERE p.etat = true
  AND p.statut = ?
  AND (i.id_etudiant IN (... MATCH(nom, prenom, email, telephone) AGAINST (?) ...)
       OR i.id_formation IN (SELECT ... WHERE nom LIKE ?))
ORDER BY p.date_paiement DESC, p.id_paiement DESC
LIMIT ? OFFSET ?
-- valeurs des ? : ['en_attente', '+andry*', '%andry%', 10, 0]
```

**⑦ La réponse revient**
```json
{
  "status": "success",
  "data": [ { "id_paiement": 31, "montant": "50000.00", "statut": "en_attente", "...": "..." } ],
  "pagination": { "page": 1, "limite": 10, "total": 3, "pages": 1 },
  "compteurs": { "en_attente": 7 }
}
```
Le hook range `data` dans le tableau, `pagination.pages` dans les boutons de page, et
`compteurs.en_attente` dans le badge.

### 6. Attention : trois `?` qui n'ont rien à voir

En lisant le code, tu verras des `?` partout. Ce n'est pas le même `?` :

| Où | Exemple | Sens |
|---|---|---|
| Dans une **adresse** (URL) | `/paiements?statut=valide` | Début des options de la demande (ce document) |
| Dans du **SQL** | `WHERE p.statut = ?` | Une case vide que MySQL remplit avec une valeur de la liste donnée à côté. On ne colle **jamais** le texte de l'utilisateur dans le SQL : c'est ce qui protège de l'injection SQL |
| Dans du **JavaScript** | `a ? b : c`, `req.body?.email`, `valeur ?? null` | « si… alors… sinon », « si l'objet existe », « sinon cette valeur » (flux §3, mots de syntaxe) |

### 7. Essayer toi-même

**Dans le navigateur** (routes **public** uniquement, il n'y a pas de token) :
```
http://localhost:3000/api/public/formations?page=1&limite=3
http://localhost:3000/api/public/formations?page=2&limite=3
```
Compare les deux réponses : ce sont les 3 formations suivantes.

**Dans Postman** (toutes les routes) :
1. `POST http://localhost:3000/api/auth/login` avec le corps `{ "email": "test123acceuil@gmail.com", "mot_de_passe": "admin123" }` ; copie le `token` reçu.
2. Nouvelle requête `GET http://localhost:3000/api/paiements`, onglet **Authorization** → *Bearer Token* → colle le token.
3. Onglet **Params** : ajoute `statut` = `en_attente`, puis `page` = `1`. Postman écrit lui-même le `?` et les `&` dans l'adresse.
4. Essaie aussi : `/echeances?statut=ROUGE`, `/inscriptions?valide=non`, `/dashboard/kpi?debut=2026-09-01&fin=2026-09-30`, puis `/dashboard/kpi?debut=01-09-2026` (erreur 400 attendue).

**En ligne de commande** (`curl`, mettre l'adresse entre guillemets à cause du `&`) :
```bash
curl -H "Authorization: Bearer TON_TOKEN" "http://localhost:3000/api/echeances?statut=ROUGE&page=1&limite=5"
```

### 8. Ajouter un nouveau filtre `?` (recette)

Exemple : filtrer les paiements par formation avec `?id_formation=3`.
1. **Controller** (`paiementController.js`) : lis et contrôle la valeur,
   `id_formation: Number.parseInt(req.query.id_formation, 10) || undefined`.
   Une valeur fausse devient `undefined`, donc le filtre est ignoré.
2. **Service** : rien à faire s'il transmet déjà `filtres` tel quel.
3. **Model** (`filtresPaiements`) : `if (id_formation) { conditions.push('i.id_formation = ?'); params.push(id_formation); }`.
   Toujours un `?` SQL, jamais la valeur collée dans le texte.
4. **Web** : ajoute `id_formation` dans l'objet de filtres de la page. `useListePaginee` l'enverra tout seul.
5. **Doc** : ajoute l'option dans le tableau de la route ci-dessous.

### 9. Pièges déjà rencontrés

- **Ordre des routes** : `GET /supports/programmes` est écrit **avant** `GET /supports/:id` dans
  `routes.js`. Sinon Express croirait que `programmes` est un `:id`.
- **`:id` contre `?`** : `/inscriptions/5/echeances` (les échéances DE l'inscription 5) n'est pas la même
  chose qu'une liste filtrée. Si l'élément est obligatoire, il va dans le chemin.
- **Nombres reçus en texte** : `req.query.page` vaut `"2"`, pas `2`. Il faut toujours convertir
  (`Number.parseInt`) avant de faire un calcul.
- **Page ou tout** : sans `?page=`, tu reçois **toute** la liste (format différent, sans
  `pagination`). Si un écran affiche soudain 10 000 lignes, c'est que `?page=` a été oublié.
- **Dates** : toujours `AAAA-MM-JJ` (`2026-09-30`), sinon erreur 400.

---

**Listes paginées** (`GET /etudiants`, `/paiements`, `/inscriptions`, `/echeances`, `/supports`) : avec
`?page=1&limite=20` (limite 100 max), la réponse est `{ status, data, pagination: { page, limite,
total, pages } }` ; sans `?page=` (application mobile, export CSV), toute la liste, **plafonnée à
10 000 lignes** : au-delà, la réponse ajoute `tronque: true` et `limite_export: 10000` (le site prévient
« Export limité aux 10 000 premières lignes »). Les filtres s'appliquent avant la pagination ; une valeur
de filtre inconnue est ignorée. Mêmes règles pour `/utilisateurs`, `/formations` et `/assistances`.

**Listes au curseur** (`GET /formations/:id/supports`, `/supports/:id/commentaires`,
`/formations/:id/commentaires`) : avec `?limite=5` puis `?limite=5&avant=<id du dernier reçu>`, la
réponse est `{ status, data, curseur: { limite, suivant, total } }` (`suivant` = valeur du prochain
`avant`, `null` en fin de liste). Les éléments ajoutés pendant qu'on fait défiler ne décalent pas les
pages (pas de doublon). Sans `?limite` ni `?avant`, toute la liste comme avant.

## Vitrine publique, sans connexion (étapes 1 et 2)
| Méthode | Route | Accès |
|---|---|---|
| GET | /public/vitrine | public — présentation et contacts (`.env`), `presentation.fond` (fond du bandeau choisi par le SA, `vitrine/xxx.jpg`, `null` = image par défaut de l'application), modes de paiement, et la **première page (5)** des formations actives (formateur, tarif, durée, `engagement_formateur`, `image` de couverture, nombre d'inscrits, avis sur le formateur) et des formateurs compétents ; `totaux: { formations, formateurs_competents }`, `par_page` |
| GET | /public/formations | public — suite des formations, paginée `?page=&limite=` (5 par défaut), les plus demandées d'abord |
| GET | /public/formateurs | public — suite des formateurs compétents, paginée `?page=&limite=` (5 par défaut), les mieux notés d'abord (classement calculé sur tous, puis découpé) |
| POST | /public/inscriptions | public, **5 essais par heure et par adresse IP** (429 au-delà) — `{ nom, prenom, email, telephone, mot_de_passe, confirmation_mot_de_passe, formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }` : crée le compte, une inscription « en ligne » par formation et le premier paiement en attente ; 400 si les deux mots de passe diffèrent, 409 si l'e-mail existe. **Pièces du dossier facultatives ici** : en multipart (`formations` en texte JSON), fichiers `photo_1`, `photo_2`, `photocopie_cin`, `certificat_residence` (JPEG, PNG, WEBP ou PDF, 5 Mo) ; sinon déposées plus tard avec `PUT /mon-dossier`. Demande refusée : les fichiers reçus sont supprimés |
| GET | /public/logo | public — `{ logo }` : chemin du logo de l'organisation (`vitrine/xxx.png`), `null` = logo par défaut |
| PUT | /vitrine/fond | SA — multipart, champ `image` (JPEG / PNG / WEBP, 8 Mo) : fond du bandeau « Découvrir » ; remplace et supprime l'ancien ; renvoie `fond` (`vitrine/xxx.jpg`) |
| DELETE | /vitrine/fond | SA — retour à l'image par défaut de l'application (l'ancien fichier est supprimé) |
| PUT | /parametres/logo | SA — multipart, champ `image` (JPEG / PNG / WEBP, 2 Mo) : logo affiché pour tout le monde (barre latérale, connexion) ; remplace et supprime l'ancien ; renvoie `logo` |
| DELETE | /parametres/logo | SA — retour au logo par défaut |

## Authentification (étape 4, §5 Sessions)
| Méthode | Route | Accès |
|---|---|---|
| POST | /auth/login | public — **5 échecs / 15 min par IP + e-mail, 20 par IP** (seuls les échecs comptent, une réussite remet à zéro ; 429 au-delà) |
| POST | /auth/forgot-password | public — **5 demandes / heure par IP** (429 au-delà) |
| POST | /auth/reset-password | public (déconnecte tous les appareils) — **10 échecs / 15 min par IP** (429 au-delà) |
| POST | /auth/logout | connecté (désactive la session courante) |
| GET | /auth/profil | connecté |
| PUT | /auth/change-password | connecté (déconnecte les autres appareils) |
| GET | /auth/sessions | connecté (les tokens ne sont jamais renvoyés) |
| GET | /auth/last-login | connecté |
| PUT | /auth/logout-all | connecté |

## Utilisateurs (§5 Comptes, Mon profil)
| Méthode | Route | Accès |
|---|---|---|
| GET | /utilisateurs?etat=actif\|inactif\|tous | SA (actifs par défaut) |
| GET | /utilisateurs/:id | soi-même ou SA |
| POST | /utilisateurs | SA — multipart ; la photo (`photo`) est réduite à 400 px par le serveur |
| PUT | /utilisateurs/:id | soi-même ou SA (seul SA peut changer `id_role` / `mot_de_passe`) ; `photo` réduite à 400 px |
| DELETE | /utilisateurs/:id | SA (désactive le compte et ferme ses sessions) |
| PUT | /utilisateurs/:id/reactiver | SA (409 si déjà actif) |

## Éléments désactivés (suppression logique)
Un `DELETE` sur un utilisateur, un étudiant, une formation, une inscription, une échéance, un paiement, un document administratif ou un support le **désactive** (`etat = false`) : il peut être réactivé. Chaque désactivation et réactivation ajoute une ligne dans `historique_etat` ; recommencer sur un élément déjà dans cet état renvoie **409** et n'ajoute rien.

- **Listes** (`/utilisateurs`, `/etudiants`, `/formations`, `/inscriptions`, `/echeances`, `/paiements`, `/documents`) : `?etat=actif` (défaut), `inactif` ou `tous`. Réservé à SA et AC (`/utilisateurs` : SA seul) : pour un ET ou un FO, toujours `actif`. `/formations/:id/supports?etat=` : tout le monde sauf ET.
- **Supports** : `PUT /supports/:id/reactiver` (FO : uniquement les siens ; SA) refusé (409) si la formation est désactivée.
- **Réactivation** : `PUT /<ressource>/:id/reactiver`. Refusée (409) si ce dont l'élément dépend est désactivé (ex. inscription d'un étudiant désactivé), ou si l'étudiant a déjà une autre inscription active à la même formation.
- **Dépendances** : une action (valider, payer, rappeler, note, fiche, facture, attestation…) sur un élément dont l'échéance, l'inscription, l'étudiant ou la formation est désactivé renvoie **409** avec un message qui dit quoi réactiver, ex. « L'étudiant Rova Rakoto est désactivé. Réactivez-le d'abord (page Étudiants, filtre « Désactivés ») ».
- Les listes d'inscriptions, d'échéances et de paiements renvoient `etudiant_actif`, `formation_active` (et `inscription_active`, `echeance_active`) pour l'afficher sur la ligne.

## Étudiants (§5 Dossiers étudiants)
| Méthode | Route | Accès |
|---|---|---|
| GET | /etudiants | SA, AC, FO — `?recherche=` (nom, prénom, e-mail, téléphone), paginable |
| GET | /etudiants/:id | SA, AC |
| GET | /etudiants/:id/formations | tous (un ET : uniquement les siennes) |
| GET | /etudiants/:id/formations-disponibles | ET (lui seul) — formations actives où il n'a **pas** d'inscription active, paginées `?page=&limite=` (5 par défaut), même format que `/public/formations` |
| POST | /etudiants/:id/inscriptions | ET (lui seul) — `{ formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }` : une inscription « en ligne » par formation + premier paiement en attente, **sans créer de compte** (transaction : déjà inscrit à l'une d'elles → 409, rien n'est créé). L'Accueil et l'étudiant sont prévenus ; la validation suit les règles de l'inscription en ligne (dossier complet) |
| GET | /etudiants/:id/dashboard-paiement | SA, AC, ET (un ET : uniquement le sien) |
| POST | /etudiants | SA, AC (le rôle Étudiant est imposé par le serveur) |
| PUT | /etudiants/:id | SA, AC |
| DELETE | /etudiants/:id | SA, AC — désactive |
| PUT | /etudiants/:id/reactiver | SA, AC |
| GET | /mon-dossier | ET — les 4 pièces obligatoires de l'étudiant connecté : `{ pieces: [{ champ, libelle, fichier }], fournies, total, complet }` (`fichier` null = à déposer) |
| PUT | /mon-dossier | ET — multipart, un fichier par pièce déposée ou remplacée (`photo_1`, `photo_2`, `photocopie_cin`, `certificat_residence` ; JPEG, PNG, WEBP ou PDF, 5 Mo ; autre format : 400). L'ancien fichier d'une pièce remplacée est supprimé ; l'Accueil reçoit une notification (déposé / remplacé, et `n/4`). Une inscription déjà validée le reste |

## Formations (§5 Formations)
| Méthode | Route | Accès |
|---|---|---|
| GET | /formations | connecté (un FO ne voit que les siennes) |
| GET | /formations/:id | connecté |
| GET | /formations/:id/etudiants | SA, AC, FO (un FO : uniquement ses formations) — `id_etudiant, nom, prenom, email, photo, date_inscription`, triés par nom |
| GET | /formations/:id/classement | SA, AC, FO (un FO : uniquement ses formations) — classement + note système /10 (part de 10 ; présence ≥ 90 % 0, ≥ 75 % −1, ≥ 50 % −2, sinon −4 ; paiement −1 par échéance réglée le jour suivant, −2 si pas réglée le jour suivant — date du paiement, pas de la validation ; en attente compté, refusé ignoré, −4 au plus ; enregistrée en base) |
| POST / PUT / DELETE | /formations(/:id) | SA — `POST` / `PUT` acceptent `engagement_formateur` |
| PUT | /formations/:id/reactiver | SA |
| PUT | /formations/:id/image | SA — multipart, champ `image` (JPEG / PNG / WEBP, 5 Mo) : couverture de la vitrine ; renvoie `image` (`formations/xxx.jpg`) |
| GET | /formations/&lt;fichier&gt; (ex. `/api/formations/demo-python.jpg`) | **public** — couverture d'une formation (sans token, sans filigrane) |

## Inscriptions & échéances (étapes 2, 3, 6 et 8)
| Méthode | Route | Accès |
|---|---|---|
| GET | /inscriptions, /inscriptions/:id | SA, AC — liste : `?recherche=` (étudiant ou formation), `?valide=oui\|non`, `?statut=en_cours\|reussi` (reussi = attestation délivrée), `?origine=accueil\|en_ligne`, `?dossier=complet\|incomplet` (4 pièces de l'étudiant), paginable ; **inscriptions non validées en premier**, puis les plus récentes ; renvoie aussi `statut`, `origine`, `reference_declaree` et `montant_declare` (premier paiement déclaré), `pieces_fournies` et `pieces_total` (dossier de l'étudiant). Détail (`/inscriptions/:id`) : en plus `dossier: { pieces: [{ champ, libelle, fichier }], fournies, total, complet }` |
| POST | /inscriptions | SA, AC — crée l'inscription **et** l'échéancier dans une transaction |
| POST | /inscriptions/:id/valid | SA, AC — valide (une seule fois) ; valide le paiement déclaré s'il existe, sinon enregistre le 1er paiement. **Inscription en ligne : 409 « Dossier incomplet : … » tant que les 4 pièces ne sont pas déposées** (`config/dossier.js`) ; une inscription faite à l'Accueil n'est pas bloquée, mais la réponse contient `avertissement` (« Dossier incomplet : … ») et `data.pieces_manquantes` |
| DELETE | /inscriptions/:id | SA, AC — désactive |
| PUT | /inscriptions/:id/reactiver | SA, AC |
| GET | /inscriptions/:id/echeances | SA, AC |
| PUT | /inscriptions/:id/note | SA, FO (ses formations) — `{ note_presentation }` entre 0 et 10 (au-delà : 400), vide = effacer. Note d'attestation = note système + présentation /20 — **409** si l'attestation est déjà délivrée |
| GET | /echeances | SA, AC — `statut_paiement` : VERT (payée ou loin), JAUNE (J-2 à J), ROUGE (en retard) ; `?recherche=`, `?statut=VERT\|JAUNE\|ROUGE`, `?debut=&fin=` (date d'échéance, AAAA-MM-JJ, bornes incluses ; 400 si invalide), paginable |
| PUT | /echeances/:id | SA — body `{ date_echeance?: 'AAAA-MM-JJ', montant_prevu? }`. La différence de montant est reportée sur la dernière autre échéance non réglée (total inchangé), renvoyée dans `report` ; l'étudiant est prévenu (`emailEnvoye`). 409 si l'échéance est déjà réglée ou s'il n'y a aucune échéance pour le report ; 400 si date invalide, montant ≤ 0, inférieur au déjà payé, ou trop élevé (message avec le maximum) |
| DELETE | /echeances/:id | SA, AC — désactive |
| PUT | /echeances/:id/reactiver | SA, AC |
| POST | /echeances/:id/rappeler | SA, AC — bouton « Rappeler » : notification in-app + e-mail à l'étudiant |

## Paiements (étape 5)
Un paiement a un `statut` : `en_attente`, `valide` ou `refuse`. `id_agent`, `agent_prenom` et `agent_nom` indiquent le membre du personnel qui l'a saisi, validé ou refusé (`null` : ancien paiement, ou déclaration pas encore traitée). Valider un paiement qui dépasse le reste à payer (échéance encaissée au guichet entre-temps) renvoie **409** : le refuser ou corriger son montant.
Seuls les paiements `valide` comptent dans les totaux, le dashboard et les factures.

| Méthode | Route | Accès |
|---|---|---|
| GET | /paiements?statut=en_attente | SA, AC (tout) — ET (uniquement les siens) ; `?mode=` (nom du mode), `?recherche=` (étudiant ou formation), paginable (+ `compteurs.en_attente` : paiements en attente sur toute la base) |
| GET | /paiements/:id | SA, AC — ET (uniquement les siens) |
| POST | /paiements | SA, AC : paiement `valide`, partiel autorisé, plafonné au reste à payer.<br>ET : uniquement sur sa propre échéance, montant imposé, statut `en_attente`.<br>Deux envois simultanés sur une échéance passent l'un après l'autre : le second reçoit **409** si elle est réglée. |
| PUT | /paiements/:id | SA, AC — paiement facturé (`facture_emise = 1` dans les réponses) : montant et mode figés (**409**), la référence reste modifiable. Montant plafonné au reste à payer (400 sinon) ; l'ancien montant d'un paiement validé n'y compte pas, un paiement refusé n'est pas plafonné |
| PUT | /paiements/:id/valider | SA, AC — notifie l'étudiant |
| PUT | /paiements/:id/refuser | SA, AC — notifie l'étudiant |
| DELETE | /paiements/:id | SA, AC — désactive (ne compte plus dans les totaux) |
| PUT | /paiements/:id/reactiver | SA, AC (`DELETE /paiements/:id` : **409** si le paiement a une facture) — **409** si un paiement validé dépasse le reste à payer (échéance repayée entre-temps) |

## Documents (étapes 5 et 9, §5 Documents)
| Méthode | Route | Accès |
|---|---|---|
| POST | /fiche/:id_inscription/generer | SA, AC |
| POST | /factures/:id_paiement/generer | SA, AC (paiement validé uniquement) — renvoie la facture du paiement ; elle n'est créée qu'une fois (une seule facture par paiement, même numéro à chaque appel). La facture est **déjà envoyée automatiquement** à l'étudiant (notification + e-mail) à chaque validation : `PUT /paiements/:id/valider`, paiement au guichet `POST /paiements`, `POST /inscriptions/:id/valid` |
| POST | /attestations/:id_inscription/generer | SA, AC (la note est imprimée sur l'attestation) — **409** si l'étudiant n'a pas commenté son formateur. Une seule attestation par inscription : si elle existe, renvoie la même (même QR code) |
| POST | /attestations/:id_inscription/envoyer | SA, AC — génère si besoin puis envoie à l'étudiant (in-app + e-mail avec le PDF) ; un nouvel envoi renvoie la même attestation |
| GET | /verification/:uuid | public (QR code des attestations). Navigateur (`Accept: text/html`, QR code scanné) : **page web** « Attestation authentique » (étudiant Prénom NOM, formation, durée, date de délivrance, référence) ou « Document non reconnu » (404). Sinon JSON `{ status, message: 'Document authentique', etudiant, formation, date_delivrance }` ou erreur 404. Le lien du QR = `URL_BASE` (adresse réseau du PC **avec `/api`**) + `/verification/<uuid>` |
| GET | /documents | SA, AC, FO |
| POST | /documents | SA, AC |
| DELETE | /documents/:id | SA — désactive |
| PUT | /documents/:id/reactiver | SA |

## Supports, commentaires & réactions (étape 7, §5 Commentaires et avis)
> Envoi programmé : un planificateur (chaque minute) annonce le support aux étudiants inscrits
> 1 h avant (« X va envoyer le support … dans une heure »), puis le publie à l'heure prévue et
> prévient étudiants et formateur (« Le support … a été envoyé dans la formation … »).

| Méthode | Route | Accès |
|---|---|---|
| GET | /formations/:id/supports, /supports/:id | tous — supports **publiés** uniquement ; `contenu` (HTML propre ou `null`) et `fichier` (chemin ou `null` pour un support texte seul). `/formations/:id/supports` : curseur `?limite=&avant=<id_support>` (plus récent d'abord) |
| GET | /supports | SA (tous), FO (ses formations), ET (formations où son inscription est validée) — paginée `?page=&limite=` ; filtres `?recherche=` (titre, formation, texte), `?id_formation=`, `?id_formateur=`, `?type=texte\|pdf\|image\|audio\|video`, `?tri=recents\|anciens\|titre`. Un FO ne voit jamais les supports d'un autre, même avec `?id_formateur=` |
| POST | /supports | FO (uniquement dans ses formations) — multipart : `id_formation`, `titre`, `contenu` (texte mis en forme, HTML nettoyé par le serveur) et / ou `fichier` (PDF, image, audio, vidéo — 50 Mo max par fichier ; champ **répétable jusqu'à 10 fois** : un support par fichier, titre « titre — nom du fichier », 400 au-delà ; fichiers supprimés si la demande est refusée) : un texte ou un fichier au moins, titre obligatoire sans fichier ; `date_envoi_prevue` facultative (ISO, dans le futur) : support **programmé** (brouillon), sinon publié tout de suite et les inscrits sont notifiés |
| GET | /supports/programmes | FO (les siens), SA (tous) — supports programmés pas encore envoyés |
| PUT | /supports/:id | FO (les siens), SA — modifie un support programmé : `titre`, `contenu` (vide = texte supprimé, refusé sans fichier), `date_envoi_prevue`, `fichier` (multipart) ; 409 s'il est déjà envoyé |
| POST | /supports/:id/envoyer | FO (les siens), SA — envoie tout de suite un support programmé |
| DELETE | /supports/:id | FO (ses supports, publiés ou programmés), SA |
| GET | /supports/:id/commentaires | tous — fil de discussion : commentaires principaux (plus récent d'abord), chacun avec `reponses`, `nb_reponses` et `titre_support`. Curseur `?limite=&avant=<id_commentaire>` : la limite compte les commentaires **principaux** (leurs réponses suivent), la réponse ajoute `total_echanges` (principaux + réponses) |
| GET | /formations/:id/commentaires | tous (ET : inscription validée) — même fil, pour tous les supports publiés de la formation, en une requête ; même curseur |
| POST | /commentaires | ET, FO, SA |
| DELETE | /commentaires/:id | SA (tout), FO (ses formations), ET (ses commentaires) |
| GET / POST / DELETE | /supports/:id/reactions | SA, FO, ET — POST `{ type_reaction: 'like' \| 'coeur' \| 'utile' \| 'dislike' }` (`id_type_reaction` encore accepté) ; support publié uniquement |
| GET | /formateurs/avis?debut=&fin= | SA, AC — classement : formateurs avec réactions reçues par type, % positif, avis (`competent`, `non_competent`, `pas_assez_avis`), `note_reactions` (/10, % positif ÷ 10, à partir de 5 réactions), `note_commentaires` (/10, moyenne des notes ; `null` tant qu'un étudiant attendu n'a pas commenté ou qu'un commentaire n'est pas noté), `nb_commentaires` (écrits), `nb_notes` (notés), `nb_attendus` (écrits + attendus non écrits, fin de formation dans la période), `etudiants_manquants` (`[{ id_inscription, etudiant_prenom, etudiant_nom, formation_nom, date_fin }]`, étudiants attendus sans commentaire ; désactiver l'inscription d'un abandon le retire) et `note_finale` (/20, `null` s'il manque une partie). Meilleure note d'abord |
| GET | /mes-formateurs-a-commenter | ET — formations à commenter (à partir de J-2 avant la fin) |
| POST | /inscriptions/:id/commentaire-formateur | ET (sa propre inscription) — `{ commentaire }`, 2 000 caractères au plus, une seule fois (409 sinon) ; l'Accueil et le SA sont prévenus. Obligatoire pour l'attestation |
| GET | /formateurs/commentaires?statut=a_noter\|notes&recherche=&page=&limite= | SA, AC — commentaires, ceux à noter d'abord. Jamais visibles par le formateur |
| PUT | /formateurs/commentaires/:id/note | SA, AC — `{ note }` de 0 à 10 (`7,5` accepté) ; modifiable |

## Notifications (§5 Notifications)
| Méthode | Route | Accès |
|---|---|---|
| GET | /notifications | connecté (les siennes, plus récentes d'abord) — facultatif : `?limite=20` (max 100), `?avant=<id>` (plus anciennes), `?apres=<id>` (nouvelles), `?nonLues=1` ; réponse `data` + `meta { encorePlus, total, nonLues }`. Sans paramètre : toute la liste |
| GET | /notifications/compteur | connecté — `{ total, nonLues }` (badge de la cloche) |
| PUT | /notifications/lu-tout | connecté — marque toutes ses notifications comme lues |
| PUT | /notifications/:id/lu | connecté |
| DELETE | /notifications/:id | connecté |
| POST | /notifications/in-app, /notifications/email, /notifications/email/piece-jointe | SA, AC |

## Assistance (§5 Assistance)
| Méthode | Route | Accès |
|---|---|---|
| POST | /assistances | ET — `{ objet, contenu }`, statut « En attente », l'Accueil est notifié |
| GET | /assistances?statut= | SA, AC (toutes) — ET (les siennes) |
| PUT | /assistances/:id/resoudre | SA, AC — statut « Résolu », l'étudiant est notifié |

## Alertes automatiques, sans route (étape 6, §6)
Ces alertes vont au **personnel** seulement. Le rappel de paiement à l'**étudiant** n'est pas automatique : c'est l'Accueil qui le déclenche (`POST /echeances/:id/rappeler`, bouton « Rappeler »), par choix (flux étape 6).

Au démarrage du serveur puis toutes les heures, l'Accueil et le Super Admin reçoivent une notification in-app :
- « Étudiant A doit être rappelé » : échéance passée au statut JAUNE (non soldée, J-2, J-1 ou J ; même règle que la page Échéances ; jamais pour un étudiant ou une formation désactivés) ;
- attestations : dès la date de fin (date d'inscription + durée), si tout est payé et la note de présentation attribuée, l'attestation est envoyée automatiquement à l'étudiant (in-app + e-mail avec le PDF) ; l'Accueil reçoit « N attestation(s) envoyée(s) automatiquement » ; sinon le formateur est prévenu de la note manquante.
- commentaire du formateur (à partir de J-2 avant la fin, tant que l'étudiant n'a pas commenté) : l'étudiant reçoit une demande (in-app mobile + e-mail) puis **une relance par jour** (type `commentaire_fo`, date du dernier envoi dans `alerte_envoyee`), jusqu'à 30 jours après la fin ; l'Accueil reçoit **une fois** « X va bientôt recevoir son attestation : en attente de son commentaire sur le formateur » (type `attestation_j2`, notification groupée). L'attestation n'est envoyée qu'après le commentaire ;
- « N étudiant(s) à contacter, risque de décrochage » : inscription passée au niveau « à contacter » (voir **Risque de décrochage**) ; une alerte par épisode : elle est oubliée quand l'étudiant revient à la normale, et repart s'il rechute.
Chaque alerte n'est envoyée qu'une fois (table `alerte_envoyee`), sauf la relance quotidienne du commentaire.

Quand l'étudiant envoie son commentaire (`POST /inscriptions/:id/commentaire-formateur`), le personnel reçoit « Le commentaire formateur de X a été envoyé (formation, formateur). Commentaire à noter. » ; si l'attestation est alors prête (formation terminée, tout payé, note attribuée), elle part **tout de suite** (`attestationService.envoyerSiPrete`) et le message ajoute « Son attestation lui a été envoyée. »

## Dashboard (§5 Tableau de bord)
`GET /dashboard/kpi?debut=&fin=`, `/dashboard/evolution?periode=`, `/dashboard/export-csv`,
`/dashboard/inscriptionParMois?debut=&fin=`, `/dashboard/topInscription?debut=&fin=` — SA, AC.
`/dashboard/kpi` renvoie aussi le détail du reste à encaisser : `montant_a_venir`,
`montant_en_attente` (envoyé, pas encore validé) et `montant_en_retard` ; leur somme = `reste_a_encaisser`.
Nombre d'échéances concernées : `nb_a_venir`, `nb_en_attente`, `nb_en_retard` (= `paiements_en_retard`).
`debut` et `fin` (AAAA-MM-JJ, bornes incluses, chacune facultative) : date du paiement ou de
l'échéance pour les indicateurs, date d'inscription pour les inscriptions ; 400 si une date est mal
écrite ou si le début est après la fin.
Ces quatre statistiques (`kpi`, `evolution`, `inscriptionParMois`, `topInscription`) sont gardées
**1 minute** en cache par période demandée : un paiement validé peut mettre jusqu'à une minute à
apparaître dans le tableau de bord. L'export CSV n'est pas en cache.

- `kpi?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ` : période facultative, bornes incluses (encaissé selon la date du paiement, reste et retards selon la date de l'échéance) ; date invalide ou début après la fin → 400.
- `evolution?periode=quotidien|hebdomadaire|mensuel|annuel` : 7 derniers jours, 8 dernières semaines (lundi), 12 derniers mois, ou par année ; périodes sans paiement à 0.

## Risque de décrochage (§5 Tableau de bord)
| Méthode | Route | Accès |
|---|---|---|
| GET | /decrochage | SA, AC — étudiants à risque, les plus urgents d'abord : `{ id_inscription, prenom, nom, photo, formation_nom, niveau: 'a_contacter'\|'a_surveiller', score (sur 6), raisons: [texte], points: { assiduite, silence, paiement }, taux_assiduite, jours_presents, jours_fenetre, jours_silence, nb_retards, montant_retard, derniere_relance }`. Situation actuelle : pas de filtre de période. Les élèves au niveau normal ne sont pas renvoyés. `?page=2&limite=10` : une page + `pagination: { page, limite, total, pages }` + `compteurs: { a_contacter, a_surveiller }` (sur toute la liste, quelle que soit la recherche) ; avec `?page` seulement : `?recherche=` (prénom, nom ou formation, sans tenir compte des accents ni des majuscules, chaque mot tapé doit s'y trouver) et `?niveau=a_contacter\|a_surveiller` (valeur inconnue : tous) ; toujours les plus urgents d'abord ; sans `?page` : liste complète |
| POST | /inscriptions/:id/relancer | SA, AC — notification in-app + e-mail bienveillant à l'étudiant (sans parler de « risque », avec ses échéances en retard s'il en a) ; `{ emailEnvoye }`. **409** si la formation n'est pas en cours, si l'inscription, l'étudiant ou la formation est désactivé, ou si une relance date de moins de 3 jours |

Règle (`decrochageService.js`) : inscriptions validées et actives, formation en cours depuis au moins 5 jours de cours. Trois critères notés 0, 1 ou 2 :
assiduité sur les 10 derniers jours de cours terminés (≥ 75 % → 0, 50–74 % → 1, < 50 % → 2), silence depuis le dernier cours ouvert, réaction ou commentaire (≥ 7 jours → 2), échéances en retard, règle ROUGE de la page Échéances (1 → 1, 2 ou plus → 2).
Score 0–1 : normal ; 2–3 : à surveiller ; 4–6 : à contacter. Rien n'est stocké : la date de la dernière relance est gardée dans `alerte_envoyee` (type `relance_decrochage`).

## Recherche globale (§5 Recherche)
| Méthode | Route | Accès |
|---|---|---|
| GET | /recherche?q=texte | tous les rôles — au moins 2 caractères (sinon groupes vides), 5 résultats max par groupe : `{ etudiants, formations, inscriptions, utilisateurs, supports }`. SA : étudiants, formations, inscriptions, utilisateurs ; AC : sans utilisateurs ; FO : ses formations, les étudiants inscrits à ses formations (avec `id_formation`, `nom_formation`), ses supports publiés et programmés ; ET (mobile) : ses formations (avec `valide`) et les supports publiés des formations dont l'inscription est validée (avec `id_formation`, `nom_formation`, `fichier`), rien sans fiche étudiant. Cherche dans nom, prénom, nom complet, e-mail, téléphone, nom / description de formation, titre / texte de support ; `%` et `_` sont cherchés tels quels |

## Tests automatisés
```bash
npm test   # 252 tests : page de vérification du QR code (navigateur / JSON, faux document, noms échappés), commentaire du formateur (J-2, relance quotidienne, attestation dès le commentaire), présence (seulement en ouvrant un cours), risque de décrochage (critères, seuils, relance, alerte), dossier étudiant (pièces obligatoires, Mon dossier), facture automatique, désactivation / réactivation et éléments dépendants, pagination (pages et curseur), limite des essais de connexion, recherche globale, texte mis en forme et envoi de plusieurs fichiers des supports, échéancier, paiements, note et envoi automatique des attestations, supports programmés, commentaires et réactions, vitrine et inscription en ligne, fichiers, autorisations HTTP (sans base de données)
```

## Exemples de corps de requête (Postman)

Comptes de démonstration (mot de passe `admin123`) : flux §2.

`POST /auth/login`
```json
{ "email": "andry.rakotoarisoa@imtech.test", "mot_de_passe": "admin123" }
```

`POST /auth/forgot-password`
```json
{ "email": "andry.rakotoarisoa@imtech.test" }
```

`POST /auth/reset-password` (`token` = code reçu par e-mail)
```json
{ "token": "TOKEN", "nouveau_mot_de_passe": "nouveauMdp123" }
```

`POST /utilisateurs` (SA)
```json
{
  "nom": "Rabe",
  "prenom": "Sophie",
  "email": "accueil@imtechinfo.com",
  "mot_de_passe": "accueil123",
  "telephone": "0343333333",
  "id_role": 2
}
```

`POST /etudiants` (multipart ; pièces facultatives en fichiers : `photo_1`, `photo_2`,
`certificat_residence`, `photocopie_cin` ; le rôle est imposé par le serveur)
```json
{
  "nom": "Rasoa",
  "prenom": "Marie",
  "email": "marie.rasoa@example.com",
  "mot_de_passe": "etudiant123",
  "telephone": "0344444444"
}
```

`POST /formations` (SA)
```json
{
  "nom": "Développement Web",
  "description": "Formation complète HTML/CSS/JS",
  "engagement_formateur": "Un projet corrigé chaque semaine",
  "tarif": 300000,
  "duree": "3 mois",
  "duree_jours": 90,
  "id_utilisateur": 2
}
```

`POST /inscriptions` (SA, AC)
```json
{ "id_etudiant": 1, "id_formation": 1, "nombre_tranches": 3, "id_tranche": 3 }
```

`POST /inscriptions/:id/valid` (SA, AC)
```json
{ "id_mode_paiement": 1, "reference_virement": null }
```

`POST /paiements` — étudiant (montant imposé par le serveur) / personnel (`montant` obligatoire)
```json
{ "id_echeance": 1, "id_mode_paiement": 2, "reference_virement": "VIR-998823" }
```
```json
{ "id_echeance": 1, "id_mode_paiement": 1, "montant": 50000, "reference_virement": null }
```

`POST /supports` (FO, multipart : `fichier` facultatif)
```
id_formation=1  titre=Introduction au HTML  contenu=<p>Lire le chapitre 1</p>  date_envoi_prevue=2026-11-02T08:00
```

`POST /commentaires`
```json
{ "id_support": 1, "contenu": "Merci pour le cours !", "id_parent": null, "mentions": [] }
```
- `mentions` = `id_etudiant` ; réservé au formateur de la formation et au Super Admin, uniquement
  des étudiants inscrits à la formation du support. Étudiant avec mentions → 403 ; étudiant non inscrit → 400.
- Commentaire principal d'un étudiant → le formateur de la formation est notifié.
- `id_parent` (facultatif) = commentaire auquel on répond → son auteur est notifié.

`PUT /inscriptions/:id/note` (SA, FO)
```json
{ "note_presentation": 7.5 }
```
