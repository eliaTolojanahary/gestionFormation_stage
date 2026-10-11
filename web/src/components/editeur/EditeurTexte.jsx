import { useEffect, useRef, useState } from 'react'
import './EditeurTexte.css'

// Boutons de la barre d'outils : commande du navigateur (document.execCommand) appliquée à la sélection.
// `bloc` = mise en forme d'un paragraphe entier (titre, citation) ; `etat` = bouton surligné si actif.
const OUTILS = [
  { cle: 'bold', label: 'G', titre: 'Gras (Ctrl+B)', style: { fontWeight: 700 }, etat: true },
  { cle: 'italic', label: 'I', titre: 'Italique (Ctrl+I)', style: { fontStyle: 'italic' }, etat: true },
  { cle: 'underline', label: 'S', titre: 'Souligné (Ctrl+U)', style: { textDecoration: 'underline' }, etat: true },
  { cle: 'strikeThrough', label: 'ab', titre: 'Barré', style: { textDecoration: 'line-through' }, etat: true },
  { separateur: true },
  { cle: 'h2', label: 'T1', titre: 'Titre', bloc: 'H2' },
  { cle: 'h3', label: 'T2', titre: 'Sous-titre', bloc: 'H3' },
  { cle: 'p', label: '¶', titre: 'Paragraphe normal', bloc: 'P' },
  { separateur: true },
  { cle: 'insertUnorderedList', label: '• Liste', titre: 'Liste à puces', etat: true },
  { cle: 'insertOrderedList', label: '1. Liste', titre: 'Liste numérotée', etat: true },
  { cle: 'blockquote', label: '❝', titre: 'Citation', bloc: 'BLOCKQUOTE' },
  { separateur: true },
  { cle: 'lien', label: '🔗 Lien', titre: 'Ajouter un lien sur le texte sélectionné' },
  { cle: 'unlink', label: 'Retirer le lien', titre: 'Retirer le lien' },
  { cle: 'removeFormat', label: '⌫ Format', titre: 'Effacer la mise en forme' },
]

// Adresse saisie par le formateur : "www.site.com" devient "https://www.site.com" ;
// seuls les liens web et e-mail sont acceptés (comme côté serveur)
function normaliserLien(saisie) {
  const adresse = (saisie || '').trim()
  if (!adresse) return null
  if (/^(https?:\/\/|mailto:)/i.test(adresse)) return adresse
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adresse)) return `mailto:${adresse}`
  if (/^[a-z]+:/i.test(adresse)) return null // javascript:, data:... refusés
  return `https://${adresse}`
}

// Éditeur de texte mis en forme (zone contentEditable + barre d'outils), façon mini-CMS.
// value / onChange : HTML. Le serveur nettoie ce HTML (balises autorisées seulement) avant de l'enregistrer.
function EditeurTexte({ value, onChange, placeholder = 'Rédigez votre support…', disabled = false }) {
  const zoneRef = useRef(null)
  const [actifs, setActifs] = useState({})

  // Valeur changée de l'extérieur (formulaire vidé après envoi, brouillon chargé) :
  // on remplace le contenu. Pendant la frappe value === innerHTML, donc le curseur ne bouge pas.
  useEffect(() => {
    const zone = zoneRef.current
    if (zone && (value || '') !== zone.innerHTML) zone.innerHTML = value || ''
  }, [value])

  // Boutons surlignés selon la mise en forme à l'endroit du curseur
  useEffect(() => {
    function majEtats() {
      const zone = zoneRef.current
      const selection = document.getSelection()
      if (!zone || !selection?.anchorNode || !zone.contains(selection.anchorNode)) return
      const etats = {}
      OUTILS.forEach((outil) => {
        if (outil.etat) etats[outil.cle] = document.queryCommandState(outil.cle)
        if (outil.bloc) etats[outil.cle] = document.queryCommandValue('formatBlock').toUpperCase() === outil.bloc
      })
      setActifs(etats)
    }
    document.addEventListener('selectionchange', majEtats)
    return () => document.removeEventListener('selectionchange', majEtats)
  }, [])

  // Nouveaux paragraphes en <p> (Chrome met des <div> par défaut)
  useEffect(() => {
    document.execCommand('defaultParagraphSeparator', false, 'p')
  }, [])

  function signalerChangement() {
    const zone = zoneRef.current
    if (!zone) return
    // Tout effacé : le navigateur laisse souvent un <br>, on vide pour réafficher le texte d'aide
    if (zone.innerHTML === '<br>' || zone.innerHTML === '<p><br></p>') zone.innerHTML = ''
    onChange(zone.innerHTML)
  }

  function appliquer(outil) {
    zoneRef.current?.focus()
    if (outil.cle === 'lien') {
      if (document.getSelection()?.isCollapsed) {
        window.alert("Sélectionnez d'abord le texte à transformer en lien.")
        return
      }
      const adresse = normaliserLien(window.prompt('Adresse du lien (ex. https://www.youtube.com/...)'))
      if (!adresse) return
      document.execCommand('createLink', false, adresse)
    } else if (outil.bloc) {
      // Recliquer sur un titre / une citation actif le remet en paragraphe normal
      const bloc = actifs[outil.cle] && outil.bloc !== 'P' ? 'P' : outil.bloc
      document.execCommand('formatBlock', false, `<${bloc}>`)
    } else {
      document.execCommand(outil.cle, false)
    }
    signalerChangement()
  }

  return (
    <div className={`editeur ${disabled ? 'editeur-desactive' : ''}`}>
      <div className="editeur-barre" role="toolbar" aria-label="Mise en forme">
        {OUTILS.map((outil, index) =>
          outil.separateur ? (
            <span key={`sep-${index}`} className="editeur-separateur" />
          ) : (
            <button
              key={outil.cle}
              type="button"
              className={`editeur-outil ${actifs[outil.cle] ? 'actif' : ''}`}
              title={outil.titre}
              aria-label={outil.titre}
              aria-pressed={Boolean(actifs[outil.cle])}
              style={outil.style}
              disabled={disabled}
              // mousedown + preventDefault : le clic ne fait pas perdre la sélection du texte
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => appliquer(outil)}
            >
              {outil.label}
            </button>
          )
        )}
      </div>

      <div
        ref={zoneRef}
        className="editeur-zone texte-riche"
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Texte du support"
        data-placeholder={placeholder}
        onInput={signalerChangement}
        onBlur={signalerChangement}
      />
    </div>
  )
}

export default EditeurTexte
