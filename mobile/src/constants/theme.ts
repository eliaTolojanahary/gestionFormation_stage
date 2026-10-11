/**
 * constants/theme.ts
 *
 * Équivalent mobile du CSS d'origine du web (web/src/index.css).
 * Les variables CSS deviennent des tokens TypeScript :
 *   --page-bg → palette.pageBg      --surface → palette.surface
 *   --text-main → palette.textMain  --text-muted → palette.textMuted
 *   --heading → palette.heading     --line → palette.line
 *   --accent → palette.accent       --accent-soft → palette.accentSoft
 *   --fs-* → fonts.xs/sm/md/lg/xl   --density-* → density.gap / density.pad
 *
 * Tous les styles (pages ET composants) consomment ces tokens via
 * `useThemedStyles(...)` : l'onglet Apparence de Paramètres
 * s'applique donc immédiatement à toute l'application.
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type ThemeName = 'light' | 'dark';
export type FontSizeName = 'petite' | 'normale' | 'grande';
export type DensityName = 'compacte' | 'confortable';

// Alias historiques utilisés par l'onglet Apparence de Paramètres
export type Theme = ThemeName;
export type FontSize = FontSizeName;
export type Density = DensityName;

// ─────────────────────────────────────────────
// Préférences persistées (AsyncStorage)
// ─────────────────────────────────────────────
export interface Settings {
  theme: ThemeName;
  /** Couleur principale (--accent) */
  color: string;
  fontSize: FontSizeName;
  density: DensityName
}

export const COULEURS = [
  { name: 'Bleu IMTECH', value: '#063a5c' },
  { name: 'Bleu azur', value: '#137c8b' },
  { name: 'Vert formation', value: '#2d8066' },
  { name: 'Bordeaux', value: '#8e3b54' },
  { name: 'Jaune', value: '#e2a019' },
  { name: 'Gris', value: '#546e7a' },
  { name: 'Rouge', value: '#d32f2f' },
];

export const CLE_SETTINGS = '@settings';

export const SETTINGS_DEFAUT: Settings = {
  theme: 'light',
  color: '#063a5c',
  fontSize: 'normale',
  density: 'confortable'
};

// ─────────────────────────────────────────────
// Palette (= variables CSS)
// ─────────────────────────────────────────────
export interface Palette {
  name: ThemeName;
  /** Fond de page | --page-bg */
  pageBg: string;
  /** Fond des cartes | --surface */
  surface: string;
  /** Fonds secondaires : champs, puces */
  surfaceAlt: string;
  /** Texte courant | --text-main */
  textMain: string;
  /** Texte secondaire | --text-muted */
  textMuted: string;
  /** Titres | --heading */
  heading: string;
  /** Bordures | --line */
  line: string;
  /** Couleur principale choisie | --accent */
  accent: string;
  /** Fond teinté | --accent-soft */
  accentSoft: string;
  /** Texte sur fond accent */
  onAccent: string;
  /** Voile des modales */
  overlay: string;

  // Sémantiques (identiques dans les deux thèmes)
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  infoSoft: string;
}

/** Vue claire : reprend la charte actuelle de l'app mobile */
const CLAIR = {
  name: 'light' as ThemeName,
  pageBg: '#FAFCFE',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  textMain: '#0A2D4F',
  textMuted: '#8898AA',
  heading: '#0A2D4F',
  line: '#E8EEF5',
  onAccent: '#FFFFFF',
  overlay: 'rgba(10, 45, 79, 0.5)',
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  success: '#2E7D32',
  successSoft: '#E8F5E9',
  warning: '#EF6C00',
  warningSoft: '#FFF3E0',
  infoSoft: '#E4F0F9',
};

/** Vue sombre : mêmes clés que CLAIR (équivalent du thème sombre du web) */
const SOMBRE = {
  name: 'dark' as ThemeName,
  pageBg: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#273449',
  textMain: '#E2E8F0',
  textMuted: '#94A3B8',
  heading: '#F8FAFC',
  line: '#334155',
  onAccent: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.65)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.15)',
  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.15)',
  warning: '#FBBF24',
  warningSoft: 'rgba(251, 191, 36, 0.15)',
  infoSoft: 'rgba(148, 163, 184, 0.15)',
};
// ─────────────────────────────────────────────
// Taille de police (= --fs-*)
// ─────────────────────────────────────────────
export interface FontScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

export const FONT_SCALES: Record<FontSizeName, FontScale> = {
  petite: { xs: 10, sm: 11, md: 12, lg: 13.5, xl: 19 },
  normale: { xs: 11, sm: 12, md: 13.5, lg: 15.5, xl: 22 },
  grande: { xs: 12, sm: 13.5, md: 15, lg: 17.5, xl: 25 },
};

// ─────────────────────────────────────────────
// Densité de l'interface (= --density-gap / --density-pad)
// ─────────────────────────────────────────────
export interface DensityScale {
  gap: number;
  pad: number;
}

export const DENSITY_SCALES: Record<DensityName, DensityScale> = {
  compacte: { gap: 8, pad: 8 },
  confortable: { gap: 14, pad: 12 },
};

// ─────────────────────────────────────────────
// Construit la palette finale : thème + couleur principale choisie
// ─────────────────────────────────────────────
export function buildPalette(
  theme: ThemeName = 'light',
  accent?: string
): Palette {
  const base = theme === 'dark' ? SOMBRE : CLAIR;
  const couleur = accent || (theme === 'dark' ? '#38BDF8' : '#063A5C');

  return {
    ...base,
    accent: couleur,
    accentSoft: hexToRgba(couleur, theme === 'dark' ? 0.18 : 0.1),
  };
}

// ─────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────

/** '#RRGGBB' → 'rgba(r, g, b, alpha)' */
export function hexToRgba(hex: string, alpha = 1): string {
  const propre = (hex || '').replace('#', '');
  const complet =
    propre.length === 3
      ? propre.split('').map((c) => c + c).join('')
      : propre;

  if (complet.length !== 6) return `rgba(6, 58, 92, ${alpha})`;

  const r = parseInt(complet.slice(0, 2), 16);
  const g = parseInt(complet.slice(2, 4), 16);
  const b = parseInt(complet.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Couleur de texte lisible (blanc ou bleu foncé) sur un fond accentué */
export function readableOn(hex: string): string {
  const propre = (hex || '').replace('#', '');
  if (propre.length < 6) return '#FFFFFF';

  const r = parseInt(propre.slice(0, 2), 16);
  const g = parseInt(propre.slice(2, 4), 16);
  const b = parseInt(propre.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.6 ? '#0A2D4F' : '#FFFFFF';
}