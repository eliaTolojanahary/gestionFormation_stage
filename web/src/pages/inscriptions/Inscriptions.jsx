import { useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import PaymentModal from '../../components/paiements/PaymentFormModal'
import SearchFilterBar from '../../components/form/Filter'
import Pagination from '../../components/pagination/Pagination'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import BarreSelection from '../../components/tableau/BarreSelection'
import Modal from '../../components/modal/Modal'
import { useRetour } from '../../components/retour/useRetour'
import { useInscription } from '../../hooks/useInscription'
import { useDocument } from '../../hooks/useDocument'
import { useNotifEvent } from '../../hooks/useNotifEvent'
import { useListePaginee } from '../../hooks/useListePaginee'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { fileUrl } from '../../utils/api'
import { formatMontant, formatNomComplet } from '../../utils/format'
import { PAYMENT_MODES, generateReference } from '../../utils/paiement'
import BadgeEtat from '../../components/etat/BadgeEtat'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'
import './Inscriptions.css'

// Libellés des filtres -> valeurs envoyées à l'API (?valide=, ?statut=, ?origine=, ?dossier=)
const CODE_STATUT = {
  'En attente': { valide: 'non' },
  Validée: { valide: 'oui', statut: 'en_cours' },
  Réussie: { statut: 'reussi' },
}

// Statut affiché : réussie (attestation délivrée), validée, ou en attente de validation
function libelleStatut(row) {
  if (row.statut === 'reussi') return { label: 'Réussie', className: 'inscription-status-reussi' }
  return row.valide ? { label: 'Validée', className: 'actif' } : { label: 'En attente', className: 'inactif' }
}
const CODE_ORIGINE = { Accueil: 'accueil', 'En ligne': 'en_ligne' }
// Dossier de l'étudiant (4 pièces obligatoires) : filtre seulement, le badge « Dossier 2/4 » est
// affiché dans le détail. Inscription en ligne : validation refusée par le serveur tant qu'il manque une pièce.
const CODE_DOSSIER = { Complet: 'complet', Incomplet: 'incomplet' }

// Liste des inscriptions (paginée côté serveur, non validées en premier) avec recherche et filtres
// (statut, origine, dossier).
// Actions : valider (avec premier paiement), générer la fiche, envoyer l'attestation,
// désactiver / réactiver (Super Admin). Filtre « État » : inscriptions actives par défaut.
// Étudiant ou formation désactivés : badge sur la ligne, et le serveur refuse les actions.
// Sélection multiple (clic sur les lignes) : valider (un seul mode de paiement pour toutes),
// désactiver ou réactiver en une fois.
function Inscriptions({ user, onCreate, onDetail }) {
  const { validateInscription, deleteInscription, reactiverInscription } = useInscription()
  const { getFiche, envoyerAttestation, isLoading: isGenerating, error: documentError } = useDocument()
  const { confirmationInscription } = useNotifEvent()
  const { confirmer, notifier } = useRetour()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  // Inscriptions faites par l'Accueil, ou en ligne depuis la vitrine mobile
  const [origine, setOrigine] = useState('Toutes')
  // Dossier de l'étudiant : 4 pièces déposées ou non
  const [dossier, setDossier] = useState('Tous')
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [inscriptionToValidate, setInscriptionToValidate] = useState(null)
  const canManage = user?.role === 'Super Admin'
  const liste = useListePaginee('/inscriptions', {
    recherche: search.trim(),
    valide: CODE_STATUT[status]?.valide || '',
    statut: CODE_STATUT[status]?.statut || '',
    origine: CODE_ORIGINE[origine] || '',
    dossier: CODE_DOSSIER[dossier] || '',
    etat: ETATS[etat],
  })
  const { lignes: inscriptions, isLoading, error } = liste

  const selection = useSelection(inscriptions, 'id_inscription')
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  const aValider = selection.selection.filter((i) => i.etat && !i.valide)
  const actives = selection.selection.filter((i) => i.etat)
  const inactives = selection.selection.filter((i) => !i.etat)
  // Validation groupée : fenêtre du choix du mode de paiement (null = fermée)
  const [modeGroupe, setModeGroupe] = useState(null)

  // Valide une inscription (premier paiement = mode + référence), puis prévient l'étudiant
  // (notification + e-mail de confirmation). Utilisé par la fenêtre de paiement et la sélection.
  // Renvoie la réponse de l'API (avec `avertissement` si le dossier est incomplet).
  async function validerUne(inscription, payment) {
    const resultat = await validateInscription(inscription.id_inscription, payment)
    if (inscription.id_utilisateur_etudiant && inscription.email_etudiant) {
      await confirmationInscription({
        idDestinataire: inscription.id_utilisateur_etudiant,
        email: inscription.email_etudiant,
        contenuHtml: `<p>Bonjour ${formatNomComplet(inscription.prenom_etudiant, inscription.nom_etudiant)},</p>
          <p>Nous avons le plaisir de vous confirmer votre inscription à la formation
          <strong>${inscription.nom_formation || ''}</strong>.</p>
          <p>Vos supports de cours et votre échéancier de paiement sont dès à présent disponibles dans
          l'application mobile IMTECH INFO. La facture de votre premier paiement vous est envoyée séparément.</p>
          <p>Nous vous souhaitons une excellente formation.</p>`,
      })
    }
    return resultat
  }

  function validerSelection() {
    const id_mode_paiement = Number(modeGroupe)
    const lignes = aValider
    setModeGroupe(null)
    groupe.lancer({
      lignes,
      // La référence déclarée par l'étudiant (inscription en ligne) est reprise, sinon générée
      action: (i) => validerUne(i, {
        id_mode_paiement,
        reference_virement: i.reference_declaree || generateReference(i.id_inscription),
      }),
      succes: (n) => `${n} inscription(s) validée(s) : les factures du premier paiement sont envoyées`,
    })
  }

  const actionsGroupees = [
    {
      libelle: 'Valider',
      succes: true,
      nombre: aValider.length,
      onClick: () => setModeGroupe(String(PAYMENT_MODES[0].value)),
    },
    canManage && {
      libelle: 'Désactiver',
      danger: true,
      nombre: actives.length,
      onClick: () => groupe.lancer({
        lignes: actives,
        confirmation: {
          titre: 'Désactiver les inscriptions',
          message: `${actives.length} inscription(s) seront désactivées. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (i) => deleteInscription(i.id_inscription),
        succes: (n) => `${n} inscription(s) désactivée(s)`,
      }),
    },
    canManage && {
      libelle: 'Réactiver',
      succes: true,
      nombre: inactives.length,
      onClick: () => groupe.lancer({
        lignes: inactives,
        action: (i) => reactiverInscription(i.id_inscription),
        succes: (n) => `${n} inscription(s) réactivée(s)`,
      }),
    },
  ]

  function handleReset() {
    setSearch('')
    setStatus('Tous')
    setOrigine('Toutes')
    setDossier('Tous')
    setEtat(ETAT_DEFAUT)
  }

  // Exécute l'action d'un bouton du tableau ; les PDF générés s'ouvrent dans un nouvel onglet
   async function handleAction(action, inscription) {
    try {
      setActionError('')
      setActionMessage('')

      const nom = `${inscription.prenom_etudiant} ${inscription.nom_etudiant}`
      if (action === 'delete') {
        const ok = await confirmer({
          titre: "Désactiver l'inscription",
          message: `L'inscription de ${nom} à « ${inscription.nom_formation} » sera désactivée. Vous pourrez la réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        })
        if (!ok) return
        await deleteInscription(inscription.id_inscription)
        notifier('Inscription désactivée', { annuler: () => handleAction('reactiver', inscription) })
        liste.recharger()
      } else if (action === 'reactiver') {
        await reactiverInscription(inscription.id_inscription)
        notifier('Inscription réactivée')
        liste.recharger()
      } else if (action === 'generer') {
        const result = await getFiche(inscription.id_inscription)
        if (result?.fichier) {
          window.open(fileUrl(result.fichier), '_blank')
        }
      } else if (action === 'attestation') {
        const ok = await confirmer({
          titre: "Envoyer l'attestation",
          message: `L'attestation de ${nom} pour « ${inscription.nom_formation} » sera créée et lui sera envoyée par notification et par e-mail.`,
          bouton: "Envoyer l'attestation",
        })
        if (!ok) return
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
    const resultat = await validerUne(inscriptionToValidate, payment)
    setInscriptionToValidate(null)
    // Inscription faite à l'Accueil avec un dossier incomplet : validée, l'Accueil est rappelé à l'ordre
    notifier(resultat?.avertissement
      ? `Inscription validée. ${resultat.avertissement}`
      : 'Inscription validée : la facture du premier paiement est envoyée à l\'étudiant')
    liste.recharger()
  }

 const columns = [
    {
      key: 'student',
      header: 'Etudiant',
      exportValue: (row) => `${row.prenom_etudiant} ${row.nom_etudiant}`,
      render: (row) => (
        <>
          {row.prenom_etudiant} {row.nom_etudiant}
          {row.origine === 'en_ligne' && <span className="inscription-origine">En ligne</span>}
          <BadgeEtat ligne={row} actif={row.etat} feminin />
        </>
      ),
    },
    { key: 'nom_formation', header: 'Formation' },
    { key: 'date_inscription', header: 'Date' },
    // Colonne présente seulement dans le fichier exporté (badge « En ligne » à l'écran)
    {
      key: 'origine',
      header: 'Origine',
      exportValue: (row) => (row.origine === 'en_ligne' ? 'En ligne' : 'Accueil'),
      exportSeulement: true,
    },
    {
      key: 'valide',
      header: 'Statut',
      exportValue: (row) => libelleStatut(row).label,
      // Badges empilés (statut, paiement déclaré) avec un espace entre eux
      render: (row) => (
        <div className="inscription-statut">
          <span className={`student-status ${libelleStatut(row).className}`}>
            {libelleStatut(row).label}
          </span>
          {!row.valide && row.montant_declare && (
            <small className="inscription-paiement-declare">
              Paiement déclaré : {formatMontant(row.montant_declare)}
              {row.reference_declaree ? ` · réf. ${row.reference_declaree}` : ''}
            </small>
          )}
        </div>
      ),
    },
    // Pièces du dossier de l'étudiant (fichier exporté) ; à l'écran : badge dans le détail
    {
      key: 'dossier',
      header: 'Dossier',
      exportValue: (row) => `${row.pieces_fournies}/${row.pieces_total}`,
      exportSeulement: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => !row.etat ? (
        // Désactivée : seule action possible, la réactiver
        canManage && (
          <div className="table-actions">
            <button type="button" className="row-action success-action" onClick={() => handleAction('reactiver', row)}>
              Réactiver
            </button>
          </div>
        )
      ) : (
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
            Désactiver
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
        <div className="heading-actions">
          <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="inscriptions" />
          <button type="button" className="primary-button" onClick={onCreate}>
            + Nouvelle inscription
          </button>
        </div>
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
              options: ['Tous', ...Object.keys(CODE_STATUT)],
            },
            {
              name: 'origine',
              label: 'Origine',
              value: origine,
              onChange: setOrigine,
              options: ['Toutes', 'Accueil', 'En ligne'],
            },
            {
              name: 'dossier',
              label: 'Dossier',
              value: dossier,
              onChange: setDossier,
              options: ['Tous', ...Object.keys(CODE_DOSSIER)],
            },
            filtreEtat(etat, setEtat),
          ]}
          onReset={handleReset}
        />

        {(error || actionError || documentError) && <p className="form-error">{error || actionError || documentError}</p>}
        {actionMessage && <p className="success-message">{actionMessage}</p>}

        <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="inscription(s)" />

        {isLoading ? (
          <p className="gestion-loading">Chargement...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={inscriptions}
            rowKey="id_inscription"
            selection={selection}
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

      {modeGroupe !== null && (
        <Modal
          eyebrow="Validation groupée"
          title={`Valider ${aValider.length} inscription(s)`}
          titleId="validation-groupee-title"
          onClose={() => setModeGroupe(null)}
          actions={(
            <>
              <button type="button" className="secondary-button" onClick={() => setModeGroupe(null)}>
                Annuler
              </button>
              <button type="button" className="primary-button" onClick={validerSelection}>
                Valider
              </button>
            </>
          )}
        >
          <p className="confirmation-message">
            Le premier paiement de chaque inscription sera enregistré avec ce mode, et chaque étudiant
            recevra sa confirmation et sa facture. Les inscriptions en ligne gardent la référence
            déclarée par l'étudiant.
          </p>
          <label className="validation-groupee-mode">
            Mode de paiement
            <select value={modeGroupe} onChange={(event) => setModeGroupe(event.target.value)}>
              {PAYMENT_MODES.map((modePaiement) => (
                <option key={modePaiement.value} value={modePaiement.value}>{modePaiement.label}</option>
              ))}
            </select>
          </label>
        </Modal>
      )}
    </section>
  )
}

export default Inscriptions