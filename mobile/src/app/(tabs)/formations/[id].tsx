// app/(tabs)/formations/[id].tsx
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
  MessageCircle, Send, Paperclip,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useDocDetail } from '@/hooks/use-doc-detail';
import { VoirPlus } from '@/components/voir-plus';
import { DetailHeader } from '@/components/detail-header';
import { FormationBlock } from '@/components/formation/formation-block';
import { SupportBlock } from '@/components/doc/support-block';
import { CommentaireBlock, ReponseBanniere } from '@/components/comment/commentaire-block';
import { createFormationsStyles } from '@/styles/formations.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';

// Détail d'une formation : en-tête, description, supports et commentaires (5 par 5, chargés
// par le serveur à chaque « Voir plus »), réactions et formulaire pour commenter un support choisi.
// Toute la logique est dans le hook useDocDetail (mode formation).
export default function FormationDetailScreen() {
  const styles = useThemedStyles(createFormationsStyles);
  const { palette } = useSettings();
  // L'id vient de l'URL (/formations/[id]) ; expo-router peut le donner sous forme de tableau
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const formationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const etudiantId = user?.id_etudiant;

  const {
    formation,
    supports,
    commentaires,
    nbEchanges,
    totalSupports,
    supportsRestants,
    commentairesRestants,
    voirPlusSupports,
    voirPlusCommentaires,
    formateur,
    estEnCours,
    dateInscription,
    chargement,
    refreshing,
    erreur,
    reactionEnCours,
    cibleSupport,
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
    setCibleSupport,
    setBrouillon,
  } = useDocDetail(formationId, undefined, etudiantId);

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/formations' as any);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Barre d'en-tête */}
      <DetailHeader
        title="Détail de la formation"
        onBack={retour}
      />

      {chargement && !formation ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={palette.heading} />
          <Text style={styles.loadingText}>Chargement de la formation...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
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
                tintColor="#072E4C"
              />
            }
          >
            <FormationBlock
              formation={formation}
              estEnCours={estEnCours}
              formateur={formateur}
              dateInscription={dateInscription}
            />

            <View style={styles.body}>
              {erreur ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{erreur}</Text>
                </View>
              ) : null}

              {/* À propos */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>À propos du cours</Text>
                <Text style={styles.aboutText}>
                  {formation?.description ||
                    "Aucune description n'a été renseignée pour cette formation."}
                </Text>
              </View>

              {/* Supports */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Supports pédagogiques</Text>
                  <Text style={styles.cardHeaderMeta}>
                    {totalSupports} fichier{totalSupports > 1 ? 's' : ''}
                  </Text>
                </View>

                {supports.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Paperclip size={20} color={palette.textMuted} />
                    <Text style={styles.emptyInlineText}>
                      Aucun support n'a encore été publié pour cette formation.
                    </Text>
                  </View>
                ) : (
                  <>
                    {supports.map((support) => (
                      <SupportBlock
                        key={support.id_support}
                        support={support}
                        reactions={reactionsDuSupport(support.id_support)}
                        userId={userId}
                        reactionEnCours={reactionEnCours}
                        onReagir={(type) =>
                          basculerReaction(support.id_support, type, userId)
                        }
                        onOuvrir={() => ouvrirFichier(support)}
                      />
                    ))}

                    <VoirPlus restant={supportsRestants} onPress={voirPlusSupports} />
                  </>
                )}
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
                      Aucun commentaire pour l'instant : lancez la discussion.
                    </Text>
                  </View>
                ) : (
                  <>
                    {commentaires.map((commentaire) => (
                      <CommentaireBlock
                        key={commentaire.id_commentaire}
                        commentaire={commentaire}
                        nomSupport={commentaire.titre_support}
                        userId={userId}
                        onRepondre={repondreA}
                      />
                    ))}
                    <VoirPlus restant={commentairesRestants} onPress={voirPlusCommentaires} />
                  </>
                )}

                {/* Formulaire */}
                {supports.length > 0 ? (
                  <View style={styles.formulaire}>
                    {/* Choix du support sur lequel publier le commentaire */}
                    <Text style={styles.formLabel}>Publier sur</Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cibleListe}
                    >
                      {supports.map((support) => {
                        const actif = cibleSupport === support.id_support;
                        return (
                          <TouchableOpacity
                            key={support.id_support}
                            style={[
                              styles.cibleChip,
                              actif && styles.cibleChipActif,
                            ]}
                            activeOpacity={0.8}
                            onPress={() => setCibleSupport(support.id_support)}
                          >
                            <Text
                              style={[
                                styles.cibleChipText,
                                actif && styles.cibleChipTextActif,
                              ]}
                              numberOfLines={1}
                            >
                              {support.titre || 'Support'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {reponseA ? (
                      <ReponseBanniere auteur={reponseA.auteur} onAnnuler={annulerReponse} />
                    ) : null}
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.input}
                        value={brouillon}
                        onChangeText={setBrouillon}
                        placeholder={reponseA ? "Écrire une réponse…" : "Écrire un commentaire…"}
                        placeholderTextColor="#A0AAB8"
                        multiline
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          (!brouillon.trim() || envoiEnCours) &&
                            styles.sendBtnDisabled,
                        ]}
                        activeOpacity={0.85}
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
                ) : (
                  <Text style={styles.hint}>
                    Un support est nécessaire pour publier un commentaire.
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
