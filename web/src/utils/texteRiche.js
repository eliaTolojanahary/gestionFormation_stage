// Outils des supports mis en forme (éditeur du formateur) et de leurs pièces jointes.

// Fichiers acceptés pour un support (mêmes types que l'API, voir backend middlewares/docUpload.js)
export const ACCEPT_SUPPORT =
  '.pdf,image/png,image/jpeg,image/webp,image/gif,.mp3,.m4a,.aac,.ogg,.wav,audio/*,.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime'

// Vrai si le HTML de l'éditeur ne contient aucun texte (ex. "<p><br></p>")
export function contenuVide(html) {
  if (!html) return true
  const div = document.createElement('div')
  div.innerHTML = html
  // trim() enlève aussi les espaces insécables (&nbsp;) laissés par l'éditeur
  return !div.textContent.trim()
}

// Nature d'une pièce jointe d'après son extension : 'pdf' | 'image' | 'audio' | 'video' | 'autre'
export function typeFichier(chemin) {
  const extension = (chemin || '').split('?')[0].split('.').pop().toLowerCase()
  if (extension === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) return 'image'
  if (['mp3', 'm4a', 'aac', 'ogg', 'wav', 'oga'].includes(extension)) return 'audio'
  if (['mp4', 'webm', 'mov'].includes(extension)) return 'video'
  return 'autre'
}
