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
import { SupportBlock } from '@/components/doc/support-block';
import { DetailHeader } from '@/components/detail-header';
import { createDocumentsListStyles } from '@/styles/documents.styles';
import { useThemedStyles } from '@/context/SettingsContext';

// Onglet Documents : tous les supports de l'étudiant, avec recherche et filtres
// (logique dans le hook useDocumentsList) ; toucher un support ouvre son détail
export default function DocumentsListScreen() {
  const styles = useThemedStyles(createDocumentsListStyles);
  const { user } = useAuth();
  const router = useRouter();
  const etudiantId = user?.id_etudiant;

  const {
    supports,
    totalSupports,
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

  // Affiche le bouton "Réinitialiser" seulement si un filtre ou une recherche est actif
  const filtresActifs =
    filtreFormation !== 'Toutes' ||
    filtreFormateur !== 'Tous' ||
    recherche.trim() !== '';

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
          <Search size={18} color="#8E9AA8" style={{ marginRight: 8 }} />
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
              <X size={16} color="#8E9AA8" />
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
                  key={f}
                  style={[
                    styles.chip,
                    filtreFormateur === f && styles.chipActif,
                  ]}
                  onPress={() => setFiltreFormateur(f)}
                >
                  <User
                    size={12}
                    color={filtreFormateur === f ? '#FFF' : '#5A6E85'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      filtreFormateur === f && styles.chipTextActif,
                      { marginLeft: 5 },
                    ]}
                    numberOfLines={1}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {filtresActifs && (
          <TouchableOpacity style={styles.resetBtn} onPress={resetFiltres}>
            <X size={14} color="#0A3B66" />
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
            <ActivityIndicator size="large" color="#072E4C" />
            <Text style={styles.loadingText}>Chargement des supports...</Text>
          </View>
        ) : !etudiantId ? (
          <View style={styles.emptyBox}>
            <GraduationCap size={32} color="#8898AA" />
            <Text style={styles.emptyText}>
              Profil étudiant introuvable. Reconnectez-vous.
            </Text>
          </View>
        ) : totalSupports === 0 ? (
          <View style={styles.emptyBox}>
            <BookOpen size={32} color="#8898AA" />
            <Text style={styles.emptyText}>
              Aucun support n'est disponible pour l'instant.
            </Text>
          </View>
        ) : supports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Search size={30} color="#8898AA" />
            <Text style={styles.emptyText}>
              Aucun support ne correspond à vos critères.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {supports.length} résultat{supports.length > 1 ? 's' : ''}
            </Text>

            {supports.map((support: any) => (
              <SupportBlock
                key={support.id_support}
                support={support}
                nomFormation={support.nom_formation}
                nomFormateur={`${support.prenom_formateur || ''} ${
                  support.nom_formateur || ''
                }`.trim()}
                onPress={() => ouvrirSupport(support.id_support)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}