import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Star, Plus } from 'lucide-react-native';
import { Product } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface ProductCardProps {
  product: Product;
  viewMode: 'horizontal' | 'vertical';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/product/${product.id}`);
  };

  if (viewMode === 'horizontal') {
    return (
      <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={handlePress}>
        <View style={styles.horizontalImageContainer}>
          <Image source={{ uri: product.image_url }} style={styles.horizontalImage} resizeMode="cover" />
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({product.reviews_count})</Text>
          </View>
          <Text style={styles.description} numberOfLines={1}>{product.description}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${product.price.toFixed(2)}</Text>
            <TouchableOpacity style={styles.addButton}>
              <Plus size={22} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.verticalCard} activeOpacity={0.8} onPress={handlePress}>
      <View style={styles.verticalImageContainer}>
        <Image source={{ uri: product.image_url }} style={styles.verticalImage} resizeMode="cover" />
        <TouchableOpacity style={styles.heartButton}>
          <Star size={18} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
        </TouchableOpacity>
      </View>
      <View style={styles.verticalContent}>
        <Text style={styles.verticalProductName} numberOfLines={2}>{product.name}</Text>
        <View style={styles.verticalRatingContainer}>
          <Star size={12} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
          <Text style={styles.verticalRatingText}>{product.rating.toFixed(1)}</Text>
          <Text style={styles.verticalReviewsCount}>({product.reviews_count})</Text>
        </View>
        <View style={styles.verticalPriceRow}>
          <Text style={styles.verticalPrice}>${product.price.toFixed(2)}</Text>
          <TouchableOpacity style={styles.verticalAddButton}>
            <Plus size={20} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
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
    color: '#2563eb',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    height: 140,
    position: 'relative',
    backgroundColor: '#f8fafc',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 3,
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
    marginTop: 8,
  },
  verticalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
  },
  verticalAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
