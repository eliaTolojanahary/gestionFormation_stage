import "./InputReutilisable.css"
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
          <small>{file?.name || currentPath || 'Aucun fichier sélectionné'}</small>
        </>
      )}

      {as === 'input' && <input {...commonProps} type={type} />}
    </label>
  )
}

export default InputReutilisable