import { useState } from 'react'
import Header from '../../components/header/Header'
import Informations from '../../components/form/Informations'
import InputReutilisable from '../../components/form/InputReutilisable'
import { useEtudiant } from '../../hooks/useEtudiant'
import { useFormation } from '../../hooks/useFormation'
import { useInscription } from '../../hooks/useInscription'
import '../formations/GestionPages.css'

function InscriptionForm({ user, onBack, onSaved }) {
  const { etudiants } = useEtudiant()
  const { formations } = useFormation()
  const { createInscription } = useInscription()
  const [form, setForm] = useState({ id_etudiant: '', id_formation: '', nombre_tranches: 1, id_tranche: 1 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleChange(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })) }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createInscription({ ...form, id_etudiant: Number(form.id_etudiant), id_formation: Number(form.id_formation), nombre_tranches: Number(form.nombre_tranches), id_tranche: Number(form.id_tranche) })
      onSaved()
    } catch (requestError) { setError(requestError.message) } finally { setSaving(false) }
  }

  return <main className="gestion-page"><Header user={user} activeItem="Inscriptions" /><div className="gestion-heading"><div><button type="button" className="back-link" onClick={onBack}>← Retour aux inscriptions</button><h1>Nouvelle inscription</h1></div></div><form className="gestion-form" onSubmit={handleSubmit}><Informations title="Détails de l'inscription"><div className="form-grid"><InputReutilisable label="Etudiant" name="id_etudiant" value={form.id_etudiant} onChange={handleChange} as="select" options={etudiants.map((item) => ({ value: item.id_etudiant, label: `${item.prenom} ${item.nom}` }))} required /><InputReutilisable label="Formation" name="id_formation" value={form.id_formation} onChange={handleChange} as="select" options={formations.map((item) => ({ value: item.id_formation, label: item.nom }))} required /><InputReutilisable label="Nombre de tranches" name="nombre_tranches" type="number" value={form.nombre_tranches} onChange={handleChange} required /><InputReutilisable label="ID tranche" name="id_tranche" type="number" value={form.id_tranche} onChange={handleChange} required /></div></Informations>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onBack}>Annuler</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></form></main>
}

export default InscriptionForm
