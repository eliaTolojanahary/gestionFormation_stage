// components/voir-plus.tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ellipsis } from 'lucide-react-native';
import { createVoirPlusStyles } from '@/styles/components/voir-plus.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';

interface VoirPlusProps {
  /** Éléments encore cachés (le bouton disparaît à 0) */
  restant: number;
  onPress: () => void;
}

/** Bouton « Voir plus » sous une liste affichée par paquets (useAffichageProgressif) */
export function VoirPlus({ restant, onPress }: VoirPlusProps) {
  const styles = useThemedStyles(createVoirPlusStyles);
  const { palette } = useSettings();

  if (restant <= 0) return null;

  return (
    <TouchableOpacity style={styles.bouton} activeOpacity={0.8} onPress={onPress}>
      <Ellipsis size={16} color={palette.accent} />
      <Text style={styles.texte}>
        Voir plus · {restant} restant{restant > 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );
}
