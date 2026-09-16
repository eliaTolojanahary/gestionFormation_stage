import { useMemo, useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import { useUser } from '../../hooks/useUser'
import './Users.css'

function UserAvatar({ user }) {
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'U'
  return <span className="user-avatar">{initials}</span>
}

function Users({ user, onCreate, onEdit }) {
  const { users, isLoading, error, searchUsers, deleteUser } = useUser()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('Tous')
  const [actionError, setActionError] = useState('')

  const filteredUsers = useMemo(() => {
    return searchUsers(search).filter((item) => role === 'Tous' || item.role_nom === role)
  }, [searchUsers, search, role])

  async function handleDelete(item) {
    if (!window.confirm(`Désactiver ${item.prenom || ''} ${item.nom} ?`)) return
    try {
      setActionError('')
      await deleteUser(item.id_utilisateur)
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  const columns = [
    { key: 'name', header: 'Utilisateur', render: (item) => <div className="user-name"><UserAvatar user={item} /><strong>{item.prenom} {item.nom}</strong></div> },
    { key: 'email', header: 'Email' },
    { key: 'telephone', header: 'Téléphone' },
    { key: 'role', header: 'Rôle', render: (item) => <span className="user-role">{item.role_nom}</span> },
    { key: 'actions', header: 'Actions', render: (item) => <div className="table-actions"><button type="button" className="row-action" onClick={() => onEdit(item.id_utilisateur)}>Modifier</button><button type="button" className="row-action danger-action" onClick={() => handleDelete(item)}>Désactiver</button></div> },
  ]

  return (
    <section className="users-main">
      <Header user={user} activeItem="Utilisateurs" />
      <div className="users-heading"><div><h1>Utilisateurs</h1><p>{users.length} utilisateurs actifs</p></div><button type="button" className="primary-button" onClick={onCreate}><span aria-hidden="true">+</span>Nouvel utilisateur</button></div>
      <article className="users-panel">
        <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Rechercher par nom ou e-mail..." filters={[{ name: 'role', label: 'Rôle', value: role, onChange: setRole, options: ['Tous', 'Super Admin', 'Accueil', 'Formateur', 'Étudiant'] }]} onReset={() => { setSearch(''); setRole('Tous') }} />
        {(error || actionError) && <p className="form-error">{error || actionError}</p>}
        {isLoading ? <p className="users-loading">Chargement des utilisateurs...</p> : <Tableau columns={columns} rows={filteredUsers} rowKey="id_utilisateur" emptyMessage="Aucun utilisateur trouvé." wrapperClassName="users-table-wrap" className="users-table" />}
        <footer className="users-footer">Affichage <strong>{filteredUsers.length}</strong> sur <strong>{users.length}</strong></footer>
      </article>
    </section>
  )
}

export default Users