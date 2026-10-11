// Communication avec l'API backend et gestion de la session (token + utilisateur) dans le navigateur.

// Adresse de l'API, définie dans web/.env (ex. http://localhost:3000/api)
export const API_BASE_URL = import.meta.env.VITE_URL_BASE

// Clés de stockage du token et de l'utilisateur connecté
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

// La session est stockée en localStorage ("se souvenir de moi") ou en sessionStorage.
export function readStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null
}

export function readStoredUser() {
  const storedUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY)
  try {
    return storedUser ? JSON.parse(storedUser) : null
  } catch {
    return null
  }
}

// Enregistre la session après connexion : localStorage survit à la fermeture du navigateur,
// sessionStorage est vidé à la fermeture de l'onglet
export function storeSession({ token, user }, rememberMe) {
  const storage = rememberMe ? localStorage : sessionStorage
  if (token) storage.setItem(TOKEN_KEY, token)
  if (user) storage.setItem(USER_KEY, JSON.stringify(user))
}

// Met à jour l'utilisateur stocké (après modification du profil) dans le même stockage que la session
export function storeUser(user) {
  const storage = localStorage.getItem(USER_KEY) ? localStorage : sessionStorage
  storage.setItem(USER_KEY, JSON.stringify(user))
}

// Déconnexion locale : efface le token et l'utilisateur des deux stockages
export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(TOKEN_KEY)
    storage.removeItem(USER_KEY)
  }
}

// URL d'un fichier servi par l'API (ex. "documents/facture_3.pdf").
// Les fichiers sont protégés : un <a href> ou un <img> ne peut pas envoyer l'en-tête
// Authorization, le token est donc passé dans l'URL. Le lien ne marche plus après déconnexion.
export function fileUrl(cheminRelatif) {
  const token = readStoredToken()
  const url = `${API_BASE_URL}/${String(cheminRelatif || '').replace(/^\//, '')}`
  return token ? `${url}?token=${encodeURIComponent(token)}` : url
}

// En-têtes HTTP : token d'authentification + JSON. Pour un FormData (upload de fichier),
// on laisse le navigateur définir le Content-Type lui-même (multipart avec "boundary").
export function buildHeaders(isFormData = false) {
  const token = readStoredToken()

  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Appel à l'API utilisé par tous les hooks, ex. apiRequest('/formations', { method: 'POST', body: ... }).
// Renvoie le JSON de la réponse ; lève une Error avec le message du serveur en cas d'échec.
export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(isFormData),
      ...(options.headers || {}),
    },
  })

  // Le corps peut être vide ou ne pas être du JSON (erreur proxy, page HTML...)
  const text = await response.text()
  let data = {}
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  // Session expirée ou révoquée (logout depuis un autre appareil) : retour à la connexion
  if (response.status === 401 && readStoredToken()) {
    clearSession()
    window.location.assign('/login')
  }

  if (!response.ok) {
    throw new Error(data.message || `Erreur ${response.status}`)
  }

  return data
}
