// Variables d'environnement minimales pour charger l'application sans vraie base de données.
// Les tests remplacent les fonctions des models par des faux (mock.method) : aucune requête SQL n'est envoyée.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
process.env.DOTENV_CONFIG_QUIET = 'true';
