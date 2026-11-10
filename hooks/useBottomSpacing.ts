import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export interface BottomSpacing {
  /** Raw safe area insets from react-native-safe-area-context */
  insets: ReturnType<typeof useSafeAreaInsets>;
  /** Total calculated height of the floating tab bar */
  tabBarHeight: number;
  /** Safe padding to apply inside the tab bar at the bottom to clear system navigation bars */
  tabBottomInset: number;
  /** Bottom padding for scrollable lists (FlatList / ScrollView) to prevent content being covered by the tab bar */
  scrollPaddingBottom: number;
  /** Bottom padding for sticky action footers (e.g., checkout bar, cart bar, modal action sheets) */
  stickyFooterPaddingBottom: number;
}

/**
 * Hook providing dynamic, safe layout metrics across Android (3-button & gesture modes)
 * and iOS (Dynamic Island, Home Indicator, and older home button devices).
 */
export function useBottomSpacing(): BottomSpacing {
  const insets = useSafeAreaInsets();

  // Base height allocated for tab icons, labels, and top padding
  const BASE_TAB_CONTENT_HEIGHT = 60;

  // Safe bottom padding for the tab bar.
  // - Android 3-button nav: insets.bottom is ~48dp.
  // - Android gesture nav: insets.bottom is ~16-24dp.
  // - iOS with Home Indicator (FaceID / Dynamic Island): insets.bottom is ~34dp.
  // - Older devices without bottom insets (e.g., iPhone SE): fallback to 8-10dp.
  const tabBottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 8 : 10);

  // Total tab bar container height
  const tabBarHeight = BASE_TAB_CONTENT_HEIGHT + tabBottomInset;

  // Bottom padding for scrollable lists so the last card / item is completely visible above the tab bar
  const scrollPaddingBottom = tabBarHeight + 16;

  // Bottom padding for sticky action bars/footers (Cart, Checkout, etc.)
  const stickyFooterPaddingBottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16);

  return {
    insets,
    tabBarHeight,
    tabBottomInset,
    scrollPaddingBottom,
    stickyFooterPaddingBottom,
  };
}

export default useBottomSpacing;
