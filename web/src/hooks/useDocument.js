import { useState } from 'react'
import { apiRequest } from '../utils/api'

export function useDocument() {
  const [fiche, setFiche] = useState(null)
  const [factures, setFactures] = useState(null)
  const [attestations, setAttestations] = useState(null)
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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
  async function deleteDoc(id, type) {
    console.log(id)
    const path = type === 'Administratif' ? `/documents/${id}` : `/supports/${id}`
    const result = await apiRequest(path, { method: 'DELETE' })

    setDocuments((current) => current.filter((document) => document.id_document !== Number(id)))
    return result
  }

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
    getFiche, getFacture, getAttestation,
    getDocuments, uploadDocuments, deleteDoc,
    getSupports, uploadSupport,
  }
}