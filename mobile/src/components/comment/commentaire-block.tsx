// components/comment/commentaire-block.tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { CornerDownRight, X } from 'lucide-react-native';
import { Commentaire } from '@/hooks/use-support';
import { getFileUrl , formatRelativeDate, getInitiales } from '@/utils/format';
import { createCommentaireBlockStyles } from '@/styles/components/commentaire-block.styles';
import { useThemedStyles } from '@/context/SettingsContext';

interface Props {
  commentaire: Commentaire;
  nomSupport?: string;
  userId?: number;
  onRepondre: (commentaire: Commentaire) => void;
  estReponse?: boolean;
}

// Un commentaire comme sur les réseaux sociaux : avatar (photo ou initiales), auteur
// ("(vous)" si c'est l'utilisateur connecté), support concerné, date relative, texte,
// bouton Répondre, puis « Voir les N réponses » qui déplie les réponses liées.
export function CommentaireBlock({
  commentaire,
  nomSupport,
  userId,
  onRepondre,
  estReponse = false,
}: Props) {
  const styles = useThemedStyles(createCommentaireBlockStyles);
  const [reponsesOuvertes, setReponsesOuvertes] = useState(false);

  const auteur =
    `${commentaire.prenom || ''} ${commentaire.nom || ''}`.trim() || 'Utilisateur';
  const photo = getFileUrl(commentaire.photo);
  const estMoi =
    Number(commentaire.id_utilisateur_auteur || commentaire.id_utilisateur) ===
    Number(userId);
  const reponses = commentaire.reponses || [];

  return (
    <View style={[styles.commentRow, estReponse && styles.replyRow]}>
      {photo ? (
        <Image source={{ uri: photo }} style={[styles.avatar, estReponse && styles.avatarReply]} />
      ) : (
        <View style={[styles.avatarFallback, estReponse && styles.avatarReply]}>
          <Text style={styles.avatarFallbackText}>
            {getInitiales(commentaire.prenom, commentaire.nom)}
          </Text>
        </View>
      )}

      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor} numberOfLines={1}>
            {auteur}
            {estMoi ? ' (vous)' : ''}
            {nomSupport ? (
              <Text style={styles.commentTarget}> · {nomSupport}</Text>
            ) : null}
          </Text>
          <Text style={styles.commentTime}>
            {formatRelativeDate(
              commentaire.date_commentaire || commentaire.date_creation
            )}
          </Text>
        </View>

        <Text style={styles.commentBody}>{commentaire.contenu}</Text>

        <View style={styles.commentActions}>
          <TouchableOpacity
            style={styles.commentAction}
            activeOpacity={0.8}
            onPress={() => onRepondre(commentaire)}
          >
            <CornerDownRight size={14} color="#5A6E85" />
            <Text style={styles.commentActionText}>Répondre</Text>
          </TouchableOpacity>
        </View>

        {/* Réponses : repliées par défaut, comme sur les réseaux sociaux */}
        {!estReponse && reponses.length > 0 ? (
          <TouchableOpacity
            style={styles.toggleReplies}
            activeOpacity={0.8}
            onPress={() => setReponsesOuvertes((ouvert) => !ouvert)}
          >
            <Text style={styles.toggleRepliesText}>
              {reponsesOuvertes
                ? 'Masquer les réponses'
                : reponses.length > 1
                  ? `Voir les ${reponses.length} réponses`
                  : 'Voir la réponse'}
            </Text>
          </TouchableOpacity>
        ) : null}

        {reponsesOuvertes
          ? reponses.map((reponse) => (
              <CommentaireBlock
                key={reponse.id_commentaire}
                commentaire={{ ...reponse, id_support: reponse.id_support || commentaire.id_support }}
                userId={userId}
                onRepondre={onRepondre}
                estReponse
              />
            ))
          : null}
      </View>
    </View>
  );
}

interface BanniereProps {
  auteur: string;
  onAnnuler: () => void;
}

// Bandeau au-dessus du champ de saisie : « Réponse à X » + bouton pour annuler la réponse
export function ReponseBanniere({ auteur, onAnnuler }: BanniereProps) {
  const styles = useThemedStyles(createCommentaireBlockStyles);
  return (
    <View style={styles.replyBanner}>
      <Text style={styles.replyBannerText} numberOfLines={1}>
        Réponse à {auteur || 'ce commentaire'}
      </Text>
      <TouchableOpacity onPress={onAnnuler} accessibilityLabel="Annuler la réponse">
        <X size={15} color="#5A6E85" />
      </TouchableOpacity>
    </View>
  );
}
