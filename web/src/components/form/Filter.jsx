import Icon from '../icon/Icon'
import './Filter.css'

// Barre de recherche + filtres déroulants + bouton Réinitialiser, utilisée au-dessus des tableaux.
// filters = [{ name, label, value, options: [...], onChange }]
function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Rechercher...',
  filters = [],
  onReset,
}) {
  return (
    <div className="search-filter-bar">
      <label>
        Rechercher
        <span className="search-field">
          <Icon name="search" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </span>
      </label>

      {filters.map((filter) => (
        <label key={filter.name}>
          {filter.label}
<select
  className="filter-option"
  value={filter.value}
  onChange={(event) => filter.onChange(event.target.value)}
>
  {filter.options.map((option) => (
    <option
      key={option}
      value={option}
      className={`filter-option filter-option-${option.toLowerCase()}`}
    >
      {option}
    </option>
  ))}
</select>
        </label>
      ))}

      <button type="button" className="reset-button" onClick={onReset}>
        Réinitialiser
      </button>
    </div>
  )
}

export default SearchFilterBar