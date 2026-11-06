import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import DocumentAffichage from '../../components/doc/DocumentAffichage'
import { useInscription } from '../../hooks/useInscription'
import { dependanceDesactivee } from '../../utils/etat'
import './Inscriptions.css'

// Détail d'une inscription : étudiant, formation, date, statut et dossier de l'étudiant (4 pièces,
// chacune affichée ou « Non fourni »). Inscription en ligne : validation refusée tant qu'il manque une pièce.
// Étudiant ou formation désactivés : bandeau d'avertissement (les actions seront refusées).
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
    {
      label: 'Statut',
      value: inscription.statut === 'reussi'
        ? 'Réussie (attestation délivrée)'
        : inscription.valide ? 'Validée' : 'En attente',
    },
    { label: 'Origine', value: inscription.origine === 'en_ligne' ? 'En ligne (mobile)' : 'Accueil' },
  ]

  const dossier = inscription.dossier
  const manquantes = dossier ? dossier.pieces.filter((p) => !p.fichier) : []

  return (
    <main className="gestion-page">
      <Header user={user} activeItem="Inscriptions" />

      <div className="gestion-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux inscriptions
          </button>
          <div className="inscription-detail-titre">
            <h1>Inscription #{inscription.id_inscription}</h1>
            {/* Badge du dossier : vert si les 4 pièces sont déposées, orange sinon */}
            {dossier && (
              <span className={`inscription-dossier ${dossier.complet ? 'complet' : 'incomplet'}`}>
                Dossier {dossier.complet ? 'complet' : 'incomplet'} · {dossier.fournies}/{dossier.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {dependanceDesactivee(inscription) && (
        <p className="etat-alerte" role="alert">
          {dependanceDesactivee(inscription)}. Réactivez cet élément (filtre « Désactivés » de sa page) avant
          de valider, payer ou générer un document sur cette inscription.
        </p>
      )}

      <Informations title="Détails" items={informationItems} />

      {dossier && (
        <Informations title={`Dossier de l'étudiant : ${dossier.fournies}/${dossier.total}`}>
          {dossier.complet ? (
            <p className="dossier-message complet">Dossier complet : toutes les pièces sont déposées.</p>
          ) : (
            <p className="dossier-message incomplet">
              Manquant : {manquantes.map((p) => p.libelle).join(', ')}.{' '}
              {inscription.origine === 'en_ligne'
                ? "Validation impossible tant que l'étudiant ne les a pas déposées."
                : "Pièces à ajouter depuis la fiche de l'étudiant (Modifier)."}
            </p>
          )}
          <div className="document-list">
            {dossier.pieces.map((piece) => (
              <DocumentAffichage key={piece.champ} label={piece.libelle} path={piece.fichier} />
            ))}
          </div>
        </Informations>
      )}
    </main>
  )
}

export default InscriptionDetail