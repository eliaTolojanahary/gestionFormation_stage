// app/dossier.tsx
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CircleCheck, CircleAlert } from 'lucide-react-native';
import { DetailHeader } from '@/components/detail-header';
import { PiecesDossier } from '@/components/dossier/pieces-dossier';
import { useDossier, type ChampPiece, type PiecesLocales } from '@/hooks/use-dossier';
import { createDossierStyles } from '@/styles/dossier.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { alerte } from '@/utils/alert';

// Mon dossier (menu ⋮) : les 4 pièces obligatoires de l'étudiant. Il les dépose ou les remplace
// quand il veut ; l'Accueil est notifié. Une inscription en ligne n'est validée qu'avec un dossier complet.
export default function DossierScreen() {
  const styles = useThemedStyles(createDossierStyles);
  const { palette } = useSettings();
  const router = useRouter();
  const { dossier, chargement, erreur, chargerDossier, deposer } = useDossier();
  const [locales, setLocales] = useState<PiecesLocales>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const nbNouvelles = Object.keys(locales).length;

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  function choisir(champ: ChampPiece, uri: string) {
    setLocales((actuel) => ({ ...actuel, [champ]: uri }));
  }

  async function enregistrer() {
    if (nbNouvelles === 0 || envoi) return;
    setEnvoi(true);
    setErreurEnvoi('');
    try {
      const resultat = await deposer(locales);
      setLocales({});
      alerte(
        resultat.complet ? 'Dossier complet' : 'Pièces enregistrées',
        resultat.complet
          ? 'L’accueil a été prévenu et peut valider votre inscription.'
          : `${resultat.fournies}/${resultat.total} pièces fournies. L’accueil a été prévenu.`
      );
    } catch (requestError: any) {
      setErreurEnvoi(requestError.message || "Les pièces n'ont pas pu être envoyées.");
    } finally {
      setEnvoi(false);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await chargerDossier();
    } finally {
      setRefreshing(false);
    }
  }, [chargerDossier]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DetailHeader title="Mon dossier" onBack={retour} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.heading} />}
      >
        {chargement && !dossier ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.heading} />
          </View>
        ) : erreur && !dossier ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erreur}</Text>
          </View>
        ) : dossier ? (
          <>
            <View style={[styles.etat, dossier.complet ? styles.etatComplet : styles.etatIncomplet]}>
              {dossier.complet
                ? <CircleCheck size={22} color={palette.success} />
                : <CircleAlert size={22} color={palette.warning} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.etatTitre}>
                  {dossier.complet ? 'Dossier complet' : `Dossier incomplet : ${dossier.fournies}/${dossier.total} pièces`}
                </Text>
                <Text style={styles.etatTexte}>
                  {dossier.complet
                    ? 'Vous pouvez remplacer une pièce à tout moment (photo floue, document renouvelé…).'
                    : 'Votre inscription en ligne ne sera validée par l’accueil qu’une fois toutes les pièces déposées.'}
                </Text>
              </View>
            </View>

            <Text style={styles.aide}>
              Photographiez chaque pièce bien à plat, en entier et lisible, ou choisissez-la dans la galerie
              (boutons à droite de chaque pièce).
            </Text>

            <PiecesDossier pieces={dossier.pieces} locales={locales} onChoisir={choisir} />

            {erreurEnvoi ? <Text style={styles.erreur}>{erreurEnvoi}</Text> : null}

            <TouchableOpacity
              style={[styles.bouton, (nbNouvelles === 0 || envoi) && styles.boutonDesactive]}
              onPress={enregistrer}
              disabled={nbNouvelles === 0 || envoi}
            >
              {envoi ? (
                <ActivityIndicator color={palette.onAccent} />
              ) : (
                <Text style={styles.boutonTexte}>
                  {nbNouvelles === 0 ? 'Choisissez une pièce à déposer' : `Enregistrer (${nbNouvelles})`}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
