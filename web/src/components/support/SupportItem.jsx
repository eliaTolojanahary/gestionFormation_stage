import { useEffect, useState } from 'react'
import Icon from '../icon/Icon'
import Avatar from '../avatar/Avatar'
import ContenuSupport from './ContenuSupport'
import ChampMention from './ChampMention'
import { useRetour } from '../retour/useRetour'
import { mentionsDuTexte } from '../../utils/mentions'
import { useSupport } from '../../hooks/useSupport'
import { useReaction } from '../../hooks/useReaction'
import { formatRelative } from '../../utils/time'
import './SupportItem.css'

// Types de réaction : name = nom du type en base (envoyé à l'API et renvoyé par elle)
const reactionOptions = [
  { name: 'like', label: 'J’aime', icon: '👍' },
  { name: 'coeur', label: 'J’adore', icon: '❤️' },
  { name: 'utile', label: 'Utile', icon: '💡' },
  { name: 'dislike', label: 'Je n’aime pas', icon: '👎' },
]

// Commentaires principaux demandés au serveur à chaque « Voir plus de commentaires »
const COMMENTAIRES_PAR_PAGE = 3

// Un commentaire (principal ou réponse) : bulle, date, Répondre, Supprimer
function CommentRow({ comment, isReply, canDelete, onReply, onDelete, children }) {
  return (
    <div className={`comment-row ${isReply ? 'comment-reply' : ''}`}>
      <Avatar
        photo={comment.photo}
        prenom={comment.prenom}
        nom={comment.nom}
        size="sm"
        shape="circle"
      />

      <div className="comment-content">
        <div className="comment-bubble">
          <strong className="comment-author">
            {comment.prenom} {comment.nom}
          </strong>
          <p className="comment-text">{comment.contenu}</p>
        </div>

        <div className="comment-footer">
          <small>{formatRelative(comment.date_commentaire)}</small>
          <button type="button" className="comment-link" onClick={() => onReply(comment)}>
            Répondre
          </button>
          {canDelete && (
            <button type="button" className="comment-delete" onClick={() => onDelete(comment)}>
              Supprimer
            </button>
          )}
        </div>

        {children}
      </div>
    </div>
  )
}

// Carte d'un support de cours, façon publication de réseau social : auteur, texte mis en forme et
// pièce jointe (lecteur audio / vidéo, ou lien vers le PDF / l'image),
// réactions, commentaires principaux avec leurs réponses (« Voir les réponses ») et formulaire.
function SupportItem({
  support,
  onComment,
  onSupportDeleted,
  commentBusy,
  userId,
  userRole,
  currentUser,
  canDeleteSupport = false,
}) {
  const { pageCommentaires, createCommentaire, deleteCommentaire, deleteSupport } = useSupport()
  const { getReactions, react, removeReaction, isLoading: reactionBusy } = useReaction()
  const { confirmer } = useRetour()

  // comments = commentaires principaux, chacun avec `reponses` (fil renvoyé par l'API)
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])
  const [draft, setDraft] = useState('')
  const [commentError, setCommentError] = useState('')
  const [isDeletingSupport, setIsDeletingSupport] = useState(false)
  // Pagination du fil par le serveur : curseur de la page suivante (null = fin) et totaux
  const [fil, setFil] = useState({ suivant: null, total: 0, totalEchanges: 0 })
  // Commentaires principaux dont les réponses sont dépliées
  const [openReplies, setOpenReplies] = useState(() => new Set())
  // Réponse en cours : { id: commentaire principal, auteur } ; null = nouveau commentaire principal
  const [replyTo, setReplyTo] = useState(null)
  const [replyDraft, setReplyDraft] = useState('')

  // Page de commentaires : ajoutée à la suite (« Voir plus »), ou remplace tout (première page)
  function appliquerPage(page, ajouter) {
    setComments((actuels) => (ajouter ? [...actuels, ...page.elements] : page.elements))
    setFil({ suivant: page.suivant, total: page.total, totalEchanges: page.totalEchanges })
  }

  async function rechargerCommentaires() {
    appliquerPage(await pageCommentaires(support.id_support, null, COMMENTAIRES_PAR_PAGE), false)
  }

  async function voirPlusCommentaires() {
    try {
      appliquerPage(await pageCommentaires(support.id_support, fil.suivant, COMMENTAIRES_PAR_PAGE), true)
    } catch (err) {
      setCommentError(err.message || 'Impossible de charger les commentaires.')
    }
  }

  // Charge la première page de commentaires et les réactions du support. `cancelled` évite de
  // mettre à jour un composant déjà démonté si la réponse arrive trop tard.
  useEffect(() => {
    let cancelled = false

    Promise.all([
      pageCommentaires(support.id_support, null, COMMENTAIRES_PAR_PAGE),
      getReactions(support.id_support),
    ])
      .then(([page, reactionsData]) => {
        if (cancelled) return
        appliquerPage(page, false)
        setReactions(reactionsData)
      })
      .catch(() => {})

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [support.id_support])

  /* ---------- Réactions ---------- */
  // Recliquer sur sa propre réaction la retire ; sinon elle est ajoutée ou remplacée
  async function handleReaction(reactionName) {
    const ownReaction = reactions.find(
      (reaction) => Number(reaction.id_utilisateur) === Number(userId)
    )

    const nextReactions =
      ownReaction?.type_reaction === reactionName
        ? await removeReaction(support.id_support)
        : await react(support.id_support, reactionName)

    setReactions(nextReactions)
  }

  /* ---------- Commentaires ---------- */
  // Mention « @ » : le formateur de la formation et le Super Admin (même règle que l'API)
  const peutMentionner = userRole === 'Super Admin' || (userRole === 'Formateur' && canDeleteSupport)

  async function publish(contenu, idParent = null) {
    setCommentError('')
    if (!contenu.trim()) return false

    try {
      const mentions = peutMentionner ? await mentionsDuTexte(contenu, support.id_formation) : []
      await createCommentaire(support.id_support, contenu.trim(), mentions, idParent)
      await rechargerCommentaires()
      if (onComment) onComment()
      return true
    } catch (err) {
      setCommentError(err.message || "Impossible d'ajouter le commentaire.")
      return false
    }
  }

  async function submitComment(event) {
    event.preventDefault()
    if (await publish(draft)) setDraft('')
  }

  async function submitReply(event) {
    event.preventDefault()
    if (!(await publish(replyDraft, replyTo.id))) return
    // Les réponses du commentaire restent dépliées pour voir la nouvelle réponse
    setOpenReplies((current) => new Set(current).add(replyTo.id))
    setReplyTo(null)
    setReplyDraft('')
  }

  // Répondre à un commentaire principal ou à une réponse : la réponse va toujours
  // sous le commentaire principal (un seul niveau), avec « @Prénom Nom » pour une réponse
  function startReply(comment) {
    const idPrincipal = comment.id_parent || comment.id_commentaire
    const auteur = `${comment.prenom || ''} ${comment.nom || ''}`.trim()
    setReplyTo({ id: idPrincipal, auteur })
    setReplyDraft(comment.id_parent && auteur ? `@${auteur} ` : '')
  }

  function toggleReplies(idCommentaire) {
    setOpenReplies((current) => {
      const next = new Set(current)
      if (next.has(idCommentaire)) next.delete(idCommentaire)
      else next.add(idCommentaire)
      return next
    })
  }

  async function handleDeleteComment(comment) {
    const ok = await confirmer({
      titre: 'Supprimer le commentaire',
      message: comment.nb_reponses
        ? 'Ce commentaire et toutes ses réponses seront définitivement supprimés.'
        : 'Ce commentaire sera définitivement supprimé.',
      bouton: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCommentaire(comment.id_commentaire)
      await rechargerCommentaires()
    } catch (err) {
      setCommentError(err.message || 'Impossible de supprimer le commentaire.')
    }
  }

  async function handleDeleteSupport() {
    const ok = await confirmer({
      titre: 'Supprimer le support',
      message: `« ${support.titre} » sera définitivement supprimé, avec ses commentaires. Les étudiants n'y auront plus accès.`,
      bouton: 'Supprimer',
      danger: true,
    })
    if (!ok) return
    setIsDeletingSupport(true)
    try {
      await deleteSupport(support.id_support)
      if (onSupportDeleted) onSupportDeleted(support.id_support)
    } catch (err) {
      setCommentError(err.message || 'Impossible de supprimer le support.')
      setIsDeletingSupport(false)
    }
  }

  // Affichage du bouton Supprimer (mêmes règles que l'API) : Super Admin toujours,
  // formateur sur ses formations, étudiant sur ses propres commentaires
  function canDeleteComment(comment) {
    if (userRole === 'Super Admin') return true
    if (userRole === 'Formateur' && canDeleteSupport) return true
    if (userRole === 'Étudiant' && Number(comment.id_utilisateur_auteur) === Number(userId)) return true
    return false
  }

  /* ---------- Calculs ---------- */
  // Pour chaque type : nombre de réactions et si l'utilisateur connecté l'a choisi
  const reactionCounts = reactionOptions.map((opt) => ({
    ...opt,
    count: reactions.filter((r) => r.type_reaction === opt.name).length,
    selected: reactions.some(
      (r) => Number(r.id_utilisateur) === Number(userId) && r.type_reaction === opt.name
    ),
  }))

  const totalReactions = reactions.length
  const activeReactionIcons = reactionOptions
    .filter((opt) => reactions.some((r) => r.type_reaction === opt.name))
    .map((opt) => opt.icon)

  // Total des échanges (commentaires principaux + réponses) de tout le fil, donné par le serveur
  const totalComments = fil.totalEchanges
  const visibleComments = comments
  const hiddenCount = fil.suivant ? Math.max(0, fil.total - comments.length) : 0

  return (
    <article className="support-card">
      <header className="support-card-header">
        <Avatar
          photo={support.prof_photo}
          prenom={support.prof_prenom}
          nom={support.prof_nom }
          size="md"
          shape="circle"
        />
        <div className="support-card-author">
          <strong>
            {support.prof_prenom || ''}
          </strong>
          <small>
            {support.date_publication
              ? formatRelative(support.date_publication)
              : 'Support récent'}
          </small>
        </div>

        {canDeleteSupport && (
          <button
            type="button"
            className="support-menu-btn"
            onClick={handleDeleteSupport}
            disabled={isDeletingSupport}
            title="Supprimer le support"
            aria-label="Supprimer le support"
          >
            <Icon name="trash" />
          </button>
        )}
      </header>

      {/* ==================== CONTENU ==================== */}
      <div className="support-card-body">
        <h3 className="support-card-title">{support.titre}</h3>

        <ContenuSupport support={support} />
      </div>

      {/* ==================== STATS ==================== */}
      {(totalReactions > 0 || totalComments > 0) && (
        <div className="support-card-stats">
          <span className="stats-reactions">
            {activeReactionIcons.map((icon, i) => (
              <span key={i} className="stats-emoji">{icon}</span>
            ))}
            <span className="stats-count">{totalReactions}</span>
          </span>
          <span className="stats-comments">
            {totalComments} commentaire{totalComments > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ==================== BARRE D'ACTIONS ==================== */}
      <div className="support-card-actions">
        {reactionCounts.map((option) => (
          <button
            key={option.name}
            className={`action-btn ${option.selected ? 'active' : ''}`}
            type="button"
            onClick={() => handleReaction(option.name)}
            disabled={reactionBusy}
            title={option.label}
          >
            <span className="action-icon">{option.icon}</span>
            <span className="action-label">{option.label}</span>
            {option.count > 0 && <span className="action-count">{option.count}</span>}
          </button>
        ))}
      </div>

      {/* ==================== COMMENTAIRES ==================== */}
      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="comment-empty">Soyez le premier à commenter.</p>
        ) : (
          visibleComments.map((comment) => {
            const repliesOpen = openReplies.has(comment.id_commentaire)
            const nbReplies = comment.nb_reponses || 0

            return (
              <CommentRow
                key={comment.id_commentaire}
                comment={comment}
                canDelete={canDeleteComment(comment)}
                onReply={startReply}
                onDelete={handleDeleteComment}
              >
                {nbReplies > 0 && (
                  <button
                    type="button"
                    className="comment-toggle-replies"
                    onClick={() => toggleReplies(comment.id_commentaire)}
                  >
                    {repliesOpen
                      ? 'Masquer les réponses'
                      : `Voir ${nbReplies > 1 ? `les ${nbReplies} réponses` : 'la réponse'}`}
                  </button>
                )}

                {repliesOpen && (
                  <div className="comment-replies">
                    {comment.reponses.map((reply) => (
                      <CommentRow
                        key={reply.id_commentaire}
                        comment={reply}
                        isReply
                        canDelete={canDeleteComment(reply)}
                        onReply={startReply}
                        onDelete={handleDeleteComment}
                      />
                    ))}
                  </div>
                )}

                {replyTo?.id === comment.id_commentaire && (
                  <form className="comment-form comment-reply-form" onSubmit={submitReply}>
                    <ChampMention
                      value={replyDraft}
                      onChange={setReplyDraft}
                      peutMentionner={peutMentionner}
                      idFormation={support.id_formation}
                      placeholder={`Répondre à ${replyTo.auteur || 'ce commentaire'}…`}
                      disabled={commentBusy}
                      autoFocus
                    />
                    <button
                      className="comment-submit"
                      type="submit"
                      disabled={commentBusy || !replyDraft.trim()}
                    >
                      Répondre
                    </button>
                    <button type="button" className="comment-link" onClick={() => setReplyTo(null)}>
                      Annuler
                    </button>
                  </form>
                )}
              </CommentRow>
            )
          })
        )}

        {hiddenCount > 0 && (
          <button
            type="button"
            className="comment-more"
            onClick={voirPlusCommentaires}
          >
            Voir plus de commentaires ({hiddenCount})
          </button>
        )}
      </div>

      {/* ==================== FORMULAIRE ==================== */}
      <form className="comment-form" onSubmit={submitComment}>
        <Avatar
          photo={currentUser?.photo}
          prenom={currentUser?.prenom}
          nom={currentUser?.nom}
          size="sm"
          shape="circle"
        />
        <ChampMention
          value={draft}
          onChange={setDraft}
          peutMentionner={peutMentionner}
          idFormation={support.id_formation}
          placeholder={peutMentionner ? 'Écrire un commentaire… (@ pour mentionner un étudiant)' : 'Écrire un commentaire…'}
          disabled={commentBusy}
        />
        <button
          className="comment-submit"
          type="submit"
          disabled={commentBusy || !draft.trim()}
        >
          Publier
        </button>
      </form>

      {commentError && <p className="form-error">{commentError}</p>}
    </article>
  )
}

export default SupportItem
