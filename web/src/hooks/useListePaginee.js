import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

// Liste paginée côté serveur (étudiants, paiements, inscriptions, échéances).
// chemin  : route de l'API, ex. '/paiements' (null : aucune requête, ex. liste gérée autrement)
// filtres : objet envoyé en query string (valeurs vides ignorées), ex. { recherche, statut }
// Renvoie la page courante (lignes), le total, le nombre de pages, les champs en plus de la
// réponse (extra, ex. compteurs), setPage, recharger() après une action et setLignes()
// pour une mise à jour locale.
// Un changement de filtre revient à la page 1 ; la requête part 250 ms après la dernière frappe
// et une réponse dépassée (filtre changé entre-temps) est ignorée.
export function useListePaginee(chemin, filtres, { limite = 20, delai = 250 } = {}) {
  const cleFiltres = JSON.stringify(filtres)
  const [page, setPage] = useState(1)
  const [cleAffichee, setCleAffichee] = useState(cleFiltres)
  const [version, setVersion] = useState(0)
  const [resultat, setResultat] = useState({ lignes: [], total: 0, pages: 1, extra: {} })
  const [isLoading, setIsLoading] = useState(Boolean(chemin))
  const [error, setError] = useState('')

  // Nouveaux filtres : retour à la première page (ajusté pendant le rendu, sans requête en trop)
  if (cleAffichee !== cleFiltres) {
    setCleAffichee(cleFiltres)
    setPage(1)
  }

  useEffect(() => {
    if (!chemin) return undefined
    let annule = false
    const minuteur = window.setTimeout(async () => {
      setIsLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ page: String(page), limite: String(limite) })
        for (const [cle, valeur] of Object.entries(JSON.parse(cleFiltres))) {
          if (valeur !== '' && valeur !== null && valeur !== undefined) params.set(cle, String(valeur))
        }
        const reponse = await apiRequest(`${chemin}?${params}`)
        if (annule) return
        // eslint-disable-next-line no-unused-vars
        const { data, pagination, status, ...extra } = reponse
        const pages = pagination?.pages ?? 1
        // Page vidée (ex. dernier élément supprimé) : on recule sur la dernière page existante
        if ((data || []).length === 0 && page > pages) {
          setPage(pages)
          return
        }
        setResultat({ lignes: data || [], total: pagination?.total ?? 0, pages, extra })
      } catch (requestError) {
        if (!annule) setError(requestError.message || 'Chargement impossible.')
      } finally {
        if (!annule) setIsLoading(false)
      }
    }, delai)

    return () => {
      annule = true
      window.clearTimeout(minuteur)
    }
  }, [chemin, cleFiltres, page, limite, delai, version])

  const recharger = useCallback(() => setVersion((v) => v + 1), [])
  const setLignes = useCallback(
    (miseAJour) => setResultat((actuel) => ({ ...actuel, lignes: miseAJour(actuel.lignes) })),
    []
  )

  return { ...resultat, page, setPage, limite, isLoading, error, recharger, setLignes }
}
