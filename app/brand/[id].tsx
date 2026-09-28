import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, PackageOpen, LayoutGrid, List } from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Product } from '@/lib/supabase';
import { ProductCard } from '@/components';
import { Colors } from '@/constants/theme';

const assetUrl = (path?: string): string => URLs.assetUrl(path);

const toProduct = (item: any): Product => {
  const p = item.product ?? item;
  const sellingPrice = item.min_sell_price ?? item.skus?.[0]?.selling_price ?? p?.min_sell_price ?? 0;
  const mrpVal = p?.mrp ?? item.skus?.[0]?.mrp ?? item.max_sell_price ?? p?.max_sell_price ?? sellingPrice;
  const brandId = (item.brand_id ?? p?.brand_id ?? item.brandId ?? p?.brandId ?? '').toString();

  return {
    id: (p?.id ?? item.id).toString(),
    name: p?.product_name ?? item.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: assetUrl(p?.thumbnail_image_source ?? item.thumbnail_image_source ?? ''),
    brand_id: brandId,
    category_id: (item.category_id ?? p?.category_id ?? '').toString(),
    description: p?.description ?? item.description ?? '',
    rating: 0,
    reviews_count: 0,
    created_at: '',
  };
};

export default function BrandProductsScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const brandId = id;
  const brandName = name ? decodeURIComponent(name) : 'Brand';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchBrandProducts = async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);

    try {
      console.log(`[BrandProductsScreen] Fetching products for brandId: ${brandId}`);
      const response = await apiClient.get(`${URLs.ALL_PRODUCTS}?brandId=${brandId}`);
      const rawData = response.data;
      const rawList: any[] = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      const mapped = rawList.map(toProduct);
      console.log(`[BrandProductsScreen] Found ${mapped.length} products`);
      setProducts(mapped);
    } catch (err: any) {
      console.error('[BrandProductsScreen] Error fetching products:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchBrandProducts();
    }
  }, [brandId]);

  const onRefresh = useCallback(() => {
    fetchBrandProducts(true);
  }, [brandId]);

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
          <Text style={styles.headerTitle} numberOfLines={1}>
            {brandName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading...' : `${products.length} products available`}
          </Text>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.7}
          >
            <LayoutGrid
              size={18}
              color={viewMode === 'grid' ? Colors.primary : '#64748b'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.7}
          >
            <List
              size={18}
              color={viewMode === 'list' ? Colors.primary : '#64748b'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Fetching {brandName} catalog...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <PackageOpen size={54} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Products Available</Text>
          <Text style={styles.emptySubtitle}>
            There are currently no products listed under {brandName}.
          </Text>
          <TouchableOpacity
            style={styles.browseAllBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.browseAllBtnText}>Browse Other Brands</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="brand-grid-view"
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <ProductCard product={item} viewMode="vertical" />
            </View>
          )}
        />
      ) : (
        <FlatList
          key="brand-list-view"
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} viewMode="horizontal" />
          )}
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
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    lineHeight: 18,
    marginBottom: 20,
  },
  browseAllBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseAllBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  gridContainer: {
    padding: 10,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridItem: {
    flex: 0.5,
    paddingHorizontal: 4,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
});
