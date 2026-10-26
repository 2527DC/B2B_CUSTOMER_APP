import { router } from 'expo-router';

/**
 * Back to the previous screen. A screen opened from a link or a notification tap has no previous
 * screen, where router.back() fails with "GO_BACK was not handled by any navigator"; it then goes
 * to the app's start route instead, which sends the user home (or to login / onboarding).
 */
export function goBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
