import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/**
 * Styles de la page Paramètres.
 * Consomme les tokens d'apparence (thème, couleur principale, échelle de
 * polices, densité) : le style est recréé à chaque changement via
 * `useThemedStyles(createParametreStyles)`.
 */
export const createParametreStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },

    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: t.surfaceAlt,
      gap: 6,
    },
    tabActif: { backgroundColor: t.accent },
    tabText: { fontSize: f.md, fontWeight: '700', color: t.textMuted },
    tabTextActif: { color: t.onAccent },

    scrollContent: { padding: d.pad, paddingBottom: 28 },

    card: {
      backgroundColor: t.surface,
      borderRadius: 14,
      padding: d.pad,
      borderWidth: 1,
      borderColor: t.line,
      marginBottom: 12,
    },
    rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardTitle: { fontSize: f.md, fontWeight: '800', color: t.heading },
    cardSub: { fontSize: f.sm, color: t.textMuted, marginTop: 4, lineHeight: 17 },

    modeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: t.surfaceAlt,
    },
    modeBtnActif: { backgroundColor: t.accent },
    modeBtnText: { fontSize: f.md, fontWeight: '700', color: t.textMuted },
    modeBtnTextActif: { color: t.onAccent },

    couleursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    swatch: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.surface,
    },

    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
    logoImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: t.surfaceAlt },
    logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
    },
    secondaryBtnText: { fontSize: f.md, fontWeight: '700', color: t.accent },

    label: {
      fontSize: f.sm,
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
    voirMdpBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    voirMdpText: { fontSize: f.xs, fontWeight: '700', color: t.textMuted },

    primaryBtn: {
      marginTop: 16,
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    primaryBtnDisabled: { opacity: 0.5 },
    primaryBtnText: { color: t.onAccent, fontSize: f.md, fontWeight: '800' },

    dangerBtn: {
      marginTop: 12,
      backgroundColor: t.danger,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    dangerBtnText: { color: '#FFFFFF', fontSize: f.md, fontWeight: '800' },

    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 8,
      padding: 10,
      marginTop: 10,
    },
    errorText: { color: t.danger, fontSize: f.xs, textAlign: 'center' },
    successBox: {
      backgroundColor: t.successSoft,
      borderRadius: 8,
      padding: 10,
      marginTop: 10,
    },
    successText: { color: t.success, fontSize: f.xs, textAlign: 'center' },

    emptyText: {
      fontSize: f.md,
      color: t.textMuted,
      marginTop: 10,
      textAlign: 'center',
    },

    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    sessionIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionTitle: { fontSize: f.md, fontWeight: '800', color: t.textMain },
    sessionMeta: { fontSize: f.xs, color: t.textMuted, marginTop: 2 },

    pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    pillActif: { backgroundColor: t.successSoft },
    pillInactif: { backgroundColor: t.surfaceAlt },
    pillText: { fontSize: f.xs, fontWeight: '800' },
    pillTextActif: { color: t.success },
    pillTextInactif: { color: t.textMuted },

    savedLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
    },
    savedLabelText: { fontSize: f.sm, fontWeight: '700', color: t.success },
  });