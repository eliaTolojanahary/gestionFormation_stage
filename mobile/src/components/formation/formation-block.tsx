// components/formation-detail/FormationHero.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Formation } from '@/hooks/use-formation';
import { formatDateFr } from '@/utils/format';
import { createFormationBlockStyles } from '@/styles/components/formation-block.styles';
import { useThemedStyles } from '@/context/SettingsContext';

interface Props {
  formation: Formation | null;
  estEnCours: boolean;
  formateur: string;
  dateInscription?: string;
}

// En-tête coloré du détail d'une formation : badge EN COURS, durée, nom, formateur, date d'inscription
export function FormationBlock({
  formation,
  estEnCours,
  formateur,
  dateInscription,
}: Props) {
  const styles = useThemedStyles(createFormationBlockStyles);
  return (
    <View style={styles.hero}>
      <View style={styles.heroTopRow}>
        {estEnCours ? (
          <View style={styles.badgeEnCours}>
            <Text style={styles.badgeEnCoursText}>EN COURS</Text>
          </View>
        ) : (
          <View />
        )}

        {formation?.duree_jours ? (
          <View style={styles.heroPill}>
            <Clock size={12} color="rgba(255,255,255,0.78)" />
            <Text style={styles.heroPillText}>
              {formation.duree_jours} jour
              {formation.duree_jours > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.heroTitle}>{formation?.nom || 'Formation'}</Text>

      {formateur ? (
        <Text style={styles.heroTrainer}>Formateur · {formateur}</Text>
      ) : null}

      {dateInscription ? (
        <Text style={styles.heroMeta}>
          Inscrit le {formatDateFr(dateInscription)}
        </Text>
      ) : null}
    </View>
  );
}