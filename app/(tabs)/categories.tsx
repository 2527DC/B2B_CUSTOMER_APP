import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategorySidebar, ProductCard, OfflineView, OfflineBanner } from '@/components';
import type { Category, Product } from '@/types/catalog';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import { getFriendlyErrorMessage, FormattedError } from '@/lib/network';
import { useBottomSpacing } from '@/hooks/useBottomSpacing';

const CATEGORIES_CACHE_KEY = '@dhatri_cached_categories_data';

// Extend the Category type locally to include rawProducts and image_url
interface ExtendedCategory extends Category {
  image_url?: string;
  rawProducts: any[];
}

const assetUrl = (path: string): string => URLs.assetUrl(path);

const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  flour: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  sugar: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  dal: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  oils: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
};

const getCategoryFallbackImage = (name: string): string => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('flour') || lower.includes('atta') || lower.includes('maida') || lower.includes('sooji') || lower.includes('besan')) return DEFAULT_CATEGORY_FALLBACKS.flour;
  if (lower.includes('sugar') || lower.includes('jaggery')) return DEFAULT_CATEGORY_FALLBACKS.sugar;
  if (lower.includes('oil') || lower.includes('ghee')) return DEFAULT_CATEGORY_FALLBACKS.oils;
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil')) return DEFAULT_CATEGORY_FALLBACKS.dal;
  if (lower.includes('rice')) return DEFAULT_CATEGORY_FALLBACKS.rice;
  return DEFAULT_CATEGORY_FALLBACKS.default;
};

const resolveCategoryImage = (cat: any): string => {
  if (cat.imageUrl && cat.imageUrl.trim() !== '') return assetUrl(cat.imageUrl);
  if (cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/'))) return assetUrl(cat.icon);
  if (cat.category_image?.image) return assetUrl(cat.category_image.image);
  return getCategoryFallbackImage(cat.name || '');
};

const mapProduct = (item: any): Product => {
  const p = item.product;
  const sellingPrice = item.min_sell_price ?? item.skus?.[0]?.selling_price ?? 0;
  const mrpVal = p?.mrp ?? item.skus?.[0]?.mrp ?? item.max_sell_price ?? sellingPrice;

  const unitCreated = item.units ?? item.unit ?? item.unit_name ?? p?.units ?? p?.unit ?? p?.unit_name ?? item.unit?.name ?? p?.unit?.name ?? item.skus?.[0]?.unit_name;
  const unitStr = typeof unitCreated === 'string' ? unitCreated : (unitCreated?.name || undefined);

  return {
    id: (p?.id ?? item.product_id ?? item.id).toString(),
    name: item.product_name ?? p?.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: p?.thumbnail_image_source ? assetUrl(p.thumbnail_image_source) : '',
    brand_id: '',
    category_id: '',
    description: '',
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

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const { scrollPaddingBottom } = useBottomSpacing();
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FormattedError | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(CATEGORIES_CACHE_KEY)
      .then((cached) => {
        if (!isMounted || !cached) return;
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed);
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

  useEffect(() => {
    if (categories.length === 0) return;
    fetchProducts();
  }, [selectedCategory, categories]);

  const fetchCategories = async () => {
    try {
      if (categories.length === 0) setLoading(true);
      setErrorInfo(null);
      console.log(`[CategoriesScreen] Fetching categories from: ${URLs.ALL_CATEGORY}`);
      const response = await apiClient.get(URLs.ALL_CATEGORY);
      const categoryList = response.data?.data ?? [];

      const getIconKey = (name: string): string => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('rice')) return 'Utensils';
        if (lowerName.includes('sugar')) return 'Sparkles';
        if (lowerName.includes('oil')) return 'Utensils';
        if (lowerName.includes('flour')) return 'BookOpen';
        if (lowerName.includes('dal')) return 'Gamepad2';
        return 'Utensils'; 
      };

      const mappedCategories: ExtendedCategory[] = categoryList.map((cat: any) => ({
        id: cat.id.toString(),
        name: cat.name,
        icon: getIconKey(cat.name),
        image_url: resolveCategoryImage(cat),
        created_at: cat.created_at || '',
        rawProducts: cat.AllProducts || [],
      }));

      setCategories(mappedCategories);
      setIsOfflineCached(false);
      setErrorInfo(null);
      AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(mappedCategories)).catch(() => {});
    } catch (error) {
      console.error('Error fetching categories:', error);
      const friendly = getFriendlyErrorMessage(error, 'Failed to load categories');
      if (categories.length > 0) {
        setIsOfflineCached(true);
      } else {
        setErrorInfo(friendly);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (selectedCategory === null) {
      // Combine raw products from all categories, avoiding duplicates.
      const allRawProducts: any[] = [];
      const seenIds = new Set<string>();

      categories.forEach((cat) => {
        const rawProds = cat.rawProducts || [];
        rawProds.forEach((prod: any) => {
          const prodId = (prod.product_id ?? prod.id).toString();
          if (!seenIds.has(prodId)) {
            seenIds.add(prodId);
            allRawProducts.push(prod);
          }
        });
      });

      const mapped = allRawProducts.map(mapProduct);
      setProducts(mapped);
    } else {
      // Fetch products for selected category dynamically from API
      try {
        setProductsLoading(true);
        const url = `${URLs.ALL_CATEGORY}/${selectedCategory}`;
        console.log(`[CategoriesScreen] Fetching products for category ${selectedCategory} from: ${url}`);
        const response = await apiClient.get(url);
        const data = response.data?.data;
        const rawProds = data?.AllProducts ?? [];
        const mapped = rawProds.map(mapProduct);
        setProducts(mapped);
      } catch (error) {
        console.error(`Error fetching products for category ${selectedCategory}:`, error);
        // Fallback to locally stored products if API request fails
        const currentCat = categories.find((cat) => cat.id === selectedCategory);
        const rawProds = currentCat?.rawProducts ?? [];
        const mapped = rawProds.map(mapProduct);
        setProducts(mapped);
      } finally {
        setProductsLoading(false);
      }
    }
  };

  const categoryName = selectedCategory
    ? categories.find(c => c.id === selectedCategory)?.name || 'All Products'
    : 'All Products';

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (errorInfo && categories.length === 0) {
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
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        <View style={styles.productsContainer}>
          <View style={styles.productsHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.productsTitle}>{categoryName}</Text>
              <Text style={styles.productCount}>{products.length} items</Text>
            </View>
          </View>

          {productsLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            <FlatList
              key="grid-view"
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.gridItem}>
                  <ProductCard product={item} viewMode="vertical" />
                </View>
              )}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.gridContainer, { paddingBottom: scrollPaddingBottom }]}
              columnWrapperStyle={styles.gridRow}
            />
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
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  productsContainer: {
    flex: 1,
  },
  productsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  productCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  gridContainer: {
    paddingHorizontal: 5,
    paddingTop: 6,
  },
  gridItem: {
    flex: 0.5,
    maxWidth: '50%',
    padding: 3,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
});
