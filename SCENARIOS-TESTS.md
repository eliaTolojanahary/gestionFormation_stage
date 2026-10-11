# Scénarios de test — recette et soutenance

Chaque scénario suit le chemin **page → action → fonctions métier → base de données** et donne le
résultat attendu. Ordre conseillé pour la soutenance : 1 → 10 (≈ 20 min). Données : base de démo
(`base.sql` + `alter2.sql` + `donneesTest.sql`, puis `node scripts/fichiersDemo.js`).

Préparer avant : backend (`npm run dev`), web (`npm run dev`), Expo (`npx expo start`), deux
navigateurs (Chrome + Edge) et un téléphone sur le même Wi-Fi.

---

## 1. Vitrine et inscription en ligne (mobile, sans compte)
| Étape | Action | Fonctions / route | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir l'app → Découvrir | `GET /public/vitrine` → `vitrineService.contenuVitrine` | lecture `formation`, `reaction`, `parametre_application` | Fond plein écran, formations en couvertures, formateurs « compétents » |
| 2 | Cocher 2 formations → S'inscrire | `POST /public/inscriptions` → `vitrineService.inscriptionEnLigne` (transaction) | écrit `utilisateur`, `etudiant`, 2 × `inscription` + `echeance`, `paiement` *en attente*, `notification_inapp` | Compte créé, message « en attente de validation » |
| 3 | Refaire 6 fois avec un formulaire vide | limiteur 5 / heure / IP | — | 6ᵉ essai : **429** |

## 2. Validation par l'Accueil (web)
| Étape | Action | Fonctions / route | Base | Attendu |
|---|---|---|---|---|
| 1 | Connexion Accueil → Inscriptions | `GET /inscriptions` | lecture | Inscriptions « En ligne » visibles |
| 2 | Valider une inscription | `POST /inscriptions/:id/valid` → `inscriptionService.validerInscription` | `inscription.valide`, `paiement` validé | Premier paiement validé, l'étudiant est notifié |
| 3 | Générer la fiche et la facture | `POST /fiche/...`, `/factures/.../generer` → `documentService` + `utils/pdf` | `facture` | PDF sans filigrane, QR code |

## 3. Paiement d'une échéance (mobile → web)
| Étape | Action | Fonctions / route | Base | Attendu |
|---|---|---|---|---|
| 1 | Étudiant → Paiements → payer une échéance | `POST /paiements` → `paiementService.enregistrerPaiement` | `paiement` *en attente* (montant imposé) | « En attente de validation » |
| 2 | Repayer la même échéance avant validation ; payer plus que le reste | idem | — | Refus **409** « un paiement est déjà en attente » ; **400** « le montant dépasse le reste à payer » |
| 3 | Accueil → Paiements → Valider / Refuser | `PUT /paiements/:id/valider` / `refuser` | statut du `paiement` | Reste à payer mis à jour, notification à l'étudiant |

## 4. Échéances et rappels
- Accueil → Échéances → filtre « en retard » → **Rappeler** (`POST /echeances/:id/rappeler` →
  `echeanceService.rappelerEcheance`) → notification + e-mail, `echeance` marquée rappelée.
- Rappeler une échéance déjà réglée, ou dont l'étudiant a déjà envoyé un paiement en attente →
  refus **409** (« il attend la validation de l'accueil »).

## 5. Supports de cours (formateur)
| Étape | Action | Fonctions / route | Base | Attendu |
|---|---|---|---|---|
| 1 | Supports → texte mis en forme + PDF → Envoyer | `POST /supports` → `supportService.creerSupports` (`contenuRiche` nettoie le HTML) | `support` *publié*, notifications | Visible sur le mobile |
| 2 | Coller `<script>` ou `onclick` dans le texte | `utils/contenuRiche` | — | Code supprimé (XSS) |
| 3 | Programmer un envoi dans 2 min | `supportProgrammeService` (vérification périodique) | `support` *programmé* → *publié* | Annonce puis publication automatique ; page « Supports programmés » |
| 4 | Recherche / filtre / tri / « Voir plus » | côté navigateur (`ListeSupports`) | — | Liste filtrée, 5 par page |

## 6. Consultation sécurisée (mobile)
- Ouvrir un support PDF → lecteur intégré, **filigrane** nom + e-mail + date.
- Copier l'URL du fichier sans `?token=` → **401** ; étudiant non inscrit → refus.
- Android : capture d'écran dans le lecteur → écran noir.

## 7. Commentaires, réactions, avis
- Étudiant : commenter, répondre, 👍 / 👎 (`POST /commentaires`, `/supports/:id/reactions`).
- Super Admin → tableau de bord → « Avis sur les formateurs » (`GET /formateurs/avis`).

## 8. Classement et attestation
| Étape | Action | Fonctions / route | Base | Attendu |
|---|---|---|---|---|
| 1 | Formateur → Espace formateur → Classement | `GET /formations/:id/classement` → `classementService` | lecture `presence`, `paiement` ; écrit la note suggérée | Rang, présence, note système /10 |
| 2 | Saisir 12 en présentation | `PUT /inscriptions/:id/note` | — | Refus : 10 maximum |
| 3 | Saisir 8 → Entrée | idem | `inscription.note_presentation` | Note finale /20 colorée |
| 4 | Accueil → générer l'attestation | `POST /attestations/:id/generer` | `attestation` (uuid) | PDF + QR ; `GET /verification/:uuid` confirme l'authenticité |

## 9. Sécurité et rôles
- Accueil tape `/dashboard/utilisateurs` → retour au tableau de bord ; formateur tape
  `/dashboard/paiements` → idem (`utils/navigation.js`).
- Étudiant appelle `GET /recherche` → **403** ; sans token → **401**.
- **Se déconnecter partout** dans Chrome → Edge (et le téléphone) renvoyés à la connexion en < 1 min
  (`PUT /auth/logout-all`, table `sessions`).
- Mot de passe oublié → **code** reçu par e-mail (valable 30 min, table `reset_password`) → nouveau
  mot de passe ; toutes les sessions ouvertes sont fermées. Même réponse que l'e-mail existe ou non.
- 6 mauvais mots de passe de suite sur un compte → **429** « Réessayez dans 15 minutes » ;
  6 demandes de code en une heure → **429**.

## 10. Ergonomie
- **Ctrl+K** : chercher un étudiant, une formation, « paie » → Entrée ouvre la bonne fiche
  (`GET /recherche`, résultats limités au rôle).
- Ouvrir une fiche étudiant → l'adresse devient `/dashboard/etudiants/12` ; **F5** garde la fiche,
  « Précédent » revient à la liste ; copier le lien dans un autre navigateur non connecté →
  connexion puis arrivée directe sur la fiche (`SectionsRoutes.jsx`).
- Paiements : pied « 1–20 sur N », changer de page, filtrer « En attente » → la requête part avec
  `?page=1&statut=en_attente` (onglet Réseau) ; le bandeau « à valider » compte toute la base.
- Paramètres → mode **sombre** + autre couleur : tout reste lisible.
- Super Admin → Paramètres → **Fond de la vitrine mobile** → visible sur Découvrir.

---

## Tests automatisés à montrer
`cd backend-imtech && npm test` → **87 tests** verts, sans base de données (échéancier, paiements,
note d'attestation, supports programmés, texte riche, fichiers, vitrine, recherche, autorisations HTTP).

## Questions probables du jury (réponses courtes)
- *Pourquoi un paiement étudiant est « en attente » ?* L'argent est vérifié par l'Accueil avant d'être compté.
- *Comment un token volé est-il bloqué ?* Chaque requête vérifie la table `sessions` : déconnexion = révocation réelle.
- *Limites ?* Un seul serveur (compteurs d'essais en mémoire), pas de tests front, quelques gros fichiers à découper (voir `A-FAIRE.md`).
- *Et si la base grossit ?* Les grosses listes sont paginées côté serveur (`LIMIT / OFFSET`, 20 lignes, filtres en SQL).
- *Et la force brute sur la connexion ?* 5 échecs / 15 min par compte, 20 par adresse IP, puis 429.
