// styles/login.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Connexion — tokens d'apparence */
export const createLoginStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 22,
      paddingVertical: 20,
    },
    header: { alignItems: 'center', marginBottom: 24 },
    logoCard: {
      width: 80,
      height: 80,
      borderRadius: 18,
      backgroundColor: t.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    logoImage: { width: 58, height: 58 },
    brandTitle: { fontSize: f.lg + 5, fontWeight: '800', color: t.heading },
    brandUnderline: {
      width: 40,
      height: 3,
      backgroundColor: t.warning,
      marginVertical: 4,
      borderRadius: 2,
    },
    brandSubtitle: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      letterSpacing: 1,
    },
    card: {
      backgroundColor: t.surface,
      borderRadius: 20,
      padding: d.pad + 10,
      elevation: 4,
      shadowColor: t.heading,
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    cardTitle: {
      fontSize: f.xl,
      fontWeight: '800',
      color: t.heading,
      marginBottom: 6,
    },
    cardSubtitle: {
      fontSize: f.md,
      color: t.textMuted,
      lineHeight: 18,
      marginBottom: 20,
    },
    inputGroup: { marginBottom: d.gap },
    label: { fontSize: f.md, fontWeight: '700', color: t.textMain, marginBottom: 8 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
    },
    input: { flex: 1, fontSize: f.lg - 1, color: t.textMain, height: '100%' },
    forgotBtn: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
    forgotText: { fontSize: f.sm, fontWeight: '700', color: t.accent },
    submitBtn: {
      backgroundColor: t.accent,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnText: { color: t.onAccent, fontSize: f.lg - 0.5, fontWeight: '700' },
  });