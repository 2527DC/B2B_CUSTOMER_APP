import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Star, Plus } from 'lucide-react-native';
import { Product } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Colors } from '@/constants/theme';

interface ProductCardProps {
  product: Product;
  viewMode: 'horizontal' | 'vertical';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const router = useRouter();
  const { cartItems } = useCart();

  // How many of this product are in the cart
  const cartCount = cartItems.filter(item => item.product_id === parseInt(product.id)).reduce((sum, item) => sum + item.qty, 0);

  const handlePress = () => {
    router.push(`/product/${product.id}`);
  };

  if (viewMode === 'horizontal') {
    return (
      <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={handlePress}>
        <View style={styles.horizontalImageContainer}>
          {!!product.image_url && product.image_url.trim() !== '' ? (
            <Image source={{ uri: product.image_url }} style={styles.horizontalImage} resizeMode="contain" />
          ) : (
            <View style={[styles.horizontalImage, { backgroundColor: '#e5e7eb' }]} />
          )}
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
            <Text style={styles.ratingText}>{(product.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({product.reviews_count ?? 0})</Text>
          </View>
          <Text style={styles.description} numberOfLines={1}>{product.description}</Text>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.price}>₹{Number(product.price ?? 0).toFixed(0)}</Text>
              {product.mrp != null && Number(product.mrp) > Number(product.price ?? 0) && (
                <Text style={styles.mrp}>₹{Number(product.mrp).toFixed(0)}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.addButton, cartCount > 0 && styles.addButtonInCart]}
              onPress={handlePress}
              activeOpacity={0.8}
            >
              {cartCount > 0 ? (
                <Text style={styles.cartCountText}>{cartCount}</Text>
              ) : (
                <Plus size={22} color="#ffffff" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.verticalCard} activeOpacity={0.8} onPress={handlePress}>
      <View style={styles.verticalImageContainer}>
        {!!product.image_url && product.image_url.trim() !== '' ? (
          <Image source={{ uri: product.image_url }} style={styles.verticalImage} resizeMode="contain" />
        ) : (
          <View style={[styles.verticalImage, { backgroundColor: '#e5e7eb' }]} />
        )}
        <TouchableOpacity
          style={[styles.verticalAddButtonFloating, cartCount > 0 && styles.addButtonInCart]}
          activeOpacity={0.8}
          onPress={handlePress}
        >
          {cartCount > 0 ? (
            <Text style={styles.cartCountText}>{cartCount}</Text>
          ) : (
            <Plus size={18} color="#ffffff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.verticalContent}>
        <Text style={styles.verticalProductName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.verticalPriceRow}>
          <View>
            <Text style={styles.verticalPrice}>₹{Number(product.price ?? 0).toFixed(0)}</Text>
            {product.mrp != null && Number(product.mrp) > Number(product.price ?? 0) && (
              <Text style={styles.verticalMrp}>₹{Number(product.mrp).toFixed(0)}</Text>
            )}
          </View>
          <View style={styles.verticalRatingRight}>
            <Star size={11} color="#d97706" fill="#d97706" />
            <Text style={styles.verticalRatingText}>{(product.rating ?? 0).toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Horizontal Card Styles
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  horizontalImageContainer: {
    width: 130,
    height: 130,
  },
  horizontalImage: {
    width: '100%',
    height: '100%',
  },
  horizontalContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 4,
  },
  reviewsCount: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  mrp: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonInCart: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  cartCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  // Vertical Card Styles
  verticalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 6,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  verticalImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  verticalImage: {
    width: '100%',
    height: '100%',
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalContent: {
    padding: 12,
  },
  verticalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
    minHeight: 36,
  },
  verticalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verticalRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  verticalReviewsCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 3,
  },
  verticalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  verticalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  verticalMrp: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  verticalAddButtonFloating: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  verticalRatingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
});
