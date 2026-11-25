import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth, getOnboardingTargetPath } from '@/context/AuthContext';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

export default function RootIndex() {
  const { isOnboarded, isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // 1. Not onboarded -> Welcome onboarding carousel
  if (!isOnboarded) {
    return <Redirect href="/welcome" />;
  }

  // 2. Not logged in -> Login screen
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // 3. Logged in -> check onboarding / approval steps
  const targetPath = getOnboardingTargetPath(user);
  if (targetPath) {
    return <Redirect href={targetPath as any} />;
  }

  // 4. Fully authenticated and onboarded -> Dashboard tabs
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
