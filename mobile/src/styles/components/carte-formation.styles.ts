// styles/components/carte-formation.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la carte d'une formation (liste) */
export const createCarteFormationStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: d.pad,
      borderWidth: 1,
      borderColor: t.line,
      marginBottom: 12,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    cardIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
    cardTitle: {
      flex: 1,
      fontSize: f.md,
      fontWeight: '800',
      color: t.heading,
      marginRight: 8,
    },
    badgeEnCours: {
      backgroundColor: t.warning,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    badgeEnCoursText: { color: '#1B2430', fontSize: 9.5, fontWeight: '800' },
    cardFormateur: { fontSize: f.xs, color: t.textMuted, marginTop: 4 },
    cardDescription: {
      fontSize: f.sm,
      color: t.textMain,
      lineHeight: 18,
      marginTop: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      flexWrap: 'wrap',
    },
    cardMetaText: { fontSize: f.xs, color: t.textMuted, marginLeft: 4 },
    cardArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });