# API REST IMTECH INFO

Préfixe : `/api`. Toutes les routes sauf celles marquées **public** exigent l'en-tête
`Authorization: Bearer <token>` **et** une session active (un logout invalide réellement le token).

Rôles : **SA** = Super Admin, **AC** = Accueil, **FO** = Formateur, **ET** = Étudiant.

Format des réponses : `{ "status": "success", ... }` ou `{ "status": "error", "message": "..." }`.
Codes d'erreur : 400 (champ manquant / invalide), 401 (non connecté / session révoquée),
403 (rôle ou propriétaire incorrect), 404 (introuvable), 409 (conflit : doublon, déjà traité), 500.

## Authentification
| Méthode | Route | Accès |
|---|---|---|
| POST | /auth/login | public |
| POST | /auth/forgot-password | public |
| POST | /auth/reset-password | public (déconnecte tous les appareils) |
| POST | /auth/logout | connecté (désactive la session courante) |
| GET | /auth/profil | connecté |
| PUT | /auth/change-password | connecté (déconnecte les autres appareils) |
| GET | /auth/sessions | connecté (les tokens ne sont jamais renvoyés) |
| GET | /auth/last-login | connecté |
| PUT | /auth/logout-all | connecté |

## Utilisateurs
| Méthode | Route | Accès |
|---|---|---|
| GET | /utilisateurs | SA |
| GET | /utilisateurs/:id | soi-même ou SA |
| POST | /utilisateurs | SA |
| PUT | /utilisateurs/:id | soi-même ou SA (seul SA peut changer `id_role` / `mot_de_passe`) |
| DELETE | /utilisateurs/:id | SA |

## Étudiants
| Méthode | Route | Accès |
|---|---|---|
| GET | /etudiants | SA, AC, FO |
| GET | /etudiants/:id | SA, AC |
| GET | /etudiants/:id/formations | tous (un ET : uniquement les siennes) |
| GET | /etudiants/:id/dashboard-paiement | SA, AC, ET (un ET : uniquement le sien) |
| POST | /etudiants | SA, AC (le rôle Étudiant est imposé par le serveur) |
| PUT | /etudiants/:id | SA, AC |
| DELETE | /etudiants/:id | SA, AC |

## Formations
| Méthode | Route | Accès |
|---|---|---|
| GET | /formations | connecté (un FO ne voit que les siennes) |
| GET | /formations/:id | connecté |
| GET | /formations/:id/etudiants | SA, AC, FO (un FO : uniquement ses formations) — `id_etudiant, nom, prenom, email, photo, date_inscription`, triés par nom |
| GET | /formations/:id/classement | SA, AC, FO (un FO : uniquement ses formations) — classement + note système /10 (paiement 2 ou 5 + présence 2, 3 ou 5, enregistrée en base) |
| POST / PUT / DELETE | /formations(/:id) | SA |
| PUT | /formations/:id/image | SA — multipart, champ `image` (JPEG / PNG / WEBP, 5 Mo) : couverture de la vitrine ; renvoie `image` (`formations/xxx.jpg`) |
| GET | /formations/&lt;fichier&gt; (ex. `/api/formations/demo-python.jpg`) | **public** — couverture d'une formation (sans token, sans filigrane) |

## Inscriptions & échéances
| Méthode | Route | Accès |
|---|---|---|
| GET | /inscriptions, /inscriptions/:id | SA, AC |
| POST | /inscriptions | SA, AC — crée l'inscription **et** l'échéancier dans une transaction |
| POST | /inscriptions/:id/valid | SA, AC — valide (une seule fois) et enregistre le 1er paiement |
| DELETE | /inscriptions/:id | SA, AC |
| GET | /inscriptions/:id/echeances | SA, AC |
| PUT | /inscriptions/:id/note | SA, FO (ses formations) — `{ note_presentation }` entre 0 et 10 (au-delà : 400), vide = effacer. Note d'attestation = note système + présentation /20 |
| GET | /echeances | SA, AC — `statut_paiement` : VERT (payée ou loin), JAUNE (J-2 à J), ROUGE (en retard) |
| PUT | /echeances/:id | SA, AC |
| POST | /echeances/:id/rappeler | SA, AC — bouton « Rappeler » : notification in-app + e-mail à l'étudiant |

## Paiements
Un paiement a un `statut` : `en_attente`, `valide` ou `refuse`.
Seuls les paiements `valide` comptent dans les totaux, le dashboard et les factures.

| Méthode | Route | Accès |
|---|---|---|
| GET | /paiements?statut=en_attente | SA, AC (tout) — ET (uniquement les siens) |
| GET | /paiements/:id | SA, AC — ET (uniquement les siens) |
| POST | /paiements | SA, AC : paiement `valide`, partiel autorisé, plafonné au reste à payer.<br>ET : uniquement sur sa propre échéance, montant imposé, statut `en_attente`. |
| PUT | /paiements/:id | SA, AC |
| PUT | /paiements/:id/valider | SA, AC — notifie l'étudiant |
| PUT | /paiements/:id/refuser | SA, AC — notifie l'étudiant |

## Documents
| Méthode | Route | Accès |
|---|---|---|
| POST | /fiche/:id_inscription/generer | SA, AC |
| POST | /factures/:id_paiement/generer | SA, AC (paiement validé uniquement) |
| POST | /attestations/:id_inscription/generer | SA, AC (la note est imprimée sur l'attestation) |
| POST | /attestations/:id_inscription/envoyer | SA, AC — génère puis envoie à l'étudiant (in-app + e-mail avec le PDF) |
| GET | /verification/:uuid | public (QR code des attestations) |
| GET | /documents | SA, AC, FO |
| POST | /documents | SA, AC |
| DELETE | /documents/:id | SA |

## Supports, commentaires & réactions
> Envoi programmé : un planificateur (chaque minute) annonce le support aux étudiants inscrits
> 1 h avant (« X va envoyer le support … dans une heure »), puis le publie à l'heure prévue et
> prévient étudiants et formateur (« Le support … a été envoyé dans la formation … »).

| Méthode | Route | Accès |
|---|---|---|
| GET | /formations/:id/supports, /supports/:id | tous — supports **publiés** uniquement ; `contenu` (HTML propre ou `null`) et `fichier` (chemin ou `null` pour un support texte seul) |
| POST | /supports | FO (uniquement dans ses formations) — multipart : `id_formation`, `titre`, `contenu` (texte mis en forme, HTML nettoyé par le serveur) et / ou `fichier` (PDF, image, audio, vidéo — 50 Mo max) : un texte ou un fichier au moins, titre obligatoire sans fichier ; `date_envoi_prevue` facultative (ISO, dans le futur) : support **programmé** (brouillon), sinon publié tout de suite et les inscrits sont notifiés |
| GET | /supports/programmes | FO (les siens), SA (tous) — supports programmés pas encore envoyés |
| PUT | /supports/:id | FO (les siens), SA — modifie un support programmé : `titre`, `contenu` (vide = texte supprimé, refusé sans fichier), `date_envoi_prevue`, `fichier` (multipart) ; 409 s'il est déjà envoyé |
| POST | /supports/:id/envoyer | FO (les siens), SA — envoie tout de suite un support programmé |
| DELETE | /supports/:id | FO (ses supports, publiés ou programmés), SA |
| GET | /supports/:id/commentaires | tous — fil de discussion : commentaires principaux (plus récent d'abord), chacun avec `reponses` et `nb_reponses` |
| POST | /commentaires | ET, FO, SA |
| DELETE | /commentaires/:id | SA (tout), FO (ses formations), ET (ses commentaires) |
| GET / POST / DELETE | /supports/:id/reactions | SA, FO, ET — POST `{ type_reaction: 'like' \| 'coeur' \| 'utile' \| 'dislike' }` (`id_type_reaction` encore accepté) ; support publié uniquement |
| GET | /formateurs/avis | SA, AC — formateurs avec réactions reçues par type, % positif et avis (`competent`, `non_competent`, `pas_assez_avis`) |

## Notifications
| Méthode | Route | Accès |
|---|---|---|
| GET | /notifications | connecté (les siennes) |
| PUT | /notifications/:id/lu | connecté |
| DELETE | /notifications/:id | connecté |
| POST | /notifications/in-app, /notifications/email, /notifications/email/piece-jointe | SA, AC |

## Assistance
| Méthode | Route | Accès |
|---|---|---|
| POST | /assistances | ET — `{ objet, contenu }`, statut « En attente », l'Accueil est notifié |
| GET | /assistances?statut= | SA, AC (toutes) — ET (les siennes) |
| PUT | /assistances/:id/resoudre | SA, AC — statut « Résolu », l'étudiant est notifié |

## Alertes automatiques (sans route)
Au démarrage du serveur puis toutes les heures, l'Accueil et le Super Admin reçoivent une notification in-app :
- « Étudiant A doit être rappelé » : échéance passée au statut JAUNE (non soldée, J-2, J-1 ou J ; même règle que la page Échéances) ;
- « Étudiant A a fini sa formation, envoyez-lui son attestation » : date d'inscription + durée dépassée, sans attestation.
Chaque alerte n'est envoyée qu'une fois (table `alerte_envoyee`).

## Dashboard
`GET /dashboard/kpi`, `/dashboard/evolution?periode=`, `/dashboard/export-csv`,
`/dashboard/inscriptionParMois`, `/dashboard/topInscription` — SA, AC.

## Tests automatisés
```bash
npm test   # 81 tests : texte mis en forme des supports, échéancier, paiements, note d'attestation, supports programmés, commentaires et réactions, vitrine et inscription en ligne, fichiers, autorisations HTTP (sans base de données)
```

# tests:

creer user: 
{
  "nom": "Rabe",
  "prenom": "Sophie",
  "email": "accueil@imtechinfo.com",
  "mot_de_passe": "accueil123",
  "telephone": "0343333333",
  "id_role": 2
}

login:
{
  "email": "godrogodro.rasoa@example.com",
  "mot_de_passe": "etudiant123"
}

mdp oublie :
{
  "email": "admin@imtechinfo.com"
}

reset mdp: 
{
  "token": "TOKEN",
  "nouveau_mot_de_passe": "nouveauMdp123"
}

creer etudiant:
{
  "nom": "godrogodro",
  "prenom": "Marie",
  "email": "godrogodro.rasoa@example.com",
  "mot_de_passe": "etudiant123",
  "telephone": "0344444444",
  "id_role": 4,
  "photo_1": "photo1.jpg",
  "photo_2": "photo2.jpg",
  "certificat_residence": "cert.jpg",
  "photocopie_cin": "cin.jpg"
}

creer formations :
{
  "nom": "Développement Web",
  "description": "Formation complète HTML/CSS/JS",
  "tarif": 300000,
  "duree": "3 mois",
  "duree_jours": 90,
  "id_utilisateur": 2
}

creer supports :
{
  "id_formation": 1,
  "id_type_support": 1,
  "titre": "Introduction au HTML",
  "fichier": "cours_html.pdf"
}

creer coms:
{
  "id_support": 1,
  "contenu": "Merci pour le cours !",
  "mentions": []
}

creer inscriptions:
{
  "id_etudiant": 1,
  "id_formation": 1,
  "nombre_tranches": 3,
  "id_tranche": 3
}

payer : 
{
  "id_echeance": 1,
  "id_mode_paiement": 1,
  "montant": 50000.00,
  "reference": "MVOLA-REF-998823"
}

## Vitrine publique (sans connexion)
| Méthode | Route | Accès |
|---|---|---|
| GET | /public/vitrine | public — présentation et contacts (`.env`), `presentation.fond` (fond du bandeau choisi par le SA, `vitrine/xxx.jpg`, `null` = image par défaut de l'application), formations actives (formateur, tarif, durée, `engagement_formateur`, `image` de couverture, nombre d'inscrits, avis sur le formateur), formateurs compétents, modes de paiement |
| POST | /public/inscriptions | public, **5 essais par heure et par adresse IP** (429 au-delà) — `{ nom, prenom, email, telephone, mot_de_passe, formations: [{ id_formation, nombre_tranches }], id_mode_paiement, reference_virement }` : crée le compte, une inscription « en ligne » par formation et le premier paiement en attente ; 409 si l'e-mail existe |
| PUT | /vitrine/fond | SA — multipart, champ `image` (JPEG / PNG / WEBP, 8 Mo) : fond du bandeau « Découvrir » ; remplace et supprime l'ancien ; renvoie `fond` (`vitrine/xxx.jpg`) |
| DELETE | /vitrine/fond | SA — retour à l'image par défaut de l'application (l'ancien fichier est supprimé) |

`GET /inscriptions` renvoie aussi `origine` (`accueil` / `en_ligne`), `reference_declaree` et
`montant_declare` (premier paiement déclaré). `POST /inscriptions/:id/valid` valide ce paiement
déclaré s'il existe, sinon enregistre le premier paiement comme avant.
`POST / PUT /formations` acceptent `engagement_formateur`.
