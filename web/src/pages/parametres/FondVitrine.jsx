import { useEffect, useState } from 'react'
import { apiRequest } from '../../utils/api'
import fondParDefaut from '../../assets/fond-decouvrir.jpg'
import ImageParametre from './ImageParametre'

// Ligne « Fond de la vitrine mobile » (Super Admin) : image du bandeau « Découvrir » de
// l'application mobile, envoyée au serveur pour que l'application mobile la voie.
function FondVitrine({ onSaved }) {
  const [fond, setFond] = useState(null) // chemin "vitrine/xxx.jpg", null = image par défaut

  useEffect(() => {
    apiRequest('/public/vitrine')
      .then((result) => setFond(result.data?.presentation?.fond || null))
      .catch(() => {})
  }, [])

  return (
    <ImageParametre
      titre="Fond de la vitrine mobile"
      aide="Image du bandeau « Découvrir » de l'application. JPG, PNG ou WEBP (8 Mo max), de préférence en portrait d'au moins 1200 × 1800 px pour rester nette."
      chemin={fond}
      imageParDefaut={fondParDefaut}
      route="/vitrine/fond"
      onChange={setFond}
      onSaved={onSaved}
      apercuClassName="fond-vitrine-apercu"
    />
  )
}

export default FondVitrine
