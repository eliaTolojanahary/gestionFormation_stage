import './Informations.css'

// Carte d'informations "libellé : valeur" (pages de détail).
// items = [{ label, value }] ; on peut aussi passer un contenu libre en children.
// action : élément affiché à droite du titre (ex. bouton d'export CSV).
function Informations({ title, items = [], children, action }) {
  return (
    <section className="information-card">
      <div className="information-card-heading">
        <h2>{title}</h2>
        {action}
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
