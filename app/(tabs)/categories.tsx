import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, PackageOpen } from 'lucide-react-native';
import { CategorySidebar, type ParentSidebarItem } from '@/components/CategorySidebar';
import { ProductCard } from '@/components/ProductCard';
import { CategoryThumbImage } from '@/components/CategoryShelves';
import { OfflineView, OfflineBanner } from '@/components';
import type { Product } from '@/types/catalog';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import { getFriendlyErrorMessage, FormattedError } from '@/lib/network';
import { useBottomSpacing } from '@/hooks/useBottomSpacing';
import { CATEGORY_IMAGE_OVERRIDES, CATEGORY_PARENT_MAP } from '@/config/categoryImages';

const CATEGORIES_CACHE_KEY = '@dhatri_cached_categories_hierarchy_v1';

const assetUrl = (path: string): string => URLs.assetUrl(path);

// Multi-tier category image resolver
const resolveCategoryImage = (cat: any): string => {
  const directImage =
    cat.imageUrl ||
    cat.image ||
    (cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/')) ? cat.icon : null) ||
    cat.category_image?.image;

  if (directImage && String(directImage).trim() !== '' && !String(directImage).includes('/uploads/')) {
    return assetUrl(directImage);
  }

  const slugKey = String(cat.slug || '').toLowerCase().trim();
  const idKey = String(cat.id || '').toLowerCase().trim();
  const nameKey = String(cat.name || '').toLowerCase().trim();

  if (CATEGORY_IMAGE_OVERRIDES[slugKey]) return CATEGORY_IMAGE_OVERRIDES[slugKey];
  if (CATEGORY_IMAGE_OVERRIDES[idKey]) return CATEGORY_IMAGE_OVERRIDES[idKey];
  if (CATEGORY_IMAGE_OVERRIDES[nameKey]) return CATEGORY_IMAGE_OVERRIDES[nameKey];

  return '';
};

const mapProduct = (item: any): Product => {
  const p = item.product ?? item;
  const sellingPrice = item.min_sell_price ?? item.skus?.[0]?.selling_price ?? p?.min_sell_price ?? 0;
  const mrpVal = p?.mrp ?? item.skus?.[0]?.mrp ?? item.max_sell_price ?? p?.max_sell_price ?? sellingPrice;

  const unitCreated =
    item.units ??
    item.unit ??
    item.unit_name ??
    p?.units ??
    p?.unit ??
    p?.unit_name ??
    item.unit?.name ??
    p?.unit?.name ??
    item.skus?.[0]?.unit_name;
  const unitStr = typeof unitCreated === 'string' ? unitCreated : (unitCreated?.name || undefined);

  return {
    id: (p?.id ?? item.product_id ?? item.id).toString(),
    name: item.product_name ?? p?.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: p?.thumbnail_image_source ? assetUrl(p.thumbnail_image_source) : '',
    brand_id: '',
    category_id: (item.category_id ?? p?.category_id ?? '').toString(),
    description: p?.description ?? item.description ?? '',
    unit_name: unitStr,
    unit: unitStr,
    units: unitStr,
    unit_value:
      item.unit_value ??
      item.skus?.[0]?.weight ??
      (item.skus?.[0]?.sku && item.skus[0].sku.length <= 15 ? item.skus[0].sku : undefined),
    pack_size:
      item.unit_value ??
      (item.skus?.[0]?.variant_name && item.skus[0].variant_name.length <= 20
        ? item.skus[0].variant_name
        : undefined) ??
      item.skus?.[0]?.weight,
    pack_kg: item.pack_kg ?? item.skus?.[0]?.pack_kg ?? undefined,
    rating: 0,
    reviews_count: 0,
    created_at: '',
  };
};

interface SubcategoryWithProducts {
  id: string;
  name: string;
  image: string;
  parentId: string;
  parentName: string;
  products: Product[];
}

interface ParentHierarchyItem {
  id: string;
  name: string;
  image: string;
  subcategories: SubcategoryWithProducts[];
  parentProducts: Product[];
}

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollPaddingBottom } = useBottomSpacing();

  const [parents, setParents] = useState<ParentHierarchyItem[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subcatLoading, setSubcatLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FormattedError | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  // Handle hardware back press on Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (parents.length > 0 && selectedParentId !== parents[0].id) {
          setSelectedParentId(parents[0].id);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [parents, selectedParentId])
  );

  // Normalizes raw categories by resolving parentId (from API or from CATEGORY_PARENT_MAP)
  const normalizeCategories = (list: any[]) => {
    return list.map((cat) => {
      let resolvedParentId = cat.parentId != null ? String(cat.parentId) : null;

      if (!resolvedParentId) {
        const idKey = String(cat.id || '').toLowerCase().trim();
        const slugKey = String(cat.slug || '').toLowerCase().trim();
        const nameKey = String(cat.name || '').toLowerCase().trim();

        const mappedParent =
          CATEGORY_PARENT_MAP[idKey] ||
          CATEGORY_PARENT_MAP[slugKey] ||
          CATEGORY_PARENT_MAP[nameKey];

        if (mappedParent) {
          const parentMatch = list.find(
            (p) =>
              String(p.id).toLowerCase() === mappedParent.toLowerCase() ||
              (p.slug && p.slug.toLowerCase() === mappedParent.toLowerCase()) ||
              (p.name && p.name.toLowerCase() === mappedParent.toLowerCase())
          );
          if (parentMatch && String(parentMatch.id) !== String(cat.id)) {
            resolvedParentId = String(parentMatch.id);
          }
        }
      }

      return {
        ...cat,
        parentId: resolvedParentId,
      };
    });
  };

  const buildHierarchy = (categoryList: any[]): ParentHierarchyItem[] => {
    if (!Array.isArray(categoryList) || categoryList.length === 0) return [];

    const normalized = normalizeCategories(categoryList);
    const parentCats = normalized.filter((c) => c.parentId == null);
    const result: ParentHierarchyItem[] = [];

    for (const parent of parentCats) {
      const children = normalized.filter((c) => String(c.parentId) === String(parent.id));

      const subcategories: SubcategoryWithProducts[] = children.map((ch) => ({
        id: String(ch.id),
        name: ch.name,
        image: resolveCategoryImage(ch),
        parentId: String(parent.id),
        parentName: parent.name,
        products: (ch.AllProducts || []).map(mapProduct),
      }));

      result.push({
        id: String(parent.id),
        name: parent.name,
        image: resolveCategoryImage(parent),
        subcategories,
        parentProducts: (parent.AllProducts || []).map(mapProduct),
      });
    }

    return result;
  };

  const fetchCategories = async () => {
    try {
      if (parents.length === 0) setLoading(true);
      setErrorInfo(null);
      const response = await apiClient.get(URLs.ALL_CATEGORY);
      const categoryList = response.data?.data ?? [];

      const built = buildHierarchy(categoryList);
      setParents(built);
      if (built.length > 0 && !selectedParentId) {
        setSelectedParentId(built[0].id);
      }
      setIsOfflineCached(false);
      setErrorInfo(null);

      AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(built)).catch(() => {});
    } catch (error) {
      console.error('[CategoriesScreen] Error fetching categories:', error);
      const friendly = getFriendlyErrorMessage(error, 'Failed to load categories');
      if (parents.length > 0) {
        setIsOfflineCached(true);
      } else {
        setErrorInfo(friendly);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(CATEGORIES_CACHE_KEY)
      .then((cached) => {
        if (!isMounted || !cached) return;
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setParents(parsed);
            if (!selectedParentId) {
              setSelectedParentId(parsed[0].id);
            }
            setLoading(false);
          }
        } catch (e) {
          console.warn('[CategoriesScreen] Cache parse error:', e);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          fetchCategories();
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // When selected parent changes, if its subcategories have 0 products, lazy-fetch them
  useEffect(() => {
    if (!selectedParentId || parents.length === 0) return;

    const currentParent = parents.find((p) => p.id === selectedParentId);
    if (!currentParent) return;

    // Check if any subcategory is missing products
    const needsProducts =
      currentParent.subcategories.length > 0 &&
      currentParent.subcategories.some((s) => s.products.length === 0);

    if (needsProducts) {
      setSubcatLoading(true);
      Promise.all(
        currentParent.subcategories.map(async (sub) => {
          if (sub.products.length > 0) return sub;
          try {
            const res = await apiClient.get(`${URLs.ALL_CATEGORY}/${sub.id}`);
            const rawProds = res.data?.data?.AllProducts ?? [];
            return {
              ...sub,
              products: rawProds.map(mapProduct),
            };
          } catch {
            return sub;
          }
        })
      )
        .then((updatedSubs) => {
          setParents((prev) =>
            prev.map((p) =>
              p.id === selectedParentId
                ? { ...p, subcategories: updatedSubs }
                : p
            )
          );
        })
        .finally(() => {
          setSubcatLoading(false);
        });
    }
  }, [selectedParentId]);

  const activeParent =
    parents.find((p) => p.id === selectedParentId) || parents[0];

  const sidebarCategories: ParentSidebarItem[] = parents.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.image,
  }));

  if (loading && parents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  if (errorInfo && parents.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 16) }]}>
          <Text style={styles.title}>Categories</Text>
        </View>
        <OfflineView
          onRetry={fetchCategories}
          isRetrying={loading}
          isOffline={errorInfo.isOffline}
          title={errorInfo.title}
          message={errorInfo.message}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 6, 16) }]}>
        <Text style={styles.title}>Categories</Text>
      </View>

      {isOfflineCached && (
        <OfflineBanner
          onRetry={fetchCategories}
          isRetrying={loading}
          message="You're offline • Showing saved categories"
        />
      )}

      <View style={styles.mainContent}>
        {/* Left Side: Parent Categories Vertical Sidebar */}
        <CategorySidebar
          categories={sidebarCategories}
          selectedCategory={selectedParentId}
          onSelectCategory={(id) => setSelectedParentId(id)}
        />

        {/* Right Side: Active Parent's Subcategories with Horizontal Product Shelves */}
        <View style={styles.rightContentPane}>
          {activeParent ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.shelvesScrollContent,
                { paddingBottom: scrollPaddingBottom + 20 },
              ]}
            >
              {/* Active Parent Header Strip */}
              <View style={styles.parentBannerRow}>
                <View style={styles.parentBannerLeft}>
                  <Text style={styles.parentBannerTitle}>{activeParent.name}</Text>
                  <Text style={styles.parentBannerSubtitle}>
                    {activeParent.subcategories.length > 0
                      ? `${activeParent.subcategories.length} Subcategories`
                      : 'Catalog Products'}
                  </Text>
                </View>
              </View>

              {subcatLoading ? (
                <View style={styles.subcatSpinnerBox}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.subcatSpinnerText}>Updating {activeParent.name}...</Text>
                </View>
              ) : null}

              {/* Subcategories Shelf Stack */}
              {activeParent.subcategories.length > 0 ? (
                <View style={styles.subcatStack}>
                  {activeParent.subcategories.map((subcat) => {
                    const hasProducts = subcat.products && subcat.products.length > 0;
                    return (
                      <View key={`subcat-box-${subcat.id}`} style={styles.subcatCardBlock}>
                        {/* Subcategory Header: Image, Title, Count & See all */}
                        <TouchableOpacity
                          style={styles.subcatHeaderRow}
                          activeOpacity={0.75}
                          onPress={() => router.push(`/search?category=${subcat.id}` as any)}
                        >
                          <View style={styles.subcatHeaderLeft}>
                            <View style={styles.subcatThumbBox}>
                              <CategoryThumbImage
                                uri={subcat.image}
                                name={subcat.name}
                                style={styles.subcatThumbImg}
                              />
                            </View>
                            <View style={styles.subcatTitleMeta}>
                              <Text style={styles.subcatTitleText} numberOfLines={1}>
                                {subcat.name}
                              </Text>
                              <Text style={styles.subcatCountText}>
                                {hasProducts ? `${subcat.products.length} products` : 'Explore'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.seeAllRow}>
                            <Text style={styles.seeAllText}>View All</Text>
                            <ChevronRight size={13} color={Colors.primary} strokeWidth={2.5} />
                          </View>
                        </TouchableOpacity>

                        {/* Horizontal Single Row of Products */}
                        {hasProducts ? (
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalProductsTrack}
                          >
                            {subcat.products.map((prod) => (
                              <View
                                key={`subcat-prod-${subcat.id}-${prod.id}`}
                                style={styles.productCardWrap}
                              >
                                <ProductCard product={prod} viewMode="vertical" />
                              </View>
                            ))}
                          </ScrollView>
                        ) : (
                          <View style={styles.emptyShelfBox}>
                            <PackageOpen size={18} color={Colors.textMuted} />
                            <Text style={styles.emptyShelfText}>
                              No products currently available in {subcat.name}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : activeParent.parentProducts && activeParent.parentProducts.length > 0 ? (
                /* When parent has direct products without subcategories */
                <View style={styles.subcatCardBlock}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalProductsTrack}
                  >
                    {activeParent.parentProducts.map((prod) => (
                      <View
                        key={`parent-prod-${activeParent.id}-${prod.id}`}
                        style={styles.productCardWrap}
                      >
                        <ProductCard product={prod} viewMode="vertical" />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <PackageOpen size={38} color={Colors.textMuted} />
                  <Text style={styles.emptyStateTitle}>No products found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Products for {activeParent.name} will appear here once added.
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  rightContentPane: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  shelvesScrollContent: {
    paddingVertical: 12,
  },
  parentBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 8,
  },
  parentBannerLeft: {
    flex: 1,
  },
  parentBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  parentBannerSubtitle: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  subcatSpinnerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  subcatSpinnerText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  subcatStack: {
    gap: 12,
  },
  subcatCardBlock: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  subcatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  subcatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  subcatThumbBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F4F1',
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcatThumbImg: {
    width: '100%',
    height: '100%',
  },
  subcatTitleMeta: {
    flex: 1,
  },
  subcatTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  subcatCountText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 6,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  horizontalProductsTrack: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 10,
  },
  productCardWrap: {
    width: 144,
  },
  emptyShelfBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    marginHorizontal: 14,
    borderRadius: 8,
  },
  emptyShelfText: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyStateSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
