// styles/paiements.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Historique de paiement (tokens d'apparence) */
export const createPaiementsStyles = ({
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

    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },

    loadingBox: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: { marginTop: 12, color: t.textMuted, fontSize: f.sm },

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

    // ─── Totaux ────────────────────────────
    statsRow: { flexDirection: 'row', marginBottom: 4 },
    statCard: {
      flex: 1,
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 12,
      marginRight: 8,
    },
    statCardLast: { marginRight: 0 },
    statCardReste: { backgroundColor: t.accentSoft },
    statLabel: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    statValue: { fontSize: f.md, fontWeight: '800', color: t.heading, marginTop: 6 },
    statValueOk: { color: t.success },
    statValueReste: { color: t.danger },

    // ─── Sections ──────────────────────────
    sectionTitle: {
      fontSize: f.md,
      fontWeight: '800',
      color: t.heading,
      marginTop: 18,
      marginBottom: 10,
    },
    sectionHint: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 17,
      marginBottom: 10,
    },

    // ─── Dernier paiement ──────────────────
    paiementCard: {
      flexDirection: 'row',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
    },
    paiementCardOk: { backgroundColor: t.successSoft, borderColor: t.successSoft },
    paiementIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    paiementIconWrapOk: { backgroundColor: t.successSoft },
    paiementCardAttente: { backgroundColor: t.warningSoft, borderColor: t.warningSoft, marginBottom: 10 },
    paiementIconWrapAttente: { backgroundColor: t.warningSoft },
    paiementBody: { flex: 1 },
    paiementLabel: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    paiementTexte: {
      fontSize: f.sm,
      color: t.textMain,
      lineHeight: 19,
      marginTop: 4,
    },
    paiementMontant: { fontWeight: '800', color: t.success },
    paiementFormation: { fontWeight: '800', color: t.heading },
    paiementMeta: { fontSize: f.xs, color: t.textMuted, marginTop: 6 },

    // ─── Tranche à régler ──────────────────
    trancheCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
    },
    trancheCardLate: { backgroundColor: t.dangerSoft, borderColor: t.dangerSoft },
    trancheHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    trancheFormation: {
      flex: 1,
      fontSize: f.md,
      fontWeight: '800',
      color: t.heading,
    },
    lateBadge: {
      backgroundColor: t.dangerSoft,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginLeft: 8,
    },
    lateBadgeText: { color: t.danger, fontSize: f.xs, fontWeight: '800' },
    trancheMontant: {
      fontSize: f.xl,
      fontWeight: '800',
      color: t.heading,
      marginTop: 8,
    },
    trancheEcheanceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    trancheEcheance: { fontSize: f.sm, color: t.textMuted, marginLeft: 6 },
    trancheEcheanceLate: { color: t.danger, fontWeight: '700' },

    payerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 13,
      marginTop: 14,
    },
    payerBtnText: {
      color: t.onAccent,
      fontSize: f.md,
      fontWeight: '800',
      marginLeft: 6,
    },

    lateInfoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      paddingHorizontal: 4,
    },
    lateInfoText: { flex: 1, fontSize: f.xs, color: t.textMuted, marginLeft: 6 },
    lateInfoTextLate: { color: t.danger, fontWeight: '700' },

    // ─── Tout est réglé ───────────────────
    okCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.successSoft,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.successSoft,
      padding: 14,
    },
    okText: {
      flex: 1,
      marginLeft: 10,
      fontSize: f.sm,
      fontWeight: '700',
      color: t.success,
    },
  });