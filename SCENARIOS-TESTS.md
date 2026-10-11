# Scénarios de test — recette et soutenance

Un scénario par fonctionnalité, au format **page → action → route / fonctions métier → base →
résultat attendu**. Les règles détaillées sont dans [`FLUX-APPLICATION.md`](FLUX-APPLICATION.md)
(le § indiqué à chaque scénario).

- **Recette** : dérouler tous les scénarios et cocher ce qui marche.
- **Soutenance** : suivre le parcours ⭐ ci-dessous (environ 20 min). Les autres scénarios servent
  à répondre aux questions du jury (« montrez-moi… »).

---

## Préparation

1. Base de démonstration remise à zéro (les dates sont relatives au jour du chargement) :
   ```bash
   cd backend-imtech
   mysql -u root -p < reinit.sql
   mysql -u root -p < donneesTest.sql
   node scripts/fichiersDemo.js
   ```
2. Lancer le backend (`npm run dev`), le web (`npm run dev`) et Expo (`npx expo start`).
3. Avoir **deux navigateurs** (Chrome + Edge) et un **téléphone** sur le même Wi-Fi que le PC.
4. Ouvrir l'onglet **Réseau** des outils de développement (pour montrer les requêtes).

| Compte (mot de passe `admin123`) | Rôle | Sert à montrer |
|---|---|---|
| `tljelia374@gmail.com` | Super Admin | Utilisateurs, formations, avis, fond de la vitrine |
| `hanitra.rasoanaivo@imtech.test` | Accueil | Dossiers, inscriptions, paiements, échéances, assistance |
| `tiana.randrianarisoa@imtech.test` | Formateur | Supports, supports programmés, classement et notes |
| `prenom.nom@imtech.test` (ex. `toky.ravelojaona@imtech.test`) | Étudiant | Application mobile |

Données de démo utiles : **Toky** et **Fano** ont une 2ᵉ tranche en retard ; **Mahery** et
**Miora** se sont inscrits en ligne (à valider) ; **Sitraka** a payé sa 2ᵉ tranche sur le mobile
(en attente) ; **Fitiavana** a terminé Bureautique (attestation à envoyer) ; le support
« Projet : site vitrine » est programmé dans 2 jours.

---

## Parcours de soutenance ⭐ (≈ 20 min)

| Ordre | Scénario | Ce que ça montre au jury |
|:-:|---|---|
| 1 | **M1 Vitrine et inscription en ligne** | Parcours public, transaction, anti-abus |
| 2 | **A5 Validation d'une inscription en ligne** | Rôle de l'Accueil, documents PDF |
| 3 | **M5 Paiement mobile** puis **A6 Validation** | Règle métier clé : paiement en attente, validé par un humain |
| 4 | **A7 Échéances et rappels** | Couleurs, alerte unique, envoi volontaire |
| 5 | **F2 Support mis en forme** + **M3 Consultation sécurisée** | XSS bloqué, filigrane, captures bloquées |
| 6 | **F4 Classement et note** + **A10 Attestation** | Calcul automatique, QR code vérifiable |
| 7 | **S1 à S4 Sécurité** | Rôles, force brute, sessions révocables |
| 8 | **T1 à T3 Recherche, fiches, pagination** | Ergonomie et passage à l'échelle |
| 9 | **Tests automatisés** | 101 tests en quelques secondes |

---

## S. Sécurité et accès

### S1 Connexion et pages par rôle (§7.1, §4.2) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter (Accueil) | `POST /auth/login` → `authService.authentifier` | L utilisateur · É sessions | Tableau de bord, menu de l'Accueil |
| 2 | Taper `/dashboard/utilisateurs` dans l'adresse | `utils/navigation.peutOuvrir` | — | Retour au tableau de bord |
| 3 | Formateur : taper `/dashboard/paiements` | idem | — | Retour au tableau de bord |
| 4 | Appeler une route du personnel avec un token d'étudiant (ou sans token) | `checkRole` / `verifyToken` | L sessions | **403** / **401** |

### S2 Limite des essais de connexion (§7.1) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | 5 mauvais mots de passe sur un compte | `limiteRequetes` (échecs seulement) | — | 401 « Identifiants incorrects » |
| 2 | 6ᵉ essai, même avec l'e-mail en majuscules | idem | — | **429** « Réessayez dans 15 minutes » (web et mobile) |
| 3 | Se connecter avec un **autre** compte | limite par compte | — | Connexion possible |
| 4 | 6 demandes « mot de passe oublié » en une heure | limite 5 / h / IP | — | **429** |

*(Redémarrer le backend remet les compteurs à zéro.)*

### S3 Mot de passe oublié (§7.2)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | « Mot de passe oublié » avec un e-mail existant, puis inexistant | `POST /auth/forgot-password` → `userService.demanderReinitialisation` | É reset_password | **Même message** dans les deux cas ; code reçu par e-mail (30 min) |
| 2 | Saisir le code + nouveau mot de passe | `POST /auth/reset-password` | É utilisateur, reset_password, sessions | Mot de passe changé, **toutes** les sessions fermées |
| 3 | Réutiliser le même code | idem | — | Refusé (code déjà utilisé) |

### S4 Sessions et « Se déconnecter partout » (§7.1) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter avec le même compte dans Chrome, Edge et sur le téléphone | `POST /auth/login` | É sessions | 3 sessions dans Paramètres > Sécurité (aucun token affiché) |
| 2 | Chrome : Paramètres > Sécurité > **Se déconnecter partout** | `PUT /auth/logout-all` → `deactivateAllExcept` | É sessions | Edge et le téléphone renvoyés à la connexion en **moins d'une minute** (mobile : alerte « Session fermée ») |
| 3 | Changer son mot de passe (moins de 8 caractères, puis confirmation différente, puis correct) | `PUT /auth/change-password` | É utilisateur, sessions | 2 erreurs claires, puis succès ; autres appareils déconnectés |

---

## A. Web — Super Admin et Accueil

### A1 Tableau de bord (§7.11)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir le tableau de bord | `GET /dashboard/kpi`, `/evolution`, `/inscriptionParMois`, `/topInscription` | L paiement, echeance, inscription | Indicateurs (paiements **validés** seulement), courbes |
| 2 | Export CSV | `GET /dashboard/export-csv` | L inscription… | Fichier CSV téléchargé |
| 3 | Bloc « Avis sur les formateurs » | `GET /formateurs/avis` | L reaction, support | Tiana / Voahangy « Compétent », Hery « Non compétent », Lalaina « Pas assez d'avis » |

### A2 Comptes utilisateurs (Super Admin) (§4.2)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Créer un compte Formateur | `POST /utilisateurs` → `userService.creerUtilisateur` (mot de passe haché) | É utilisateur | Compte dans la liste, connexion possible |
| 2 | Modifier ce compte (adresse `/dashboard/utilisateurs/:id/modifier`) | `PUT /utilisateurs/:id` | É utilisateur | Modifié, photo conservée si non changée |
| 3 | Désactiver le compte | `DELETE /utilisateurs/:id` | É utilisateur, sessions | Sessions de ce compte fermées |

### A3 Formations (Super Admin)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Créer une formation (durée, tarif, formateur, engagement) | `POST /formations` | É formation | Visible dans la liste et sur la vitrine mobile |
| 2 | Changer l'image de couverture | `PUT /formations/:id/image` | É formation | Nouvelle image sur la vitrine |
| 3 | Ouvrir la fiche puis Modifier (`/dashboard/formations/:id/modifier`) | `GET` / `PUT /formations/:id` | É formation | F5 garde le formulaire ouvert |

### A4 Dossier étudiant et inscription au guichet (§7.3, §7.4)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Étudiants → Nouveau : identité, e-mail, photo, pièces | `POST /etudiants` → `insertUtilisateurEtEtudiant` (transaction) | É utilisateur, etudiant | Dossier créé (rôle Étudiant imposé par le serveur) |
| 2 | Inscriptions → Nouvelle : cet étudiant, une formation, 3 tranches | `POST /inscriptions` → `creerInscription` (transaction + échéancier) | É inscription, echeance | 3 échéances dont la somme = tarif exact (la dernière absorbe l'arrondi) |
| 3 | Réinscrire le même étudiant à la même formation | idem | — | **409** inscription déjà active |

### A5 Validation d'une inscription en ligne et fiche PDF (§7.5, §7.8) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Inscriptions → filtre « En ligne » / « Non validée » | `GET /inscriptions?page=1&origine=en_ligne&valide=non` | L inscription… | Mahery, Miora (paiement déclaré visible) |
| 2 | **Valider** | `POST /inscriptions/:id/valid` → `validerInscription` | É inscription, paiement | Le paiement déclaré devient validé ; l'étudiant est notifié |
| 3 | Valider une seconde fois | idem | — | **409** déjà validée |
| 4 | Générer la fiche d'inscription | `POST /fiche/:id_inscription/generer` | L inscription… | PDF ouvert dans un nouvel onglet |

### A6 Paiements : guichet, validation, facture (§7.6) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paiements : bandeau « à valider » | `GET /paiements?page=1` (+ `compteurs.en_attente`) | L paiement… | Nombre de paiements en attente sur **toute** la base |
| 2 | Valider le paiement de Sitraka | `PUT /paiements/:id/valider` → `traiterPaiementEnAttente` | É paiement, notification_inapp | Statut validé, reste à payer mis à jour, étudiant notifié |
| 3 | Refuser un autre paiement en attente | `PUT /paiements/:id/refuser` | É paiement, notification_inapp | Statut refusé ; l'étudiant pourra repayer |
| 4 | Générer la facture d'un paiement validé, puis d'un refusé | `POST /factures/:id_paiement/generer` | É facture | PDF avec QR ; **409** pour le paiement non validé |
| 5 | Enregistrer un paiement au guichet supérieur au reste | `POST /paiements` | — | **400** montant supérieur au reste à payer |

### A7 Échéances et rappels (§7.7) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Échéances → filtre ROUGE | `GET /echeances?page=1&statut=ROUGE` | L echeance… | Toky et Fano en retard |
| 2 | **Rappeler** Toky | `POST /echeances/:id/rappeler` → `rappelerEcheance` | É echeance, notification_inapp | Notification + e-mail, date du dernier rappel affichée |
| 3 | Rappeler une échéance déjà réglée ou « payée, à valider » | idem | — | **409** (l'étudiant attend la validation de l'Accueil) |
| 4 | Notifications de l'Accueil | traitement automatique (`alerteService`) | É alerte_envoyee | Une **seule** alerte « doit être rappelé » par échéance à J-2 |

### A8 Assistance (§7.12)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Assistance : demandes en attente | `GET /assistances` | L assistance | 3 demandes en attente |
| 2 | **Résoudre** une demande | `PUT /assistances/:id/resoudre` | É assistance, notification_inapp | Statut « Résolu », étudiant notifié sur le mobile |
| 3 | Résoudre à nouveau | idem | — | **409** |

### A9 Notifications envoyées par le personnel (§7.10)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Envoyer une notification in-app à un étudiant | `POST /notifications/in-app` | É notification_inapp | Reçue sur le mobile |
| 2 | Envoyer un e-mail avec pièce jointe | `POST /notifications/email/piece-jointe` | É notification_email | E-mail reçu avec le fichier |

### A10 Documents et attestation vérifiée par QR code (§7.8, §7.13) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Générer l'attestation de Fitiavana **avant** la note de présentation | `POST /attestations/:id/generer` | — | Refusé : le formateur doit noter la présentation |
| 2 | Après F4 : générer puis envoyer | `/generer`, `/envoyer` | É attestation | PDF avec note /20 et QR code, envoyé par e-mail |
| 3 | Scanner le QR code (ou ouvrir `/verification/:uuid`) | `GET /verification/:uuid` [public] | L attestation | Page « attestation authentique » |
| 4 | Documents : déposer puis supprimer un document administratif | `POST /documents`, `DELETE /documents/:id` | É document_administratif | Ajouté / retiré de la liste |

---

## F. Web — Formateur

### F1 Espace formateur (§6.4)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter en formateur | — | — | Menu : Espace formateur, Supports, Supports programmés, Notifications |
| 2 | Cliquer sur une formation | `GET /formations/:id/etudiants` | L inscription, etudiant | Fenêtre des étudiants (seulement ses formations) |

### F2 Publier un support mis en forme (§7.18) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Supports : titre, texte en gras / liste / lien, PDF joint → Envoyer | `POST /supports` → `creerSupports` (HTML nettoyé) | É support, notification_inapp | Visible sur le mobile, étudiants notifiés |
| 2 | Coller `<script>alert(1)</script>` et un lien `javascript:` dans le texte | `utils/contenuRiche` (liste blanche) | — | Code supprimé à l'enregistrement (XSS impossible) |
| 3 | Publier un support **audio** ou **vidéo** | idem | É support | Lecteur intégré sans bouton Télécharger |
| 4 | Recherche, filtre, tri et « Voir plus » dans la liste | côté navigateur | — | Liste filtrée |

### F3 Supports programmés (§7.15)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Programmer un support dans 2 minutes | `POST /supports` (date d'envoi) | É support (programmé) | Dans « Supports programmés », invisible des étudiants |
| 2 | Attendre l'heure | `supportProgrammeService` (vérification périodique) | É support, notification_inapp | Publié automatiquement, étudiants notifiés |
| 3 | « Projet : site vitrine » : **Envoyer maintenant** | `POST /supports/:id/envoyer` | É support | Publié tout de suite |
| 4 | Programmer dans le passé | idem | — | **400** la date doit être dans le futur |

### F4 Classement et note d'attestation (§7.13) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Espace formateur → Classement d'une formation | `GET /formations/:id/classement` → `classementService` | L presence, paiement · É inscription | Rang, présences, note système /10 (4 à 10) |
| 2 | Saisir **12** en présentation | `PUT /inscriptions/:id/note` | — | Refus : 10 au maximum |
| 3 | Saisir **8** → Entrée | idem | É inscription | Note finale /20 colorée |

---

## M. Mobile — Étudiant et visiteur

### M1 Vitrine et inscription en ligne (§7.17) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir l'app sans compte → Découvrir | `GET /public/vitrine` | L formation, reaction, parametre_application | Fond plein écran, formations en couverture, formateurs « compétents » |
| 2 | Ajouter 2 formations à la sélection → S'inscrire | `POST /public/inscriptions` → `inscriptionEnLigne` (une transaction) | É utilisateur, etudiant, 2 inscriptions + échéances, paiement en attente | Compte créé, « en attente de validation » |
| 3 | Réessayer avec un e-mail déjà utilisé | idem | — | **409** |
| 4 | 6 envois en une heure | limite 5 / h / IP | — | **429** |

### M2 Accueil et formations
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Se connecter (étudiant) → Accueil | `GET /etudiants/:id/formations`, `/dashboard-paiement` | L inscription, paiement | Dernière formation, prochaine échéance, derniers supports et commentaires |
| 2 | Formations → détail | `GET /formations/:id` | L formation | Détail ; formation non validée : « En attente de validation » |

### M3 Consultation sécurisée d'un support (§7.14) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Documents → ouvrir un PDF | `GET /supports/<fichier>?token=` → `fichierMiddleware` | L sessions, inscription | Lecteur intégré, **filigrane** nom + e-mail + date |
| 2 | Capture d'écran (Android) | `FLAG_SECURE` | — | Écran noir sur la capture |
| 3 | Ouvrir l'URL du fichier dans un navigateur sans `?token=` | idem | — | **401** |
| 4 | Fichier d'une formation où l'étudiant n'est pas inscrit | idem | — | Refusé |

### M4 Commentaires et réactions (§7.9, §7.16)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Commenter un support, mentionner `@prénom` | `POST /commentaires` | É commentaire, commentaire_mention, notification_inapp | La personne mentionnée est notifiée |
| 2 | Répondre à un commentaire | idem | É commentaire | Réponse sous le commentaire (« Voir les réponses ») |
| 3 | 👍 puis 👎 | `POST /supports/:id/reactions` | É reaction | Une seule réaction par support, modifiable |

### M5 Paiement d'une échéance (mobile) (§7.6) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Accueil → **Payer** la prochaine échéance (mode, référence) | `POST /paiements` → `enregistrerPaiement` | É paiement (en attente), notification_inapp | « En attente de validation » ; montant **imposé** par le serveur ; Accueil notifié |
| 2 | Repayer la même échéance | idem | — | **409** un paiement est déjà en attente |
| 3 | Après validation (A6) | — | — | Notification « paiement validé », reste à payer mis à jour |

### M6 Assistance, notifications, présence
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Menu ⋮ → Assistance → envoyer une demande | `POST /assistances` | É assistance, notification_inapp | Visible côté web (A8) |
| 2 | Notifications : marquer lue, supprimer | `PUT /notifications/:id/lu`, `DELETE /notifications/:id` | É notification_inapp | Une notification supprimée ne revient pas |
| 3 | Utiliser l'app un jour de semaine | `authMiddleware` → `marquerPresence` | É presence | Une présence de plus dans le classement (F4) |

---

## T. Fonctions transverses

### T1 Recherche globale (§7.18) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Web : **Ctrl+K** → nom d'étudiant, formation, « paie » → Entrée | `GET /recherche?q=` | L etudiant, formation, inscription | La bonne fiche s'ouvre ; résultats limités au rôle (Accueil : pas de comptes) |
| 2 | Formateur : chercher un étudiant, un support | idem | L support | Espace formateur avec la fenêtre des étudiants ; page Supports filtrée |
| 3 | Mobile : loupe 🔍 de l'Accueil ou d'un en-tête → titre d'un support, « payer », « theme » | `GET /recherche?q=` [ET] | L formation, inscription, support | Support / formation / écran ouvert ; jamais d'étudiants ni de comptes |

### T2 Une adresse par fiche (§7.19) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Ouvrir une fiche étudiant | `SectionsRoutes.jsx` | — | Adresse `/dashboard/etudiants/12` |
| 2 | **F5**, puis « Précédent » | — | — | La fiche reste ouverte ; retour à la liste |
| 3 | Copier le lien dans l'autre navigateur (non connecté) | `App.jsx` (`state.depuis`) | — | Connexion, puis arrivée directe sur la fiche |
| 4 | Taper `/dashboard/etudiants/abc` | — | — | Retour à la liste |

### T3 Pagination côté serveur (§7.20) ⭐
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paiements / Étudiants / Inscriptions / Échéances | `GET /…?page=1&limite=20` | `LIMIT / OFFSET` + `COUNT(*)` | Pied « 1–20 sur N », boutons de pages ; onglet Réseau : une seule page transférée |
| 2 | Rechercher ou filtrer depuis la page 3 | idem + filtres | — | Retour page 1, total mis à jour |
| 3 | Supprimer la dernière ligne de la dernière page | `useListePaginee` | — | Retour à la page précédente |

### T4 Apparence (§7.21)
| Étape | Action | Route / fonctions | Base | Attendu |
|---|---|---|---|---|
| 1 | Paramètres → mode sombre + autre couleur, taille, densité | `usePreferences` (navigateur) | — | Tout reste lisible ; « Modifications enregistrées » |
| 2 | Mobile : Paramètres → thème sombre | `SettingsContext` | — | Lecteur et détail d'un support lisibles |
| 3 | Super Admin → Paramètres → **Fond de la vitrine** → remplacer, puis « Par défaut » | `PUT` / `DELETE /vitrine/fond` | É parametre_application | Visible sur Découvrir (M1) |

---

## Tests automatisés à montrer

```bash
cd backend-imtech && npm test      # 101 tests, sans base de données, quelques secondes
cd web && npx eslint src && npx vite build
cd mobile && npx tsc --noEmit && npx expo lint
```

Les tests couvrent : échéancier, paiements, note d'attestation, supports programmés, commentaires
et réactions, vitrine, texte riche (XSS), fichiers protégés, recherche selon le rôle, pagination,
limite des essais de connexion, autorisations HTTP de bout en bout (§10.1 du flux).

## Questions probables du jury (réponses courtes)

- *Pourquoi un paiement étudiant est « en attente » ?* L'argent est vérifié par l'Accueil avant
  d'être compté ; l'étudiant n'est pas pénalisé pendant ce temps (la date d'envoi compte).
- *Comment un token volé est-il bloqué ?* Chaque requête vérifie la table `sessions` : une
  déconnexion révoque vraiment le token.
- *Et la force brute sur la connexion ?* 5 échecs / 15 min par compte, 20 par adresse IP, puis 429.
- *Un étudiant peut-il voir les données d'un autre ?* Non : rôle **et** propriétaire vérifiés côté
  serveur (IDOR corrigés, §12.4 du flux) ; les menus ne font que masquer.
- *Comment empêchez-vous la fuite des supports ?* Fichiers servis seulement aux ayants droit,
  filigrane au nom de la personne, captures bloquées sur Android ; sur le web, le filigrane permet
  d'identifier l'origine d'une fuite.
- *Et si la base grossit ?* Les grosses listes sont paginées côté serveur (20 lignes, filtres en SQL).
- *Comment l'interface est-elle testée ?* Les règles métier et les droits sont testés côté serveur
  (101 tests) ; le front est vérifié par lint, build et ces scénarios. Piste : Vitest (§13).
- *Limites ?* Un seul serveur (compteurs en mémoire, fichiers sur disque), paiement mobile
  déclaratif, pas encore en ligne en HTTPS : voir §13 du flux.
