import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../icon/Icon'
import Header from '../header/Header'
import Tableau from '../tableau/Tableau'
import AvisFormateurs from './AvisFormateurs'
import CommentairesFormateurs from './CommentairesFormateurs'
import FiltreDates from './FiltreDates'
import BoutonExportCSV from '../tableau/BoutonExportCSV'
import { useDashboard } from '../../hooks/useDashboard'
import { useRetour } from '../retour/useRetour'

import {
  labelDeuxLignes,
  formatPaymentDate,
  buildLineChartPoints ,
  getPaymentStatus,
  montantCourt,
  variation,
  DESCRIPTION_PERIODE
} from '../../utils/dashboardUtils'

import { apiRequest } from '../../utils/api'
import { formatMontant } from '../../utils/format'
import { PERIODE_TOUT, libellePeriode, periodeInvalide, requetePeriode } from '../../utils/periodes'
import './DashboardContent.css'

// Page d'accueil du tableau de bord (Accueil / Super Admin), découpée en sous-composants :
// KpiList, DashboardCharts, PopularFormations et PaymentTable.

// Cartes des indicateurs clés ; `tone` donne la couleur de l'icône.
// La période filtre l'argent encaissé (date du paiement) et les échéances (date de l'échéance).
function KpiList({ kpis }) {
  const kpiCards = [
    { label: 'Nombre de formations', value: kpis.nombre_formations, icon: 'book', tone: 'neutral' },
    { label: 'Formations actives', value: kpis.formations_actives, icon: 'check', tone: 'success' },
    { label: 'Paiements en retard', value: kpis.paiements_en_retard, icon: 'alert', tone: 'danger' },
    { label: 'Reste à encaisser', value: formatMontant(kpis.reste_a_encaisser), icon: 'wallet', tone: 'warning' },
    { label: 'Montant encaissé', value: formatMontant(kpis.montant_encaisse), icon: 'cash', tone: 'success' },
  ]

  return (
    <div className="kpi-grid">
      {kpiCards.map((kpi) => (
        <article className="kpi-card" key={kpi.label}>
          <div className="kpi-top">
            <span>{kpi.label}</span>
            <span className={`kpi-icon ${kpi.tone}`}>
              <Icon name={kpi.icon} />
            </span>
          </div>
          <strong>{kpi.value}</strong>
        </article>
      ))}
    </div>
  )
}

// Détail du reste à encaisser : barre en trois couleurs + légende ; les trois montants redonnent le total
function DetailReste({ kpis }) {
  const parts = [
    { cle: 'a-venir', label: 'À venir', montant: Number(kpis.montant_a_venir), nombre: kpis.nb_a_venir },
    { cle: 'a-valider', label: 'À valider', montant: Number(kpis.montant_en_attente), nombre: kpis.nb_en_attente },
    { cle: 'en-retard', label: 'En retard', montant: Number(kpis.montant_en_retard), nombre: kpis.nb_en_retard },
  ]
  const echeances = (n) => `${n} échéance${n > 1 ? 's' : ''}`
  const total = parts.reduce((somme, part) => somme + part.montant, 0)

  return (
    <article className="dashboard-card reste-detail">
      <div className="reste-detail-titre">
        <span>Détail du reste à encaisser</span>
        <strong>{formatMontant(kpis.reste_a_encaisser)}</strong>
      </div>
      <div className="reste-detail-barre">
        {total > 0 && parts.map((part) => (
          <span key={part.cle} className={part.cle} style={{ width: `${(part.montant / total) * 100}%` }} />
        ))}
      </div>
      <ul className="reste-detail-legende">
        {parts.map((part) => (
          <li key={part.cle}>
            <i className={part.cle} />
            {part.label} : <strong>{formatMontant(part.montant)}</strong> ({echeances(part.nombre)})
          </li>
        ))}
      </ul>
    </article>
  )
}

// Libellé d'une période sous l'axe, sur deux lignes (ex. « 26 » puis « sept. »)
function LabelPeriode({ cle, periode }) {
  const { haut, bas } = labelDeuxLignes(cle, periode)
  return (
    <>
      <span>{haut}</span>
      {bas && <span className="label-bas">{bas}</span>}
    </>
  )
}

// Deux graphiques :
//  - histogramme des encaissements (période au choix) : hauteur de barre = total / plus grand total,
//    montant au-dessus de chaque barre non vide et évolution par rapport à la période précédente
//    (seulement si les deux ne sont pas vides) ;
//  - courbe SVG des inscriptions par mois, sur la période du filtre « Du … au … », avec le nombre du mois.
function DashboardCharts({ evolution, inscriptionsParMois, periode, onPeriodeChange }) {
  const periodes = ['quotidien', 'hebdomadaire', 'mensuel', 'annuel']
  const points = evolution.points || []
  const inscriptionPoints = inscriptionsParMois || []
  const maxTotal = Math.max(...points.map((p) => Number(p.total)), 1)
  // Points de la courbe ("x,y x,y ...") ; la zone colorée est fermée par les deux coins du bas
  const linePoints = buildLineChartPoints(inscriptionPoints)
  const linePointsAttribute = linePoints
    .map(({ x, y }) => `${x},${y}`)
    .join(' ')
  const areaPointsAttribute = linePointsAttribute
    ? `${linePointsAttribute} 400,150 0,150`
    : ''

  return (
    <div className="charts-grid">
      <article className="dashboard-card chart-card">
        <div className="card-heading">
          <div>
            <h2>Evolution des paiements</h2>
            <p>Encaissements {DESCRIPTION_PERIODE[evolution.periode] || ''}</p>
          </div>
          <div className="chart-tabs">
            {periodes.map((p) => (
              <button
                key={p}
                type="button"
                className={evolution.periode === p ? 'selected' : ''}
                onClick={() => onPeriodeChange(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="bar-chart">
          {points.length === 0 ? (
            <p>Aucune donnée</p>
          ) : (
            points.map((point, index) => (
              <div className="bar-column" key={point.periode}>
                {/* Zone de hauteur fixe : la barre y occupe sa part de la hauteur utile (94 px) */}
                <div className="bar-zone">
                  <em className="bar-total">{Number(point.total) > 0 ? montantCourt(point.total) : ''}</em>
                  <span
                    className="bar-value"
                    style={{ height: `calc(${Number(point.total) / maxTotal} * 94px)` }}
                    title={formatMontant(point.total)}
                  />
                </div>
                <small className="bar-label">
                  <LabelPeriode cle={point.periode} periode={evolution.periode} />
                </small>
                {(() => {
                  const evol = (Number(point.total) > 0 && variation(point.total, points[index - 1]?.total)) || ''
                  return <small className={`bar-variation ${evol.startsWith('−') ? 'baisse' : ''}`}>{evol}</small>
                })()}
              </div>
            ))
          )}
        </div>

        <p className="chart-summary">
          Total période : {formatMontant(evolution.total || 0)}
        </p>
      </article>

      <article className="dashboard-card chart-card">
        <div className="card-heading">
          <div>
            <h2>Inscriptions par mois</h2>
            <p>Inscriptions {libellePeriode(periode)}</p>
          </div>
        </div>

        {inscriptionPoints.length === 0 ? (
          <p>Aucune donnée</p>
        ) : (
          <>
            <div className="line-chart">
              <svg viewBox="0 0 400 150" preserveAspectRatio="none">
                <polyline points={linePointsAttribute} />
                <polyline className="area" points={areaPointsAttribute} />
              </svg>
            </div>
            <div className="line-chart-labels">
              {inscriptionPoints.map((point) => (
                <small key={point.periode}>
                  <strong>{point.total}</strong>
                  <LabelPeriode cle={point.periode} periode="mensuel" />
                </small>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  )
}

// Composant principal : charge les données via useDashboard et assemble la page
function DashboardContent({ user ,onProfile}) {
  const {
    kpis,
    evolution,
    inscriptionsParMois,
    isLoading,
    error,
    getEvolution,
    chargerPeriode,
    topInscriptions,
    paymentTable,
    exporterCSV
  } = useDashboard()
  const { notifier } = useRetour()
  // Période « Du … au … » commune aux indicateurs, aux inscriptions et aux avis sur les formateurs
  const [periode, setPeriode] = useState(PERIODE_TOUT)
  const [versionNotes, setVersionNotes] = useState(0) // un commentaire noté relit le classement
  const displayUser = user || { prenom: 'Admin' }

  // Une période impossible (début après la fin) est affichée mais pas envoyée à l'API
  function changerPeriode(nouvelle) {
    setPeriode(nouvelle)
    if (!periodeInvalide(nouvelle)) chargerPeriode(nouvelle)
  }
  const periodeAppliquee = periodeInvalide(periode) ? PERIODE_TOUT : periode

  async function exporterInscriptions() {
    const limite = await exporterCSV()
    if (limite) notifier(`Export limité aux ${limite.toLocaleString('fr-FR')} premières inscriptions.`)
  }

  return (
    <section className="dashboard-main">
      <Header user={user} activeItem="Tableau de bord" onProfile={onProfile} />

      <div className="dashboard-heading">
        <div>
          <h1>Bonjour, {displayUser.prenom || 'Admin'}</h1>
          <p>Voici un aperçu de l'activité du centre de formation.</p>
        </div>
        <button className="primary-button export-button" type="button" onClick={exporterInscriptions}>
          <Icon name="download" /> Exporter les inscriptions (CSV)
        </button>
      </div>

      {isLoading && <p>Chargement...</p>}
      {error && <p className="error">{error}</p>}

      <FiltreDates periode={periode} onChange={changerPeriode} />
      <KpiList kpis={kpis} />
      <DetailReste kpis={kpis} />
      <DashboardCharts
        evolution={evolution}
        inscriptionsParMois={inscriptionsParMois}
        periode={periodeAppliquee}
        onPeriodeChange={getEvolution}
      />

      <PopularFormations topInscriptions={topInscriptions} periode={periodeAppliquee} />
      <PaymentTable paymentTable={paymentTable} periode={periodeAppliquee} />
      <AvisFormateurs periode={periodeAppliquee} version={versionNotes} />
      <CommentairesFormateurs onNote={() => setVersionNotes((version) => version + 1)} />
      
    </section>
  )
}



// Top 5 des formations : barre de progression proportionnelle à la formation la plus suivie
function PopularFormations({ topInscriptions, periode }) {
  const formations = topInscriptions || []
  const maxInscriptions = Math.max(
    ...formations.map((formation) => Number(formation.total_inscriptions)),
    1
  )

  return (
    <article className="dashboard-card formations-card">
      <div className="card-heading">
        <div>
          <h2>Formations les plus suivies</h2>
          <p>
            Classement par nombre d'inscriptions {libellePeriode(periode)}
          </p>
        </div>
      </div>

      {formations.length === 0 ? (
        <p>Aucune inscription</p>
      ) : (
        formations.map((formation) => {
          const count = Number(formation.total_inscriptions)
          const width = (count / maxInscriptions) * 100

          return (
            <div className="progress-row" key={formation.id_formation}>
              <div>
                <span>{formation.formation}</span>
                <strong>{count}</strong>
              </div>
              <div className="progress-track">
                <span style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })
      )}
    </article>
  )
}

// Ordre d'affichage : retards d'abord, puis J-2 à J, puis le reste (par date à l'intérieur)
const ORDRE_ALERTE = { ROUGE: 0, JAUNE: 1, VERT: 2 }

// Aperçu des 5 échéances les plus urgentes dont la date est dans la période ; alerte = JAUNE ou ROUGE.
// paymentTable = { lignes (5 au plus, déjà dans l'ordre), total, alertes } calculé par le serveur.
// Les boutons et « Filtres avancés » ouvrent la page Échéances avec la même période.
function PaymentTable({ paymentTable, periode }) {
  const navigate = useNavigate()
  const { lignes: payments = [], total = 0, alertes: alertCount = 0 } = paymentTable || {}
  const lienEcheances = `/dashboard/echeances${requetePeriode(periode)}`

  // Export : toutes les échéances de la période (plafonnées par le serveur), alertes d'abord.
  // sort est stable : l'ordre par date renvoyé par l'API est gardé dans chaque couleur
  async function toutesLesEcheances() {
    const reponse = await apiRequest(`/echeances${requetePeriode(periode)}`)
    const lignes = [...(reponse.data || [])].sort(
      (a, b) => (ORDRE_ALERTE[a.statut_paiement] ?? 2) - (ORDRE_ALERTE[b.statut_paiement] ?? 2)
    )
    return { lignes, limite: reponse.tronque ? reponse.limite_export : null }
  }

  const paymentColumns = [
    {
      key: 'student',
      header: 'Etudiant',
      render: (payment) => `${payment.etudiant_prenom} ${payment.etudiant_nom}`,
    },
    { key: 'formation_nom', header: 'Formation' },
    {
      key: 'reste_a_payer',
      header: 'Montant',
      render: (payment) => formatMontant(payment.reste_a_payer),
      exportValue: (payment) => Number(payment.reste_a_payer),
    },
    {
      key: 'date_echeance',
      header: 'Echeance',
      render: (payment) => formatPaymentDate(payment.date_echeance),
    },
    {
      key: 'statut_paiement',
      header: 'Statut',
      exportValue: (payment) => getPaymentStatus(payment.statut_paiement).label,
      render: (payment) => {
        const status = getPaymentStatus(payment.statut_paiement)

        return <span className={`status ${status.className}`}>{status.label}</span>
      },
    },
    {
      key: 'actions',
      header: 'Action',
      render: (payment) => {
        const shouldRemind = payment.statut_paiement !== 'VERT'

        return (
          <button
            className={shouldRemind ? 'action danger' : 'action'}
            type="button"
            onClick={() => navigate(lienEcheances)}
          >
            {shouldRemind ? 'Rappeler' : 'Voir'}
          </button>
        )
      },
    },
  ]

  return (
    <article className="dashboard-card table-card">
      <div className="card-heading">
        <div>
          <h2>
            Paiements à surveiller <em>{alertCount} alertes</em>
          </h2>
          <p>Échéances {libellePeriode(periode)}</p>
        </div>
        <div className="heading-actions">
          {/* Le tableau n'affiche que 5 lignes ; le fichier contient toutes les échéances */}
          <BoutonExportCSV columns={paymentColumns} charger={toutesLesEcheances} nomFichier="paiements_a_surveiller" />
          <Link to={lienEcheances}>Filtres avancés</Link>
        </div>
      </div>

      <Tableau
        columns={paymentColumns}
        rows={payments}
        rowKey="id_echeance"
        emptyMessage="Aucun paiement à surveiller"
        wrapperClassName="table-wrap"
      />

      <small className="table-footer">
        Affichage {payments.length} sur {total} éléments
      </small>
    </article>
  )
}


export default DashboardContent
