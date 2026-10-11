import { useState } from 'react'
import ImageLightbox from '../form/ImageLightBox'
import { formatDate, formatRelative } from '../../utils/time'
import './Tableau.css'

// Reconnaît une date ISO renvoyée par l'API (ex. "2026-10-08T14:30:00.000Z") pour la formater
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/

function isIsoDate(value) {
  return typeof value === 'string' && ISO_DATE_REGEX.test(value)
}

// Tableau générique utilisé par toutes les listes.
// columns = [{ key, header, render?, dateFormat?, cellClassName? }] : `render(row, index)` permet
// un affichage personnalisé (boutons, badges...) ; sinon on affiche row[key].
// rowKey = nom du champ identifiant, ou fonction (row, index) => clé.
// dateFormat : 'date' (défaut), 'relative' ("il y a 2 h") ou 'none'.
function Tableau({
  columns,
  rows = [],
  rowKey = 'id',
  emptyMessage = 'Aucune donnée disponible.',
  className = '',
  wrapperClassName = '',
  dateFormat = 'date',
}) {
  const [previewImage, setPreviewImage] = useState(null)

  // Un clic sur n'importe quelle image du tableau l'ouvre en grand
  function handleTableClick(event) {
    const target = event.target
    if (target.tagName === 'IMG' && target.src) {
      setPreviewImage({
        src: target.src,
        alt: target.alt || 'Aperçu image',
      })
    }
  }

  // Contenu d'une cellule : render personnalisé, sinon valeur brute (dates formatées automatiquement)
  function renderCell(row, column, index) {
    if (column.render) return column.render(row, index)

    const value = row[column.key]

    if (isIsoDate(value)) {
      if (column.dateFormat === 'relative' || (!column.dateFormat && dateFormat === 'relative')) {
        return formatRelative(value)
      }
      if (column.dateFormat === 'none' || (!column.dateFormat && dateFormat === 'none')) {
        return value
      }
      return formatDate(value)
    }
    return value ?? ''
  }

  return (
    <div className={`tableau-wrap ${wrapperClassName}`.trim()}>
      <table className={`tableau ${className}`.trim()} onClick={handleTableClick}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header || ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="tableau-empty">{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey] || index}>
                {columns.map((column) => (
                  <td key={column.key} className={column.cellClassName || ''}>
                    {renderCell(row, column, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ImageLightbox
        src={previewImage?.src}
        alt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}

export default Tableau