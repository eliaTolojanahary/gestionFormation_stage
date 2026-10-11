# IMTECH INFO — Plateforme de gestion de formation
## Document de référence : architecture, flux et évolutions

> Ce document décrit le fonctionnement **général** de l'application (qui fait quoi, comment
> les données circulent) et intègre les modifications apportées lors de la revue de code.
> Il sert de base pour le mémoire de stage.
>
> - Détail technique de chaque modification, fichier par fichier : voir [`MODIFICATIONS.md`](MODIFICATIONS.md)
> - Liste exhaustive des routes de l'API : voir [`backend-imtech/api.md`](backend-imtech/api.md)
>
> Les schémas sont écrits en **Mermaid** : ils s'affichent directement dans VS Code
> (extension *Markdown Preview Mermaid Support*) ou sur GitHub, et peuvent être exportés
> en image pour le mémoire via <https://mermaid.live>.

---

## Sommaire

1. [Présentation générale](#1-présentation-générale)
2. [Architecture technique](#2-architecture-technique)
3. [Architecture du backend en couches](#3-architecture-du-backend-en-couches)
4. [Acteurs, rôles et droits](#4-acteurs-rôles-et-droits)
5. [Modèle de données](#5-modèle-de-données)
6. [Flux fonctionnels](#6-flux-fonctionnels)
7. [Sécurité](#7-sécurité)
8. [Gestion des erreurs](#8-gestion-des-erreurs)
9. [Qualité et tests](#9-qualité-et-tests)
10. [Organisation du code](#10-organisation-du-code)
11. [Évolutions apportées pendant la revue](#11-évolutions-apportées-pendant-la-revue)
12. [Limites et perspectives](#12-limites-et-perspectives)
13. [Glossaire](#13-glossaire)

---

## 1. Présentation générale

IMTECH INFO est un centre de formation. La plateforme numérise l'ensemble du parcours
d'un apprenant :

```
Création du dossier étudiant → Inscription à une formation → Échéancier de paiement
→ Paiements → Documents officiels (fiche, facture, attestation) → Suivi des cours (supports)
```

Elle se compose de **trois applications** qui partagent une même API :

| Application | Public | Usage principal |
|---|---|---|
| **Application web** (back-office) | Super Admin, Accueil, Formateur | Gestion des étudiants, formations, inscriptions, paiements, documents, tableau de bord |
| **Application mobile** | Étudiant (et Super Admin) | Consulter ses formations et supports, commenter, réagir, payer ses échéances, recevoir des notifications |
| **API REST** (backend) | Les deux applications | Règles métier, sécurité, accès à la base de données, génération des PDF, envoi des e-mails |

---

## 2. Architecture technique

### 2.1 Vue d'ensemble

```mermaid
flowchart LR
    subgraph Clients
        W["Application web<br/>React 19 + Vite<br/>(Super Admin, Accueil, Formateur)"]
        M["Application mobile<br/>React Native + Expo Router<br/>(Étudiant)"]
    end

    subgraph Serveur["Serveur Node.js"]
        API["API REST<br/>Express 5"]
        PDF["Génération PDF<br/>pdfkit + QR code"]
        MAIL["Envoi d'e-mails<br/>nodemailer (Gmail)"]
        FS[("Fichiers uploadés<br/>uploads/")]
    end

    DB[("MySQL<br/>gestion_formation_db")]

    W -- "HTTP + JSON<br/>Authorization: Bearer JWT" --> API
    M -- "HTTP + JSON<br/>Authorization: Bearer JWT" --> API
    API --> DB
    API --> PDF --> FS
    API --> MAIL
    API --> FS
```

### 2.2 Technologies

| Couche | Technologie | Rôle |
|---|---|---|
| Base de données | MySQL (pilote `mysql2`, pool de connexions) | Stockage relationnel, transactions |
| Backend | Node.js 22, Express 5 | API REST |
| Authentification | JSON Web Token (`jsonwebtoken`) + table `sessions` | Identification et révocation des connexions |
| Mots de passe | `bcryptjs` (hachage) | Les mots de passe ne sont jamais stockés en clair |
| Fichiers | `multer` | Upload (photos, pièces justificatives, supports de cours) |
| Documents | `pdfkit`, `qrcode` | Fiche d'inscription, facture, attestation avec QR code de vérification |
| Protection des documents | `pdf-lib`, `sharp` | Filigrane dynamique (nom, e-mail, date) ajouté aux PDF et images au moment de leur consultation |
| E-mails | `nodemailer` | Réinitialisation du mot de passe, factures, relances |
| Web | React 19, React Router 7, Vite | Interface d'administration |
| Mobile | React Native 0.86, Expo 57, Expo Router, TypeScript | Application étudiant |
| Lecteur mobile | `react-native-webview` + pdf.js, `expo-screen-capture` | Affichage des supports dans l'app, captures d'écran bloquées |
| Tests | Runner intégré de Node (`node --test`) | Tests automatisés du backend |

### 2.3 Communication client ↔ serveur

Toutes les requêtes passent par une **seule fonction** côté client (`apiRequest`, présente
dans `web/src/utils/api.js` et `mobile/src/utils/api.ts`) qui :

1. ajoute automatiquement le token (`Authorization: Bearer <token>`) ;
2. envoie du JSON, ou un `FormData` pour les fichiers ;
3. lit la réponse, même si elle n'est pas du JSON ;
4. **si le serveur répond 401** (session expirée ou révoquée) : efface la session locale et
   renvoie l'utilisateur à l'écran de connexion ;
5. transforme toute réponse d'erreur en exception avec le message du serveur.

Format commun des réponses de l'API :

```json
{ "status": "success", "data": { } }
{ "status": "error", "message": "Explication lisible par l'utilisateur" }
```

---

## 3. Architecture du backend en couches

### 3.1 Les couches

Le backend suit une architecture **en couches**, chaque couche ayant une seule responsabilité :

```mermaid
flowchart TB
    R["<b>Routes</b> — routes/routes.js<br/>URL + méthode HTTP + middlewares de sécurité"]
    MW["<b>Middlewares</b> — middlewares/<br/>verifyToken, checkRole, contrôle du propriétaire, upload"]
    C["<b>Controllers</b> — controllers/<br/>lisent la requête, appellent le service, renvoient la réponse"]
    S["<b>Services</b> — services/<br/>règles métier : qui a le droit, quels montants, quelles vérifications"]
    MO["<b>Models</b> — models/<br/>requêtes SQL uniquement"]
    DB[("MySQL")]
    EH["<b>Gestionnaire d'erreurs unique</b> — app.js<br/>transforme toute erreur en réponse JSON"]

    R --> MW --> C --> S --> MO --> DB
    C -. "throw" .-> EH
    S -. "throw AppError(code, message)" .-> EH
    MW -. "throw" .-> EH
```

| Couche | Ce qu'elle fait | Ce qu'elle ne fait **pas** |
|---|---|---|
| Routes | Associe une URL à un controller et déclare les rôles autorisés | Aucune logique |
| Middlewares | Authentification, rôle, propriétaire, upload de fichiers | Accès métier aux données |
| Controllers | Extraient les champs de la requête, vérifient les champs obligatoires, formatent la réponse | SQL, règles métier |
| Services | Règles métier, transactions, contrôles de propriété | SQL brut, `req` / `res` |
| Models | Requêtes SQL paramétrées (`?`) | Décisions métier |

### 3.2 Cycle de vie d'une requête

Exemple : un étudiant consulte son tableau de paiement.

```mermaid
sequenceDiagram
    autonumber
    participant App as App mobile
    participant R as Route
    participant A as verifyToken
    participant P as checkRole + exigerEtudiantProprietaire
    participant C as paiementController
    participant S as paiementService
    participant M as paiementModel
    participant DB as MySQL

    App->>R: GET /api/etudiants/7/dashboard-paiement
    R->>A: Bearer token
    A->>A: vérifie la signature du JWT
    A->>DB: la session est-elle active ?
    DB-->>A: oui
    A->>P: req.user = { id, role, id_etudiant }
    P->>P: rôle autorisé ? id 7 = son id_etudiant ?
    P->>C: OK
    C->>S: dashboardPaiementEtudiant(7)
    S->>M: prochaine échéance, dernier paiement, totaux, paiements en attente
    M->>DB: requêtes SQL (en parallèle)
    DB-->>M: lignes
    M-->>S: données
    S-->>C: résumé calculé (total dû, payé, solde)
    C-->>App: 200 { status: "success", data }
```

Si une étape échoue (token absent, session révoquée, mauvais étudiant, erreur SQL), l'étape
**lève une erreur** et le gestionnaire unique de `app.js` renvoie la réponse adaptée
(voir [§8](#8-gestion-des-erreurs)).

---

## 4. Acteurs, rôles et droits

### 4.1 Les acteurs

| Rôle | Application | Responsabilités |
|---|---|---|
| **Super Admin** | Web (+ mobile) | Gère tout : utilisateurs, rôles, formations, et toutes les actions de l'Accueil |
| **Accueil** | Web | Crée les dossiers étudiants, inscrit, encaisse, **valide les paiements reçus depuis le mobile**, envoie les rappels et les attestations, **résout les demandes d'assistance** |
| **Formateur** | Web | Consulte ses formations et ses étudiants, publie des supports de cours (tout de suite ou **à une heure programmée**), modère les commentaires, **fixe la note d'attestation** (à partir de la note suggérée) |
| **Étudiant** | Mobile | Consulte ses formations et supports, commente, réagit, **paie ses échéances** (paiement à valider), **écrit à l'assistance**, reçoit des notifications |

### 4.2 Matrice des droits (résumé)

| Fonction | Super Admin | Accueil | Formateur | Étudiant |
|---|:-:|:-:|:-:|:-:|
| Gérer les comptes utilisateurs et les rôles | ✅ | — | — | — |
| Modifier son propre profil | ✅ | ✅ | ✅ | ✅ |
| Créer / modifier un dossier étudiant | ✅ | ✅ | — | — |
| Créer / modifier une formation | ✅ | — | — | — |
| Voir les étudiants d'une formation | ✅ | ✅ | ses formations | — |
| Inscrire un étudiant, valider une inscription | ✅ | ✅ | — | — |
| Enregistrer un paiement validé (guichet) | ✅ | ✅ | — | — |
| Envoyer un paiement (en attente) | — | — | — | sa propre échéance |
| Valider / refuser un paiement | ✅ | ✅ | — | — |
| Voir les paiements | tous | tous | — | les siens |
| Générer fiche / facture / attestation | ✅ | ✅ | — | — |
| Publier un support de cours | — | — | ses formations | — |
| Programmer / modifier / envoyer un support programmé | ✅ (modifier, envoyer) | — | les siens | — |
| Supprimer un support | ✅ | — | les siens | — |
| Commenter / répondre / réagir (dont 👎) | ✅ | — | ✅ | ✅ |
| Supprimer un commentaire | tous | — | dans ses formations | les siens |
| Tableau de bord et export CSV | ✅ | ✅ | — | — |
| Envoyer un rappel de paiement / une attestation | ✅ | ✅ | — | — |
| Envoyer une demande d'assistance | — | — | — | ✅ |
| Voir / résoudre les demandes d'assistance | ✅ | ✅ | — | les siennes (lecture) |
| Voir le classement et la note système | ✅ | ✅ | ses formations | — |
| Voir l'avis des étudiants sur les formateurs | ✅ | ✅ | — | — |
| Voir la vitrine et s'inscrire en ligne | — | — | — | visiteur non connecté |
| Noter la présentation (sur 10) | ✅ | — | ses formations | — |
| Être marqué présent (automatique) | — | — | — | ✅ |

Les droits sont appliqués **côté serveur** (les menus du web et du mobile ne font que masquer
ce qui est interdit ; ils ne protègent rien). Deux niveaux de contrôle :

1. **Le rôle** (`checkRole`) : « un étudiant n'a pas accès à cette route ».
2. **Le propriétaire** (`exigerEtudiantProprietaire`, `exigerSoiOuAdmin`, contrôles dans les
   services) : « un étudiant a accès à cette route, mais **seulement pour ses propres données** ».

---

## 5. Modèle de données

### 5.1 Schéma simplifié

```mermaid
erDiagram
    ROLE ||--o{ UTILISATEUR : "attribué à"
    UTILISATEUR ||--o| ETUDIANT : "profil étudiant"
    UTILISATEUR ||--o{ SESSIONS : "se connecte"
    UTILISATEUR ||--o{ PRESENCE : "présent un jour"
    UTILISATEUR ||--o{ FORMATION : "anime (formateur)"
    ETUDIANT ||--o{ INSCRIPTION : "s'inscrit"
    FORMATION ||--o{ INSCRIPTION : "reçoit"
    INSCRIPTION ||--o{ ECHEANCE : "échéancier"
    TRANCHE ||--o{ ECHEANCE : "type"
    ECHEANCE ||--o{ PAIEMENT : "réglée par"
    MODE_PAIEMENT ||--o{ PAIEMENT : "moyen"
    PAIEMENT ||--o| FACTURE : "justifié par"
    INSCRIPTION ||--o| ATTESTATION : "délivre"
    FORMATION ||--o{ SUPPORT : "contient"
    SUPPORT ||--o{ COMMENTAIRE : "reçoit"
    COMMENTAIRE ||--o{ COMMENTAIRE_MENTION : "mentionne"
    SUPPORT ||--o{ REACTION : "reçoit"
    UTILISATEUR ||--o{ NOTIFICATION_INAPP : "reçoit"
    ETUDIANT ||--o{ ASSISTANCE : "demande"
    STATUT ||--o{ ASSISTANCE : "état"

    PAIEMENT {
        int id_paiement PK
        int id_echeance FK
        decimal montant
        datetime date_paiement
        varchar reference_virement
        enum statut "en_attente | valide | refuse"
        bool etat "suppression logique"
    }
    ECHEANCE {
        int id_echeance PK
        int id_inscription FK
        decimal montant_prevu
        date date_echeance
    }
    INSCRIPTION {
        int id_inscription PK
        bool valide
        decimal note_suggeree "note système /10"
        int nb_presences "au dernier calcul"
        decimal note_presentation "formateur /10"
    }
    PRESENCE {
        int id_presence PK
        int id_utilisateur FK
        date jour "unique par utilisateur"
    }
    ASSISTANCE {
        int id_assistance PK
        varchar objet
        text contenu
        datetime date_resolution
    }
    SESSIONS {
        int id_session PK
        varchar token
        datetime expire_le
        bool actif
    }
```

### 5.2 Conventions

| Convention | Signification |
|---|---|
| `etat` (booléen) | **Suppression logique** : une ligne « supprimée » passe à `etat = false` mais reste en base (historique, intégrité des paiements et factures) |
| `paiement.statut` | **Cycle de validation** d'un paiement (ajouté pendant la revue, voir [§6.6](#66-paiement-dune-échéance-par-létudiant-mobile--validation-par-laccueil)) |
| `sessions.actif` | Une connexion ; passer à `0` déconnecte réellement l'appareil |
| `alerte_envoyee` | Mémorise les alertes automatiques déjà envoyées à l'Accueil (une seule fois chacune) |
| Montants | `DECIMAL(10,2)` en Ariary (MGA) |

### 5.3 Scripts SQL

| Fichier | Usage |
|---|---|
| `backend-imtech/base.sql` | Création complète de la base (schéma à jour) |
| `backend-imtech/donneesTest.sql` | Jeu de données de démonstration complet (voir ci-dessous) ; mot de passe de tous les comptes : `admin123` |
| `backend-imtech/scripts/fichiersDemo.js` | Fichiers des données de démonstration : photos de profil (téléchargées sur randomuser.me), pièces de dossier factices, supports PDF générés |
| `backend-imtech/alter2.sql` | Toutes les évolutions du schéma (blocs 001 à 007, puis les suivantes à la fin), à appliquer sur une base existante |
| `backend-imtech/reinit.sql` | Vide **toutes** les tables et remet les compteurs à 1 (structure conservée) |

`alter2.sql` est le **seul** fichier d'évolution du schéma (l'ancien dossier `migrations/` y a été
regroupé). Chaque évolution est un bloc numéroté (001, 002...) exécuté une seule fois ; une nouvelle
évolution s'ajoute à la fin, et seul ce nouveau bloc est exécuté sur une base existante. `base.sql`
est mis à jour en même temps pour les nouvelles installations.

#### Remettre la base en état de démonstration

```bash
cd backend-imtech
mysql -u root -p < reinit.sql          # vide toutes les tables
mysql -u root -p < donneesTest.sql     # recharge les données de démonstration
node scripts/fichiersDemo.js           # photos, pièces du dossier, supports (relançable)
```

`reinit.sql` coupe les contrôles de clés étrangères le temps du vidage (`SET FOREIGN_KEY_CHECKS = 0`),
l'ordre des tables n'a donc pas d'importance. Toute nouvelle table doit y être ajoutée.

Les dates de `donneesTest.sql` sont **relatives au jour d'exécution** (`CURDATE()`, `NOW()`) : les
retards, les échéances proches et la formation terminée restent réalistes quel que soit le jour du
chargement. Les échéances sont calculées en SQL avec la même formule que
`echeanceService.calculerEcheancier` (tranche n à J + n × durée / nb, la dernière absorbe l'arrondi).

| Comptes (mot de passe `admin123`) | Rôle |
|---|---|
| `tljelia374@gmail.com` (Elia) | Super Admin |
| `hanitra.rasoanaivo@imtech.test`, `mamy.andriamanana@imtech.test` | Accueil |
| `tiana.randrianarisoa@imtech.test`, `voahangy.rakotomalala@imtech.test`, `hery.rajaonarison@imtech.test`, `lalaina.razafindrabe@imtech.test` | Formateurs |
| `prenom.nom@imtech.test` (Andry Rakotoarisoa, Miora Randriamampionona, Toky Ravelojaona…) | 12 étudiants |

Les adresses en `.test` (domaine réservé, RFC 2606) garantissent qu'aucun e-mail de test ne part
chez une vraie personne.

| Scénario de démonstration | Données |
|---|---|
| Avis sur les formateurs | Tiana et Voahangy « Compétent », Hery « Non compétent », Lalaina « Pas assez d'avis » |
| Paiements | Validés, 3 en attente (2e tranche de Sitraka payée sur mobile, 2 inscriptions en ligne), 1 refusé (Toky) |
| Retards | Toky (Développement web) et Fano (Réseaux) : 2e tranche échue non payée |
| Inscriptions à valider | Mahery et Miora (en ligne, paiement déclaré), Haja (Accueil, pas encore payé) |
| Fin de formation | Fitiavana a terminé Bureautique (attestation à envoyer) ; Nomena termine dans 4 jours |
| Supports | 10 PDF + 1 image ; « Projet : site vitrine » programmé dans 2 jours à 8 h |
| Échanges | Fils de discussion avec réponses et mentions, 5 demandes d'assistance (3 en attente), notifications |
| Présence | Jours ouvrés depuis la première inscription, assiduité différente par étudiant (de 3 à 10 jours sur 10) |

---

## 6. Flux fonctionnels

Chaque flux indique : les acteurs, les étapes, les règles appliquées et, le cas échéant,
**ce qui a changé** pendant la revue.

### 6.1 Connexion, session et déconnexion

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant Client as Web / Mobile
    participant API
    participant DB as MySQL

    U->>Client: email + mot de passe
    Client->>API: POST /auth/login
    API->>DB: utilisateur par email (actif)
    API->>API: bcrypt.compare(mot de passe, hash)
    alt identifiants incorrects
        API-->>Client: 401 "Identifiants incorrects."
    else correct
        API->>API: crée un JWT {id, role, id_etudiant} valable 24 h
        API->>DB: INSERT session (token, appareil, IP, expire dans 24 h, actif = 1)
        API-->>Client: 200 { token, user }
        Client->>Client: stocke token + user (localStorage / AsyncStorage)
    end

    Note over Client,API: Ensuite, à CHAQUE requête
    Client->>API: Authorization: Bearer <token>
    API->>API: signature et expiration du JWT valides ?
    API->>DB: session active et non expirée ?
    alt session révoquée ou expirée
        API-->>Client: 401
        Client->>Client: efface la session, retour à la connexion
    end

    U->>Client: Se déconnecter
    Client->>API: POST /auth/logout
    API->>DB: UPDATE sessions SET actif = 0
```

**Fonctions associées :**
- *Paramètres → Sessions* : liste des appareils connectés (navigateur, IP, date) ; la session
  courante est signalée, **les tokens ne sont jamais renvoyés**.
- *Déconnecter les autres appareils* (`PUT /auth/logout-all`) : désactive toutes les sessions
  sauf la courante. Les appareils déconnectés le voient **dans la minute** : le web et l'application
  mobile vérifient la session (`GET /auth/profil`) toutes les minutes et au retour au premier plan ;
  le 401 renvoie à l'écran de connexion (sur mobile, avec l'alerte « Session fermée »).
  Deux onglets du même navigateur partagent la même session : ils ne comptent pas comme
  « autres appareils ».
- *Changer le mot de passe* : vérifie l'ancien, enregistre le nouveau (8 caractères min.)
  et **déconnecte les autres appareils**.

> **Ce qui a changé.** Avant, le serveur vérifiait seulement la signature du JWT : un token
> restait utilisable 24 h même après une déconnexion ou un « déconnecter les autres appareils ».
> Désormais chaque requête vérifie la table `sessions`, la déconnexion est réelle, la durée de
> la session est alignée sur celle du JWT, et `/auth/sessions` ne divulgue plus les tokens.

### 6.2 Mot de passe oublié

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur
    participant API
    participant DB as MySQL
    participant Mail as Gmail

    U->>API: POST /auth/forgot-password { email }
    API->>DB: l'email existe ?
    opt oui
        API->>DB: code aléatoire (32 octets), expire dans 30 min
        API->>Mail: e-mail avec le code
    end
    API-->>U: même réponse dans tous les cas
    Note right of API: ne révèle pas si le compte existe
    U->>API: POST /auth/reset-password { code, nouveau mot de passe }
    API->>DB: code valide, non utilisé, non expiré ?
    API->>DB: nouveau hash + code marqué utilisé
    API->>DB: toutes les sessions désactivées
```

### 6.3 Création d'un dossier étudiant (Accueil)

1. L'Accueil remplit le formulaire : identité, e-mail, mot de passe initial, photo et pièces
   justificatives (photos, certificat de résidence, copie de CIN).
2. `POST /etudiants` (multipart) : `multer` enregistre les fichiers (types autorisés : images,
   PDF, Office, texte ; taille limitée).
3. Le service crée **dans une même transaction** le compte `utilisateur` et le profil `etudiant`.
4. Le rôle **Étudiant** est imposé par le serveur.

> **Ce qui a changé.** Le rôle était lu depuis le formulaire (`id_role`) : un compte Accueil
> pouvait ainsi créer un Super Admin. La modification d'un dossier ne vide plus les champs
> non envoyés.

### 6.4 Inscription à une formation et génération de l'échéancier

```mermaid
sequenceDiagram
    autonumber
    actor A as Accueil
    participant API
    participant DB as MySQL

    A->>API: POST /inscriptions { id_etudiant, id_formation, nombre_tranches, id_tranche }
    API->>DB: BEGIN
    API->>DB: étudiant actif ? formation active ? déjà inscrit ?
    API->>DB: INSERT inscription (valide = false)
    API->>API: calculerEcheancier(tarif, durée, nombre de tranches)
    API->>DB: INSERT échéances
    API->>DB: COMMIT
    API-->>A: 201 { id_inscription }
    Note over API,DB: En cas d'erreur à n'importe quelle étape : ROLLBACK,<br/>rien n'est enregistré
```

**Règle de calcul de l'échéancier** (`services/echeanceService.js → calculerEcheancier`) :

- montant d'une tranche = tarif ÷ nombre de tranches, arrondi au centime ;
- la **dernière tranche absorbe l'écart d'arrondi** : la somme est toujours exactement égale au tarif ;
- échéance n° *n* = date du jour + *n* × (durée de la formation en jours ÷ nombre de tranches).

*Exemple :* formation à 100 000 MGA sur 90 jours en 3 tranches :

| Tranche | Montant | Date |
|---|---|---|
| 1 | 33 333,33 | J + 30 |
| 2 | 33 333,33 | J + 60 |
| 3 | 33 333,34 | J + 90 |
| **Total** | **100 000,00** | |

> **Ce qui a changé.** L'inscription était créée hors de la transaction de l'échéancier
> (risque d'inscription sans échéances) et l'arrondi faisait perdre des centimes.
> Le calcul est désormais une fonction pure, couverte par des tests automatisés.

### 6.5 Validation de l'inscription et premier paiement

1. L'Accueil clique sur *Valider* et choisit le mode de paiement (espèces, virement…).
2. `POST /inscriptions/:id/valid` : dans **une transaction**, l'inscription passe à
   `valide = true` **et** le paiement de la première échéance est enregistré (statut `valide`).
3. Une inscription déjà validée est refusée (409) : impossible de payer deux fois la première échéance.
4. Le web envoie la confirmation à l'étudiant (notification in-app + e-mail).

### 6.6 Paiement d'une échéance par l'étudiant (mobile) → validation par l'Accueil

C'est le flux qui a le plus évolué pendant la revue.

```mermaid
sequenceDiagram
    autonumber
    actor E as Étudiant (mobile)
    participant API
    participant DB as MySQL
    actor A as Accueil (web)

    E->>API: GET /etudiants/{son id}/dashboard-paiement
    API-->>E: prochaine échéance, total dû, payé, solde, paiements en attente
    E->>API: POST /paiements { id_echeance, mode }
    API->>DB: échéance + propriétaire + déjà payé + en attente
    alt échéance d'un autre étudiant
        API-->>E: 403
    else déjà réglée / paiement déjà en attente
        API-->>E: 409
    else OK
        API->>DB: INSERT paiement (montant = montant prévu, statut = en_attente)
        API-->>E: 201 "Paiement envoyé, en attente de validation."
    end

    A->>API: GET /paiements (bandeau « N paiements attendent votre validation »)
    A->>API: PUT /paiements/{id}/valider (ou /refuser)
    API->>DB: UPDATE statut (seulement si encore en_attente)
    API->>DB: notification in-app pour l'étudiant
    API-->>A: 200
    E->>API: GET dashboard-paiement → le paiement compte dans « Déjà payé »
```

**Cycle de vie d'un paiement :**

```mermaid
stateDiagram-v2
    [*] --> en_attente : l'étudiant paie (mobile)
    [*] --> valide : l'Accueil encaisse au guichet
    en_attente --> valide : l'Accueil valide
    en_attente --> refuse : l'Accueil refuse
    refuse --> [*] : l'étudiant peut payer à nouveau l'échéance
    valide --> [*] : compte dans les totaux, facture possible
```

**Règles métier :**

| Règle | Étudiant | Accueil / Super Admin |
|---|---|---|
| Sur quelle échéance ? | Uniquement **la sienne** | Toutes |
| Montant | **Imposé** par le serveur (montant prévu) | Libre, paiement partiel autorisé, **plafonné au reste à payer** |
| Statut créé | `en_attente` | `valide` |
| Double paiement | Refusé si un paiement est déjà en attente | Refusé si l'échéance est soldée |

**Seuls les paiements `valide`** sont pris en compte dans : le total payé et le solde de
l'étudiant, la vue des échéances (Vert / Orange / Rouge), les indicateurs du tableau de bord
et la génération des factures.

> **Ce qui a changé.** Avant, un étudiant pouvait enregistrer lui-même un paiement **déjà
> validé**, avec **le montant de son choix**, et sur **n'importe quelle échéance** ; il pouvait
> aussi lister les paiements de tous les étudiants. Ajout de la colonne `paiement.statut`, des
> routes de validation/refus, de la section « En attente de validation » sur le mobile et des
> boutons Valider / Refuser sur le web.

### 6.7 Suivi des échéances et rappels de paiement

La page *Échéances* calcule pour chaque échéance le montant payé (paiements validés), le reste
et une couleur :

| Couleur | Condition |
|---|---|
| 🟢 VERT « À jour » | Payée (paiement envoyé, même en attente de validation), ou date d'échéance encore loin (plus de 2 jours) |
| 🟡 JAUNE « À rappeler » | Non soldée, à J-2, J-1 ou le jour J → **le système notifie l'Accueil** |
| 🔴 ROUGE « En retard » | Date dépassée et non soldée |

Le rappel se fait **en deux temps** : le système prévient l'Accueil, puis l'Accueil décide d'envoyer
le rappel à l'étudiant.

```mermaid
sequenceDiagram
    autonumber
    participant Srv as Serveur (toutes les heures)
    participant DB as MySQL
    actor A as Accueil (web)
    actor E as Étudiant (mobile)

    Srv->>DB: échéances passées au JAUNE (J-2, J-1, J), pas encore signalées ?
    Srv->>DB: réserve l'alerte (table alerte_envoyee, UNIQUE)
    Srv-->>A: in-app « Étudiant A doit être rappelé : X MGA avant le JJ/MM »
    A->>Srv: bouton « Rappeler » (POST /echeances/:id/rappeler)
    Srv-->>E: notification in-app « Rappel : X MGA à régler… »
    Srv-->>E: e-mail de rappel
    Srv->>DB: date_dernier_rappel = maintenant
    Srv-->>A: « Rappel envoyé » (ou « l'e-mail n'a pas pu partir »)
```

Un paiement **envoyé** par l'étudiant compte dès son envoi pour la couleur, les alertes et le critère
« paie à temps » : l'étudiant n'est ni en retard, ni signalé, ni rappelé pendant que l'Accueil le
valide (mention « Payé, à valider » sur la page Échéances). Les **montants encaissés** (totaux,
reste à payer, tableau de bord, factures) ne comptent, eux, que les paiements **validés**.

Le bouton **« Rappeler »** est disponible sur toute échéance non soldée (mis en évidence en JAUNE
et ROUGE) ; le bouton « Rappeler » du tableau de bord mène à la page Échéances.

> **Ce qui a changé.** Avant, la page Échéances envoyait **automatiquement** une relance à chaque
> fois qu'un membre de l'Accueil l'ouvrait (l'étudiant pouvait recevoir plusieurs e-mails par jour),
> et les statuts mélangeaient VERT / ORANGE (jour J seulement) / « À relancer bientôt » (J-2 seulement).
> Désormais : 3 couleurs claires, une seule règle pour le statut et l'alerte (`ECHEANCE_PROCHE` dans
> `models/echeanceModel.js`), alerte unique à l'Accueil, puis envoi volontaire avec « Rappeler ».

### 6.8 Documents officiels

```mermaid
flowchart LR
    I["Inscription"] -->|POST /fiche/:id/generer| F["Fiche d'inscription PDF"]
    P["Paiement VALIDÉ"] -->|POST /factures/:id/generer| FA["Facture PDF<br/>n° FAC-AAAA-0001"]
    I -->|POST /attestations/:id/generer| AT["Attestation PDF<br/>+ QR code"]
    AT -->|scan du QR code| V["GET /verification/:uuid<br/>(route publique)"]
    V --> OK["« Document authentique »<br/>formation + date"]
    FA -->|web| ENV["Envoi à l'étudiant :<br/>e-mail avec pièce jointe + notification"]
```

- Les PDF sont générés par `pdfkit` et enregistrés dans `uploads/documents/`.
- L'attestation contient un **identifiant unique (UUID)** et un QR code ; n'importe qui (un
  employeur par exemple) peut vérifier son authenticité sans compte.
- Une facture ne peut être émise que pour un paiement **validé**.
- **Attestation de fin de formation** : quand la formation est terminée (date d'inscription + durée
  en jours), le système prévient l'Accueil « Étudiant A a fini sa formation, envoyez-lui son
  attestation ». L'Accueil clique sur **« Attestation »** (page Inscriptions) : la note est
  recalculée, le PDF est généré avec la ligne « Note obtenue : X / 20 », puis envoyé à l'étudiant
  (notification in-app + e-mail avec le PDF en pièce jointe).
- Les PDF sont maintenant écrits **entièrement** avant d'être renvoyés ou envoyés par e-mail
  (correction d'un risque de pièce jointe incomplète).

### 6.9 Supports de cours, commentaires, mentions et réactions

```mermaid
sequenceDiagram
    autonumber
    actor F as Formateur (web)
    actor E as Étudiant (mobile)
    participant API
    participant DB as MySQL

    F->>API: POST /supports (fichier + id_formation)
    API->>API: la formation est-elle bien la sienne ?
    API->>DB: INSERT support (statut publie)
    API->>DB: notification « Le support X a été envoyé… » aux inscrits
    E->>API: GET /formations/:id/supports
    E->>API: POST /commentaires { contenu, mentions[], id_parent? }
    API->>DB: BEGIN, commentaire + mentions, COMMIT
    API->>DB: notification « X vous a mentionné… » aux étudiants mentionnés
    E->>API: POST /supports/:id/reactions { type_reaction }
    Note over API,DB: une seule réaction par utilisateur et par support<br/>(contrainte UNIQUE, remplacée si elle change)
```

**Modération :** le Super Admin peut supprimer tout commentaire, un formateur ceux des
supports de ses formations, un étudiant uniquement les siens.

> **Ce qui a changé.** Un formateur pouvait publier dans n'importe quelle formation et
> supprimer les supports des autres. Les notifications de mention ne partaient jamais (bug) :
> elles fonctionnent et sont envoyées après l'enregistrement définitif du commentaire.

L'envoi d'un support peut aussi être **programmé** : voir [6.15](#615-envoi-programmé-des-supports).
Fil de discussion (réponses), réaction 👎 et avis sur les formateurs : voir [6.16](#616-fil-de-discussion-réaction--je-naime-pas--et-avis-sur-les-formateurs).

### 6.10 Notifications

| Événement | Étudiant (mobile) | Accueil / Super Admin (web) | Déclenchement |
|---|---|---|---|
| Inscription confirmée | in-app + e-mail | — | Accueil valide l'inscription |
| Paiement envoyé depuis le mobile | — | in-app « Étudiant A a payé X MGA… à valider » | automatique |
| Paiement validé / refusé | in-app | — | Accueil valide / refuse |
| Échéance passée au JAUNE (J-2) | — | in-app « Étudiant A doit être rappelé » | automatique (toutes les heures) |
| Rappel de paiement | in-app + e-mail | — | bouton « Rappeler » |
| Facture | in-app + e-mail (PDF) | — | Accueil génère la facture |
| Formation terminée | — | in-app « Étudiant A a fini sa formation, envoyez-lui son attestation » | automatique |
| Attestation | in-app + e-mail (PDF avec la note) | — | bouton « Attestation » |
| Mention dans un commentaire | in-app | — | automatique |
| Nouvelle demande d'assistance | — | in-app « Étudiant A a envoyé une demande d'assistance » | automatique |
| Demande d'assistance résolue | in-app | — | bouton « Résoudre » |

- Les notifications « personnel » sont envoyées à **tous** les comptes Accueil et Super Admin actifs.
- Si l'e-mail ne peut pas partir, la notification in-app est quand même envoyée et l'interface le signale.
- Chaque utilisateur ne voit, ne marque comme lues et ne supprime **que ses propres** notifications.
- Le web et le mobile déduisent la catégorie (Paiement, Attestation, Assistance…) du texte du message
  pour choisir l'icône et la couleur.

### 6.11 Tableau de bord (Super Admin, Accueil)

| Indicateur | Calcul |
|---|---|
| Montant encaissé | Somme des paiements **validés** |
| Reste à encaisser | Somme des échéances − montant encaissé |
| Paiements en retard | Échéances dépassées dont la **somme** des paiements validés est inférieure au montant prévu |
| Évolution | Encaissements par jour (semaine), mois ou année |
| Inscriptions par mois, top des formations | Statistiques d'inscription |
| Export CSV | Export des inscriptions |

### 6.12 Assistance

```mermaid
sequenceDiagram
    autonumber
    actor E as Étudiant (mobile)
    participant API
    participant DB as MySQL
    actor A as Accueil (web)

    E->>API: POST /assistances { objet, contenu }
    API->>DB: INSERT assistance (statut « En attente »)
    API-->>A: in-app « Étudiant A a envoyé une demande d'assistance »
    A->>API: GET /assistances (filtres En attente / Résolues)
    A->>API: bouton « Résoudre » (PUT /assistances/:id/resoudre)
    API->>DB: statut « Résolu », résolu par, date de résolution
    API-->>E: in-app « Votre demande … a été résolue »
    E->>API: GET /assistances (Mes demandes : statut à jour)
```

- Sur le mobile : menu ⋮ → **Assistance** : formulaire + liste « Mes demandes » avec leur statut.
- Sur le web : page **Assistance** (Accueil, Super Admin) : liste, détail, bouton **Résoudre**.
- Une demande déjà résolue ne peut pas l'être à nouveau (409).

### 6.13 Présence, classement et note d'attestation

Objectif : noter l'étudiant **sur 20** à la fin de sa formation. La moitié de la note est
calculée par le système à partir de deux critères objectifs (**paiement** et **présence**),
l'autre moitié est donnée librement par le formateur (**présentation**).

> Évolution (10/10/2026) : l'ancien barème (commentaires, réactions, paiement → 14 à 19) est
> remplacé par celui-ci. Les commentaires et réactions ne comptent plus dans la note.

#### a) Présence automatique

Il n'y a pas d'appel à faire : **un étudiant qui utilise l'application un jour est présent ce
jour-là**. À chaque requête authentifiée d'un étudiant, le serveur enregistre une ligne
`(étudiant, jour)` dans la table `presence` (une seule par jour : contrainte `UNIQUE`).

Pourquoi une table `presence` plutôt que la table `sessions` ? Une session n'est créée qu'à la
**connexion** et reste valable 24 h : un étudiant qui se connecte lundi à 18 h et rouvre
l'application mardi matin ne crée pas de nouvelle session, il ne serait donc pas compté présent
mardi. L'historique des sessions a été repris dans `presence` lors de la migration.

```mermaid
sequenceDiagram
    participant E as Étudiant (mobile)
    participant M as authMiddleware
    participant DB as Base de données
    E->>M: n'importe quelle requête (token)
    M->>DB: session active ?
    M-)DB: INSERT IGNORE presence (étudiant, aujourd'hui)
    Note over M,DB: sans attendre, une fois par jour<br/>(mémorisé côté serveur)
    M->>E: suite normale de la requête
```

#### b) Jours de cours

La formation commence à la **date d'inscription** et dure `duree_jours` jours. Seuls les jours
**du lundi au vendredi** comptent (week-ends retirés), aussi bien pour les jours de cours que
pour les présences.

Les week-ends sont comptés **sur les vraies dates** et non par une estimation : 3 mois ne font pas
exactement 4 semaines × 3 = 12 semaines, mais environ 12,9 semaines.

| Exemple : formation de 90 jours commençant un lundi | Jours |
|---|:-:|
| Jours calendaires | 90 |
| Week-ends (12 semaines complètes × 2 + 1 samedi) | 25 |
| **Jours de cours** | **65** |
| Moitié des jours de cours | 32,5 |
| Jours de cours jusqu'à 2 semaines (14 jours) avant la fin | 55 |

(L'estimation 90 − 2 × 4 × 3 = 66 donne un jour de trop ; selon le jour de début, il y a 25 ou 26
jours de week-end dans 90 jours.)

#### c) Barème

| Partie | Condition | Points |
|---|---|:-:|
| **Paiement** | régulier : aucune échéance déjà due impayée ou payée après sa date (**date d'envoi** du paiement, même en attente de validation ; refusé = ignoré) | **5** |
| | sinon | **2** |
| **Présence** | moins de la moitié des jours de cours | **+2** |
| | au moins la moitié, mais pas présent jusqu'à 2 semaines avant la fin | **+3** |
| | présent au moins autant de jours que les jours de cours jusqu'à 2 semaines avant la fin | **+5** |
| = **Note système** | calculée, sur 10 (de 4 à 10) | **/10** |
| **Présentation** | libre, donnée par le formateur | **/10** |
| = **Note d'attestation** | note système + présentation | **/20** |

Si le formateur saisit plus de 10, le système refuse : *« Vous devez attribuer une note de 10 au
maximum : les 10 autres points sont calculés par le système (paiement et présence). »*

**Classement :** par note système, puis par nombre de présences. Des étudiants à égalité
partagent le même rang.

```mermaid
flowchart LR
    P["Présence<br/>(table presence)"] --> C["Calcul<br/>GET /formations/:id/classement"]
    E["Paiements<br/>(échéances à temps)"] --> C
    C --> S[("inscription.note_suggeree /10<br/>nb_presences")]
    F["Formateur (Espace formateur)"] -->|"présentation 0 à 10<br/>PUT /inscriptions/:id/note"| N[("inscription.note_presentation /10")]
    S --> A["Attestation PDF<br/>Note = système + présentation /20"]
    N --> A
```

- La note système est recalculée à chaque consultation et juste avant la génération d'une
  attestation ; elle est **enregistrée en base**.
- L'attestation **ne peut pas être générée** tant que le formateur n'a pas noté la présentation
  (erreur 409 avec un message clair).
- Dans l'Espace formateur, le tableau affiche pour chaque étudiant : rang, jours présents / jours
  de cours, points de paiement et de présence, note système, saisie de la présentation
  (bouton **Effacer** pour la retirer) et note finale sur 20.
- Un formateur ne voit et ne note que les étudiants **de ses formations**.

### 6.14 Consultation sécurisée des documents

Objectif : les documents d'IMTECH (supports de cours, documents administratifs, pièces des
étudiants) ne doivent être lisibles **que par les personnes autorisées**, et une fuite hors
d'IMTECH doit être **difficile et traçable**.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur (web / mobile)
    participant API as API (fichierMiddleware)
    participant DB as MySQL
    participant D as Disque (uploads/)

    U->>API: GET /api/supports/cours.pdf?token=...
    API->>D: le fichier existe-t-il ?
    Note over API: non → la requête continue vers les routes de l'API (/supports/:id...)
    API->>API: token valide + session active ?
    API->>DB: droit d'accès (ex. étudiant inscrit à la formation du support ?)
    API->>D: lecture du fichier
    API->>API: filigrane « IMTECH INFO · Nom · e-mail · date »
    API-->>U: PDF / image filigrané (Cache-Control: no-store)
```

**1. Accès protégé.** Les fichiers ne sont plus servis en statique : `middlewares/fichierMiddleware.js`
garde les mêmes URL (`/api/supports/...`, `/api/documents/...`) mais exige d'être connecté.
Le token peut être passé dans l'URL (`?token=...`), car un lien, une image ou une WebView ne
peuvent pas envoyer l'en-tête `Authorization`. Les fonctions `getFileUrl` / `fileUrl` (web et
mobile) l'ajoutent automatiquement. Un lien copié ne marche plus après la déconnexion.

| Dossier | Qui peut ouvrir le fichier | Filigrane |
|---|---|:-:|
| `supports/` | Personnel et formateurs ; un **étudiant uniquement s'il est inscrit** à la formation du support | Oui |
| `documents/` | Super Admin, Accueil, Formateur | Oui, sauf fiches, factures et attestations générées par IMTECH (documents officiels remis à l'étudiant) |
| `etudiants/` (CIN, certificats, photos) | Super Admin, Accueil ; l'étudiant pour **ses propres** pièces | Oui |
| `utilisateurs/` (photos de profil) | Tout utilisateur connecté | Non |

**2. Filigrane dynamique** (`utils/filigrane.js`). Au moment où le fichier est envoyé, le serveur
écrit en diagonale, sur toute la page, le nom, l'e-mail de la personne qui consulte et la date.
Le fichier sur le disque n'est jamais modifié. Si une capture ou une photo circule hors
d'IMTECH, on sait d'où elle vient. C'est la seule protection qui fonctionne aussi contre une
photo de l'écran prise avec un autre téléphone.

**3. Formats des supports.** Un support doit être un **PDF ou une image** (PNG, JPEG, WEBP, GIF) :
ce sont les formats que l'on sait filigraner et afficher dans le lecteur sécurisé. Un autre
format est refusé à l'upload (400).

**4. Lecteur sécurisé sur le mobile** (`app/lecteur.tsx`). Le support s'ouvre **dans l'application**
(WebView) et non plus dans le navigateur externe, qui permettait de le télécharger :
- PDF affiché page par page avec pdf.js, image affichée directement ;
- le fond autour du document suit le thème clair / sombre de l'application (couleur passée à la page HTML du lecteur) ;
- pas de téléchargement, pas d'appui long « Enregistrer l'image », pas de navigation vers une autre page ;
- **captures d'écran et enregistrements vidéo bloqués** tant que le lecteur est ouvert
  (`usePreventScreenCapture`) : écran noir sur Android, bloqué sur iOS 13+ ;
- aucun cache : rien n'est conservé sur le téléphone après la lecture.
- dans la version navigateur de l'app mobile (Expo web, utilisée pour le développement), la WebView
  n'existe pas : le lecteur passe par une `<iframe>`, et les captures ne peuvent pas y être bloquées.

**Pas de consultation hors ligne** pour l'instant : elle demanderait de stocker le fichier sur
le téléphone (chiffré, dans un lecteur natif), ce qui est prévu en perspective ([§12](#12-limites-et-perspectives)).

> **Ce qui a changé.** Avant, `express.static` servait tous les fichiers uploadés **sans
> authentification** : il suffisait de connaître l'URL d'une copie de CIN ou d'un support pour
> la télécharger, même sans compte. Sur le mobile, les supports s'ouvraient dans le navigateur,
> d'où l'étudiant pouvait les enregistrer et les partager.

### 6.15 Envoi programmé des supports

Objectif : le formateur prépare un support à l'avance et choisit l'heure à laquelle il sera
envoyé. Les étudiants sont **prévenus une heure avant** pour se préparer.

*Ajouté le 10/10/2026.*

**Cycle de vie d'un support**

```mermaid
stateDiagram-v2
    [*] --> Publie : dépôt sans date (envoi immédiat)
    [*] --> Programme : dépôt avec date d'envoi
    Programme --> Programme : modification (titre, heure, fichier) / annonce 1 h avant
    Programme --> Publie : heure atteinte ou « Envoyer maintenant »
    Programme --> Supprime : Supprimer
    Publie --> Supprime : Supprimer
    Publie --> [*]
```

- **Programmé** (`support.statut = 'programme'`) = **brouillon** : invisible pour les étudiants
  (liste, détail, fichier, commentaires, réactions). Le formateur le voit dans le panneau
  « Supports programmés » de son espace et peut le **modifier** (titre, heure, fichier),
  l'**envoyer maintenant** ou le **supprimer**.
- **Publié** (`'publie'`) : visible par les étudiants inscrits ; il ne peut plus être modifié (409).

**Planificateur.** Au démarrage du serveur puis **chaque minute**, `supportProgrammeService`
vérifie les supports programmés :

```mermaid
sequenceDiagram
    participant P as Planificateur (chaque minute)
    participant DB as MySQL
    actor E as Étudiants inscrits
    actor F as Formateur
    P->>DB: programmés dont l'heure est passée ?
    P->>DB: UPDATE statut = 'publie' (si encore programmé)
    P-->>E: « Le support X a été envoyé dans la formation Y. »
    P-->>F: « Le support X a été envoyé dans la formation Y. »
    P->>DB: programmés à envoyer dans moins d'une heure, pas encore annoncés ?
    P->>DB: annonce_envoyee = true (si encore false)
    P-->>E: « Jean Rakoto va envoyer le support X dans la formation Y dans une heure (le 10/10 à 14:30). »
```

| Notification | Quand | Destinataires |
|---|---|---|
| « *Formateur* va envoyer le support « X » dans la formation Y **dans une heure** (le … à …) » | 1 h avant l'heure prévue (ou dès la programmation si l'envoi est dans moins d'une heure : « dans 20 minutes ») | Étudiants inscrits |
| « Le support « X » a été envoyé dans la formation Y. » | À l'envoi automatique | Étudiants inscrits **et** formateur |
| Même message | Envoi immédiat ou « Envoyer maintenant » | Étudiants inscrits |

- **Pas de doublon** : l'annonce et l'envoi sont « réservés » par un `UPDATE ... WHERE` qui ne
  réussit qu'une seule fois, même si deux vérifications se chevauchent.
- **Heure modifiée** après l'annonce : l'annonce repart avec la nouvelle heure.
- L'heure saisie dans le navigateur est convertie en **ISO (UTC)** avant l'envoi : le serveur
  reçoit l'instant exact, quel que soit son fuseau.
- Si le serveur était arrêté à l'heure prévue, le support part à la **première vérification**
  après le redémarrage.

### 6.16 Fil de discussion, réaction « Je n'aime pas » et avis sur les formateurs

*Ajouté le 10/10/2026.*

#### a) Commentaires en fil de discussion

Les commentaires d'un support s'affichent **comme sur les réseaux sociaux** : un commentaire
principal, et en dessous un lien « **Voir les N réponses** » qui déplie les réponses liées.

- `commentaire.id_parent` : `NULL` pour un commentaire principal, sinon l'id du commentaire
  principal auquel il répond.
- **Un seul niveau** de réponses : répondre à une réponse la rattache au même commentaire
  principal, avec « @Prénom Nom » pré-rempli (comme Facebook).
- L'API renvoie directement le fil : commentaires principaux **du plus récent au plus ancien**,
  chacun avec `reponses` (dans l'ordre chronologique) et `nb_reponses`.
- Web : 3 commentaires principaux affichés, puis « **Voir plus de commentaires** » ; les
  réponses sont repliées par défaut. Mobile : réponses repliées, bandeau « Réponse à X » au-dessus
  du champ de saisie (croix pour annuler).
- L'auteur du commentaire reçoit une notification « *X* a répondu à votre commentaire sur le
  support … ».
- Supprimer un commentaire principal supprime aussi ses réponses (elles ne s'affichent plus).

```mermaid
sequenceDiagram
    actor E as Étudiant
    participant API
    participant DB as MySQL
    E->>API: POST /commentaires { id_support, contenu, id_parent }
    API->>DB: le commentaire visé est-il sur ce support ?
    Note over API: réponse à une réponse → rattachée<br/>au commentaire principal
    API->>DB: INSERT commentaire (id_parent = principal)
    API-->>E: notification « X a répondu à votre commentaire » (à l'auteur visé)
    E->>API: GET /supports/:id/commentaires
    API-->>E: [ { principal, nb_reponses, reponses: [...] }, ... ]
```

#### b) Réaction « Je n'aime pas » (👎)

Quatrième type de réaction (`type_reaction.nom = 'dislike'`), à côté de 👍 J'aime, ❤️ J'adore
et 💡 Utile. Les applications envoient désormais le **nom** du type (`{ type_reaction: 'dislike' }`)
plutôt que son id, qui pouvait varier d'une base à l'autre. On ne peut réagir qu'à un support
**publié**.

#### c) Avis des étudiants sur les formateurs (back-office)

Sur le **tableau de bord** (Super Admin, Accueil), le panneau « Avis des étudiants sur les
formateurs » liste chaque formateur avec les réactions reçues sur ses supports publiés.

| Indicateur | Calcul |
|---|---|
| Réactions positives | 👍 + ❤️ + 💡 |
| Réactions négatives | 👎 |
| % positif | positives / (positives + négatives) |
| **Compétent** | au moins **5 réactions** et au moins **60 %** de positives |
| **Non compétent** | au moins 5 réactions et moins de 60 % de positives |
| **Pas assez d'avis** | moins de 5 réactions : on ne conclut pas |

Présentation (même tableau que la page Paiements, composants communs `Tableau` et `SearchFilterBar`) :

| Colonne | Contenu |
|---|---|
| # | Rang dans le classement affiché |
| Formateur | Photo, nom, nombre de supports publiés |
| Réactions | Pastilles 👍 ❤️ 💡 👎 avec leur nombre (👎 en rouge) |
| Total | Nombre total de réactions |
| Positif | Barre de progression + % (vert ≥ 60 %, orange ≥ 40 %, rouge en dessous) |
| Avis | Badge Compétent (vert) / Non compétent (rouge) / Pas assez d'avis (gris) |

- Tri par défaut : compétents, puis non compétents, puis pas assez d'avis (à avis égal : meilleur %).
- Barre au-dessus du tableau : recherche d'un formateur, filtre par avis, tri par type de réaction
  (👍, ❤️, 💡, 👎), par % positif, par nombre de réactions ou de supports ; bouton Réinitialiser.
- Les seuils sont des constantes (`AVIS_MINIMUM`, `TAUX_COMPETENT` dans `services/reactionService.js`).

### 6.17 Vitrine publique et inscription en ligne

*Ajouté le 10/10/2026.*

Objectif : une personne **non inscrite** qui ouvre l'application mobile découvre l'offre
d'IMTECH INFO (comme la page d'accueil de Wattpad) et peut s'inscrire seule, à une ou plusieurs
formations. L'inscription suit **la même méthode que l'Accueil** : compte, inscription +
échéancier, premier paiement, puis **validation par l'Accueil**.

#### a) La vitrine (`app/decouvrir.tsx`, sans connexion)

C'est le premier écran de l'application quand personne n'est connecté (lien « Se connecter »
en haut ; l'écran de connexion renvoie aussi vers la vitrine).

| Bloc | Contenu | Source |
|---|---|---|
| Bandeau | Logo, slogan, présentation, nombre de formations et de formateurs reconnus | `config/vitrine.js` (.env) |
| Formations disponibles | Couvertures colorées en carrousel : nom, formateur, tarif, badge « Formateur compétent » ; « + » pour en choisir plusieurs | `GET /public/vitrine` |
| Fiche d'une formation | Description, formateur et % d'avis positifs, durée, tarif, **engagement de disponibilité du formateur** ; boutons « Ajouter à ma sélection » et « S'inscrire » | `formation.engagement_formateur` (saisi dans le back-office) |
| Formateurs les mieux notés | Formateurs jugés **compétents** (voir 6.16) et leurs formations | `reactionService.avisFormateurs` |
| Notre engagement | Disponibilité, supports dans l'app, attestation vérifiable, paiement en tranches | texte fixe |
| Nous contacter | Facebook, e-mail, WhatsApp (ouverts dans l'application correspondante) | `.env` : `IMTECH_FACEBOOK_URL`, `IMTECH_EMAIL`, `IMTECH_WHATSAPP`... |

Aucune donnée personnelle d'étudiant n'est exposée (seulement le nombre d'inscrits).

#### b) L'inscription en ligne (une ou plusieurs formations)

```mermaid
sequenceDiagram
    actor V as Visiteur (mobile)
    participant API
    participant DB as MySQL
    actor A as Accueil (web)
    V->>API: POST /public/inscriptions { identité, mot de passe, formations[], mode, référence }
    API->>API: formulaire valide ? e-mail libre ? (5 essais / heure / appareil)
    API->>DB: BEGIN
    API->>DB: compte utilisateur + dossier étudiant
    loop pour chaque formation choisie
        API->>DB: inscription (origine en_ligne, non validée) + échéancier (même fonction que l'Accueil)
        API->>DB: premier paiement EN ATTENTE (montant de la 1re échéance)
    end
    API->>DB: COMMIT (tout ou rien)
    API-->>A: notification « Nouvelle inscription en ligne… »
    API-->>V: « Inscription envoyée » + total à payer ; il peut se connecter
    A->>API: Inscriptions → filtre « En ligne » → Valider (pour CHAQUE inscription)
    API->>DB: inscription validée + paiement déclaré validé (pas de second paiement)
```

- **Même fonction que l'Accueil** : `inscriptionService.creerInscriptionDans` (inscription +
  échéancier) est appelée en boucle, une fois par formation, dans une seule transaction.
- **Chaque inscription est validée séparément** par l'Accueil (bouton « Valider » habituel).
  À la validation, le paiement déclaré est validé (mode et référence corrigeables) au lieu
  d'enregistrer un second paiement.
- **Compte créé tout de suite** : l'étudiant peut se connecter (e-mail pré-rempli) ; ses
  formations affichent « En attente de validation par l'accueil » et **les fichiers des supports
  ne s'ouvrent qu'après la validation**.
- Les pièces du dossier (CIN, certificat de résidence, photos) ne sont pas demandées en ligne :
  l'Accueil les complète lors de la validation.
- Une même formation choisie deux fois ne compte qu'une fois ; 1 à 4 tranches par formation ;
  mot de passe de 8 caractères minimum ; e-mail déjà utilisé → 409.

#### c) Images de la vitrine

*Ajouté le 11/10/2026.*

- Le bandeau du haut affiche le titre **« Découvrir »** sur une image de réseau de neurones
  (`mobile/assets/images/fond-decouvrir.jpg`, embarquée dans l'application), sous un voile bleu
  nuit qui garde le texte lisible. Il remplit tout le haut de l'écran, barre d'état comprise.
- **Fond modifiable par le Super Admin** : web, Paramètres > Apparence > « Fond de la vitrine
  mobile » → `PUT /vitrine/fond` (image enregistrée dans `uploads/vitrine/`, chemin gardé dans la
  table `parametre_application`, clé `fond_vitrine`). « Par défaut » → `DELETE /vitrine/fond`.
  `GET /public/vitrine` renvoie ce chemin dans `presentation.fond` ; l'application mobile l'affiche,
  ou l'image embarquée si `fond` est `null`. Contrairement au logo du web (gardé dans le navigateur),
  le fond est stocké sur le serveur, car c'est l'application mobile qui l'affiche.
- Chaque formation a une **photo de couverture** : colonne `formation.image`
  (`formations/xxx.jpg` dans `uploads/`). Le Super Admin la choisit dans le formulaire de la
  formation (web) → `PUT /formations/:id/image`. Sans image, la couverture reste une couleur avec
  les initiales.
- Les couvertures sont **publiques** : la vitrine est consultée sans connexion, le dossier
  `uploads/formations` (et `uploads/vitrine` pour le fond) est donc servi sans token ni filigrane
  (contrairement aux supports et documents).
- Images de démonstration : photos libres de droits de Wikimedia Commons, téléchargées et
  recadrées par `node scripts/fichiersDemo.js`.

| Image | Fichier Wikimedia Commons | Auteur | Licence |
|---|---|---|---|
| Fond « Découvrir » (`mobile/assets/images/fond-decouvrir.jpg`) | Neural network - Midjourney and Grok.png | Midjourney (prompt suggéré par Grok) | Domaine public |
| Développement web | Colorful code (Unsplash).jpg | Markus Spiske | CC0 |
| Bureautique | Working in open office space (Unsplash).jpg | Crew | CC0 |
| Réseaux informatiques | EthernetSwitch.jpg | Raysonho (Open Grid Scheduler) | CC0 |
| Infographie | Math tools utensils (Unsplash).jpg | Jazmin Quaynor | CC0 |
| Python pour débutants | Laptop coding programs (Unsplash).jpg | Tirza van Dijk | CC0 |
| Excel avancé | Desktop with laptop and calculator (Unsplash).jpg | Auteur inconnu | CC0 |

### 6.18 Supports mis en forme : texte riche, audio, vidéo et liens

*Ajouté le 11/10/2026.*

Objectif : le formateur publie un support comme dans un petit CMS. Un support contient un
**titre**, et au choix un **texte mis en forme**, une **pièce jointe** (PDF, image, audio, vidéo),
ou les deux. L'envoi immédiat ou programmé ([§6.15](#615-envoi-programmé-des-supports)), les
commentaires et les réactions ne changent pas.

#### a) Rédaction (web, espace formateur)

1. Le formateur choisit la formation et saisit le titre.
2. Il rédige dans l'éditeur (`components/editeur/EditeurTexte.jsx`) : **gras**, *italique*,
   souligné, barré, titre / sous-titre, listes à puces ou numérotées, citation, **lien** (sur le
   texte sélectionné ; `www.site.com` devient `https://www.site.com`).
3. Il joint éventuellement un fichier (50 Mo max) : PDF, image, audio (MP3, M4A, OGG, WAV) ou
   vidéo (MP4, WEBM, MOV).
4. Le formulaire envoie `titre`, `contenu` (le HTML de l'éditeur) et `fichier` à `POST /supports`.
   Un brouillon programmé se modifie de la même façon (`PUT /supports/:id`).

#### b) Contrôles du serveur

```
contenu (HTML du navigateur)
   │  utils/contenuRiche.js — sanitize-html, liste blanche
   ▼
<p> <br> <strong> <em> <u> <s> <h2> <h3> <ul> <ol> <li> <blockquote> <a href="http(s)|mailto">
   │  tout le reste supprimé (script, style, attributs on*, images, iframes, javascript:...)
   ▼
support.contenu (MEDIUMTEXT)   ← HTML toujours propre en base
```

- Il faut un texte **ou** un fichier ; sans fichier, le titre est obligatoire. Un texte vide
  laissé par l'éditeur (`<p><br></p>`) compte comme « pas de texte ».
- Un brouillon sans fichier ne peut pas perdre son texte.
- Pourquoi nettoyer côté serveur : le texte est affiché chez **tous** les étudiants de la
  formation. Sans liste blanche, un `<script>` glissé dans le texte (formateur malveillant ou
  compte volé) s'exécuterait chez eux (faille **XSS**) et pourrait voler leur session.

#### c) Lecture

| | Web (`SupportItem` → `ContenuSupport`) | Mobile (détail du support) |
|---|---|---|
| Texte | HTML injecté tel quel (déjà nettoyé) | `TexteRiche` : balises converties en composants natifs `<Text>` / `<View>` |
| Liens | Nouvel onglet, `rel="noopener noreferrer"` | Ouverts dans le navigateur (`Linking`), http(s) / mailto seulement |
| Audio / vidéo | Lecteur intégré, sans bouton « Télécharger » ni clic droit | Lecteur sécurisé (`app/lecteur.tsx`) : lecteur HTML5 dans la WebView, captures bloquées |
| PDF / image | Inchangé (lien, fichier filigrané) | Inchangé (lecteur sécurisé, filigrane) |

Les fichiers audio / vidéo passent par le même contrôle d'accès que les autres supports
([§6.14](#614-consultation-sécurisée-des-documents)) mais **sans filigrane** (impossible à
ajouter à la volée) ; le serveur les sert par morceaux (`Range`) pour permettre d'avancer dans
la lecture. Dans la liste des documents (web), un support texte seul n'apparaît pas (pas de fichier).

---

## 7. Sécurité

| Menace | Protection mise en place |
|---|---|
| Vol de mot de passe en base | Hachage `bcrypt` ; les hashs ne sont jamais renvoyés ni journalisés |
| Utilisation d'un token après déconnexion | Vérification de la session active à chaque requête |
| Accès à une fonction non autorisée | `checkRole` sur chaque route |
| Accès aux données d'un autre utilisateur (IDOR) | Contrôles de propriétaire (étudiant, formateur, compte) |
| Élévation de privilèges | Seul le Super Admin peut changer un rôle ; rôle Étudiant imposé à la création d'un dossier |
| Fraude sur les paiements | Montant imposé, échéance vérifiée, validation humaine par l'Accueil |
| Injection SQL | Requêtes paramétrées (`?`) dans tous les models |
| Fuite d'informations techniques | Les erreurs 500 renvoient un message générique |
| Énumération des comptes | « Mot de passe oublié » renvoie la même réponse que l'e-mail existe ou non |
| Fichiers malveillants | Liste blanche des types de fichiers et taille maximale à l'upload |
| Script injecté dans le texte d'un support (XSS) | HTML nettoyé à l'enregistrement par une liste blanche de balises (`sanitize-html`), liens http(s) / mailto uniquement ([§6.18](#618-supports-mis-en-forme--texte-riche-audio-vidéo-et-liens)) |
| Accès aux fichiers par URL | Fichiers servis uniquement à un utilisateur connecté ayant le droit de les voir ([§6.14](#614-consultation-sécurisée-des-documents)) |
| Fuite des documents hors d'IMTECH | Filigrane au nom de la personne, lecteur mobile sans téléchargement, captures bloquées sur mobile |
| Secret JWT faible ou absent | Le serveur refuse de démarrer sans `JWT_SECRET` |

> **Limite connue** : sur le **web**, un navigateur ne permet pas d'empêcher une capture d'écran.
> Le filigrane reste la protection principale. Voir [§12](#12-limites-et-perspectives).

---

## 8. Gestion des erreurs

Toutes les erreurs suivent le même chemin : la couche qui détecte le problème **lève**
une erreur, et un **gestionnaire unique** (dans `app.js`) construit la réponse.

| Code | Signification | Exemple |
|---|---|---|
| 400 | Requête invalide | Champ obligatoire manquant, montant négatif, JSON mal formé, fichier trop lourd |
| 401 | Non authentifié | Token absent, expiré, ou session révoquée |
| 403 | Interdit | Mauvais rôle, ou ressource appartenant à quelqu'un d'autre |
| 404 | Introuvable | Paiement, étudiant, formation inexistants |
| 409 | Conflit | E-mail déjà utilisé, échéance déjà réglée, paiement déjà traité, inscription déjà validée |
| 500 | Erreur inattendue | Message générique ; le détail est écrit uniquement dans les logs du serveur |

> **Ce qui a changé.** Chaque controller contenait son propre `try/catch` renvoyant un 500
> générique, et certains devinaient le code HTTP en lisant le texte du message d'erreur.
> Le nouveau système (`utils/errors.js` + gestionnaire unique) supprime cette duplication.

---

## 9. Qualité et tests

### 9.1 Tests automatisés du backend

Lancement : `cd backend-imtech && npm test` (81 tests, sans base de données : les models
sont remplacés par des simulations).

| Fichier | Ce qui est vérifié |
|---|---|
| `tests/echeancier.test.js` | Somme exacte des tranches, arrondi, dates, refus d'un nombre de tranches invalide |
| `tests/paiementService.test.js` | Paiement étudiant en attente au montant imposé, refus sur l'échéance d'un autre, double paiement, plafond du reste à payer, validation unique, liste limitée à l'étudiant |
| `tests/classement.test.js` | Jours de cours sans les week-ends, points de paiement (5 / 2) et de présence (2 / 3 / 5), note système de 4 à 10, note finale /20, égalités au classement |
| `tests/supportProgramme.test.js` | Annonce 1 h avant (texte, destinataires), envoi automatique (étudiants + formateur), pas de doublon, date d'envoi invalide ou passée refusée, brouillon d'un autre formateur ou déjà envoyé non modifiable |
| `tests/commentairesReactions.test.js` | Fil de discussion (ordre, réponses rattachées, réponses orphelines masquées), réponse refusée sur un autre support, réaction inconnue ou sur un support non publié refusée, 👎 enregistré, avis compétent / non compétent / pas assez d'avis et tri |
| `tests/vitrine.test.js` | Formulaire d'inscription en ligne (champs, mot de passe, tranches, doublons), inscription à 2 formations (2 inscriptions « en ligne », 2 paiements en attente, total), e-mail déjà utilisé, validation qui reprend le paiement déclaré, route publique limitée à 5 essais par heure, fond du bandeau (enregistrement, retour au fond par défaut, modification refusée sans connexion) |
| `tests/fichiers.test.js` | Fichier refusé sans connexion, support refusé à un étudiant non inscrit, PDF et image filigranés et sans cache, token accepté dans l'URL, documents administratifs refusés aux étudiants, routes `/supports/:id` toujours accessibles, `../` impossible, support Word refusé à l'upload, couverture de formation publique sans filigrane |
| `tests/contenuRiche.test.js` | Texte mis en forme : balises gardées ou converties, XSS supprimé (script, `onclick`, `javascript:`), liens en nouvel onglet, texte vide ; support texte seul, support vide ou sans titre refusé, texte d'un brouillon sans fichier non supprimable |
| `tests/autorisations.test.js` | Tests HTTP de bout en bout : 401 sans token, session révoquée refusée, étudiant ne pouvant pas modifier un autre compte ni changer son rôle, accès au tableau de paiement d'autrui refusé, tokens jamais renvoyés, erreur 500 sans fuite |

### 9.2 Analyse statique

| Projet | Outil | Résultat |
|---|---|---|
| Web | ESLint | 0 erreur (avertissements restants : dépendances de hooks) |
| Mobile | ESLint (config Expo) + TypeScript (`tsc --noEmit`) | 0 erreur, typage valide |
| Web | Build de production (`vite build`) | OK |

---

## 10. Organisation du code

```
gestionFormation_stage/
├── FLUX-APPLICATION.md         ← ce document
├── MODIFICATIONS.md            ← journal détaillé des modifications
│
├── backend-imtech/             API REST (Node.js / Express 5)
│   ├── app.js                  configuration Express, fichiers protégés, gestionnaire d'erreurs
│   ├── api.md                  liste des routes et des droits
│   ├── config/
│   │   ├── db.js               pool MySQL
│   │   └── roles.js            constantes des rôles
│   ├── routes/routes.js        toutes les routes /api/...
│   ├── middlewares/            authMiddleware (token, rôle, propriétaire), docUpload (multer),
│   │                           fichierMiddleware (accès protégé aux fichiers + filigrane)
│   ├── controllers/            un fichier par domaine (paiement, inscription, support...)
│   ├── services/               règles métier
│   ├── models/                 requêtes SQL
│   ├── utils/                  errors, transaction, mailer, pdf, qrcode, filigrane
│   ├── tests/                  tests automatisés
│   ├── scripts/fichiersDemo.js fichiers des données de démonstration
│   └── base.sql, alter2.sql, donneesTest.sql, reinit.sql
│
├── web/                        back-office (React + Vite)
│   └── src/
│       ├── utils/api.js        apiRequest + gestion de la session
│       ├── hooks/              un hook par ressource (usePaiement, useEtudiant...)
│       ├── components/         composants réutilisables (Tableau, Modal, Filter, Sidebar...)
│       └── pages/              une page par menu (paiements, inscriptions, échéances...)
│
└── mobile/                     application étudiant (React Native + Expo)
    └── src/
        ├── app/                écrans (Expo Router : navigation par fichiers)
        │   ├── (tabs)/         Accueil, Formations, Documents, Notifications, Profil
        │   ├── login.tsx, paiements.tsx, parametres.tsx
        │   ├── lecteur.tsx     lecteur sécurisé des supports (WebView, captures bloquées)
        ├── constants/api.ts    URL de l'API et liste des endpoints
        ├── context/            AuthContext (utilisateur connecté), SettingsContext (thème)
        ├── hooks/              un hook par ressource (use-paiement, use-support...)
        ├── components/         composants (modal de paiement, commentaires, réactions...)
        ├── styles/             styles séparés des écrans, dépendants du thème
        └── utils/              api.ts, format.ts
```

---

## 11. Évolutions apportées pendant la revue

### 11.1 Démarche

1. **Audit** du code existant (structure, sécurité, qualité) avec une note initiale d'environ 6,5/10.
2. **Priorisation** : d'abord les failles de sécurité, ensuite les bugs, enfin la qualité.
3. **Décision métier** prise avec le porteur du projet : les paiements des étudiants doivent
   être validés par l'Accueil.
4. **Corrections**, puis **vérification** : tests automatisés, lint, build, et appels réels de
   l'API sur la base locale.

### 11.2 Synthèse avant / après

| Domaine | Avant | Après |
|---|---|---|
| Contrôle d'accès | Rôle vérifié, mais pas le propriétaire des données | Rôle **et** propriétaire vérifiés côté serveur |
| Comptes | Tout utilisateur pouvait modifier n'importe quel compte et son rôle | Chacun son compte ; rôles réservés au Super Admin |
| Paiements | Auto-validés par l'étudiant, montant libre | En attente puis validés par l'Accueil, montant imposé |
| Sessions | Déconnexion sans effet côté serveur | Sessions révocables, vérifiées à chaque requête |
| Données sensibles | Tokens et hash dans les logs et les réponses | Supprimés |
| Cohérence des données | Opérations liées sans transaction | Transactions (inscription + échéancier, validation + paiement, dossier étudiant) |
| Erreurs | `try/catch` copiés dans chaque controller | Gestionnaire unique, codes HTTP cohérents |
| Couches | SQL dans certains services | SQL uniquement dans les models |
| Configuration | IP et URL écrites en dur | Variables d'environnement + détection automatique |
| Fichiers | Servis à tous sans connexion, ouverts dans le navigateur sur mobile | Accès contrôlé, filigrane, lecteur intégré, captures bloquées sur mobile |
| Tests | Aucun | 69 tests automatisés |
| Lint | 25 erreurs (web), 20 (mobile) | 0 erreur |

### 11.3 Bugs corrigés (résumé)

- Notifications de mention jamais envoyées.
- Notifications supprimées qui réapparaissaient.
- Photo de profil effacée lors d'une modification ; mot de passe saisi par l'admin ignoré.
- Modification de la référence d'un paiement sans effet.
- Première échéance payée deux fois en cas de double validation.
- Centimes perdus dans l'échéancier.
- Retards mal comptés en cas de paiement en plusieurs fois.
- Ouverture d'un support impossible sur mobile.
- Erreurs du formulaire de profil web jamais affichées.
- Fiche étudiant (web) : une longue description de formation élargissait le tableau et repoussait la liste des documents (description limitée à 2 lignes, colonnes fixes).
- Aperçu d'un document (web) : la barre du haut restait claire au-dessus du voile sombre (ordre d'affichage corrigé).

Le détail complet se trouve dans [`MODIFICATIONS.md`](MODIFICATIONS.md).

---

## 12. Limites et perspectives

| Priorité | Limite actuelle | Piste d'amélioration |
|---|---|---|
| Moyenne | Pas de consultation des supports hors ligne sur le mobile | Téléchargement dans le stockage privé de l'app, **chiffré** (clé dans `expo-secure-store`), lu par un lecteur natif, avec une durée de validité hors ligne |
| Moyenne | Captures d'écran impossibles à bloquer sur le web, et photo de l'écran toujours possible | Le filigrane permet d'identifier l'origine d'une fuite ; journal des consultations (`acces_document`) |
| Basse | Token de session visible dans l'URL des fichiers (historique du navigateur, logs) | Liens signés de courte durée (quelques minutes) dédiés aux fichiers |
| Basse | pdf.js chargé depuis un CDN par le lecteur mobile | L'embarquer dans l'application |
| Moyenne | Paiement mobile déclaratif (aucun paiement réel en ligne) | Intégration d'un opérateur de Mobile Money avec confirmation automatique (webhook) |
| Moyenne | Chargement des données dans des `useEffect` (avertissements de lint) | Bibliothèque de gestion des requêtes (TanStack Query) : cache, rechargement, états |
| Moyenne | Pas de tests sur le web et le mobile | Vitest + React Testing Library (web), Jest (mobile) |
| Basse | Validation des entrées au cas par cas | Schémas de validation (`zod`) partagés |
| Basse | Pas de journal d'audit | Tracer qui valide / refuse un paiement et quand |
| Basse | Annonce et envoi des supports : notifications in-app seulement | Notification push sur le téléphone (Expo Notifications) pour prévenir même application fermée |
| Basse | Alertes vérifiées toutes les heures par le serveur lui-même | Planificateur dédié (cron) si l'API est déployée sur plusieurs serveurs |
| Basse | Présence = « a utilisé l'application ce jour-là », pas une vraie présence en cours | Pointage par QR code affiché en salle, ou durée minimale d'utilisation par jour |
| Basse | Jours fériés comptés comme jours de cours | Table des jours fériés retirés du calcul |
| Moyenne | Avis sur les formateurs basé uniquement sur les réactions (un étudiant peut réagir sans avoir lu le support) | Combiner avec un questionnaire de satisfaction en fin de formation ; ne compter que les réactions des étudiants inscrits |
| Moyenne | Inscription en ligne sans vérification de l'e-mail ni pièces justificatives | Code de confirmation envoyé par e-mail ; envoi des pièces depuis l'application |
| Basse | Limite anti-abus de l'inscription en ligne gardée en mémoire (remise à zéro au redémarrage) | Limiteur partagé (Redis) si l'API est déployée sur plusieurs serveurs |
| Basse | Assistance sans réponse écrite | Ajouter un message de réponse de l'Accueil, visible sur le mobile |
| Moyenne | Audio et vidéo sans filigrane (un enregistrement peut circuler sans trace de son origine) | Filigrane incrusté une fois à l'envoi (ffmpeg), ou diffusion en streaming chiffré (HLS) |
| Basse | Un support n'a qu'une pièce jointe | Table `support_fichier` pour plusieurs pièces jointes, ou insertion des médias dans le texte |
| Basse | Éditeur basé sur `document.execCommand` (ancienne API, encore prise en charge par les navigateurs) | Éditeur dédié (TipTap / ProseMirror) |
| Basse | Déploiement manuel | Intégration continue (tests + lint à chaque push) et environnement de production |

---

## 13. Glossaire

| Terme | Définition |
|---|---|
| **API REST** | Interface par laquelle les applications communiquent avec le serveur via des URL et des méthodes HTTP (GET, POST, PUT, DELETE) |
| **JWT** | *JSON Web Token* : jeton signé remis à la connexion, prouvant l'identité et le rôle de l'utilisateur |
| **Session** | Ligne de la table `sessions` représentant une connexion d'un appareil ; peut être révoquée |
| **Présence** | Jour (du lundi au vendredi) où l'étudiant a utilisé l'application, enregistré automatiquement |
| **Fil de discussion** | Commentaire principal suivi de ses réponses (un seul niveau), repliées derrière « Voir les réponses » |
| **Avis sur un formateur** | Compétent / non compétent selon la part de réactions positives reçues sur ses supports |
| **Vitrine** | Écran public de l'application mobile présentant les formations, les formateurs compétents et les contacts |
| **Inscription en ligne** | Inscription faite par l'étudiant lui-même depuis la vitrine ; validée ensuite par l'Accueil |
| **Note système** | Partie de la note d'attestation calculée par l'application (paiement + présence), sur 10 |
| **Middleware** | Fonction exécutée avant le controller (authentification, contrôle de rôle, upload) |
| **IDOR** | *Insecure Direct Object Reference* : accéder aux données d'un autre en changeant un identifiant dans l'URL |
| **Transaction** | Groupe d'opérations SQL appliquées entièrement ou pas du tout (`COMMIT` / `ROLLBACK`) |
| **Suppression logique** | Masquer une ligne (`etat = false`) au lieu de l'effacer |
| **Échéance** | Montant à payer à une date donnée pour une inscription |
| **Échéancier** | Ensemble des échéances d'une inscription |
| **Tranche** | Type de découpage d'un paiement (référentiel `tranche`) |
| **Statut de paiement** | `en_attente`, `valide` ou `refuse` |
| **Filigrane** | Texte (nom, e-mail, date) imprimé en transparence sur un document pour identifier la personne qui l'a consulté |
| **WebView** | Composant qui affiche une page web à l'intérieur de l'application mobile |
| **FLAG_SECURE** | Option Android qui rend l'écran noir dans les captures et les enregistrements vidéo |
| **Hachage (bcrypt)** | Transformation irréversible d'un mot de passe avant stockage |
