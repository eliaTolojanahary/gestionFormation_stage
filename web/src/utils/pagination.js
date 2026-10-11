// Numéros affichés : première, dernière, la page courante et ses voisines ; « … » entre les trous.
// Ex. page 6 sur 12 -> [1, '…', 5, 6, 7, '…', 12]
export function numerosDePages(page, pages) {
  const numeros = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const tries = [...numeros].sort((a, b) => a - b)
  const resultat = []
  tries.forEach((n, i) => {
    if (i > 0 && n - tries[i - 1] > 1) resultat.push('…')
    resultat.push(n)
  })
  return resultat
}
