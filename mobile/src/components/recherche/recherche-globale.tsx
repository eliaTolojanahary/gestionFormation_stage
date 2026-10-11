// components/recherche/recherche-globale.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, X, ChevronRight, Home, BookOpen, FileText, Bell, User, Wallet, LifeBuoy, Settings,
  GraduationCap, Clock,
} from 'lucide-react-native';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { createRechercheGlobaleStyles } from '@/styles/components/recherche-globale.styles';
import { useRecherche, LONGUEUR_MIN_RECHERCHE, SupportTrouve, FormationTrouvee } from '@/hooks/use-recherche';
import { formatDateCourte } from '@/utils/format';

type Icone = React.ComponentType<{ size?: number; color?: string }>;

// Écrans de l'application, cherchés sur place (sans appel au serveur)
const PAGES: { titre: string; motsCles: string; chemin: string; icone: Icone }[] = [
  { titre: 'Accueil', motsCles: 'accueil tableau de bord', chemin: '/(tabs)', icone: Home },
  { titre: 'Mes formations', motsCles: 'formations cours', chemin: '/(tabs)/formations', icone: BookOpen },
  { titre: 'Documents', motsCles: 'documents supports cours fichiers', chemin: '/(tabs)/documents', icone: FileText },
  { titre: 'Notifications', motsCles: 'notifications messages alertes', chemin: '/(tabs)/notifications', icone: Bell },
  { titre: 'Profil', motsCles: 'profil compte photo', chemin: '/(tabs)/profile', icone: User },
  { titre: 'Paiements', motsCles: 'paiements payer echeances historique factures', chemin: '/paiements', icone: Wallet },
  { titre: 'Assistance', motsCles: 'assistance aide demande probleme', chemin: '/assistance', icone: LifeBuoy },
  { titre: 'Paramètres', motsCles: 'parametres apparence theme mot de passe sessions securite', chemin: '/parametres', icone: Settings },
];

// Minuscules sans accents : « paramètres » trouve « parametres »
function simplifier(texte: string): string {
  const minuscules = texte.toLowerCase();
  try {
    return minuscules.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch {
    return minuscules;
  }
}

// Type de support lisible à partir de l'extension du fichier
function typeSupport(fichier?: string | null): string {
  if (!fichier) return 'Texte';
  const ext = fichier.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'PDF';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'Image';
  if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext)) return 'Audio';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'Vidéo';
  return 'Fichier';
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Recherche globale de l'étudiant (bouton 🔍 des en-têtes) : écrans de l'application,
// ses formations et les supports de ses formations. Un résultat ouvre directement l'écran.
export function RechercheGlobale({ visible, onClose }: Props) {
  const styles = useThemedStyles(createRechercheGlobaleStyles);
  const { palette } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [texte, setTexte] = useState('');
  const { resultats, isLoading, error } = useRecherche(texte);

  const q = texte.trim();
  const pages = useMemo(() => {
    const cherche = simplifier(q);
    if (!cherche) return [];
    return PAGES.filter((p) => simplifier(`${p.titre} ${p.motsCles}`).includes(cherche));
  }, [q]);

  const assezLong = q.length >= LONGUEUR_MIN_RECHERCHE;
  const aucunResultat =
    assezLong && !isLoading && !error &&
    pages.length + resultats.formations.length + resultats.supports.length === 0;

  function fermer() {
    setTexte('');
    onClose();
  }

  // Ferme la fenêtre puis ouvre l'écran (le temps que la fenêtre se ferme)
  function ouvrir(destination: Parameters<typeof router.push>[0]) {
    fermer();
    setTimeout(() => router.push(destination), 150);
  }

  const ouvrirFormation = (f: FormationTrouvee) =>
    ouvrir({ pathname: '/(tabs)/formations/[id]', params: { id: String(f.id_formation) } } as any);
  const ouvrirSupport = (s: SupportTrouve) =>
    ouvrir({
      pathname: '/(tabs)/documents/[id]',
      params: { id: String(s.id_support), formation: String(s.id_formation) },
    } as any);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={fermer}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ─── Champ de recherche ─── */}
        <View style={styles.barre}>
          <View style={styles.champ}>
            <Search size={18} color={palette.textMuted} />
            <TextInput
              style={styles.input}
              value={texte}
              onChangeText={setTexte}
              placeholder="Formation, support, écran..."
              placeholderTextColor={palette.textMuted}
              autoFocus
              autoCorrect={false}
              returnKeyType="search"
            />
            {texte ? (
              <TouchableOpacity onPress={() => setTexte('')} hitSlop={8}>
                <X size={16} color={palette.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity onPress={fermer} style={styles.annuler}>
            <Text style={styles.annulerTexte}>Annuler</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.resultats}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {!q ? (
            <Text style={styles.aide}>
              Cherchez une de vos formations, un support de cours (titre ou texte) ou un écran
              de l'application.
            </Text>
          ) : null}

          {/* Écrans */}
          {pages.length > 0 ? (
            <View style={styles.groupe}>
              <Text style={styles.groupeTitre}>Écrans</Text>
              {pages.map((p) => {
                const Icone = p.icone;
                return (
                  <TouchableOpacity key={p.chemin} style={styles.ligne} onPress={() => ouvrir(p.chemin as any)}>
                    <View style={styles.icone}><Icone size={18} color={palette.accent} /></View>
                    <View style={styles.ligneTexte}><Text style={styles.ligneTitre}>{p.titre}</Text></View>
                    <ChevronRight size={18} color={palette.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {q && !assezLong ? (
            <Text style={styles.aide}>Tapez au moins {LONGUEUR_MIN_RECHERCHE} caractères pour chercher dans vos cours.</Text>
          ) : null}

          {isLoading ? <ActivityIndicator style={styles.chargement} color={palette.accent} /> : null}
          {error ? <Text style={styles.erreur}>{error}</Text> : null}

          {/* Formations */}
          {assezLong && resultats.formations.length > 0 ? (
            <View style={styles.groupe}>
              <Text style={styles.groupeTitre}>Mes formations</Text>
              {resultats.formations.map((f) => (
                <TouchableOpacity key={f.id_formation} style={styles.ligne} onPress={() => ouvrirFormation(f)}>
                  <View style={styles.icone}><GraduationCap size={18} color={palette.accent} /></View>
                  <View style={styles.ligneTexte}>
                    <Text style={styles.ligneTitre} numberOfLines={1}>{f.nom}</Text>
                    <Text style={styles.ligneSousTitre} numberOfLines={1}>
                      {Number(f.valide) ? (f.duree ? `Durée : ${f.duree}` : 'Inscription validée') : 'En attente de validation par l’accueil'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* Supports */}
          {assezLong && resultats.supports.length > 0 ? (
            <View style={styles.groupe}>
              <Text style={styles.groupeTitre}>Supports de cours</Text>
              {resultats.supports.map((s) => (
                <TouchableOpacity key={s.id_support} style={styles.ligne} onPress={() => ouvrirSupport(s)}>
                  <View style={styles.icone}><FileText size={18} color={palette.accent} /></View>
                  <View style={styles.ligneTexte}>
                    <Text style={styles.ligneTitre} numberOfLines={1}>{s.titre || 'Support'}</Text>
                    <View style={styles.meta}>
                      <Text style={styles.ligneSousTitre} numberOfLines={1}>
                        {typeSupport(s.fichier)} · {s.nom_formation}
                      </Text>
                      {s.date_publication ? (
                        <>
                          <Clock size={11} color={palette.textMuted} />
                          <Text style={styles.ligneSousTitre}>{formatDateCourte(s.date_publication)}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <ChevronRight size={18} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {aucunResultat ? (
            <View style={styles.vide}>
              <Search size={28} color={palette.textMuted} />
              <Text style={styles.videTexte}>Aucun résultat pour « {q} »</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
