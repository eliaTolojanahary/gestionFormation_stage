import { useMemo, useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import PaymentModal from '../../components/paiements/PaymentFormModal'
import SearchFilterBar from '../../components/form/Filter'
import { useInscription } from '../../hooks/useInscription'
import { useDocument } from '../../hooks/useDocument'
import { useNotifEvent } from '../../hooks/useNotifEvent'
import './Inscriptions.css'



function Inscriptions({ user, onCreate, onDetail }) {
  const { inscriptions, isLoading, error, validateInscription, deleteInscription } = useInscription()
  const { getFiche, isLoading: isGenerating, error: documentError } = useDocument()
  const { confirmationInscription } = useNotifEvent()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  const [actionError, setActionError] = useState('')
  const [inscriptionToValidate, setInscriptionToValidate] = useState(null)

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return inscriptions.filter((inscription) => {
      const fullText = [
        inscription.prenom_etudiant,
        inscription.nom_etudiant,
        inscription.nom_formation,
      ].filter(Boolean).join(' ').toLowerCase()

      const matchesSearch = fullText.includes(normalizedSearch)
      const matchesStatus =
        status === 'Tous' ||
        (status === 'Validée' && inscription.valide) ||
        (status === 'En attente' && !inscription.valide)

      return matchesSearch && matchesStatus
    })
  }, [inscriptions, search, status])

  function handleReset() {
    setSearch('')
    setStatus('Tous')
  }

   async function handleAction(action, inscription) {
    try {
      setActionError('')

      if (action === 'delete') {
        if (!window.confirm('Supprimer cette inscription ?')) return
        await deleteInscription(inscription.id_inscription)
      } else if (action === 'generer') {
        console.log(inscription.id_inscription)
        const result = await getFiche(inscription.id_inscription)
        if (result?.fichier) {
          window.open(`${import.meta.env.VITE_URL_BASE}/${result.fichier}`, '_blank')
        }
      } else if (action === 'validate') {
        setInscriptionToValidate(inscription)
      }
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleValidation(payment) {
    await validateInscription(inscriptionToValidate.id_inscription, payment)
    console.log(inscriptionToValidate.id_utilisateur_etudiant)
    console.log( inscriptionToValidate.email_etudiant)
    if (inscriptionToValidate.id_utilisateur_etudiant && inscriptionToValidate.email_etudiant) {
      await confirmationInscription({
        idDestinataire: inscriptionToValidate.id_utilisateur_etudiant,
        email: inscriptionToValidate.email_etudiant,
        contenuHtml: `<p>L'inscription de ${inscriptionToValidate.prenom_etudiant || ''} ${inscriptionToValidate.nom_etudiant || ''} à la formation ${inscriptionToValidate.nom_formation || ''} a été confirmée.</p>`,
      })
    }
    setInscriptionToValidate(null)
  }

 const columns = [
    {
      key: 'student',
      header: 'Etudiant',
      render: (row) => `${row.prenom_etudiant} ${row.nom_etudiant}`,
    },
    { key: 'nom_formation', header: 'Formation' },
    { key: 'date_inscription', header: 'Date' },
    {
      key: 'valide',
      header: 'Statut',
      render: (row) => (
        <span className={`student-status ${row.valide ? 'actif' : 'inactif'}`}>
          {row.valide ? 'Validée' : 'En attente'}
        </span>
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

          {!row.valide ? (
            <button type="button" className="row-action" onClick={() => handleAction('validate', row)}>
              Valider
            </button>
          ) : (
            <button
            type="button"
            className="row-action"
            onClick={() => handleAction('generer', row)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Génération...' : 'Générer'}
          </button>
          )
        }

          

          <button type="button" className="row-action danger-action" onClick={() => handleAction('delete', row)}>
            Supprimer
          </button>
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
          <p>{inscriptions.length} inscriptions enregistrées</p>
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
          ]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filtered}
            rowKey="id_inscription"
            emptyMessage="Aucune inscription trouvée."
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}
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