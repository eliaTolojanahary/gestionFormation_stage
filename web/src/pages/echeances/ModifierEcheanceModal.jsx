import { useState } from 'react'
import InputReutilisable from '../../components/form/InputReutilisable'
import Modal from '../../components/modal/Modal'
import { formatMontant } from '../../utils/format'
import '../../components/paiements/PaymentFormModal.css'

// Jour local "AAAA-MM-JJ" d'une date renvoyée par l'API (pour <input type="date">)
function jourLocal(valeur) {
  const d = new Date(valeur)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Fenêtre « Modifier l'échéance » (Super Admin) : nouvelle date et/ou nouveau montant.
// Le serveur garde le total dû égal au tarif : la différence de montant est reportée sur la
// dernière échéance non réglée de l'inscription. onSubmit reçoit { date_echeance, montant_prevu } ;
// une erreur levée (montant trop élevé, échéance déjà réglée...) s'affiche dans la fenêtre.
function ModifierEcheanceModal({ echeance, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    date_echeance: jourLocal(echeance.date_echeance),
    montant_prevu: Number(echeance.montant_prevu),
  }))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Déjà envoyé par l'étudiant (validé + en attente) : le montant ne peut pas descendre en dessous
  const dejaEnvoye = Number(echeance.montant_paye || 0) + Number(echeance.montant_en_attente || 0)
  const montantChange = Number(form.montant_prevu) !== Number(echeance.montant_prevu)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await onSubmit({ date_echeance: form.date_echeance, montant_prevu: Number(form.montant_prevu) })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      eyebrow="Échéance"
      title={`Modifier l'échéance #${echeance.id_echeance}`}
      titleId="modifier-echeance-title"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="payment-form-modal">
        <p className="modifier-echeance-aide">
          {echeance.etudiant_prenom} {echeance.etudiant_nom} · {echeance.formation_nom}
        </p>

        <InputReutilisable
          label="Date d'échéance"
          name="date_echeance"
          type="date"
          value={form.date_echeance}
          onChange={handleChange}
          required
        />
        <InputReutilisable
          label="Montant prévu (Ar)"
          name="montant_prevu"
          type="number"
          value={form.montant_prevu}
          onChange={handleChange}
          required
        />

        {dejaEnvoye > 0 && (
          <p className="modifier-echeance-aide">
            Déjà payé par l'étudiant sur cette échéance : {formatMontant(dejaEnvoye)} (montant minimum).
          </p>
        )}
        {montantChange && (
          <p className="payment-dossier">
            Le total de la formation ne change pas : la différence sera reportée sur la dernière
            échéance non réglée de l'étudiant.
          </p>
        )}
        <p className="modifier-echeance-aide">L'étudiant sera prévenu par notification et par e-mail.</p>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ModifierEcheanceModal
