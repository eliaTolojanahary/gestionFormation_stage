import { useEffect, useRef, useState } from 'react'
import Header from '../../components/header/Header'
import Icon from '../../components/icon/Icon'
import SupportItem from '../../components/support/SupportItem'
import SupportsProgrammes from '../../components/support/SupportsProgrammes'
import ClassementFormation from '../../components/classement/ClassementFormation'
import { useFormation } from '../../hooks/useFormation'
import { useSupport } from '../../hooks/useSupport'
import { toDatetimeLocal } from '../../utils/time'
import './AccueilFormateur.css'

// Espace formateur : ses formations et leurs étudiants, classement / notes d'attestation,
// dépôt de supports (envoi immédiat ou programmé), brouillons programmés et fil des supports
// avec réactions et commentaires.
function AccueilFormateur({ user }) {
  const { formations, isLoading, error, getEtudiants } = useFormation()
  const { getSupports, getSupportsProgrammes, uploadSupport, isLoading: supportLoading, error: supportError } = useSupport()

  const [supports, setSupports] = useState([])
  const [programmes, setProgrammes] = useState([])
  const [studentsByFormation, setStudentsByFormation] = useState({})
  const [selectedFormation, setSelectedFormation] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  // Envoi programmé : vide = envoi immédiat
  const [programmer, setProgrammer] = useState(false)
  const [dateEnvoi, setDateEnvoi] = useState('')
  const fileRef = useRef(null)

  const userId = user?.id_utilisateur || user?.id
  const ownFormations = formations.filter(
    (formation) => Number(formation.id_utilisateur) === Number(userId)
  )

  // Charge les supports puis les étudiants de chaque formation du formateur
  useEffect(() => {
    if (!ownFormations.length) return

    let cancelled = false

    async function loadSupports() {
      const supportGroups = await Promise.all(
        ownFormations.map((formation) => getSupports(formation.id_formation))
      )
      if (!cancelled) setSupports(supportGroups.flat())
      const brouillons = await getSupportsProgrammes()
      if (!cancelled) setProgrammes(brouillons)

      const studentGroups = await Promise.all(
        ownFormations.map(async (formation) => [
          formation.id_formation,
          await getEtudiants(formation.id_formation),
        ])
      )
      if (!cancelled) setStudentsByFormation(Object.fromEntries(studentGroups))
    }

     loadSupports()
    
    return () => { cancelled = true }
  }, [formations.length, userId])

  // Recharge les supports publiés et les brouillons programmés
  async function rechargerSupports() {
    const supportGroups = await Promise.all(
      ownFormations.map((formation) => getSupports(formation.id_formation))
    )
    setSupports(supportGroups.flat())
    setProgrammes(await getSupportsProgrammes())
  }

  // Dépôt d'un support (une formation et un fichier sont requis) : envoyé tout de suite,
  // ou programmé à l'heure choisie (brouillon modifiable jusque-là)
  async function handleUpload(event) {
    event.preventDefault()
    if (!file || !selectedFormation) return
    if (programmer && !dateEnvoi) return

    const formData = new FormData()
    formData.append('id_formation', selectedFormation)
    formData.append('titre', title.trim() || file.name)
    formData.append('fichier', file)
    // Heure locale du navigateur convertie en ISO : le serveur reçoit l'instant exact
    if (programmer) formData.append('date_envoi_prevue', new Date(dateEnvoi).toISOString())

    try {
      await uploadSupport(formData)
      setTitle('')
      setFile(null)
      setProgrammer(false)
      setDateEnvoi('')
      if (fileRef.current) fileRef.current.value = ''
      await rechargerSupports()
    } catch {
      // l'erreur est déjà exposée via supportError, affichée plus bas dans le rendu
    }
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
                <small>
                  {(studentsByFormation[formation.id_formation] || []).length} étudiant(s)
                </small>

                {(studentsByFormation[formation.id_formation] || []).map((student) => (
                  <span key={student.id_etudiant}>
                    {student.prenom} {student.nom}
                  </span>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>

      {ownFormations.length > 0 && <ClassementFormation formations={ownFormations} />}

      <form className="workspace-panel support-upload-panel" onSubmit={handleUpload}>
        <div className="panel-heading">
          <div>
            <h2>Déposer un support</h2>
            <p>
              Envoyé tout de suite, ou programmé : les étudiants sont prévenus une heure avant,
              puis le support est envoyé automatiquement à l'heure choisie.
            </p>
          </div>
          <Icon name="upload" />
        </div>

        <select value={selectedFormation} onChange={(event) => setSelectedFormation(event.target.value)}>
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
          placeholder="Titre du support"
        />

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={!selectedFormation || supportLoading}
        />

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
          disabled={!selectedFormation || !file || (programmer && !dateEnvoi) || supportLoading}
        >
          {programmer ? "Programmer l'envoi" : 'Envoyer maintenant'}
        </button>
      </form>

      {ownFormations.length > 0 && <SupportsProgrammes supports={programmes} onChange={rechargerSupports} />}

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
              userRole={user.role}
              commentBusy={supportLoading}
              canComment={true}
              canDeleteSupport={Number(support.id_utilisateur) === Number(userId)}
              onSupportDeleted={(deletedId) => {
                setSupports((prev) => prev.filter((s) => s.id_support !== deletedId))
              }}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default AccueilFormateur