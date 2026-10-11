import { useState } from 'react'
import { apiRequest } from '../utils/api'

// Hook des documents : génération des PDF (fiche, facture, attestation),
// documents administratifs et supports de cours.
export function useDocument() {
  const [fiche, setFiche] = useState(null)
  const [factures, setFactures] = useState(null)
  const [attestations, setAttestations] = useState(null)
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Génère la fiche d'inscription PDF ; la réponse contient le chemin du fichier
  async function getFiche(id_inscription) {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/fiche/${id_inscription}/generer`, { method: 'POST' })
      setFiche(result)
      return result
    } catch (requestError) {
      setError(requestError.message || 'Impossible de générer la fiche.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Génère la facture d'un paiement validé
  async function getFacture(id_paiement) {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/factures/${id_paiement}/generer`, { method: 'POST' })
      setFactures(result)
      return result
    } catch (requestError) {
      setError(requestError.message || 'Impossible de générer la facture.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Supprime un document administratif ou un support selon son type, puis le retire de la liste
  async function deleteDoc(id, type) {
    const path = type === 'Administratif' ? `/documents/${id}` : `/supports/${id}`
    const result = await apiRequest(path, { method: 'DELETE' })

    setDocuments((current) => current.filter((document) => document.id_document !== Number(id)))
    return result
  }

  // Génère l'attestation (avec la note) et l'envoie à l'étudiant : notification in-app + e-mail avec le PDF
  async function envoyerAttestation(id_inscription) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest(`/attestations/${id_inscription}/envoyer`, { method: 'POST' })
    } catch (requestError) {
      setError(requestError.message || "Impossible d'envoyer l'attestation.")
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Génère l'attestation sans l'envoyer
  async function getAttestation(id_inscription) {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest(`/attestations/${id_inscription}/generer`, { method: 'POST' })
      setAttestations(result)
      return result
    } catch (requestError) {
      setError(requestError.message || 'Impossible de générer une attestation.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  async function getDocuments() {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiRequest('/documents', { method: 'GET' })
      setDocuments(result.documents || [])
      return result.documents || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de récupérer les documents.')
      return []
    } finally {
      setIsLoading(false)
    }
  }

  // formData contient un ou plusieurs fichiers dans le champ "fichiers"
  async function uploadDocuments(formData) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest('/documents', {
        method: 'POST',
        body: formData,
      })
    } catch (requestError) {
      setError(requestError.message || "Impossible d'envoyer les documents.")
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Supports de cours d'une formation
  async function getSupports(idFormation) {
    try {
      const result = await apiRequest(`/formations/${idFormation}/supports`)
      return result.data || []
    } catch (requestError) {
      setError(requestError.message || 'Impossible de récupérer les supports.')
      return []
    }
  }

  async function uploadSupport(formData) {
    setIsLoading(true)
    setError('')
    try {
      return await apiRequest('/supports', {
        method: 'POST',
        body: formData,
      })
    } catch (requestError) {
      setError(requestError.message || "Impossible d'ajouter le support.")
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    fiche, factures, attestations, documents, isLoading, error,
    getFiche, getFacture, getAttestation, envoyerAttestation,
    getDocuments, uploadDocuments, deleteDoc,
    getSupports, uploadSupport,
  }
}