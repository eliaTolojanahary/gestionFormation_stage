# API REST IMTECH INFO (Version Finale)

## Authentification (Publique & Protégée)
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/profil                      

## Utilisateurs / Staff
GET    /utilisateurs
GET    /utilisateurs/:id
POST   /utilisateurs
PUT    /utilisateurs/:id
DELETE /utilisateurs/:id

## Étudiants
GET    /etudiants
GET    /etudiants/:id
GET    /etudiants/:id/formations
POST   /etudiants
PUT    /etudiants/:id
DELETE /etudiants/:id

## Formations
GET    /formations
GET    /formations/:id
GET    /formations/:id/etudiants
POST   /formations
PUT    /formations/:id
DELETE /formations/:id

## Inscriptions
GET    /inscriptions
GET    /inscriptions/:id
POST   /inscriptions               <-- Génère automatiquement l'échéancier
DELETE /inscriptions/:id

## Échéances & Paiements
GET    /inscriptions/:id/echeances 
GET    /echeances                  <-- Pour la vue globale des impayés (Vert/Orange/Rouge)
PUT    /echeances/:id
POST   /paiements                 
GET    /paiements/:id
PUT    /paiements/:id


## Documents
GET /factures/:id
GET /attestations/:id
GET /fiche/:id
GET /verification/:uuid

## Supports de cours & Commentaires & reactions
GET    /formations/:id/supports    
POST   /supports                  
DELETE /supports/:id
GET    /supports/:id/commentaires
POST   /commentaires
DELETE /commentaires/:id           
POST	/supports/:id/reactions	 
DELETE	/supports/:id/reactions	
GET	/supports/:id/reactions


## Notifications
GET    /notifications
PUT    /notifications/:id/lu
DELETE /notifications/:id

## Dashboard & Export
GET /dashboard/kpi
GET /dashboard/evolution
GET /dashboard/export-csv

## Assistance / Tickets
GET    /assistances
POST   /assistances
PUT    /assistances/:id
DELETE /assistances/:id


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
  "id_role_etudiant": 4,
  "photo_1": "photo1.jpg",
  "photo_2": "photo2.jpg",
  "certificat_residence": "cert.jpg",
  "photocopie_cin": "cin.jpg",
  "option_type": "info"
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