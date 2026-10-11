import { useMemo, useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import Modal from '../../components/modal/Modal'
import { usePaiement, STATUTS_PAIEMENT } from '../../hooks/usePaiement'
import { useDocument } from '../../hooks/useDocument'
import { useNotifEvent } from '../../hooks/useNotifEvent'
import { fileUrl } from '../../utils/api'
import { formatDate } from '../../utils/time'
import './Paiements.css'

const TOUS = 'Tous'

// Ex. 150000 -> "150 000 MGA"
function formatMontant(montant) {
  return `${Number(montant).toLocaleString('fr-FR')} MGA`
}

// Badge coloré du statut (classe CSS selon en_attente / valide / refuse)
function StatutPaiement({ statut }) {
  return (
    <span className={`paiement-statut paiement-statut-${statut}`}>
      {STATUTS_PAIEMENT[statut] || statut}
    </span>
  )
}

// Page Paiements : l'Accueil y valide ou refuse les paiements envoyés par les étudiants
// depuis le mobile, et génère les factures des paiements validés.
function Paiements({ user }) {
  const { paiements, isLoading, error, validerPaiement, refuserPaiement } = usePaiement()
  const { getFacture, isLoading: isGenerating, error: documentError } = useDocument()
  const { facturePaiement } = useNotifEvent()
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [actionError, setActionError] = useState('')
  const [enCours, setEnCours] = useState(null) // id du paiement en cours de validation/refus
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState(TOUS)
  const [statutFilter, setStatutFilter] = useState(TOUS)

  const nbEnAttente = paiements.filter((p) => p.statut === 'en_attente').length

  // Valide ou refuse un paiement en attente, après confirmation
  async function handleStatut(payment, action) {
    const confirmation = action === 'valider'
      ? `Valider le paiement de ${formatMontant(payment.montant)} de ${payment.etudiant_prenom} ${payment.etudiant_nom} ?`
      : `Refuser ce paiement ? L'étudiant devra payer à nouveau.`
    if (!window.confirm(confirmation)) return

    setActionError('')
    setEnCours(payment.id_paiement)
    try {
      if (action === 'valider') await validerPaiement(payment.id_paiement)
      else await refuserPaiement(payment.id_paiement)
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setEnCours(null)
    }
  }

  // Génère la facture, l'ouvre, puis l'envoie à l'étudiant (e-mail + notification)
  async function handleGenerateInvoice(payment) {
    setActionError('')
    try {
      const result = await getFacture(payment.id_paiement)
      if (!result?.fichier) return

      const url = fileUrl(result.fichier)
      window.open(url, '_blank')

      if (!payment.id_utilisateur_etudiant || !payment.email_etudiant) return

      // Télécharge le PDF généré pour le renvoyer en pièce jointe de l'e-mail
      const response = await fetch(url)
      if (!response.ok) throw new Error('Impossible de récupérer la facture générée.')

      const blob = await response.blob()
      const fileName = result.fichier.split('/').pop() || `facture_${payment.id_paiement}.pdf`
      const file = new File([blob], fileName, { type: blob.type || 'application/pdf' })

      await facturePaiement({
        idDestinataire: payment.id_utilisateur_etudiant,
        email: payment.email_etudiant,
        contenuHtml: `<p>Votre facture concernant le paiement de ${formatMontant(payment.montant)} est disponible en pièce jointe.</p>`,
        fichier: file,
        nomFichier: fileName,
      })
    } catch (err) {
      setActionError(err.message || 'Erreur lors de la génération de la facture.')
    }
  }

  // Filtres : recherche (étudiant ou formation), mode de paiement et statut
  const filteredPaiements = useMemo(() => {
    const searchLower = search.toLowerCase().trim()

    return paiements.filter((paiement) => {
      const studentName = `${paiement.etudiant_prenom} ${paiement.etudiant_nom}`.toLowerCase()
      const formation = paiement.formation_nom?.toLowerCase() || ''

      const matchesSearch = !searchLower || studentName.includes(searchLower) || formation.includes(searchLower)
      const matchesMode = modeFilter === TOUS || paiement.mode_paiement === modeFilter
      const matchesStatut = statutFilter === TOUS || STATUTS_PAIEMENT[paiement.statut] === statutFilter

      return matchesSearch && matchesMode && matchesStatut
    })
  }, [paiements, search, modeFilter, statutFilter])

  function resetFilters() {
    setSearch('')
    setModeFilter(TOUS)
    setStatutFilter(TOUS)
  }

  const columns = [
    { key: 'id_paiement', header: 'N°' },
    {
      key: 'student',
      header: 'Étudiant',
      render: (row) => `${row.etudiant_prenom} ${row.etudiant_nom}`,
    },
    { key: 'formation_nom', header: 'Formation' },
    {
      key: 'montant',
      header: 'Montant',
      render: (row) => formatMontant(row.montant),
    },
    { key: 'mode_paiement', header: 'Mode' },
    {
      key: 'date_paiement',
      header: 'Date',
      render: (row) => formatDate(row.date_paiement),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (row) => <StatutPaiement statut={row.statut} />,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="table-actions">
          <button type="button" className="row-action" onClick={() => setSelectedPayment(row)}>
            Détail
          </button>

          {row.statut === 'en_attente' && (
            <>
              <button
                type="button"
                className="row-action row-action-valider"
                onClick={() => handleStatut(row, 'valider')}
                disabled={enCours === row.id_paiement}
              >
                Valider
              </button>
              <button
                type="button"
                className="row-action row-action-refuser"
                onClick={() => handleStatut(row, 'refuser')}
                disabled={enCours === row.id_paiement}
              >
                Refuser
              </button>
            </>
          )}

          {row.statut === 'valide' && (
            <button
              type="button"
              className="row-action"
              onClick={() => handleGenerateInvoice(row)}
              disabled={isGenerating}
            >
              {isGenerating ? 'Génération...' : 'Facture'}
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <section className="gestion-page">
      <Header user={user} activeItem="Paiements" />

      <div className="gestion-heading">
        <div>
          <h1>Paiements</h1>
          <p>
            {filteredPaiements.length} paiement{filteredPaiements.length !== 1 ? 's' : ''} affiché
            {filteredPaiements.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Bandeau d'alerte : un clic filtre la liste sur les paiements en attente */}
      {nbEnAttente > 0 && (
        <button
          type="button"
          className="paiements-alerte"
          onClick={() => setStatutFilter(STATUTS_PAIEMENT.en_attente)}
        >
          {nbEnAttente} paiement{nbEnAttente > 1 ? 's' : ''} envoyé{nbEnAttente > 1 ? 's' : ''} depuis
          l'application mobile {nbEnAttente > 1 ? 'attendent' : 'attend'} votre validation.
        </button>
      )}

      <article className="gestion-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un étudiant ou une formation..."
          filters={[
            {
              name: 'statut',
              label: 'Statut',
              value: statutFilter,
              onChange: setStatutFilter,
              options: [TOUS, ...Object.values(STATUTS_PAIEMENT)],
            },
            {
              name: 'mode_paiement',
              label: 'Mode de paiement',
              value: modeFilter,
              onChange: setModeFilter,
              options: [TOUS, 'Cash', 'Virement bancaire'],
            },
          ]}
          onReset={resetFilters}
        />

        {(error || actionError || documentError) && (
          <p className="form-error">{error || actionError || documentError}</p>
        )}

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
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
            <p><strong>Étudiant :</strong> {selectedPayment.etudiant_prenom} {selectedPayment.etudiant_nom}</p>
            <p><strong>Formation :</strong> {selectedPayment.formation_nom}</p>
            <p><strong>Échéance :</strong> #{selectedPayment.id_echeance}</p>
            <p><strong>Montant :</strong> {formatMontant(selectedPayment.montant)}</p>
            <p><strong>Mode :</strong> {selectedPayment.mode_paiement}</p>
            <p><strong>Référence :</strong> {selectedPayment.reference_virement || 'Aucune'}</p>
            <p><strong>Date :</strong> {formatDate(selectedPayment.date_paiement)}</p>
            <p><strong>Statut :</strong> <StatutPaiement statut={selectedPayment.statut} /></p>
          </div>
        </Modal>
      )}
    </section>
  )
}

export default Paiements
