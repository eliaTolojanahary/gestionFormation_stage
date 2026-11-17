// styles/conditions.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la page Conditions d'utilisation / Confidentialité (tokens d'apparence) */
export const createConditionsStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.pageBg },

    // Barre du haut quand l'accord est demandé (pas de retour possible)
    entete: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: d.pad + 4,
      paddingTop: 12,
      paddingBottom: 8,
    },
    enteteIcone: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    enteteTitre: { fontSize: f.lg, fontWeight: '800', color: t.heading },
    enteteSous: { fontSize: f.sm, color: t.textMuted, marginTop: 2 },

    // Onglets
    tabsRow: {
      flexDirection: 'row',
      marginHorizontal: d.pad + 4,
      marginTop: 6,
      marginBottom: 4,
      backgroundColor: t.surfaceAlt,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 9,
    },
    tabActif: { backgroundColor: t.accent },
    tabText: { marginLeft: 6, fontSize: f.sm, fontWeight: '700', color: t.textMuted },
    tabTextActif: { color: t.onAccent },

    scrollContent: {
      paddingHorizontal: d.pad + 4,
      paddingTop: 10,
      paddingBottom: 24,
    },
    miseAJour: { fontSize: f.xs, color: t.textMuted, marginBottom: 10 },

    // Sections
    section: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: 14,
      marginBottom: d.gap,
    },
    sectionTitre: { fontSize: f.md, fontWeight: '800', color: t.heading, marginBottom: 8 },
    paragraphe: { fontSize: f.sm, color: t.textMain, lineHeight: f.sm * 1.55, marginBottom: 6 },
    puceLigne: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
    puce: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: t.accent,
      marginTop: f.sm * 0.6,
      marginRight: 8,
    },
    puceTexte: { flex: 1, fontSize: f.sm, color: t.textMain, lineHeight: f.sm * 1.55 },

    // Boutons Refuser / Accepter
    actions: {
      flexDirection: 'row',
      paddingHorizontal: d.pad + 4,
      paddingTop: 12,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: t.line,
      backgroundColor: t.surface,
    },
    actionsNote: {
      fontSize: f.xs,
      color: t.textMuted,
      textAlign: 'center',
      paddingHorizontal: d.pad + 4,
      paddingTop: 10,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 13,
    },
    btnRefuser: {
      backgroundColor: t.dangerSoft,
      marginRight: 10,
    },
    btnRefuserText: { color: t.danger, fontSize: f.md, fontWeight: '800', marginLeft: 6 },
    btnAccepter: { backgroundColor: t.accent },
    btnAccepterText: { color: t.onAccent, fontSize: f.md, fontWeight: '800', marginLeft: 6 },
    btnDisabled: { opacity: 0.5 },
  });
