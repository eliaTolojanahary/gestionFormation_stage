const API_URL = 'http://localhost:3000/'

export function getFileUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  return `${API_URL}${filePath.replace(/^\//, '')}`
}