# Paiement MVola (API Merchant Pay) — plan d'intégration

Objectif : l'étudiant paie une échéance **depuis l'application mobile avec MVola**. Il reçoit une
demande sur son téléphone, la confirme avec son code secret MVola, et le paiement passe à
**« validé » tout seul** : l'accueil n'a plus besoin de vérifier.

Ce fichier sert de cahier des charges pour coder la fonctionnalité. Le paiement actuel est décrit
dans [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md), **étape 5** du parcours ; les règles à respecter
(argent, dates, SQL, tests) sont dans sa partie 7. Tout ce qui touche à l'API
MVola (adresses, en-têtes, champs) est à **vérifier sur le portail développeur MVola** avant de
coder (voir « Points à vérifier » à la fin).

---

## 1. Ce qui existe aujourd'hui (à réutiliser)

| Élément | Où | Rôle |
|---|---|---|
| Paiement déclaré par l'étudiant | `backend-imtech/services/paiementService.js` → `enregistrerPaiement` | Vérifie que l'échéance est à lui, qu'il reste à payer, qu'aucun paiement n'est déjà en attente ; insère un paiement **en_attente** avec le montant imposé (reste à payer) |
| Validation / refus | `paiementService.traiterPaiementEnAttente(id, statut)` (+ `validerPaiement`, `refuserPaiement`) | Passe `en_attente` → `valide` / `refuse` **une seule fois** (`changerStatutPaiementEnAttente` : `WHERE statut = 'en_attente'`) et notifie l'étudiant |
| Prévenir l'accueil | `paiementService.prevenirPersonnelPaiement` | Notification « X a payé … Paiement à valider. » |
| Statuts | `models/paiementModel.js` → `STATUTS_PAIEMENT` (`en_attente`, `valide`, `refuse`) | |
| Table | `paiement` (id_echeance, id_mode_paiement, montant, date_paiement DATETIME, reference_virement, statut, etat) | |
| Modes | table `mode_paiement` : aujourd'hui **1 Cash, 2 Virement bancaire** (pas de MVola) | |
| Tâches automatiques | `app.js` lance `alerteService.demarrerAlertesAutomatiques()` et `supportProgrammeService.demarrerEnvoisProgrammes()` au démarrage | Modèle à suivre pour le suivi des transactions MVola |
| Mobile | `mobile/src/hooks/use-paiement.ts` → `payerProchaineEcheance(mode)` (POST `/paiements`) ; `mobile/src/components/paiement/paiement-modal.tsx` (liste `MODES_PAIEMENT` **écrite en dur**, ids 1 et 2) | |
| Web | `web/src/pages/paiements/Paiements.jsx` (liste, valider / refuser) | |

Règles du projet à respecter :
- **Pas de nouvelle migration dans `alter2.sql`** : tout changement SQL va dans **`alter.sql`** (et
  dans `base.sql` pour une installation neuve), puis on **exécute** `alter.sql` sur la base locale
  (`C:\xampp\mysql\bin\mysql -u root < alter.sql`). Écrire des instructions rejouables
  (`IF NOT EXISTS`, `INSERT … WHERE NOT EXISTS`), parce que tout le fichier est rejoué.
- Les dates sont des `DATETIME` en **heure locale (Madagascar)** ; une expiration ou une date limite
  se calcule **dans MySQL** (`NOW()`, `DATE_ADD`) et non dans Node (voir sessions / mot de passe oublié).
- Style : commentaires en français, noms en français, même découpage routes → controllers → services → models.
- Tests : `node --test` avec `mock.method` (voir `tests/notifications.test.js`, `tests/logo.test.js`).

---

## 2. Prérequis côté IMTECH (hors code)

1. Un **compte marchand MVola** (contrat avec Telma) : il fournit le **numéro marchand** qui reçoit l'argent.
2. Un compte sur le **portail développeur MVola** : y créer une application, ce qui donne une
   **Consumer Key** et un **Consumer Secret**.
3. Travailler d'abord sur le **bac à sable** (`https://devapi.mvola.mg`) avec les numéros de test
   du portail, puis passer en **production** (`https://api.mvola.mg`) quand Telma l'autorise.
4. Pour recevoir l'**appel de retour (callback)**, le serveur doit être joignable depuis Internet. En local,
   utiliser un tunnel (ex. `ngrok http 3000`) ou s'appuyer seulement sur le **suivi par interrogation** (§5.4).

---

## 3. L'API MVola (Merchant Pay 1.0.0) — résumé

> Chemins et champs relevés dans des copies de la documentation et des bibliothèques non officielles
> (Python `mvola`, Dart `mvola`, PHP `dadapas/mvola-php`). **À confirmer sur le portail.**

### 3.1 Jeton d'accès (OAuth2 « client credentials »)
```
POST {MVOLA_BASE_URL}/token
Authorization: Basic base64(CONSUMER_KEY:CONSUMER_SECRET)
Content-Type: application/x-www-form-urlencoded
Cache-Control: no-cache

grant_type=client_credentials&scope=EXT_INT_MVOLA_SCOPE
```
Réponse : `{ access_token, token_type: "Bearer", expires_in: 3600 }`. On le **garde en mémoire** et on le
redemande 60 s avant expiration.

### 3.2 Demander un paiement
```
POST {MVOLA_BASE_URL}/mvola/mm/transactions/type/merchantpay/1.0.0/
Authorization: Bearer <access_token>
Version: 1.0
X-CorrelationID: <uuid généré par nous>
UserLanguage: FR
UserAccountIdentifier: msisdn;<MVOLA_MARCHAND_NUMERO>
partnerName: <MVOLA_PARTNER_NAME>
X-Callback-URL: <MVOLA_CALLBACK_URL>
Content-Type: application/json
Cache-Control: no-cache
```
```json
{
  "amount": "150000",
  "currency": "Ar",
  "descriptionText": "IMTECH echeance 42",
  "requestingOrganisationTransactionReference": "IMT-42-1729851234",
  "requestDate": "2026-10-25T14:30:00.000Z",
  "originalTransactionReference": "IMT-42-1729851234",
  "debitParty":  [{ "key": "msisdn", "value": "0343500003" }],
  "creditParty": [{ "key": "msisdn", "value": "<MVOLA_MARCHAND_NUMERO>" }],
  "metadata": [
    { "key": "partnerName", "value": "IMTECH INFO" },
    { "key": "fc", "value": "USD" },
    { "key": "amountFc", "value": "1" }
  ]
}
```
- `amount` est une **chaîne**, sans décimales.
- `descriptionText` est court (≤ 50 caractères) et **sans caractères spéciaux** (pas d'accents ni de `#`).

Réponse attendue (202) : `{ "status": "pending", "serverCorrelationId": "…", "notificationMethod": "callback" | "polling" }`.

L'étudiant reçoit alors une demande sur son téléphone et la confirme avec son code MVola.

### 3.3 Suivre la transaction
```
GET {MVOLA_BASE_URL}/mvola/mm/transactions/type/merchantpay/1.0.0/status/{serverCorrelationId}
(mêmes en-têtes, sans corps)
```
Réponse : `{ "status": "pending" | "completed" | "failed", "serverCorrelationId": "…", "objectReference": "<référence MVola>" }`.

Détail d'une transaction terminée : `GET …/merchantpay/1.0.0/{transactionReference}`.

### 3.4 Appel de retour (callback)
MVola envoie une requête **PUT** sur `X-Callback-URL` avec, entre autres, `transactionStatus`
(`completed` / `failed`), `serverCorrelationId` et `transactionReference`.
**On ne fait jamais confiance au corps** de cet appel : on s'en sert seulement pour savoir quelle
transaction revérifier, puis on **redemande le statut à MVola** (§3.3) avant de valider.

---

## 4. Base de données (dans `alter.sql` + `base.sql`)

```sql
-- Mode de paiement MVola (rejouable)
INSERT INTO mode_paiement (nom, etat)
SELECT 'MVola', true FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM mode_paiement WHERE nom = 'MVola');

-- Une ligne par demande envoyée à MVola (suivi, audit, rejeu de l'appel de retour)
CREATE TABLE IF NOT EXISTS transaction_mvola (
    id_transaction INT AUTO_INCREMENT PRIMARY KEY,
    id_paiement INT NOT NULL,
    numero_payeur VARCHAR(20) NOT NULL,             -- numéro MVola de l'étudiant (034 / 038…)
    correlation_id CHAR(36) NOT NULL,               -- X-CorrelationID envoyé (uuid)
    server_correlation_id VARCHAR(100) NULL,        -- renvoyé par MVola, sert à suivre le statut
    reference_mvola VARCHAR(100) NULL,              -- objectReference / transactionReference final
    statut ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    message_erreur VARCHAR(255) NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_maj DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_paiement) REFERENCES paiement(id_paiement),
    UNIQUE KEY uk_mvola_server_corr (server_correlation_id),
    KEY idx_mvola_statut (statut, date_creation)
);
```
- Le paiement lui-même reste dans `paiement` (statut `en_attente`, puis `valide` / `refuse`) : tous les
  écrans, totaux, factures et couleurs d'échéances continuent de marcher sans changement.
- `reference_virement` du paiement reçoit la référence MVola finale une fois la transaction terminée.

---

## 5. Backend

### 5.1 Configuration (`.env`)
```
MVOLA_BASE_URL=https://devapi.mvola.mg
MVOLA_CONSUMER_KEY=...
MVOLA_CONSUMER_SECRET=...
MVOLA_MARCHAND_NUMERO=0343500004
MVOLA_PARTNER_NAME=IMTECH INFO
MVOLA_CALLBACK_URL=https://<tunnel-ngrok>/api/public/mvola/callback
```
Si ces variables manquent, la route MVola répond **503 « Paiement MVola indisponible »** (le serveur
démarre quand même, contrairement à `JWT_SECRET`).

### 5.2 Nouveaux fichiers
- **`utils/mvolaClient.js`** : seul fichier qui parle à l'API MVola (`fetch` de Node).
  - `obtenirJeton()` : jeton en cache mémoire (expiration − 60 s).
  - `demanderPaiement({ montant, numeroPayeur, reference, description, correlationId })` → `{ serverCorrelationId, status }`.
  - `lireStatut(serverCorrelationId)` → `{ status, reference }`.
  - Délai maximum de 15 s par appel (`AbortSignal.timeout`). Une erreur MVola devient une `AppError` 502
    avec un message clair. Ne jamais journaliser le secret ni le jeton.
- **`models/mvolaModel.js`** : `insertTransaction`, `findByServerCorrelationId`, `findByPaiement`,
  `updateStatut(id, { statut, reference_mvola, message_erreur })`, `findEnAttente()` (pending de moins
  de 15 min, calculé avec `NOW()`), `findExpirees()` (pending depuis plus de 15 min).
- **`services/mvolaService.js`** :
  - `payerParMvola({ id_echeance, telephone }, auteur)` :
    1. Valider le numéro : 10 chiffres, préfixe `034` ou `038` (MVola). Normaliser `+261 34 …` en `034…`.
    2. Mêmes contrôles que `enregistrerPaiement` pour un étudiant : échéance à lui, reste à payer > 0,
       **aucun paiement déjà en attente**. → **Extraire ces contrôles** de `paiementService.enregistrerPaiement`
       dans une fonction commune (ex. `verifierEcheancePayable(id_echeance, auteur)`) plutôt que les copier.
    3. Insérer le paiement `en_attente` (mode MVola, montant = reste à payer, référence `IMT-<échéance>-<horodatage>`).
    4. Appeler `mvolaClient.demanderPaiement`, puis enregistrer la `transaction_mvola` (pending).
    5. Si MVola refuse tout de suite : passer le paiement à `refuse` et la transaction à `failed`, puis renvoyer l'erreur.
    6. Renvoyer `{ id_paiement, statut: 'pending' }`.
  - `actualiserTransaction(transaction)` : demande le statut à MVola et agit **une seule fois** :
    - `completed` → mettre `reference_virement` sur la référence MVola, puis appeler
      `paiementService.traiterPaiementEnAttente(id_paiement, VALIDE)` (qui notifie déjà l'étudiant), puis
      notifier l'accueil : « X a payé … via MVola (confirmé automatiquement). »
    - `failed` → `traiterPaiementEnAttente(id_paiement, REFUSE)` avec le message « Paiement MVola annulé
      ou refusé ». **Adapter le message** de `traiterPaiementEnAttente`, qui dit aujourd'hui « Contactez l'accueil ».
    - `pending` → ne rien faire.
    - Le doublon est déjà évité par `changerStatutPaiementEnAttente` (`WHERE statut = 'en_attente'`) :
      un callback reçu deux fois, ou un callback et un suivi en même temps, ne valident qu'une fois.
  - `traiterCallback(corps)` : retrouver la transaction par `serverCorrelationId`, puis appeler
    `actualiserTransaction`, qui **revérifie auprès de MVola**.
  - `demarrerSuiviMvola()` : toutes les **20 s**, appeler `actualiserTransaction` sur chaque transaction en
    attente, et passer en `failed` / `refuse` celles qui attendent depuis plus de 15 min. Même forme que
    `alerteService` (`setInterval`, `unref`, erreurs attrapées sans planter).

### 5.3 Routes (`routes/routes.js`)
| Méthode | Route | Accès | Controller |
|---|---|---|---|
| POST | `/paiements/mvola` | ET (et SA/AC pour tester) | `{ id_echeance, telephone }` → `mvolaService.payerParMvola` (201) |
| GET | `/paiements/:id/mvola` | ET (le sien), SA, AC | statut de la transaction (`pending` / `completed` / `failed`). Si `pending`, appelle `actualiserTransaction` avant de répondre, ce qui sert de suivi quand le callback n'arrive pas |
| PUT | `/public/mvola/callback` | public (appelé par MVola) | `mvolaService.traiterCallback` ; répond toujours **200** vite, même si la transaction est inconnue |

- Ajouter un **limiteur** sur `POST /paiements/mvola` (ex. 5 demandes / 15 min par compte, avec
  `limiteRequetes`) : chaque demande déclenche une demande sur le téléphone.
- Lancer `demarrerSuiviMvola()` dans `app.js`, à côté des deux autres tâches automatiques.
- Mettre à jour `api.md` (section Paiements).

### 5.4 Pourquoi callback **et** suivi
- Le **callback** donne une confirmation immédiate quand le serveur est en ligne.
- Le **suivi** (tâche toutes les 20 s, plus `GET /paiements/:id/mvola` appelé par l'appli) marche même en
  local sans tunnel, et rattrape un callback perdu.

---

## 6. Application mobile

- **`components/paiement/paiement-modal.tsx`**
  - Ajouter le mode **MVola**. Lire les modes depuis le serveur plutôt que garder `MODES_PAIEMENT` en dur :
    les ids changent selon la base. `/public/vitrine` renvoie déjà `modesPaiement`, ou bien ajouter un
    `GET /modes-paiement`.
  - Quand MVola est choisi : un champ **« Numéro MVola »**, pré-rempli avec le téléphone du profil s'il
    commence par 034 ou 038, avec une vérification du format avant l'envoi.
- **`hooks/use-paiement.ts`** : nouvelle fonction `payerParMvola(telephone)`.
  1. `POST /paiements/mvola`.
  2. Afficher « **Confirmez le paiement sur votre téléphone** (code secret MVola)… » avec un indicateur de chargement.
  3. Toutes les 3 s, `GET /paiements/:id/mvola`, pendant **3 min** au plus :
     - `completed` → « Paiement réussi », puis rafraîchir le résumé (`getResumePaiement`) ;
     - `failed` → « Paiement annulé ou refusé », et proposer de réessayer ;
     - délai dépassé → « Toujours en attente : vous serez notifié dès la confirmation » (le suivi serveur continue).
  4. Arrêter le suivi si l'écran se ferme (`clearInterval` dans le nettoyage).
- Les modes Cash / Virement gardent le fonctionnement actuel (déclaration, puis validation par l'accueil).

---

## 7. Site web (accueil)

- **`pages/paiements/Paiements.jsx`** : badge « MVola » et référence MVola dans le détail.
- Un paiement MVola en attente affiche « En attente de confirmation MVola » **sans** les boutons
  Valider / Refuser (c'est MVola qui décide). Garder un bouton « Revérifier », qui appelle `GET /paiements/:id/mvola`.
- Le filtre par mode fonctionne déjà avec `?mode=` (nom du mode).

---

## 8. Tests (`backend-imtech/tests/mvola.test.js`)

Simuler `mvolaClient` (`mock.method`) et les models ; ne jamais appeler la vraie API dans les tests.
- Numéro invalide (ex. `033…`, 9 chiffres) → 400, aucune ligne insérée.
- Échéance d'un autre étudiant → 403 ; déjà réglée → 409 ; paiement déjà en attente → 409.
- Demande acceptée → paiement `en_attente` avec le montant imposé, transaction `pending`, réponse 201.
- MVola refuse tout de suite → paiement `refuse`, transaction `failed`, erreur renvoyée.
- Callback `completed` → revérifie le statut auprès de MVola, puis valide **une fois** ; le même callback
  reçu deux fois ne valide pas deux fois.
- Callback dont le corps dit `completed` mais pour lequel MVola répond `pending` → rien n'est validé.
- Callback inconnu → 200, rien ne change.
- Transaction en attente depuis plus de 15 min → `failed` et paiement `refuse`.
- Jeton : deux demandes rapprochées → **un seul** appel à `/token`.
- `GET /paiements/:id/mvola` par un autre étudiant → 403.

Puis un essai réel sur le **bac à sable**, avec les numéros de test du portail.

---

## 9. Documentation à mettre à jour

- `FLUX-APPLICATION.md` :
  - §4 **Étape 5** (Andry paie ses tranches) : ajouter le chemin MVola dans le tableau (page, bouton,
    route `POST /paiements/mvola`, fonctions `payerParMvola` → `mvolaClient.demanderPaiement` →
    callback / suivi → `traiterPaiementEnAttente`) et la fonction clé `actualiserTransaction` expliquée.
    Mettre à jour la ligne 5 du tableau « Le parcours en une ligne par étape ».
  - §2 « Démarrer » : ajouter les variables `MVOLA_*` dans la ligne `backend-imtech/.env`.
  - §6 « Ce que le serveur fait tout seul » : ajouter « Toutes les 20 s : suivi des paiements MVola »
    (`mvolaService.demarrerSuiviMvola`).
  - §8 « La base de données » : ajouter `TRANSACTION_MVOLA (…, #id_paiement, …)`.
  - §10 « Ce qu'il reste à faire » : retirer la ligne « Vrai paiement en ligne », ou la marquer comme faite.
- `FLUX-MEMOIRE.md` : §2.2.2 Échéances et paiements (et §3.3 Évolutions).
- `api.md` : les 3 routes (section Paiements).
- `SCENARIOS-TESTS.md` : un scénario « paiement MVola réussi » et un « paiement MVola annulé » (à côté de M5).

---

## 10. Sécurité

- Le **montant vient toujours du serveur** (reste à payer), jamais de l'appli.
- Les secrets restent dans `.env`. Ne pas les écrire dans les journaux, ni dans le dépôt.
- Le callback est public, **mais il ne valide jamais rien tout seul** : il déclenche seulement une
  revérification auprès de MVola.
- Un seul paiement en attente par échéance, et le passage `en_attente` → `valide` se fait une seule fois
  (déjà assuré par le modèle).
- Limiteur sur la création de demandes MVola.

---

## 11. Points à vérifier sur le portail MVola avant de coder

- Adresse exacte du jeton et `scope` (`EXT_INT_MVOLA_SCOPE`).
- En-têtes obligatoires (`Version`, `X-CorrelationID`, `UserLanguage`, `UserAccountIdentifier`,
  `partnerName`, `X-Callback-URL`) et format de `requestDate`.
- Champs `metadata` obligatoires (`fc`, `amountFc`) et devise (`Ar`).
- Forme exacte du corps du **callback** (noms des champs), et méthode (PUT ?).
- Valeurs possibles de `status` (`pending`, `completed`, `failed`) et délai d'expiration côté MVola.
- Numéros de test du bac à sable.
- Limites de montant et frais.

## 12. Ordre conseillé pour le prochain prompt

1. SQL dans `alter.sql` + `base.sql`, puis exécuter `alter.sql`.
2. `mvolaClient` + `mvolaModel` + `mvolaService` + routes + tâche dans `app.js` + tests.
3. Mobile : modes lus depuis le serveur, numéro MVola, attente de confirmation.
4. Web : affichage MVola dans Paiements.
5. Docs (`FLUX-APPLICATION.md`, `api.md`, `SCENARIOS-TESTS.md`).

Sources consultées (non officielles, à recouper) :
- https://www.scribd.com/document/867976126/API-MerchantPay
- https://www.scribd.com/document/631887970/API-Authenticate
- https://pub.dev/documentation/mvola/latest/
- https://pypi.org/project/mvola/
