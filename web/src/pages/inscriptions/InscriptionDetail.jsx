import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import { useInscription } from '../../hooks/useInscription'

// Détail d'une inscription : étudiant, formation, date et statut.
function InscriptionDetail({ user, inscriptionId, onBack }) {
  const { getInscription } = useInscription()
  const [inscription, setInscription] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInscription() {
      try {
        const data = await getInscription(inscriptionId)
        setInscription(data)
      } catch (err) {
        setError(err.message)
      }
    }

    loadInscription()
  }, [inscriptionId])

  if (error) {
    return (
      <main className="gestion-page">
        <Header user={user} activeItem="Inscriptions" />
        <p className="form-error">{error}</p>
      </main>
    )
  }


  if (!inscription) {
    return (
      <main className="gestion-page">
        <Header user={user} activeItem="Inscriptions" />
        <p>Chargement...</p>
      </main>
    )
  }

  const informationItems = [
    { label: 'Etudiant', value: `${inscription.prenom_etudiant} ${inscription.nom_etudiant}` },
    { label: 'Formation', value: inscription.nom_formation },
    { label: 'Date', value: inscription.date_inscription },
    { label: 'Statut', value: inscription.valide ? 'Validée' : 'En attente' },
  ]

  return (
    <main className="gestion-page">
      <Header user={user} activeItem="Inscriptions" />

      <div className="gestion-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux inscriptions
          </button>
          <h1>Inscription #{inscription.id_inscription}</h1>
        </div>
      </div>

      <Informations title="Détails" items={informationItems} />
    </main>
  )
}

export default InscriptionDetail