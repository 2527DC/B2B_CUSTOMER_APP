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
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Brand } from '@/lib/supabase';
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
      console.error('[AllBrandsScreen] Error fetching all brands:', err);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>All Brands</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading...' : `${brands.length} partner brands`}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search brands by name..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading brands...</Text>
        </View>
      ) : filteredBrands.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Tag size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No Brands Found</Text>
          <Text style={styles.emptySubtitle}>
            No brands matched "{searchQuery}". Try a different keyword.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBrands}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
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
                style={styles.brandCard}
                onPress={() => handleBrandPress(item)}
                activeOpacity={0.75}
              >
                {/* Logo or Initial fallback */}
                <View style={styles.logoWrap}>
                  {item.logo_url && item.logo_url.trim() !== '' ? (
                    <Image
                      source={{ uri: item.logo_url }}
                      style={styles.brandLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.initialFallback}>
                      <Text style={styles.initialLetter}>
                        {item.name ? item.name.substring(0, 2).toUpperCase() : 'B'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Brand Name */}
                <Text style={styles.brandCardName} numberOfLines={2}>
                  {item.name}
                </Text>

                {/* Product Count if available */}
                {typeof count === 'number' && count > 0 && (
                  <View style={styles.countPill}>
                    <Text style={styles.countPillText}>{count} items</Text>
                  </View>
                )}
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 6,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    height: '100%',
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brandCard: {
    flex: 0.485,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  initialFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary10,
  },
  initialLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  brandCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  countPill: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  countPillText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
});
