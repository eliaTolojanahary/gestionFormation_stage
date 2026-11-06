import { useState } from 'react'

import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import Pagination from '../../components/pagination/Pagination'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import BarreSelection from '../../components/tableau/BarreSelection'
import Modal from '../../components/modal/Modal'
import { useRetour } from '../../components/retour/useRetour'
import { usePaiement, STATUTS_PAIEMENT } from '../../hooks/usePaiement'
import { useDocument } from '../../hooks/useDocument'
import { useListePaginee } from '../../hooks/useListePaginee'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { fileUrl } from '../../utils/api'
import { formatDate } from '../../utils/time'
import { formatMontant } from '../../utils/format'
import BadgeEtat from '../../components/etat/BadgeEtat'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'
import './Paiements.css'

const TOUS = 'Tous'

// Badge coloré du statut (classe CSS selon en_attente / valide / refuse)
function StatutPaiement({ statut }) {
  return (
    <span className={`paiement-statut paiement-statut-${statut}`}>
      {STATUTS_PAIEMENT[statut] || statut}
    </span>
  )
}

// Libellé du filtre -> code envoyé à l'API (?statut=)
const CODE_STATUT = Object.fromEntries(Object.entries(STATUTS_PAIEMENT).map(([code, libelle]) => [libelle, code]))

// Page Paiements : l'Accueil y valide ou refuse les paiements envoyés par les étudiants
// depuis le mobile ; à la validation, le serveur envoie la facture à l'étudiant (bouton Facture : l'ouvrir).
// Liste paginée côté serveur : recherche et filtres sont envoyés à GET /paiements.
// Filtre « État » : paiements actifs par défaut ; le Super Admin désactive / réactive
// (un paiement désactivé ne compte plus dans les montants payés).
// Sélection multiple (clic sur les lignes) : valider, refuser, désactiver ou réactiver en une fois.
function Paiements({ user }) {
  const { validerPaiement, refuserPaiement, desactiverPaiement, reactiverPaiement } = usePaiement()
  const { getFacture, isLoading: isGenerating, error: documentError } = useDocument()
  const { confirmer, notifier } = useRetour()
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [actionError, setActionError] = useState('')
  const [enCours, setEnCours] = useState(null) // id du paiement en cours de validation/refus
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState(TOUS)
  const [statutFilter, setStatutFilter] = useState(TOUS)
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const canManage = user?.role === 'Super Admin'

  const liste = useListePaginee('/paiements', {
    recherche: search.trim(),
    statut: CODE_STATUT[statutFilter] || '',
    mode: modeFilter === TOUS ? '' : modeFilter,
    etat: ETATS[etat],
  })
  const { lignes: paiements, isLoading, error } = liste
  // Paiements en attente sur toute la base (pas seulement la page affichée)
  const nbEnAttente = liste.extra.compteurs?.en_attente ?? 0

  const selection = useSelection(paiements, 'id_paiement')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const enAttente = selection.selection.filter((p) => Number(p.etat) && p.statut === 'en_attente')
  const actifs = selection.selection.filter((p) => Number(p.etat))
  // Un paiement facturé ne se désactive pas (document officiel déjà envoyé)
  const desactivables = actifs.filter((p) => !Number(p.facture_emise))
  const inactifs = selection.selection.filter((p) => !Number(p.etat))
  const totalEnAttente = enAttente.reduce((somme, p) => somme + Number(p.montant), 0)

  const actionsGroupees = [
    {
      libelle: 'Valider',
      succes: true,
      nombre: enAttente.length,
      onClick: () => groupe.lancer({
        lignes: enAttente,
        confirmation: {
          titre: 'Valider les paiements',
          message: `Confirmez-vous avoir reçu ces ${enAttente.length} paiement(s), pour ${formatMontant(totalEnAttente)} au total ? Chaque étudiant recevra sa facture.`,
          bouton: 'Valider',
        },
        action: (p) => validerPaiement(p.id_paiement),
        succes: (n) => `${n} paiement(s) validé(s) : les factures sont envoyées`,
      }),
    },
    {
      libelle: 'Refuser',
      danger: true,
      nombre: enAttente.length,
      onClick: () => groupe.lancer({
        lignes: enAttente,
        confirmation: {
          titre: 'Refuser les paiements',
          message: `Refuser ces ${enAttente.length} paiement(s) (${formatMontant(totalEnAttente)}) ? Les étudiants devront payer à nouveau.`,
          bouton: 'Refuser',
          danger: true,
        },
        action: (p) => refuserPaiement(p.id_paiement),
        succes: (n) => `${n} paiement(s) refusé(s)`,
      }),
    },
    canManage && {
      libelle: 'Désactiver',
      danger: true,
      nombre: desactivables.length,
      onClick: () => groupe.lancer({
        lignes: desactivables,
        confirmation: {
          titre: 'Désactiver les paiements',
          message: `${desactivables.length} paiement(s) seront désactivés et ne compteront plus dans ce qui a été payé. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (p) => desactiverPaiement(p.id_paiement),
        succes: (n) => `${n} paiement(s) désactivé(s)`,
      }),
    },
    canManage && {
      libelle: 'Réactiver',
      succes: true,
      nombre: inactifs.length,
      onClick: () => groupe.lancer({
        lignes: inactifs,
        action: (p) => reactiverPaiement(p.id_paiement),
        succes: (n) => `${n} paiement(s) réactivé(s)`,
      }),
    },
  ]

  // Valide ou refuse un paiement en attente, après confirmation
  async function handleStatut(payment, action) {
    const nom = `${payment.etudiant_prenom} ${payment.etudiant_nom}`
    const ok = await confirmer(action === 'valider'
      ? {
          titre: 'Valider le paiement',
          message: `Confirmez-vous avoir reçu ${formatMontant(payment.montant)} de ${nom} ?`,
          bouton: 'Valider',
        }
      : {
          titre: 'Refuser le paiement',
          message: `Refuser le paiement de ${formatMontant(payment.montant)} de ${nom} ? L'étudiant devra payer à nouveau.`,
          bouton: 'Refuser',
          danger: true,
        })
    if (!ok) return

    setActionError('')
    setEnCours(payment.id_paiement)
    try {
      if (action === 'valider') await validerPaiement(payment.id_paiement)
      else await refuserPaiement(payment.id_paiement)
      notifier(action === 'valider' ? `Paiement validé : la facture est envoyée à ${nom}` : 'Paiement refusé')
      liste.recharger() // statut, compteur « en attente » et filtres à jour
    } catch (requestError) {
      setActionError(requestError.message)
    } finally {
      setEnCours(null)
    }
  }

  // Ouvre la facture d'un paiement validé (déjà envoyée automatiquement à l'étudiant à la validation)
  async function handleGenerateInvoice(payment) {
    setActionError('')
    try {
      const result = await getFacture(payment.id_paiement)
      if (!result?.fichier) return

      window.open(fileUrl(result.fichier), '_blank')
    } catch (err) {
      setActionError(err.message || 'Erreur lors de la génération de la facture.')
    }
  }

  function resetFilters() {
    setSearch('')
    setModeFilter(TOUS)
    setStatutFilter(TOUS)
    setEtat(ETAT_DEFAUT)
  }

  // Désactivation (après confirmation) ou réactivation d'un paiement
  async function handleEtat(ligne, actif) {
    const nom = `${ligne.etudiant_prenom} ${ligne.etudiant_nom}`
    if (!actif) {
      const ok = await confirmer({
        titre: "Désactiver le paiement",
        message: `Le paiement de ${formatMontant(ligne.montant)} de ${nom} sera désactivé et ne comptera plus dans ce qui a été payé. Vous pourrez le réactiver avec le filtre « Désactivés ».`,
        bouton: 'Désactiver',
        danger: true,
      })
      if (!ok) return
    }
    setActionError('')
    try {
      if (actif) await reactiverPaiement(ligne.id_paiement)
      else await desactiverPaiement(ligne.id_paiement)
      if (actif) notifier('Paiement réactivé')
      else notifier('Paiement désactivé', { annuler: () => reactiver(ligne) })
      liste.recharger()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const reactiver = (ligne) => handleEtat(ligne, true)

  const columns = [
    { key: 'id_paiement', header: 'N°' },
    {
      key: 'student',
      header: 'Étudiant',
      render: (row) => (
        <>
          {row.etudiant_prenom} {row.etudiant_nom}
          <BadgeEtat ligne={row} actif={row.etat} />
        </>
      ),
      exportValue: (row) => `${row.etudiant_prenom} ${row.etudiant_nom}`,
    },
    { key: 'formation_nom', header: 'Formation' },
    {
      key: 'montant',
      header: 'Montant',
      render: (row) => formatMontant(row.montant),
      exportValue: (row) => Number(row.montant),
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
      exportValue: (row) => STATUTS_PAIEMENT[row.statut] || row.statut,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => !Number(row.etat) ? (
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

          {canManage && !Number(row.facture_emise) && (
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
      <Header user={user} activeItem="Paiements" />

      <div className="gestion-heading">
        <div>
          <h1>Paiements</h1>
          <p>{liste.total} paiement{liste.total !== 1 ? 's' : ''} correspondant{liste.total !== 1 ? 's' : ''}</p>
        </div>
        <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="paiements" />
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
            filtreEtat(etat, setEtat),
          ]}
          onReset={resetFilters}
        />

        {(error || actionError || documentError) && (
          <p className="form-error">{error || actionError || documentError}</p>
        )}

        <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="paiement(s)" />

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={paiements}
            rowKey="id_paiement"
            selection={selection}
            emptyMessage="Aucun paiement trouvé."
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
          libelle="paiement(s)"
        />
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
            <p>
              <strong>Traité par :</strong>{' '}
              {selectedPayment.agent_nom ? `${selectedPayment.agent_prenom} ${selectedPayment.agent_nom}` : 'Non renseigné'}
            </p>
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
