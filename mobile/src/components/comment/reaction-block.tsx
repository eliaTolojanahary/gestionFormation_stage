// components/comment/reaction-block.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Reaction, REACTION_TYPES, TypeReaction } from '@/hooks/use-reaction';
import { createReactionBlockStyles } from '@/styles/components/reaction-block.styles';
import { useThemedStyles } from '@/context/SettingsContext';

interface Props {
  reactions: Reaction[];
  userId?: number;
  disabled?: boolean;
  onReagir: (type: TypeReaction) => void;
}

// Rangée de boutons de réaction (👍 ❤️ 💡) avec leur compteur ;
// le type choisi par l'utilisateur connecté est mis en évidence
export function ReactionBlock({ reactions, userId, disabled, onReagir }: Props) {
  const styles = useThemedStyles(createReactionBlockStyles);
  return (
    <View style={styles.row}>
      {REACTION_TYPES.map((type) => {
        const nombre = reactions.filter((r) => r.type_reaction === type.nom).length;
        const actif = reactions.some(
          (r) =>
            Number(r.id_utilisateur) === Number(userId) &&
            r.type_reaction === type.nom
        );

        return (
          <TouchableOpacity
            key={type.id}
            style={[styles.chip, actif && styles.chipActif]}
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() => onReagir(type)}
          >
            <Text style={styles.icon}>{type.icone}</Text>
            <Text style={[styles.count, actif && styles.countActif]}>
              {nombre}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}