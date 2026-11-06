# IMTECH INFO — Site web (React + Vite)

Site du personnel : Super Admin, Accueil, Formateur. Tout est expliqué dans
[`FLUX-APPLICATION.md`](../FLUX-APPLICATION.md) : démarrage (§2), organisation du code (§3),
parcours A → Z (§4), modules (§5).

```bash
npm install
npm run dev          # http://localhost:5173
npx eslint src       # lint
npx vite build       # build de production (dossier dist/)
```

`.env` : `VITE_URL_BASE=http://localhost:3000/api` (lu au moment du `npm run build`).

| Dossier | Contenu |
|---|---|
| `src/pages/` | un dossier par menu |
| `src/hooks/` | appels à l'API (`use…`) |
| `src/components/` | composants partagés |
| `src/utils/api.js` | `apiRequest` (ajoute le token ; erreurs traduites en français) |
| `src/components/retour/` | `useRetour()` : `confirmer(...)` (fenêtre de confirmation) et `notifier(...)` (message de réussite) |
| `src/utils/navigation.js` | menu et pages autorisées par rôle (masque seulement : la protection est dans l'API) |
