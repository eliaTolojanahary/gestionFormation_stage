// components/dossier/pieces-dossier.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Images, FileText, CircleCheck, CircleAlert } from 'lucide-react-native';
import { getFileUrl } from '@/utils/format';
import { ImageLightbox } from '@/components/image-lightbox';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { createPiecesDossierStyles } from '@/styles/components/pieces-dossier.styles';
import type { ChampPiece, PiecesLocales } from '@/hooks/use-dossier';

interface Props {
  /** Pièces à afficher ; `fichier` = pièce déjà enregistrée sur le serveur (Mon dossier) */
  pieces: { champ: ChampPiece; libelle: string; fichier?: string | null }[];
  /** Photos choisies sur le téléphone, pas encore envoyées */
  locales: PiecesLocales;
  onChoisir: (champ: ChampPiece, uri: string) => void;
}

const estPdf = (chemin: string) => chemin.toLowerCase().endsWith('.pdf');

// Une ligne par pièce : aperçu, état (fournie / nouvelle / à déposer), photo avec l'appareil ou la galerie.
// Utilisé par l'inscription en ligne (étape « Votre dossier ») et par l'écran Mon dossier.
export function PiecesDossier({ pieces, locales, onChoisir }: Props) {
  const styles = useThemedStyles(createPiecesDossierStyles);
  const { palette } = useSettings();
  const [apercu, setApercu] = useState<string | null>(null);

  async function prendre(champ: ChampPiece, source: 'camera' | 'galerie') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission refusée',
        source === 'camera'
          ? "L'accès à l'appareil photo est nécessaire pour photographier la pièce."
          : "L'accès à la galerie est nécessaire pour choisir la pièce."
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled && result.assets[0]) onChoisir(champ, result.assets[0].uri);
  }

  return (
    <View>
      {pieces.map((piece) => {
        const locale = locales[piece.champ];
        const enregistre = piece.fichier || null;
        const source = locale || (enregistre && !estPdf(enregistre) ? getFileUrl(enregistre) : null);

        let statut = { texte: 'À déposer', style: styles.statutManquant };
        if (locale) statut = { texte: enregistre ? 'Nouvelle photo, à enregistrer' : 'Prête à envoyer', style: styles.statutNouveau };
        else if (enregistre) statut = { texte: 'Fournie', style: styles.statutFourni };

        return (
          <View key={piece.champ} style={[styles.piece, !locale && !enregistre && styles.pieceManquante]}>
            <TouchableOpacity
              style={styles.vignette}
              disabled={!source}
              onPress={() => setApercu(source)}
              accessibilityLabel={`Voir ${piece.libelle}`}
            >
              {source ? (
                <Image source={{ uri: source }} style={styles.vignetteImage} resizeMode="cover" />
              ) : enregistre ? (
                <FileText size={22} color={palette.accent} />
              ) : (
                <CircleAlert size={22} color={palette.warning} />
              )}
            </TouchableOpacity>

            <View style={styles.infos}>
              <Text style={styles.libelle}>{piece.libelle}</Text>
              <Text style={[styles.statut, statut.style]}>
                {enregistre && !locale ? <CircleCheck size={11} color={palette.success} /> : null} {statut.texte}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} onPress={() => prendre(piece.champ, 'camera')} accessibilityLabel={`Photographier : ${piece.libelle}`}>
                <Camera size={17} color={palette.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.action} onPress={() => prendre(piece.champ, 'galerie')} accessibilityLabel={`Choisir dans la galerie : ${piece.libelle}`}>
                <Images size={17} color={palette.accent} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <ImageLightbox src={apercu} onClose={() => setApercu(null)} />
    </View>
  );
}
