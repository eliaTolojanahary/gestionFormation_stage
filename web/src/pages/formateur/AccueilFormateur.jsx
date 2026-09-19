import { useEffect, useRef, useState } from 'react'
import Header from '../../components/header/Header'
import Icon from '../../components/icon/Icon'
import { useFormation } from '../../hooks/useFormation'
import { useSupport } from '../../hooks/useSupport'
import { useReaction } from '../../hooks/useReaction'
import { getFileUrl } from '../../utils/files'
import './AccueilFormateur.css'


const reactionOptions = [
  { id: 1, name: 'like', label: 'J’aime', icon: '👍' },
  { id: 2, name: 'coeur', label: 'J’adore', icon: '❤️' },
  { id: 3, name: 'utile', label: 'Utile', icon: '💡' },
]

function SupportItem({ support, onComment, commentBusy, userId }) {
  const { getCommentaires, createCommentaire } = useSupport()
  const { getReactions, react, removeReaction, isLoading: reactionBusy } = useReaction()
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    getCommentaires(support.id_support).then(setComments)
    getReactions(support.id_support).then(setReactions)
  }, [support.id_support])

  async function handleReaction(reactionId) {
    const ownReaction = reactions.find((reaction) => Number(reaction.id_utilisateur) === Number(userId))
    const reactionName = reactionOptions.find((item) => item.id === reactionId)?.name
    const nextReactions = ownReaction?.type_reaction === reactionName
      ? await removeReaction(support.id_support)
      : await react(support.id_support, reactionId)
    setReactions(nextReactions)
  }

  async function submitComment(event) {
    event.preventDefault()
    if (!draft.trim()) return
    await createCommentaire(support.id_support, draft.trim())
    setDraft('')
    setComments(await getCommentaires(support.id_support))
    onComment?.()
  }

  return (
    <article className="workspace-panel support-card">
      <div className="panel-heading">
        <div>
          <h3>{support.titre}</h3>
          <small>{support.date_publication ? new Date(support.date_publication).toLocaleDateString('fr-FR') : 'Support récent'}</small>
        </div>
        <a className="secondary-button" href={getFileUrl(support.fichier)} target="_blank" rel="noreferrer">Ouvrir</a>
      </div>

      <div className="reaction-list" aria-label="Réactions">
        {reactionOptions.map((option) => {
          const count = reactions.filter((reaction) => reaction.type_reaction === option.name).length
          const selected = reactions.some((reaction) => Number(reaction.id_utilisateur) === Number(userId) && reaction.type_reaction === option.name)
          return (
            <button
              className={`reaction-button ${selected ? 'selected' : ''}`}
              type="button"
              key={option.id}
              onClick={() => handleReaction(option.id)}
              disabled={reactionBusy}
            >
              {option.icon} <span>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="muted-text">Aucun commentaire.</p>
        ) : (
          comments.map((comment) => (
            <div className="comment-row" key={comment.id_commentaire}>
              <strong>{comment.prenom} {comment.nom}</strong>
              <p>{comment.contenu}</p>
            </div>
          ))
        )}
      </div>

      <form className="comment-form" onSubmit={submitComment}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ajouter un commentaire..." />
        <button className="primary-button" type="submit" disabled={commentBusy}><Icon name="send" /></button>
      </form>
    </article>
  )
}

function AccueilFormateur({ user }) {
  const { formations, isLoading, error, getEtudiants } = useFormation()
  const { getSupports, uploadSupport, isLoading: supportLoading, error: supportError } = useSupport()
  const [supports, setSupports] = useState([])
  const [studentsByFormation, setStudentsByFormation] = useState({})
  const [selectedFormation, setSelectedFormation] = useState('')
  const [title, setTitle] = useState('')
  const fileRef = useRef(null)

  const userId = user?.id_utilisateur || user?.id
  const ownFormations = formations.filter((formation) => Number(formation.id_utilisateur) === Number(userId))

  useEffect(() => {
    async function loadSupports() {
      const groups = await Promise.all(ownFormations.map((formation) => getSupports(formation.id_formation)))
      setSupports(groups.flat())
      const studentGroups = await Promise.all(ownFormations.map(async (formation) => [formation.id_formation, await getEtudiants(formation.id_formation)]))
      setStudentsByFormation(Object.fromEntries(studentGroups))
    }
    if (ownFormations.length) loadSupports()
  }, [formations.length, userId])

  async function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file || !selectedFormation) return
    const formData = new FormData()
    formData.append('id_formation', selectedFormation)
    formData.append('titre', title.trim() || file.name)
    formData.append('fichier', file)
    await uploadSupport(formData)
    setTitle('')
    event.target.value = ''
    const groups = await Promise.all(ownFormations.map((formation) => getSupports(formation.id_formation)))
    setSupports(groups.flat())
  }

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Espace formateur" />
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Espace formateur</span>
          <h1>Mes formations et supports</h1>
          <p>Retrouvez vos étudiants, vos supports et les échanges associés.</p>
        </div>
      </div>

      {(error || supportError) && <p className="form-error">{error || supportError}</p>}

      <div className="workspace-panel">
        <div className="panel-heading">
          <div>
            <h2>Mes formations</h2>
            <p>{ownFormations.length} formation(s) attribuée(s)</p>
          </div>
        </div>
        {isLoading ? (
          <p>Chargement...</p>
        ) : ownFormations.length === 0 ? (
          <p className="muted-text">Aucune formation ne vous est attribuée.</p>
        ) : (
          <div className="formation-list">
            {ownFormations.map((formation) => (
              <article className="formation-row" key={formation.id_formation}>
                <strong>{formation.nom}</strong>
                <span>{formation.description || 'Aucune description.'}</span>
                <small>{(studentsByFormation[formation.id_formation] || []).length} étudiant(s)</small>
                {(studentsByFormation[formation.id_formation] || []).map((student) => (
                  <span key={student.id_etudiant}>{student.prenom} {student.nom}</span>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="workspace-panel support-upload-panel">
        <div className="panel-heading">
          <div>
            <h2>Déposer un support</h2>
            <p>Les supports sont visibles par les étudiants inscrits.</p>
          </div>
          <Icon name="upload" />
        </div>
        <select value={selectedFormation} onChange={(event) => setSelectedFormation(event.target.value)}>
          <option value="">Choisir une formation</option>
          {ownFormations.map((formation) => (
            <option key={formation.id_formation} value={formation.id_formation}>{formation.nom}</option>
          ))}
        </select>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre du support" />
        <input ref={fileRef} type="file" onChange={handleUpload} disabled={!selectedFormation || supportLoading} />
      </div>

      <div className="support-list">
        <h2>Supports et commentaires</h2>
        {supports.length === 0 ? (
          <p className="muted-text">Aucun support publié.</p>
        ) : (
          supports.map((support) => (
            <SupportItem
              key={support.id_support}
              support={support}
              userId={userId}
              commentBusy={supportLoading}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default AccueilFormateur