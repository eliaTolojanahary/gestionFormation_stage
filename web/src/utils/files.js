import { fileUrl } from './api'

// URL d'un fichier uploadé (photo, support, document) : passe par fileUrl, qui ajoute le token
export function getFileUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  return fileUrl(filePath)
}
