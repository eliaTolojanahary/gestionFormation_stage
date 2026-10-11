import './Informations.css'

// Carte d'informations "libellé : valeur" (pages de détail).
// items = [{ label, value }] ; on peut aussi passer un contenu libre en children.
function Informations({ title, items = [], children }) {
  return (
    <section className="information-card">
      <div className="information-card-heading">
        <h2>{title}</h2>
      </div>
      {children || (
        <div className="information-grid">
          {items.map((item) => (
            <div className="information-item" key={item.label}>
              <span>{item.label} : </span> 
              <strong>{item.value || '-'}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default Informations
