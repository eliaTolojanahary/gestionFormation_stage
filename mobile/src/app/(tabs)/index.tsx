// app/(tabs)/index.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useFormationEtudiant } from '@/hooks/use-formation';
import { useSupport, Support, Commentaire } from '@/hooks/use-support';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Search, ArrowRight, Code, Megaphone, FileText, Download, BookOpen,
  CheckCircle2, Wallet, AlertCircle,
} from 'lucide-react-native';
import { usePaiement } from '@/hooks/use-paiement';
import  {PaiementModal} from "@/components/paiement/paiement-modal"
import { getFileUrl,getInitiales,timestamp,formatMontant,formatRelativeDate,formatDateCourte } from '@/utils/format';
import { createAccueilStyles } from '@/styles/acceuil.styles';
import { RechercheGlobale } from '@/components/recherche/recherche-globale';
import { useThemedStyles } from '@/context/SettingsContext';

// Couleurs de fond / d'icône utilisées en alternance pour les cartes
const COLORS = ['#E8F5E9', '#FFF3E0', '#E3F2FD', '#FCE4EC', '#F3E5F5'];
const ICON_COLORS = ['#2E7D32', '#EF6C00', '#1976D2', '#C2185B', '#7B1FA2'];

const NB_SUPPORTS_AFFICHES = 3;
const NB_COMMENTAIRES_AFFICHES = 3;

// Accueil de l'étudiant : salutation, formation la plus récente, carte de paiement
// (prochaine échéance + bouton Payer), derniers supports et derniers commentaires
// de toutes ses formations.
export default function StudentHomeScreen() {
  const styles = useThemedStyles(createAccueilStyles);
  const { user } = useAuth();
  const { formations, isLoading, error, getFormations } = useFormationEtudiant();
  const { getSupports, getCommentairesByFormation } = useSupport();
  const router = useRouter();

  // ⚠️ etudiantId doit être déclaré AVANT usePaiement
  const etudiantId = user?.id_etudiant;

 const {
  resume: paiement,
  isLoading: paiementLoading,
  getResumePaiement,
  payerProchaineEcheance,   
} = usePaiement(etudiantId);

  const [refreshing, setRefreshing] = useState(false);
  const [supports, setSupports] = useState<Support[]>([]);
  const [supportsLoading, setSupportsLoading] = useState(false);
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [commentairesLoading, setCommentairesLoading] = useState(false);
const [modalPaiementVisible, setModalPaiementVisible] = useState(false);
  const [rechercheVisible, setRechercheVisible] = useState(false);
  const prenom = user?.prenom || 'Étudiant';
  const nom = user?.nom || '';
  const initiales = getInitiales(prenom, nom);
  const photoUrl = user?.photo ? getFileUrl(user.photo) : null;

  // ─── 1. Chargement des formations ───
  useEffect(() => {
    if (etudiantId) getFormations(etudiantId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etudiantId]);

  // ─── Formation la plus récente (hero) ───
  const formationRecente = useMemo(() => {
    if (formations.length === 0) return null;
    return [...formations].sort(
      (a, b) =>
        timestamp(b.date_inscription) -
        timestamp(a.date_inscription)
    )[0];
  }, [formations]);

  // ─── 2. Chargement GLOBAL des supports ───
  useEffect(() => {
    if (formations.length === 0) {
      setSupports([]);
      return;
    }

    let annule = false;

    (async () => {
      setSupportsLoading(true);
      try {
        const listes = await Promise.all(
          formations.map((f) => getSupports(f.id_formation))
        );
        if (annule) return;

        const tous = listes
          .flat()
          .sort((a, b) => {
            const ta = timestamp(a.date_publication || a.date_ajout);
            const tb = timestamp(b.date_publication || b.date_ajout);
            return tb - ta;
          });

        setSupports(tous);
      } finally {
        if (!annule) setSupportsLoading(false);
      }
    })();

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formations]);

  // ─── 3. Chargement GLOBAL des commentaires ───
  useEffect(() => {
    if (formations.length === 0) {
      setCommentaires([]);
      return;
    }

    let annule = false;

    (async () => {
      setCommentairesLoading(true);
      try {
        const listes = await Promise.all(
          formations.map((f) => getCommentairesByFormation(f.id_formation))
        );
        if (annule) return;

        const tous = listes
          .flat()
          .sort((a, b) => {
            const ta = timestamp(a.date_commentaire || a.date_creation);
            const tb = timestamp(b.date_commentaire || b.date_creation);
            return tb - ta;
          });

        setCommentaires(tous);
      } finally {
        if (!annule) setCommentairesLoading(false);
      }
    })();

    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formations]);

  // ─── Map id_support → Support ───
  const supportsParId = useMemo(() => {
    const map: Record<number, Support> = {};
    supports.forEach((s) => {
      map[s.id_support] = s;
    });
    return map;
  }, [supports]);

  // ─── Map id_formation → Formation ───
  const formationsParId = useMemo(() => {
    const map: Record<number, { nom?: string }> = {};
    formations.forEach((f) => {
      map[f.id_formation] = f;
    });
    return map;
  }, [formations]);

  // ─── Supports et commentaires affichés ───
  const supportsAffiches = useMemo(
    () => supports.slice(0, NB_SUPPORTS_AFFICHES),
    [supports]
  );
  const commentairesAffiches = useMemo(
    () => commentaires.slice(0, NB_COMMENTAIRES_AFFICHES),
    [commentaires]
  );

  // ─── Nom de formation pour la carte paiement ───
  // (le backend renvoie déjà formation_nom, mais on garde un fallback local)
  const nomFormationProchaine = useMemo(() => {
    const p = paiement?.prochaine;
    if (!p) return '';
    return (
      p.formation_nom ||
      formationsParId[p.id_formation]?.nom ||
      'Formation'
    );
  }, [paiement?.prochaine, formationsParId]);

  // ─── Pull to refresh ───
  const handleRefresh = useCallback(async () => {
    if (!etudiantId) return;
    setRefreshing(true);
    try {
      await getFormations(etudiantId);
      await getResumePaiement();
      // Les useEffect sur `formations` rechargeront supports + commentaires
    } finally {
      setRefreshing(false);
    }
  }, [etudiantId, getFormations, getResumePaiement]);

  // ─── Navigation ───
  function ouvrirSupport(idSupport: number, idFormation?: number) {
    router.push({
      pathname: '/(tabs)/documents/[id]',
      params: idFormation
        ? { id: String(idSupport), formation: String(idFormation) }
        : { id: String(idSupport) },
    } as any);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
    
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingLight}>Bonjour,</Text>
            <Text style={styles.greetingName}>{prenom}</Text>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={{ padding: 6 }}
              onPress={() => setRechercheVisible(true)}
              accessibilityLabel="Rechercher"
            >
              <Search size={22} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
  style={styles.avatarCircle}
  activeOpacity={0.7}
  onPress={() => router.push('/(tabs)/profile' as any)}
>
  {photoUrl ? (
    <Image
      source={{ uri: photoUrl }}
      style={styles.avatarImage}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <Text style={styles.avatarText}>{initiales}</Text>
  )}
</TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading && formations.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#072E4C" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {/* ─── HERO : dernière formation ─── */}
            {formationRecente ? (
              <TouchableOpacity
                style={styles.heroCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/formations/[id]',
                    params: { id: String(formationRecente.id_formation) },
                  } as any)
                }
              >
                <View style={styles.heroHeader}>
                  <View style={styles.badgeEnCours}>
                    <Text style={styles.badgeEnCoursText}>EN COURS</Text>
                  </View>
                  <ArrowRight size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.heroTitle}>{formationRecente.nom}</Text>
                {formationRecente.prenom_formateur ||
                formationRecente.nom_formateur ? (
                  <Text style={styles.heroTrainer}>
                    Formateur · {formationRecente.prenom_formateur || ''}{' '}
                    {formationRecente.nom_formateur || ''}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyBox}>
                <BookOpen size={32} color="#8898AA" />
                <Text style={styles.emptyText}>
                  Vous n'êtes inscrit à aucune formation.
                </Text>
              </View>
            )}

{/* ─── CARTE PAIEMENT ─── */}
{paiement?.prochaine ? (
  // Cas 1 : il reste quelque chose à payer → ouvrir modal
  <TouchableOpacity
    style={[
      styles.payCard,
      Number(paiement.prochaine.en_retard) === 1
        ? styles.payCardLate
        : styles.payCardDue,
    ]}
    activeOpacity={0.9}
    onPress={() => setModalPaiementVisible(true)}
  >
    <View style={styles.payIconWrapper}>
      {Number(paiement.prochaine.en_retard) === 1 ? (
        <AlertCircle size={22} color="#C62828" />
      ) : (
        <Wallet size={22} color="#EF6C00" />
      )}
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.payTitle}>
        {Number(paiement.prochaine.en_retard) === 1
          ? 'Paiement en retard'
          : 'Paiement à effectuer'}
      </Text>
      <Text style={styles.paySub}>
        <Text style={{ fontWeight: '800' }}>
          {nomFormationProchaine}
        </Text>
        {' : '}
        {formatMontant(paiement.prochaine.montant_prevu)}
        {paiement.prochaine.date_echeance
          ? ` à payer le ${formatDateCourte(
              paiement.prochaine.date_echeance
            )}`
          : ''}
      </Text>
      <Text style={styles.payCta}>Appuyez pour payer →</Text>
    </View>
  </TouchableOpacity>
) : paiement?.dernier_paiement ? (
  // Cas 2 : tout est réglé
  <View style={[styles.payCard, styles.payCardOk]}>
    <View style={styles.payIconWrapper}>
      <CheckCircle2 size={22} color="#2E7D32" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.payTitle}>Tous les paiements réglés</Text>
      <Text style={styles.paySub}>
        Dernier paiement :{' '}
        {formatMontant(paiement.dernier_paiement.montant)}
        {' pour '}
        <Text style={{ fontWeight: '700' }}>
          {paiement.dernier_paiement.formation_nom}
        </Text>
        {' le '}
        {formatDateCourte(paiement.dernier_paiement.date_paiement)}
      </Text>
    </View>
  </View>
) : null}

{/* ─── MODAL PAIEMENT ─── */}
<PaiementModal
  visible={modalPaiementVisible}
  onClose={() => setModalPaiementVisible(false)}
  echeance={paiement?.prochaine ?? null}
  onPayer={async (mode) => {
    await payerProchaineEcheance(mode);
    setModalPaiementVisible(false);
  }}
/>

            {/* ─── Mes formations (2 premières) ─── */}
            {formations.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Mes formations</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/formations' as any)}
                  >
                    <Text style={styles.seeAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.formationsGrid}>
                  {formations.slice(0, 2).map((formation, index) => (
                    <TouchableOpacity
                      key={formation.id_formation}
                      style={styles.formationCard}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/formations/[id]',
                          params: { id: String(formation.id_formation) },
                        } as any)
                      }
                    >
                      <View
                        style={[
                          styles.formationIconWrapper,
                          { backgroundColor: COLORS[index % COLORS.length] },
                        ]}
                      >
                        {index % 2 === 0 ? (
                          <Code
                            size={20}
                            color={ICON_COLORS[index % ICON_COLORS.length]}
                          />
                        ) : (
                          <Megaphone
                            size={20}
                            color={ICON_COLORS[index % ICON_COLORS.length]}
                          />
                        )}
                      </View>
                      <Text style={styles.formationCardTitle} numberOfLines={2}>
                        {formation.nom}
                      </Text>
                      <Text style={styles.formationCardSub}>
                        {formation.nb_modules ?? 0} module(s)
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* ─── DERNIERS SUPPORTS ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Derniers supports</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/documents' as any)}
              >
                <Text style={styles.seeAllText}>Tout afficher</Text>
              </TouchableOpacity>
            </View>

            {supportsLoading ? (
              <View style={styles.supportLoadingBox}>
                <ActivityIndicator size="small" color="#072E4C" />
              </View>
            ) : supportsAffiches.length === 0 ? (
              <View style={styles.emptySupportBox}>
                <Text style={styles.emptySupportText}>
                  Aucun support pour le moment.
                </Text>
              </View>
            ) : (
              supportsAffiches.map((support) => {
                const nomFormation =
                  (support.id_formation != null ? formationsParId[support.id_formation]?.nom : undefined) ||
                  support.nom_formation ||
                  '';
                return (
                  <TouchableOpacity
                    key={support.id_support}
                    style={styles.supportCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      ouvrirSupport(support.id_support, support.id_formation)
                    }
                  >
                    <View style={styles.supportIconWrapper}>
                      <FileText size={20} color="#E53935" />
                    </View>
                    <View style={styles.supportDetails}>
                      <Text style={styles.supportTitle} numberOfLines={1}>
                        {support.titre || 'Support'}
                      </Text>
                      <Text style={styles.supportSub} numberOfLines={1}>
                        {nomFormation ? `${nomFormation} · ` : ''}
                        {(support.type || 'PDF').toUpperCase()} ·{' '}
                        {formatRelativeDate(
                          support.date_publication || support.date_ajout
                        )}
                      </Text>
                    </View>
                    <View style={{ padding: 6 }}>
                      <Download size={20} color="#5A6E85" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* ─── DERNIERS COMMENTAIRES ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Commentaires récents</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/notifications' as any)}
              >
              </TouchableOpacity>
            </View>

            {commentairesLoading ? (
              <View style={styles.supportLoadingBox}>
                <ActivityIndicator size="small" color="#072E4C" />
              </View>
            ) : commentairesAffiches.length === 0 ? (
              <View style={styles.emptySupportBox}>
                <Text style={styles.emptySupportText}>
                  Aucun commentaire pour le moment.
                </Text>
              </View>
            ) : (
              commentairesAffiches.map((commentaire, index) => {
                const numero = String(index + 1).padStart(2, '0');
                const supportLie = supportsParId[commentaire.id_support];
                const nomSupport = supportLie?.titre || 'un support';
                return (
                  <TouchableOpacity
                    key={commentaire.id_commentaire}
                    style={styles.commentCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!commentaire.id_support) return;
                      ouvrirSupport(
                        commentaire.id_support,
                        supportLie?.id_formation
                      );
                    }}
                  >
                    <View style={styles.commentIndexBox}>
                      <Text style={styles.commentIndexText}>{numero}</Text>
                    </View>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {getInitiales(commentaire.prenom, commentaire.nom)}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor} numberOfLines={1}>
                          {commentaire.prenom || ''} {commentaire.nom || ''}
                          {' dans '}
                          <Text style={styles.commentTarget}>
                            {nomSupport}
                          </Text>
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatRelativeDate(
                            commentaire.date_commentaire ||
                              commentaire.date_creation
                          )}
                        </Text>
                      </View>
                      <Text style={styles.commentBody} numberOfLines={3}>
                        {commentaire.contenu}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <RechercheGlobale visible={rechercheVisible} onClose={() => setRechercheVisible(false)} />
    </SafeAreaView>
  );
}
