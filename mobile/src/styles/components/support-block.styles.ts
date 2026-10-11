// styles/components/support-block.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles de la carte support (liste + détail) */
export const createSupportBlockStyles = ({
  palette: t,
  fonts: f,
  density: d,
}: ThemeTokens) =>
  StyleSheet.create({
    supportBlock: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.line,
      padding: d.pad,
      marginBottom: 10,
    },
    supportRow: { flexDirection: 'row', alignItems: 'center' },
    supportIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supportContent: { flex: 1, marginRight: 8 },
    supportTitle: { fontSize: f.md, fontWeight: '700', color: t.heading },
    supportSub: { fontSize: f.xs, color: t.textMuted, marginTop: 3 },
    supportContext: {
      fontSize: f.xs,
      color: t.accent,
      fontWeight: '600',
      marginTop: 3,
    },
    supportDescription: {
      fontSize: f.sm,
      color: t.textMain,
      lineHeight: 18,
      marginTop: 10,
    },
    supportDate: {
      fontSize: f.xs,
      color: t.textMuted,
      marginTop: 8,
      marginLeft: 50,
    },
    typeBadge: {
      backgroundColor: t.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 8,
    },
    typeBadgeText: {
      fontSize: 9.5,
      fontWeight: '800',
      color: t.textMuted,
      letterSpacing: 0.3,
    },
    downloadBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reactionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 10,
      marginLeft: 50,
    },
    reactionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 8,
      marginBottom: 4,
    },
    reactionChipActif: { backgroundColor: t.accentSoft, borderColor: t.accent },
    reactionIcon: { fontSize: 12 },
    reactionCount: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginLeft: 5,
    },
    reactionCountActif: { color: t.accent },
  });