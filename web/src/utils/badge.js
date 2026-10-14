// Nombre affiché sur la cloche des notifications : au-delà de 9 non lues, « 9+ »
const MAX_BADGE = 9

export function libelleBadge(nombre) {
  return nombre > MAX_BADGE ? `${MAX_BADGE}+` : String(nombre)
}
