import { useMemo, useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import { useEtudiant } from '../../hooks/useEtudiant'
import { getFileUrl } from '../../utils/files'
import './Etudiants.css'

function StudentAvatar({ student }) {
  const initials = `${student.prenom?.[0] || ''}${student.nom?.[0] || ''}`.toUpperCase() || 'ET'

  if (student.photo_1) {
    return (
      <img
        className="student-avatar student-avatar-image"
        src={getFileUrl(student.photo_1)}
        alt={`${student.prenom} ${student.nom}`}
      />
    )
  }

  return <span className="student-avatar">{initials}</span>
}

function Etudiants({ user, onCreate, onDetail, onEdit }) {
  const { etudiants, isLoading, error, deleteEtudiant } = useEtudiant()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('Tous')
  const [actionError, setActionError] = useState('')

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return etudiants.filter((student) => {
      const fullText = [student.nom, student.prenom, student.email, student.telephone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = fullText.includes(normalizedSearch)
      const matchesStatus =
        status === 'Tous' ||
        (status === 'Actif' && student.etat) ||
        (status === 'Inactif' && !student.etat)

      return matchesSearch && matchesStatus
    })
  }, [etudiants, search, status])

  function handleReset() {
    setSearch('')
    setStatus('Tous')
  }

  async function handleDelete(student) {
    if (!window.confirm(`Supprimer ${student.prenom} ${student.nom} ?`)) return

    try {
      setActionError('')
      await deleteEtudiant(student.id_etudiant)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Etudiant',
      render: (student) => (
        <div className="student-name">
          <StudentAvatar student={student} />
          <strong>{student.prenom} {student.nom}</strong>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'telephone', header: 'Téléphone' },
    {
      key: 'etat',
      header: 'Statut',
      render: (student) => (
        <span className={`student-status ${student.etat ? 'actif' : 'inactif'}`}>
          {student.etat ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student) => (
        <div className="table-actions">
          <button type="button" className="row-action" onClick={() => onDetail(student.id_etudiant)}>
            Détail
          </button>
          <button type="button" className="row-action" onClick={() => onEdit(student.id_etudiant)}>
            Modifier
          </button>
          <button type="button" className="row-action danger-action" onClick={() => handleDelete(student)}>
            Supprimer
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="students-main">
      <Header user={user} activeItem="Etudiants" />

      <div className="students-heading">
        <div>
          <h1>Etudiants</h1>
          <p>{etudiants.length} étudiants enregistrés</p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          <span aria-hidden="true">+</span>Nouvel étudiant
        </button>
      </div>

      <article className="students-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un étudiant..."
          filters={[
            {
              name: 'status',
              label: 'Statut',
              value: status,
              onChange: setStatus,
              options: ['Tous', 'Actif', 'Inactif'],
            },
          ]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {isLoading ? (
          <p className="students-loading">Chargement des étudiants...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filteredStudents}
            rowKey="id_etudiant"
            emptyMessage="Aucun étudiant trouvé."
            wrapperClassName="students-table-wrap"
            className="students-table"
          />
        )}

        <footer className="students-footer">
          <span>
            Affichage <strong>{filteredStudents.length}</strong> sur <strong>{etudiants.length}</strong>
          </span>
        </footer>
      </article>
    </section>
  )
}

export default Etudiants