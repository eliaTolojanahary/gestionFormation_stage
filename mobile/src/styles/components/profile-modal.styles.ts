// styles/components/profile-modal.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles du modal de profil */
export const createProfileModalStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    // ─── Conteneur du modal ─────────────────
    backdrop: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: '92%',
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    headerTitle: {
      fontSize: f.lg,
      fontWeight: '800',
      color: t.heading,
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceAlt,
    },

    scroll: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 8,
    },

    // ─── Photo de profil ────────────────────
    photoWrapper: {
      alignSelf: 'center',
      marginBottom: 8,
    },
    photo: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: t.accentSoft,
      borderWidth: 3,
      borderColor: t.surface,
    },
    photoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoPlaceholderText: {
      color: t.accent,
      fontWeight: '800',
      fontSize: 34,
    },
    photoChangeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: t.accentSoft,
      borderRadius: 10,
      marginBottom: 18,
    },
    photoChangeText: {
      fontSize: f.xs + 0.5,
      fontWeight: '700',
      color: t.accent,
    },

    // ─── Formulaire ─────────────────────────
    label: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: f.md,
      color: t.textMain,
    },

    // ─── Actions ────────────────────────────
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 24,
    },
    secondaryBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontSize: f.md,
      fontWeight: '800',
      color: t.textMuted,
    },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: {
      color: t.onAccent,
      fontSize: f.md,
      fontWeight: '800',
    },

    // ─── Messages ───────────────────────────
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
    },
    errorText: {
      color: t.danger,
      fontSize: f.sm,
      textAlign: 'center',
    },
    successBox: {
      backgroundColor: t.successSoft,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
    },
    successText: {
      color: t.success,
      fontSize: f.sm,
      textAlign: 'center',
    },
  });