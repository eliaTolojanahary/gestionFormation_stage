// styles/dossier.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de l'écran Mon dossier (pièces de l'étudiant) */
export const createDossierStyles = ({ palette: t, fonts: f, density: d }: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },
    scrollContent: { paddingHorizontal: d.pad, paddingBottom: 28, paddingTop: 12 },

    loadingBox: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
    errorBox: { backgroundColor: t.dangerSoft, borderRadius: 10, padding: 12, marginBottom: 12 },
    errorText: { color: t.danger, fontSize: f.sm, textAlign: 'center' },

    etat: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12, marginBottom: 12 },
    etatComplet: { backgroundColor: t.successSoft },
    etatIncomplet: { backgroundColor: t.warningSoft },
    etatTitre: { fontSize: f.md, fontWeight: '800', color: t.heading },
    etatTexte: { fontSize: f.xs, color: t.textMain, marginTop: 4, lineHeight: 16 },

    aide: { fontSize: f.xs, color: t.textMuted, marginBottom: 10, lineHeight: 16 },
    erreur: { color: t.danger, fontSize: f.sm, marginTop: 8, textAlign: 'center' },

    bouton: {
      backgroundColor: t.accent,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 14,
    },
    boutonTexte: { color: t.onAccent, fontWeight: '800', fontSize: f.sm },
    boutonDesactive: { opacity: 0.55 },
  });
