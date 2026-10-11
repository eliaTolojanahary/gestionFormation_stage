// components/support-visual.ts
// Icône + couleurs d'un support selon la nature réelle du fichier
// (extension de `fichier` : pdf, mp4, png, docx, ...).
import React from 'react';
import { FileText, Image, File, Play, Music, AlignLeft } from 'lucide-react-native';
import { getFileKind } from '../utils/format';

export type VisuelSupport = {
  Icone: React.ComponentType<{ size?: number; color?: string }>;
  fond: string;
  couleur: string;
};

// Ex. getSupportVisual('supports/cours.pdf') -> icône FileText sur fond rouge clair
// Support sans fichier (texte seul) : icône de texte
export function getSupportVisual(fichier?: string | null): VisuelSupport {
  if (!fichier) return { Icone: AlignLeft, fond: '#E4F0F9', couleur: '#0A3B66' };
  switch (getFileKind(fichier)) {
    case 'pdf':
      return { Icone: FileText, fond: '#FDECEC', couleur: '#E53935' };
    case 'video':
      return { Icone: Play, fond: '#F3E5F5', couleur: '#7B1FA2' };
    case 'image':
      return { Icone: Image, fond: '#E3F2FD', couleur: '#1976D2' };
    case 'doc':
      return { Icone: File, fond: '#E8F5E9', couleur: '#2E7D32' };
    case 'audio':
      return { Icone: Music, fond: '#FFF3E0', couleur: '#EF6C00' };
    default:
      return { Icone: File, fond: '#F1F5F9', couleur: '#5A6E85' };
  }
}
