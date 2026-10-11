import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import Etudiants from '../etudiants/Etudiants'
import EtudiantDetail from '../etudiants/EtudiantDetail'
import EtudiantForm from '../etudiants/EtudiantForm'
import Users from '../users/Users'
import UserForm from '../users/UserForm'
import Formations from '../formations/Formations'
import FormationDetail from '../formations/FormationDetail'
import FormationForm from '../formations/FormationForm'
import Inscriptions from '../inscriptions/Inscriptions'
import InscriptionDetail from '../inscriptions/InscriptionDetail'
import InscriptionForm from '../inscriptions/InscriptionForm'
import { CHEMINS } from '../../utils/navigation'

// Sous-routes des sections « liste / fiche / formulaire » : chaque vue a sa propre URL
// (ex. /dashboard/etudiants/12, /dashboard/formations/3/modifier). Un rechargement (F5) garde
// la fiche ouverte, le bouton « Précédent » du navigateur fonctionne et un lien peut être partagé.

// Identifiant de l'URL ; une valeur non numérique (ex. /etudiants/abc) renvoie à la liste
function useIdUrl() {
  const { id } = useParams()
  return /^\d+$/.test(id || '') ? Number(id) : null
}

// Fiche ou formulaire dont l'id de l'URL est invalide : retour à la liste
function AvecId({ liste, children }) {
  const id = useIdUrl()
  return id ? children(id) : <Navigate to={liste} replace />
}

export function EtudiantsRoutes({ user }) {
  const navigate = useNavigate()
  const liste = () => navigate(CHEMINS.etudiants)
  return (
    <Routes>
      <Route
        index
        element={
          <Etudiants
            user={user}
            onCreate={() => navigate(`${CHEMINS.etudiants}/nouveau`)}
            onDetail={(id) => navigate(CHEMINS.etudiant(id))}
            onEdit={(id) => navigate(CHEMINS.modifierEtudiant(id))}
          />
        }
      />
      <Route path="nouveau" element={<EtudiantForm user={user} onBack={liste} onSaved={liste} />} />
      <Route
        path=":id"
        element={
          <AvecId liste={CHEMINS.etudiants}>
            {(id) => (
              <EtudiantDetail
                key={id}
                user={user}
                studentId={id}
                onBack={liste}
                onEdit={(studentId) => navigate(CHEMINS.modifierEtudiant(studentId))}
              />
            )}
          </AvecId>
        }
      />
      <Route
        path=":id/modifier"
        element={
          <AvecId liste={CHEMINS.etudiants}>
            {(id) => (
              <EtudiantForm
                key={id}
                user={user}
                studentId={id}
                onBack={() => navigate(CHEMINS.etudiant(id))}
                onSaved={() => navigate(CHEMINS.etudiant(id))}
              />
            )}
          </AvecId>
        }
      />
      <Route path="*" element={<Navigate to={CHEMINS.etudiants} replace />} />
    </Routes>
  )
}

export function UtilisateursRoutes({ user }) {
  const navigate = useNavigate()
  const liste = () => navigate(CHEMINS.utilisateurs)
  return (
    <Routes>
      <Route
        index
        element={
          <Users
            user={user}
            onCreate={() => navigate(`${CHEMINS.utilisateurs}/nouveau`)}
            onEdit={(id) => navigate(CHEMINS.modifierUtilisateur(id))}
          />
        }
      />
      <Route path="nouveau" element={<UserForm user={user} onBack={liste} onSaved={liste} />} />
      <Route
        path=":id/modifier"
        element={
          <AvecId liste={CHEMINS.utilisateurs}>
            {(id) => <UserForm key={id} user={user} userId={id} onBack={liste} onSaved={liste} />}
          </AvecId>
        }
      />
      <Route path="*" element={<Navigate to={CHEMINS.utilisateurs} replace />} />
    </Routes>
  )
}

export function FormationsRoutes({ user }) {
  const navigate = useNavigate()
  const liste = () => navigate(CHEMINS.formations)
  return (
    <Routes>
      <Route
        index
        element={
          <Formations
            user={user}
            onCreate={() => navigate(`${CHEMINS.formations}/nouvelle`)}
            onDetail={(id) => navigate(CHEMINS.formation(id))}
            onEdit={(id) => navigate(CHEMINS.modifierFormation(id))}
          />
        }
      />
      <Route path="nouvelle" element={<FormationForm user={user} onBack={liste} onSaved={liste} />} />
      <Route
        path=":id"
        element={
          <AvecId liste={CHEMINS.formations}>
            {(id) => (
              <FormationDetail
                key={id}
                user={user}
                formationId={id}
                onBack={liste}
                onEdit={(formationId) => navigate(CHEMINS.modifierFormation(formationId))}
              />
            )}
          </AvecId>
        }
      />
      <Route
        path=":id/modifier"
        element={
          <AvecId liste={CHEMINS.formations}>
            {(id) => (
              <FormationForm
                key={id}
                user={user}
                formationId={id}
                onBack={() => navigate(CHEMINS.formation(id))}
                onSaved={() => navigate(CHEMINS.formation(id))}
              />
            )}
          </AvecId>
        }
      />
      <Route path="*" element={<Navigate to={CHEMINS.formations} replace />} />
    </Routes>
  )
}

export function InscriptionsRoutes({ user }) {
  const navigate = useNavigate()
  const liste = () => navigate(CHEMINS.inscriptions)
  return (
    <Routes>
      <Route
        index
        element={
          <Inscriptions
            user={user}
            onCreate={() => navigate(`${CHEMINS.inscriptions}/nouvelle`)}
            onDetail={(id) => navigate(CHEMINS.inscription(id))}
          />
        }
      />
      <Route path="nouvelle" element={<InscriptionForm user={user} onBack={liste} onSaved={liste} />} />
      <Route
        path=":id"
        element={
          <AvecId liste={CHEMINS.inscriptions}>
            {(id) => <InscriptionDetail key={id} user={user} inscriptionId={id} onBack={liste} />}
          </AvecId>
        }
      />
      <Route path="*" element={<Navigate to={CHEMINS.inscriptions} replace />} />
    </Routes>
  )
}
