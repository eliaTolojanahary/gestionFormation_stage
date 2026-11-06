import { PERIODE_TOUT, libellePeriode, periodeInvalide } from '../../utils/periodes'
import './FiltreDates.css'

// Filtre « Du … au … » : deux dates libres, chacune facultative (tableau de bord, page Échéances).
// periode = { debut, fin } en 'AAAA-MM-JJ' ; onChange reçoit la nouvelle période ;
// legende = ce que la période filtre, suivi de « du … au … ».
function FiltreDates({ periode, onChange, legende = 'Indicateurs, inscriptions, paiements à surveiller et avis' }) {
  const invalide = periodeInvalide(periode)

  return (
    <div className="kpi-periode">
      <strong>Période</strong>
      <label>
        Du
        <input
          type="date"
          className="filter-option"
          value={periode.debut}
          max={periode.fin || undefined}
          onChange={(event) => onChange({ ...periode, debut: event.target.value })}
        />
      </label>
      <label>
        au
        <input
          type="date"
          className="filter-option"
          value={periode.fin}
          min={periode.debut || undefined}
          onChange={(event) => onChange({ ...periode, fin: event.target.value })}
        />
      </label>
      {(periode.debut || periode.fin) && (
        <button type="button" className="reset-button" onClick={() => onChange(PERIODE_TOUT)}>
          Tout afficher
        </button>
      )}
      {invalide ? (
        <small className="error">La date de début est après la date de fin.</small>
      ) : (
        <small>{legende} {libellePeriode(periode)}</small>
      )}
    </div>
  )
}

export default FiltreDates
