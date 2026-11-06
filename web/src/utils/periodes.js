// Filtre de période des états du tableau de bord (indicateurs, inscriptions, avis sur les formateurs).
// Une période est { debut, fin } en texte 'AAAA-MM-JJ' (champs date du navigateur), bornes incluses ;
// une borne vide = pas de limite. Elle est envoyée à l'API en ?debut=&fin=.

export const PERIODE_TOUT = { debut: '', fin: '' }

// Vrai si la date de début est après la date de fin (période impossible, à ne pas envoyer)
export function periodeInvalide({ debut, fin }) {
  return Boolean(debut && fin && debut > fin)
}

// Paramètres à ajouter à l'adresse de l'API ('' quand aucune borne n'est choisie)
export function requetePeriode({ debut, fin } = PERIODE_TOUT) {
  const params = new URLSearchParams()
  if (debut) params.set('debut', debut)
  if (fin) params.set('fin', fin)
  const texte = params.toString()
  return texte ? `?${texte}` : ''
}

// Ex. « du 01/07/2026 au 30/09/2026 », « depuis le 01/07/2026 », « depuis l'ouverture »
export function libellePeriode({ debut, fin } = PERIODE_TOUT) {
  const enFrancais = (texte) => texte.split('-').reverse().join('/')
  if (debut && fin) return `du ${enFrancais(debut)} au ${enFrancais(fin)}`
  if (debut) return `depuis le ${enFrancais(debut)}`
  if (fin) return `jusqu'au ${enFrancais(fin)}`
  return "depuis l'ouverture"
}
