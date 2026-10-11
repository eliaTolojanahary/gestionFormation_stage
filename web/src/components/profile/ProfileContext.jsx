import { createContext, useContext } from 'react'

// Contexte React partagé par toutes les pages du tableau de bord (ex. onProfile pour ouvrir
// la fenêtre "Mon profil") sans avoir à le passer en props à chaque niveau.
const ProfileContext = createContext(null)

export function ProfileProvider({ value, children }) {
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  return useContext(ProfileContext)
}
