// components/image-lightbox.tsx
import React from 'react';
import {
  Modal, View, Image, TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

// Affiche une image en plein écran ; toucher le fond ou la croix ferme l'aperçu
export function ImageLightbox({ src, alt = 'Aperçu image', onClose }: Props) {
  if (!src) return null;

  return (
    <Modal
      visible={!!src}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          {/* Bouton fermer */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <X size={18} color="#0A2D4F" />
          </TouchableOpacity>

          {/* Image — stopPropagation pour ne pas fermer en cliquant dessus */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: src }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={alt}
            />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    position: 'relative',
    maxWidth: '95%',
    maxHeight: '90%',
  },
  closeBtn: {
    position: 'absolute',
    top: -14,
    right: -14,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  image: {
    width: 320,
    height: 320,
    maxWidth: '100%',
    maxHeight: '85%',
    borderRadius: 12,
  },
});