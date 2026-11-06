import { useEffect, useMemo, useState } from 'react'
import { useRetour } from '../components/retour/useRetour'

// Sélection multiple dans un Tableau : un clic sur une ligne (ou sur sa case) la sélectionne,
// la case de l'en-tête sélectionne toute la page affichée.
// La sélection est vidée quand les lignes affichées changent (autre page, filtre, rechargement).
// cle = champ identifiant des lignes (ex. 'id_echeance').
export function useSelection(lignes, cle) {
  const [ids, setIds] = useState(() => new Set())

  // Signature des lignes affichées : la sélection ne survit pas à un changement de liste
  const signature = lignes.map((ligne) => ligne[cle]).join(',')
  useEffect(() => {
    setIds((actuels) => (actuels.size ? new Set() : actuels))
  }, [signature])

  const selection = useMemo(() => lignes.filter((ligne) => ids.has(ligne[cle])), [lignes, ids, cle])

  function basculer(ligne) {
    setIds((actuels) => {
      const suivants = new Set(actuels)
      if (suivants.has(ligne[cle])) suivants.delete(ligne[cle])
      else suivants.add(ligne[cle])
      return suivants
    })
  }

  const toutes = lignes.length > 0 && selection.length === lignes.length

  function toutBasculer() {
    setIds(toutes ? new Set() : new Set(lignes.map((ligne) => ligne[cle])))
  }

  return {
    selection,
    nombre: selection.length,
    toutes,
    estSelectionnee: (ligne) => ids.has(ligne[cle]),
    basculer,
    toutBasculer,
    vider: () => setIds(new Set()),
  }
}

// Actions groupées sur une sélection : confirmation, puis l'action est appelée pour chaque ligne,
// l'une après l'autre. Chaque appel passe par la même route que le bouton de la ligne : le serveur
// garde tous ses contrôles (statut, droits) et envoie les mêmes e-mails.
// Une ligne refusée n'arrête pas les autres ; les erreurs sont regroupées dans setErreur.
export function useActionsGroupees({ selection, apres, setErreur }) {
  const { confirmer, notifier } = useRetour()
  const [enCours, setEnCours] = useState(false)

  // lignes : lignes concernées ; succes(n) : message de réussite pour n lignes traitées
  async function lancer({ lignes, confirmation, action, succes }) {
    if (!lignes.length) return
    if (confirmation && !(await confirmer(confirmation))) return

    setErreur('')
    setEnCours(true)
    let reussis = 0
    const erreurs = []
    for (const ligne of lignes) {
      try {
        await action(ligne)
        reussis += 1
      } catch (requestError) {
        erreurs.push(requestError.message)
      }
    }
    setEnCours(false)
    selection.vider()
    apres?.()

    if (reussis) notifier(succes(reussis))
    if (erreurs.length) {
      setErreur(`${erreurs.length} sur ${lignes.length} non traité(s) : ${[...new Set(erreurs)].join(' · ')}`)
    }
  }

  return { lancer, enCours }
}
