import { useMemo, useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import { useUser } from '../../hooks/useUser'

import Avatar from '../../components/avatar/Avatar'
import './Users.css'

function Users({ user, onCreate, onEdit }) {
  const { users, isLoading, error, deleteUser } = useUser()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('Tous')
  const [actionError, setActionError] = useState('')

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users.filter((item) => {
      const fullText = [item.nom, item.prenom, item.email, item.telephone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesSearch = fullText.includes(normalizedSearch)
      const matchesRole = role === 'Tous' || item.role_nom === role

      return matchesSearch && matchesRole
    })
  }, [users, search, role])

  function handleReset() {
    setSearch('')
    setRole('Tous')
  }

  async function handleDelete(item) {
    if (!window.confirm(`Désactiver ${item.prenom || ''} ${item.nom} ?`)) return

    try {
      setActionError('')
      await deleteUser(item.id_utilisateur)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Utilisateur',
      render: (item) => (
        <div className="user-name">
<Avatar photo={item.photo} prenom={item.prenom} nom={item.nom} shape="circle" size="lg" fallback="U" />
          <strong>{item.prenom} {item.nom}</strong>
        </div>
      ),
    },
    { key: 'email', header: 'Email' },
    { key: 'telephone', header: 'Téléphone' },
    {
      key: 'role',
      header: 'Rôle',
      render: (item) => <span className="user-role">{item.role_nom}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="table-actions">
          <button type="button" className="row-action" onClick={() => onEdit(item.id_utilisateur)}>
            Modifier
          </button>
          <button type="button" className="row-action danger-action" onClick={() => handleDelete(item)}>
            Désactiver
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="users-main">
      <Header user={user} activeItem="Utilisateurs" />

      <div className="users-heading">
        <div>
          <h1>Utilisateurs</h1>
          <p>{users.length} utilisateurs enregistrés</p>
        </div>
        <button type="button" className="primary-button" onClick={onCreate}>
          <span aria-hidden="true">+</span>Nouvel utilisateur
        </button>
      </div>

      <article className="users-panel">
        <SearchFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher par nom, e-mail..."
          filters={[
            {
              name: 'role',
              label: 'Rôle',
              value: role,
              onChange: setRole,
              options: ['Tous', 'Super Admin', 'Accueil', 'Formateur', 'Étudiant'],
            },
          ]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        {isLoading ? (
          <p className="users-loading">Chargement des utilisateurs...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={filteredUsers}
            rowKey="id_utilisateur"
            emptyMessage="Aucun utilisateur trouvé."
            wrapperClassName="users-table-wrap"
            className="users-table"
          />
        )}

        <footer className="users-footer">
          <span>
            Affichage <strong>{filteredUsers.length}</strong> sur <strong>{users.length}</strong>
          </span>
        </footer>
      </article>
    </section>
  )
}

export default Users