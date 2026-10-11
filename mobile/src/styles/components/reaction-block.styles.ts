// styles/components/reaction-block.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la rangée de réactions */
export const createReactionBlockStyles = ({
  palette: t,
  fonts: f,
}: ThemeTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 8,
      marginBottom: 4,
    },
    chipActif: { backgroundColor: t.accentSoft, borderColor: t.accent },
    icon: { fontSize: 12 },
    count: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginLeft: 5,
    },
    countActif: { color: t.accent },
  });