import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { RetourProvider } from './components/retour/RetourProvider'
// Police Inter servie avec l'application (alphabet latin, 4 graisses) : plus d'appel à Google Fonts,
// dont la feuille de style bloquait l'affichage de la page (audit Lighthouse)
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import './index.css'

// Point d'entrée : monte l'application React dans <div id="root"> avec le routeur
// et les retours utilisateur (confirmations, messages de réussite)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RetourProvider>
        <App />
      </RetourProvider>
    </BrowserRouter>
  </React.StrictMode>
)