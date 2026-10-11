// components/vitrine/formation-detail-modal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { BadgeCheck, CalendarClock, Clock, Users, Wallet, X } from 'lucide-react-native';
import { FormationPublique } from '@/hooks/use-vitrine';
import { createVitrineStyles } from '@/styles/vitrine.styles';
import { useThemedStyles } from '@/context/SettingsContext';
import { formatAriary } from './format-vitrine';
import { getFileUrl } from '@/utils/format';

interface Props {
  formation: FormationPublique | null;
  couleur: string;
  selectionnee: boolean;
  onFermer: () => void;
  onBasculerSelection: () => void;
  onInscrire: () => void;
}

// Fiche d'une formation (feuille du bas) : description, formateur, engagement de disponibilité,
// tarif et durée ; « S'inscrire » ouvre l'inscription, « Ajouter » la met dans la sélection
// pour s'inscrire à plusieurs formations d'un coup.
export function FormationDetailModal({
  formation,
  couleur,
  selectionnee,
  onFermer,
  onBasculerSelection,
  onInscrire,
}: Props) {
  const styles = useThemedStyles(createVitrineStyles);
  if (!formation) return null;

  const formateur = `${formation.prenom_formateur} ${formation.nom_formateur}`.trim();
  const competent = formation.avis_formateur === 'competent';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onFermer}>
      <View style={styles.modalFond}>
        <View style={styles.modalFeuille}>
          <View style={styles.modalPoignee} />
          <View style={styles.modalEntete}>
            <Text style={styles.modalTitre} numberOfLines={2}>{formation.nom}</Text>
            <TouchableOpacity onPress={onFermer} accessibilityLabel="Fermer">
              <X size={22} color="#5A6E85" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContenu}>
            {/* Photo de couverture de la formation (couleur si elle n'en a pas) */}
            <ImageBackground
              source={formation.image ? { uri: getFileUrl(formation.image) || undefined } : undefined}
              style={[styles.detailBandeau, { backgroundColor: couleur }]}
              imageStyle={styles.couvertureImageFond}
              resizeMode="cover"
            >
              {formation.image ? <View style={styles.couvertureVoile} /> : null}
              <Text style={styles.detailBandeauTexte}>{formation.nom}</Text>
            </ImageBackground>

            <View style={styles.detailLigne}>
              <Users size={16} color="#5A6E85" />
              <Text style={styles.detailTexte}>
                Formateur : {formateur}
                {formation.nb_inscrits > 0 ? ` · ${formation.nb_inscrits} inscrit(s)` : ''}
              </Text>
            </View>
            {competent ? (
              <View style={styles.detailLigne}>
                <BadgeCheck size={16} color="#2E7D32" />
                <Text style={[styles.detailTexte, { color: '#2E7D32', fontWeight: '700' }]}>
                  Formateur compétent · {formation.taux_positif} % d’avis positifs des étudiants
                </Text>
              </View>
            ) : null}
            <View style={styles.detailLigne}>
              <Clock size={16} color="#5A6E85" />
              <Text style={styles.detailTexte}>
                Durée : {formation.duree ? `${formation.duree} mois` : `${formation.duree_jours} jours`}
              </Text>
            </View>
            <View style={styles.detailLigne}>
              <Wallet size={16} color="#5A6E85" />
              <Text style={styles.detailTexte}>
                {formatAriary(formation.tarif)} · paiement possible en 1 à 4 tranches
              </Text>
            </View>

            {formation.description ? (
              <>
                <Text style={styles.detailTitre}>La formation</Text>
                <Text style={styles.detailParagraphe}>{formation.description}</Text>
              </>
            ) : null}

            <Text style={styles.detailTitre}>Engagement du formateur</Text>
            <View style={styles.detailLigne}>
              <CalendarClock size={16} color="#5A6E85" />
              <Text style={styles.detailTexte}>{formation.engagement_formateur}</Text>
            </View>

            <View style={styles.detailBoutons}>
              <TouchableOpacity style={styles.boutonSecondaire} onPress={onBasculerSelection}>
                <Text style={styles.boutonSecondaireTexte}>
                  {selectionnee ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.boutonPrincipal} onPress={onInscrire}>
                <Text style={styles.boutonPrincipalTexte}>S’inscrire</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
