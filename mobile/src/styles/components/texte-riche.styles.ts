// styles/components/texte-riche.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Texte mis en forme d'un support (gras, titres, listes, citations, liens) */
export const createTexteRicheStyles = ({ palette: t, fonts: f }: ThemeTokens) =>
  StyleSheet.create({
    conteneur: { marginTop: 12, gap: 8 },
    paragraphe: { fontSize: f.sm, color: t.textMain, lineHeight: 20 },
    titre: { fontSize: f.md, fontWeight: '800', color: t.heading, marginTop: 4 },
    sousTitre: { fontSize: f.sm, fontWeight: '800', color: t.heading, marginTop: 2 },
    gras: { fontWeight: '700' },
    italique: { fontStyle: 'italic' },
    souligne: { textDecorationLine: 'underline' },
    barre: { textDecorationLine: 'line-through' },
    lien: { color: t.accent, textDecorationLine: 'underline' },
    liste: { gap: 4 },
    element: { flexDirection: 'row', gap: 6, paddingLeft: 4 },
    puce: { fontSize: f.sm, color: t.textMuted, lineHeight: 20, minWidth: 14 },
    elementTexte: { flex: 1, fontSize: f.sm, color: t.textMain, lineHeight: 20 },
    citation: {
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderLeftWidth: 3,
      borderLeftColor: t.accent,
      borderRadius: 6,
      backgroundColor: t.accentSoft,
    },
  });
