// components/detail-header.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  Pressable, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createDetailHeaderStyles } from '@/styles/components/detail-header.styles';
import { useThemedStyles, useSettings } from '@/context/SettingsContext';
import {
  ChevronLeft, EllipsisVertical, X,
  Wallet, LifeBuoy, Settings, ChevronRight,
} from 'lucide-react-native';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
}

interface DetailHeaderProps {
  /** Titre affiché au centre de la barre */
  title: string;
  /** Action du bouton retour */
  onBack: () => void;
  /**
   * Si fourni, l'ellipsis est cliquable et ouvre le menu.
   * Sinon, un menu par défaut avec les 4 liens standards s'affiche.
   */
  menuItems?: MenuItem[];
}

// Barre du haut des écrans secondaires : bouton retour, titre, et menu "⋮"
// (Paiement, Assistance, Paramètres par défaut)
export function DetailHeader({ title, onBack, menuItems }: DetailHeaderProps) {
  const styles = useThemedStyles(createDetailHeaderStyles);
  const { palette } = useSettings();
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();

  // Menu par défaut : historique paiement, assistance, paramètres
  const defaultItems: MenuItem[] = [
    {
      key: 'historique paiement',
      label: 'Paiement',
      icon: Wallet,
      onPress: () => router.push('/paiements' as any),
    },
    {
      key: 'assistance',
      label: 'Assistance',
      icon: LifeBuoy,
      onPress: () => router.push('/assistance' as any),
    },
    {
      key: 'parametres',
      label: 'Paramètres',
      icon: Settings,
      onPress: () => router.push('/parametres' as any),
    },
  ];

  const items = menuItems && menuItems.length > 0 ? menuItems : defaultItems;

  function handleItemPress(item: MenuItem) {
    setMenuVisible(false);
    // Laisse le temps au modal de se fermer avant l'action
    setTimeout(() => item.onPress(), 150);
  }

  return (
    <>
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={palette.heading} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <EllipsisVertical size={20} color={palette.heading} />
        </TouchableOpacity>
      </View>

      {/* ─── Menu déroulant ─── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.menu}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Options</Text>
              <TouchableOpacity
                style={styles.menuCloseBtn}
                onPress={() => setMenuVisible(false)}
              >
                <X size={18} color="#5A6E85" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 360 }}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                    activeOpacity={0.7}
                    onPress={() => handleItemPress(item)}
                  >
                    <View style={styles.menuItemIconWrap}>
                      <Icon size={18} color={palette.accent} />
                    </View>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    <ChevronRight size={18} color={palette.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}