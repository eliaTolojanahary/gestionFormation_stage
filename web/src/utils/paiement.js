// Modes de paiement et référence par défaut, partagés par la fenêtre de paiement
// et la validation groupée des inscriptions.

// value = id_mode_paiement en base
export const PAYMENT_MODES = [
  { value: 1, label: 'Cash' },
  { value: 2, label: 'Virement bancaire' },
]

// Référence unique proposée par défaut : INS-<id>-<AAAAMMJJHHMMSS>-<4 caractères aléatoires>
export function generateReference(inscriptionId) {
  const date = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `INS-${inscriptionId}-${date}-${suffix}`
}
