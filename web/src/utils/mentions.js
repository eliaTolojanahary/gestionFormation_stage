// Mentions « @ » dans les commentaires (formateur / Super Admin -> étudiants de la formation).
import { apiRequest } from './api'

export const NB_SUGGESTIONS = 6

// Étudiants de la formation dont un mot du nom (ou l'e-mail) commence par `texte` : la recherche est
// faite par le serveur, la liste des inscrits n'est jamais chargée en entier
export async function chercherEtudiants(idFormation, texte) {
  const params = new URLSearchParams({ page: '1', limite: String(NB_SUGGESTIONS) })
  if (texte.trim()) params.set('recherche', texte.trim())
  const data = await apiRequest(`/formations/${idFormation}/etudiants?${params}`)
  return data.data || []
}

export const nomMention = (etudiant) => `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim()

// Étudiants choisis dans les suggestions, par formation : « Prénom Nom » -> id_etudiant
const mentionsChoisies = new Map()

export function retenirMention(idFormation, etudiant) {
  if (!mentionsChoisies.has(idFormation)) mentionsChoisies.set(idFormation, new Map())
  mentionsChoisies.get(idFormation).set(nomMention(etudiant), etudiant.id_etudiant)
}

// id_etudiant des étudiants choisis dont « @Prénom Nom » figure encore dans le texte au moment d'envoyer
export async function mentionsDuTexte(texte, idFormation) {
  if (!texte.includes('@')) return []
  const choisis = mentionsChoisies.get(idFormation) || new Map()
  return [...choisis]
    .filter(([nom]) => texte.includes(`@${nom}`))
    .map(([, idEtudiant]) => idEtudiant)
}
