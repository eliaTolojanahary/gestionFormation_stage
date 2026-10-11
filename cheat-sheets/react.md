# Aide-mémoire React (web) et React Native (mobile)

Syntaxe et motifs courants, pour écrire des composants sans IA. Exemples dans le style du projet
(voir aussi [`../CHEAT-SHEET.md`](../CHEAT-SHEET.md) pour le projet lui-même).

---

## 1. JSX : les règles

```jsx
function Carte({ titre }) {
  return (
    <>                                   {/* fragment : un seul élément racine */}
      <h2 className="titre">{titre}</h2> {/* className, pas class */}
      <label htmlFor="email">E-mail</label>
      <input id="email" />               {/* balises toujours fermées */}
      <p style={{ marginTop: 8, color: 'var(--accent)' }}>…</p>  {/* style = objet, camelCase */}
      {/* commentaire */}
    </>
  )
}
```
- Entre `{ }` : n'importe quelle **expression** JS (pas de `if` ni de `for` : utiliser `? :`, `&&`, `.map`).
- Un composant = une fonction dont le nom commence par une **majuscule**, qui renvoie du JSX.

---

## 2. Composants et props

```jsx
// Déclarer
function Badge({ texte, couleur = 'var(--accent)', onClick, children }) {
  return (
    <span className="badge" style={{ color: couleur }} onClick={onClick}>
      {texte} {children}
    </span>
  )
}
export default Badge

// Utiliser
<Badge texte="Payé" couleur="var(--success)" onClick={() => ouvrir(id)}>✓</Badge>
```
- Les props sont **en lecture seule** : on ne les modifie pas.
- Passer une fonction : `onSaved={recharger}` (sans parenthèses), ou `onClick={() => supprimer(id)}`.
  ⚠️ `onClick={supprimer(id)}` l'exécute tout de suite à chaque affichage.
- Remonter une info au parent : le parent passe une fonction, l'enfant l'appelle (`onChange(valeur)`).

---

## 3. État : useState

```jsx
import { useState } from 'react'

const [compteur, setCompteur] = useState(0)
setCompteur(compteur + 1)
setCompteur((c) => c + 1)            // à partir de la valeur précédente (plus sûr)

// Objet : toujours une NOUVELLE copie (jamais form.email = …)
const [form, setForm] = useState({ email: '', motDePasse: '' })
setForm({ ...form, email: 'a@b.mg' })
setForm((f) => ({ ...f, email: 'a@b.mg' }))

// Tableau
setListe((l) => [...l, nouveau])                                  // ajouter
setListe((l) => l.filter((x) => x.id !== id))                     // supprimer
setListe((l) => l.map((x) => (x.id === id ? { ...x, lu: true } : x)))  // modifier

// Valeur initiale coûteuse : fonction (calculée une seule fois)
const [settings] = useState(() => lirePreferences())
```
- `setXxx` ne change pas la variable tout de suite : la nouvelle valeur est visible au **prochain rendu**.
- Ne pas copier une prop dans un état si on peut la calculer : `const total = lignes.length`.

---

## 4. Événements et formulaires

```jsx
function Connexion({ onLogin }) {
  const [form, setForm] = useState({ email: '', motDePasse: '' })
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  const champ = (cle) => (e) => setForm({ ...form, [cle]: e.target.value })

  async function handleSubmit(event) {
    event.preventDefault()                         // pas de rechargement de la page
    if (!form.email) return setErreur('E-mail requis.')
    setEnCours(true)
    setErreur('')
    try {
      await onLogin(form.email, form.motDePasse)
    } catch (err) {
      setErreur(err.message)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {erreur && <div className="form-message error" role="alert">{erreur}</div>}
      <input type="email" value={form.email} onChange={champ('email')} required />
      <input type="password" value={form.motDePasse} onChange={champ('motDePasse')} />
      <select value={form.role} onChange={champ('role')}>
        <option value="">Choisir…</option>
        <option value="Accueil">Accueil</option>
      </select>
      <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
      <input type="file" onChange={(e) => setFichier(e.target.files?.[0])} />
      <button type="submit" disabled={enCours}>{enCours ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  )
}
```
Autres événements : `onChange`, `onClick`, `onSubmit`, `onKeyDown={(e) => e.key === 'Enter' && …}`,
`onBlur`, `onFocus`. Stopper la propagation : `e.stopPropagation()`.

---

## 5. Affichage conditionnel et listes

```jsx
{isLoading && <p>Chargement…</p>}
{error ? <p className="erreur">{error}</p> : <Tableau lignes={lignes} />}
{lignes.length === 0 && !isLoading && <p>Aucun résultat.</p>}
{/* ⚠️ {liste.length && …} affiche « 0 » quand la liste est vide : écrire liste.length > 0 && … */}

<ul>
  {paiements.map((p) => (
    <li key={p.id_paiement}>{p.etudiant_nom} — {p.montant} MGA</li>  // key unique et stable (pas l'index)
  ))}
</ul>

// Classe conditionnelle
<button className={`onglet ${actif ? 'active' : ''}`}>…</button>

// Sortir tôt
if (!user) return null
```

---

## 6. useEffect : effets (chargement, minuteur, abonnement)

```jsx
import { useEffect } from 'react'

useEffect(() => { /* à chaque rendu */ })
useEffect(() => { /* une fois, au montage */ }, [])
useEffect(() => { /* au montage et quand id change */ }, [id])

// Chargement depuis l'API, avec annulation
useEffect(() => {
  let annule = false
  async function charger() {
    setIsLoading(true)
    try {
      const r = await apiRequest(`/formations/${id}`)
      if (!annule) setFormation(r.data)
    } catch (e) {
      if (!annule) setError(e.message)
    } finally {
      if (!annule) setIsLoading(false)
    }
  }
  charger()
  return () => { annule = true }        // nettoyage : la page a changé avant la réponse
}, [id])

// Minuteur / écouteur : toujours nettoyer
useEffect(() => {
  const t = setInterval(verifierSession, 60_000)
  const touche = (e) => e.ctrlKey && e.key === 'k' && ouvrirRecherche()
  window.addEventListener('keydown', touche)
  return () => { clearInterval(t); window.removeEventListener('keydown', touche) }
}, [])

// Recherche : attendre 250 ms après la dernière frappe (debounce)
useEffect(() => {
  const t = setTimeout(() => chercher(texte), 250)
  return () => clearTimeout(t)
}, [texte])
```
- Le tableau de dépendances liste **tout ce que l'effet utilise** (règle ESLint `exhaustive-deps`).
- Boucle infinie : un effet qui modifie un état présent dans ses propres dépendances.
- Pas besoin d'effet pour une valeur calculable à partir de l'état : la calculer pendant le rendu.

---

## 7. Autres hooks

```jsx
import { useMemo, useCallback, useRef, useContext, createContext } from 'react'

// Calcul mis en cache (liste filtrée, total…)
const filtrees = useMemo(
  () => lignes.filter((l) => l.nom.toLowerCase().includes(recherche.toLowerCase())),
  [lignes, recherche]
)

// Fonction stable (passée à un enfant ou utilisée dans un effet)
const recharger = useCallback(() => setVersion((v) => v + 1), [])

// Référence à un élément du DOM, ou valeur gardée sans provoquer de rendu
const inputRef = useRef(null)
<input ref={inputRef} />      inputRef.current?.focus()      inputRef.current?.click()

// Contexte : partager une valeur sans la passer de parent en enfant
const ThemeContext = createContext('light')
<ThemeContext.Provider value={theme}><App /></ThemeContext.Provider>
const theme = useContext(ThemeContext)
```
Règles des hooks : toujours au **début** du composant, jamais dans un `if`, une boucle ou une
fonction imbriquée ; noms commençant par `use`.

---

## 8. Hook personnalisé (le motif du projet)

```jsx
// hooks/useAssistance.js : état + fonctions qui appellent l'API
export function useAssistance() {
  const [demandes, setDemandes] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function getDemandes() {
    setIsLoading(true)
    setError('')
    try {
      const r = await apiRequest('/assistances')
      setDemandes(r.data || [])
    } catch (e) {
      setError(e.message || 'Chargement impossible.')
    } finally {
      setIsLoading(false)
    }
  }

  async function resoudre(id) {
    const r = await apiRequest(`/assistances/${id}/resoudre`, { method: 'PUT' })
    setDemandes((l) => l.map((d) => (d.id_assistance === id ? r.data : d)))
  }

  useEffect(() => { getDemandes() }, [])
  return { demandes, isLoading, error, getDemandes, resoudre }
}

// Dans la page
const { demandes, isLoading, error, resoudre } = useAssistance()
```

---

## 9. Appels à l'API (fetch)

```js
const r = await fetch(`${import.meta.env.VITE_URL_BASE}/formations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ nom, tarif }),
})
const data = await r.json()
if (!r.ok) throw new Error(data.message)

// Fichier : FormData, SANS en-tête Content-Type (le navigateur le met lui-même)
const fd = new FormData()
fd.append('titre', titre)
fd.append('fichier', fichier)
await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })

// Paramètres d'URL
const params = new URLSearchParams({ page: '1', recherche: 'rabe' })
await fetch(`${base}/paiements?${params}`)
```
Dans le projet, tout passe par `apiRequest(chemin, options)` (`utils/api.js`) qui ajoute le token,
lit le JSON, lève une erreur avec le message du serveur et renvoie à `/login` sur un 401.

---

## 10. React Router (navigation web)

```jsx
import { BrowserRouter, Routes, Route, Navigate, Link, NavLink,
         useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'

// main.jsx
<BrowserRouter><App /></BrowserRouter>

// Déclarer les routes
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/dashboard/*" element={user ? <Layout /> : <Navigate to="/login" replace />} />
  <Route path="*" element={<Navigate to="/dashboard" replace />} />
</Routes>

// Routes imbriquées (dans Layout, sous /dashboard)
<Routes>
  <Route index element={<Accueil />} />                  {/* /dashboard */}
  <Route path="etudiants" element={<Etudiants />} />     {/* /dashboard/etudiants */}
  <Route path="etudiants/:id" element={<EtudiantDetail />} />
</Routes>

// Lien et navigation
<Link to="/dashboard/etudiants">Étudiants</Link>
<NavLink to="/dashboard/paiements" className={({ isActive }) => (isActive ? 'actif' : '')}>Paiements</NavLink>
const navigate = useNavigate()
navigate('/dashboard/etudiants/12')
navigate(-1)                                  // retour
navigate('/login', { replace: true, state: { depuis: '/dashboard/etudiants/12' } })

// Lire l'adresse
const { id } = useParams()                    // '12' (chaîne)
const location = useLocation()                // location.pathname, location.state
const [searchParams, setSearchParams] = useSearchParams()   // ?page=2
searchParams.get('page')
```

---

## 11. Styles

```jsx
import './Paiements.css'                      // CSS classique, importé par le composant
<div className="carte carte--active" />
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} />
```
```css
:root { --accent: #063a5c; --page-bg: #f5f7fa; }
[data-theme='dark'] { --accent: #38bdf8; --page-bg: #0f172a; }
.bouton { background: var(--accent); color: var(--on-accent); }
@media (max-width: 760px) { .grille { grid-template-columns: 1fr; } }
```

---

## 12. Vite (outil du web)

```bash
npm create vite@latest mon-app -- --template react   # nouveau projet
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # version de production dans dist/
```
Variables d'environnement : dans `.env`, préfixe **`VITE_`** obligatoire → `import.meta.env.VITE_URL_BASE`.
Relancer `npm run dev` après avoir modifié `.env`.

---

## 13. Erreurs fréquentes

| Message / symptôme | Cause | Correction |
|---|---|---|
| `Each child in a list should have a unique "key"` | `key` absente dans un `.map` | `key={item.id}` |
| `Too many re-renders` | `setState` appelé pendant le rendu (`onClick={setX(1)}`) | `onClick={() => setX(1)}` |
| L'écran ne se met pas à jour | État modifié directement (`liste.push`) | Nouvelle copie (`[...liste, x]`) |
| Valeur « en retard » d'un rendu | Lecture de l'état juste après `setX` | Utiliser la nouvelle valeur calculée, ou `setX((v) => …)` |
| Requêtes en boucle | Effet sans tableau de dépendances, ou qui modifie ses dépendances | Vérifier `[deps]` |
| `Can't perform a React state update on an unmounted component` | Réponse arrivée après avoir quitté la page | Drapeau `annule` dans l'effet |
| `Invalid hook call` | Hook appelé hors d'un composant ou dans un `if` | Le remonter en haut du composant |
| `X is not defined` / page blanche | Import manquant | Console F12 : fichier et ligne |
| Un « 0 » s'affiche tout seul | `{liste.length && …}` | `{liste.length > 0 && …}` |

---

## 14. React Native / Expo (mobile)

**Composants de base** (pas de HTML) :
```tsx
import { View, Text, TextInput, TouchableOpacity, Pressable, Image, ScrollView,
         FlatList, Modal, ActivityIndicator, Alert, StyleSheet, Platform } from 'react-native'

<View style={styles.carte}>
  <Text style={styles.titre} numberOfLines={1}>{formation.nom}</Text>   {/* tout texte dans <Text> */}
  <TextInput value={texte} onChangeText={setTexte} placeholder="Rechercher…" secureTextEntry={false} />
  <TouchableOpacity onPress={() => ouvrir(id)} activeOpacity={0.7}><Text>Ouvrir</Text></TouchableOpacity>
  <Image source={{ uri: url }} style={{ width: 80, height: 80, borderRadius: 40 }} />
</View>

<FlatList
  data={supports}
  keyExtractor={(s) => String(s.id_support)}
  renderItem={({ item }) => <SupportCarte support={item} />}
  ListEmptyComponent={<Text>Aucun support</Text>}
  refreshing={refreshing}
  onRefresh={recharger}
/>

Alert.alert('Session fermée', 'Reconnectez-vous.', [{ text: 'OK', onPress: () => router.replace('/login') }])
```

**Styles** : `StyleSheet.create`, valeurs en nombres (pas de `px`), **flex en colonne par défaut**.
```tsx
const styles = StyleSheet.create({
  ligne: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  carte: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: '#fff' },
  titre: { fontSize: 15, fontWeight: '700' },        // fontWeight : chaîne
})
<View style={[styles.carte, actif && styles.carteActive]} />   // plusieurs styles
```

**Navigation (Expo Router : un fichier = un écran)**
```
app/_layout.tsx           mise en page générale
app/login.tsx             → '/login'
app/(tabs)/index.tsx      → onglet Accueil
app/(tabs)/documents/[id].tsx  → '/documents/12' (paramètre id)
```
```tsx
import { useRouter, useLocalSearchParams, Link } from 'expo-router'
const router = useRouter()
router.push('/paiements')
router.push({ pathname: '/(tabs)/documents/[id]', params: { id: String(id) } })
router.replace('/login')                      // sans retour possible
router.canGoBack() ? router.back() : router.replace('/(tabs)')
const { id } = useLocalSearchParams<{ id: string }>()
```

**Stockage local, plateforme, environnement**
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
await AsyncStorage.setItem('auth_token', token)
const token = await AsyncStorage.getItem('auth_token')
await AsyncStorage.removeItem('auth_token')

Platform.OS === 'android'
process.env.EXPO_PUBLIC_API_URL               // préfixe EXPO_PUBLIC_ obligatoire
```
⚠️ Sur un téléphone, `localhost` désigne le téléphone : utiliser l'**IP du PC** (`ipconfig`).

**Commandes**
```bash
npx expo start            # QR code à scanner avec Expo Go
npx expo start -c         # vider le cache
npx expo install paquet   # installer une version compatible avec Expo
npx tsc --noEmit          # vérifier les types TypeScript
```

**TypeScript (mobile) en bref**
```tsx
interface Formation { id_formation: number; nom: string; duree?: string }   // ? = optionnel
const [liste, setListe] = useState<Formation[]>([])
function Carte({ formation, onPress }: { formation: Formation; onPress: () => void }) { … }
catch (e: any) { setError(e?.message || 'Erreur') }
```
