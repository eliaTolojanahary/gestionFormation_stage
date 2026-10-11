import { useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import OngletApparence from './OngletApparence'
import OngletSecurite from './OngletSecurite'
import './Parametres.css'

const ONGLETS = [
  { id: 'apparence', libelle: 'Apparence', icone: 'palette' },
  { id: 'securite', libelle: 'Sécurité', icone: 'gear' },
]

// Page Paramètres : menu des onglets et onglet ouvert (un composant par onglet) :
//  - Apparence (OngletApparence.jsx) : préférences d'affichage, appliquées et sauvegardées par
//    usePreferences via onSettingsChange ;
//  - Sécurité (OngletSecurite.jsx) : mot de passe, dernière connexion, sessions, déconnexion globale.
function Parametres({ user, settings, onSettingsChange }) {
  const [activeTab, setActiveTab] = useState('apparence')
  const [saved, setSaved] = useState(false)

  // Affiche « Modifications enregistrées » pendant 1,8 s
  function signalerEnregistre() {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  function changeSetting(key, value) {
    onSettingsChange({ ...settings, [key]: value })
    signalerEnregistre()
  }

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Parametres" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Préférences du compte</span>
          <h1>Paramètres</h1>
          <p>Adaptez l'interface et les préférences de votre espace de travail.</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-menu">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.id}
              className={`settings-menu-item ${activeTab === onglet.id ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveTab(onglet.id)}
            >
              <Icon name={onglet.icone} /> {onglet.libelle}
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeTab === 'apparence' && (
            <OngletApparence
              user={user}
              settings={settings}
              changeSetting={changeSetting}
              onEnregistre={signalerEnregistre}
            />
          )}
          {activeTab === 'securite' && <OngletSecurite />}

          {saved && (
            <div className="saved-label" style={{ marginTop: '10px' }}>
              <Icon name="check" /> Modifications enregistrées !
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Parametres
