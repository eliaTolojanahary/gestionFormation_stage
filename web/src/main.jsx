import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { RetourProvider } from './components/retour/RetourProvider'
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