import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { CustomHeader, PromoSlider, BrandSection, ProductCard, CategorySidebar } from '@/components';
import { URLs } from '@/config/urls';

// Types for the home page response
interface TopCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  image: string;
}
interface FeaturedBrand {
  id: number;
  name: string;
  logo: string;
}
interface SliderItem {
  id: number;
  slider_image: string;
}
interface ProductVariant {
  // Define minimal fields used by ProductCard
  id: number;
  product_name: string;
  thumbnail_image_source: string;
  min_sell_price: number;
  max_sell_price: number;
  // Additional fields can be added as needed
}
interface TopPick {
  id: number;
  product: ProductVariant;
}
interface HomeResponse {
  top_categories: TopCategory[];
  featured_brands: FeaturedBrand[];
  sliders: SliderItem[];
  top_picks: TopPick[];
  // other fields can be added if needed
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Section state
  const [topCategories, setTopCategories] = useState<TopCategory[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<FeaturedBrand[]>([]);
  const [sliders, setSliders] = useState<SliderItem[]>([]);
  const [topPicks, setTopPicks] = useState<TopPick[]>([]);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      const response = await axios.get<HomeResponse>(URLs.HOME_PAGE);
      const data = response.data;
      setTopCategories(data.top_categories);
      setFeaturedBrands(data.featured_brands);
      setSliders(data.sliders);
      setTopPicks(data.top_picks);
    } catch (err) {
      console.error('Error fetching home data:', err);
      setError('Failed to load home data');
    } finally {
      setLoading(false);
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

  const renderTopPickItem = ({ item }: { item: TopPick }) => (
    <View style={styles.gridItem}>
      <ProductCard product={item.product} viewMode="vertical" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header and Slider */}
      <CustomHeader />
      <PromoSlider items={sliders.map(s => s.slider_image)} />

      {/* Top Categories */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Categories</Text>
      </View>
      <CategorySidebar
        categories={topCategories.map(c => ({
          id: c.id.toString(),
          name: c.name,
          icon: c.icon,
          created_at: ''
        }))}
        selectedCategory={null}
        onSelectCategory={() => {}}
      />

      {/* Featured Brands */}
      <BrandSection brands={featuredBrands} />

      {/* Top Picks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Picks</Text>
      </View>
      <FlatList
        data={topPicks}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTopPickItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
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
    paddingVertical: 16,
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
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
});
