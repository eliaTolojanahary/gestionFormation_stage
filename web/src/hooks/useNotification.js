import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'

export function useNotification() {
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Récupérer toutes les notifications
  async function getNotifications() {
    setIsLoading(true)
    setError('')

    try {
      const data = await apiRequest('/notifications')
      setNotifications(data.data || [])
      return data.data || []
    } catch (err) {
      setError(err.message || 'Impossible de charger les notifications.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // Marquer une notification comme lue
  async function lireNotification(id) {
    const result = await apiRequest(`/notifications/${id}/lu`, {
      method: 'PUT',
    })

    setNotifications((current) =>
      current.map((n) =>
        n.id_notification === Number(id) ? { ...n, lu: true } : n
      )
    )

    return result
  }

  // Supprimer une notification
  async function deleteNotification(id) {
    const result = await apiRequest(`/notifications/${id}`, {
      method: 'DELETE',
    })

    setNotifications((current) =>
      current.filter((n) => n.id_notification !== Number(id))
    )

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

  // Charger la liste au montage
  useEffect(() => {
    getNotifications()
  }, [])

  return {
    notifications,
    isLoading,
    error,
    getNotifications,
    lireNotification,
    deleteNotification,
    envoyerNotifInApp,
    envoyerEmail,
    envoyerEmailPieceJointe,
  }
}