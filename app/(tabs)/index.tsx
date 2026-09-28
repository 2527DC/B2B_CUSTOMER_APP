import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, ScrollView, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { CustomHeader, PromoSlider, BrandSection, ProductCard } from '@/components';
import { useRouter } from 'expo-router';
import { X, PackageOpen } from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Brand, Product } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

// ─── Raw API response types ──────────────────────────────────────────────────
interface FeaturedBrand {
  id: number;
  name: string;
  logo: string; // relative path e.g. "uploads/images/…/logo.png"
}
interface SliderItem {
  id: number;
  slider_image: string; // relative path
}
interface ApiProduct {
  id: number;
  product_name: string;
  thumbnail_image_source: string; // relative path
  min_sell_price: number;
  max_sell_price: number;
  current_stock?: number;
  mrp?: number;
  brand_id?: number | string;
  brandId?: number | string;
}
interface TopPick {
  id: number;
  product_name?: string;
  min_sell_price?: number;
  max_sell_price?: number;
  brand_id?: number | string;
  brandId?: number | string;
  product: ApiProduct;
  skus?: {
    id: number;
    selling_price: number;
    mrp: number | null;
  }[];
}
interface HomeResponse {
  top_categories: unknown[];
  featured_brands: FeaturedBrand[];
  sliders: SliderItem[];
  top_picks: TopPick[];
  [key: string]: unknown; // allow logging all unknown keys
}

// ─── Image URL helper ─────────────────────────────────────────────────────────
const assetUrl = (path: string): string => URLs.assetUrl(path);

// ─── Mapper helpers ───────────────────────────────────────────────────────────
const toBrand = (fb: FeaturedBrand): Brand => ({
  id: fb.id.toString(),
  name: fb.name,
  logo_url: assetUrl(fb.logo),
  created_at: '',
});

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

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const [topPicks, setTopPicks] = useState<Product[]>([]);

  // Brand selection & filtered products state
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [brandProductsLoading, setBrandProductsLoading] = useState(false);

  useEffect(() => {
    fetchHomeData(false);
  }, []);

  const handleSelectBrand = async (brandId: string | null) => {
    if (!brandId || brandId === selectedBrand) {
      setSelectedBrand(null);
      setSelectedBrandName(null);
      setBrandProducts([]);
      return;
    }

    const brand = featuredBrands.find((b) => b.id === brandId);
    const bName = brand?.name || 'Selected Brand';
    setSelectedBrand(brandId);
    setSelectedBrandName(bName);
    setBrandProductsLoading(true);

    try {
      console.log(`[HomeScreen] Fetching products for brand ${brandId} (${bName})`);
      const response = await apiClient.get(`${URLs.ALL_PRODUCTS}?brandId=${brandId}`);
      const rawData = response.data;
      const rawList: any[] = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      const mapped = rawList.map(toProduct);
      console.log(`[HomeScreen] Loaded ${mapped.length} products for brand ${bName}`);
      setBrandProducts(mapped);
    } catch (err: any) {
      console.error('[HomeScreen] Error fetching brand products:', err?.message);
      const matching = topPicks.filter(p => p.brand_id === brandId);
      setBrandProducts(matching);
    } finally {
      setBrandProductsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchHomeData(true);
    if (selectedBrand) {
      handleSelectBrand(selectedBrand);
    }
  }, [selectedBrand, featuredBrands]);

  const fetchHomeData = async (isPullRefresh = false) => {
    if (isPullRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      console.log('[HomeScreen] REQUEST →', URLs.HOME_PAGE);

      const { data, status, headers } = await apiClient.get<HomeResponse>(URLs.HOME_PAGE);

      console.log('[HomeScreen] RESPONSE status:', status);
      console.log('[HomeScreen] RESPONSE headers:', JSON.stringify(headers));
      console.log('[HomeScreen] RESPONSE keys:', Object.keys(data));

      // ── Map sliders → absolute image URLs ────────────────────────────────
      const slides = (data.sliders ?? []).map(s => assetUrl(s.slider_image));
      setSliderImages(slides);

      // ── Map brands ────────────────────────────────────────────────────────
      const brands = (data.featured_brands ?? []).map(toBrand);
      setFeaturedBrands(brands);

      // ── Map top picks ─────────────────────────────────────────────────────
      const picks = (data.top_picks ?? [])
        .filter(tp => tp?.product != null)
        .map(toProduct);
      setTopPicks(picks);

    } catch (err: any) {
      console.error('[HomeScreen] Fetch error:', err?.message, err?.response?.status, err?.response?.data);
      setError('Failed to load home data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Header */}
      <CustomHeader onSearchPress={() => router.push('/search')} />

      {/* Promo Slider — API images */}
      <View style={styles.sliderWrapper}>
        <PromoSlider images={sliderImages} />
      </View>

      {/* Featured Brands */}
      {featuredBrands.length > 0 && (
        <BrandSection
          brands={featuredBrands}
          selectedBrand={selectedBrand}
          onSelectBrand={handleSelectBrand}
          onViewAll={() => router.push('/brands')}
        />
      )}

      {/* Brand-Filtered Products OR Top Picks */}
      {selectedBrand ? (
        <View style={styles.brandProductsSection}>
          <View style={styles.brandFilterHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.sectionTitle}>{selectedBrandName}</Text>
                {!brandProductsLoading && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{brandProducts.length} items</Text>
                  </View>
                )}
              </View>
              <Text style={styles.brandFilterSubtitle}>Filtered by selected brand</Text>
            </View>
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => handleSelectBrand(null)}
              activeOpacity={0.7}
            >
              <X size={14} color={Colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {brandProductsLoading ? (
            <View style={styles.brandLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.brandLoadingText}>Loading {selectedBrandName} products...</Text>
            </View>
          ) : brandProducts.length === 0 ? (
            <View style={styles.emptyBrandContainer}>
              <PackageOpen size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyBrandTitle}>No Products Found</Text>
              <Text style={styles.emptyBrandSubtitle}>
                No products are currently available under {selectedBrandName}.
              </Text>
              <TouchableOpacity
                style={styles.showAllPicksBtn}
                onPress={() => handleSelectBrand(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.showAllPicksBtnText}>Show All Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={brandProducts}
              keyExtractor={(item, index) => `brand-prod-${item.id}-${index}`}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <ProductCard product={item} viewMode="vertical" />
                </View>
              )}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
            />
          )}
        </View>
      ) : topPicks.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Picks</Text>
          </View>
          <FlatList
            data={topPicks}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <ProductCard product={item} viewMode="vertical" />
              </View>
            )}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  listContent: {
    paddingBottom: 100,
  },
  gridItem: {
    flex: 0.5,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sliderWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  brandProductsSection: {
    marginTop: 4,
  },
  brandFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandFilterSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  brandLoadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyBrandContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyBrandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  emptyBrandSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  showAllPicksBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  showAllPicksBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
