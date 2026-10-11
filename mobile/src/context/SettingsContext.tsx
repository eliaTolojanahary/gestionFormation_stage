/**
 * context/SettingsContext.tsx
 *
 * Source unique des préférences d'apparence (équivalent mobile du
 * `document.documentElement.dataset.*` + variables CSS du web).
 *
 * - charge les préférences depuis AsyncStorage au démarrage
 * - les met à jour immédiatement (et les persiste)
 * - expose la palette / l'échelle de polices / la densité calculées
 * - `useThemedStyles(factory)` recrée les styles à chaque changement
 */
import React, {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildPalette, CLE_SETTINGS, DENSITY_SCALES, FONT_SCALES, SETTINGS_DEFAUT,
  type DensityScale, type FontScale, type Palette, type Settings,
} from '@/constants/theme';

export interface ThemeTokens {
  palette: Palette;
  fonts: FontScale;
  density: DensityScale;
}

export interface SettingsContextValue {
  settings: Settings;
  /** Palette résolue (thème + couleur principale) */
  palette: Palette;
  /** Échelle de polices (--fs-*) */
  fonts: FontScale;
  /** Densité (--density-*) */
  density: DensityScale;
  isLoading: boolean;
  saved: boolean;
  changeSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => Promise<void>;
  setLogo: (base64: string) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(SETTINGS_DEFAUT);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Chargement initial ─────────────────────
  useEffect(() => {
    let annule = false;

    (async () => {
      try {
        const brut = await AsyncStorage.getItem(CLE_SETTINGS);
        if (brut && !annule) {
          const lu = JSON.parse(brut);
          setSettings({ ...SETTINGS_DEFAUT, ...lu });
        }
      } catch {
        // préférences par défaut
      } finally {
        if (!annule) setIsLoading(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, []);

  // ─── Mise à jour + persistance ─────────────
  const changeSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      const suivant = { ...settings, [key]: value };
      setSettings(suivant);

      try {
        await AsyncStorage.setItem(CLE_SETTINGS, JSON.stringify(suivant));
        setSaved(true);

        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaved(false), 1800);
      } catch {
        // la préférence reste active pour la session en cours
      }
    },
    [settings]
  );

  const setLogo = useCallback(
    async (base64: string) => {
      const suivant = { ...settings, logo: base64 };
      setSettings(suivant);
      try {
        await AsyncStorage.setItem(CLE_SETTINGS, JSON.stringify(suivant));
      } catch {
        // silencieux
      }
    },
    [settings]
  );

  const resetSettings = useCallback(async () => {
    setSettings(SETTINGS_DEFAUT);
    try {
      await AsyncStorage.setItem(CLE_SETTINGS, JSON.stringify(SETTINGS_DEFAUT));
    } catch {
      // silencieux
    }
  }, []);

  // ─── Tokens dérivés ────────────────────────
  const palette = useMemo(
    () => buildPalette(settings.theme, settings.color),
    [settings.theme, settings.color]
  );
  const fonts = useMemo(
    () => FONT_SCALES[settings.fontSize] || FONT_SCALES.normale,
    [settings.fontSize]
  );
  const density = useMemo(
    () => DENSITY_SCALES[settings.density] || DENSITY_SCALES.confortable,
    [settings.density]
  );

  const valeur = useMemo<SettingsContextValue>(
    () => ({
      settings, palette, fonts, density, isLoading, saved,
      changeSetting, setLogo, resetSettings,
    }),
    [settings, palette, fonts, density, isLoading, saved,
     changeSetting, setLogo, resetSettings]
  );

  return (
    <SettingsContext.Provider value={valeur}>
      {children}
    </SettingsContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────

/** Accès aux préférences + tokens. Doit être utilisé sous <SettingsProvider>. */
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings doit être utilisé dans <SettingsProvider>.');
  }
  return ctx;
}

/**
 * Crée (et recrée) un StyleSheet à partir des tokens d'apparence.
 *
 *   export const createStyles = (t: Tokens) => StyleSheet.create({ ... });
 *   const styles = useThemedStyles(createStyles);
 */
export function useThemedStyles<T>(factory: (t: ThemeTokens) => T): T {
  const { palette, fonts, density } = useSettings();

  return useMemo(
    () => factory({ palette, fonts, density }),
    [factory, palette, fonts, density]
  );
}