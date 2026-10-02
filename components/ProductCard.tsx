import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Product } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Colors } from '@/constants/theme';

interface ProductCardProps {
  product: Product;
  viewMode: 'horizontal' | 'vertical';
}

function formatUnit(rawUnit: string): string {
  const u = rawUnit.trim();
  if (!u) return '';
  const lower = u.toLowerCase();
  if (lower === 'kg') return 'Kg';
  if (lower === 'gm' || lower === 'g') return 'Gm';
  if (lower === 'pcs' || lower === 'piece' || lower === 'pieces') return 'Pcs';
  if (lower === 'box') return 'Box';
  if (lower === 'bag') return 'Bag';
  if (lower === 'litre' || lower === 'ltr' || lower === 'l') return 'Litre';
  if (lower === 'ml') return 'Ml';
  if (lower === 'pkt' || lower === 'pack') return 'Pack';
  if (lower === 'tin') return 'Tin';
  if (lower === 'can') return 'Can';
  return u.charAt(0).toUpperCase() + u.slice(1);
}

function getUnitSuffix(product: Product): string {
  // Use the unit key created on the product
  const rawUnit =
    product.units ||
    product.unit_name ||
    product.unit ||
    (product as any).skus?.[0]?.unit_name;

  if (rawUnit && typeof rawUnit === 'string' && rawUnit.trim() && rawUnit.trim().length <= 20) {
    return formatUnit(rawUnit);
  }

  return 'Bag';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const router = useRouter();
  const { cartItems } = useCart();

  // How many of this product are in the cart
  const cartCount = cartItems.filter(item => item.product_id === parseInt(product.id)).reduce((sum, item) => sum + item.qty, 0);

  const handlePress = () => {
    router.push(`/product/${product.id}`);
  };

  const unitSuffix = getUnitSuffix(product);
  const priceVal = Number(product.price ?? 0);
  const mrpVal = Number(product.mrp ?? 0);
  const hasDiscount = mrpVal > priceVal;
  const discountPercent = hasDiscount ? Math.round(((mrpVal - priceVal) / mrpVal) * 100) : 0;

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

        {/* Top Right: Orange Offer Badge */}
        {hasDiscount && discountPercent > 0 ? (
          <View style={styles.horizontalOfferBadge}>
            <Text style={styles.offerBadgeText}>{discountPercent}% OFF</Text>
          </View>
        ) : null}

        <View style={styles.horizontalContent}>
          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
          <Text style={styles.description} numberOfLines={1}>{product.description}</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <View style={styles.priceWithUnitRow}>
                <Text style={styles.price}>₹{priceVal.toFixed(0)}</Text>
                {!!unitSuffix && (
                  <Text style={styles.unitSuffixText}> / {unitSuffix}</Text>
                )}
              </View>
              {hasDiscount && (
                <View style={styles.mrpRow}>
                  <Text style={styles.mrp}>₹{mrpVal.toFixed(0)}</Text>
                </View>
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

        {/* Top Right: Orange Offer Badge */}
        {hasDiscount && discountPercent > 0 ? (
          <View style={styles.offerBadgeTopRight}>
            <Text style={styles.offerBadgeText}>{discountPercent}% OFF</Text>
          </View>
        ) : null}

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
          <View style={styles.verticalPriceContainer}>
            <View style={styles.priceWithUnitRow}>
              <Text style={styles.verticalPrice}>₹{priceVal.toFixed(0)}</Text>
              {!!unitSuffix && (
                <Text style={styles.verticalUnitSuffixText}> / {unitSuffix}</Text>
              )}
            </View>
            {hasDiscount && (
              <View style={styles.mrpRow}>
                <Text style={styles.verticalMrp}>₹{mrpVal.toFixed(0)}</Text>
              </View>
            )}
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
    position: 'relative',
    backgroundColor: '#f8fafc',
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
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flex: 1,
    marginRight: 8,
  },
  priceWithUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
  },
  unitSuffixText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 3,
  },
  mrpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  mrp: {
    fontSize: 12,
    color: '#dc2626', // Strikethrough MRP in RED
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
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
    height: 165,
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  verticalImage: {
    width: '100%',
    height: '100%',
  },

  // Top Right Orange Offer Badge
  offerBadgeTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ea580c', // Bright vibrant orange for offers!
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  horizontalOfferBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: '#ea580c', // Bright vibrant orange for offers!
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  verticalContent: {
    padding: 12,
  },
  verticalProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
    minHeight: 36,
  },
  verticalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  verticalPriceContainer: {
    flex: 1,
  },
  verticalPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  verticalUnitSuffixText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 2,
  },
  verticalMrp: {
    fontSize: 12,
    color: '#dc2626', // Strikethrough MRP in RED
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  verticalAddButtonFloating: {
    position: 'absolute',
    bottom: 8,
    right: 8,
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
});
