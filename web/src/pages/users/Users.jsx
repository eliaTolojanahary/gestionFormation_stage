import { useState } from 'react'
import Header from '../../components/header/Header'
import Tableau from '../../components/tableau/Tableau'
import SearchFilterBar from '../../components/form/Filter'
import { useUser } from '../../hooks/useUser'
import { useListePaginee } from '../../hooks/useListePaginee'

import Avatar from '../../components/avatar/Avatar'
import { useRetour } from '../../components/retour/useRetour'
import BoutonExportCSV from '../../components/tableau/BoutonExportCSV'
import Pagination from '../../components/pagination/Pagination'
import BarreSelection from '../../components/tableau/BarreSelection'
import { useSelection, useActionsGroupees } from '../../hooks/useSelection'
import { ETATS, ETAT_DEFAUT, filtreEtat } from '../../utils/etat'
import './Users.css'

// Liste des comptes utilisateurs (Super Admin) avec recherche, filtre par rôle et filtre « État »
// (comptes actifs par défaut, désactivés ou tous), filtrée et paginée par le serveur
// (GET /utilisateurs?page=&recherche=&role=&etat=). "Désactiver" fait une suppression logique côté API,
// "Réactiver" rend l'accès au compte ; sélection multiple (clic sur les lignes) pour le faire en une fois.
function Users({ user, onCreate, onEdit }) {
  const [etat, setEtat] = useState(ETAT_DEFAUT)
  const { deleteUser, reactiverUser } = useUser('actif', { charger: false })
  const { confirmer, notifier } = useRetour()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('Tous')
  const [actionError, setActionError] = useState('')

  // Recherche (nom, prénom, e-mail, téléphone), rôle et état : envoyés au serveur
  const liste = useListePaginee('/utilisateurs', {
    recherche: search.trim(),
    role: role === 'Tous' ? '' : role,
    etat: ETATS[etat],
  })
  const { lignes: usersPage, isLoading, error } = liste

  const selection = useSelection(usersPage, 'id_utilisateur')
  // Après une action groupée, la liste est rechargée : le compte change de filtre
  const groupe = useActionsGroupees({ selection, apres: liste.recharger, setErreur: setActionError })
  // Son propre compte n'est jamais désactivé depuis la sélection
  const monId = Number(user?.id_utilisateur || user?.id)
  const aDesactiver = selection.selection.filter((item) => item.etat && Number(item.id_utilisateur) !== monId)
  const aReactiver = selection.selection.filter((item) => !item.etat)

  const actionsGroupees = [
    {
      libelle: 'Désactiver',
      danger: true,
      nombre: aDesactiver.length,
      onClick: () => groupe.lancer({
        lignes: aDesactiver,
        confirmation: {
          titre: 'Désactiver les comptes',
          message: `${aDesactiver.length} compte(s) ne pourront plus se connecter à la plateforme. Vous pourrez les réactiver avec le filtre « Désactivés ».`,
          bouton: 'Désactiver',
          danger: true,
        },
        action: (item) => deleteUser(item.id_utilisateur),
        succes: (n) => `${n} compte(s) désactivé(s)`,
      }),
    },
    {
      libelle: 'Réactiver',
      succes: true,
      nombre: aReactiver.length,
      onClick: () => groupe.lancer({
        lignes: aReactiver,
        action: (item) => reactiverUser(item.id_utilisateur),
        succes: (n) => `${n} compte(s) réactivé(s)`,
      }),
    },
  ]

  // Un changement de filtre revient à la page 1 (useListePaginee)
  function handleReset() {
    setSearch('')
    setRole('Tous')
    setEtat(ETAT_DEFAUT)
  }

  async function handleDelete(item) {
    const ok = await confirmer({
      titre: 'Désactiver le compte',
      message: `${`${item.prenom || ''} ${item.nom}`.trim()} ne pourra plus se connecter à la plateforme. Vous pourrez le réactiver avec le filtre « Désactivés ».`,
      bouton: 'Désactiver',
      danger: true,
    })
    if (!ok) return

    try {
      setActionError('')
      await deleteUser(item.id_utilisateur)
      notifier('Compte désactivé', { annuler: () => handleReactiver(item) })
      liste.recharger()
    } catch (err) {
      setActionError(err.message)
    }
  }

  async function handleReactiver(item) {
    try {
      setActionError('')
      await reactiverUser(item.id_utilisateur)
      notifier('Compte réactivé')
      liste.recharger()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Utilisateur',
      exportValue: (item) => `${item.prenom || ''} ${item.nom}`.trim(),
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
      exportValue: (item) => item.role_nom,
    },
    {
      key: 'etat',
      header: 'Statut',
      render: (item) => (
        <span className={`student-status ${item.etat ? 'actif' : 'inactif'}`}>
          {item.etat ? 'Actif' : 'Désactivé'}
        </span>
      ),
      exportValue: (item) => (item.etat ? 'Actif' : 'Désactivé'),
    },
    {
      key: 'actions',
      header: 'Actions',
      // Compte désactivé : seule action possible, le réactiver
      render: (item) => !item.etat ? (
        <div className="table-actions">
          <button type="button" className="row-action success-action" onClick={() => handleReactiver(item)}>
            Réactiver
          </button>
        </div>
      ) : (
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
          <p>{liste.total} utilisateur(s)</p>
        </div>
        <div className="heading-actions">
          <BoutonExportCSV columns={columns} charger={liste.toutesLesLignes} nomFichier="utilisateurs" />
          <button type="button" className="primary-button" onClick={onCreate}>
            <span aria-hidden="true">+</span>Nouvel utilisateur
          </button>
        </div>
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
            filtreEtat(etat, setEtat),
          ]}
          onReset={handleReset}
        />

        {(error || actionError) && <p className="form-error">{error || actionError}</p>}

        <BarreSelection selection={selection} actions={actionsGroupees} enCours={groupe.enCours} libelle="compte(s)" />

        {isLoading ? (
          <p className="users-loading">Chargement des utilisateurs...</p>
        ) : (
          <Tableau
            columns={columns}
            rows={usersPage}
            rowKey="id_utilisateur"
            selection={selection}
            emptyMessage="Aucun utilisateur trouvé."
            wrapperClassName="users-table-wrap"
            className="users-table"
          />
        )}

        <Pagination
          page={liste.page}
          pages={liste.pages}
          total={liste.total}
          limite={liste.limite}
          onChange={liste.setPage}
          libelle="utilisateur(s)"
        />
      </article>
    </section>
  )
}

export default Users