import { getFileUrl } from '../../utils/files'


function getInitials(prenom, nom, fallback = '?') {
  const initials = `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase()
  return initials || fallback
}

function Avatar({ photo, prenom, nom, size = 'md', shape = 'square', fallback = '?', className = '' }) {
  const initials = getInitials(prenom, nom, fallback)
  const label = [prenom, nom].filter(Boolean).join(' ') || 'Avatar'

  const classes = ['avatar', `avatar-${size}`, `avatar-${shape}`, className].filter(Boolean).join(' ')

  if (photo) {
    return (
      <img
        className={`${classes} avatar-image`}
        src={getFileUrl(photo)}
        alt={label}
        onError={(event) => {
          event.currentTarget.style.display = 'none'
          event.currentTarget.nextSibling?.removeAttribute('hidden')
        }}
      />
    )
  }

  return <span className={classes}>{initials}</span>
}

export default Avatar