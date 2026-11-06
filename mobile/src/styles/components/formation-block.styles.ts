// styles/components/formation-block.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';
import { hexToRgba } from '@/constants/theme';

/** Styles du bloc « héros » d'une formation (bandeau coloré) */
export const createFormationBlockStyles = ({
  palette: t,
  fonts: f,
}: ThemeTokens) =>
  StyleSheet.create({
    hero: {
      backgroundColor: t.accent,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 20,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    badgeEnCours: {
      backgroundColor: t.warning,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    badgeEnCoursText: { color: '#1B2430', fontSize: f.xs, fontWeight: '800' },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: hexToRgba(t.onAccent, 0.12),
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    heroPillText: {
      color: hexToRgba(t.onAccent, 0.78),
      fontSize: f.xs,
      fontWeight: '700',
      marginLeft: 5,
    },
    heroTitle: {
      color: t.onAccent,
      fontSize: f.xl - 3,
      fontWeight: '800',
      lineHeight: 25,
    },
    heroTrainer: { color: hexToRgba(t.onAccent, 0.78), fontSize: f.sm, marginTop: 6 },
    heroMeta: { color: hexToRgba(t.onAccent, 0.65), fontSize: f.xs, marginTop: 4 },
  });