// components/paiement/paiement-modal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import {
  X,
  Wallet,
  Building2,
  Banknote,
  CheckCircle2,
} from 'lucide-react-native';
import type { ModePaiement, ProchaineEcheance } from '@/hooks/use-paiement';
import { formatDateCourte,formatMontant } from '@/utils/format';
import { createPaiementModalStyles } from '@/styles/components/paiement-modal.styles';
import { useSettings, useThemedStyles } from '@/context/SettingsContext';

// Modes de paiement — à aligner avec la table `mode_paiement`
const MODES_PAIEMENT: ModePaiement[] = [
  { id_mode_paiement: 1, nom: 'Cash',               code: 'especes' },
  { id_mode_paiement: 2, nom: 'Virement bancaire',  code: 'virement' },
];

// Icône affichée selon le mode de paiement
function iconePourMode(code: ModePaiement['code']) {
  switch (code) {
    case 'virement':      return Building2;
    case 'especes':       return Banknote;
    default:              return Wallet;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  echeance: ProchaineEcheance | null;
  /** Callback appelé quand l'utilisateur confirme le paiement */
  onPayer: (mode: ModePaiement) => Promise<void>;
}

// Fenêtre (glissant du bas) pour payer la prochaine échéance : récapitulatif, choix du mode,
// puis envoi. Le paiement reste "en attente" jusqu'à sa validation par l'accueil.
export function PaiementModal({ visible, onClose, echeance, onPayer }: Props) {
  const styles = useThemedStyles(createPaiementModalStyles);
  const { palette } = useSettings();
  const [modeSelectionne, setModeSelectionne] = useState<ModePaiement | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function confirmer() {
    if (!modeSelectionne) {
      Alert.alert('Mode de paiement', 'Veuillez sélectionner un mode de paiement.');
      return;
    }
    setEnCours(true);
    try {
      await onPayer(modeSelectionne);
    } finally {
      setEnCours(false);
    }
  }

  // Fermeture bloquée pendant l'envoi ; le mode choisi est réinitialisé
  function fermer() {
    if (enCours) return;
    setModeSelectionne(null);
    onClose();
  }

  if (!echeance) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={fermer}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* ─── Header ─── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Paiement</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={fermer}
              disabled={enCours}
            >
              <X size={20} color={palette.heading} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Récap échéance ─── */}
            <View style={styles.recapCard}>
              <Text style={styles.recapLabel}>Formation</Text>
              <Text style={styles.recapValue}>{echeance.formation_nom}</Text>

              <View style={styles.recapRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapLabel}>Montant à payer</Text>
                  <Text style={styles.recapAmount}>
                    {formatMontant(echeance.montant_prevu)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recapLabel}>Échéance</Text>
                  <Text style={styles.recapValue}>
                    {formatDateCourte(echeance.date_echeance)}
                  </Text>
                </View>
              </View>

              {Number(echeance.en_retard) === 1 ? (
                <View style={styles.lateBadge}>
                  <Text style={styles.lateBadgeText}>EN RETARD</Text>
                </View>
              ) : null}
            </View>

            {/* ─── Choix du mode ─── */}
            <Text style={styles.sectionTitle}>Mode de paiement</Text>

            {MODES_PAIEMENT.map((mode) => {
              const Icone = iconePourMode(mode.code);
              const actif = modeSelectionne?.id_mode_paiement === mode.id_mode_paiement;
              return (
                <TouchableOpacity
                  key={mode.id_mode_paiement}
                  style={[styles.modeItem, actif && styles.modeItemActif]}
                  activeOpacity={0.85}
                  onPress={() => setModeSelectionne(mode)}
                  disabled={enCours}
                >
                  <View
                    style={[
                      styles.modeIconWrap,
                      actif && styles.modeIconWrapActif,
                    ]}
                  >
                    <Icone size={20} color={actif ? palette.onAccent : palette.accent} />
                  </View>
                  <Text
                    style={[styles.modeNom, actif && styles.modeNomActif]}
                  >
                    {mode.nom}
                  </Text>
                  {actif ? (
                    <CheckCircle2 size={20} color={palette.success} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ─── Bouton payer ─── */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Votre paiement sera vérifié puis validé par l'accueil IMTECH.
            </Text>
            <TouchableOpacity
              style={[
                styles.payerBtn,
                (!modeSelectionne || enCours) && styles.payerBtnDisabled,
              ]}
              activeOpacity={0.9}
              onPress={confirmer}
              disabled={!modeSelectionne || enCours}
            >
              {enCours ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.payerBtnText}>
                  Envoyer le paiement de {formatMontant(echeance.montant_prevu)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

