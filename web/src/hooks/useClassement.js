import { useCallback, useState } from 'react'
import { apiRequest } from '../utils/api'

// Classement des étudiants d'une formation et notes d'attestation (système + présentation)
export function useClassement() {
  const [classement, setClassement] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // useCallback : fonction stable, utilisable sans boucle dans le useEffect du composant
  const getClassement = useCallback(async (idFormation) => {
    if (!idFormation) {
      setClassement([])
      return []
    }
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/formations/${idFormation}/classement`)
      setClassement(result.data || [])
      return result.data || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de charger le classement.')
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Note de présentation sur 10 ; note = '' ou null pour l'effacer
  async function definirNote(idInscription, note) {
    const result = await apiRequest(`/inscriptions/${idInscription}/note`, {
      method: 'PUT',
      body: JSON.stringify({ note_presentation: note === '' ? null : note }),
    })
    const notePresentation = result.data.note_presentation
    setClassement((liste) =>
      liste.map((e) =>
        e.id_inscription === idInscription
          ? {
              ...e,
              note_presentation: notePresentation,
              note_finale: notePresentation === null ? null : e.note_suggeree + notePresentation,
            }
          : e
      )
    )
    return result
  }

  return { classement, isLoading, error, getClassement, definirNote }
}
