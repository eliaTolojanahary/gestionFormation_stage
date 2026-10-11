// styles/documents.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles des pages Documents (liste + détail) — tokens d'apparence */
export const createDocumentsStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { padding: d.pad, paddingBottom: 28 },

    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.line,
      padding: d.pad,
      marginBottom: 14,
    },
    supportHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    supportIconWrapper: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: t.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    supportTitle: { fontSize: f.md, fontWeight: '800', color: t.heading },
    supportMeta: { fontSize: f.xs, color: t.textMuted, marginTop: 4 },
    supportDescription: {
      fontSize: f.sm,
      color: t.textMain,
      lineHeight: 19,
      marginTop: 12,
    },
    downloadBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: { fontSize: f.md, fontWeight: '800', color: t.heading },
    cardHeaderMeta: { fontSize: f.xs, color: t.textMuted, fontWeight: '600' },

    emptyInline: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    emptyInlineText: {
      flex: 1,
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
      marginLeft: 10,
    },

    formulaire: {
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
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
  });

/** Styles de la page « Liste des documents » — tokens d'apparence */
export const createDocumentsListStyles = ({
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

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.line,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 14,
    },
    searchInput: { flex: 1, fontSize: f.sm, color: t.textMain, paddingVertical: 0 },

    filterLabel: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginBottom: 8,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    chipsRow: { paddingRight: 8, paddingBottom: 4, marginBottom: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
      maxWidth: 200,
    },
    chipActif: { backgroundColor: t.accent, borderColor: t.accent },
    chipText: { fontSize: f.xs, fontWeight: '600', color: t.textMuted },
    chipTextActif: { color: t.onAccent },

    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: t.accentSoft,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 12,
    },
    resetText: { fontSize: f.xs, fontWeight: '700', color: t.accent, marginLeft: 5 },

    resultsCount: {
      fontSize: f.xs,
      color: t.textMuted,
      fontWeight: '600',
      marginBottom: 10,
    },

    loadingBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
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