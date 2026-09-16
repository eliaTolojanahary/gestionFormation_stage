import { useEffect, useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useFormation } from '../../hooks/useFormation'
import './GestionPages.css'

const EMPTY_FORM = { nom: '', description: '', tarif: '', duree: '', duree_jours: '', id_utilisateur: '' }

function FormationForm({ user, formationId, onBack, onSaved }) {
  const isEdit = Boolean(formationId)
  const { getFormation, createFormation, updateFormation } = useFormation()
  const [form, setForm] = useState({ ...EMPTY_FORM, id_utilisateur: user?.id_utilisateur || '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getFormation(formationId).then((data) => setForm({ ...EMPTY_FORM, ...data })).catch((requestError) => setError(requestError.message)).finally(() => setLoading(false))
  }, [formationId, getFormation, isEdit])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, tarif: Number(form.tarif), duree_jours: Number(form.duree_jours), id_utilisateur: Number(form.id_utilisateur) }
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

  if (loading) return <main className="gestion-page"><Header user={user} activeItem="Formations" /><p>Chargement...</p></main>

  return <main className="gestion-page"><Header user={user} activeItem="Formations" /><div className="gestion-heading"><div><button type="button" className="back-link" onClick={onBack}>← Retour aux formations</button><h1>{isEdit ? 'Modifier la formation' : 'Nouvelle formation'}</h1></div></div><form className="gestion-form" onSubmit={handleSubmit}><Informations title="Informations de la formation"><div className="form-grid"><InputReutilisable label="Nom" name="nom" value={form.nom} onChange={handleChange} required /><InputReutilisable label="Tarif" name="tarif" type="number" value={form.tarif} onChange={handleChange} required /><InputReutilisable label="Durée" name="duree" value={form.duree} onChange={handleChange} /><InputReutilisable label="Durée en jours" name="duree_jours" type="number" value={form.duree_jours} onChange={handleChange} required /><InputReutilisable label="ID formateur" name="id_utilisateur" type="number" value={form.id_utilisateur} onChange={handleChange} required disabled={isEdit} /><InputReutilisable label="Description" name="description" as="textarea" value={form.description} onChange={handleChange} /></div></Informations>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onBack}>Annuler</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></main>
}

export default FormationForm
