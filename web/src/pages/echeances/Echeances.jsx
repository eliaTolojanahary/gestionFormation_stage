import { useEffect, useMemo, useRef, useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import Modal from '../../components/modal/Modal'
import SearchFilterBar from '../../components/form/Filter'
import PaymentFormModal from '../../components/paiements/PaymentFormModal'

import { useEcheance } from '../../hooks/useEcheance'
import { usePaiement } from '../../hooks/usePaiement'
import { useNotifEvent } from '../../hooks/useNotifEvent'

import '../formations/GestionPages.css'

function Echeances({ user }) {
  const { echeances, isLoading, error } = useEcheance()
  const { createPaiement } = usePaiement()
  const { relancePaiement } = useNotifEvent()
  const notifiedEcheances = useRef(new Set())

  const [selectedEcheance, setSelectedEcheance] = useState(null)
  const [paymentEcheance, setPaymentEcheance] = useState(null)
  const [actionError, setActionError] = useState('')

  // Filtres
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')

  useEffect(() => {
    echeances
      .filter((echeance) => echeance.a_relancer_bientot && echeance.id_utilisateur_etudiant && echeance.email_etudiant && !notifiedEcheances.current.has(echeance.id_echeance))
      .forEach((echeance) => {
        notifiedEcheances.current.add(echeance.id_echeance)
        relancePaiement({
          idDestinataire: echeance.id_utilisateur_etudiant,
          email: echeance.email_etudiant,
          contenuHtml: `<p>Le paiement de ${echeance.etudiant_prenom || ''} ${echeance.etudiant_nom || ''} pour la formation ${echeance.formation_nom || ''} est à relancer bientôt.</p>`,
        }).catch(() => {})
      })
  }, [echeances, user, relancePaiement])

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

      const displayStatus = echeance.a_relancer_bientot
        ? 'A relancer bientôt'
        : echeance.statut_paiement
      const matchesStatus =
        statusFilter === 'Tous' || displayStatus === statusFilter

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
        <span
          className={`student-status ${
            row.statut_paiement === 'ROUGE'
              ? 'inactif'
              : 'actif'
          }`}
        >
          {row.a_relancer_bientot ? 'A relancer bientôt' : row.statut_paiement}
        </span>
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

          {Number(row.reste_a_payer) > 0 && (
            <button
              type="button"
              className="row-action"
              onClick={() => setPaymentEcheance(row)}
            >
              Payer
            </button>
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
              options: [
                'Tous',
                'VERT',
                'ORANGE',
                'ROUGE',
                'A relancer bientôt',
              ],
            },
          ]}
          onReset={resetFilters}
        />
        {(error || actionError) && (
          <p className="form-error">
            {error || actionError}
          </p>
        )}
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