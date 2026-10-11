// styles/components/commentaire-block.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeTokens } from '@/context/SettingsContext';

/** Styles du bloc de commentaire */
export const createCommentaireBlockStyles = ({
  palette: t,
  fonts: f,
}: ThemeTokens) =>
  StyleSheet.create({
    commentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: t.line,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    avatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarFallbackText: { color: t.onAccent, fontWeight: '800', fontSize: 11.5 },
    commentContent: { flex: 1 },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    commentAuthor: {
      flex: 1,
      fontSize: f.sm,
      fontWeight: '800',
      color: t.heading,
      marginRight: 6,
    },
    commentTarget: { fontWeight: '600', color: t.textMuted, fontSize: f.xs },
    commentTime: { fontSize: f.xs, color: t.textMuted },
    commentBody: { fontSize: f.sm, color: t.textMain, lineHeight: 18 },
    commentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    commentChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surfaceAlt,
      borderWidth: 1,
      borderColor: t.line,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 4,
      marginRight: 10,
    },
    commentChipActif: { backgroundColor: t.accentSoft, borderColor: t.accent },
    commentChipIcon: { fontSize: 11 },
    commentChipText: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginLeft: 4,
    },
    commentChipTextActif: { color: t.accent },
    commentAction: { flexDirection: 'row', alignItems: 'center' },
    commentActionText: {
      fontSize: f.xs,
      fontWeight: '700',
      color: t.textMuted,
      marginLeft: 4,
    },
    // Fil de discussion : réponses en retrait sous le commentaire principal
    replyRow: { borderTopWidth: 0, paddingVertical: 8 },
    avatarReply: { width: 28, height: 28, borderRadius: 14 },
    toggleReplies: { marginTop: 6 },
    toggleRepliesText: { fontSize: f.xs, fontWeight: '800', color: t.accent },
    replyBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.accentSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 6,
    },
    replyBannerText: { flex: 1, fontSize: f.xs, fontWeight: '700', color: t.accent, marginRight: 8 },
  });