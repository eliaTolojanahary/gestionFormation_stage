import { useRef, useState } from 'react'
import Avatar from '../avatar/Avatar'
import { chercherEtudiants, nomMention, retenirMention } from '../../utils/mentions'

const DELAI_FRAPPE = 200 // ms sans frappe avant d'interroger le serveur

// Champ de commentaire : pour le formateur (ou le Super Admin), taper « @ » propose les étudiants
// de la formation (cherchés par le serveur d'après le texte tapé après « @ ») ; sinon c'est un champ
// texte simple (un étudiant répond, il ne mentionne pas).
function ChampMention({ value, onChange, peutMentionner, idFormation, ...props }) {
  const champ = useRef(null)
  const [etudiants, setEtudiants] = useState([])
  // Recherche en cours : texte tapé après « @ » et sa position ; null = liste fermée
  const [recherche, setRecherche] = useState(null)
  const [actif, setActif] = useState(0)
  const minuteur = useRef(null)
  const derniereDemande = useRef(0)

  function detecterMention(texte, curseur) {
    const avant = texte.slice(0, curseur)
    const trouve = avant.match(/@([^@\n]{0,40})$/)
    if (!trouve) return setRecherche(null)
    setRecherche({ texte: trouve[1].toLowerCase(), debut: curseur - trouve[0].length, fin: curseur })
    setActif(0)
    // Seule la réponse de la dernière frappe est gardée
    window.clearTimeout(minuteur.current)
    const demande = ++derniereDemande.current
    minuteur.current = window.setTimeout(() => {
      chercherEtudiants(idFormation, trouve[1])
        .then((liste) => { if (demande === derniereDemande.current) setEtudiants(liste) })
        .catch(() => { if (demande === derniereDemande.current) setEtudiants([]) })
    }, DELAI_FRAPPE)
  }

  function changer(event) {
    onChange(event.target.value)
    if (peutMentionner) detecterMention(event.target.value, event.target.selectionStart)
  }

  const suggestions = recherche ? etudiants : []

  function choisir(etudiant) {
    retenirMention(idFormation, etudiant)
    const insertion = `@${nomMention(etudiant)} `
    const texte = value.slice(0, recherche.debut) + insertion + value.slice(recherche.fin)
    onChange(texte)
    setRecherche(null)
    const curseur = recherche.debut + insertion.length
    requestAnimationFrame(() => {
      champ.current?.focus()
      champ.current?.setSelectionRange(curseur, curseur)
    })
  }

  // Flèches pour parcourir, Entrée / Tab pour choisir, Échap pour fermer
  function touche(event) {
    if (suggestions.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const pas = event.key === 'ArrowDown' ? 1 : -1
      setActif((i) => (i + pas + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      choisir(suggestions[actif])
    } else if (event.key === 'Escape') {
      setRecherche(null)
    }
  }

  return (
    <div className="champ-mention">
      <input
        ref={champ}
        value={value}
        onChange={changer}
        onKeyDown={touche}
        onBlur={() => setTimeout(() => setRecherche(null), 150)}
        {...props}
      />
      {suggestions.length > 0 && (
        <ul className="mention-suggestions" role="listbox">
          {suggestions.map((etudiant, index) => (
            <li
              key={etudiant.id_etudiant}
              role="option"
              aria-selected={index === actif}
              className={index === actif ? 'actif' : ''}
              onMouseDown={(event) => {
                event.preventDefault() // garde le focus dans le champ
                choisir(etudiant)
              }}
            >
              <Avatar photo={etudiant.photo} prenom={etudiant.prenom} nom={etudiant.nom} size="sm" shape="circle" />
              <span>{nomMention(etudiant)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ChampMention
