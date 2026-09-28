import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CategorySidebar, ProductCard } from '@/components';
import { Category, Product } from '@/lib/supabase';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';

// Extend the Category type locally to include rawProducts and image_url
interface ExtendedCategory extends Category {
  image_url?: string;
  rawProducts: any[];
}

const assetUrl = (path: string): string => URLs.assetUrl(path);

const mapProduct = (item: any): Product => {
  const p = item.product;
  const sellingPrice = item.min_sell_price ?? item.skus?.[0]?.selling_price ?? 0;
  const mrpVal = p?.mrp ?? item.skus?.[0]?.mrp ?? item.max_sell_price ?? sellingPrice;

  return {
    id: (p?.id ?? item.product_id ?? item.id).toString(),
    name: item.product_name ?? p?.product_name ?? '',
    price: sellingPrice,
    mrp: mrpVal > sellingPrice ? mrpVal : undefined,
    image_url: p?.thumbnail_image_source ? assetUrl(p.thumbnail_image_source) : '',
    brand_id: '',
    category_id: '',
    description: '',
    rating: 0,
    reviews_count: 0,
    created_at: '',
  };
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<ExtendedCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    fetchProducts();
  }, [selectedCategory, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
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
        image_url: cat.category_image?.image ? assetUrl(cat.category_image.image) : '',
        created_at: cat.created_at || '',
        rawProducts: cat.AllProducts || [],
      }));

      setCategories(mappedCategories);
      setSelectedCategory(null); // default to "All" category
    } catch (error) {
      console.error('Error fetching categories:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>Browse by category</Text>
          </View>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={[styles.toggleText, viewMode === 'grid' && styles.toggleTextActive]}>Grid</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
          ) : viewMode === 'list' ? (
            <FlatList
              key="list-view"
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ProductCard product={item} viewMode="horizontal" />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
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
              contentContainerStyle={styles.gridContainer}
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  productsContainer: {
    flex: 1,
  },
  productsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
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
  toggleText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
  listContainer: {
    paddingBottom: 100,
  },
  gridContainer: {
    paddingBottom: 100,
    paddingHorizontal: 6,
  },
  gridItem: {
    flex: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
});
