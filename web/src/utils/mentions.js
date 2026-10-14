// Mentions « @ » dans les commentaires (formateur / Super Admin -> étudiants de la formation).
import { apiRequest } from './api'

// Étudiants inscrits par formation, chargés une seule fois pour toutes les cartes de support
const etudiantsParFormation = new Map()

export function chargerEtudiants(idFormation) {
  if (!etudiantsParFormation.has(idFormation)) {
    const requete = apiRequest(`/formations/${idFormation}/etudiants`)
      .then((data) => data.data || [])
      .catch((err) => {
        etudiantsParFormation.delete(idFormation) // nouvel essai au prochain « @ »
        throw err
      })
    etudiantsParFormation.set(idFormation, requete)
  }
  return etudiantsParFormation.get(idFormation)
}

export const nomMention = (etudiant) => `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim()

// id_etudiant des étudiants dont « @Prénom Nom » figure encore dans le texte au moment d'envoyer
export async function mentionsDuTexte(texte, idFormation) {
  if (!texte.includes('@')) return []
  const etudiants = await chargerEtudiants(idFormation)
  return etudiants
    .filter((etudiant) => texte.includes(`@${nomMention(etudiant)}`))
    .map((etudiant) => etudiant.id_etudiant)
}
