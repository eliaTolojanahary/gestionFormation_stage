import { useEffect, useRef, useState } from 'react'
import { apiRequest } from '../utils/api'

// Nombre de notifications chargées par page (bouton « Notifications précédentes »)
const LIMITE = 10
// Fréquence de la recherche de nouvelles notifications (plus vérification au retour sur l'onglet)
const INTERVALLE_NOUVELLES = 10 * 1000

// Hook des notifications : liste paginée de l'utilisateur connecté et envoi de notifications
// in-app / e-mails par le personnel.
// options :
//   charger : charge la liste au montage et cherche les nouvelles toutes les 10 s (false pour
//             n'utiliser que les fonctions d'envoi, ex. useNotifEvent)
//   nonLues : onglet « Non lues » (liste rechargée quand il change)
export function useNotification({ charger = true, nonLues = false } = {}) {
  const [notifications, setNotifications] = useState([])
  const [compteur, setCompteur] = useState({ total: 0, nonLues: 0 })
  const [encorePlus, setEncorePlus] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPlus, setIsLoadingPlus] = useState(false)
  const [error, setError] = useState('')

  // Liste courante lue par l'intervalle (sa fonction garderait sinon la liste du premier rendu)
  const listeRef = useRef(notifications)
  listeRef.current = notifications

  function lireListe(params) {
    const query = new URLSearchParams({ ...params, ...(nonLues ? { nonLues: 1 } : {}) })
    return apiRequest(`/notifications?${query}`)
  }

  // Première page : les LIMITE plus récentes
  async function getNotifications() {
    setIsLoading(true)
    setError('')

    try {
      const data = await lireListe({ limite: LIMITE })
      setNotifications(data.data || [])
      setEncorePlus(Boolean(data.meta?.encorePlus))
      if (data.meta) setCompteur({ total: data.meta.total, nonLues: data.meta.nonLues })
      return data.data || []
    } catch (err) {
      setError(err.message || 'Impossible de charger les notifications.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Page suivante : plus anciennes que la dernière affichée, ajoutées en bas
  async function chargerPlusAnciennes() {
    const derniere = listeRef.current[listeRef.current.length - 1]
    if (!derniere) return
    setIsLoadingPlus(true)

    try {
      const data = await lireListe({ limite: LIMITE, avant: derniere.id_notification })
      setNotifications((current) => [...current, ...(data.data || [])])
      setEncorePlus(Boolean(data.meta?.encorePlus))
      if (data.meta) setCompteur({ total: data.meta.total, nonLues: data.meta.nonLues })
    } catch (err) {
      setError(err.message || 'Impossible de charger les notifications précédentes.')
    } finally {
      setIsLoadingPlus(false)
    }
  }

  // Nouvelles notifications : plus récentes que la première affichée, ajoutées en haut.
  // Silencieux en cas d'erreur (nouvel essai au prochain passage).
  async function chargerNouvelles() {
    const premiere = listeRef.current[0]
    if (!premiere) return getNotifications()

    try {
      const data = await lireListe({ apres: premiere.id_notification })
      const nouvelles = data.data || []
      if (nouvelles.length) {
        setNotifications((current) => {
          const dejaAffichees = new Set(current.map((n) => n.id_notification))
          return [...nouvelles.filter((n) => !dejaAffichees.has(n.id_notification)), ...current]
        })
      }
      if (data.meta) setCompteur({ total: data.meta.total, nonLues: data.meta.nonLues })
    } catch {
      // ignoré
    }
  }

  // Marquer une notification comme lue
  async function lireNotification(id) {
    const result = await apiRequest(`/notifications/${id}/lu`, {
      method: 'PUT',
    })

    const etaitNonLue = listeRef.current.some((n) => n.id_notification === Number(id) && !n.lu)
    setNotifications((current) =>
      current.map((n) =>
        n.id_notification === Number(id) ? { ...n, lu: true } : n
      )
    )
    if (etaitNonLue) {
      setCompteur((current) => ({ ...current, nonLues: Math.max(current.nonLues - 1, 0) }))
    }

    return result
  }

  // Tout marquer comme lu, y compris les notifications pas encore chargées
  async function lireToutesNotifications() {
    const result = await apiRequest('/notifications/lu-tout', {
      method: 'PUT',
    })

    setNotifications((current) => current.map((n) => ({ ...n, lu: true })))
    setCompteur((current) => ({ ...current, nonLues: 0 }))

    return result
  }

  // Supprimer une notification
  async function deleteNotification(id) {
    const result = await apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    })

    const supprimee = listeRef.current.find((n) => n.id_notification === Number(id))
    setNotifications((current) =>
      current.filter((n) => n.id_notification !== Number(id))
    )
    if (supprimee) {
      setCompteur((current) => ({
        total: Math.max(current.total - 1, 0),
        nonLues: supprimee.lu ? current.nonLues : Math.max(current.nonLues - 1, 0),
      }))
    }

    return result
  }

  // Envoyer une notification in-app
  function envoyerNotifInApp(formData) {
    return apiRequest('/notifications/in-app', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
  }

  // Envoyer un email
  function envoyerEmail(formData) {
    return apiRequest('/notifications/email', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
  }

  // Envoyer un email avec pièce jointe (FormData)
  function envoyerEmailPieceJointe(formData) {
    return apiRequest('/notifications/email/piece-jointe', {
      method: 'POST',
      body: formData,
    })
  }

  // Charger la première page au montage et à chaque changement d'onglet (Toutes / Non lues)
  useEffect(() => {
    if (charger) getNotifications()
  }, [charger, nonLues])

  // Nouvelles notifications toutes les 10 s, et tout de suite au retour sur l'onglet
  useEffect(() => {
    if (!charger) return undefined

    function verifier() {
      if (document.visibilityState === 'visible') chargerNouvelles()
    }
    document.addEventListener('visibilitychange', verifier)
    const intervalle = window.setInterval(verifier, INTERVALLE_NOUVELLES)
    return () => {
      document.removeEventListener('visibilitychange', verifier)
      window.clearInterval(intervalle)
    }
  }, [charger, nonLues])

  return {
    notifications,
    compteur,
    encorePlus,
    isLoading,
    isLoadingPlus,
    error,
    getNotifications,
    chargerPlusAnciennes,
    chargerNouvelles,
    lireNotification,
    lireToutesNotifications,
    deleteNotification,
    envoyerNotifInApp,
    envoyerEmail,
    envoyerEmailPieceJointe,
  }
}
