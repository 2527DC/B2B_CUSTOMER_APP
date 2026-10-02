import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface OnboardingScaffoldProps {
  // Progress dots are omitted when step/totalSteps aren't given (e.g. the pending-approval
  // screen, which is a waiting state rather than a step in the wizard).
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

// Shared chrome for the post-OTP registration wizard screens (app/onboarding/*.tsx): a progress
// row and a "Logout" escape hatch (a customer who got stuck here — wrong phone, changed their
// mind — should never be trapped with no way out; logging out drops them back to app/login.tsx
// via the redirect effect in app/_layout.tsx).
export default function OnboardingScaffold({ step, totalSteps, title, subtitle, children }: OnboardingScaffoldProps) {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        {step && totalSteps ? (
          <View style={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View key={i} style={[styles.dot, i < step && styles.dotActive]} />
            ))}
          </View>
        ) : (
          <View />
        )}
        <TouchableOpacity onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    minHeight: 28,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
