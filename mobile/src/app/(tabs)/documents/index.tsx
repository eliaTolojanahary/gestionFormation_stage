// app/(tabs)/documents/index.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, BookOpen, GraduationCap, X, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useDocumentsList } from '@/hooks/use-document-lists';
import { VoirPlus } from '@/components/voir-plus';
import { SupportBlock } from '@/components/doc/support-block';
import { DetailHeader } from '@/components/detail-header';
import { createDocumentsListStyles } from '@/styles/documents.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';

// Onglet Documents : tous les supports de l'étudiant, avec recherche et filtres
// (logique dans le hook useDocumentsList) ; toucher un support ouvre son détail
export default function DocumentsListScreen() {
  const styles = useThemedStyles(createDocumentsListStyles);
  const { palette } = useSettings();
  const { user } = useAuth();
  const router = useRouter();
  const etudiantId = user?.id_etudiant;

  const {
    supports,
    total,
    restant,
    filtresActifs,
    formations,
    formateurs,
    isLoading,
    error,
    refreshing,
    recherche,
    setRecherche,
    filtreFormation,
    setFiltreFormation,
    filtreFormateur,
    setFiltreFormateur,
    resetFiltres,
    refresh,
    voirPlus,
  } = useDocumentsList(etudiantId);

  function ouvrirSupport(id: number) {
    router.push({
      pathname: '/(tabs)/documents/[id]',
      params: { id: String(id) },
    } as any);
  }

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DetailHeader
        title="Documents"
        onBack={retour}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#072E4C"
          />
        }
      >
        
        <Text style={styles.headerSubtitle}>
          Tous vos supports pédagogiques, classés par formation et par formateur.
        </Text>

        {/* Recherche */}
        <View style={styles.searchBox}>
          <Search size={18} color={palette.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            value={recherche}
            onChangeText={setRecherche}
            placeholder="Rechercher un support, une formation..."
            placeholderTextColor="#A0AAB8"
            autoCorrect={false}
          />
          {recherche ? (
            <TouchableOpacity onPress={() => setRecherche('')}>
              <X size={16} color={palette.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filtres formations */}
        <Text style={styles.filterLabel}>Filtrer par formation</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              filtreFormation === 'Toutes' && styles.chipActif,
            ]}
            onPress={() => setFiltreFormation('Toutes')}
          >
            <Text
              style={[
                styles.chipText,
                filtreFormation === 'Toutes' && styles.chipTextActif,
              ]}
            >
              Toutes
            </Text>
          </TouchableOpacity>

          {formations.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.chip,
                filtreFormation === f.id && styles.chipActif,
              ]}
              onPress={() => setFiltreFormation(f.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  filtreFormation === f.id && styles.chipTextActif,
                ]}
                numberOfLines={1}
              >
                {f.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtres formateurs */}
        {formateurs.length > 1 && (
          <>
            <Text style={styles.filterLabel}>Filtrer par formateur</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  filtreFormateur === 'Tous' && styles.chipActif,
                ]}
                onPress={() => setFiltreFormateur('Tous')}
              >
                <Text
                  style={[
                    styles.chipText,
                    filtreFormateur === 'Tous' && styles.chipTextActif,
                  ]}
                >
                  Tous
                </Text>
              </TouchableOpacity>

              {formateurs.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.chip,
                    filtreFormateur === f.id && styles.chipActif,
                  ]}
                  onPress={() => setFiltreFormateur(f.id)}
                >
                  <User
                    size={12}
                    color={filtreFormateur === f.id ? '#FFF' : '#5A6E85'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      filtreFormateur === f.id && styles.chipTextActif,
                      { marginLeft: 5 },
                    ]}
                    numberOfLines={1}
                  >
                    {f.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {filtresActifs && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetFiltres}>
            <X size={14} color={palette.heading} />
            <Text style={styles.resetText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        )}

        {/* Erreur */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Contenu */}
        {isLoading && supports.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.heading} />
            <Text style={styles.loadingText}>Chargement des supports...</Text>
          </View>
        ) : !etudiantId ? (
          <View style={styles.emptyBox}>
            <GraduationCap size={32} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Profil étudiant introuvable. Reconnectez-vous.
            </Text>
          </View>
        ) : total === 0 && !filtresActifs ? (
          <View style={styles.emptyBox}>
            <BookOpen size={32} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Aucun support n'est disponible pour l'instant.
            </Text>
          </View>
        ) : supports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Search size={30} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Aucun support ne correspond à vos critères.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {total} résultat{total > 1 ? 's' : ''}
            </Text>

            {supports.map((support: any) => (
              <SupportBlock
                key={support.id_support}
                support={support}
                nomFormation={support.nom_formation}
                nomFormateur={`${support.prof_prenom || ''} ${
                  support.prof_nom || ''
                }`.trim()}
                onPress={() => ouvrirSupport(support.id_support)}
              />
            ))}
            <VoirPlus restant={restant} onPress={voirPlus} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}