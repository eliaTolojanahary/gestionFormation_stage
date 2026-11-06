import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import Modal from '../../components/modal/Modal'
import { useRetour } from '../../components/retour/useRetour'
import SearchFilterBar from '../../components/form/Filter'
import PaymentFormModal from '../../components/paiements/PaymentFormModal'
import Pagination from '../../components/pagination/Pagination'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import BarreSelection from '../../components/tableau/BarreSelection'
import FiltreDates from '../../components/dashboard/FiltreDates'

import { useEcheance } from '../../hooks/useEcheance'
import { usePaiement } from '../../hooks/usePaiement'
import { useListePaginee } from '../../hooks/useListePaginee'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { formatDate } from '../../utils/time'
import { getPaymentStatus } from '../../utils/dashboardUtils'

import { formatMontant } from '../../utils/format'
import { PERIODE_TOUT, periodeInvalide } from '../../utils/periodes'
import BadgeEtat from '../../components/etat/BadgeEtat'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'
import './Echeances.css'

// VERT : payée ou encore loin · JAUNE : J-2, J-1, J (l'Accueil est notifié) · ROUGE : en retard
const LIBELLE_STATUT = (statut) => getPaymentStatus(statut).label
const FILTRES_STATUT = ['Tous', ...['VERT', 'JAUNE', 'ROUGE'].map(LIBELLE_STATUT)]
// Libellé du filtre -> couleur envoyée à l'API (?statut=VERT|JAUNE|ROUGE)
const CODE_STATUT = Object.fromEntries(['VERT', 'JAUNE', 'ROUGE'].map((code) => [LIBELLE_STATUT(code), code]))

// Une échéance peut être payée ou rappelée s'il reste à payer et qu'aucun paiement n'attend déjà validation
const peutRappeler = (e) =>
  Number(e.echeance_active) > 0 && Number(e.reste_a_payer) > 0 && Number(e.montant_en_attente) <= 0

// Page Échéances : suivi de toutes les échéances avec leur statut de couleur,
// paiement au guichet (bouton Payer) et rappel manuel à l'étudiant (bouton Rappeler).
// Liste paginée côté serveur : recherche, couleur et période (date d'échéance, ex. « en retard du X au Y »)
// sont envoyées à GET /echeances. La période peut venir du tableau de bord (?debut=&fin= dans l'adresse).
// Filtre « État » : échéances actives par défaut ; le Super Admin désactive / réactive.
// Sélection multiple (clic sur les lignes) : rappeler, désactiver ou réactiver en une fois.
function Echeances({ user }) {
  const { rappelerEcheance, desactiverEcheance, reactiverEcheance } = useEcheance()
  const { createPaiement } = usePaiement()
  const { confirmer, notifier } = useRetour()
  const canManage = user?.role === 'Super Admin'

  const [selectedEcheance, setSelectedEcheance] = useState(null)
  const [paymentEcheance, setPaymentEcheance] = useState(null)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [rappelEnCours, setRappelEnCours] = useState(null)

  // Filtres
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const [searchParams, setSearchParams] = useSearchParams()
  const [periode, setPeriode] = useState(() => ({
    debut: searchParams.get('debut') || '',
    fin: searchParams.get('fin') || '',
  }))
  // Une période impossible (début après la fin) est affichée mais pas envoyée à l'API
  const periodeAppliquee = periodeInvalide(periode) ? PERIODE_TOUT : periode

  const liste = useListePaginee('/echeances', {
    recherche: search.trim(),
    statut: CODE_STATUT[statusFilter] || '',
    etat: ETATS[etat],
    debut: periodeAppliquee.debut,
    fin: periodeAppliquee.fin,
  })

  // La période est gardée dans l'adresse (lien partageable, retour arrière)
  function changerPeriode(nouvelle) {
    setPeriode(nouvelle)
    const params = {}
    if (nouvelle.debut) params.debut = nouvelle.debut
    if (nouvelle.fin) params.fin = nouvelle.fin
    setSearchParams(params, { replace: true })
  }
  const { lignes: echeances, isLoading, error } = liste

  const selection = useSelection(echeances, 'id_echeance')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const aRappeler = selection.selection.filter(peutRappeler)
  const actives = selection.selection.filter((e) => Number(e.echeance_active))
  const inactives = selection.selection.filter((e) => !Number(e.echeance_active))

  const actionsGroupees = [
    {
      libelle: 'Rappeler',
      nombre: aRappeler.length,
      onClick: () => groupe.lancer({
        lignes: aRappeler,
        confirmation: {
          titre: 'Envoyer les rappels',
          message: `${aRappeler.length} rappel(s) de paiement seront envoyés par notification et par e-mail.`,
          bouton: 'Envoyer les rappels',
        },
        action: (e) => rappelerEcheance(e.id_echeance),
        succes: (n) => `${n} rappel(s) envoyé(s)`,
      }),
    },
    canManage && {
      libelle: 'Désactiver',
      danger: true,
      nombre: actives.length,
      onClick: () => groupe.lancer({
        lignes: actives,
        confirmation: {
          titre: 'Désactiver les échéances',
          message: `${actives.length} échéance(s) seront désactivées. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (e) => desactiverEcheance(e.id_echeance),
        succes: (n) => `${n} échéance(s) désactivée(s)`,
      }),
    },
    canManage && {
      libelle: 'Réactiver',
      succes: true,
      nombre: inactives.length,
      onClick: () => groupe.lancer({
        lignes: inactives,
        action: (e) => reactiverEcheance(e.id_echeance),
        succes: (n) => `${n} échéance(s) réactivée(s)`,
      }),
    },
  ]

  // L'Accueil est prévenu automatiquement à J-2 (notification « doit être rappelé ») ;
  // c'est lui qui décide d'envoyer le rappel à l'étudiant avec ce bouton.
  async function handleRappel(echeance) {
    const nom = `${echeance.etudiant_prenom} ${echeance.etudiant_nom}`
    const ok = await confirmer({
      titre: 'Envoyer un rappel',
      message: `${nom} recevra un rappel de paiement par notification et par e-mail.`,
      bouton: 'Envoyer le rappel',
    })
    if (!ok) return

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

      notifier(`Paiement enregistré : la facture est envoyée à ${paymentEcheance.etudiant_prenom} ${paymentEcheance.etudiant_nom}`)
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
    setEtat(ETAT_DEFAUT)
    changerPeriode(PERIODE_TOUT)
  }

  // Désactivation (après confirmation) ou réactivation d'une échéance
  async function handleEtat(ligne, actif) {
    const nom = `${ligne.etudiant_prenom} ${ligne.etudiant_nom}`
    if (!actif) {
      const ok = await confirmer({
        titre: "Désactiver l'échéance",
        message: `L'échéance de ${formatMontant(ligne.montant_prevu)} de ${nom} (${ligne.formation_nom}) sera désactivée. Vous pourrez la réactiver avec le filtre « Désactivés ».`,
        bouton: 'Désactiver',
        danger: true,
      })
      if (!ok) return
    }
    setActionError('')
    setActionMessage('')
    try {
      if (actif) await reactiverEcheance(ligne.id_echeance)
      else await desactiverEcheance(ligne.id_echeance)
      if (actif) notifier('Échéance réactivée')
      else notifier('Échéance désactivée', { annuler: () => reactiver(ligne) })
      liste.recharger()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const reactiver = (ligne) => handleEtat(ligne, true)

  const columns = [
    {
      key: 'student',
      header: 'Étudiant',
      render: (row) => (
        <>
          {row.etudiant_prenom} {row.etudiant_nom}
          <BadgeEtat ligne={row} actif={row.echeance_active} feminin />
        </>
      ),
      exportValue: (row) => `${row.etudiant_prenom} ${row.etudiant_nom}`,
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
        formatMontant(row.montant_prevu),
      exportValue: (row) => Number(row.montant_prevu),
    },

    {
      key: 'reste_a_payer',
      header: 'Reste',
      render: (row) =>
        formatMontant(row.reste_a_payer),
      exportValue: (row) => Number(row.reste_a_payer),
    },

    {
      key: 'statut_paiement',
      header: 'Statut',
      exportValue: (row) =>
        LIBELLE_STATUT(row.statut_paiement) + (Number(row.montant_en_attente) > 0 ? ' (payé, à valider)' : ''),
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
      render: (row) => !Number(row.echeance_active) ? (
        // Désactivé : seule action possible, le réactiver
        canManage && (
          <div className="table-actions">
            <button type="button" className="row-action success-action" onClick={() => reactiver(row)}>
              Réactiver
            </button>
          </div>
        )
      ) : (
        <div className="table-actions">

          <button
            type="button"
            className="row-action"
            onClick={() => setSelectedEcheance(row)}
          >
            Détail
          </button>

          {peutRappeler(row) && (
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

          {canManage && (
            <button type="button" className="row-action danger-action" onClick={() => handleEtat(row, false)}>
              Désactiver
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
            {liste.total} échéance{liste.total !== 1 ? 's' : ''} correspondante{liste.total !== 1 ? 's' : ''}
          </p>
        </div>
        <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="echeances" />
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
            filtreEtat(etat, setEtat),
          ]}
          onReset={resetFilters}
        />
        <FiltreDates periode={periode} onChange={changerPeriode} legende="Échéances" />
        {(error || actionError) && (
          <p className="form-error">
            {error || actionError}
          </p>
        )}
        {actionMessage && <p className="success-message">{actionMessage}</p>}
        <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="échéance(s)" />
        {isLoading ? (
          <p className="gestion-loading">
            Chargement...
          </p>
        ) : (
          <Tableau
            columns={columns}
            rows={echeances}
            rowKey="id_echeance"
            selection={selection}
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
              {formatMontant(selectedEcheance.montant_prevu)}
            </p>

            <p>
              <strong>Montant payé :</strong>{' '}
              {formatMontant(selectedEcheance.montant_paye)}
            </p>

            <p>
              <strong>Reste à payer :</strong>{' '}
              {formatMontant(selectedEcheance.reste_a_payer)}
            </p>

            {Number(selectedEcheance.montant_en_attente) > 0 && (
              <p>
                <strong>Envoyé par l'étudiant, à valider :</strong>{' '}
                {formatMontant(selectedEcheance.montant_en_attente)}
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