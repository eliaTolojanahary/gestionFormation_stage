// styles/commentaire-formateur.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de l'écran de commentaire de fin de formation */
export const createCommentaireFormateurStyles = ({ palette: t, fonts: f, density: d }: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { paddingHorizontal: d.pad, paddingBottom: 28, paddingTop: 12 },

    aide: { fontSize: f.xs, color: t.textMuted, marginBottom: 12, lineHeight: 16 },
    erreur: { color: t.danger, fontSize: f.sm, marginTop: 8, textAlign: 'center' },
    loadingBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },

    vide: { alignItems: 'center', gap: 8, paddingVertical: 48 },
    videTexte: { fontSize: f.sm, color: t.textMuted, textAlign: 'center' },

    carte: {
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
      marginBottom: 12,
    },
    formation: { fontSize: f.md, fontWeight: '800', color: t.heading, marginBottom: 4 },
    detail: { fontSize: f.xs, color: t.textMuted, marginTop: 2 },
    champ: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 10,
      padding: 10,
      marginTop: 12,
      fontSize: f.sm,
      color: t.textMain,
    },

    bouton: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 12,
    },
    boutonTexte: { color: t.onAccent, fontWeight: '800', fontSize: f.sm },
    boutonDesactive: { opacity: 0.55 },
  });
