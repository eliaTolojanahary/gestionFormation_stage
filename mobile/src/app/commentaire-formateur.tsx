// app/commentaire-formateur.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CircleCheck } from 'lucide-react-native';
import { DetailHeader } from '@/components/detail-header';
import { useCommentaireFormateur, type FormationACommenter } from '@/hooks/use-commentaire-formateur';
import { createCommentaireFormateurStyles } from '@/styles/commentaire-formateur.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { formatDateFr } from '@/utils/format';
import { alerte } from '@/utils/alert';

// Une formation à commenter : le champ et le bouton d'envoi
function CarteCommentaire({ formation, onEnvoyer }: {
  formation: FormationACommenter;
  onEnvoyer: (id: number, texte: string) => Promise<void>;
}) {
  const styles = useThemedStyles(createCommentaireFormateurStyles);
  const { palette } = useSettings();
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  async function envoyer() {
    if (!texte.trim() || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      await onEnvoyer(formation.id_inscription, texte.trim());
      alerte('Merci !', 'Votre commentaire a été envoyé à l’accueil.');
    } catch (requestError: any) {
      setErreur(requestError.message || "Le commentaire n'a pas pu être envoyé.");
      setEnvoi(false);
    }
  }

  const desactive = !texte.trim() || envoi;

  return (
    <View style={styles.carte}>
      <Text style={styles.formation}>{formation.formation_nom}</Text>
      <Text style={styles.detail}>
        Formateur : {formation.formateur_prenom} {formation.formateur_nom}
      </Text>
      <Text style={styles.detail}>Fin de la formation : {formatDateFr(formation.date_fin)}</Text>

      <TextInput
        style={styles.champ}
        multiline
        maxLength={2000}
        value={texte}
        onChangeText={setTexte}
        placeholder="Qu’avez-vous pensé de votre formateur ?"
        placeholderTextColor={palette.textMuted}
        textAlignVertical="top"
      />
      {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

      <TouchableOpacity
        style={[styles.bouton, desactive && styles.boutonDesactive]}
        activeOpacity={0.85}
        disabled={desactive}
        onPress={envoyer}
      >
        {envoi
          ? <ActivityIndicator color={palette.onAccent} />
          : <Text style={styles.boutonTexte}>Envoyer mon commentaire</Text>}
      </TouchableOpacity>
    </View>
  );
}

// Commentaire de fin de formation, obligatoire pour recevoir l'attestation
export default function CommentaireFormateurScreen() {
  const styles = useThemedStyles(createCommentaireFormateurStyles);
  const { palette } = useSettings();
  const router = useRouter();
  const { aCommenter, chargement, erreur, chargerACommenter, envoyerCommentaire } = useCommentaireFormateur();
  const [refreshing, setRefreshing] = useState(false);

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await chargerACommenter();
    } finally {
      setRefreshing(false);
    }
  }, [chargerACommenter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DetailHeader title="Commenter mon formateur" onBack={retour} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.accent} />}
      >
        <Text style={styles.aide}>
          Ce commentaire est obligatoire pour recevoir votre attestation. Il est lu par l’accueil et la
          direction, pas par le formateur.
        </Text>

        {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

        {chargement ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : aCommenter.length === 0 && !erreur ? (
          <View style={styles.vide}>
            <CircleCheck size={22} color={palette.success} />
            <Text style={styles.videTexte}>Aucun commentaire à écrire pour le moment.</Text>
          </View>
        ) : (
          aCommenter.map((formation) => (
            <CarteCommentaire
              key={formation.id_inscription}
              formation={formation}
              onEnvoyer={envoyerCommentaire}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
