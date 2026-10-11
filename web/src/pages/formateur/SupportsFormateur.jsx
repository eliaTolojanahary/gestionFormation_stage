import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header/Header'
import Icon from '../../components/icon/Icon'
import ListeSupports from '../../components/support/ListeSupports'
import EditeurTexte from '../../components/editeur/EditeurTexte'
import { useFormation } from '../../hooks/useFormation'
import { useSupport } from '../../hooks/useSupport'
import { toDatetimeLocal } from '../../utils/time'
import { ACCEPT_SUPPORT, contenuVide } from '../../utils/texteRiche'
import './SupportsFormateur.css'

// Page « Supports » du formateur : rédaction / dépôt d'un support (texte mis en forme, PDF, image,
// audio, vidéo ; envoi immédiat ou programmé) et supports publiés avec réactions et commentaires
// (recherche, filtres et tri : ListeSupports). Les brouillons programmés ont leur propre page.
function SupportsFormateur({ user }) {
  const navigate = useNavigate()
  const { formations, error } = useFormation()
  const { getSupports, uploadSupport, isLoading: supportLoading, error: supportError } = useSupport()

  const [supports, setSupports] = useState([])
  const [selectedFormation, setSelectedFormation] = useState('')
  const [title, setTitle] = useState('')
  // Texte mis en forme (HTML de l'éditeur) ; le fichier est facultatif s'il y a un texte
  const [contenu, setContenu] = useState('')
  const [file, setFile] = useState(null)
  // Envoi programmé : vide = envoi immédiat
  const [programmer, setProgrammer] = useState(false)
  const [dateEnvoi, setDateEnvoi] = useState('')
  // Confirmation après envoi : 'envoye' | 'programme' | ''
  const [confirmation, setConfirmation] = useState('')
  const fileRef = useRef(null)

  const userId = user?.id_utilisateur || user?.id
  const ownFormations = formations.filter(
    (formation) => Number(formation.id_utilisateur) === Number(userId)
  )

  // Supports publiés de toutes les formations du formateur
  async function chargerSupports() {
    const groupes = await Promise.all(
      ownFormations.map((formation) => getSupports(formation.id_formation))
    )
    setSupports(groupes.flat())
  }

  useEffect(() => {
    if (!ownFormations.length) return
    let cancelled = false

    async function chargerInitial() {
      const groupes = await Promise.all(
        ownFormations.map((formation) => getSupports(formation.id_formation))
      )
      if (!cancelled) setSupports(groupes.flat())
    }

    chargerInitial()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formations.length, userId])

  // Un support = un texte, un fichier, ou les deux ; sans fichier, le titre est obligatoire
  const aUnTexte = !contenuVide(contenu)
  const supportComplet = Boolean(selectedFormation) && (Boolean(file) || (aUnTexte && Boolean(title.trim())))

  // Envoi d'un support : envoyé tout de suite, ou programmé à l'heure choisie (brouillon modifiable jusque-là)
  async function handleUpload(event) {
    event.preventDefault()
    if (!supportComplet) return
    if (programmer && !dateEnvoi) return

    const formData = new FormData()
    formData.append('id_formation', selectedFormation)
    formData.append('titre', title.trim() || file.name)
    if (aUnTexte) formData.append('contenu', contenu)
    if (file) formData.append('fichier', file)
    // Heure locale du navigateur convertie en ISO : le serveur reçoit l'instant exact
    if (programmer) formData.append('date_envoi_prevue', new Date(dateEnvoi).toISOString())

    try {
      await uploadSupport(formData)
      setConfirmation(programmer ? 'programme' : 'envoye')
      setTitle('')
      setContenu('')
      setFile(null)
      setProgrammer(false)
      setDateEnvoi('')
      if (fileRef.current) fileRef.current.value = ''
      if (!programmer) await chargerSupports()
    } catch {
      // l'erreur est déjà exposée via supportError, affichée plus haut dans le rendu
    }
  }

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Supports" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Espace formateur</span>
          <h1>Supports</h1>
          <p>Publiez vos supports de cours et suivez les réactions et commentaires des étudiants.</p>
        </div>
      </div>

      {(error || supportError) && <p className="form-error">{error || supportError}</p>}

      <form className="workspace-panel support-upload-panel" onSubmit={handleUpload}>
        <div className="panel-heading">
          <div>
            <h2>Publier un support</h2>
            <p>
              Rédigez un texte mis en forme (gras, titres, listes, liens) et / ou joignez un PDF, une image,
              un audio ou une vidéo (50 Mo max). Envoyé tout de suite, ou programmé : les étudiants sont
              prévenus une heure avant, puis le support est envoyé automatiquement à l'heure choisie.
            </p>
          </div>
          <Icon name="upload" />
        </div>

        {confirmation && (
          <p className="form-message success" role="status">
            {confirmation === 'programme' ? (
              <>
                Support programmé.{' '}
                <button type="button" className="supports-lien" onClick={() => navigate('/dashboard/programmes')}>
                  Voir les supports programmés
                </button>
              </>
            ) : (
              'Support envoyé aux étudiants.'
            )}
          </p>
        )}

        <select
          value={selectedFormation}
          onChange={(event) => { setSelectedFormation(event.target.value); setConfirmation('') }}
        >
          <option value="">Choisir une formation</option>
          {ownFormations.map((formation) => (
            <option key={formation.id_formation} value={formation.id_formation}>
              {formation.nom}
            </option>
          ))}
        </select>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={file ? 'Titre du support (nom du fichier par défaut)' : 'Titre du support'}
        />

        <EditeurTexte
          value={contenu}
          onChange={setContenu}
          placeholder="Rédigez votre support : consignes, résumé du cours, liens utiles…"
          disabled={!selectedFormation || supportLoading}
        />

        <label className="support-fichier">
          <span>Pièce jointe (facultative) : PDF, image, audio ou vidéo</span>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_SUPPORT}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            disabled={!selectedFormation || supportLoading}
          />
        </label>

        <label className="support-programmer">
          <input
            type="checkbox"
            checked={programmer}
            onChange={(event) => setProgrammer(event.target.checked)}
          />
          Programmer l'envoi
        </label>

        {programmer && (
          <input
            type="datetime-local"
            value={dateEnvoi}
            min={toDatetimeLocal(new Date())}
            onChange={(event) => setDateEnvoi(event.target.value)}
            aria-label="Date et heure d'envoi"
            required
          />
        )}

        <button
          type="submit"
          className="primary-button"
          disabled={!supportComplet || (programmer && !dateEnvoi) || supportLoading}
        >
          {programmer ? "Programmer l'envoi" : 'Envoyer maintenant'}
        </button>
      </form>

      <ListeSupports
        supports={supports}
        formations={ownFormations}
        user={user}
        userId={userId}
        commentBusy={supportLoading}
        onSupportDeleted={(deletedId) => {
          setSupports((prev) => prev.filter((s) => s.id_support !== deletedId))
        }}
      />
    </section>
  )
}

export default SupportsFormateur
