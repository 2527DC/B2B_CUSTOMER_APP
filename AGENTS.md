# AI Agent Guidelines for B2B Customer App

## Architecture & Target Platforms
- **Framework**: Expo (React Native)
- **Target OS**: iOS and Android
- **Router**: Expo Router (file-based)
- **Backend API**: `https://dhatri-opal.vercel.app/api/v1/app`

---

## 🎨 Theme & Color Selection Enforcement Rule

### 1. Mandatory Theme Usage (Zero Hardcoded Hex Codes)
- **NEVER hardcode arbitrary colors** (e.g. `#2563eb`, `#eff6ff`, `#3b82f6`, `#f8fafc`, etc.) when creating or editing screens, modals, or components.
- All colors must be imported from the central theme system:
  - Static styles: `import { Colors } from '@/constants/theme';`
  - Dynamic styling: `import { useTheme } from '@/context/ThemeContext';`

### 2. Contextual & Relational Screen Analysis Rule
Before writing or updating UI code, **analyze the semantic purpose of the screen or section** to select the appropriate theme token:

- **Primary Actions & Brand Headers**: `Colors.primary` / `Colors.primaryDark`
- **Subtle Background Fills & Selected Chips**: `Colors.primary10` (10% tint) or `Colors.primary20` (20% tint)
- **Screen Canvas / Root Background**: `Colors.background` (`#f4f7f9`)
- **Cards, Modals & Surfaces**: `Colors.surface` (`#ffffff`)
- **Borders & Dividers**: `Colors.border` (`#e4e7e9`) / `Colors.borderLight` (`#f1f5f9`)
- **Typography Hierarchy**:
  - Headings & Titles: `Colors.text` (`#222222`)
  - Subtitles & Labels: `Colors.textSecondary` (`#64748b`)
  - Hints & Meta: `Colors.textMuted` (`#94a3b8`)
  - Button / Header Text: `Colors.textWhite` (`#ffffff`)
- **State Badges**: `Colors.success`, `Colors.warning`, `Colors.danger`, `Colors.info`

### 3. Central Updating Policy
- To change brand colors or update a palette, **modify `constants/theme.ts`** or use `ThemeContext` (`setThemeColor` / `setThemePreset`).
- Individual screens must not contain bespoke color variations.

---

## 📦 Strict Dependency Management Rule
When installing or upgrading packages:
1. **Always use `npx expo install <package>`**:
   Never run `npm install <package>` or `yarn add <package>` for packages that contain native code or React Native bindings (e.g., `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`, `expo-*`, etc.).
2. **Reason**: `npx expo install` resolves versions strictly against the installed Expo SDK version and React Native core version. Installing uncontrolled versions breaks iOS and Android native builds.
3. **Validation**: Run `npx expo-doctor` and `npx tsc --noEmit` after changing dependencies.

---

## ⏳ Zero Hanging Loading State Rule (Never Cause Loading Issues)
**STRICT MANDATE:** Never write code that can leave the UI stuck in an indefinite loading state.
1. **Always Guarantee Reset**: Ensure `setLoading(false)` always executes via a `finally` block or within both success and error handlers in all async calls and effects.
2. **Handle Missing Prerequisites**: When an effect requires prerequisite parameters (e.g. `warehouseId`, `customerId`) that are absent or empty upon readiness, immediately reset `loading` to `false` instead of hanging.
3. **Cancellation & Cleanup**: Use mounted state flags or `AbortController` to handle component unmounting gracefully and avoid state updates after unmount.
4. **Fallback & Error Feedback**: In case of network errors or server failures, render user-friendly error banners or empty states rather than hanging indefinitely on a spinner or skeleton.

