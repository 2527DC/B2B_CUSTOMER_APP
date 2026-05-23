import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, Heart, ShoppingCart, Plus, Minus, ShieldCheck, Truck, RotateCcw } from 'lucide-react-native';
import { supabase, Product } from '@/lib/supabase';
import WholesaleTierRow from '@/components/WholesaleTierRow';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = [
  { name: 'Silver', hex: '#e2e8f0' },
  { name: 'Space Gray', hex: '#475569' },
  { name: 'Gold', hex: '#f59e0b' },
];

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Silver');
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*, wholesale_tiers')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) setProduct(data);
    } catch (err) {
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    setAddingToCart(true);
    // Simulate premium cart add duration
    setTimeout(() => {
      setAddingToCart(false);
      setAddedSuccess(true);
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setAddedSuccess(false);
      }, 2000);
    }, 1200);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Product Not Found</Text>
        <Text style={styles.errorSubtitle}>The product you are looking for does not exist or has been removed.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          style={styles.circleHeaderButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#1e293b" strokeWidth={2.5} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.circleHeaderButton}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.7}
        >
          <Heart
            size={22}
            color={isFavorite ? '#ef4444' : '#64748b'}
            fill={isFavorite ? '#ef4444' : 'none'}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'transparent']}
            style={styles.imageGradient}
          />
        </View>

        {/* Content Body */}
        <View style={styles.detailsCard}>
          {/* Brand/Category Tag & Rating */}
          <View style={styles.metaRow}>
            <View style={styles.brandTag}>
              <Text style={styles.brandTagText}>PREMIUM SELECT</Text>
            </View>
            <View style={styles.ratingRow}>
              <Star size={16} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({product.reviews_count} reviews)</Text>
            </View>
          </View>

          {/* Product Title */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Pricing Row */}
          <View style={styles.pricingSection}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            <View style={styles.inStockBadge}>
              <View style={styles.stockDot} />
              <Text style={styles.stockText}>In Stock</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>

          <View style={styles.divider} />
          {/* Wholesale Pricing Section */}
          <View style={styles.wholesaleSection}>
            <Text style={styles.wholesaleTitle}>Wholesale Pricing</Text>
            <FlatList
              data={product.wholesale_tiers ?? []}
              keyExtractor={item => `${item.min_qty}-${item.max_qty}`}
              renderItem={({ item }) => <WholesaleTierRow tier={item} />}
              ListEmptyComponent={<Text style={styles.noWholesaleText}>No wholesale tiers available.</Text>}
            />
          </View>

          {/* Simulated Product Variations - Size Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Size</Text>
            <View style={styles.sizeContainer}>
              {SIZES.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeBox,
                    selectedSize === size && styles.sizeBoxActive,
                  ]}
                  onPress={() => setSelectedSize(size)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      selectedSize === size && styles.sizeTextActive,
                    ]}
                  >
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Simulated Product Variations - Color Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Color</Text>
            <View style={styles.colorContainer}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color.name}
                  style={[
                    styles.colorOption,
                    selectedColor === color.name && styles.colorOptionActive,
                  ]}
                  onPress={() => setSelectedColor(color.name)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.colorDot, { backgroundColor: color.hex }]} />
                  <Text
                    style={[
                      styles.colorName,
                      selectedColor === color.name && styles.colorNameActive,
                    ]}
                  >
                    {color.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Delivery & Returns Badges */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <Truck size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Free Delivery</Text>
                <Text style={styles.featureSubtitle}>On orders over $50</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIconContainer}>
                <RotateCcw size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.featureTitle}>Easy Returns</Text>
                <Text style={styles.featureSubtitle}>30 days return window</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {/* Quantity Controller */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            activeOpacity={0.7}
          >
            <Minus size={16} color="#475569" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.quantityVal}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityBtn}
            onPress={() => setQuantity(quantity + 1)}
            activeOpacity={0.7}
          >
            <Plus size={16} color="#475569" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Add to Cart Button */}
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={handleAddToCart}
          disabled={addingToCart || addedSuccess}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={addedSuccess ? ['#10b981', '#059669'] : ['#2563eb', '#1d4ed8']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : addedSuccess ? (
              <View style={styles.addedRow}>
                <ShieldCheck size={20} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.addToCartText}>Added ✓</Text>
              </View>
            ) : (
              <View style={styles.addedRow}>
                <ShoppingCart size={20} color="#ffffff" strokeWidth={2} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    padding: 30,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  floatingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'transparent',
  },
  circleHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  imageContainer: {
    width: width,
    height: width * 0.95,
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -24,
    paddingHorizontal: 24,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  brandTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  reviewsText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 14,
    lineHeight: 30,
  },
  pricingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  price: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2563eb',
  },
  inStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  descriptionText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    fontWeight: '400',
  },
  sizeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  sizeBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  sizeBoxActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  sizeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  sizeTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  colorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  colorOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  colorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  colorNameActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  featuresGrid: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6,
    marginBottom: 10,
  },
  featureItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  featureSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 6,
  },
  quantityBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    paddingHorizontal: 12,
  },
  addToCartButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addToCartText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  wholesaleSection: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  wholesaleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  wholesaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  wholesaleRangeText: {
    fontSize: 16,
    color: '#475569',
  },
  wholesalePriceText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  noWholesaleText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
