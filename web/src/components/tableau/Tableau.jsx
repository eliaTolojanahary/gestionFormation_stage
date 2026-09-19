import { useState } from 'react'
import ImageLightbox from '../form/ImageLightBox'
import './Tableau.css'


function Tableau({
  columns,
  rows = [],
  rowKey = 'id',
  emptyMessage = 'Aucune donnée disponible.',
  className = '',
  wrapperClassName = '',
}) {
  const [previewImage, setPreviewImage] = useState(null)

  function handleTableClick(event) {
    const target = event.target
    if (target.tagName === 'IMG' && target.src) {
      setPreviewImage({
        src: target.src,
        alt: target.alt || 'Aperçu image',
      })
    }
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
                    {column.render ? column.render(row, index) : row[column.key]}
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