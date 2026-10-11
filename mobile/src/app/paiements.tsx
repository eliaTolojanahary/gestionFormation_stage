// app/paiements.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Wallet, CheckCircle2, AlertCircle, Clock } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { usePaiement } from '@/hooks/use-paiement';
import { PaiementModal } from '@/components/paiement/paiement-modal';
import { DetailHeader } from '@/components/detail-header';
import { formatMontant, formatDateCourte } from '@/utils/format';
import { createPaiementsStyles } from '@/styles/paiements.styles';
import { useThemedStyles } from '@/context/SettingsContext';

// Écran Paiements de l'étudiant : totaux (dû / payé / reste), paiements en attente de validation,
// dernier paiement validé et prochaine tranche avec le bouton Payer.
export default function HistoriquePaiementScreen() {
  const styles = useThemedStyles(createPaiementsStyles);
  const { user } = useAuth();
  const router = useRouter();
  const etudiantId = user?.id_etudiant;

  // ─── Résumé de paiement (totaux, dernier paiement, prochaine tranche) ───
  const {
    resume: paiement,
    isLoading,
    error,
    getResumePaiement,
    payerProchaineEcheance,
  } = usePaiement(etudiantId);

  const [refreshing, setRefreshing] = useState(false);
  const [modalPaiementVisible, setModalPaiementVisible] = useState(false);

  const prochaine = paiement?.prochaine ?? null;
  const dernier = paiement?.dernier_paiement ?? null;
  const enAttente = paiement?.paiements_en_attente ?? [];
  const totalDu = Number(paiement?.total_du) || 0;
  const totalPaye = Number(paiement?.total_paye) || 0;
  const reste = Number(paiement?.solde) || 0;
  const enRetard = Number(prochaine?.en_retard) === 1;
  // Tout est réglé : plus rien à payer et aucune échéance restante
  const toutRegle = reste <= 0 && !prochaine;

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  }

  const handleRefresh = useCallback(async () => {
    if (!etudiantId) return;
    setRefreshing(true);
    try {
      await getResumePaiement();
    } finally {
      setRefreshing(false);
    }
  }, [etudiantId, getResumePaiement]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header fixe, hors du ScrollView */}
      <DetailHeader title="Historique de paiement" onBack={retour} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#072E4C"
          />
        }
      >
        <Text style={styles.headerSubtitle}>
          Retrouvez vos paiements effectués, le reste à payer et vos prochaines
          tranches.
        </Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!etudiantId ? (
          <View style={styles.emptyBox}>
            <Wallet size={30} color="#8898AA" />
            <Text style={styles.emptyText}>
              Profil étudiant introuvable. Reconnectez-vous.
            </Text>
          </View>
        ) : isLoading && !paiement ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#072E4C" />
            <Text style={styles.loadingText}>
              Chargement de vos paiements...
            </Text>
          </View>
        ) : (
          <>
            {/* ─── Totaux ─── */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total dû</Text>
                <Text style={styles.statValue}>{formatMontant(totalDu)}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Déjà payé</Text>
                <Text style={[styles.statValue, styles.statValueOk]}>
                  {formatMontant(totalPaye)}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  styles.statCardLast,
                  reste > 0 && styles.statCardReste,
                ]}
              >
                <Text style={styles.statLabel}>Reste</Text>
                <Text
                  style={[
                    styles.statValue,
                    reste > 0 ? styles.statValueReste : styles.statValueOk,
                  ]}
                >
                  {formatMontant(reste)}
                </Text>
              </View>
            </View>

            {/* ─── Paiements envoyés, en attente de validation par l'accueil ─── */}
            {enAttente.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>En attente de validation</Text>
                {enAttente.map((p) => (
                  <View key={p.id_paiement} style={[styles.paiementCard, styles.paiementCardAttente]}>
                    <View style={[styles.paiementIconWrap, styles.paiementIconWrapAttente]}>
                      <Clock size={20} color="#EF6C00" />
                    </View>
                    <View style={styles.paiementBody}>
                      <Text style={styles.paiementLabel}>Envoyé le {formatDateCourte(p.date_paiement)}</Text>
                      <Text style={styles.paiementTexte}>
                        <Text style={styles.paiementMontant}>{formatMontant(p.montant)}</Text>
                        {' pour '}
                        <Text style={styles.paiementFormation}>{p.formation_nom}</Text>
                        {" — en cours de vérification par l'accueil."}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {/* ─── Dernier paiement ─── */}
            <Text style={styles.sectionTitle}>Dernier paiement</Text>

            {dernier ? (
              <View style={[styles.paiementCard, styles.paiementCardOk]}>
                <View
                  style={[styles.paiementIconWrap, styles.paiementIconWrapOk]}
                >
                  <CheckCircle2 size={20} color="#2E7D32" />
                </View>

                <View style={styles.paiementBody}>
                  <Text style={styles.paiementLabel}>Paiement validé</Text>
                  <Text style={styles.paiementTexte}>
                    Vous avez payé{' '}
                    <Text style={styles.paiementMontant}>
                      {formatMontant(dernier.montant)}
                    </Text>
                    {' pour '}
                    <Text style={styles.paiementFormation}>
                      {dernier.formation_nom || 'votre formation'}
                    </Text>
                    {' le '}
                    {formatDateCourte(dernier.date_paiement)}
                  </Text>

                  {dernier.mode_paiement || dernier.reference_virement ? (
                    <Text style={styles.paiementMeta}>
                      {dernier.mode_paiement
                        ? `Mode : ${dernier.mode_paiement}`
                        : ''}
                      {dernier.mode_paiement && dernier.reference_virement
                        ? ' · '
                        : ''}
                      {dernier.reference_virement
                        ? `Réf. ${dernier.reference_virement}`
                        : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  Aucun paiement enregistré pour le moment.
                </Text>
              </View>
            )}

            {/* ─── Tranches restantes ─── */}
            <Text style={styles.sectionTitle}>
              {toutRegle ? 'Situation' : 'Prochaine tranche à régler'}
            </Text>

            {prochaine ? (
              <>
                <Text style={styles.sectionHint}>
                  Il vous reste {formatMontant(reste)} à payer sur un total de{' '}
                  {formatMontant(totalDu)}.
                </Text>

                <View
                  style={[styles.trancheCard, enRetard && styles.trancheCardLate]}
                >
                  <View style={styles.trancheHeaderRow}>
                    <Text style={styles.trancheFormation} numberOfLines={2}>
                      {prochaine.formation_nom || 'Votre formation'}
                    </Text>
                    {enRetard ? (
                      <View style={styles.lateBadge}>
                        <Text style={styles.lateBadgeText}>EN RETARD</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.trancheMontant}>
                    {formatMontant(prochaine.montant_prevu)}
                  </Text>

                  <View style={styles.trancheEcheanceRow}>
                    <Wallet size={14} color={enRetard ? '#C62828' : '#68788D'} />
                    <Text
                      style={[
                        styles.trancheEcheance,
                        enRetard && styles.trancheEcheanceLate,
                      ]}
                    >
                      {enRetard ? 'Échéance dépassée le ' : 'À payer avant le '}
                      {formatDateCourte(prochaine.date_echeance)}
                    </Text>
                  </View>

                  {/* Ouvre le modal de paiement déjà existant */}
                  <TouchableOpacity
                    style={styles.payerBtn}
                    activeOpacity={0.85}
                    onPress={() => setModalPaiementVisible(true)}
                  >
                    <Wallet size={18} color="#FFFFFF" />
                    <Text style={styles.payerBtnText}>
                      Payer {formatMontant(prochaine.montant_prevu)}
      
                  </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.lateInfoBox}>
                  <AlertCircle
                    size={14}
                    color={enRetard ? '#C62828' : '#5A6E85'}
                  />
                  <Text
                    style={[
                      styles.lateInfoText,
                      enRetard && styles.lateInfoTextLate,
                    ]}
                  >
                    {enRetard
                      ? 'Cette tranche est en retard, merci de régulariser votre situation.'
                      : 'Le paiement se fait via le mode de votre choix (cash ou virement).'}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.okCard}>
                <CheckCircle2 size={22} color="#2E7D32" />
                <Text style={styles.okText}>
                  Vous êtes à jour de vos paiements.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── MODAL PAIEMENT (composant existant) ─── */}
      <PaiementModal
        visible={modalPaiementVisible}
        onClose={() => setModalPaiementVisible(false)}
        echeance={prochaine}
        onPayer={async (mode) => {
          await payerProchaineEcheance(mode);
          setModalPaiementVisible(false);
        }}
      />
    </SafeAreaView>
  );
}
