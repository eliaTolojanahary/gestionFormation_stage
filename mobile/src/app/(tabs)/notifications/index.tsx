// app/(tabs)/notifications/index.tsx
 import { confirmer, alerte } from '@/utils/alert';
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Info,
  GraduationCap,
  Wallet,
  MessageCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import { useNotification } from '@/hooks/use-notification';
import { DetailHeader } from '@/components/detail-header';
import { createNotificationsStyles } from '@/styles/notifications.styles';
import { formatDateCourte } from '@/utils/format';

// ─── Type d'icône selon le type de notification ───
function iconeEtCouleur(type?: string) {
  switch (type) {
    case 'formation': return { Icon: GraduationCap, colorKey: 'accent' };
    case 'paiement':  return { Icon: Wallet,        colorKey: 'warning' };
    case 'support':   return { Icon: Info,          colorKey: 'accent' };
    case 'message':   return { Icon: MessageCircle, colorKey: 'success' };
    case 'alerte':    return { Icon: AlertCircle,   colorKey: 'danger' };
    default:          return { Icon: Bell,          colorKey: 'accent' };
  }
}

// Le serveur n'envoie pas de type : on le déduit du message
function typeDepuisMessage(message: string = ''): string {
  const m = message.toLowerCase();
  if (m.includes('assistance') || m.includes('mentionné') || m.includes('commentaire')) return 'message';
  if (m.includes('refusé')) return 'alerte';
  if (m.includes('paiement') || m.includes('rappel') || m.includes('facture')) return 'paiement';
  if (m.includes('attestation') || m.includes('inscription') || m.includes('formation')) return 'formation';
  return '';
}

// Onglet Notifications : liste avec compteur de non lues, marquer comme lu,
// tout marquer comme lu, supprimer (avec confirmation) et tirer-pour-rafraîchir
export default function NotificationsScreen() {
  const styles = useThemedStyles(createNotificationsStyles);
  const { palette } = useSettings();
  const router = useRouter();

  const {
    notifications,
    isLoading,
    error,
    getNotifications,
    lireNotification,
    deleteNotification,
  } = useNotification();

  const [refreshing, setRefreshing] = useState(false);

  const nonLues = notifications.filter((n) => !n.lu).length;

  function retour() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as any);
  }

  // ─── Refresh ───
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [getNotifications]);

  // ─── Actions ───
  async function handleLire(id: number) {
    try {
      await lireNotification(id);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de marquer comme lu.');
    }
  }


async function handleSupprimer(id: number) {
  const ok = await confirmer({
    title: 'Supprimer la notification',
    message: 'Voulez-vous vraiment supprimer cette notification ?',
    confirmText: 'Supprimer',
    cancelText: 'Annuler',
    destructive: true,
  });

  if (!ok) return;

  try {
    await deleteNotification(id);
  } catch (e: any) {
    alerte('Erreur', e?.message || 'Suppression impossible.');
  }
}
  async function handleToutLire() {
    const nonLuesList = notifications.filter((n) => !n.lu);
    await Promise.all(
      nonLuesList.map((n) => lireNotification(n.id_notification))
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <DetailHeader
        title={`Notifications${nonLues > 0 ? ` (${nonLues})` : ''}`}
        onBack={retour}
      />

      {/* Action "Tout marquer comme lu" */}
      {nonLues > 0 && (
        <TouchableOpacity
          style={styles.bulkAction}
          onPress={handleToutLire}
          activeOpacity={0.85}
        >
          <CheckCheck size={16} color={palette.accent} />
          <Text style={styles.bulkActionText}>
            Tout marquer comme lu ({nonLues})
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading && notifications.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={styles.loadingText}>
              Chargement des notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bell size={40} color={palette.textMuted} />
            <Text style={styles.emptyText}>
              Aucune notification pour le moment.
            </Text>
            <Text style={styles.emptyHint}>
              Vous serez alerté des nouvelles formations, paiements et messages.
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const { Icon, colorKey } = iconeEtCouleur(n.type || typeDepuisMessage(n.message));
            const couleur = (palette as any)[colorKey] || palette.accent;

            return (
              <TouchableOpacity
                key={n.id_notification}
                style={[
                  styles.card,
                  !n.lu && styles.cardUnread,
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  if (!n.lu) handleLire(n.id_notification);
                }}
              >
                {/* Icône */}
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        colorKey === 'danger'
                          ? palette.dangerSoft
                          : colorKey === 'success'
                          ? palette.successSoft
                          : colorKey === 'warning'
                          ? palette.warningSoft ?? palette.accentSoft
                          : palette.accentSoft,
                    },
                  ]}
                >
                  <Icon size={20} color={couleur} />
                </View>

                {/* Contenu */}
                <View style={styles.body}>
                  <View style={styles.headerRow}>
                    <Text
                      style={[
                        styles.titre,
                        !n.lu && styles.titreUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {n.titre || 'Notification'}
                    </Text>
                    {!n.lu && <View style={styles.dot} />}
                  </View>

                  <Text style={styles.message} numberOfLines={2}>
                    {n.message || n.contenu || ''}
                  </Text>

                  <Text style={styles.meta}>
                    {formatDateCourte(n.date_creation || n.date_envoi)}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  {!n.lu ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleLire(n.id_notification)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Check size={16} color={palette.accent} />
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleSupprimer(n.id_notification)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={palette.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}