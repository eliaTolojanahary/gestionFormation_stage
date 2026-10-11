import { numerosDePages } from '../../utils/pagination'
import './Pagination.css'

// Pied de tableau : « 21–40 sur 95 » et navigation entre les pages
function Pagination({ page, pages, total, limite, onChange, libelle = 'élément(s)' }) {
  const debut = total === 0 ? 0 : (page - 1) * limite + 1
  const fin = Math.min(page * limite, total)

  return (
    <footer className="pagination-pied">
      <span>
        {total === 0 ? `0 ${libelle}` : <><strong>{debut}–{fin}</strong> sur <strong>{total}</strong> {libelle}</>}
      </span>

      {pages > 1 && (
        <nav className="pagination" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Page précédente">
            ‹
          </button>
          {numerosDePages(page, pages).map((n, i) =>
            n === '…' ? (
              <span key={`trou-${i}`}>…</span>
            ) : (
              <button
                type="button"
                key={n}
                className={n === page ? 'current-page' : ''}
                aria-current={n === page ? 'page' : undefined}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            )
          )}
          <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Page suivante">
            ›
          </button>
        </nav>
      )}
    </footer>
  )
}

export default Pagination
