// styles/acceuil.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page d'accueil — tokens d'apparence */
export const createAccueilStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { paddingHorizontal: d.pad, paddingBottom: 24 },

    // ─── En-tête ────────────────────────────
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 6,
    },
    greetingLight: { fontSize: f.sm, color: t.textMuted },
    greetingName: { fontSize: f.xl, fontWeight: '800', color: t.heading, marginTop: 2 },
    headerRightActions: { flexDirection: 'row', alignItems: 'center' },
    avatarCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: f.md, fontWeight: '800', color: t.accent },

    // ─── États ──────────────────────────────
    errorBox: {
      backgroundColor: t.dangerSoft,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },
    loadingBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
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

    // ─── Héros : formation en cours ─────────
    heroCard: {
      backgroundColor: t.accent,
      borderRadius: 18,
      padding: 18,
      marginBottom: 16,
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    badgeEnCours: {
      backgroundColor: 'rgba(255, 255, 255, 0.22)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeEnCoursText: {
      color: '#FFFFFF',
      fontSize: f.xs,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    heroTitle: { color: '#FFFFFF', fontSize: f.lg + 1, fontWeight: '800', lineHeight: 22 },
    heroTrainer: { color: 'rgba(255, 255, 255, 0.85)', fontSize: f.xs, marginTop: 6 },

    // ─── Carte paiement ─────────────────────
    payCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 16,
    },
    payCardDue: { borderColor: t.warningSoft },
    payCardLate: { borderColor: t.dangerSoft, backgroundColor: t.dangerSoft },
    payCardOk: { borderColor: t.successSoft, backgroundColor: t.successSoft },
    payIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    payTitle: { fontSize: f.md, fontWeight: '800', color: t.heading },
    paySub: { fontSize: f.xs, color: t.textMuted, lineHeight: 17, marginTop: 2 },
    payCta: { fontSize: f.xs, fontWeight: '700', color: t.accent, marginTop: 6 },

    // ─── Sections ───────────────────────────
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: f.lg, fontWeight: '800', color: t.heading },
    seeAllText: { fontSize: f.xs, fontWeight: '700', color: t.accent },

    // ─── Cartes formations ──────────────────
    formationsGrid: { flexDirection: 'row', gap: 12 },
    formationCard: {
      flex: 1,
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 12,
    },
    formationIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    formationCardTitle: { fontSize: f.sm, fontWeight: '800', color: t.textMain, lineHeight: 17 },
    formationCardSub: { fontSize: f.xs, color: t.textMuted, marginTop: 4 },
    // ─── Supports ───────────────────────────
    supportLoadingBox: { paddingVertical: 20, alignItems: 'center' },
    emptySupportBox: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 18,
      alignItems: 'center',
    },
    emptySupportText: { color: t.textMuted, fontSize: f.sm, textAlign: 'center' },
    supportCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 12,
      marginBottom: 10,
    },
    supportIconWrapper: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: t.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    supportDetails: { flex: 1 },
    supportTitle: { fontSize: f.md, fontWeight: '700', color: t.textMain },
    supportSub: { fontSize: f.xs, color: t.textMuted, marginTop: 2 },

    // ─── Commentaires ───────────────────────
    commentCard: {
      flexDirection: 'row',
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 12,
      marginBottom: 10,
    },
    commentIndexBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    commentIndexText: { fontSize: f.xs, fontWeight: '800', color: t.accent },
    commentAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    commentAvatarText: { color: t.onAccent, fontSize: f.xs, fontWeight: '800' },
    commentContent: { flex: 1 },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    commentAuthor: { flex: 1, fontSize: f.xs, color: t.textMuted },
    commentTarget: { color: t.accent, fontWeight: '700' },
    commentTime: { fontSize: f.xs, color: t.textMuted, marginLeft: 8 },
    commentBody: { fontSize: f.sm, color: t.textMain, lineHeight: 18, marginTop: 4 },
  });