import { useState } from 'react'
import Icon from '../icon/Icon'
import { telechargerCSV } from '../../utils/exportCsv'

// Bouton « Exporter CSV » d'un tableau. columns = colonnes du <Tableau> (voir utils/exportCsv).
// lignes : lignes à exporter ; ou charger() : fonction async qui les renvoie (listes paginées :
// on exporte toutes les lignes filtrées, pas seulement la page affichée).
function BoutonExportCSV({ columns, lignes, charger, nomFichier, label = 'Exporter CSV' }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')

  async function exporter() {
    setErreur('')
    setEnCours(true)
    try {
      const donnees = charger ? await charger() : lignes
      telechargerCSV(nomFichier, columns, donnees || [])
    } catch (err) {
      setErreur(err.message || "Impossible d'exporter.")
    } finally {
      setEnCours(false)
    }
  }

  return (
    <button
      type="button"
      className="secondary-button export-csv-button"
      onClick={exporter}
      disabled={enCours}
      title={erreur || 'Télécharger le tableau (Excel)'}
    >
      <Icon name="download" /> {enCours ? 'Export...' : erreur ? 'Réessayer' : label}
    </button>
  )
}

export default BoutonExportCSV
