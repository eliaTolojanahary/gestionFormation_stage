import Icon from '../icon/Icon'
import Header from '../header/Header'
import Tableau from '../tableau/Tableau'
import { useDashboard } from '../../hooks/useDashboard'

import {
  formatLabel,
  formatPaymentDate,
  buildLineChartPoints ,
  getPaymentStatus
} from '../../utils/dashboardUtils'

import './DashboardContent.css'

function KpiList({ kpis }) {
  const kpiCards = [
    { label: 'Nombre de formations', value: kpis.nombre_formations, icon: 'book', tone: 'neutral' },
    { label: 'Formations actives', value: kpis.formations_actives, icon: 'check', tone: 'success' },
    { label: 'Paiements en retard', value: kpis.paiements_en_retard, icon: 'alert', tone: 'danger' },
    { label: 'Reste à encaisser', value: kpis.reste_a_encaisser, icon: 'wallet', tone: 'warning' },
    { label: 'Montant encaissé', value: kpis.montant_encaisse, icon: 'cash', tone: 'success' },
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

function DashboardCharts({ evolution, inscriptionsParMois, onPeriodeChange }) {
  const periodes = ['quotidien', 'hebdomadaire', 'mensuel', 'annuel']
  const points = evolution.points || []
  const inscriptionPoints = inscriptionsParMois || []
  const maxTotal = Math.max(...points.map((p) => Number(p.total)), 1)
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
            <p>Suivi des encaissements ({evolution.periode || 'hebdomadaire'})</p>
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
            points.map((point) => (
              <div className="bar-column" key={point.periode}>
                <span
                  className="bar-value"
                  style={{ height: `${(Number(point.total) / maxTotal) * 100}%` }}
                  title={`${point.total} €`}
                />
                <small>
                  {formatLabel(point.periode, evolution.periode)}
                </small>
              </div>
            ))
          )}
        </div>

        <p className="chart-summary">
          Total période : {Number(evolution.total || 0).toLocaleString('fr-FR')} Ar
        </p>
      </article>

      <article className="dashboard-card chart-card">
        <div className="card-heading">
          <div>
            <h2>Inscriptions par mois</h2>
            <p>Evolution generale des inscriptions</p>
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
                  {formatLabel(point.periode, 'mensuel')}
                </small>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  )
}

function DashboardContent({ user ,onProfile}) {
  const {
    kpis,
    evolution,
    inscriptionsParMois,
    isLoading,
    error,
    getEvolution,
    topInscriptions,
    paymentTable
  } = useDashboard()
  const displayUser = user || { prenom: 'Admin' }

  return (
    <section className="dashboard-main">
      <Header user={user} activeItem="Tableau de bord" onProfile={onProfile} />

      <div className="dashboard-heading">
        <div>
          <h1>Bonjour, {displayUser.prenom || 'Admin'}</h1>
          <p>Voici un aperçu de l'activité du centre de formation.</p>
        </div>
      </div>

      {isLoading && <p>Chargement...</p>}
      {error && <p className="error">{error}</p>}

      <KpiList kpis={kpis} />
      <DashboardCharts
        evolution={evolution}
        inscriptionsParMois={inscriptionsParMois}
        onPeriodeChange={getEvolution}
      />

      <PopularFormations topInscriptions={topInscriptions} />
      <PaymentTable paymentTable={paymentTable}/>
      
    </section>
  )
}



function PopularFormations({ topInscriptions }) {
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
            Classement basé sur le nombre total d'étudiants inscrits actuellement
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

function PaymentTable({ paymentTable }) {
  const payments = paymentTable || []
  const alertCount = payments.filter(
    (payment) => payment.statut_paiement !== 'VERT'
  ).length

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
      render: (payment) => `${Number(payment.reste_a_payer).toLocaleString('fr-FR')} MGA`,
    },
    {
      key: 'date_echeance',
      header: 'Echeance',
      render: (payment) => formatPaymentDate(payment.date_echeance),
    },
    {
      key: 'statut_paiement',
      header: 'Statut',
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
          >
            {shouldRemind ? 'Relancer' : 'Voir'}
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
        </div>
        <a href="/paiements">Filtres avancés</a>
      </div>

      <Tableau
        columns={paymentColumns}
        rows={payments.slice(0, 5)}
        rowKey="id_echeance"
        emptyMessage="Aucun paiement à surveiller"
        wrapperClassName="table-wrap"
      />

      <small className="table-footer">
        Affichage {Math.min(payments.length, 5)} sur {payments.length} éléments
      </small>
    </article>
  )
}


export default DashboardContent
