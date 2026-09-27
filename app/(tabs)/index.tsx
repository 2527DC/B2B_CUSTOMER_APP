import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { CustomHeader, PromoSlider, BrandSection, ProductCard } from '@/components';
import { useRouter } from 'expo-router';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Brand, Product } from '@/lib/supabase';

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
}
interface TopPick {
  id: number;
  product_name?: string;
  min_sell_price?: number;
  max_sell_price?: number;
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

const toProduct = (tp: TopPick): Product => {
  const p = tp.product;
  const sellingPrice = tp.min_sell_price ?? tp.skus?.[0]?.selling_price ?? 0;
  const mrpVal = p?.mrp ?? tp.skus?.[0]?.mrp ?? tp.max_sell_price ?? sellingPrice;

  return {
    id: p?.id?.toString() ?? tp.id.toString(),
    name: p?.product_name ?? tp.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: assetUrl(p?.thumbnail_image_source),
    brand_id: '',
    category_id: '',
    description: '',
    rating: 0,
    reviews_count: 0,
    created_at: '',
  };
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const [topPicks, setTopPicks] = useState<Product[]>([]);

  useEffect(() => {
    fetchHomeData(false);
  }, []);

  const onRefresh = useCallback(() => {
    fetchHomeData(true);
  }, []);

  const fetchHomeData = async (isPullRefresh = false) => {
    if (isPullRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // ── Log the outgoing request ──────────────────────────────────────────
      console.log('[HomeScreen] REQUEST →', URLs.HOME_PAGE);

      const { data, status, headers } = await apiClient.get<HomeResponse>(URLs.HOME_PAGE);

      // ── Log the full raw response ─────────────────────────────────────────
      console.log('[HomeScreen] RESPONSE status:', status);
      console.log('[HomeScreen] RESPONSE headers:', JSON.stringify(headers));
      console.log('[HomeScreen] RESPONSE keys:', Object.keys(data));
      console.log('[HomeScreen] top_picks raw:', JSON.stringify(data.top_picks?.slice(0, 2)));
      console.log('[HomeScreen] featured_brands raw:', JSON.stringify(data.featured_brands?.slice(0, 2)));
      console.log('[HomeScreen] sliders raw:', JSON.stringify(data.sliders?.slice(0, 2)));

      // ── Map sliders → absolute image URLs ────────────────────────────────
      const slides = (data.sliders ?? []).map(s => assetUrl(s.slider_image));
      console.log('[HomeScreen] slider image URLs:', slides);
      setSliderImages(slides);

      // ── Map brands ────────────────────────────────────────────────────────
      const brands = (data.featured_brands ?? []).map(toBrand);
      console.log('[HomeScreen] mapped brands:', brands.map(b => ({ id: b.id, name: b.name, logo_url: b.logo_url })));
      setFeaturedBrands(brands);

      // ── Map top picks ─────────────────────────────────────────────────────
      const picks = (data.top_picks ?? [])
        .filter(tp => tp?.product != null) // skip empty entries
        .map(toProduct);
      console.log('[HomeScreen] mapped picks count:', picks.length, picks.slice(0, 2).map(p => ({ id: p.id, name: p.name, image_url: p.image_url })));
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
        <ActivityIndicator size="large" color="#2563eb" />
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
          colors={['#2563eb']}
          tintColor="#2563eb"
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
        <>
          <BrandSection
            brands={featuredBrands}
            selectedBrand={null}
            onSelectBrand={() => {}}
          />
        </>
      )}

      {/* Top Picks */}
      {topPicks.length > 0 && (
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#f8fafc',
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
});
