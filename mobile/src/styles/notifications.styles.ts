// styles/notifications.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Notifications */
export const createNotificationsStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    // ─── Conteneur principal ─────────────────
    container: {
      flex: 1,
      backgroundColor: t.pageBg,
    },
    scrollContent: {
      paddingHorizontal: d.pad,
      paddingBottom: 28,
      paddingTop: 12,
    },

    // ─── Titre de page (si pas de DetailHeader) ───
    title: {
      fontSize: f.xl,
      fontWeight: '800',
      color: t.heading,
      paddingHorizontal: d.pad,
      marginTop: 12,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: f.sm,
      color: t.textMuted,
      paddingHorizontal: d.pad,
      marginTop: 4,
      marginBottom: 12,
    },

    // ─── Bulk action "Tout marquer comme lu" ───
    bulkAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginHorizontal: d.pad,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
    },
    bulkActionText: {
      fontSize: f.xs + 1,
      fontWeight: '800',
      color: t.accent,
    },

    // ─── Carte de notification ───────────────
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 12,
      marginBottom: 10,
    },
    cardUnread: {
      borderColor: t.accent,
      backgroundColor: t.accentSoft,
    },

    // ─── Icône ───────────────────────────────
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      backgroundColor: t.accentSoft,   // fallback, surchargé par le JSX
    },

    // ─── Corps de la carte ───────────────────
    body: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    titre: {
      flex: 1,
      fontSize: f.md,
      fontWeight: '700',
      color: t.textMain,
    },
    titreUnread: {
      color: t.heading,
      fontWeight: '800',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.accent,
      marginLeft: 6,
    },
    message: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
    },
    meta: {
      fontSize: f.xs,
      color: t.textMuted,
      marginTop: 6,
    },

    // ─── Actions à droite ────────────────────
    actions: {
      marginLeft: 8,
      gap: 4,
    },
    actionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // ─── États ───────────────────────────────
    loadingBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
      color: t.textMuted,
      fontSize: f.sm,
    },
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: {
      color: t.danger,
      fontSize: f.sm,
      textAlign: 'center',
    },
    emptyBox: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 32,
      alignItems: 'center',
      marginTop: 20,
    },
    emptyText: {
      marginTop: 16,
      fontSize: f.md,
      fontWeight: '700',
      color: t.heading,
      textAlign: 'center',
    },
    emptyHint: {
      marginTop: 8,
      fontSize: f.sm,
      color: t.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });