// styles/components/recherche-globale.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la fenêtre de recherche globale (plein écran) */
export const createRechercheGlobaleStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.pageBg,
    },

    // ─── Barre du haut ──────────────────────
    barre: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.line,
    },
    champ: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: t.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 42,
    },
    input: {
      flex: 1,
      fontSize: f.md,
      color: t.textMain,
      paddingVertical: 0,
    },
    annuler: {
      paddingVertical: 6,
    },
    annulerTexte: {
      fontSize: f.md,
      fontWeight: '700',
      color: t.accent,
    },

    // ─── Résultats ──────────────────────────
    resultats: {
      padding: 14,
      paddingBottom: 40,
      gap: d.gap,
    },
    aide: {
      fontSize: f.sm,
      color: t.textMuted,
      lineHeight: f.sm * 1.5,
    },
    chargement: {
      marginVertical: 12,
    },
    erreur: {
      fontSize: f.sm,
      color: t.danger,
      backgroundColor: t.dangerSoft,
      padding: 10,
      borderRadius: 10,
    },
    groupe: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      overflow: 'hidden',
    },
    groupeTitre: {
      fontSize: f.xs,
      fontWeight: '800',
      color: t.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 4,
    },
    ligne: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: d.pad,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
    icone: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accentSoft,
    },
    ligneTexte: {
      flex: 1,
    },
    ligneTitre: {
      fontSize: f.md,
      fontWeight: '700',
      color: t.heading,
    },
    ligneSousTitre: {
      fontSize: f.xs,
      color: t.textMuted,
      marginTop: 2,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    vide: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 30,
    },
    videTexte: {
      fontSize: f.md,
      color: t.textMuted,
    },
  });
