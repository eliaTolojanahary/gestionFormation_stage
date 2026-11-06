import { createContext, useContext } from 'react'

// Contexte des retours utilisateur, fourni par RetourProvider :
// const { confirmer, notifier } = useRetour()
export const RetourContext = createContext(null)

export function useRetour() {
  return useContext(RetourContext)
}
