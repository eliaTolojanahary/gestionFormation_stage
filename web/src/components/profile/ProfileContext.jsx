import { createContext, useContext } from 'react'

const ProfileContext = createContext(null)

export function ProfileProvider({ value, children }) {
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  return useContext(ProfileContext)
}
