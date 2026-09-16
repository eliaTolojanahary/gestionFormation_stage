import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import Tableau from '../../components/tableau/Tableau'
import DocumentAffichage from '../../components/doc/DocumentAffichage'
import { useEtudiant } from '../../hooks/useEtudiant'
import './EtudiantPages.css'

function EtudiantDetail({ user, studentId, onBack, onEdit }) {
  const { getEtudiant, getFormations } = useEtudiant()
  const [student, setStudent] = useState(null)
  const [formations, setFormations] = useState([])
  const [error, setError] = useState('')


  useEffect(() => {
    async function loadData() {
      try {
        const studentData = await getEtudiant(studentId)
        const formationData = await getFormations(studentId)
        setStudent(studentData)
        setFormations(formationData)
      } catch (err) {
        setError(err.message)
      }
    }
    loadData()
  }, [studentId])

  const formationColumns = [
    { key: 'nom', header: 'Formation' },
    { key: 'description', header: 'Description' },
    {
      key: 'tarif',
      header: 'Tarif',
      render: (formation) => `${Number(formation.tarif || 0).toLocaleString('fr-FR')} MGA`,
    },
    { key: 'date_inscription', header: 'Inscription' },
  ]

 
  const documents = [
    ['Photo 1', student?.photo_1],
    ['Photo 2', student?.photo_2],
    ['Certificat de résidence', student?.certificat_residence],
    ['Photocopie CIN', student?.photocopie_cin],
  ]


  if (error) {
    return (
      <main className="etudiant-page">
        <Header user={user} activeItem="Etudiants" />
        <p className="form-error">{error}</p>
      </main>
    )
  }

  // Cas chargement
  if (!student) {
    return (
      <main className="etudiant-page">
        <Header user={user} activeItem="Etudiants" />
        <p>Chargement...</p>
      </main>
    )
  }

  const informationItems = [
    { label: 'Nom complet', value: `${student.prenom || ''} ${student.nom || ''}`.trim() },
    { label: 'Email', value: student.email },
    { label: 'Téléphone', value: student.telephone }
  ]

  return (
    <main className="etudiant-page">
      <Header user={user} activeItem="Etudiants" />

      <div className="page-heading detail-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux étudiants
          </button>
          <h1>{student.prenom} {student.nom}</h1>
          <p>Fiche détaillée de l'étudiant</p>
        </div>
        <button type="button" className="primary-button" onClick={() => onEdit(student.id_etudiant)}>
          Modifier
        </button>
      </div>

      <div className="detail-layout">
        <div className="detail-main-column">
          <Informations title="Informations personnelles" items={informationItems} />
          <Informations title="Formations suivies">
            <Tableau
              columns={formationColumns}
              rows={formations}
              rowKey="id_formation"
              emptyMessage="Aucune formation inscrite."
            />
          </Informations>
        </div>

      <Informations title="Documents">
  <div className="document-list">
    {documents.map(([label, value]) => (
      <DocumentAffichage label={label} path={value} />
    ))}
  </div>
</Informations>
      </div>
    </main>
  )
}

export default EtudiantDetail