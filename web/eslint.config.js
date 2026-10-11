import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Les hooks de données (useEtudiant, usePaiement...) chargent volontairement leurs
      // données au montage via useEffect. On garde l'alerte visible sans bloquer le lint.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Fichiers de contexte : exportent à la fois le Provider et le hook d'accès
    files: ['src/components/profile/ProfileContext.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
