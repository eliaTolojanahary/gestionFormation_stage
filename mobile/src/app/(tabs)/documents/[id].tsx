// app/(tabs)/documents/[id].tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Download,
  MessageCircle,
  Send,
  Paperclip,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useDocDetail } from '@/hooks/use-doc-detail';
import { ReactionBlock } from '@/components/comment/reaction-block';
import { CommentaireBlock, ReponseBanniere } from '@/components/comment/commentaire-block';
import { formatAjout, getFileTypeLabel } from '@/utils/format';
import { DetailHeader } from '@/components/detail-header';
import { createDocumentsStyles } from '@/styles/documents.styles';
import { useSettings, useThemedStyles } from '@/context/SettingsContext';

// Détail d'un support : ouverture du fichier (lecteur sécurisé), réactions et commentaires.
// Logique dans le hook useDocDetail (mode support).
export default function SupportDetailScreen() {
  const styles = useThemedStyles(createDocumentsStyles);
  const { palette } = useSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const supportId = Array.isArray(params.id) ? params.id[0] : params.id;

  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const etudiantId = user?.id_etudiant;

  const {
    supportsParId,
    commentaires,
    nbEchanges,
    chargement,
    refreshing,
    erreur,
    reactionEnCours,
    brouillon,
    envoiEnCours,
    erreurCommentaire,
    refresh,
    reactionsDuSupport,
    basculerReaction,
    publierCommentaire,
    repondreA,
    reponseA,
    annulerReponse,
    ouvrirFichier,
    setBrouillon,
  } = useDocDetail(undefined, supportId, etudiantId);

  // Support ciblé (le hook met supports = [support] en mode support)
  const support = supportId ? supportsParId[Number(supportId)] : undefined;

  function retour() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/documents' as any);
  }
  
}
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <DetailHeader
              title="Détail du support"
              onBack={retour}
            />

      {chargement && !support ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text style={styles.loadingText}>Chargement du support...</Text>
        </View>
      ) : !support ? (
        <View style={styles.loadingBox}>
          <Text style={styles.errorText}>Support introuvable.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={palette.accent}
              />
            }
          >
            {erreur ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{erreur}</Text>
              </View>
            ) : null}

            {/* Carte support */}
            <View style={styles.card}>
              <View style={styles.supportHeader}>
                <View style={styles.supportIconWrapper}>
                  <Paperclip size={20} color={palette.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supportTitle}>
                    {support.titre || 'Support'}
                  </Text>
                  <Text style={styles.supportMeta}>
                    {getFileTypeLabel(support.fichier)} · Ajouté{' '}
                    {formatAjout(
                      support.date_publication || support.date_ajout
                    ).toLowerCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.downloadBtn}
                  onPress={() => ouvrirFichier(support)}
                >
                  <Download size={18} color={palette.accent} />
                </TouchableOpacity>
              </View>

              {support.description ? (
                <Text style={styles.supportDescription}>
                  {support.description}
                </Text>
              ) : null}

              {/* Réactions */}
              <ReactionBlock
                reactions={reactionsDuSupport(support.id_support)}
                userId={userId}
                disabled={reactionEnCours}
                onReagir={(type) =>
                  basculerReaction(support.id_support, type, userId)
                }
              />
            </View>

            {/* Commentaires */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Commentaires</Text>
                <Text style={styles.cardHeaderMeta}>
                  {nbEchanges} échange
                  {nbEchanges > 1 ? 's' : ''}
                </Text>
              </View>

              {commentaires.length === 0 ? (
                <View style={styles.emptyInline}>
                  <MessageCircle size={20} color={palette.textMuted} />
                  <Text style={styles.emptyInlineText}>
                    Aucun commentaire pour l'instant.
                  </Text>
                </View>
              ) : (
                commentaires.map((c) => (
                  <CommentaireBlock
                    key={c.id_commentaire}
                    commentaire={c}
                    userId={userId}
                    onRepondre={repondreA}
                  />
                ))
              )}

              {/* Formulaire */}
              <View style={styles.formulaire}>
                {reponseA ? (
                  <ReponseBanniere auteur={reponseA.auteur} onAnnuler={annulerReponse} />
                ) : null}
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={brouillon}
                    onChangeText={setBrouillon}
                    placeholder={reponseA ? "Écrire une réponse…" : "Écrire un commentaire…"}
                    placeholderTextColor={palette.textMuted}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      (!brouillon.trim() || envoiEnCours) &&
                        styles.sendBtnDisabled,
                    ]}
                    onPress={publierCommentaire}
                    disabled={!brouillon.trim() || envoiEnCours}
                  >
                    {envoiEnCours ? (
                      <ActivityIndicator size="small" color={palette.onAccent} />
                    ) : (
                      <Send size={17} color={palette.onAccent} />
                    )}
                  </TouchableOpacity>
                </View>
                {erreurCommentaire ? (
                  <Text style={styles.formError}>{erreurCommentaire}</Text>
                ) : null}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
