import { useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import PaymentModal from '../../components/paiements/PaymentFormModal'
import SearchFilterBar from '../../components/form/Filter'
import Pagination from '../../components/pagination/Pagination'
import { useInscription } from '../../hooks/useInscription'
import { useDocument } from '../../hooks/useDocument'
import { useNotifEvent } from '../../hooks/useNotifEvent'
import { useListePaginee } from '../../hooks/useListePaginee'
import { fileUrl } from '../../utils/api'
import './Inscriptions.css'

// Libellés des filtres -> valeurs envoyées à l'API (?valide=, ?origine=)
const CODE_STATUT = { Validée: 'oui', 'En attente': 'non' }
const CODE_ORIGINE = { Accueil: 'accueil', 'En ligne': 'en_ligne' }

// Liste des inscriptions (paginée côté serveur) avec recherche et filtres (statut, origine).
// Actions : valider (avec premier paiement), générer la fiche, envoyer l'attestation, supprimer (Super Admin).
function Inscriptions({ user, onCreate, onDetail }) {
  const { validateInscription, deleteInscription } = useInscription()
  const { getFiche, envoyerAttestation, isLoading: isGenerating, error: documentError } = useDocument()
  const { confirmationInscription } = useNotifEvent()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  // Inscriptions faites par l'Accueil, ou en ligne depuis la vitrine mobile
  const [origine, setOrigine] = useState('Toutes')
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [inscriptionToValidate, setInscriptionToValidate] = useState(null)
  const canManage = user?.role === 'Super Admin'
  const liste = useListePaginee('/inscriptions', {
    recherche: search.trim(),
    valide: CODE_STATUT[status] || '',
    origine: CODE_ORIGINE[origine] || '',
  })
  const { lignes: inscriptions, isLoading, error } = liste

  function handleReset() {
    setSearch('')
    setStatus('Tous')
    setOrigine('Toutes')
  }

  // Exécute l'action d'un bouton du tableau ; les PDF générés s'ouvrent dans un nouvel onglet
   async function handleAction(action, inscription) {
    try {
      setActionError('')
      setActionMessage('')

      if (action === 'delete') {
        if (!window.confirm('Supprimer cette inscription ?')) return
        await deleteInscription(inscription.id_inscription)
        liste.recharger()
      } else if (action === 'generer') {
        const result = await getFiche(inscription.id_inscription)
        if (result?.fichier) {
          window.open(fileUrl(result.fichier), '_blank')
        }
      } else if (action === 'attestation') {
        const nom = `${inscription.prenom_etudiant} ${inscription.nom_etudiant}`
        if (!window.confirm(`Générer l'attestation de ${nom} et la lui envoyer (notification + e-mail) ?`)) return
        const result = await envoyerAttestation(inscription.id_inscription)
        if (result?.fichier) {
          window.open(fileUrl(result.fichier), '_blank')
          setActionMessage(`${nom} : ${result.message}`)
        }
      } else if (action === 'validate') {
        setInscriptionToValidate(inscription)
      }
    } catch (err) {
      setActionError(err.message)
    }
  }

  // Appelé par la fenêtre de paiement : valide l'inscription puis prévient l'étudiant
  // (notification + e-mail de confirmation)
  async function handleValidation(payment) {
    await validateInscription(inscriptionToValidate.id_inscription, payment)
    if (inscriptionToValidate.id_utilisateur_etudiant && inscriptionToValidate.email_etudiant) {
      await confirmationInscription({
        idDestinataire: inscriptionToValidate.id_utilisateur_etudiant,
        email: inscriptionToValidate.email_etudiant,
        contenuHtml: `<p>L'inscription de ${inscriptionToValidate.prenom_etudiant || ''} ${inscriptionToValidate.nom_etudiant || ''} à la formation ${inscriptionToValidate.nom_formation || ''} a été confirmée.</p>`,
      })
    }
    setInscriptionToValidate(null)
    liste.recharger()
  }

 const columns = [
    {
      key: 'student',
      header: 'Etudiant',
      render: (row) => (
        <>
          {row.prenom_etudiant} {row.nom_etudiant}
          {row.origine === 'en_ligne' && <span className="inscription-origine">En ligne</span>}
        </>
      ),
    },
    { key: 'nom_formation', header: 'Formation' },
    { key: 'date_inscription', header: 'Date' },
    {
      key: 'valide',
      header: 'Statut',
      render: (row) => (
        <>
          <span className={`student-status ${row.valide ? 'actif' : 'inactif'}`}>
            {row.valide ? 'Validée' : 'En attente'}
          </span>
          {!row.valide && row.montant_declare && (
            <small className="inscription-paiement-declare">
              Paiement déclaré : {Number(row.montant_declare).toLocaleString('fr-FR')} Ar
              {row.reference_declaree ? ` · réf. ${row.reference_declaree}` : ''}
            </small>
          )}
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="table-actions">
          <button type="button" className="row-action" onClick={() => onDetail(row.id_inscription)}>
            Détail
          </button>

          {/* Non validée : bouton Valider ; validée : fiche et attestation */}
          {!row.valide ? (
            <button type="button" className="row-action" onClick={() => handleAction('validate', row)}>
              Valider
            </button>
          ) : (
            <>
              <button
                type="button"
                className="row-action"
                onClick={() => handleAction('generer', row)}
                disabled={isGenerating}
              >
                {isGenerating ? 'Génération...' : 'Fiche'}
              </button>
              <button
                type="button"
                className="row-action"
                onClick={() => handleAction('attestation', row)}
                disabled={isGenerating}
              >
                Attestation
              </button>
            </>
          )
        }
            {canManage && (
            <>
             <button type="button" className="row-action danger-action" onClick={() => handleAction('delete', row)}>
            Supprimer
          </button>
            </>
          )}



        </div>
      ),
    },
  ]

  return (
    <section className="gestion-page">
      <Header user={user} activeItem="Inscriptions" />

      <div className="gestion-heading">
        <div>
          <h1>Inscriptions</h1>
          <p>{liste.total} inscription{liste.total !== 1 ? 's' : ''} correspondante{liste.total !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          + Nouvelle inscription
        </button>
      </div>

      <article className="gestion-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un étudiant ou une formation..."
          filters={[
            {
              name: 'status',
              label: 'Statut',
              value: status,
              onChange: setStatus,
              options: ['Tous', 'Validée', 'En attente'],
            },
            {
              name: 'origine',
              label: 'Origine',
              value: origine,
              onChange: setOrigine,
              options: ['Toutes', 'Accueil', 'En ligne'],
            },
          ]}
          onReset={handleReset}
        />

        {(error || actionError || documentError) && <p className="form-error">{error || actionError || documentError}</p>}
        {actionMessage && <p className="success-message">{actionMessage}</p>}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={inscriptions}
            rowKey="id_inscription"
            emptyMessage="Aucune inscription trouvée."
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}

        <Pagination
          page={liste.page}
          pages={liste.pages}
          total={liste.total}
          limite={liste.limite}
          onChange={liste.setPage}
          libelle="inscription(s)"
        />
      </article>

      {inscriptionToValidate && (
  <PaymentModal
    mode="validation"
    inscription={inscriptionToValidate}
    onClose={() => setInscriptionToValidate(null)}
    onSubmit={handleValidation}
  />
)}
    </section>
  )
}

export default Inscriptions