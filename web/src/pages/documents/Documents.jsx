import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import SearchFilterBar from '../../components/form/Filter'
import { useDocument } from '../../hooks/useDocument'
import { useFormation } from '../../hooks/useFormation'
import { getFileUrl } from '../../utils/files'
import './Documents.css'
import { formatDate } from '../../utils/time'

// Extension en majuscules (ex. "PDF"), tirée du nom du document ou du fichier
function getExtension(document) {
  const fileName = document.nom_document || document.fichier || ''
  const extension = fileName.split('.').pop()?.toUpperCase()
  return extension || 'Autre'
}

// Page Documents : regroupe les documents administratifs et les supports de cours de toutes
// les formations, avec recherche, filtres, ajout de fichiers et suppression (Super Admin).
function Documents({ user }) {
  const { documents, isLoading, error, getDocuments, getSupports, uploadDocuments, uploadSupport, deleteDoc } = useDocument()
  const { formations, getFormations } = useFormation()
  const [supports, setSupports] = useState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [extensionFilter, setExtensionFilter] = useState('Tous')
  const [supportFormation, setSupportFormation] = useState('')
  const [supportTitle, setSupportTitle] = useState('')
  // Références vers les <input type="file"> cachés, ouverts par les boutons d'ajout
  const supportInputRef = useRef(null)
  const inputRef = useRef(null)

  // Au chargement : supports de chaque formation (en parallèle) + documents administratifs
  useEffect(() => {
    async function loadDocuments() {
      const loadedFormations = await getFormations()
      const supportGroups = await Promise.all(
        loadedFormations.map((formation) => getSupports(formation.id_formation))
      )
      setSupports(supportGroups.flat())
      await getDocuments()
    }
    loadDocuments()
  }, [])

  const extensions = ['Tous', 'PNG', 'PDF', 'DOCX']

  // Liste unique : les supports sont convertis au même format que les documents administratifs
  const allDocuments = useMemo(() => [
    ...documents.map((document) => ({ ...document, type_document: 'Administratif' })),
    ...supports.map((support) => ({
      id_document: support.id_support,
      type_document: 'Support',
      nom_document: support.titre,
      fichier: support.fichier,
      date_creation: support.date_publication,
      nom_formation: support.nom_formation,
      nom: support.prof_nom,
      prenom: support.prof_prenom,
    })),
  ], [documents, supports])

  const filteredDocuments = useMemo(() => allDocuments.filter((document) => {
    const name = document.nom_document || document.fichier || ''
    const extension = getExtension(document)
    const matchesQuery = name.toLowerCase().includes(query.trim().toLowerCase())
    const matchesType = typeFilter === 'Tous' || document.type_document === typeFilter
    const matchesExtension = extensionFilter === 'Tous' || extension === extensionFilter
    return matchesQuery && matchesType && matchesExtension
  }), [allDocuments, query, typeFilter, extensionFilter])

  // Ajout d'un ou plusieurs documents administratifs
  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const formData = new FormData()
    files.forEach((file) => formData.append('fichiers', file))

    const result = await uploadDocuments(formData)
    if (result) await getDocuments()
    event.target.value = ''
  }

  // Ajout d'un support de cours dans la formation choisie (rien n'est envoyé sans formation).
  // Côté API, seul un formateur peut déposer un support.
  async function handleSupportUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !supportFormation) return

    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('id_formation', supportFormation)
    formData.append('titre', supportTitle.trim() || file.name)
    
    const result = await uploadSupport(formData)

    if (result) {
      const refreshedSupports = await Promise.all(
        formations.map((formation) => getSupports(formation.id_formation))
      )
      setSupports(refreshedSupports.flat())
      setSupportTitle('')
    }
  }

  function resetFilters() {
    setQuery('')
    setTypeFilter('Tous')
    setExtensionFilter('Tous')
  }

  async function handleDelete(document) {
    if (!window.confirm(`Supprimer « ${document.nom_document || document.fichier} » ?`)) return

    const id = document.id_document
    const result = await deleteDoc(id, document.type_document)

    if (result) {
        const refreshedSupports = await Promise.all(
        formations.map((formation) => getSupports(formation.id_formation))
      )
      setSupports(refreshedSupports.flat())
        await getDocuments()
      
    }
  }

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Documents" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Ressources du centre</span>
          <h1>Documents</h1>
          <p>Centralisez les supports, modèles et documents administratifs.</p>
        </div>
        <div className="document-upload-actions">
          <button className="secondary-button" type="button" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" /> Document administratif
          </button>
          <button className="primary-button" type="button" onClick={() => supportInputRef.current?.click()}>
            <Icon name="upload" /> Ajouter un support
          </button>
        </div>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
          onChange={handleUpload}
        />
        <input
          ref={supportInputRef}
          className="visually-hidden"
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={handleSupportUpload}
        />
      </div>

      <div className="workspace-panel document-panel">
        <SearchFilterBar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Rechercher un document..."
          filters={[
            {
              name: 'type_document',
              label: 'Type de document',
              value: typeFilter,
              onChange: setTypeFilter,
              options: ['Tous', 'Administratif', 'Support'],
            },
            {
              name: 'extension',
              label: 'Extension',
              value: extensionFilter,
              onChange: setExtensionFilter,
              options: extensions,
            },
          ]}
          onReset={resetFilters}
        />

        <div className="document-upload-line">
          <label htmlFor="support-formation">Formation du support</label>
          <select id="support-formation" value={supportFormation} onChange={(event) => setSupportFormation(event.target.value)}>
            <option value="">Choisir une formation</option>
            {formations.map((formation) => (
              <option key={formation.id_formation} value={formation.id_formation}>{formation.nom}</option>
            ))}
          </select>
        </div>

        {error && <p className="form-error">{error}</p>}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <div className="document-grid">
            {filteredDocuments.map((document) => {
              const fileName = document.nom_document || document.fichier || 'Document sans nom'
              const fileUrl = getFileUrl(document.fichier)

              return (
                <article className="document-card" key={document.id_document}>
                  <div className="document-icon"><Icon name="file" /></div>
                  <div className="document-main">
                    <div className="document-title"><h2>{fileName}</h2></div>
                    <p>{document.type_document || 'Autre'} · {getExtension(document)}</p>
                    <small>{document.prenom || ''} {document.nom || ''} · {formatDate(document.date_creation)}</small>
                  </div>
                  <div className="document-actions">
                    {fileUrl && (
                      <a className="document-action" href={fileUrl} target="_blank" rel="noreferrer">
                        Voir
                      </a>
                    )}
                    {user?.role === 'Super Admin' && (
                      <button className="document-action document-action-danger" type="button" onClick={() => handleDelete(document)}>
                        Supprimer
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!filteredDocuments.length && (
          <div className="empty-state">
            <Icon name="file" />
            <h2>Aucun document trouvé</h2>
            <p>Essayez un autre mot-clé ou ajoutez un nouveau fichier.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default Documents