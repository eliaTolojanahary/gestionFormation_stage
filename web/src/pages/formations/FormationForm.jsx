import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useFormation } from '../../hooks/useFormation'
import { useUser } from '../../hooks/useUser'


const EMPTY_FORM = { nom: '', description: '', tarif: '', duree: '', duree_jours: '', id_utilisateur: '' }

function FormationForm({ user, formationId, onBack, onSaved }) {
  const isEdit = Boolean(formationId)
  const { getFormation, createFormation, updateFormation } = useFormation()
  const { users, isLoading: usersLoading } = useUser()
  const [form, setForm] = useState({ ...EMPTY_FORM, id_utilisateur: user?.id_utilisateur || user?.id || '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getFormation(formationId)
      .then((data) => setForm({ ...EMPTY_FORM, ...data }))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false))
  }, [formationId, getFormation, isEdit])

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => {
      const updated = { ...current, [name]: value }
      // Calcul automatique de la durée en jours (basé sur 1 mois = 30 jours)
      if (name === 'duree') {
        const mois = parseFloat(value) || 0
        updated.duree_jours = mois > 0 ? Math.round(mois * 30) : ''
      }
      return updated
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = { 
      ...form, 
      tarif: Number(form.tarif), 
      duree_jours: Number(form.duree_jours), 
      id_utilisateur: Number(form.id_utilisateur) 
    }
    try {
      if (isEdit) await updateFormation(formationId, payload)
      else await createFormation(payload)
      onSaved()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="gestion-page">
        <Header user={user} activeItem="Formations" />
        <p>Chargement...</p>
      </main>
    )
  }

  const formateurOptions = users
    .filter((item) => item.role_nom === 'Formateur')
    .map((item) => ({ 
      value: item.id_utilisateur, 
      label: `${item.prenom || ''} ${item.nom || ''}`.trim() || item.email 
    }))

  return (
    <main className="gestion-page">
      <Header user={user} activeItem="Formations" />
      <div className="gestion-heading">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← Retour aux formations
          </button>
          <h1>{isEdit ? 'Modifier la formation' : 'Nouvelle formation'}</h1>
        </div>
      </div>

      <form className="gestion-form" onSubmit={handleSubmit}>
        <Informations title="Informations de la formation">
          <div className="form-grid">
            <InputReutilisable 
              label="Nom" 
              name="nom" 
              value={form.nom} 
              onChange={handleChange} 
              required 
            />
            <InputReutilisable 
              label="Tarif" 
              name="tarif" 
              type="number" 
              value={form.tarif} 
              onChange={handleChange} 
              required 
            />
            <InputReutilisable 
              label="Durée (mois)" 
              name="duree" 
              value={form.duree} 
              onChange={handleChange} 
            />
            <InputReutilisable 
              label="Durée en jours" 
              name="duree_jours" 
              type="number" 
              value={form.duree_jours} 
              onChange={handleChange} 
              required 
              disabled={true}
            />
            <InputReutilisable 
              label="Formateur" 
              name="id_utilisateur" 
              as="select" 
              value={form.id_utilisateur} 
              onChange={handleChange} 
              options={formateurOptions} 
              required 
              disabled={usersLoading || isEdit} 
            />
            <InputReutilisable 
              label="Description" 
              name="description" 
              as="textarea" 
              value={form.description} 
              onChange={handleChange} 
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

export default FormationForm