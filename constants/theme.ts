/**
 * Official Dhatri Store Theme & Color System
 * Extracted directly from https://dhatri.store/
 *
 * RULE: All screens, sections, and components MUST pick colors from this theme
 * system after analyzing the semantic role (action, surface, border, text, tint).
 * Do NOT use arbitrary hardcoded hex codes.
 */

export interface ThemePalette {
  // Base & Primary Brand Colors
  primary: string;        // --base_color
  primaryDark: string;
  primaryLight: string;
  primary10: string;      // 10% opacity tint
  primary20: string;      // 20% opacity tint
  primary30: string;      // 30% opacity tint
  primary60: string;      // 60% opacity tint

  // Surface & Layout
  background: string;     // --background_color
  surface: string;
  navbar: string;         // --navbar_color
  menu: string;           // --menu_color
  border: string;         // --border_color
  borderLight: string;

  // Text
  text: string;           // --text_color
  textSecondary: string;
  textMuted: string;
  textWhite: string;

  // State Accents
  success: string;        // --success_color
  warning: string;        // --warning_color
  danger: string;         // --danger_color
  info: string;
}

export interface ComponentTheme {
  header: {
    background: string;
    text: string;
    icon: string;
  };
  button: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
  };
  card: {
    background: string;
    border: string;
    activeBorder: string;
    activeBackground: string;
  };
  input: {
    background: string;
    border: string;
    borderFocused: string;
    text: string;
    placeholder: string;
  };
  tabBar: {
    background: string;
    activeTint: string;
    inactiveTint: string;
  };
  badge: {
    successBg: string;
    successText: string;
    warningBg: string;
    warningText: string;
    dangerBg: string;
    dangerText: string;
    primaryBg: string;
    primaryText: string;
  };
}

/**
 * Adjust hex color lightness (positive percent = lighter, negative percent = darker)
 */
function adjustColor(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return hex;
  const num = parseInt(cleanHex, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

/**
 * Helper to dynamically create a full ThemePalette from any primary base color.
 * Enables live theme updates and palette switching without breaking app styling.
 */
export function createTheme(
  primaryColor: string,
  overrides?: Partial<ThemePalette>
): ThemePalette {
  const primaryClean = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`;

  return {
    primary: primaryClean,
    primaryDark: adjustColor(primaryClean, -20),
    primaryLight: adjustColor(primaryClean, 20),
    primary10: `${primaryClean}1a`,
    primary20: `${primaryClean}33`,
    primary30: `${primaryClean}4d`,
    primary60: `${primaryClean}99`,

    background: '#f4f7f9',
    surface: '#ffffff',
    navbar: '#f4f7f9',
    menu: '#f4f7f9',
    border: '#e4e7e9',
    borderLight: '#f1f5f9',

    text: '#222222',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    textWhite: '#ffffff',

    success: '#4bcf90',
    warning: '#e09079',
    danger: '#ff6d68',
    info: '#3b82f6',
    ...overrides,
  };
}

/**
 * Derives component-specific semantic styling tokens from a theme palette.
 */
export function getComponentTheme(theme: ThemePalette): ComponentTheme {
  return {
    header: {
      background: theme.primary,
      text: theme.textWhite,
      icon: theme.textWhite,
    },
    button: {
      primaryBg: theme.primary,
      primaryText: theme.textWhite,
      secondaryBg: theme.primary10,
      secondaryText: theme.primary,
    },
    card: {
      background: theme.surface,
      border: theme.border,
      activeBorder: theme.primary,
      activeBackground: theme.primary10,
    },
    input: {
      background: '#f8fafc',
      border: theme.border,
      borderFocused: theme.primary,
      text: theme.text,
      placeholder: theme.textMuted,
    },
    tabBar: {
      background: theme.surface,
      activeTint: theme.primary,
      inactiveTint: theme.textMuted,
    },
    badge: {
      successBg: '#d1fae5',
      successText: '#065f46',
      warningBg: '#fef3c7',
      warningText: '#b45309',
      dangerBg: '#fee2e2',
      dangerText: '#b91c1c',
      primaryBg: theme.primary10,
      primaryText: theme.primary,
    },
  };
}

/**
 * Preset themes for theme/color selection
 */
export const ThemePresets: Record<string, { name: string; primary: string }> = {
  dhatri: {
    name: 'Dhatri Mart (Default)',
    primary: '#4f7942', // Official Dhatri Store green
  },
  emerald: {
    name: 'Emerald Garden',
    primary: '#059669',
  },
  forest: {
    name: 'Deep Forest',
    primary: '#2d6a4f',
  },
  corporate: {
    name: 'Corporate Slate',
    primary: '#0f766e',
  },
  harvest: {
    name: 'Warm Harvest',
    primary: '#b45309',
  },
};

/**
 * Default Active Colors instance (Official Dhatri Store: #4f7942)
 * Maintains backwards compatibility for direct imports throughout the app.
 */
export const Colors: ThemePalette = createTheme(ThemePresets.dhatri.primary);

export default Colors;
