# IMTECH INFO — Application mobile (React Native + Expo)

Application de l'étudiant, et du visiteur sans compte (vitrine, inscription en ligne). Tout est
expliqué dans [`FLUX-APPLICATION.md`](../FLUX-APPLICATION.md) : démarrage (§2), organisation du
code (§3), parcours A → Z (§4), modules (§5).

```bash
npm install
npx expo start       # puis scanner le QR code avec Expo Go (même Wi-Fi que le PC)
npx expo start -c    # en vidant le cache
npx tsc --noEmit     # vérification des types
npx expo lint        # lint
```

`.env` : `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:3000/api` (l'IP s'affiche au démarrage du serveur).
Pour un APK, l'adresse de l'API est dans `eas.json` (voir `A-FAIRE.md` §4).

| Dossier | Contenu |
|---|---|
| `src/app/` | un fichier = un écran (Expo Router) ; `(tabs)/` = barre du bas |
| `src/hooks/` | appels à l'API (`use-…`) |
| `src/components/` | composants (paiement, vitrine, recherche…) |
| `src/context/` | connexion (`useAuth`), réglages et thème |
| `src/utils/api.ts` | `apiRequest` (ajoute le token ; erreurs traduites en français) ; chemins dans `src/constants/api.ts` |
