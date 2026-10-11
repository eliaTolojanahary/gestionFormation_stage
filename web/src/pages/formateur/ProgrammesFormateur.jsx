import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/header/Header'
import SupportsProgrammes from '../../components/support/SupportsProgrammes'
import { useSupport } from '../../hooks/useSupport'

// Page « Supports programmés » du formateur : brouillons modifiables jusqu'à l'heure d'envoi,
// envoi immédiat ou suppression. La programmation se fait depuis la page « Supports ».
function ProgrammesFormateur({ user }) {
  const navigate = useNavigate()
  const { getSupportsProgrammes, error } = useSupport()
  const [programmes, setProgrammes] = useState([])
  const [chargement, setChargement] = useState(true)

  async function charger() {
    try {
      setProgrammes(await getSupportsProgrammes())
    } catch {
      // l'erreur est exposée par useSupport (error), affichée plus bas
    } finally {
      setChargement(false)
    }
  }

  // Chargement initial (fonction interne à l'effet pour pouvoir ignorer une réponse tardive)
  useEffect(() => {
    let cancelled = false

    async function chargerInitial() {
      try {
        const brouillons = await getSupportsProgrammes()
        if (!cancelled) setProgrammes(brouillons)
      } catch {
        // l'erreur est exposée par useSupport (error)
      } finally {
        if (!cancelled) setChargement(false)
      }
    }

    chargerInitial()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="workspace-page">
      <Header user={user} activeItem="Supports programmés" />

      <div className="workspace-heading">
        <div>
          <span className="eyebrow">Espace formateur</span>
          <h1>Supports programmés</h1>
          <p>Vos supports en attente d'envoi automatique, modifiables jusqu'à l'heure prévue.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => navigate('/dashboard/supports')}>
          Programmer un support
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {chargement ? (
        <p className="muted-text">Chargement...</p>
      ) : (
        <SupportsProgrammes supports={programmes} onChange={charger} />
      )}
    </section>
  )
}

export default ProgrammesFormateur
