import './Tableau.css'

// Barre affichée au-dessus d'un tableau dès qu'une ligne est sélectionnée (voir hooks/useSelection.js).
// actions = [{ libelle, nombre, onClick, danger?, succes? }] ; `nombre` = lignes de la sélection
// concernées par l'action : bouton grisé à 0, nombre affiché s'il diffère de la sélection.
// Une entrée falsy est ignorée (ex. `canManage && { ... }`).
function BarreSelection({ selection, actions, enCours = false, libelle = 'ligne(s)' }) {
  if (!selection.nombre) return null

  return (
    <div className="barre-selection" role="region" aria-label="Actions sur la sélection">
      <strong>{selection.nombre} {libelle} sélectionné(s)</strong>

      <div className="barre-selection-actions">
        {actions.filter(Boolean).map((action) => (
          <button
            key={action.libelle}
            type="button"
            className={`row-action ${action.danger ? 'danger-action' : ''} ${action.succes ? 'success-action' : ''}`.trim()}
            onClick={action.onClick}
            disabled={enCours || !action.nombre}
          >
            {action.libelle}
            {action.nombre !== selection.nombre ? ` (${action.nombre})` : ''}
          </button>
        ))}

        <button type="button" className="row-action" onClick={selection.vider} disabled={enCours}>
          Tout désélectionner
        </button>
      </div>

      {enCours && <span className="barre-selection-attente">Traitement en cours...</span>}
    </div>
  )
}

export default BarreSelection
