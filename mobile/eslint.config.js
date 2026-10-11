// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Règle pensée pour le HTML : en React Native, une apostrophe dans <Text> s'affiche telle quelle.
      'react/no-unescaped-entities': 'off',
      // Les hooks de données chargent volontairement leurs données au montage via useEffect.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
