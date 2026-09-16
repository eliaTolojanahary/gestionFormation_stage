import { useState } from 'react'
import Icon from '../../components/icon/Icon'
import Header from '../../components/header/Header'
import '../WorkspacePages.css'

const initialTickets = [
  { id: '#SUP-1048', subject: 'Accès au tableau de bord', category: 'Technique', status: 'En cours', date: '12 sept. 2026' },
  { id: '#SUP-1042', subject: 'Question sur une inscription', category: 'Inscription', status: 'Résolu', date: '08 sept. 2026' },
  { id: '#SUP-1037', subject: 'Modification d\'un document', category: 'Documents', status: 'Résolu', date: '02 sept. 2026' },
]

function Assistance({ user }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [form, setForm] = useState({ subject: '', category: 'Technique', message: '' })
  const [sent, setSent] = useState(false)

  function updateForm(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })) }
  function submitTicket(event) {
    event.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) return
    setTickets((current) => [{ id: `#SUP-${1050 + current.length}`, subject: form.subject, category: form.category, status: 'Nouveau', date: 'À l\'instant' }, ...current])
    setForm({ subject: '', category: 'Technique', message: '' })
    setSent(true)
  }

  return <section className="workspace-page"><Header user={user} activeItem="Assistance" /><div className="workspace-heading"><div><span className="eyebrow">Centre d'aide</span><h1>Assistance</h1><p>Une question ou un problème ? Créez une demande, notre équipe vous répond.</p></div><div className="support-contact"><Icon name="help" /><span><strong>Support disponible</strong><small>Lun - Ven · 8h à 17h</small></span></div></div><div className="support-layout"><form className="workspace-panel support-form" onSubmit={submitTicket}><div className="panel-heading"><div><h2>Nouvelle demande</h2><p>Décrivez votre besoin avec précision.</p></div><Icon name="send" /></div>{sent && <div className="success-message">Votre demande a bien été enregistrée.</div>}<label>Sujet<input name="subject" value={form.subject} onChange={updateForm} placeholder="Ex : Impossible de télécharger un document" /></label><label>Catégorie<select name="category" value={form.category} onChange={updateForm}><option>Technique</option><option>Inscription</option><option>Paiement</option><option>Documents</option><option>Autre</option></select></label><label>Message<textarea name="message" value={form.message} onChange={updateForm} rows="5" placeholder="Expliquez-nous ce qui se passe..." /></label><button className="primary-button" type="submit"><Icon name="send" /> Envoyer la demande</button></form><div className="workspace-panel"><div className="panel-heading"><div><h2>Mes demandes</h2><p>Suivez l'avancement de vos échanges.</p></div><span className="count-badge">{tickets.length}</span></div><div className="ticket-list">{tickets.map((ticket) => <article className="ticket-row" key={ticket.id}><span className="ticket-id">{ticket.id}</span><div><strong>{ticket.subject}</strong><small>{ticket.category} · {ticket.date}</small></div><span className={`status-pill ${ticket.status.toLowerCase().replace('é', 'e')}`}>{ticket.status}</span></article>)}</div></div></div></section>
}

export default Assistance
