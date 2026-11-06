// app/(tabs)/formations/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Search, BookOpen, GraduationCap, Sparkles, MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useFormationEtudiant, Formation } from '@/hooks/use-formation';
import { useCommentaireFormateur } from '@/hooks/use-commentaire-formateur';
import { useAffichageProgressif } from '@/hooks/use-affichage-progressif';
import { VoirPlus } from '@/components/voir-plus';
import { CarteFormation } from '@/components/formation/carte-formation';
import { DetailHeader } from '@/components/detail-header';
import { createFormationsListStyles } from '@/styles/formations.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { ouvrirSiValidee } from '@/utils/inscription';

// Onglet Formations : formations de l'étudiant, avec recherche et tirer-pour-rafraîchir
export default function FormationsListScreen() {
  const styles = useThemedStyles(createFormationsListStyles);
  const { palette } = useSettings();
  const { user } = useAuth();
  const { formations, isLoading, error, getFormations } = useFormationEtudiant();
  const { aCommenter, chargerACommenter } = useCommentaireFormateur();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [recherche, setRecherche] = useState('');

  const etudiantId = user?.id_etudiant;

  // ─── 1. Chargement des formations ─────────────
  useEffect(() => {
    if (etudiantId) {
      getFormations(etudiantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantId]);

  // Au retour sur cet onglet : le bandeau disparaît une fois le commentaire envoyé
  useFocusEffect(
    useCallback(() => {
      chargerACommenter();
    }, [chargerACommenter])
  );

  // La dernière inscription = formation « en cours »
  const formationEnCoursId =
    formations.length > 0
      ? formations[formations.length - 1]?.id_formation
      : undefined;

  // ─── 2. Recherche locale ──────────────────────
  const formationsFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return formations;

    return formations.filter((formation) => {
      const formateur = `${formation.prenom_formateur || ''} ${
        formation.nom_formateur || ''
      }`;
      const cible = [formation.nom, formation.description, formateur]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return cible.includes(q);
    });
  }, [formations, recherche]);

  const { visibles, restant, voirPlus } = useAffichageProgressif(formationsFiltrees, recherche);

  async function handleRefresh() {
    if (!etudiantId) return;
    setRefreshing(true);
    try {
      await getFormations(etudiantId);
    } finally {
      setRefreshing(false);
    }
  }

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  // Ouvre l'écran de détail /formations/[id] (inscription en attente : message, pas d'accès)
  function ouvrirFormation(formation: Formation) {
    ouvrirSiValidee(formation, () =>
      router.push({
        pathname: '/(tabs)/formations/[id]',
        params: { id: String(formation.id_formation) },
      } as any)
    );
  }

  const aucunResultat =
    formations.length > 0 && formationsFiltrees.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
                <DetailHeader
            title="Formations"
            onBack={retour}
          />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#072E4C"
          />
        }
      >
      
        <Text style={styles.headerSubtitle}>
          Retrouvez vos formations, leurs supports pédagogiques et les échanges
          avec les formateurs.
        </Text>

        {/* ─── Commentaire de fin de formation, obligatoire pour l'attestation ─── */}
        {aCommenter.length > 0 && (
          <TouchableOpacity
            style={styles.commentaireAttendu}
            activeOpacity={0.85}
            onPress={() => router.push('/commentaire-formateur' as any)}
          >
            <MessageCircle size={16} color={palette.warning} />
            <Text style={styles.commentaireAttenduTexte}>
              Commentez votre formateur pour recevoir votre attestation
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Autres formations : vitrine en mode connecté, inscription à une ou plusieurs ─── */}
        <TouchableOpacity
          style={styles.autresFormations}
          activeOpacity={0.85}
          onPress={() => router.push('/decouvrir' as any)}
        >
          <Sparkles size={16} color={palette.accent} />
          <Text style={styles.autresFormationsTexte}>Voir plus de formations et s’inscrire</Text>
        </TouchableOpacity>

        {/* ─── Recherche ─── */}
        <View style={styles.searchBox}>
          <Search size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher une formation ou un formateur"
            placeholderTextColor="#A0AAB8"
            autoCorrect={false}
          />
        </View>

        {/* ─── Erreur ─── */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ─── Contenu ─── */}
        {isLoading && formations.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.heading} />
            <Text style={styles.loadingText}>
              Chargement de vos formations...
            </Text>
          </View>
        ) : !etudiantId ? (
          <View style={styles.emptyBox}>
            <GraduationCap size={32} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Profil étudiant introuvable. Reconnectez-vous pour accéder à vos
              formations.
            </Text>
          </View>
        ) : formations.length === 0 ? (
          <View style={styles.emptyBox}>
            <BookOpen size={32} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Vous n'êtes inscrit à aucune formation pour l'instant.
            </Text>
          </View>
        ) : aucunResultat ? (
          <View style={styles.emptyBox}>
            <Search size={30} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Aucune formation ne correspond à « {recherche.trim()} ».
            </Text>
          </View>
        ) : (
          <>
            {visibles.map((formation, index) => (
              <CarteFormation
                key={formation.id_formation}
                formation={formation}
                index={index}
                enCours={formation.id_formation === formationEnCoursId}
                onPress={() => ouvrirFormation(formation)}
              />
            ))}
            <VoirPlus restant={restant} onPress={voirPlus} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}