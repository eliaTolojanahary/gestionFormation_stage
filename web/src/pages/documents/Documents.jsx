import { useRef, useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import Pagination from '../../components/pagination/Pagination'
import SearchFilterBar from '../../components/form/Filter'
import { useRetour } from '../../components/retour/useRetour'
import { useDocument } from '../../hooks/useDocument'
import { useFormation } from '../../hooks/useFormation'
import { useListePaginee } from '../../hooks/useListePaginee'
import { getFileUrl } from '../../utils/files'
import { ACCEPT_SUPPORT } from '../../utils/texteRiche'
import './Documents.css'
import { formatDate } from '../../utils/time'
import { ETATS, ETAT_DEFAUT, filtreEtat, estActif } from '../../utils/etat'

// Extension en majuscules (ex. "PDF"), tirée du fichier (sinon du nom du document)
function getExtension(document) {
  const fileName = document.fichier || document.nom_document || ''
  const extension = fileName.split('.').pop()?.toUpperCase()
  return extension || 'Autre'
}

// Page Documents : regroupe les documents administratifs et les fichiers des supports de cours de
// toutes les formations, avec recherche, filtres, ajout de fichiers, désactivation et réactivation
// (Super Admin). Filtre « État » : documents actifs par défaut. Les deux sources sont réunies,
// filtrées et paginées par le serveur (GET /documents?page=&type=&extension=&recherche=&etat=).
function Documents({ user }) {
  const { error: erreurEnvoi, uploadDocuments, uploadSupport, deleteDoc, reactiverDoc } = useDocument()
  const { formations } = useFormation()
  const { confirmer, notifier } = useRetour()
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const [actionError, setActionError] = useState('')
  const canManage = user?.role === 'Super Admin'
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [extensionFilter, setExtensionFilter] = useState('Tous')
  const [supportFormation, setSupportFormation] = useState('')
  const [supportTitle, setSupportTitle] = useState('')
  // Références vers les <input type="file"> cachés, ouverts par les boutons d'ajout
  const supportInputRef = useRef(null)
  const inputRef = useRef(null)

  // Un changement de filtre revient à la page 1 (useListePaginee)
  const liste = useListePaginee('/documents', {
    recherche: query.trim(),
    type: typeFilter === 'Tous' ? '' : typeFilter,
    extension: extensionFilter === 'Tous' ? '' : extensionFilter,
    etat: ETATS[etat],
  })
  const { lignes: documentsPage, isLoading } = liste
  const error = liste.error || erreurEnvoi

  const extensions = ['Tous', 'PNG', 'PDF', 'DOCX']

  // Ajout d'un ou plusieurs documents administratifs
  async function handleUpload(event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const formData = new FormData()
    files.forEach((file) => formData.append('fichiers', file))

    const result = await uploadDocuments(formData)
    if (result) liste.recharger()
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
      liste.recharger()
      setSupportTitle('')
    }
  }

  function resetFilters() {
    setQuery('')
    setTypeFilter('Tous')
    setExtensionFilter('Tous')
    setEtat(ETAT_DEFAUT)
  }

  async function handleDelete(document) {
    const ok = await confirmer({
      titre: 'Désactiver le document',
      message: `« ${document.nom_document || document.fichier} » sera désactivé. Vous pourrez le réactiver avec le filtre « Désactivés ».`,
      bouton: 'Désactiver',
      danger: true,
    })
    if (!ok) return

    setActionError('')
    try {
      await deleteDoc(document.id_document, document.type_document)
      notifier('Document désactivé', { annuler: () => handleReactiver(document) })
      liste.recharger()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleReactiver(document) {
    setActionError('')
    try {
      await reactiverDoc(document.id_document, document.type_document)
      notifier('Document réactivé')
      liste.recharger()
    } catch (err) {
      setActionError(err.message)
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
          accept={ACCEPT_SUPPORT}
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
            filtreEtat(etat, setEtat),
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

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <div className="document-grid">
            {documentsPage.map((document) => {
              const fileName = document.nom_document || document.fichier || 'Document sans nom'
              const fileUrl = getFileUrl(document.fichier)

              return (
                // Un document et un support peuvent avoir le même id : la clé inclut le type
                <article className="document-card" key={`${document.type_document}-${document.id_document}`}>
                  <div className="document-icon"><Icon name="file" /></div>
                  <div className="document-main">
                    <div className="document-title">
                      <h2>{fileName}</h2>
                      {!estActif(document.etat) && <span className="etat-badge desactive">Désactivé</span>}
                    </div>
                    <p>{document.type_document || 'Autre'} · {getExtension(document)}</p>
                    <small>{document.prenom || ''} {document.nom || ''} · {formatDate(document.date_creation)}</small>
                  </div>
                  <div className="document-actions">
                    {fileUrl && (
                      <a className="document-action" href={fileUrl} target="_blank" rel="noreferrer">
                        Voir
                      </a>
                    )}
                    {canManage && (estActif(document.etat) ? (
                      <button className="document-action document-action-danger" type="button" onClick={() => handleDelete(document)}>
                        Désactiver
                      </button>
                    ) : (
                      <button className="document-action success-action" type="button" onClick={() => handleReactiver(document)}>
                        Réactiver
                      </button>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!isLoading && liste.total === 0 && (
          <div className="empty-state">
            <Icon name="file" />
            <h2>Aucun document trouvé</h2>
            <p>Essayez un autre mot-clé ou ajoutez un nouveau fichier.</p>
          </div>
        )}

        {!isLoading && liste.total > 0 && (
          <Pagination
            page={liste.page}
            pages={liste.pages}
            total={liste.total}
            limite={liste.limite}
            onChange={liste.setPage}
            libelle="document(s)"
          />
        )}
      </div>
    </section>
  )
}

export default Documents