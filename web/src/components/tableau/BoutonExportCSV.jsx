import { useState } from 'react'
import Icon from '../icon/Icon'
import { useRetour } from '../retour/useRetour'
import { telechargerCSV } from '../../utils/exportCsv'

// Bouton « Exporter CSV » d'un tableau. columns = colonnes du <Tableau> (voir utils/exportCsv).
// lignes : lignes à exporter ; ou charger() : fonction async qui renvoie { lignes, limite } (listes
// paginées : on exporte toutes les lignes filtrées, pas seulement la page affichée). limite non nulle :
// le serveur a coupé la liste à ce nombre de lignes, l'utilisateur est prévenu.
function BoutonExportCSV({ columns, lignes, charger, nomFichier, label = 'Exporter CSV' }) {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const { notifier } = useRetour()

  async function exporter() {
    setErreur('')
    setEnCours(true)
    try {
      const { lignes: donnees, limite } = charger ? await charger() : { lignes, limite: null }
      telechargerCSV(nomFichier, columns, donnees || [])
      if (limite) {
        notifier(`Export limité aux ${limite.toLocaleString('fr-FR')} premières lignes : filtrez la liste pour exporter le reste.`)
      }
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
