import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Clock3, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import OnboardingScaffold from '@/components/OnboardingScaffold';

// Shown once a customer has submitted their shop documents and is waiting on an admin to approve
// them (approval_status === 'PENDING'). Pull-to-refresh (or the button) re-fetches the profile;
// once an admin approves, app/_layout.tsx's redirect effect takes them straight to the home tabs.
export default function PendingApprovalScreen() {
  const { refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <OnboardingScaffold title="Almost There!" subtitle="Your registration is under review.">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.iconWrap}>
          <Clock3 size={40} color={Colors.warning} />
        </View>
        <Text style={styles.heading}>Pending Approval</Text>
        <Text style={styles.body}>
          We've received your shop details and documents. An admin will review them shortly, usually within a few
          hours. You'll be able to start ordering as soon as your account is approved.
        </Text>

        <TouchableOpacity onPress={handleRefresh} disabled={refreshing} activeOpacity={0.8} style={styles.refreshButton}>
          {refreshing ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <RefreshCw size={16} color={Colors.primary} />
              <Text style={styles.refreshText}>Check Status</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: { fontSize: 20, fontWeight: '800', color: Colors.text },
  body: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  refreshText: { fontSize: 14, fontWeight: '700', color: Colors.primary },
});
