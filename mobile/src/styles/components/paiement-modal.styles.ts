// styles/components/paiement-modal.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles du modal de paiement */
export const createPaiementModalStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      maxHeight: '85%',
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
    headerTitle: { fontSize: f.lg, fontWeight: '800', color: t.heading },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surfaceAlt,
    },

    scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 },

    recapCard: {
      backgroundColor: t.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: d.pad,
      marginBottom: 20,
    },
    recapLabel: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    recapValue: { fontSize: f.md, fontWeight: '800', color: t.heading, marginTop: 2 },
    recapAmount: { fontSize: f.xl - 2, fontWeight: '800', color: t.danger, marginTop: 2 },
    recapRow: { flexDirection: 'row', marginTop: 12 },
    lateBadge: {
      alignSelf: 'flex-start',
      backgroundColor: t.dangerSoft,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 10,
    },
    lateBadgeText: { color: t.danger, fontSize: 10.5, fontWeight: '800' },

    sectionTitle: { fontSize: f.md, fontWeight: '800', color: t.heading, marginBottom: 10 },
    modeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    modeItemActif: { borderColor: t.accent, backgroundColor: t.accentSoft },
    modeIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    modeIconWrapActif: { backgroundColor: t.accent },
    modeNom: { flex: 1, fontSize: f.md, fontWeight: '700', color: t.heading },
    modeNomActif: { color: t.accent },

    footerNote: {
      fontSize: f.xs,
      color: t.textMuted,
      textAlign: 'center',
      marginBottom: 10,
    },
    footer: {
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
    payerBtn: {
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    payerBtnDisabled: { opacity: 0.45 },
    payerBtnText: { color: t.onAccent, fontSize: f.lg - 1, fontWeight: '800' },
  });