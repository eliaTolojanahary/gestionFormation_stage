import { useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import Modal from '../../components/modal/Modal'
import SearchFilterBar from '../../components/form/Filter'
import PaymentFormModal from '../../components/paiements/PaymentFormModal'
import Pagination from '../../components/pagination/Pagination'

import { useEcheance } from '../../hooks/useEcheance'
import { usePaiement } from '../../hooks/usePaiement'
import { useListePaginee } from '../../hooks/useListePaginee'
import { formatDate } from '../../utils/time'
import { getPaymentStatus } from '../../utils/dashboardUtils'

import './Echeances.css'

// VERT : payée ou encore loin · JAUNE : J-2, J-1, J (l'Accueil est notifié) · ROUGE : en retard
const LIBELLE_STATUT = (statut) => getPaymentStatus(statut).label
const FILTRES_STATUT = ['Tous', ...['VERT', 'JAUNE', 'ROUGE'].map(LIBELLE_STATUT)]
// Libellé du filtre -> couleur envoyée à l'API (?statut=VERT|JAUNE|ROUGE)
const CODE_STATUT = Object.fromEntries(['VERT', 'JAUNE', 'ROUGE'].map((code) => [LIBELLE_STATUT(code), code]))

// Page Échéances : suivi de toutes les échéances avec leur statut de couleur,
// paiement au guichet (bouton Payer) et rappel manuel à l'étudiant (bouton Rappeler).
// Liste paginée côté serveur : recherche et couleur sont envoyées à GET /echeances.
function Echeances({ user }) {
  const { rappelerEcheance } = useEcheance()
  const { createPaiement } = usePaiement()

  const [selectedEcheance, setSelectedEcheance] = useState(null)
  const [paymentEcheance, setPaymentEcheance] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [rappelEnCours, setRappelEnCours] = useState(null)

  // Filtres
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  const liste = useListePaginee('/echeances', {
    recherche: search.trim(),
    statut: CODE_STATUT[statusFilter] || '',
  })
  const { lignes: echeances, isLoading, error } = liste

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
      // Mise à jour locale de la date du dernier rappel, sans recharger la page
      const maintenant = new Date().toISOString()
      liste.setLignes((lignes) =>
        lignes.map((e) => (e.id_echeance === echeance.id_echeance ? { ...e, date_dernier_rappel: maintenant } : e))
      )
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
      liste.recharger() // montant payé, reste et couleur recalculés par le serveur
    } catch (requestError) {
      setActionError(requestError.message)
      throw requestError
    }
  }

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
            {liste.total} échéance{liste.total !== 1 ? 's' : ''} à suivre
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
            rows={echeances}
            rowKey="id_echeance"
            emptyMessage="Aucune échéance trouvée."
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
          libelle="échéance(s)"
        />

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