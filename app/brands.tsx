import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { goBack } from '@/lib/navigation';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import type { Brand } from '@/types/catalog';
import { Colors } from '@/constants/theme';

const assetUrl = (path?: string): string => URLs.assetUrl(path);

interface ApiBrandItem {
  id: number | string;
  name: string;
  logo?: string;
  logoUrl?: string;
  product_count?: number;
}

export default function AllBrandsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBrands = async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);

    try {
      console.log(`[AllBrandsScreen] Fetching brands from: ${URLs.ALL_BRAND}`);
      const response = await apiClient.get(URLs.ALL_BRAND);
      const rawData = response.data;
      const rawList: ApiBrandItem[] = Array.isArray(rawData)
        ? rawData
        : (rawData?.data || []);

      const counts: Record<string, number> = {};
      const mapped: Brand[] = rawList.map((item) => {
        const idStr = item.id.toString();
        if (typeof item.product_count === 'number') {
          counts[idStr] = item.product_count;
        }
        return {
          id: idStr,
          name: item.name,
          logo_url: assetUrl(item.logo || item.logoUrl || ''),
          created_at: '',
        };
      });

      setBrandCounts(counts);
      setBrands(mapped);
    } catch (err: any) {
      console.warn('[AllBrandsScreen] Error fetching all brands:', err?.message || err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const onRefresh = useCallback(() => {
    fetchBrands(true);
  }, []);

  const filteredBrands = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, searchQuery]);

  const handleBrandPress = (brand: Brand) => {
    router.push({
      pathname: '/brand/[id]',
      params: { id: brand.id, name: brand.name },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0f172a" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>All Brands</Text>
          <View style={styles.partnerBadgeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.headerSubtitle}>
              {loading ? 'Loading...' : `${brands.length} partner brands`}
            </Text>
          </View>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Modern Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.primary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search 70+ wholesale brands..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
              style={styles.clearSearchBtn}
            >
              <X size={15} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading brands directory...</Text>
        </View>
      ) : filteredBrands.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Tag size={36} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Brands Found</Text>
          <Text style={styles.emptySubtitle}>
            No brands matched "{searchQuery}". Try searching for another brand or product name.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBrands}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 16, 28) },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => {
            const count = brandCounts[item.id];
            return (
              <TouchableOpacity
                style={styles.brandItem}
                onPress={() => handleBrandPress(item)}
                activeOpacity={0.88}
              >
                {/* Standalone Elevated Image Showcase Box */}
                <View style={styles.brandImageTile}>
                  {item.logo_url && item.logo_url.trim() !== '' ? (
                    <Image
                      source={{ uri: item.logo_url }}
                      style={styles.brandLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.initialFallback}>
                      <Text style={styles.initialLetter}>
                        {item.name ? item.name.substring(0, 2).toUpperCase() : 'BR'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Brand Name cleanly positioned below the tile */}
                <View style={styles.brandMeta}>
                  <Text style={styles.brandName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {typeof count === 'number' && count > 0 && (
                    <Text style={styles.productCount}>
                      {count} {count === 1 ? 'product' : 'products'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  partnerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
    height: '100%',
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandItem: {
    flex: 0.48,
    alignItems: 'center',
  },
  brandImageTile: {
    width: '100%',
    height: 170,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    paddingVertical: 1,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 17,
  },
  initialFallback: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
  },
  initialLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  brandMeta: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    lineHeight: 18,
  },
  productCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 3,
  },
});
