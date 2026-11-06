// styles/components/voir-plus.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles du bouton « Voir plus » des listes */
export const createVoirPlusStyles = ({
  palette: t,
  fonts: f,
}: ThemeTokens) =>
  StyleSheet.create({
    bouton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      backgroundColor: t.accentSoft,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginTop: 10,
      marginBottom: 6,
    },
    texte: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.accent,
      marginLeft: 6,
    },
  });
