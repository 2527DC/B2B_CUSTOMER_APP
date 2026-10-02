import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Search, MapPin, Check } from 'lucide-react-native';
import { useAuth, WarehouseOption } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import OnboardingScaffold from '@/components/OnboardingScaffold';

// Step 1 of the post-OTP registration wizard: search + select the warehouse that will fulfil
// this customer's orders. Selecting one submits immediately; app/_layout.tsx advances to the
// next step (details) once AuthContext's user state updates — no manual navigation here.
export default function WarehouseSelectionScreen() {
  const { user, fetchWarehouses, submitOnboardingStep } = useAuth();
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
    } catch (err: any) {
      setError(err.message || 'Failed to select warehouse. Please try again.');
      setSelectingId(null);
    }
  };

  return (
    <OnboardingScaffold
      step={1}
      totalSteps={user?.requires_documents ? 3 : 2}
      title="Select Your Warehouse"
      subtitle="Search by area, city or pincode to find the warehouse that will fulfil your orders."
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
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                disabled={selectingId !== null}
                activeOpacity={0.7}
                style={[styles.card, isSelecting && styles.cardSelecting]}
              >
                <View style={styles.cardIcon}>
                  <MapPin size={18} color={Colors.primary} />
                </View>
                <View style={styles.cardTextWrap}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {[item.address, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                  </Text>
                </View>
                {isSelecting ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Check size={18} color={Colors.border} />
                )}
              </TouchableOpacity>
            );
          }}
        />
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
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
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
});
