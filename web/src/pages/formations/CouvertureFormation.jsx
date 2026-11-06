import { getFileUrl } from '../../utils/files'
import './Formations.css'

// Image de couverture d'une formation (tableau et page détail).
// Sans image : initiales du nom sur fond coloré, ex. « Développement web » → « DW ».
function CouvertureFormation({ formation, grande = false }) {
  const classe = `formation-couverture-vignette${grande ? ' grande' : ''}`

  if (formation.image) {
    return <img className={classe} src={getFileUrl(formation.image)} alt={`Couverture de ${formation.nom}`} />
  }

  const initiales = (formation.nom || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('')

  return <div className={`${classe} formation-couverture-vide`} aria-hidden="true">{initiales || '—'}</div>
}

export default CouvertureFormation
