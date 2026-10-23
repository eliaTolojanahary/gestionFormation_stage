import { formatDate } from './time'

// Export d'un tableau en fichier CSV, à partir des mêmes colonnes que <Tableau>.
// Pour chaque colonne : exportValue(row, index) si elle existe, sinon le texte de render()
// quand il renvoie du texte, sinon row[key] ; titre = exportHeader ou header.
// Colonnes ignorées : export: false, 'actions', et celles sans titre (boutons).
// Format pour Excel en français : séparateur « ; », virgule décimale, BOM UTF-8 (accents).

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

function colonnesExportables(colonnes) {
  return colonnes.filter((c) => c.export !== false && c.key !== 'actions' && c.header)
}

function valeurCellule(colonne, row, index) {
  if (colonne.exportValue) return colonne.exportValue(row, index)
  if (colonne.render) {
    const rendu = colonne.render(row, index)
    if (typeof rendu === 'string' || typeof rendu === 'number') return rendu
  }
  const valeur = row[colonne.key]
  if (typeof valeur === 'string' && ISO_DATE_REGEX.test(valeur)) return formatDate(valeur)
  return valeur
}

// Texte d'une cellule : nombres avec virgule décimale, texte entre guillemets (" doublés)
function formaterCellule(valeur) {
  if (valeur === null || valeur === undefined) return ''
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? String(valeur).replace('.', ',') : ''
  if (typeof valeur === 'boolean') return valeur ? 'Oui' : 'Non'
  return `"${String(valeur).replace(/"/g, '""')}"`
}

export function genererCSV(colonnes, lignes) {
  const cols = colonnesExportables(colonnes)
  const entete = cols.map((c) => formaterCellule(c.exportHeader || c.header)).join(';')
  const corps = lignes.map((row, index) =>
    cols.map((c) => formaterCellule(valeurCellule(c, row, index))).join(';')
  )
  return [entete, ...corps].join('\r\n')
}

// Télécharge le fichier, ex. telechargerCSV('paiements', columns, lignes) -> paiements_2026-10-17.csv
export function telechargerCSV(nomFichier, colonnes, lignes) {
  const blob = new Blob(['﻿', genererCSV(colonnes, lignes)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = `${nomFichier}_${new Date().toISOString().slice(0, 10)}.csv`
  lien.click()
  URL.revokeObjectURL(url)
}
