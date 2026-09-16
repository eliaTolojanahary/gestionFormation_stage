import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import Tableau from '../../components/tableau/Tableau'
import { useFormation } from '../../hooks/useFormation'
import './GestionPages.css'

function FormationDetail({ user, formationId, onBack, onEdit }) {
  const { getFormation, getEtudiants } = useFormation()
  const [formation, setFormation] = useState(null)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getFormation(formationId), getEtudiants(formationId)]).then(([data, studentData]) => { setFormation(data); setStudents(studentData) }).catch((requestError) => setError(requestError.message))
  }, [formationId, getFormation, getEtudiants])

  if (error) return <main className="gestion-page"><Header user={user} activeItem="Formations" /><p className="form-error">{error}</p></main>
  if (!formation) return <main className="gestion-page"><Header user={user} activeItem="Formations" /><p>Chargement...</p></main>
  const columns = [{ key: 'etudiant', header: 'Etudiant', render: (row) => `${row.prenom} ${row.nom}` }, { key: 'email', header: 'Email' }, { key: 'date_inscription', header: 'Inscription' }]
  return <main className="gestion-page"><Header user={user} activeItem="Formations" /><div className="gestion-heading"><div><button type="button" className="back-link" onClick={onBack}>← Retour aux formations</button><h1>{formation.nom}</h1><p>{formation.description || 'Aucune description.'}</p></div>{user?.role === 'Super Admin' && <button type="button" className="primary-button" onClick={() => onEdit(formation.id_formation)}>Modifier</button>}</div><div className="detail-layout"><Informations title="Informations" items={[{ label: 'Tarif', value: `${Number(formation.tarif || 0).toLocaleString('fr-FR')} MGA` }, { label: 'Durée', value: `${formation.duree_jours || 0} jours` }, { label: 'Formateur', value: `${formation.prenom_formateur || ''} ${formation.nom_formateur || ''}`.trim() || '-' }]} /><Informations title="Etudiants inscrits"><Tableau columns={columns} rows={students} rowKey="id_etudiant" emptyMessage="Aucun étudiant inscrit." /></Informations></div></main>
}

export default FormationDetail
