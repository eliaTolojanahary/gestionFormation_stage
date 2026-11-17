// components/conditions/conditions-texte.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FileText, ShieldCheck } from 'lucide-react-native';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { createConditionsStyles } from '@/styles/conditions.styles';
import {
  CONDITIONS_UTILISATION, DATE_CONDITIONS, POLITIQUE_CONFIDENTIALITE,
  type SectionConditions,
} from '@/constants/conditions';

export type OngletConditions = 'conditions' | 'confidentialite';

// Texte des Conditions d'utilisation / Politique de confidentialité, avec ses deux onglets.
// Utilisé par l'écran Conditions (accord après connexion, lecture) et par l'inscription en ligne.
export function ConditionsTexte({ ongletInitial = 'conditions' }: { ongletInitial?: OngletConditions }) {
  const styles = useThemedStyles(createConditionsStyles);
  const { palette } = useSettings();
  const [onglet, setOnglet] = useState<OngletConditions>(ongletInitial);

  const sections = onglet === 'conditions' ? CONDITIONS_UTILISATION : POLITIQUE_CONFIDENTIALITE;

  return (
    <>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, onglet === 'conditions' && styles.tabActif]}
          onPress={() => setOnglet('conditions')}
        >
          <FileText size={15} color={onglet === 'conditions' ? palette.onAccent : palette.textMuted} />
          <Text style={[styles.tabText, onglet === 'conditions' && styles.tabTextActif]}>Conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, onglet === 'confidentialite' && styles.tabActif]}
          onPress={() => setOnglet('confidentialite')}
        >
          <ShieldCheck size={15} color={onglet === 'confidentialite' ? palette.onAccent : palette.textMuted} />
          <Text style={[styles.tabText, onglet === 'confidentialite' && styles.tabTextActif]}>Confidentialité</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.miseAJour}>Dernière mise à jour : {DATE_CONDITIONS}</Text>
        {sections.map((section) => (
          <Section key={section.titre} section={section} styles={styles} />
        ))}
      </ScrollView>
    </>
  );
}

// Une section : titre + paragraphes ; les lignes « • … » deviennent des puces
function Section({
  section,
  styles,
}: {
  section: SectionConditions;
  styles: ReturnType<typeof createConditionsStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitre}>{section.titre}</Text>
      {section.lignes.map((ligne, i) =>
        ligne.startsWith('•') ? (
          <View key={i} style={styles.puceLigne}>
            <View style={styles.puce} />
            <Text style={styles.puceTexte}>{ligne.replace(/^•\s*/, '')}</Text>
          </View>
        ) : (
          <Text key={i} style={styles.paragraphe}>{ligne}</Text>
        )
      )}
    </View>
  );
}
