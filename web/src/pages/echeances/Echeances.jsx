import { useMemo, useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import Modal from '../../components/modal/Modal'
import SearchFilterBar from '../../components/form/Filter'
import PaymentFormModal from '../../components/paiements/PaymentFormModal'

import { useEcheance } from '../../hooks/useEcheance'
import { usePaiement } from '../../hooks/usePaiement'
import { formatDate } from '../../utils/time'
import { getPaymentStatus } from '../../utils/dashboardUtils'

import './Echeances.css'

// VERT : payée ou encore loin · JAUNE : J-2, J-1, J (l'Accueil est notifié) · ROUGE : en retard
const LIBELLE_STATUT = (statut) => getPaymentStatus(statut).label
const FILTRES_STATUT = ['Tous', ...['VERT', 'JAUNE', 'ROUGE'].map(LIBELLE_STATUT)]

// Page Échéances : suivi de toutes les échéances avec leur statut de couleur,
// paiement au guichet (bouton Payer) et rappel manuel à l'étudiant (bouton Rappeler).
function Echeances({ user }) {
  const { echeances, isLoading, error, rappelerEcheance } = useEcheance()
  const { createPaiement } = usePaiement()

  const [selectedEcheance, setSelectedEcheance] = useState(null)
  const [paymentEcheance, setPaymentEcheance] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [rappelEnCours, setRappelEnCours] = useState(null)

  // Filtres
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  // L'Accueil est prévenu automatiquement à J-2 (notification « doit être rappelé ») ;
  // c'est lui qui décide d'envoyer le rappel à l'étudiant avec ce bouton.
  async function handleRappel(echeance) {
    const nom = `${echeance.etudiant_prenom} ${echeance.etudiant_nom}`
    if (!window.confirm(`Envoyer un rappel de paiement à ${nom} (notification + e-mail) ?`)) return

    setActionError('')
    setActionMessage('')
    setRappelEnCours(echeance.id_echeance)
    try {
      const result = await rappelerEcheance(echeance.id_echeance)
      setActionMessage(`${nom} : ${result.message}`)
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setRappelEnCours(null)
    }
  }

  // Paiement saisi par le personnel ; l'erreur est relancée pour s'afficher dans la fenêtre
  async function handlePayment(payload) {
    try {
      setActionError('')

      await createPaiement(payload)

      setPaymentEcheance(null)
    } catch (requestError) {
      setActionError(requestError.message)
      throw requestError
    }
  }

  // Filtrer les échéances
  const filteredEcheances = useMemo(() => {
    const searchLower = search.toLowerCase().trim()

    return echeances.filter((echeance) => {
      const studentName =
        `${echeance.etudiant_prenom} ${echeance.etudiant_nom}`.toLowerCase()

      const formation =
        echeance.formation_nom?.toLowerCase() || ''

      const matchesSearch =
        !searchLower ||
        studentName.includes(searchLower) ||
        formation.includes(searchLower)

      const matchesStatus =
        statusFilter === 'Tous' || LIBELLE_STATUT(echeance.statut_paiement) === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [echeances, search, statusFilter])

  // Réinitialiser les filtres
  function resetFilters() {
    setSearch('')
    setStatusFilter('Tous')
  }

  const columns = [
    {
      key: 'student',
      header: 'Étudiant',
      render: (row) =>
        `${row.etudiant_prenom} ${row.etudiant_nom}`,
    },

    {
      key: 'formation_nom',
      header: 'Formation',
    },

    {
      key: 'date_echeance',
      header: 'Échéance',
    },

    {
      key: 'montant_prevu',
      header: 'Prévu',
      render: (row) =>
        `${Number(row.montant_prevu).toLocaleString('fr-FR')} MGA`,
    },

    {
      key: 'reste_a_payer',
      header: 'Reste',
      render: (row) =>
        `${Number(row.reste_a_payer).toLocaleString('fr-FR')} MGA`,
    },

    {
      key: 'statut_paiement',
      header: 'Statut',
      render: (row) => (
        <>
          <span className={`student-status echeance-statut-${String(row.statut_paiement).toLowerCase()}`}>
            {LIBELLE_STATUT(row.statut_paiement)}
          </span>
          {Number(row.montant_en_attente) > 0 && (
            <small className="echeance-en-attente">Payé, à valider</small>
          )}
        </>
      ),
    },

    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="table-actions">

          <button
            type="button"
            className="row-action"
            onClick={() => setSelectedEcheance(row)}
          >
            Détail
          </button>

          {/* Payer / Rappeler seulement s'il reste à payer et qu'aucun paiement n'attend déjà validation */}
          {Number(row.reste_a_payer) > 0 && Number(row.montant_en_attente) <= 0 && (
            <>
              <button
                type="button"
                className="row-action"
                onClick={() => setPaymentEcheance(row)}
              >
                Payer
              </button>
              <button
                type="button"
                className={`row-action ${row.statut_paiement !== 'VERT' ? 'danger-action' : ''}`}
                onClick={() => handleRappel(row)}
                disabled={rappelEnCours === row.id_echeance}
                title={row.date_dernier_rappel ? `Dernier rappel : ${formatDate(row.date_dernier_rappel)}` : 'Aucun rappel envoyé'}
              >
                {rappelEnCours === row.id_echeance ? 'Envoi...' : 'Rappeler'}
              </button>
            </>
          )}

        </div>
      ),
    },
  ]

  return (
    <section className="gestion-page">

      <Header
        user={user}
        activeItem="Échéances"
      />

      <div className="gestion-heading">
        <div>
          <h1>Échéances</h1>

          <p>
            {filteredEcheances.length} échéance
            {filteredEcheances.length !== 1 ? 's' : ''} à suivre
          </p>
        </div>
      </div>

      <article className="gestion-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un étudiant ou une formation..."
          filters={[
            {
              name: 'statut_paiement',
              label: 'Statut',
              value: statusFilter,
              onChange: setStatusFilter,
              options: FILTRES_STATUT,
            },
          ]}
          onReset={resetFilters}
        />
        {(error || actionError) && (
          <p className="form-error">
            {error || actionError}
          </p>
        )}
        {actionMessage && <p className="success-message">{actionMessage}</p>}
        {isLoading ? (
          <p className="gestion-loading">
            Chargement...
          </p>
        ) : (
          <Tableau
            columns={columns}
            rows={filteredEcheances}
            rowKey="id_echeance"
            emptyMessage="Aucune échéance trouvée."
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}

      </article>
      {selectedEcheance && (
        <Modal
          eyebrow="Échéance"
          title={`Échéance #${selectedEcheance.id_echeance}`}
          titleId="echeance-detail-title"
          onClose={() => setSelectedEcheance(null)}
        >
          <div className="detail-list">

            <p>
              <strong>Étudiant :</strong>{' '}
              {selectedEcheance.etudiant_prenom}{' '}
              {selectedEcheance.etudiant_nom}
            </p>

            <p>
              <strong>Formation :</strong>{' '}
              {selectedEcheance.formation_nom}
            </p>

            <p>
              <strong>Date :</strong>{' '}
              {selectedEcheance.date_echeance}
            </p>

            <p>
              <strong>Montant prévu :</strong>{' '}
              {Number(
                selectedEcheance.montant_prevu
              ).toLocaleString('fr-FR')} MGA
            </p>

            <p>
              <strong>Montant payé :</strong>{' '}
              {Number(
                selectedEcheance.montant_paye
              ).toLocaleString('fr-FR')} MGA
            </p>

            <p>
              <strong>Reste à payer :</strong>{' '}
              {Number(
                selectedEcheance.reste_a_payer
              ).toLocaleString('fr-FR')} MGA
            </p>

            {Number(selectedEcheance.montant_en_attente) > 0 && (
              <p>
                <strong>Envoyé par l'étudiant, à valider :</strong>{' '}
                {Number(selectedEcheance.montant_en_attente).toLocaleString('fr-FR')} MGA
                {' '}(page Paiements)
              </p>
            )}

            <p>
              <strong>Dernier rappel :</strong>{' '}
              {selectedEcheance.date_dernier_rappel ? formatDate(selectedEcheance.date_dernier_rappel) : 'Aucun'}
            </p>

          </div>

          <div className="modal-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedEcheance(null)}
            >
              Fermer
            </button>

            {Number(selectedEcheance.reste_a_payer) > 0 && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setPaymentEcheance(selectedEcheance)
                  setSelectedEcheance(null)
                }}
              >
                Payer
              </button>
            )}

          </div>
        </Modal>
      )}
      {paymentEcheance && (
        <PaymentFormModal
          echeance={paymentEcheance}
          onClose={() => setPaymentEcheance(null)}
          onSubmit={handlePayment}
        />
      )}

    </section>
  )
}

export default Echeances