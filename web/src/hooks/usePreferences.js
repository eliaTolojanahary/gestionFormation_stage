import { useEffect, useState } from 'react'
import { appliquerCouleurPrincipale } from '../utils/theme'

// Préférences d'affichage par défaut (page Paramètres > Apparence)
export const PREFERENCES_PAR_DEFAUT = {
  theme: 'light',
  color: '#063a5c',
  logo: null,
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
      logo: localStorage.getItem('app_logo') || null,
      fontSize: localStorage.getItem('app_font_size') || PREFERENCES_PAR_DEFAUT.fontSize,
      density: localStorage.getItem('app_density') || PREFERENCES_PAR_DEFAUT.density,
      collapsedSidebar: localStorage.getItem('app_sidebar_collapsed') === 'true',
    }
  } catch {
    return { ...PREFERENCES_PAR_DEFAUT }
  }
}

// Préférences d'affichage : appliquées sur <html> (attributs data-* et couleurs lus par le CSS)
// à chaque changement, puis sauvegardées. Renvoie [settings, setSettings].
export function usePreferences() {
  const [settings, setSettings] = useState(lirePreferences)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    appliquerCouleurPrincipale(root, settings.color) // version claire et version sombre
    root.dataset.fontSize = settings.fontSize || 'normale'
    root.dataset.density = settings.density || 'confortable'
    root.dataset.sidebar = settings.collapsedSidebar ? 'collapsed' : 'expanded'

    try {
      localStorage.setItem('app_theme', settings.theme)
      localStorage.setItem('app_color', settings.color)
      localStorage.setItem('app_font_size', settings.fontSize || 'normale')
      localStorage.setItem('app_density', settings.density || 'confortable')
      localStorage.setItem('app_sidebar_collapsed', String(!!settings.collapsedSidebar))
      if (settings.logo) localStorage.setItem('app_logo', settings.logo)
    } catch {
      // Les préférences restent actives pendant la session si le stockage est indisponible.
    }
  }, [settings])

  return [settings, setSettings]
}
