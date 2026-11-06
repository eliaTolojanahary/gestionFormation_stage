import Icon from '../../components/icon/Icon'
import { logoParDefaut, rafraichirLogo, useCheminLogo } from '../../hooks/useLogo'
import FondVitrine from './FondVitrine'
import ImageParametre from './ImageParametre'

// Couleurs proposées pour la couleur principale de l'interface
const colorOptions = [
  { name: 'Bleu IMTECH', value: '#063a5c' },
  { name: 'Bleu azur', value: '#137c8b' },
  { name: 'Vert formation', value: '#2d8066' },
  { name: 'Bordeaux', value: '#8e3b54' },
  { name: 'Jaune', value: '#e2a019' },
  { name: 'Gris', value: '#546e7a' },
  { name: 'Rouge', value: '#d32f2f' },
]

// Boutons de choix ; la valeur sélectionnée a la classe "selected"
function Choix({ options, valeur, onChange }) {
  return (
    <div className="mode-options">
      {options.map(({ value, label }) => (
        <button
          key={value}
          className={valeur === value ? 'selected' : ''}
          type="button"
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// Ligne de réglage : libellé + explication à gauche, contrôle à droite
function Ligne({ titre, aide, className = '', children }) {
  return (
    <div className={`setting-line ${className}`}>
      <div>
        <strong>{titre}</strong>
        <small>{aide}</small>
      </div>
      {children}
    </div>
  )
}

// Onglet Apparence : thème, couleur, taille du texte, densité, menu réduit (préférences de ce
// navigateur, appliquées et sauvegardées par usePreferences via changeSetting).
// Pour le Super Admin seulement : logo de l'organisation et fond de la vitrine mobile,
// enregistrés sur le serveur et donc les mêmes pour tout le monde.
function OngletApparence({ user, settings, changeSetting, onEnregistre }) {
  const cheminLogo = useCheminLogo()
  const estSuperAdmin = user?.role === 'Super Admin'

  return (
    <section className="workspace-panel settings-section">
      <div className="panel-heading">
        <div>
          <h2>Apparence de la plateforme</h2>
          <p>Personnalisez l'identité visuelle et l'ergonomie de votre espace.</p>
        </div>
        <Icon name="palette" />
      </div>

      <Ligne titre="Mode d'affichage" aide="Choisissez le confort visuel qui vous convient.">
        <Choix
          valeur={settings.theme}
          onChange={(v) => changeSetting('theme', v)}
          options={[
            { value: 'light', label: <><Icon name="sun" /> Clair</> },
            { value: 'dark', label: <><Icon name="moon" /> Sombre</> },
          ]}
        />
      </Ligne>

      <Ligne titre="Couleur principale" aide="Utilisée pour les éléments actifs et les actions.">
        <div className="color-options">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              className={settings.color === color.value ? 'selected' : ''}
              type="button"
              title={color.name}
              style={{ '--swatch': color.value }}
              onClick={() => changeSetting('color', color.value)}
            >
              <span />
            </button>
          ))}
        </div>
      </Ligne>

      <Ligne titre="Taille du texte" aide="Ajustez la taille globale de la police d'écriture.">
        <Choix
          valeur={settings.fontSize || 'normale'}
          onChange={(v) => changeSetting('fontSize', v)}
          options={[
            { value: 'petite', label: 'Petite' },
            { value: 'normale', label: 'Normale' },
            { value: 'grande', label: 'Grande' },
          ]}
        />
      </Ligne>

      <Ligne titre="Densité de l'interface" aide="Choisissez l'espacement entre les éléments.">
        <Choix
          valeur={settings.density || 'confortable'}
          onChange={(v) => changeSetting('density', v)}
          options={[
            { value: 'compacte', label: 'Compacte' },
            { value: 'confortable', label: 'Confortable' },
          ]}
        />
      </Ligne>

      <Ligne titre="Sidebar réduite par défaut" aide="Affiche uniquement les icônes dans le menu latéral.">
        <div className="mode-options">
          <button
            className={settings.collapsedSidebar ? 'selected' : ''}
            type="button"
            onClick={() => changeSetting('collapsedSidebar', !settings.collapsedSidebar)}
          >
            {settings.collapsedSidebar ? 'Activée' : 'Désactivée'}
          </button>
        </div>
      </Ligne>

      {estSuperAdmin && (
        <>
          <ImageParametre
            titre="Logo de l'organisation"
            aide="Affiché pour tout le monde (menu latéral, page de connexion). JPG, PNG ou WEBP (2 Mo max), de préférence carré."
            chemin={cheminLogo}
            imageParDefaut={logoParDefaut}
            route="/parametres/logo"
            onChange={rafraichirLogo}
            onSaved={onEnregistre}
          />
          {/* Fond du bandeau « Découvrir » de l'application mobile */}
          <FondVitrine onSaved={onEnregistre} />
        </>
      )}
    </section>
  )
}

export default OngletApparence
