import { useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useEtudiant } from '../../hooks/useEtudiant'
import { useFormation } from '../../hooks/useFormation'
import { useInscription } from '../../hooks/useInscription'

// Options de paiement : value = id_tranche en base = nombre de tranches de l'échéancier
const TRANCHE_OPTIONS = [
  { value: '1', label: 'Paiement Comptant (1 tranche)' },
  { value: '2', label: 'Paiement en 2 Tranches' },
  { value: '3', label: 'Paiement en 3 Tranches' },
  { value: '4', label: 'Paiement en 4 Tranches' },
]

// Nouvelle inscription : choix de l'étudiant, de la formation et du nombre de tranches.
// À l'enregistrement, l'API crée l'inscription et calcule l'échéancier.
function InscriptionForm({ user, onBack, onSaved }) {
  const { etudiants } = useEtudiant()
  const { formations } = useFormation()
  const { createInscription } = useInscription()
  const [form, setForm] = useState({ id_etudiant: '', id_formation: '', nombre_tranches: 1, id_tranche: 1 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    if (name === 'id_tranche') {
      const selectedTranche = Number(value)
      setForm((current) => ({
        ...current,
        id_tranche: selectedTranche,
        nombre_tranches: selectedTranche, // Synchronise le nombre de tranches avec l'ID sélectionné
      }))
    } else {
      setForm((current) => ({ ...current, [name]: value }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createInscription({
        ...form,
        id_etudiant: Number(form.id_etudiant),
        id_formation: Number(form.id_formation),
        nombre_tranches: Number(form.nombre_tranches),
        id_tranche: Number(form.id_tranche),
      })
      onSaved()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const etudiantOptions = etudiants.map((item) => ({
    value: item.id_etudiant,
    label: `${item.prenom} ${item.nom}`.trim(),
  }))

  const formationOptions = formations.map((item) => ({
    value: item.id_formation,
    label: item.nom,
  }))

  return (
    <main className="gestion-page">
      <Header user={user} activeItem="Inscriptions" />
      <div className="gestion-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux inscriptions
          </button>
          <h1>Nouvelle inscription</h1>
        </div>
      </div>

      <form className="gestion-form" onSubmit={handleSubmit}>
        <Informations title="Détails de l'inscription">
          <div className="form-grid">
            <InputReutilisable
              label="Étudiant"
              name="id_etudiant"
              as="select"
              value={form.id_etudiant}
              onChange={handleChange}
              options={etudiantOptions}
              required
            />
            <InputReutilisable
              label="Formation"
              name="id_formation"
              as="select"
              value={form.id_formation}
              onChange={handleChange}
              options={formationOptions}
              required
            />
            <InputReutilisable
              label="Option de paiement"
              name="id_tranche"
              as="select"
              value={form.id_tranche}
              onChange={handleChange}
              options={TRANCHE_OPTIONS}
              required
            />
          </div>
        </Informations>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Annuler
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  )
}

export default InscriptionForm