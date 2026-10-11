import { useState } from 'react'
import InputReutilisable from '../form/InputReutilisable'
import Modal from '../modal/Modal'
import './PaymentFormModal.css'

// value = id_mode_paiement en base
const PAYMENT_MODES = [
  { value: 1, label: 'Cash' },
  { value: 2, label: 'Virement bancaire' },
]

// Référence unique proposée par défaut : INS-<id>-<AAAAMMJJHHMMSS>-<4 caractères aléatoires>
function generateReference(inscriptionId) {
  const date = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INS-${inscriptionId}-${date}-${suffix}`
}

// Fenêtre de paiement, deux modes :
//  - 'validation' : valider une inscription (mode de paiement + référence) ;
//  - sinon : payer une échéance (montant pré-rempli avec le reste à payer).
// onSubmit reçoit les données à envoyer à l'API ; une erreur levée est affichée dans la fenêtre.
function PaymentModal({ mode, inscription, echeance, onClose, onSubmit }) {
  const isValidation = mode === 'validation'

  const [form, setForm] = useState(() =>
    isValidation
      ? {
          id_mode_paiement: 1,
          // Inscription en ligne : on reprend la référence déclarée par l'étudiant
          reference_virement: inscription.reference_declaree || generateReference(inscription.id_inscription),
        }
      : { id_mode_paiement: 1, montant: echeance.reste_a_payer ?? echeance.montant_prevu, reference_virement: '' }
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      if (isValidation) {
        await onSubmit({
          id_mode_paiement: Number(form.id_mode_paiement),
          reference_virement: form.reference_virement,
        })
      } else {
        await onSubmit({
          id_echeance: Number(echeance.id_echeance),
          id_mode_paiement: Number(form.id_mode_paiement),
          montant: Number(form.montant),
          reference_virement: form.reference_virement || undefined,
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const title = isValidation
    ? "Valider l'inscription"
    : `Payer l'échéance #${echeance.id_echeance}`

  return (
    <Modal eyebrow="Paiement" title={title} titleId="payment-modal-title" onClose={onClose}>
      <form onSubmit={handleSubmit} className="payment-form-modal">
        <InputReutilisable
          label="Mode de paiement"
          name="id_mode_paiement"
          value={form.id_mode_paiement}
          onChange={handleChange}
          as="select"
          options={PAYMENT_MODES}
          required
        />

        {isValidation ? (
          <>
            {inscription.origine === 'en_ligne' && (
              <p className="payment-reference-help">
                Inscription en ligne : premier paiement déclaré par l'étudiant
                {inscription.montant_declare ? ` (${Number(inscription.montant_declare).toLocaleString('fr-FR')} Ar)` : ''}.
                Vérifiez-le avant de valider : il sera validé avec l'inscription.
              </p>
            )}
            <InputReutilisable
              label={inscription.reference_declaree ? 'Référence déclarée' : 'Référence générée'}
              name="reference_virement"
              value={form.reference_virement}
              onChange={handleChange}
            />
            <p className="payment-reference-help">
              Cette référence sera enregistrée avec le premier paiement.
            </p>
          </>
        ) : (
          <>
            <InputReutilisable
              label="Montant"
              name="montant"
              type="number"
              value={form.montant}
              onChange={handleChange}
              required
            />
            <InputReutilisable
              label="Référence (optionnelle)"
              name="reference_virement"
              value={form.reference_virement}
              onChange={handleChange}
              placeholder="Ex. MVOLA-REF-998823"
            />
          </>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : isValidation ? 'Valider' : 'Enregistrer le paiement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default PaymentModal