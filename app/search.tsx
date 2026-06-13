import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search as SearchIcon, X, Tag, ShoppingBag, AlertCircle, ArrowUpRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { Product } from '@/lib/supabase';
import { ProductCard } from '@/components';

interface SearchTag {
  id: number;
  name: string;
}

interface LiveSearchResponse {
  tags: SearchTag[];
  products: any[];
  categories: any[];
}

export default function SearchScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<SearchTag[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounce effect: update debouncedKeyword after user stops typing for 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Fetch search results from LIVE_SEARCH endpoint
  useEffect(() => {
    if (debouncedKeyword.trim().length === 0) {
      setTags([]);
      setProducts([]);
      setError(null);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log(`[SearchScreen] API REQUEST → ${URLs.LIVE_SEARCH} with keyword "${debouncedKeyword}"`);
        const response = await apiClient.post<LiveSearchResponse>(URLs.LIVE_SEARCH, {
          keyword: debouncedKeyword,
          cat_id: 0,
        });

        const data = response.data;
        setTags(data.tags ?? []);

        // Map API response products to Product type
        const mappedProducts: Product[] = (data.products ?? []).map((p: any) => ({
          id: p.id.toString(),
          name: p.product_name,
          price: p.selling_price,
          mrp: p.mrp > p.selling_price ? p.mrp : undefined,
          image_url: p.thumb_img,
          brand_id: '',
          category_id: '',
          description: '',
          rating: 0,
          reviews_count: 0,
          created_at: '',
        }));

        setProducts(mappedProducts);
      } catch (err: any) {
        console.error('[SearchScreen] API Error:', err?.message, err?.response?.data);
        setError('Failed to fetch search results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [debouncedKeyword]);

  const handleTagPress = (tagName: string) => {
    setKeyword(tagName);
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setKeyword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Search Input Row */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <SearchIcon size={18} color="#94a3b8" strokeWidth={2.5} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products or tags..."
            placeholderTextColor="#94a3b8"
            value={keyword}
            onChangeText={setKeyword}
            autoFocus={true}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch} activeOpacity={0.7}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.infoText}>Searching for "{keyword}"...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredContainer}>
            <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : keyword.trim().length === 0 ? (
          <View style={styles.centeredContainer}>
            <SearchIcon size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Text style={styles.titleText}>Explore Products</Text>
            <Text style={styles.subtitleText}>Type to search for authentic premium wholesale products</Text>
          </View>
        ) : products.length === 0 && tags.length === 0 ? (
          <View style={styles.centeredContainer}>
            <ShoppingBag size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
            <Text style={styles.titleText}>No Results Found</Text>
            <Text style={styles.subtitleText}>We couldn't find any products or tags matching "{debouncedKeyword}"</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.resultsList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              tags.length > 0 ? (
                <View style={styles.tagsContainer}>
                  <Text style={styles.sectionTitle}>Search Suggestions</Text>
                  <View style={styles.autofillList}>
                    {tags.map((tag, index) => (
                      <TouchableOpacity
                        key={tag.id}
                        style={[
                          styles.autofillRow,
                          index === tags.length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => handleTagPress(tag.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.autofillLeft}>
                          <SearchIcon size={16} color="#94a3b8" style={{ marginRight: 12 }} />
                          <Text style={styles.autofillText}>{tag.name}</Text>
                        </View>
                        <ArrowUpRight size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {products.length > 0 && <Text style={styles.sectionTitle}>Products</Text>}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
                <ProductCard product={item} viewMode="vertical" />
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    color: '#0f172a',
    height: '100%',
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  infoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  tagsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  autofillList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  autofillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  autofillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  autofillText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  resultsList: {
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  gridItem: {
    flex: 0.5,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
});
