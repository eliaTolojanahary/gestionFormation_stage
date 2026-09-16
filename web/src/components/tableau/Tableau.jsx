import './Tableau.css'

function Tableau({
  columns,
  rows = [],
  rowKey = 'id',
  emptyMessage = 'Aucune donnée disponible.',
  className = '',
  wrapperClassName = '',
}) {
  return (
    <div className={`tableau-wrap ${wrapperClassName}`.trim()}>
      <table className={`tableau ${className}`.trim()}>
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
    </div>
  )
}

export default Tableau
          

