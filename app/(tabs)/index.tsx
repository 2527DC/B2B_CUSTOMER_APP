import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, ScrollView, RefreshControl,
  TouchableOpacity, Image,
} from 'react-native';
import {
  CustomHeader, PromoSlider, BrandSection,
  ProductCard, OfflineView, OfflineBanner,
  HomeCategorySections, type SubcategoryItem, type CategorySectionItem,
} from '@/components';
import { useRouter, useFocusEffect } from 'expo-router';
import { X, PackageOpen, ArrowLeft, ChevronRight, Package, LayoutGrid } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import type { Brand, Product } from '@/types/catalog';
import { Colors } from '@/constants/theme';
import { fetchCustomerNotifications } from '@/lib/notifications';
import { getFriendlyErrorMessage, FormattedError } from '@/lib/network';
import { useBottomSpacing } from '@/hooks/useBottomSpacing';
import { CATEGORY_IMAGE_OVERRIDES, CATEGORY_PARENT_MAP } from '@/config/categoryImages';

const HOME_CACHE_KEY = '@dhatri_cached_home_data';
const CATEGORIES_CACHE_KEY = '@dhatri_cached_home_categories_v2';

// ─── Curated High-Quality Banners for Themes matching reference UI ────────────
const THEME_BANNERS: Record<string, string> = {
  flour: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  sugar: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80',
  rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  dal: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  oils: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
  drinks: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
  dairy: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
  soaps: 'https://images.unsplash.com/photo-1608248597359-32432a537f1e?w=600&auto=format&fit=crop&q=80',
  haircare: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80',
  personal: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
  grocery: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
  snacks: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
  cleaning: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
};

const getFallbackBanner = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('flour') || lower.includes('atta') || lower.includes('maida') || lower.includes('wheat') || lower.includes('besan') || lower.includes('sooji') || lower.includes('rava')) return THEME_BANNERS.flour;
  if (lower.includes('sugar') || lower.includes('jaggery') || lower.includes('sweet')) return THEME_BANNERS.sugar;
  if (lower.includes('dal') || lower.includes('pulse') || lower.includes('lentil') || lower.includes('gram') || lower.includes('chana') || lower.includes('urad') || lower.includes('toor') || lower.includes('moong') || lower.includes('masoor')) return THEME_BANNERS.dal;
  if (lower.includes('rice') || lower.includes('paddy') || lower.includes('basmati') || lower.includes('brown') || lower.includes('boild') || lower.includes('boiled') || lower.includes('masoori') || lower.includes('kolam')) return THEME_BANNERS.rice;
  if (lower.includes('oil') || lower.includes('ghee')) return THEME_BANNERS.oils;
  if (lower.includes('spice') || lower.includes('masala') || lower.includes('chilli') || lower.includes('turmeric') || lower.includes('pepper')) return THEME_BANNERS.spices;
  if (lower.includes('juice') || lower.includes('drink') || lower.includes('beverage') || lower.includes('soda')) return THEME_BANNERS.drinks;
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('butter')) return THEME_BANNERS.dairy;
  if (lower.includes('soap') || lower.includes('hand') || lower.includes('face') || lower.includes('wash')) return THEME_BANNERS.soaps;
  if (lower.includes('hair') || lower.includes('shampoo') || lower.includes('conditioner')) return THEME_BANNERS.haircare;
  if (lower.includes('personal') || lower.includes('skin') || lower.includes('care') || lower.includes('oral') || lower.includes('dental')) return THEME_BANNERS.personal;
  if (lower.includes('snack') || lower.includes('biscuit') || lower.includes('cookie') || lower.includes('namkeen')) return THEME_BANNERS.snacks;
  if (lower.includes('clean') || lower.includes('detergent') || lower.includes('dish')) return THEME_BANNERS.cleaning;
  if (lower.includes('grocery') || lower.includes('staple')) return THEME_BANNERS.grocery;
  return THEME_BANNERS.rice;
};

// ─── Raw API response types ──────────────────────────────────────────────────
interface FeaturedBrand {
  id: number;
  name: string;
  logo: string;
}
interface SliderItem {
  id: number;
  slider_image: string;
}
interface HomeResponse {
  top_categories?: unknown[];
  featured_brands: FeaturedBrand[];
  sliders: SliderItem[];
  [key: string]: unknown;
}

// ─── Image URL helper ─────────────────────────────────────────────────────────
const assetUrl = (path?: string): string => {
  if (!path || path.trim() === '') return '';
  return URLs.assetUrl(path);
};

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
  const unitCreated = item.units ?? item.unit ?? item.unit_name ?? p?.units ?? p?.unit ?? p?.unit_name ?? item.unit?.name ?? p?.unit?.name ?? item.skus?.[0]?.unit_name;
  const unitStr = typeof unitCreated === 'string' ? unitCreated : (unitCreated?.name || undefined);

  return {
    id: (p?.id ?? item.product_id ?? item.id).toString(),
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

// ─── Multi-tier image resolver ────────────────────────────────────────────────
const resolveCategoryImage = (cat: any): string => {
  // 1. Prefer real product thumbnail from S3 if available
  const firstProd = cat.AllProducts?.[0]?.product ?? cat.AllProducts?.[0];
  const prodThumb = firstProd?.thumbnail_image_source;
  if (prodThumb && (prodThumb.startsWith('http') || prodThumb.startsWith('//')) && !prodThumb.includes('/uploads/')) {
    return prodThumb;
  }

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

  if (firstProd?.thumbnail_image_source) {
    const u = assetUrl(firstProd.thumbnail_image_source);
    if (u && !u.includes('/uploads/')) return u;
  }

  return getFallbackBanner(cat.name || '');
};

// ─── Category Drilldown Stack Item ───────────────────────────────────────────
interface CategoryLevel {
  id: string;
  name: string;
  isLeaf: boolean; // false = has subcategories, true = show products
  subcategories: SubcategoryItem[];
  products: Product[];
}

function DrillCardImage({ uri, name }: { uri?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const fallback = getFallbackBanner(name);
  const isBrokenLocalUpload = typeof uri === 'string' && uri.includes('/uploads/');
  const activeUri = !failed && uri && uri.trim().length > 0 && !isBrokenLocalUpload ? uri : fallback;

  return (
    <Image
      key={activeUri}
      source={{ uri: activeUri }}
      style={styles.subcatCardImage}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { scrollPaddingBottom } = useBottomSpacing();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FormattedError | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([]);
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const [categorySections, setCategorySections] = useState<CategorySectionItem[]>([]);
  const [rawCategories, setRawCategories] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Brand selection state
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedBrandName, setSelectedBrandName] = useState<string | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [brandProductsLoading, setBrandProductsLoading] = useState(false);

  // Dynamic Multi-Level Category Drilldown Stack
  const [categoryTrail, setCategoryTrail] = useState<CategoryLevel[]>([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);

  // Fetch unread notification count
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadUnreadCount = async () => {
        try {
          const res = await fetchCustomerNotifications(1);
          if (isMounted && typeof res.unreadCount === 'number') {
            setUnreadCount(res.unreadCount);
          }
        } catch {
          // Silent catch
        }
      };

      loadUnreadCount();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  useEffect(() => {
    let isMounted = true;

    // Hydrate from cache immediately for instant render
    Promise.all([
      AsyncStorage.getItem(HOME_CACHE_KEY),
      AsyncStorage.getItem(CATEGORIES_CACHE_KEY),
    ])
      .then(([homeCached, catCached]) => {
        if (!isMounted) return;
        if (homeCached) {
          try {
            const parsed = JSON.parse(homeCached);
            if (Array.isArray(parsed.sliderImages) && parsed.sliderImages.length > 0) {
              setSliderImages(parsed.sliderImages);
            }
            if (Array.isArray(parsed.featuredBrands) && parsed.featuredBrands.length > 0) {
              setFeaturedBrands(parsed.featuredBrands);
            }
          } catch (e) {
            console.warn('[HomeScreen] Home cache parse error:', e);
          }
        }

        if (catCached) {
          try {
            const parsedCats = JSON.parse(catCached);
            if (Array.isArray(parsedCats) && parsedCats.length > 0) {
              setCategorySections(parsedCats);
              setLoading(false);
            }
          } catch (e) {
            console.warn('[HomeScreen] Category cache parse error:', e);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          fetchHomeData(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const buildCategorySections = (categoryList: any[]): CategorySectionItem[] => {
    if (!Array.isArray(categoryList) || categoryList.length === 0) return [];

    const normalizedList = normalizeCategories(categoryList);
    const parentCats = normalizedList.filter((c) => c.parentId == null);
    const sections: CategorySectionItem[] = [];

    for (const parent of parentCats) {
      const children = normalizedList.filter((c) => String(c.parentId) === String(parent.id));

      const subcategories: SubcategoryItem[] = [];

      // 1. Parent card in this row (e.g. "Rice")
      subcategories.push({
        id: String(parent.id),
        name: parent.name,
        image: resolveCategoryImage(parent),
        categoryId: String(parent.id),
        categoryName: parent.name,
        productCount: parent.AllProducts?.length || 0,
        products: (parent.AllProducts || []).map(toProduct),
        isParent: true,
      });

      // 2. Child subcategories in the exact same row (e.g. "Dal", "Boild rice", "Brown")
      children.forEach((ch) => {
        subcategories.push({
          id: String(ch.id),
          name: ch.name,
          image: resolveCategoryImage(ch),
          categoryId: String(parent.id),
          categoryName: parent.name,
          productCount: ch.AllProducts?.length || 0,
          products: (ch.AllProducts || []).map(toProduct),
          isParent: false,
        });
      });

      // Pure text heading with commas: e.g. "Rice, Dal, Boild rice, Brown"
      const headingParts = [parent.name, ...children.map((ch) => ch.name)];
      const sectionHeading = headingParts.join(', ');

      sections.push({
        id: String(parent.id),
        name: sectionHeading,
        subcategories,
      });
    }

    return sections;
  };

  const handleSelectBrand = async (brandId: string | null) => {
    if (!brandId || brandId === selectedBrand) {
      setSelectedBrand(null);
      setSelectedBrandName(null);
      setBrandProducts([]);
      return;
    }

    setCategoryTrail([]);

    const brand = featuredBrands.find((b) => b.id === brandId);
    const bName = brand?.name || 'Selected Brand';
    setSelectedBrand(brandId);
    setSelectedBrandName(bName);
    setBrandProductsLoading(true);

    try {
      const response = await apiClient.get(`${URLs.ALL_PRODUCTS}?brandId=${brandId}`);
      const rawData = response.data;
      const rawList: any[] = Array.isArray(rawData) ? rawData : (rawData?.data || []);
      const mapped = rawList.map(toProduct);
      setBrandProducts(mapped);
    } catch (err: any) {
      console.error('[HomeScreen] Error fetching brand products:', err?.message);
      setBrandProducts([]);
    } finally {
      setBrandProductsLoading(false);
    }
  };

  /**
   * Recursive Category Navigation (Categories vs Products Router):
   * - If category has children under it -> Display child subcategories!
   * - If category has no children (leaf) -> Display products!
   */
  const handleCategoryPress = async (item: SubcategoryItem) => {
    setSelectedBrand(null);
    setSelectedBrandName(null);

    const normalized = normalizeCategories(rawCategories);
    const directChildren = normalized.filter(
      (c) => String(c.parentId) === String(item.id)
    );

    const hasChildren = directChildren.length > 0;

    if (hasChildren) {
      // ── Level has subcategories: Show subcategories grid ──
      const childCards: SubcategoryItem[] = directChildren.map((ch) => ({
        id: String(ch.id),
        name: ch.name,
        image: resolveCategoryImage(ch),
        categoryId: String(item.id),
        categoryName: item.name,
        productCount: ch.AllProducts?.length || 0,
        products: (ch.AllProducts || []).map(toProduct),
      }));

      setCategoryTrail((prev) => [
        ...prev,
        {
          id: String(item.id),
          name: item.name,
          isLeaf: false,
          subcategories: childCards,
          products: [],
        },
      ]);
    } else {
      // ── Leaf node: Load & show respected products listing ──
      const initialProducts = item.products && item.products.length > 0 ? item.products : [];

      setCategoryTrail((prev) => [
        ...prev,
        {
          id: String(item.id),
          name: item.name,
          isLeaf: true,
          subcategories: [],
          products: initialProducts,
        },
      ]);

      if (initialProducts.length === 0) {
        setCategoryProductsLoading(true);
        try {
          const res = await apiClient.get(`${URLs.ALL_CATEGORY}/${item.id}`);
          const rawProds = res.data?.data?.AllProducts ?? [];
          const mapped = rawProds.map(toProduct);

          setCategoryTrail((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              products: mapped,
            };
            return updated;
          });
        } catch (e: any) {
          console.error('[HomeScreen] Error fetching leaf products:', e?.message);
        } finally {
          setCategoryProductsLoading(false);
        }
      }
    }
  };

  /**
   * Browse all products directly under a parent category
   */
  const handleViewAllCategoryProducts = async (level: CategoryLevel) => {
    setCategoryTrail((prev) => [
      ...prev,
      {
        id: `${level.id}-all`,
        name: `All ${level.name}`,
        isLeaf: true,
        subcategories: [],
        products: [],
      },
    ]);

    setCategoryProductsLoading(true);
    try {
      const res = await apiClient.get(`${URLs.ALL_CATEGORY}/${level.id}`);
      const rawProds = res.data?.data?.AllProducts ?? [];
      const mapped = rawProds.map(toProduct);

      setCategoryTrail((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          products: mapped,
        };
        return updated;
      });
    } catch (e: any) {
      console.error('[HomeScreen] Error fetching all parent products:', e?.message);
    } finally {
      setCategoryProductsLoading(false);
    }
  };

  const handleBackOneLevel = () => {
    setCategoryTrail((prev) => prev.slice(0, prev.length - 1));
  };

  const handleResetToRoot = () => {
    setCategoryTrail([]);
  };

  const onRefresh = useCallback(() => {
    fetchHomeData(true);
    fetchCustomerNotifications(1)
      .then((res) => {
        if (typeof res.unreadCount === 'number') setUnreadCount(res.unreadCount);
      })
      .catch(() => {});

    if (selectedBrand) {
      handleSelectBrand(selectedBrand);
    }
  }, [selectedBrand]);

  const fetchHomeData = async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(categorySections.length === 0 && sliderImages.length === 0);
    }

    try {
      const [homeRes, catRes] = await Promise.allSettled([
        apiClient.get<HomeResponse>(URLs.HOME_PAGE),
        apiClient.get(URLs.ALL_CATEGORY),
      ]);

      if (homeRes.status === 'fulfilled') {
        const homeData = homeRes.value.data;
        const slides = (homeData.sliders ?? [])
          .map((s) => assetUrl(s.slider_image))
          .filter((uri) => typeof uri === 'string' && uri.trim().length > 0);
        setSliderImages(slides);

        const brands = (homeData.featured_brands ?? []).map(toBrand);
        setFeaturedBrands(brands);

        AsyncStorage.setItem(
          HOME_CACHE_KEY,
          JSON.stringify({
            sliderImages: slides,
            featuredBrands: brands,
            timestamp: Date.now(),
          })
        ).catch(() => {});
      }

      if (catRes.status === 'fulfilled') {
        const categoryList = catRes.value.data?.data ?? [];
        setRawCategories(categoryList);

        const builtSections = buildCategorySections(categoryList);
        setCategorySections(builtSections);

        AsyncStorage.setItem(
          CATEGORIES_CACHE_KEY,
          JSON.stringify(builtSections)
        ).catch(() => {});
      }

      setErrorInfo(null);
      setIsOfflineCached(false);
    } catch (err: any) {
      console.error('[HomeScreen] Fetch error:', err?.message);
      const friendly = getFriendlyErrorMessage(err, 'Failed to load home data');

      if (categorySections.length > 0 || sliderImages.length > 0 || featuredBrands.length > 0) {
        setIsOfflineCached(true);
        setErrorInfo(null);
      } else {
        setErrorInfo(friendly);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Full-screen loading
  if (loading && categorySections.length === 0 && sliderImages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading catalog...</Text>
      </View>
    );
  }

  // Full-screen Offline / Error state
  if (errorInfo && categorySections.length === 0 && sliderImages.length === 0) {
    return (
      <View style={styles.container}>
        <CustomHeader
          onSearchPress={() => router.push('/search')}
          onNotificationPress={() => router.push('/notifications' as any)}
          unreadCount={unreadCount}
        />
        <OfflineView
          onRetry={() => fetchHomeData(false)}
          isRetrying={loading || refreshing}
          isOffline={errorInfo.isOffline}
          title={errorInfo.title}
          message={errorInfo.message}
        />
      </View>
    );
  }

  const currentLevel = categoryTrail.length > 0 ? categoryTrail[categoryTrail.length - 1] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollPaddingBottom },
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
    >
      {/* Header */}
      <CustomHeader
        onSearchPress={() => router.push('/search')}
        onNotificationPress={() => router.push('/notifications' as any)}
        unreadCount={unreadCount}
      />

      {/* Offline banner */}
      {isOfflineCached && (
        <OfflineBanner
          onRetry={() => fetchHomeData(true)}
          isRetrying={refreshing}
          message="You're offline • Showing saved catalog"
        />
      )}

      {/* Promo Slider (only on root home) */}
      {!selectedBrand && categoryTrail.length === 0 && sliderImages.length > 0 && (
        <View style={styles.sliderWrapper}>
          <PromoSlider images={sliderImages} />
        </View>
      )}

      {/* Featured Brands (only on root home) */}
      {!selectedBrand && categoryTrail.length === 0 && featuredBrands.length > 0 && (
        <BrandSection
          brands={featuredBrands}
          selectedBrand={selectedBrand}
          onSelectBrand={handleSelectBrand}
          onViewAll={() => router.push('/brands')}
        />
      )}

      {/* ── Brand Filtered Products ── */}
      {selectedBrand ? (
        <View style={styles.filteredSection}>
          <View style={styles.filteredHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.filteredTitleRow}>
                <Text style={styles.sectionTitle}>{selectedBrandName}</Text>
                {!brandProductsLoading && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{brandProducts.length} items</Text>
                  </View>
                )}
              </View>
              <Text style={styles.filteredSubtitle}>Filtered by selected brand</Text>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading {selectedBrandName} products...</Text>
            </View>
          ) : brandProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <PackageOpen size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySubtitle}>
                No products are currently available under {selectedBrandName}.
              </Text>
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => handleSelectBrand(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.showAllBtnText}>Show All Categories</Text>
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
              contentContainerStyle={[styles.listContent, { paddingBottom: scrollPaddingBottom }]}
              scrollEnabled={false}
            />
          )}
        </View>
      ) : currentLevel ? (
        /* ── Dynamic Category Drilldown View (Categories or Products) ── */
        <View style={styles.filteredSection}>
          {/* Breadcrumb Navigation Bar */}
          <View style={styles.breadcrumbBar}>
            <View style={styles.breadcrumbPathRow}>
              <TouchableOpacity onPress={handleResetToRoot} activeOpacity={0.7}>
                <Text style={styles.breadcrumbRoot}>Home</Text>
              </TouchableOpacity>
              {categoryTrail.map((level, idx) => (
                <View key={`crumb-${level.id}`} style={styles.breadcrumbSegment}>
                  <ChevronRight size={12} color="#94a3b8" />
                  <TouchableOpacity
                    onPress={() => setCategoryTrail((prev) => prev.slice(0, idx + 1))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.breadcrumbText,
                        idx === categoryTrail.length - 1 && styles.breadcrumbActiveText,
                      ]}
                      numberOfLines={1}
                    >
                      {level.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.trailActionRow}>
              <TouchableOpacity
                style={styles.backLevelBtn}
                onPress={handleBackOneLevel}
                activeOpacity={0.75}
              >
                <ArrowLeft size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.backLevelText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.homeResetBtn}
                onPress={handleResetToRoot}
                activeOpacity={0.75}
              >
                <X size={13} color="#64748b" style={{ marginRight: 3 }} />
                <Text style={styles.homeResetText}>All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Drilldown Content */}
          {!currentLevel.isLeaf ? (
            /* Condition A: Category HAS Subcategories -> Render Subcategories Grid in Enclosed Card */
            <View style={styles.subcatContainer}>
              <View style={styles.subcatCardBox}>
                <View style={styles.subcatHeader}>
                  <Text style={styles.subcatSectionTitle}>{currentLevel.name}</Text>
                  <Text style={styles.subcatSectionSubtitle}>
                    Select a subcategory or browse all products below
                  </Text>
                </View>

                {/* View All Products under this parent */}
                <TouchableOpacity
                  style={styles.allParentProductsBanner}
                  activeOpacity={0.82}
                  onPress={() => handleViewAllCategoryProducts(currentLevel)}
                >
                  <View style={styles.allParentProductsLeft}>
                    <View style={styles.allParentProductsIconWrap}>
                      <LayoutGrid size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.allParentProductsTitle}>
                        View All {currentLevel.name} Products
                      </Text>
                      <Text style={styles.allParentProductsSub}>
                        Browse complete catalog under {currentLevel.name}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={Colors.primary} />
                </TouchableOpacity>

                {/* 3-Column Grid matching Home Udaan Card */}
                <View style={styles.subcatGridWrap}>
                  {currentLevel.subcategories.map((subcat) => (
                    <TouchableOpacity
                      key={`drill-${subcat.id}`}
                      style={styles.subcatTile}
                      activeOpacity={0.82}
                      onPress={() => handleCategoryPress(subcat)}
                    >
                      <View style={styles.subcatTileImageWrap}>
                        <DrillCardImage uri={subcat.image} name={subcat.name} />
                      </View>
                      <Text style={styles.subcatTileTitle} numberOfLines={2}>
                        {subcat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            /* Condition B: Category has NO subcategories -> Render Respected Products Listing */
            <View>
              <View style={styles.filteredHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.filteredTitleRow}>
                    <Text style={styles.sectionTitle}>{currentLevel.name}</Text>
                    {!categoryProductsLoading && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{currentLevel.products.length} items</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.filteredSubtitle}>Showing all products in {currentLevel.name}</Text>
                </View>
              </View>

              {categoryProductsLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading {currentLevel.name} products...</Text>
                </View>
              ) : currentLevel.products.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <PackageOpen size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyTitle}>No Products Found</Text>
                  <Text style={styles.emptySubtitle}>
                    No products are currently available in {currentLevel.name}.
                  </Text>
                  <TouchableOpacity
                    style={styles.showAllBtn}
                    onPress={handleResetToRoot}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.showAllBtnText}>Show All Categories</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={currentLevel.products}
                  keyExtractor={(item, index) => `leaf-prod-${item.id}-${index}`}
                  renderItem={({ item }) => (
                    <View style={styles.gridItem}>
                      <ProductCard product={item} viewMode="vertical" />
                    </View>
                  )}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[styles.listContent, { paddingBottom: scrollPaddingBottom }]}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </View>
      ) : (
        /* ── Root Home: Category Rows (Parent + Subcategories in each row) ── */
        <HomeCategorySections
          sections={categorySections}
          onSelectSubcategory={handleCategoryPress}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  sliderWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  listContent: {
    paddingBottom: 24,
  },
  gridItem: {
    flex: 0.5,
    maxWidth: '50%',
    padding: 4,
  },
  gridRow: {
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
  },
  filteredSection: {
    marginTop: 2,
  },
  filteredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filteredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filteredSubtitle: {
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
  emptyContainer: {
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  showAllBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  showAllBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── Breadcrumb Navigation ──────────────────────────────────────────────────
  breadcrumbBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  breadcrumbPathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 4,
  },
  breadcrumbRoot: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  breadcrumbSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748b',
    maxWidth: 100,
  },
  breadcrumbActiveText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  trailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  backLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  backLevelText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  homeResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  homeResetText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },

  // ─── Subcategories Grid (When category has children) ───────────────────────
  subcatContainer: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 20,
  },
  subcatCardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#e8edf2',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  subcatHeader: {
    marginBottom: 12,
  },
  subcatSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subcatSectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  allParentProductsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  allParentProductsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 10,
  },
  allParentProductsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allParentProductsTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#15803d',
  },
  allParentProductsSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  subcatGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subcatTile: {
    width: '30.8%',
    alignItems: 'center',
  },
  subcatTileImageWrap: {
    width: '100%',
    aspectRatio: 1.15,
    borderRadius: 14,
    backgroundColor: '#F0F4F1',
    borderWidth: 1,
    borderColor: '#e0eae2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    shadowColor: '#142918',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subcatCardImage: {
    width: '88%',
    height: '88%',
  },
  subcatTileTitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
});
