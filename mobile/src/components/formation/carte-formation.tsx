// components/formation/carte-formation.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ArrowRight, Clock, Code, Megaphone } from 'lucide-react-native';
import { Formation } from '@/hooks/use-formation';
import { formatDateFr } from '@/utils/format';
import { createCarteFormationStyles } from '@/styles/components/carte-formation.styles';
import { useThemedStyles } from '@/context/SettingsContext';

// Couleurs cycliques selon l'index
const CARD_COLORS = ['#E8F5E9', '#FFF3E0', '#E3F2FD', '#FCE4EC', '#F3E5F5'];
const ICON_COLORS = ['#2E7D32', '#EF6C00', '#1976D2', '#C2185B', '#7B1FA2'];

interface Props {
  formation: Formation;
  index: number;
  enCours: boolean;
  onPress: () => void;
}

// Carte d'une formation dans la liste ; l'index sert seulement à varier l'icône et les couleurs
export function CarteFormation({ formation, index, enCours, onPress }: Props) {
  const styles = useThemedStyles(createCarteFormationStyles);
  const formateur = `${formation.prenom_formateur || ''} ${
    formation.nom_formateur || ''
  }`.trim();

  const Icone = index % 2 === 0 ? Code : Megaphone;
  const iconeCouleur = ICON_COLORS[index % ICON_COLORS.length];

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.cardTop}>
        <View
          style={[
            styles.cardIconWrapper,
            { backgroundColor: CARD_COLORS[index % CARD_COLORS.length] },
          ]}
        >
          <Icone size={20} color={iconeCouleur} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {formation.nom}
            </Text>
            {enCours ? (
              <View style={styles.badgeEnCours}>
                <Text style={styles.badgeEnCoursText}>EN COURS</Text>
              </View>
            ) : null}
          </View>

          {/* Inscription pas encore validée par l'Accueil (ex. inscription en ligne) */}
          {formation.valide === false || formation.valide === 0 ? (
            <Text style={[styles.cardFormateur, { color: '#B45309', fontWeight: '700' }]}>
              En attente de validation par l’accueil
            </Text>
          ) : null}

          {formateur ? (
            <Text style={styles.cardFormateur} numberOfLines={1}>
              Formateur · {formateur}
            </Text>
          ) : null}
        </View>
      </View>

      {formation.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {formation.description}
        </Text>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          {formation.duree_jours ? (
            <>
              <Clock size={13} color="#8898AA" />
              <Text style={styles.cardMetaText}>
                {formation.duree_jours} jour
                {formation.duree_jours > 1 ? 's' : ''}
              </Text>
            </>
          ) : null}

          {formation.date_inscription ? (
            <Text style={styles.cardMetaText}>
              {formation.duree_jours ? ' · ' : ''}Inscrit le{' '}
              {formatDateFr(formation.date_inscription)}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardArrow}>
          <ArrowRight size={18} color="#0A3B66" />
        </View>
      </View>
    </TouchableOpacity>
  );
}