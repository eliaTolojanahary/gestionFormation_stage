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
| POST | /utilisateurs | SA |
| PUT | /utilisateurs/:id | soi-même ou SA (seul SA peut changer `id_role` / `mot_de_passe`) |
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
| PUT | /inscriptions/:id/note | SA, FO (ses formations) — `{ note_presentation }` entre 0 et 10 (au-delà : 400), vide = effacer. Note d'attestation = note système + présentation /20 |
| GET | /echeances | SA, AC — `statut_paiement` : VERT (payée ou loin), JAUNE (J-2 à J), ROUGE (en retard) ; `?recherche=`, `?statut=VERT\|JAUNE\|ROUGE`, `?debut=&fin=` (date d'échéance, AAAA-MM-JJ, bornes incluses ; 400 si invalide), paginable |
| PUT | /echeances/:id | SA, AC |
| DELETE | /echeances/:id | SA, AC — désactive |
| PUT | /echeances/:id/reactiver | SA, AC |
| POST | /echeances/:id/rappeler | SA, AC — bouton « Rappeler » : notification in-app + e-mail à l'étudiant |

## Paiements (étape 5)
Un paiement a un `statut` : `en_attente`, `valide` ou `refuse`.
Seuls les paiements `valide` comptent dans les totaux, le dashboard et les factures.

| Méthode | Route | Accès |
|---|---|---|
| GET | /paiements?statut=en_attente | SA, AC (tout) — ET (uniquement les siens) ; `?mode=` (nom du mode), `?recherche=` (étudiant ou formation), paginable (+ `compteurs.en_attente` : paiements en attente sur toute la base) |
| GET | /paiements/:id | SA, AC — ET (uniquement les siens) |
| POST | /paiements | SA, AC : paiement `valide`, partiel autorisé, plafonné au reste à payer.<br>ET : uniquement sur sa propre échéance, montant imposé, statut `en_attente`. |
| PUT | /paiements/:id | SA, AC |
| PUT | /paiements/:id/valider | SA, AC — notifie l'étudiant |
| PUT | /paiements/:id/refuser | SA, AC — notifie l'étudiant |
| DELETE | /paiements/:id | SA, AC — désactive (ne compte plus dans les totaux) |
| PUT | /paiements/:id/reactiver | SA, AC |

## Documents (étapes 5 et 9, §5 Documents)
| Méthode | Route | Accès |
|---|---|---|
| POST | /fiche/:id_inscription/generer | SA, AC |
| POST | /factures/:id_paiement/generer | SA, AC (paiement validé uniquement) — régénère et renvoie le PDF. La facture est **déjà envoyée automatiquement** à l'étudiant (notification + e-mail) à chaque validation : `PUT /paiements/:id/valider`, paiement au guichet `POST /paiements`, `POST /inscriptions/:id/valid` |
| POST | /attestations/:id_inscription/generer | SA, AC (la note est imprimée sur l'attestation) |
| POST | /attestations/:id_inscription/envoyer | SA, AC — génère puis envoie à l'étudiant (in-app + e-mail avec le PDF) |
| GET | /verification/:uuid | public (QR code des attestations) |
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
| POST | /supports | FO (uniquement dans ses formations) — multipart : `id_formation`, `titre`, `contenu` (texte mis en forme, HTML nettoyé par le serveur) et / ou `fichier` (PDF, image, audio, vidéo — 50 Mo max) : un texte ou un fichier au moins, titre obligatoire sans fichier ; `date_envoi_prevue` facultative (ISO, dans le futur) : support **programmé** (brouillon), sinon publié tout de suite et les inscrits sont notifiés |
| GET | /supports/programmes | FO (les siens), SA (tous) — supports programmés pas encore envoyés |
| PUT | /supports/:id | FO (les siens), SA — modifie un support programmé : `titre`, `contenu` (vide = texte supprimé, refusé sans fichier), `date_envoi_prevue`, `fichier` (multipart) ; 409 s'il est déjà envoyé |
| POST | /supports/:id/envoyer | FO (les siens), SA — envoie tout de suite un support programmé |
| DELETE | /supports/:id | FO (ses supports, publiés ou programmés), SA |
| GET | /supports/:id/commentaires | tous — fil de discussion : commentaires principaux (plus récent d'abord), chacun avec `reponses`, `nb_reponses` et `titre_support`. Curseur `?limite=&avant=<id_commentaire>` : la limite compte les commentaires **principaux** (leurs réponses suivent), la réponse ajoute `total_echanges` (principaux + réponses) |
| GET | /formations/:id/commentaires | tous (ET : inscription validée) — même fil, pour tous les supports publiés de la formation, en une requête ; même curseur |
| POST | /commentaires | ET, FO, SA |
| DELETE | /commentaires/:id | SA (tout), FO (ses formations), ET (ses commentaires) |
| GET / POST / DELETE | /supports/:id/reactions | SA, FO, ET — POST `{ type_reaction: 'like' \| 'coeur' \| 'utile' \| 'dislike' }` (`id_type_reaction` encore accepté) ; support publié uniquement |
| GET | /formateurs/avis?debut=&fin= | SA, AC — formateurs avec réactions reçues par type, % positif et avis (`competent`, `non_competent`, `pas_assez_avis`) ; période facultative (date de la réaction) |

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
Au démarrage du serveur puis toutes les heures, l'Accueil et le Super Admin reçoivent une notification in-app :
- « Étudiant A doit être rappelé » : échéance passée au statut JAUNE (non soldée, J-2, J-1 ou J ; même règle que la page Échéances) ;
- attestations : dès la date de fin (date d'inscription + durée), si tout est payé et la note de présentation attribuée, l'attestation est envoyée automatiquement à l'étudiant (in-app + e-mail avec le PDF) ; l'Accueil reçoit « N attestation(s) envoyée(s) automatiquement » ; sinon le formateur est prévenu de la note manquante.
Chaque alerte n'est envoyée qu'une fois (table `alerte_envoyee`).

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

## Recherche globale (§5 Recherche)
| Méthode | Route | Accès |
|---|---|---|
| GET | /recherche?q=texte | tous les rôles — au moins 2 caractères (sinon groupes vides), 5 résultats max par groupe : `{ etudiants, formations, inscriptions, utilisateurs, supports }`. SA : étudiants, formations, inscriptions, utilisateurs ; AC : sans utilisateurs ; FO : ses formations, les étudiants inscrits à ses formations (avec `id_formation`, `nom_formation`), ses supports publiés et programmés ; ET (mobile) : ses formations (avec `valide`) et les supports publiés des formations dont l'inscription est validée (avec `id_formation`, `nom_formation`, `fichier`), rien sans fiche étudiant. Cherche dans nom, prénom, nom complet, e-mail, téléphone, nom / description de formation, titre / texte de support ; `%` et `_` sont cherchés tels quels |

## Tests automatisés
```bash
npm test   # 173 tests : dossier étudiant (pièces obligatoires, Mon dossier), facture automatique, désactivation / réactivation et éléments dépendants, pagination (pages et curseur), limite des essais de connexion, recherche globale, texte mis en forme des supports, échéancier, paiements, note et envoi automatique des attestations, supports programmés, commentaires et réactions, vitrine et inscription en ligne, fichiers, autorisations HTTP (sans base de données)
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
