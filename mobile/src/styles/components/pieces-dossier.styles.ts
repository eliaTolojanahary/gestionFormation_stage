// styles/components/pieces-dossier.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Liste des pièces du dossier (inscription en ligne et écran Mon dossier) */
export const createPiecesDossierStyles = ({ palette: t, fonts: f, density: d }: ThemeTokens) =>
  StyleSheet.create({
    piece: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: d.pad,
      borderWidth: 1,
      borderColor: t.line,
      marginBottom: 8,
      gap: 10,
    },
    pieceManquante: { borderColor: t.warning, borderStyle: 'dashed' },
    vignette: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: t.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    vignetteImage: { width: '100%', height: '100%' },
    infos: { flex: 1 },
    libelle: { fontSize: f.sm, fontWeight: '800', color: t.heading },
    statut: { fontSize: f.xs, marginTop: 3, fontWeight: '700' },
    statutFourni: { color: t.success },
    statutNouveau: { color: t.accent },
    statutManquant: { color: t.warning },
    actions: { flexDirection: 'row', gap: 6 },
    action: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
