// styles/assistance.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Assistance (tokens d'apparence) */
export const createAssistanceStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: {
      paddingHorizontal: d.pad,
      paddingBottom: 28,
      paddingTop: 12,
    },
    headerSubtitle: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
      marginBottom: 14,
    },

    // ─── Formulaire ────────────────────────
    formCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
    },
    label: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 6,
    },
    input: {
      backgroundColor: t.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.line,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: f.md,
      color: t.textMain,
      marginBottom: 12,
    },
    textarea: { minHeight: 110, textAlignVertical: 'top' },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 13,
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { color: t.onAccent, fontSize: f.md, fontWeight: '800', marginLeft: 8 },

    successBox: {
      backgroundColor: t.successSoft,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    successText: { color: t.success, fontSize: f.sm, textAlign: 'center' },
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
    },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },

    // ─── Liste des demandes ────────────────
    sectionTitle: {
      fontSize: f.md,
      fontWeight: '800',
      color: t.heading,
      marginTop: 20,
      marginBottom: 10,
    },
    demandeCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
      marginBottom: 10,
    },
    demandeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    demandeObjet: { flex: 1, fontSize: f.md, fontWeight: '800', color: t.heading, marginRight: 8 },
    demandeContenu: { fontSize: f.sm, color: t.textMain, lineHeight: 19, marginTop: 6 },
    demandeDate: { fontSize: f.xs, color: t.textMuted, marginTop: 8 },

    badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    badgeAttente: { backgroundColor: t.warningSoft },
    badgeResolu: { backgroundColor: t.successSoft },
    badgeText: { fontSize: f.xs, fontWeight: '700' },
    badgeTextAttente: { color: t.warning },
    badgeTextResolu: { color: t.success },

    emptyText: {
      color: t.textMuted,
      fontSize: f.sm,
      textAlign: 'center',
      paddingVertical: 20,
    },
  });
