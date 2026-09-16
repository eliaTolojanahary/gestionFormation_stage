import { useMemo, useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import PaymentFormModal from '../../components/paiements/PaymentFormModal'
import Modal from '../../components/modal/Modal'
import { usePaiement } from '../../hooks/usePaiement'
import { useDocument } from '../../hooks/useDocument'
import { useNotifEvent } from '../../hooks/useNotifEvent'

import '../formations/GestionPages.css'

function Paiements({ user }) {
  const { paiements, isLoading, error, createPaiement } = usePaiement()
  const { getFacture, isLoading: isGenerating, error: documentError } = useDocument()
  const { facturePaiement } = useNotifEvent()
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedEcheance, setSelectedEcheance] = useState(null)
  const [actionError, setActionError] = useState('')
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('Tous')

  async function handlePayment(payload) {
    try {
      setActionError('')

      await createPaiement(payload)

      setSelectedEcheance(null)
    } catch (requestError) {
      setActionError(requestError.message)
      throw requestError
    }
  }

  async function handleGenerateInvoice(payment) {
    const result = await getFacture(payment.id_paiement)

    if (result?.fichier) {
      const fileUrl = `${import.meta.env.VITE_URL_BASE}/${result.fichier.replace(/^\//, '')}`
      window.open(fileUrl, '_blank')

      if (payment.id_utilisateur_etudiant && payment.email_etudiant) {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error('Impossible de récupérer la facture générée.')

        const blob = await response.blob()
        const fileName = result.fichier.split('/').pop() || `facture_${payment.id_paiement}.pdf`
        const file = new File([blob], fileName, { type: blob.type || 'application/pdf' })

        await facturePaiement({
          idDestinataire: payment.id_utilisateur_etudiant,
          email: payment.email_etudiant,
          contenuHtml: `<p>Votre facture concernant le paiement de ${Number(payment.montant).toLocaleString('fr-FR')} MGA est disponible en pièce jointe.</p>`,
          fichier: file,
          nomFichier: fileName,
        })
      }
    }
  }
  const filteredPaiements = useMemo(() => {
    const searchLower = search.toLowerCase().trim()

    return paiements.filter((paiement) => {
      const studentName =
        `${paiement.etudiant_prenom} ${paiement.etudiant_nom}`.toLowerCase()

      const formation =
        paiement.formation_nom?.toLowerCase() || ''

      const matchesSearch =
        !searchLower ||
        studentName.includes(searchLower) ||
        formation.includes(searchLower)

      const matchesMode =
        modeFilter === 'Tous' ||
        paiement.mode_paiement === modeFilter

      return matchesSearch && matchesMode
    })
  }, [paiements, search, modeFilter])

  // Réinitialiser les filtres
  function resetFilters() {
    setSearch('')
    setModeFilter('Tous')
  }

  const columns = [
    {
      key: 'id_paiement',
      header: 'N°',
    },

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
      key: 'montant',
      header: 'Montant',
      render: (row) =>
        `${Number(row.montant).toLocaleString('fr-FR')} MGA`,
    },

    {
      key: 'mode_paiement',
      header: 'Mode',
    },

    {
      key: 'date_paiement',
      header: 'Date',
    },

    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="table-actions">
          <button
            type="button"
            className="row-action"
            onClick={() => setSelectedPayment(row)}
          >
            Détail
          </button>
          <button
            type="button"
            className="row-action"
            onClick={() => handleGenerateInvoice(row)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Génération...' : 'Générer'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="gestion-page">

      <Header
        user={user}
        activeItem="Paiements"
      />

      <div className="gestion-heading">
        <div>
          <h1>Paiements</h1>

          <p>
            {filteredPaiements.length} paiement
            {filteredPaiements.length !== 1 ? 's' : ''} affiché
            {filteredPaiements.length !== 1 ? 's' : ''}
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
              name: 'mode_paiement',
              label: 'Mode de paiement',
              value: modeFilter,
              onChange: setModeFilter,
              options: [
                'Tous',
                'Cash',
                'Virement bancaire',
              ],
            },
          ]}
          onReset={resetFilters}
        />
        {(error || actionError || documentError) && (
          <p className="form-error">
            {error || actionError || documentError}
          </p>
        )}
        {isLoading ? (
          <p className="gestion-loading">
            Chargement...
          </p>
        ) : (
          <Tableau
            columns={columns}
            rows={filteredPaiements}
            rowKey="id_paiement"
            emptyMessage="Aucun paiement trouvé."
            wrapperClassName="gestion-table-wrap"
            className="gestion-table"
          />
        )}

      </article>
      {selectedPayment && (
        <Modal
          eyebrow="Paiement"
          title={`Paiement #${selectedPayment.id_paiement}`}
          titleId="payment-detail-title"
          onClose={() => setSelectedPayment(null)}
        >
          <div className="detail-list">

            <p>
              <strong>Étudiant :</strong>{' '}
              {selectedPayment.etudiant_prenom}{' '}
              {selectedPayment.etudiant_nom}
            </p>

            <p>
              <strong>Échéance :</strong>{' '}
              #{selectedPayment.id_echeance}
            </p>

            <p>
              <strong>Montant :</strong>{' '}
              {Number(selectedPayment.montant).toLocaleString('fr-FR')} MGA
            </p>

            <p>
              <strong>Mode :</strong>{' '}
              {selectedPayment.mode_paiement}
            </p>

            <p>
              <strong>Référence :</strong>{' '}
              {selectedPayment.reference_virement || 'Aucune'}
            </p>

            <p>
              <strong>Date :</strong>{' '}
              {selectedPayment.date_paiement}
            </p>

          </div>
        </Modal>
      )}

      {selectedEcheance && (
        <PaymentFormModal
          echeance={selectedEcheance}
          onClose={() => setSelectedEcheance(null)}
          onSubmit={handlePayment}
        />
      )}

    </section>
  )
}

export default Paiements