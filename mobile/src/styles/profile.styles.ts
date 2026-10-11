// styles/profile.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Profil */
export const createProfileStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    // ─── Conteneur ──────────────────────────
    container: {
      flex: 1,
      backgroundColor: t.pageBg,
    },
    scrollContent: {
      paddingHorizontal: d.pad,
      paddingBottom: 28,
      paddingTop: 12,
    },

    // ─── Sous-titre ─────────────────────────
    headerSubtitle: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: 18,
      marginBottom: 16,
    },

    // ─── Carte profil ───────────────────────
    profileCard: {
      backgroundColor: t.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.line,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
    },

    // ─── Avatar ─────────────────────────────
    avatarSection: {
      position: 'relative',
      marginBottom: 14,
    },
    avatarCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: t.surface,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      fontSize: f.xl + 8,
      fontWeight: '800',
      color: t.accent,
    },
    editPhotoBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: t.surface,
    },

    // ─── Identité ───────────────────────────
    name: {
      fontSize: f.xl,
      fontWeight: '800',
      color: t.heading,
      textAlign: 'center',
      marginBottom: 4,
    },
    email: {
      fontSize: f.sm,
      color: t.textMuted,
      textAlign: 'center',
    },

    // ─── Titres de section ──────────────────
    sectionTitle: {
      fontSize: f.md,
      fontWeight: '800',
      color: t.heading,
      marginTop: 4,
      marginBottom: 10,
    },

    // ─── Carte infos ────────────────────────
    infoCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
      marginBottom: 20,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    infoRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    infoIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    infoBody: {
      flex: 1,
    },
    infoLabel: {
      fontSize: f.xs,
      color: t.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    infoValue: {
      fontSize: f.md,
      color: t.textMain,
      fontWeight: '700',
      marginTop: 2,
    },

    // ─── Bouton modifier ────────────────────
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: t.accent,
      borderRadius: 12,
      marginBottom: 12,
    },
    editBtnText: {
      color: t.onAccent,
      fontSize: f.md,
      fontWeight: '800',
    },

    // ─── Bouton déconnexion ─────────────────
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      backgroundColor: t.dangerSoft,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.dangerSoft,
    },
    logoutText: {
      color: t.danger,
      fontSize: f.md,
      fontWeight: '800',
    },

    // ─── États (bonus, pour extensions futures) ───
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