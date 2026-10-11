import "./InputReutilisable.css"

// Champ de formulaire générique avec libellé. `as` choisit le type : 'input', 'select',
// 'textarea' ou 'file'. Pour 'file', onChange reçoit (name, fichier) au lieu de l'événement.
function InputReutilisable({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  as = 'input',
  options = [],
  file,
  currentPath,
  accept = 'image/*,.pdf',
}) {
  // Attributs communs à input / select / textarea
  const commonProps = {
    id: name,
    name,
    value: value ?? '',
    onChange,
    required,
    disabled,
    placeholder,
  }

  return (
    <label className="form-field" htmlFor={name}>
      <span>{label}{required && ' *'}</span>

      {as === 'select' && (
        <select {...commonProps}>
          <option value="">Sélectionner</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      {as === 'textarea' && <textarea {...commonProps} rows="4" />}

      {as === 'file' && (
        <>
          <input
            id={name}
            name={name}
            type="file"
            accept={accept}
            onChange={(event) => onChange(name, event.target.files?.[0] || null)}
          />
          {/* Nom du nouveau fichier choisi, sinon chemin du fichier déjà enregistré */}
          <small>{file?.name || currentPath || 'Aucun fichier sélectionné'}</small>
        </>
      )}

      {as === 'input' && <input {...commonProps} type={type} />}
    </label>
  )
}

export default InputReutilisable