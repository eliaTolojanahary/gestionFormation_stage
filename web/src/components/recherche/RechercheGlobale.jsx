import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icon/Icon'
import Avatar from '../avatar/Avatar'
import { apiRequest } from '../../utils/api'
import { menuDuRole } from '../../utils/navigation'
import { formatDateHeureLocale } from '../../utils/time'
import './RechercheGlobale.css'

const LONGUEUR_MIN = 2
const DELAI_FRAPPE = 250 // ms sans frappe avant d'interroger le serveur

const formatAriary = (montant) => `${Number(montant).toLocaleString('fr-FR')} Ar`

// Sans accents ni majuscules : « echeances » trouve « Échéances »
const normaliser = (texte) => String(texte).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Résultats du serveur -> lignes affichables, groupées (titre du groupe, icône, lignes)
function construireGroupes(pages, data) {
  const groupes = []
  const ajouter = (titre, icone, lignes) => lignes.length && groupes.push({ titre, icone, lignes })

  ajouter('Pages', 'grid', pages.map(([icone, libelle, chemin]) => ({
    cle: `page-${chemin}`, type: 'page', chemin, icone, titre: libelle, sousTitre: 'Aller à la page',
  })))
  ajouter('Étudiants', 'users', (data?.etudiants || []).map((e) => ({
    cle: `etudiant-${e.id_etudiant}-${e.id_formation ?? ''}`, type: 'etudiant', id: e.id_etudiant,
    idFormation: e.id_formation, avatar: e, titre: `${e.prenom} ${e.nom}`,
    sousTitre: e.nom_formation ? `${e.email} · ${e.nom_formation}` : e.email,
  })))
  ajouter('Formations', 'book', (data?.formations || []).map((f) => ({
    cle: `formation-${f.id_formation}`, type: 'formation', id: f.id_formation, titre: f.nom,
    sousTitre: [f.duree, f.tarif != null ? formatAriary(f.tarif) : null].filter(Boolean).join(' · '),
  })))
  ajouter('Inscriptions', 'card', (data?.inscriptions || []).map((i) => ({
    cle: `inscription-${i.id_inscription}`, type: 'inscription', id: i.id_inscription,
    titre: `${i.prenom} ${i.nom}`, sousTitre: i.nom_formation,
  })))
  ajouter('Utilisateurs', 'users', (data?.utilisateurs || []).map((u) => ({
    cle: `utilisateur-${u.id_utilisateur}`, type: 'utilisateur', id: u.id_utilisateur, avatar: u,
    titre: `${u.prenom} ${u.nom}`, sousTitre: `${u.role} · ${u.email}`,
  })))
  ajouter('Supports', 'file', (data?.supports || []).map((s) => ({
    cle: `support-${s.id_support}`, type: 'support', id: s.id_support, statut: s.statut, titre: s.titre,
    sousTitre: s.statut === 'programme'
      ? `${s.nom_formation} · programmé le ${formatDateHeureLocale(s.date_envoi_prevue)}`
      : s.nom_formation,
  })))
  // Position de chaque ligne dans la liste complète (navigation au clavier)
  let index = 0
  return groupes.map((groupe) => ({ ...groupe, lignes: groupe.lignes.map((ligne) => ({ ...ligne, index: index++ })) }))
}

// Fenêtre de recherche globale (bouton du header ou Ctrl+K) : pages du menu (filtrées sur place)
// et données du serveur (GET /recherche, limitées aux droits du rôle). ↑ ↓ pour choisir,
// Entrée pour ouvrir, Échap pour fermer. onOuvrir(resultat) est géré par DashboardLayout.
function RechercheGlobale({ user, onClose, onOuvrir }) {
  const [texte, setTexte] = useState('')
  const [data, setData] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [actif, setActif] = useState(0)
  const inputRef = useRef(null)
  const listeRef = useRef(null)

  const q = texte.trim()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Interroge le serveur après une courte pause de frappe ; ignore une réponse dépassée
  useEffect(() => {
    if (q.length < LONGUEUR_MIN) return undefined
    let annule = false
    const minuteur = window.setTimeout(async () => {
      setChargement(true)
      setErreur('')
      try {
        const result = await apiRequest(`/recherche?q=${encodeURIComponent(q)}`)
        if (!annule) setData(result.data)
      } catch (requestError) {
        if (!annule) setErreur(requestError.message || 'Recherche impossible.')
      } finally {
        if (!annule) setChargement(false)
      }
    }, DELAI_FRAPPE)
    return () => {
      annule = true
      window.clearTimeout(minuteur)
    }
  }, [q])

  const pages = useMemo(() => {
    if (!q) return []
    const cherche = normaliser(q)
    return menuDuRole(user?.role).filter(([, libelle]) => normaliser(libelle).includes(cherche))
  }, [q, user?.role])

  const groupes = useMemo(
    () => construireGroupes(pages, q.length >= LONGUEUR_MIN ? data : null),
    [pages, data, q.length]
  )
  const lignes = groupes.flatMap((groupe) => groupe.lignes)
  const indexActif = Math.min(actif, Math.max(lignes.length - 1, 0))

  // Garde la ligne active visible pendant la navigation au clavier
  useEffect(() => {
    listeRef.current?.querySelector('[data-actif="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [indexActif])

  function changerTexte(event) {
    setTexte(event.target.value)
    setActif(0)
    if (event.target.value.trim().length < LONGUEUR_MIN) {
      setData(null)
      setErreur('')
    }
  }

  function clavier(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActif((indexActif + 1) % Math.max(lignes.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActif((indexActif - 1 + lignes.length) % Math.max(lignes.length, 1))
    } else if (event.key === 'Enter' && lignes[indexActif]) {
      event.preventDefault()
      onOuvrir(lignes[indexActif])
    }
  }

  const enAttente = q.length >= LONGUEUR_MIN && (chargement || data === null) && !erreur

  return createPortal(
    <div
      className="recherche-fond"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="recherche-fenetre" role="dialog" aria-modal="true" aria-label="Recherche globale">
        <div className="recherche-champ">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={texte}
            onChange={changerTexte}
            onKeyDown={clavier}
            placeholder="Rechercher un étudiant, une formation, une page…"
            aria-label="Rechercher"
            aria-controls="recherche-resultats"
          />
          <kbd onClick={onClose}>Échap</kbd>
        </div>

        <div className="recherche-resultats" id="recherche-resultats" ref={listeRef} role="listbox">
          {!q && (
            <p className="recherche-info">
              Tapez au moins {LONGUEUR_MIN} lettres : nom, e-mail, téléphone, formation
              {user?.role === 'Formateur' ? ', titre d\'un support' : ''} ou nom d'une page.
            </p>
          )}
          {erreur && <p className="recherche-info recherche-erreur">{erreur}</p>}

          {groupes.map((groupe) => (
            <div className="recherche-groupe" key={groupe.titre}>
              <h3>{groupe.titre}</h3>
              {groupe.lignes.map((ligne) => {
                const { index } = ligne
                return (
                  <button
                    type="button"
                    role="option"
                    key={ligne.cle}
                    className="recherche-ligne"
                    data-actif={index === indexActif}
                    aria-selected={index === indexActif}
                    onMouseMove={() => index !== indexActif && setActif(index)}
                    onClick={() => onOuvrir(ligne)}
                  >
                    {ligne.avatar ? (
                      <Avatar photo={ligne.avatar.photo} prenom={ligne.avatar.prenom} nom={ligne.avatar.nom} shape="circle" />
                    ) : (
                      <span className="recherche-icone"><Icon name={ligne.icone || groupe.icone} /></span>
                    )}
                    <span className="recherche-texte">
                      <strong>{ligne.titre}</strong>
                      {ligne.sousTitre && <small>{ligne.sousTitre}</small>}
                    </span>
                    <span className="recherche-entree" aria-hidden="true">↵</span>
                  </button>
                )
              })}
            </div>
          ))}

          {enAttente && <p className="recherche-info">Recherche…</p>}
          {q.length >= LONGUEUR_MIN && !enAttente && !erreur && lignes.length === 0 && (
            <p className="recherche-info">Aucun résultat pour « {q} ».</p>
          )}
        </div>

        <footer className="recherche-pied">
          <span><kbd>↑</kbd><kbd>↓</kbd> choisir</span>
          <span><kbd>Entrée</kbd> ouvrir</span>
          <span><kbd>Ctrl</kbd>+<kbd>K</kbd> rechercher partout</span>
        </footer>
      </section>
    </div>,
    document.body
  )
}

export default RechercheGlobale
