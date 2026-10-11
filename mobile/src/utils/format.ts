import { API_CONFIG } from '@/constants/api';
import { getTokenEnMemoire } from '@/utils/api';

// Fonctions de formatage (dates, montants, fichiers, initiales) utilisées par les écrans.

// Date d'ajout d'un support : "Aujourd'hui", "Il y a 3 j", puis date courte
export function formatAjout(dateStr?: string): string {
  if (!dateStr) return "Aujourd'hui";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Aujourd'hui";

  const jours = Math.floor((Date.now() - date.getTime()) / 86400000);

  if (jours <= 0) return "Aujourd'hui";
  if (jours < 7) return `Il y a ${jours} j`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Ex. "08 octobre 2026"
export function formatDateFr(dateStr?: string): string {
  if (!dateStr) return '—';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Extension en minuscules, sans les paramètres d'URL (?token=...) ; '' si aucune
export function getFileExtension(fichier?: string): string {
  if (!fichier) return '';

  const propre = fichier.split('?')[0].split('#')[0];
  const parts = propre.split('.');
  if (parts.length < 2) return '';

  return (parts.pop() || '').toLowerCase();
}

// Extension → libellé affiché dans le badge du support
export function getFileTypeLabel(fichier?: string): string {
  const ext = getFileExtension(fichier);
  if (!ext) return 'FICHIER';

  if (ext === 'pdf') return 'PDF';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'VIDÉO';
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) return 'DOC';
  if (['ppt', 'pptx', 'odp'].includes(ext)) return 'PPT';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'XLS';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'IMAGE';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext)) return 'AUDIO';

  return ext.toUpperCase();
}

// Famille de fichier utilisée pour choisir l'icône / les couleurs
export type FileKind = 'pdf' | 'video' | 'audio' | 'image' | 'doc' | 'autre';

export function getFileKind(fichier?: string): FileKind {
  const label = getFileTypeLabel(fichier);

  if (label === 'PDF') return 'pdf';
  if (label === 'VIDÉO') return 'video';
  if (label === 'AUDIO') return 'audio';
  if (label === 'IMAGE') return 'image';
  if (label === 'DOC' || label === 'PPT' || label === 'XLS') return 'doc';

  return 'autre';
}

// URL complète d'un fichier (photo, support...) à partir de son chemin en base
export function getFileUrl(path?: string | null): string | null {
  if (!path) return null;

  // ─── URL déjà absolue ou spéciale : on la renvoie telle quelle
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||      // ⬅️ web (React Native Web / ImagePicker)
    path.startsWith('data:') ||      // ⬅️ base64
    path.startsWith('file:') ||      // ⬅️ natif (iOS/Android) — file:///...
    path.startsWith('content:')      // ⬅️ Android content://
  ) {
    return path;
  }

  // ─── Chemin relatif → préfixer avec la base de l'API.
  // Les fichiers sont protégés côté serveur : une <Image> ou une WebView ne peut pas
  // envoyer l'en-tête Authorization, le token est donc passé dans l'URL.
  const base = (API_CONFIG.BASE_URL || '').replace(/\/$/, '');
  const url = `${base}/${path.replace(/^\//, '')}`;
  const token = getTokenEnMemoire();
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

// Ex. 150000 -> "150 000 MGA" (espace tous les 3 chiffres, arrondi à l'unité)
export function formatMontant(montant: number, devise = 'MGA'): string {
  const n = Math.round(Number(montant) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n} ${devise}`;
}

// Ex. "08/10/2026"
export function formatDateCourte(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const jj = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${jj}/${mm}/${d.getFullYear()}`;
}

// Date -> nombre de millisecondes (0 si invalide), pratique pour trier
export function timestamp(dateStr?: string): number {
  const t = dateStr ? new Date(dateStr).getTime() : NaN;
  return isNaN(t) ? 0 : t;
}

// Initiales pour l'avatar (ex. "JR"), "ET" par défaut
export function getInitiales(prenom?: string, nom?: string) {
  const p = (prenom || '').trim();
  const n = (nom || '').trim();
  return `${p[0] || ''}${n[0] || ''}`.toUpperCase() || 'ET';
}

// "À l'instant", "Il y a 5 min", "Il y a 2 h", "Il y a 3 j", puis date courte
export function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return "Aujourd'hui";
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const heures = Math.floor(mins / 60);
  const jours = Math.floor(heures / 24);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  if (heures < 24) return `Il y a ${heures} h`;
  if (jours < 7) return `Il y a ${jours} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// utils/time.ts

// ─────────────────────────────────────────────
// Dates
// ─────────────────────────────────────────────

/** Date + heure au format français — ex. « 20 oct. 2025, 14:32 » */
export function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

/** Système d'exploitation déduit du user-agent — ex. « Android » */
export function shortOS(userAgent?: string | null): string {
  if (!userAgent) return '';

  const ua = userAgent.toLowerCase();

  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'iOS';
  }
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os') || ua.includes('macintosh')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';

  return '';
}

/** Navigateur / client déduit du user-agent — ex. « Chrome » */
export function shortUserAgent(userAgent?: string | null): string {
  if (!userAgent) return 'Appareil inconnu';

  const ua = userAgent.toLowerCase();

  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('chrome') || ua.includes('chromium')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('okhttp') || ua.includes('expo') || ua.includes('reactnative')) {
    return 'App mobile';
  }

  return 'Navigateur';
}
