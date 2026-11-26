import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, Check } from 'lucide-react-native';
import { useAuth, WarehouseOption } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import OnboardingScaffold from '@/components/OnboardingScaffold';

// Step 1 of the post-OTP registration wizard: search + select the warehouse that will fulfil
// this customer's orders. Selecting one submits and advances to Step 2 (details).
export default function WarehouseSelectionScreen() {
  const router = useRouter();
  const { user, fetchWarehouses, submitOnboardingStep, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWarehouses = useCallback(
    async (term: string) => {
      setLoadingList(true);
      try {
        const results = await fetchWarehouses(term);
        setWarehouses(results);
      } finally {
        setLoadingList(false);
      }
    },
    [fetchWarehouses]
  );

  // Initial unfiltered load
  useEffect(() => {
    loadWarehouses('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => loadWarehouses(search), 300);
    return () => clearTimeout(timer);
  }, [search, loadWarehouses]);

  const handleSelect = async (warehouse: WarehouseOption) => {
    setError(null);
    setSelectingId(warehouse.id);
    try {
      await submitOnboardingStep({ step: 'warehouse', warehouseId: warehouse.id });
      router.replace('/onboarding/details');
    } catch (err: any) {
      setError(err.message || 'Failed to select warehouse. Please try again.');
      setSelectingId(null);
    }
  };

  const handleBackToLogin = () => {
    Alert.alert(
      'Exit Registration?',
      'Do you want to go back and sign in with a different phone number?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout & Return', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <OnboardingScaffold
      step={1}
      totalSteps={user?.requires_documents ? 3 : 2}
      title="Select Your Warehouse"
      subtitle="Search by area, city or pincode to find the warehouse that will fulfil your orders."
      onBack={handleBackToLogin}
    >
      <View style={styles.searchBox}>
        <Search size={18} color={Colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, city or pincode"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loadingList ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          style={styles.list}
          data={warehouses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>No warehouses found. Try a different search.</Text>}
          renderItem={({ item }) => {
            const isSelecting = selectingId === item.id;
            const isSelected = item.id === user?.warehouse_id;
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                disabled={selectingId !== null}
                activeOpacity={0.7}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isSelecting && styles.cardSelecting,
                ]}
              >
                <View style={[styles.cardIcon, isSelected && styles.cardIconSelected]}>
                  <MapPin size={18} color={isSelected ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.cardTextWrap}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>{item.name}</Text>
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {[item.address, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                  </Text>
                </View>
                {isSelecting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Check size={18} color={isSelected ? Colors.primary : Colors.border} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {user?.warehouse_id && (
        <TouchableOpacity
          onPress={() => router.replace('/onboarding/details')}
          activeOpacity={0.85}
          style={styles.continueExistingButton}
        >
          <Text style={styles.continueExistingText}>Continue with Selected Warehouse →</Text>
        </TouchableOpacity>
      )}
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 14,
    marginTop: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  cardSelecting: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary10,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F7F1',
    borderWidth: 1.5,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconSelected: {
    backgroundColor: Colors.primary10,
  },
  cardTextWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  cardTitleSelected: {
    color: Colors.primary,
  },
  selectedBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 10,
  },
  continueExistingButton: {
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueExistingText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textWhite,
  },
});
