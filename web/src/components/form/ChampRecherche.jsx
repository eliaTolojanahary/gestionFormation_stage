import { useEffect, useRef, useState } from 'react'
import Avatar from '../avatar/Avatar'
import { apiRequest } from '../../utils/api'
import './ChampRecherche.css'

const NB_SUGGESTIONS = 8
const DELAI_FRAPPE = 250 // ms sans frappe avant d'interroger le serveur

// Champ de formulaire « on tape, le serveur propose » : remplace un menu déroulant qui devrait
// charger toute une table (ex. tous les étudiants). Interroge `${chemin}?page=1&limite=8&recherche=`.
//   chemin   : route de liste paginée, ex. '/etudiants'
//   cle      : champ identifiant d'une ligne, ex. 'id_etudiant'
//   libelle  : (ligne) => texte affiché ; sousTitre : (ligne) => texte gris (facultatif)
//   value    : ligne choisie (ou null) ; onChange(ligne | null)
function ChampRecherche({ label, name, chemin, cle, libelle, sousTitre, value, onChange, placeholder, required = false }) {
  const [texte, setTexte] = useState(value ? libelle(value) : '')
  const [suggestions, setSuggestions] = useState([])
  const [ouvert, setOuvert] = useState(false)
  const [actif, setActif] = useState(0)
  const [chargement, setChargement] = useState(false)
  const champ = useRef(null)

  // Recherche au serveur après une courte pause dans la frappe ; la réponse d'une ancienne frappe est ignorée
  useEffect(() => {
    if (!ouvert) return undefined
    let annule = false
    const minuteur = window.setTimeout(async () => {
      setChargement(true)
      try {
        const params = new URLSearchParams({ page: '1', limite: String(NB_SUGGESTIONS) })
        if (texte.trim()) params.set('recherche', texte.trim())
        const reponse = await apiRequest(`${chemin}?${params}`)
        if (!annule) { setSuggestions(reponse.data || []); setActif(0) }
      } catch {
        if (!annule) setSuggestions([])
      } finally {
        if (!annule) setChargement(false)
      }
    }, DELAI_FRAPPE)
    return () => { annule = true; window.clearTimeout(minuteur) }
  }, [texte, ouvert, chemin])

  function taper(event) {
    setTexte(event.target.value)
    setOuvert(true)
    if (value) onChange(null) // le texte ne correspond plus à la ligne choisie
  }

  function choisir(ligne) {
    onChange(ligne)
    setTexte(libelle(ligne))
    setOuvert(false)
    champ.current?.setCustomValidity('') // efface « Choisissez un élément » d'un essai précédent
  }

  // Flèches pour parcourir, Entrée pour choisir, Échap pour fermer
  function touche(event) {
    if (!ouvert || suggestions.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const pas = event.key === 'ArrowDown' ? 1 : -1
      setActif((i) => (i + pas + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choisir(suggestions[actif])
    } else if (event.key === 'Escape') {
      setOuvert(false)
    }
  }

  return (
    <label className="form-field champ-recherche" htmlFor={name}>
      <span>{label}{required && ' *'}</span>
      <input
        ref={champ}
        id={name}
        name={name}
        type="search"
        autoComplete="off"
        value={texte}
        placeholder={placeholder}
        onChange={taper}
        onFocus={() => setOuvert(true)}
        onKeyDown={touche}
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        // Formulaire bloqué tant qu'aucune ligne n'est choisie dans la liste
        onInvalid={(event) => event.target.setCustomValidity('Choisissez un élément dans la liste.')}
        onInput={(event) => event.target.setCustomValidity('')}
        required={required && !value}
        pattern={required && !value ? '$^' : undefined}
      />
      {ouvert && (
        <ul className="champ-recherche-suggestions" role="listbox">
          {suggestions.map((ligne, index) => (
            <li
              key={ligne[cle]}
              role="option"
              aria-selected={index === actif}
              className={index === actif ? 'actif' : ''}
              onMouseDown={(event) => {
                event.preventDefault() // garde le focus dans le champ
                choisir(ligne)
              }}
            >
              <Avatar photo={ligne.photo} prenom={ligne.prenom} nom={ligne.nom} size="sm" shape="circle" />
              <span>
                {libelle(ligne)}
                {sousTitre && <small>{sousTitre(ligne)}</small>}
              </span>
            </li>
          ))}
          {!chargement && suggestions.length === 0 && <li className="vide">Aucun résultat</li>}
          {chargement && suggestions.length === 0 && <li className="vide">Recherche...</li>}
        </ul>
      )}
    </label>
  )
}

export default ChampRecherche
