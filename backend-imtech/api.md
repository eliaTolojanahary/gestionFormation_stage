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

## Assistance / Tickets
GET    /assistances
POST   /assistances
PUT    /assistances/:id
DELETE /assistances/:id

## Notifications
GET    /notifications
PUT    /notifications/:id/lu
DELETE /notifications/:id

## Dashboard & Export
GET /dashboard/kpi
GET /dashboard/evolution
GET /dashboard/export-csv

