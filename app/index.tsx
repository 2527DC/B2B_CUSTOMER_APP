import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
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
  const status = user?.onboarding_status ?? 'COMPLETED';
  const approval = user?.approval_status ?? 'NOT_REQUIRED';

  if (status === 'PHONE_VERIFIED' && !user?.warehouse_id) {
    return <Redirect href="/onboarding/warehouse" />;
  }
  if (status === 'WAREHOUSE_SELECTED' && (!user?.name || user.name.startsWith('Customer '))) {
    return <Redirect href="/onboarding/details" />;
  }
  if (status === 'DETAILS_COMPLETED' && user?.requires_documents) {
    return <Redirect href="/onboarding/documents" />;
  }
  if (approval === 'REJECTED') {
    return <Redirect href="/onboarding/documents" />;
  }
  if (approval === 'PENDING') {
    return <Redirect href="/onboarding/pending-approval" />;
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
