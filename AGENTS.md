# AI Agent Guidelines for B2B Customer App

## Architecture & Target Platforms
- **Framework**: Expo (React Native)
- **Target OS**: iOS and Android
- **Router**: Expo Router (file-based)
- **Backend API**: `https://dhatri-opal.vercel.app/api/v1/app`

## Strict Dependency Management Rule
When installing or upgrading packages:
1. **Always use `npx expo install <package>`**:
   Never run `npm install <package>` or `yarn add <package>` for packages that contain native code or React Native bindings (e.g., `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`, `expo-*`, etc.).
2. **Reason**: `npx expo install` resolves versions strictly against the installed Expo SDK version and React Native core version. Installing uncontrolled versions breaks iOS and Android native builds.
3. **Validation**: Run `npx expo-doctor` and `npx tsc --noEmit` after changing dependencies.
