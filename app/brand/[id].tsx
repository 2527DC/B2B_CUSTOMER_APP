import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '@/lib/navigation';
import { ArrowLeft, PackageOpen, LayoutGrid, List, Check, Plus } from 'lucide-react-native';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Product } from '@/lib/supabase';
import { ProductCard } from '@/components';
import { Colors } from '@/constants/theme';
import { formatRate, pricePerKg } from '@/lib/perKg';
import { useCart } from '@/context/CartContext';

const assetUrl = (path?: string): string => URLs.assetUrl(path);

interface SuggestionItem {
  id: number;
  product_name: string;
  thumbnail_image_source?: string;
  price: number;
  mrp?: number;
  brand_name?: string | null;
  brand_id?: number | null;
  unit_name?: string;
  pack_size?: string;
  pack_kg?: number;
  minimum_order_qty?: number;
  sku_id: number;
  seller_id?: number;
}

const toProduct = (item: any): Product => {
  const p = item.product ?? item;
  const sellingPrice = item.min_sell_price ?? item.skus?.[0]?.selling_price ?? p?.min_sell_price ?? 0;
  const mrpVal = p?.mrp ?? item.skus?.[0]?.mrp ?? item.max_sell_price ?? p?.max_sell_price ?? sellingPrice;
  const brandId = (item.brand_id ?? p?.brand_id ?? item.brandId ?? p?.brandId ?? '').toString();
  const unitCreated = item.units ?? item.unit ?? item.unit_name ?? p?.units ?? p?.unit ?? p?.unit_name ?? item.unit?.name ?? p?.unit?.name ?? item.skus?.[0]?.unit_name;
  const unitStr = typeof unitCreated === 'string' ? unitCreated : (unitCreated?.name || undefined);

  return {
    id: (p?.id ?? item.id).toString(),
    name: p?.product_name ?? item.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: assetUrl(p?.thumbnail_image_source ?? item.thumbnail_image_source ?? ''),
    brand_id: brandId,
    category_id: (item.category_id ?? p?.category_id ?? '').toString(),
    description: p?.description ?? item.description ?? '',
    unit_name: unitStr,
    unit: unitStr,
    units: unitStr,
    unit_value: item.unit_value ?? item.skus?.[0]?.weight ?? (item.skus?.[0]?.sku && item.skus[0].sku.length <= 15 ? item.skus[0].sku : undefined),
    pack_size: item.unit_value ?? (item.skus?.[0]?.variant_name && item.skus[0].variant_name.length <= 20 ? item.skus[0].variant_name : undefined) ?? item.skus?.[0]?.weight,
    pack_kg: item.pack_kg ?? item.skus?.[0]?.pack_kg ?? undefined,
    rating: 0,
    reviews_count: 0,
    created_at: '',
  };
};

export default function BrandProductsScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const brandId = id;
  const brandName = name ? decodeURIComponent(name) : 'Brand';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Brand Suggestions State
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [alternativeBrands, setAlternativeBrands] = useState<SuggestionItem[]>([]);
  const [companionStaples, setCompanionStaples] = useState<SuggestionItem[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

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

  const fetchBrandSuggestions = async () => {
    try {
      const url = `${URLs.BRAND_SUGGESTIONS}?brandId=${brandId}`;
      console.log(`[BrandProductsScreen] Fetching suggestions from: ${url}`);
      const res = await apiClient.get(url);
      if (res.data?.success) {
        setCategoryName(res.data.category_name || null);
        setAlternativeBrands(res.data.alternative_brands || []);
        setCompanionStaples(res.data.companion_staples || []);
      }
    } catch (err: any) {
      console.warn('[BrandProductsScreen] Error fetching brand suggestions:', err?.message);
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchBrandProducts();
      fetchBrandSuggestions();
    }
  }, [brandId]);

  const onRefresh = useCallback(() => {
    fetchBrandProducts(true);
    fetchBrandSuggestions();
  }, [brandId]);

  const handleAddCompanion = async (item: SuggestionItem) => {
    try {
      setAddingId(item.sku_id);
      const ok = await addToCart(
        item.id,
        item.sku_id,
        item.minimum_order_qty || 1,
        item.price,
        item.seller_id || 1
      );
      if (ok) {
        setAddedId(item.sku_id);
        setTimeout(() => setAddedId(null), 1200);
      }
    } catch (err) {
      console.error('[BrandScreen] Quick add companion failed:', err);
    } finally {
      setAddingId(null);
    }
  };

  const renderTopMoversHeader = () => {
    if (products.length <= 1) return null;
    const topMovers = products.slice(0, 3);

    return (
      <View style={styles.topMoversContainer}>
        <View style={styles.topMoversHeaderWrap}>
          <View style={styles.topMoversTitleRow}>
            <Text style={styles.topMoversEmoji}>🔥</Text>
            <Text style={styles.topMoversTitle}>Top Volume Movers</Text>
          </View>
          <Text style={styles.topMoversSubtitle}>
            Fastest-selling wholesale staples from {brandName}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topMoversScroll}
        >
          {topMovers.map((item) => {
            const rate = pricePerKg(item.price, item.pack_kg);
            return (
              <TouchableOpacity
                key={`mover-${item.id}`}
                style={styles.moverCard}
                activeOpacity={0.88}
                onPress={() => router.push(`/product/${item.id}`)}
              >
                <View style={styles.moverImgWrap}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.moverImg} resizeMode="contain" />
                  ) : (
                    <PackageOpen size={20} color="#94a3b8" />
                  )}
                  <View style={styles.moverBadge}>
                    <Text style={styles.moverBadgeText}>Fast Mover</Text>
                  </View>
                </View>

                <Text style={styles.moverName} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.pack_size ? (
                  <Text style={styles.moverPack} numberOfLines={1}>
                    {item.pack_size}
                  </Text>
                ) : null}

                <View style={styles.moverPriceRow}>
                  <Text style={styles.moverPrice}>₹{(item.price ?? 0).toLocaleString('en-IN')}</Text>
                  {rate !== null && (
                    <Text style={styles.moverRate}>{formatRate(rate)}/kg</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.catalogDividerWrap}>
          <Text style={styles.catalogDividerTitle}>
            All {brandName} Products ({products.length})
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (alternativeBrands.length === 0 && companionStaples.length === 0) {
      return <View style={{ height: 30 }} />;
    }

    return (
      <View style={styles.footerSuggestionsWrap}>
        {/* Section 1: Alternative Brands in Same Category */}
        {alternativeBrands.length > 0 && (
          <View style={styles.suggestionSection}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleIcon}>⚖️</Text>
                <Text style={styles.sectionTitleText}>
                  Compare Other {categoryName || ''} Brands
                </Text>
              </View>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>Same Category</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtext}>
              Alternative wholesale brands in your warehouse for margin and rate comparison
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionScroll}
            >
              {alternativeBrands.map((alt) => {
                const rate = pricePerKg(alt.price, alt.pack_kg);
                return (
                  <TouchableOpacity
                    key={`alt-${alt.id}`}
                    style={styles.suggestionCard}
                    activeOpacity={0.88}
                    onPress={() => router.push(`/product/${alt.id}`)}
                  >
                    <View style={styles.suggestionImgWrap}>
                      {alt.thumbnail_image_source ? (
                        <Image
                          source={{ uri: assetUrl(alt.thumbnail_image_source) }}
                          style={styles.suggestionImg}
                          resizeMode="contain"
                        />
                      ) : (
                        <PackageOpen size={22} color="#94a3b8" />
                      )}
                      {alt.brand_name && (
                        <View style={styles.brandPill}>
                          <Text style={styles.brandPillText} numberOfLines={1}>
                            {alt.brand_name}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.suggestionName} numberOfLines={2}>
                      {alt.product_name}
                    </Text>
                    {alt.pack_size ? (
                      <Text style={styles.suggestionPack} numberOfLines={1}>
                        {alt.pack_size}
                      </Text>
                    ) : null}

                    <View style={styles.suggestionPriceRow}>
                      <Text style={styles.suggestionPrice}>
                        ₹{(alt.price ?? 0).toLocaleString('en-IN')}
                      </Text>
                      {rate !== null && (
                        <Text style={styles.suggestionRate}>{formatRate(rate)}/kg</Text>
                      )}
                    </View>

                    <View style={styles.compareBtn}>
                      <Text style={styles.compareBtnText}>View Product ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Section 2: Frequently Stocked Together (Wholesale Staples) */}
        {companionStaples.length > 0 && (
          <View style={[styles.suggestionSection, { marginTop: 18 }]}>
            <View style={styles.suggestionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleIcon}>🛒</Text>
                <Text style={styles.sectionTitleText}>
                  Frequently Stocked with {brandName}
                </Text>
              </View>
              <View style={[styles.sectionBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <Text style={[styles.sectionBadgeText, { color: '#065f46' }]}>Top Staples</Text>
              </View>
            </View>
            <Text style={styles.sectionSubtext}>
              Companion bulk staples commonly ordered together by retailers in your warehouse
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionScroll}
            >
              {companionStaples.map((item) => {
                const isAdding = addingId === item.sku_id;
                const isAdded = addedId === item.sku_id;
                const rate = pricePerKg(item.price, item.pack_kg);

                return (
                  <View key={`comp-${item.id}`} style={styles.suggestionCard}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => router.push(`/product/${item.id}`)}
                    >
                      <View style={styles.suggestionImgWrap}>
                        {item.thumbnail_image_source ? (
                          <Image
                            source={{ uri: assetUrl(item.thumbnail_image_source) }}
                            style={styles.suggestionImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <PackageOpen size={22} color="#94a3b8" />
                        )}
                        {item.brand_name && (
                          <View style={styles.brandPill}>
                            <Text style={styles.brandPillText} numberOfLines={1}>
                              {item.brand_name}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.suggestionName} numberOfLines={2}>
                        {item.product_name}
                      </Text>
                      {item.pack_size ? (
                        <Text style={styles.suggestionPack} numberOfLines={1}>
                          {item.pack_size}
                        </Text>
                      ) : null}

                      <View style={styles.suggestionPriceRow}>
                        <Text style={styles.suggestionPrice}>
                          ₹{(item.price ?? 0).toLocaleString('en-IN')}
                        </Text>
                        {rate !== null && (
                          <Text style={styles.suggestionRate}>{formatRate(rate)}/kg</Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.quickAddBtn, isAdded && styles.quickAddBtnSuccess]}
                      onPress={() => handleAddCompanion(item)}
                      disabled={isAdding || isAdded}
                      activeOpacity={0.85}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : isAdded ? (
                        <View style={styles.btnRow}>
                          <Check size={13} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.quickAddBtnText}>Added MOQ</Text>
                        </View>
                      ) : (
                        <View style={styles.btnRow}>
                          <Plus size={13} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={styles.quickAddBtnText}>Add {item.minimum_order_qty || 1} Bag</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBack()}
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.emptyContainer}>
            <PackageOpen size={54} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No Products Available</Text>
            <Text style={styles.emptySubtitle}>
              There are currently no products listed under {brandName}.
            </Text>
            <TouchableOpacity
              style={styles.browseAllBtn}
              onPress={() => goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.browseAllBtnText}>Browse Other Brands</Text>
            </TouchableOpacity>
          </View>
          {renderFooter()}
        </ScrollView>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="brand-grid-view"
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderTopMoversHeader}
          ListFooterComponent={renderFooter}
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
          ListHeaderComponent={renderTopMoversHeader}
          ListFooterComponent={renderFooter}
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
    paddingTop: 36,
    paddingBottom: 24,
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
  topMoversContainer: {
    marginBottom: 16,
    paddingTop: 4,
  },
  topMoversHeaderWrap: {
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  topMoversTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topMoversEmoji: {
    fontSize: 16,
  },
  topMoversTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  topMoversSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  topMoversScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  moverCard: {
    width: 154,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  moverImgWrap: {
    width: '100%',
    height: 96,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  moverImg: {
    width: '85%',
    height: '85%',
  },
  moverBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  moverBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#b45309',
  },
  moverName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 16,
    minHeight: 32,
    marginTop: 8,
  },
  moverPack: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  moverPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  moverPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  moverRate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  catalogDividerWrap: {
    marginTop: 18,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  catalogDividerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  // Suggestions in Footer
  footerSuggestionsWrap: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: 24,
  },
  suggestionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  suggestionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  sectionTitleIcon: {
    fontSize: 15,
  },
  sectionTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  sectionSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 15,
  },
  suggestionScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  suggestionCard: {
    width: 156,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
  },
  suggestionImgWrap: {
    width: '100%',
    height: 96,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  suggestionImg: {
    width: '85%',
    height: '85%',
  },
  brandPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  suggestionName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 16,
    minHeight: 32,
    marginTop: 8,
  },
  suggestionPack: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  suggestionPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 4,
  },
  suggestionPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  suggestionRate: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
  },
  compareBtn: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  compareBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  quickAddBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtnSuccess: {
    backgroundColor: '#059669',
  },
  quickAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
