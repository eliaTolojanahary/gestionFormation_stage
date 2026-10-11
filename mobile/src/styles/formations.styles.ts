// styles/formations.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page « Détail d'une formation » — tokens d'apparence */
export const createFormationsStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { paddingHorizontal: d.pad, paddingBottom: 28 },
    body: { paddingTop: 12 },

    loadingBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: { marginTop: 12, color: t.textMuted, fontSize: f.sm },
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },

    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.line,
      padding: d.pad,
      marginBottom: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: { fontSize: f.lg, fontWeight: '800', color: t.heading },
    cardHeaderMeta: { fontSize: f.xs, color: t.textMuted, fontWeight: '600' },
    aboutText: {
      fontSize: f.sm,
      color: t.textMain,
      lineHeight: 20,
      marginTop: 8,
    },

    emptyInline: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    emptyInlineText: {
      flex: 1,
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
      marginLeft: 10,
    },

    voirPlus: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: t.accentSoft,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginTop: 8,
    },
    voirPlusText: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.accent,
      marginLeft: 6,
    },

    formulaire: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
    formLabel: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    cibleListe: { paddingRight: 8, paddingBottom: 6 },
    cibleChip: {
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
      maxWidth: 200,
    },
    cibleChipActif: { backgroundColor: t.accent, borderColor: t.accent },
    cibleChipText: { fontSize: f.xs, fontWeight: '600', color: t.textMuted },
    cibleChipTextActif: { color: t.onAccent },

    inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: f.sm,
      color: t.textMain,
      marginRight: 8,
      textAlignVertical: 'top',
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.45 },
    formError: { marginTop: 8, fontSize: f.xs, color: t.danger },
    hint: {
      fontSize: f.sm,
      color: t.textMuted,
      textAlign: 'center',
      marginTop: 12,
    },
  });

/** Styles de la page « Liste des formations » — tokens d'apparence */
export const createFormationsListStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { paddingHorizontal: d.pad, paddingBottom: 28 },

    headerRow: { marginTop: 8, marginBottom: 6 },
    headerSubtitle: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
      marginBottom: 14,
    },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.line,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: f.sm,
      color: t.textMain,
      paddingVertical: 0,
    },

    loadingBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: { marginTop: 12, color: t.textMuted, fontSize: f.sm },
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },
    emptyBox: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      marginTop: 10,
      color: t.textMuted,
      fontSize: f.sm,
      textAlign: 'center',
      lineHeight: 19,
    },
  });