import { readStoredToken } from '../hooks/useAuth'
export function buildHeaders(isFormData = false) {
  const token = readStoredToken()

  return {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${import.meta.env.VITE_URL_BASE}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(isFormData),
      ...(options.headers || {}),
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.')
  }

  return data
}