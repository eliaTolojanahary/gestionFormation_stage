import { useState } from 'react'
import Header from '../../components/header/Header'
import CommentairesFormateurs from '../../components/dashboard/CommentairesFormateurs'
import CommentairesRestants from './CommentairesRestants'
import '../../components/dashboard/DashboardContent.css'
import '../../components/dashboard/AvisFormateurs.css'
import './Formateurs.css'

// Page « Formateurs » (Super Admin, Accueil) : travail sur les commentaires de fin de formation.
// À ne pas confondre avec pages/formateur/ (l'espace du formateur lui-même).
//  - ce qui reste avant la note des commentaires de chaque formateur (étudiants sans commentaire,
//    commentaires à noter) ;
//  - la notation des commentaires sur 10.
// Le classement sur 20 est sur le tableau de bord (AvisFormateurs).
function Formateurs({ user }) {
  const [versionNotes, setVersionNotes] = useState(0) // un commentaire noté relit « ce qui reste »

  return (
    <section className="gestion-page">
      <Header user={user} activeItem="Formateurs" />

      <div className="gestion-heading">
        <div>
          <h1>Formateurs</h1>
          <p>Commentaires de fin de formation écrits par les étudiants : ce qui reste et notation sur 10.</p>
        </div>
      </div>

      <div className="formateurs-contenu">
        <CommentairesRestants version={versionNotes} />
        <CommentairesFormateurs onNote={() => setVersionNotes((version) => version + 1)} />
      </div>
    </section>
  )
}

export default Formateurs
