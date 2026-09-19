import { useState } from 'react'

import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import { useNotification } from '../../hooks/useNotification'

import './Notifications.css'

function formatNotification(notification) {
  const message = notification.message || 'Nouvelle notification.'
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes('paiement') ||
    lowerMessage.includes('relance')
  ) {
    return {
      ...notification,
      icon: 'wallet',
      tone: 'warning',
      title: 'Paiement',
      text: message
    }
  }

  if (lowerMessage.includes('inscription')) {
    return {
      ...notification,
      icon: 'check',
      tone: 'success',
      title: 'Inscription',
      text: message
    }
  }

  if (
    lowerMessage.includes('commentaire') ||
    lowerMessage.includes('mention')
  ) {
    return {
      ...notification,
      icon: 'users',
      tone: 'info',
      title: 'Commentaire',
      text: message
    }
  }

  if (
    lowerMessage.includes('support') ||
    lowerMessage.includes('document')
  ) {
    return {
      ...notification,
      icon: 'file',
      tone: 'info',
      title: 'Nouveau support',
      text: message
    }
  }

  return {
    ...notification,
    icon: 'bell',
    tone: 'info',
    title: 'Notification',
    text: message
  }
}

function formatDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

function Notifications({ user }) {
  const {
    notifications,
    isLoading,
    error,
    lireNotification,
    deleteNotification
  } = useNotification()

  const [filter, setFilter] = useState('Toutes')

  const unreadNotifications = notifications.filter(
    (notification) => !notification.lu
  )

  const visible =
    filter === 'Non lues'
      ? unreadNotifications
      : notifications

  async function markAllRead() {
    await Promise.all(
      unreadNotifications.map(
        (notification) =>
          lireNotification(notification.id_notification)
      )
    )
  }

  async function markRead(id) {
    await lireNotification(id)
  }

  return (
    <section className="workspace-page">
      <Header
        user={user}
        activeItem="Notifications"
      />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            Centre de suivi
          </span>

          <h1>Notifications</h1>

        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={markAllRead}
          disabled={!unreadNotifications.length}
        >
          <Icon name="check" />
          Tout marquer comme lu
        </button>
      </div>

      <div className="notification-tabs">
        {['Toutes', 'Non lues'].map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? 'selected' : ''}
            onClick={() => setFilter(item)}
          >
            {item}

            <span>
              {item === 'Non lues'
                ? unreadNotifications.length
                : notifications.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading && (
        <p className="gestion-loading">
          Chargement...
        </p>
      )}

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      <div className="notification-list">
        {visible.map((notification) => {
          const item = formatNotification(notification)

          return (
            <div
              className={`notification-row ${
                !notification.lu ? 'unread' : ''
              }`}
              key={notification.id_notification}
              onClick={() =>
                markRead(notification.id_notification)
              }
              role="button"
              tabIndex="0"
            >
              <span
                className={`notification-icon ${item.tone}`}
              >
                <Icon name={item.icon} />
              </span>

              <span className="notification-copy">
                <strong>
                  {item.title}
                </strong>

                <span>
                  {item.text}
                </span>

                <small>
                  {formatDate(notification.date_creation)}
                </small>
              </span>

              <div className="notification-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    markRead(notification.id_notification)
                  }}
                  disabled={notification.lu}
                >
                  {notification.lu
                    ? 'Lue'
                    : 'Marquer lu'}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    deleteNotification(
                      notification.id_notification
                    )
                  }}
                >
                  Supprimer
                </button>
              </div>

              {!notification.lu && (
                <i aria-label="Non lue" />
              )}
            </div>
          )
        })}
      </div>

      {!isLoading && !visible.length && (
        <div className="empty-state">
          <Icon name="bell" />

          <h2>
            Tout est à jour
          </h2>

          <p>
            Vous n'avez aucune notification non lue.
          </p>
        </div>
      )}
    </section>
  )
}

export default Notifications