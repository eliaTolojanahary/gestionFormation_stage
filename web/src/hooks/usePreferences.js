import { useEffect, useState } from 'react'
import { appliquerCouleurPrincipale } from '../utils/theme'

// Préférences d'affichage par défaut (page Paramètres > Apparence), propres à ce navigateur.
// Le logo n'en fait plus partie : il est enregistré sur le serveur (hooks/useLogo).
export const PREFERENCES_PAR_DEFAUT = {
  theme: 'light',
  color: '#063a5c',
  fontSize: 'normale',
  density: 'confortable',
  collapsedSidebar: false,
}

// Relues depuis le localStorage au démarrage (stockage indisponible : valeurs par défaut)
function lirePreferences() {
  try {
    return {
      theme: localStorage.getItem('app_theme') || PREFERENCES_PAR_DEFAUT.theme,
      color: localStorage.getItem('app_color') || PREFERENCES_PAR_DEFAUT.color,
      fontSize: localStorage.getItem('app_font_size') || PREFERENCES_PAR_DEFAUT.fontSize,
      density: localStorage.getItem('app_density') || PREFERENCES_PAR_DEFAUT.density,
      collapsedSidebar: localStorage.getItem('app_sidebar_collapsed') === 'true',
    }
  } catch {
    return { ...PREFERENCES_PAR_DEFAUT }
  }
}

// Sur un écran étroit (tablette, téléphone), la barre latérale est toujours réduite aux icônes
// pour laisser la place au contenu, quelle que soit la préférence.
const ECRAN_ETROIT = '(max-width: 900px)'

function useEcranEtroit() {
  const [etroit, setEtroit] = useState(() => window.matchMedia(ECRAN_ETROIT).matches)
  useEffect(() => {
    const media = window.matchMedia(ECRAN_ETROIT)
    const changer = (event) => setEtroit(event.matches)
    media.addEventListener('change', changer)
    return () => media.removeEventListener('change', changer)
  }, [])
  return etroit
}

// Préférences d'affichage : appliquées sur <html> (attributs data-* et couleurs lus par le CSS)
// à chaque changement, puis sauvegardées. Renvoie [settings, setSettings, sidebarReduite].
export function usePreferences() {
  const [settings, setSettings] = useState(lirePreferences)
  const ecranEtroit = useEcranEtroit()
  const sidebarReduite = settings.collapsedSidebar || ecranEtroit

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    appliquerCouleurPrincipale(root, settings.color) // version claire et version sombre
    root.dataset.fontSize = settings.fontSize || 'normale'
    root.dataset.density = settings.density || 'confortable'
    root.dataset.sidebar = sidebarReduite ? 'collapsed' : 'expanded'

    try {
      localStorage.setItem('app_theme', settings.theme)
      localStorage.setItem('app_color', settings.color)
      localStorage.setItem('app_font_size', settings.fontSize || 'normale')
      localStorage.setItem('app_density', settings.density || 'confortable')
      localStorage.setItem('app_sidebar_collapsed', String(!!settings.collapsedSidebar))
      localStorage.removeItem('app_logo') // ancien logo gardé dans le navigateur
    } catch {
      // Les préférences restent actives pendant la session si le stockage est indisponible.
    }
  }, [settings, sidebarReduite])

  return [settings, setSettings, sidebarReduite]
}
