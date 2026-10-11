// styles/components/detail-header.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la barre d'en-tête partagée (retour + menu ellipse) */
export const createDetailHeaderStyles = ({
  palette: t,
  fonts: f,
}: ThemeTokens) =>
  StyleSheet.create({
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    headerIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: f.lg,
      fontWeight: '800',
      color: t.heading,
    },

    // ─── Menu ─────────────────────────────
    backdrop: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 60,
      paddingRight: 12,
    },
    menu: {
      backgroundColor: t.surface,
      borderRadius: 14,
      minWidth: 240,
      maxWidth: 300,
      borderWidth: 1,
      borderColor: t.line,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
    menuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    menuTitle: {
      fontSize: f.sm,
      fontWeight: '800',
      color: t.heading,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    menuCloseBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: t.line },
    menuItemIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    menuItemLabel: {
      flex: 1,
      fontSize: f.md,
      fontWeight: '700',
      color: t.heading,
    },
  });