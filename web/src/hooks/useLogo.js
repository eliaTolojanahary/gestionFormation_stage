import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import { getFileUrl } from '../utils/files'
import logoParDefaut from '../assets/logoImtech.png'

// Logo de l'organisation, choisi par le Super Admin (Paramètres > Apparence) et enregistré sur le
// serveur : le même pour tout le monde. Lu une seule fois (GET /public/logo, sans connexion pour
// la page de connexion) et partagé par tous les composants qui l'affichent.
let cheminLogo = null // "vitrine/xxx.png", null = logo par défaut
let chargement = null
const abonnes = new Set()

function prevenir() {
  abonnes.forEach((maj) => maj(cheminLogo))
}

// Relit le logo sur le serveur (après un changement dans Paramètres)
export function rafraichirLogo() {
  chargement = apiRequest('/public/logo')
    .then((result) => {
      cheminLogo = result.data?.logo || null
      prevenir()
    })
    .catch(() => {})
  return chargement
}

// Chemin enregistré (null = défaut), pour l'écran de réglage
export function useCheminLogo() {
  const [chemin, setChemin] = useState(cheminLogo)

  useEffect(() => {
    abonnes.add(setChemin)
    if (!chargement) rafraichirLogo()
    return () => abonnes.delete(setChemin)
  }, [])

  return chemin
}

// URL de l'image à afficher (logo choisi, sinon logo IMTECH INFO)
export function useLogo() {
  const chemin = useCheminLogo()
  return chemin ? getFileUrl(chemin) : logoParDefaut
}

export { logoParDefaut }
