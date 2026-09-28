import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ThemePalette,
  ComponentTheme,
  createTheme,
  getComponentTheme,
  ThemePresets,
  Colors as DefaultColors,
} from '@/constants/theme';

interface ThemeContextType {
  theme: ThemePalette;
  components: ComponentTheme;
  primaryColor: string;
  activePresetKey: string;
  availablePresets: typeof ThemePresets;
  setThemeColor: (hex: string) => Promise<void>;
  setThemePreset: (presetKey: string) => Promise<void>;
  resetTheme: () => Promise<void>;
}

const STORAGE_PRIMARY_KEY = '@app_theme_primary';
const STORAGE_PRESET_KEY = '@app_theme_preset';

const ThemeContext = createContext<ThemeContextType>({
  theme: DefaultColors,
  components: getComponentTheme(DefaultColors),
  primaryColor: DefaultColors.primary,
  activePresetKey: 'dhatri',
  availablePresets: ThemePresets,
  setThemeColor: async () => {},
  setThemePreset: async () => {},
  resetTheme: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState<string>(DefaultColors.primary);
  const [activePresetKey, setActivePresetKey] = useState<string>('dhatri');

  // Load saved theme preferences on startup
  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const [savedPreset, savedPrimary] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PRESET_KEY),
          AsyncStorage.getItem(STORAGE_PRIMARY_KEY),
        ]);

        if (savedPreset && ThemePresets[savedPreset]) {
          setActivePresetKey(savedPreset);
          setPrimaryColor(ThemePresets[savedPreset].primary);
        } else if (savedPrimary) {
          setPrimaryColor(savedPrimary);
          setActivePresetKey('custom');
        }
      } catch (err) {
        console.warn('Failed to load saved theme preferences:', err);
      }
    }

    loadSavedTheme();
  }, []);

  // Compute theme palette dynamically
  const theme = useMemo(() => createTheme(primaryColor), [primaryColor]);
  const components = useMemo(() => getComponentTheme(theme), [theme]);

  // Update theme with custom color
  const setThemeColor = async (hex: string) => {
    try {
      const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
      setPrimaryColor(cleanHex);
      setActivePresetKey('custom');
      await AsyncStorage.setItem(STORAGE_PRIMARY_KEY, cleanHex);
      await AsyncStorage.removeItem(STORAGE_PRESET_KEY);
    } catch (err) {
      console.error('Failed to save custom theme color:', err);
    }
  };

  // Switch to a preset theme
  const setThemePreset = async (presetKey: string) => {
    const preset = ThemePresets[presetKey];
    if (!preset) return;
    try {
      setActivePresetKey(presetKey);
      setPrimaryColor(preset.primary);
      await AsyncStorage.setItem(STORAGE_PRESET_KEY, presetKey);
      await AsyncStorage.setItem(STORAGE_PRIMARY_KEY, preset.primary);
    } catch (err) {
      console.error('Failed to save theme preset:', err);
    }
  };

  // Reset to default Dhatri Store theme (#4f7942)
  const resetTheme = async () => {
    try {
      const defaultPrimary = ThemePresets.dhatri.primary;
      setActivePresetKey('dhatri');
      setPrimaryColor(defaultPrimary);
      await AsyncStorage.removeItem(STORAGE_PRESET_KEY);
      await AsyncStorage.removeItem(STORAGE_PRIMARY_KEY);
    } catch (err) {
      console.error('Failed to reset theme:', err);
    }
  };

  const value = useMemo(
    () => ({
      theme,
      components,
      primaryColor,
      activePresetKey,
      availablePresets: ThemePresets,
      setThemeColor,
      setThemePreset,
      resetTheme,
    }),
    [theme, components, primaryColor, activePresetKey]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default useTheme;
