// components/support-block.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Download, ArrowRight } from 'lucide-react-native';
import { Support } from '@/hooks/use-support';
import { Reaction, REACTION_TYPES, TypeReaction } from '@/hooks/use-reaction';
import { getSupportVisual } from '@/hooks/use-support-visual';
import { texteBrut } from '@/components/doc/texte-riche';
import { formatAjout, getFileTypeLabel } from '@/utils/format';
import { createSupportBlockStyles } from '@/styles/components/support-block.styles';
import { useThemedStyles } from '@/context/SettingsContext';

interface Props {
  support: Support;
  // Contexte optionnel (affiché si fourni)
  nomFormation?: string;
  nomFormateur?: string;
  // Réactions (optionnelles → si absentes, pas de barre)
  reactions?: Reaction[];
  userId?: number;
  reactionEnCours?: boolean;
  onReagir?: (type: TypeReaction) => void;
  // Actions
  onPress?: () => void;       // clic sur la carte (mode liste)
  onOuvrir?: () => void;      // clic sur le bouton download
  // Options d'affichage
  compact?: boolean;          // sans description (mode liste)
}

// Carte d'un support : icône selon le type de fichier, titre, contexte (formation / formateur),
// badge du type, bouton d'ouverture et, si fournies, les réactions.
// Utilisée en liste (onPress -> toute la carte cliquable) et en détail (affichage statique).
export function SupportBlock({
  support,
  nomFormation,
  nomFormateur,
  reactions,
  userId,
  reactionEnCours,
  onReagir,
  onPress,
  onOuvrir,
  compact = false,
}: Props) {
  const styles = useThemedStyles(createSupportBlockStyles);
  const { Icone, fond, couleur } = getSupportVisual(support.fichier);
  const datePublication = support.date_publication || support.date_ajout;
  // Support texte seul : badge « TEXTE » ; aperçu du texte sous le titre (hors mode compact)
  const typeLabel = support.fichier ? getFileTypeLabel(support.fichier) : 'TEXTE';
  const apercu = support.description || texteBrut(support.contenu);

  // Contenu commun aux deux modes d'affichage
  const contenu = (
    <>
      <View style={styles.supportRow}>
        <View style={[styles.supportIcon, { backgroundColor: fond }]}>
          <Icone size={18} color={couleur} />
        </View>

        <View style={styles.supportContent}>
          <Text style={styles.supportTitle} numberOfLines={2}>
            {support.titre || 'Support'}
          </Text>

          {nomFormation ? (
            <Text style={styles.supportContext} numberOfLines={1}>
              📚 {nomFormation}
            </Text>
          ) : null}

          {nomFormateur ? (
            <Text style={styles.supportContext} numberOfLines={1}>
              👤 {nomFormateur}
            </Text>
          ) : null}

          {!nomFormation && !nomFormateur ? (
            <Text style={styles.supportSub}>
              Ajouté {formatAjout(datePublication).toLowerCase()}
            </Text>
          ) : null}
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {typeLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.downloadBtn}
          activeOpacity={0.8}
          onPress={onOuvrir}
        >
          {onPress ? (
            <ArrowRight size={17} color="#0A3B66" />
          ) : (
            <Download size={17} color="#0A3B66" />
          )}
        </TouchableOpacity>
      </View>

      {/* Description (masquée en mode compact) */}
      {!compact && apercu ? (
        <Text style={styles.supportDescription} numberOfLines={3}>
          {apercu}
        </Text>
      ) : null}

      {/* Date (affichée en mode compact sous forme de sous-texte) */}
      {compact && (nomFormation || nomFormateur) ? (
        <Text style={styles.supportDate}>
          Ajouté {formatAjout(datePublication).toLowerCase()}
        </Text>
      ) : null}

      {/* Réactions (si fournies) */}
      {reactions && reactions.length >= 0 && onReagir ? (
        <View style={styles.reactionRow}>
          {REACTION_TYPES.map((type) => {
            const nombre = reactions.filter(
              (r) => r.type_reaction === type.nom
            ).length;
            const actif = reactions.some(
              (r) =>
                Number(r.id_utilisateur) === Number(userId) &&
                r.type_reaction === type.nom
            );

            return (
              <TouchableOpacity
                key={type.id}
                style={[styles.reactionChip, actif && styles.reactionChipActif]}
                activeOpacity={0.8}
                disabled={reactionEnCours}
                onPress={() => onReagir(type)}
              >
                <Text style={styles.reactionIcon}>{type.icone}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    actif && styles.reactionCountActif,
                  ]}
                >
                  {nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </>
  );

  // Si onPress → toute la carte est cliquable
  if (onPress) {
    return (
      <TouchableOpacity style={styles.supportBlock} activeOpacity={0.9} onPress={onPress}>
        {contenu}
      </TouchableOpacity>
    );
  }

  // Sinon → affichage statique (mode détail)
  return <View style={styles.supportBlock}>{contenu}</View>;
}