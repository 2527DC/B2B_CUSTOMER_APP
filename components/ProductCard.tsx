import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Check, Package, Plus } from 'lucide-react-native';
import type { Product } from '@/types/catalog';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Colors } from '@/constants/theme';
import { formatRate, pricePerKg } from '@/lib/perKg';

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

const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/**
 * The price paid for one bag, then the MRP it is down from.
 * Clean, modern layout with neutral muted strikethrough MRP.
 */
function PriceLine({ price, mrp, unit, size }: { price: number; mrp: number | null; unit: string; size: 'sm' | 'md' }) {
  return (
    <View style={styles.priceRow}>
      <View style={styles.priceMain}>
        <Text style={size === 'md' ? styles.priceMd : styles.priceSm}>{rupees(price)}</Text>
        {unit ? <Text style={styles.unit}>/{unit}</Text> : null}
      </View>
      {mrp !== null ? (
        <Text style={styles.mrp}>{rupees(mrp)}</Text>
      ) : null}
    </View>
  );
}

/** What one bag's price comes to per kg, the figure buyers compare across 26, 30 and 50 kg bags. */
function PerKgTag({ perKg, compact }: { perKg: number; compact?: boolean }) {
  return (
    <View style={[styles.perKgTag, compact && styles.perKgTagCompact]}>
      <Text style={[styles.perKgText, compact && styles.perKgTextCompact]}>
        {formatRate(perKg)}
        <Text style={styles.perKgUnit}>/kg</Text>
      </Text>
    </View>
  );
}

function AddPill({ count, onPress }: { count: number; onPress: () => void }) {
  const inCart = count > 0;
  return (
    <TouchableOpacity
      style={[styles.addPill, inCart && styles.addPillInCart]}
      onPress={onPress}
      activeOpacity={0.85}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={inCart ? `${count} in cart. Open product` : 'Add to cart'}
    >
      {inCart ? (
        <>
          <Check size={13} color={Colors.textWhite} strokeWidth={3} />
          <Text style={styles.addPillTextInCart}>{count}</Text>
        </>
      ) : (
        <>
          <Plus size={13} color={Colors.primary} strokeWidth={3} />
          <Text style={styles.addPillText}>ADD</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function ProductImage({ uri }: { uri?: string }) {
  if (uri && uri.trim() !== '') {
    return <Image source={{ uri }} style={styles.image} resizeMode="contain" />;
  }
  return (
    <View style={[styles.image, styles.imagePlaceholder]}>
      <Package size={28} color={Colors.textMuted} strokeWidth={1.6} />
    </View>
  );
}

function DiscountTag({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <View style={styles.discountTag}>
      <Text style={styles.discountTagText}>{percent}% OFF</Text>
    </View>
  );
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
  const struck = hasDiscount ? mrpVal : null;
  // If product.pack_kg is not directly present, try to extract weight from unit_value, pack_size or product name
  let effectivePackKg = product.pack_kg;
  if (!effectivePackKg || effectivePackKg <= 0) {
    const combinedWeightStr = `${product.unit_value || ''} ${product.pack_size || ''} ${product.name || ''}`;
    const match = combinedWeightStr.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/i);
    if (match) {
      effectivePackKg = Number(match[1]);
    }
  }
  const perKg = pricePerKg(priceVal, effectivePackKg);

  // Read as one sentence by screen readers instead of a string of separate numbers
  const a11yLabel = [
    product.name,
    `${rupees(priceVal)} per ${unitSuffix.toLowerCase()}`,
    perKg !== null ? `${formatRate(perKg)} per kilogram` : null,
    discountPercent > 0 ? `${discountPercent}% off ${rupees(mrpVal)}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (viewMode === 'horizontal') {
    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        <View style={styles.horizontalImageBox}>
          <ProductImage uri={product.image_url} />
          <DiscountTag percent={discountPercent} />
        </View>

        <View style={styles.horizontalContent}>
          <View>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            {product.description ? (
              <Text style={styles.description} numberOfLines={1}>
                {product.description}
              </Text>
            ) : null}
          </View>

          {/* Prices stacked on the left, the add button level with their bottom on the right */}
          <View style={styles.horizontalFooter}>
            <View style={styles.horizontalPrices}>
              <PriceLine price={priceVal} mrp={struck} unit={unitSuffix} size="md" />
              {perKg !== null && <PerKgTag perKg={perKg} />}
            </View>
            <AddPill count={cartCount} onPress={handlePress} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.verticalCard}
      activeOpacity={0.9}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
    >
      <View style={styles.verticalImageBox}>
        <ProductImage uri={product.image_url} />
        <DiscountTag percent={discountPercent} />
        <View style={styles.verticalAdd}>
          <AddPill count={cartCount} onPress={handlePress} />
        </View>
      </View>

      <View style={styles.verticalContent}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.verticalPrice}>
          <PriceLine price={priceVal} mrp={struck} unit={unitSuffix} size="sm" />
          {perKg !== null && (
            <View style={styles.perKgWrap}>
              <PerKgTag perKg={perKg} compact />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  /* ── Shared ── */
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 17,
    minHeight: 34, // always reserve two compact lines so prices align across a row
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  priceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // The bag price is the strongest thing on the card, in deep primary green
  priceSm: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  priceMd: {
    fontSize: 17.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 1,
  },
  // Clean, modern red strikethrough MRP
  mrp: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626', // Vibrant crimson red for strike-through discount comparison
    textDecorationLine: 'line-through',
    textDecorationColor: '#DC2626',
    letterSpacing: -0.2,
  },

  perKgTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: '#E8F5E9', // Light emerald tint
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  perKgTagCompact: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  perKgWrap: {
    marginTop: 4,
  },
  perKgText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  perKgTextCompact: {
    fontSize: 10.5,
  },
  perKgUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    zIndex: 2,
  },
  discountTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 0.3,
  },

  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  addPillInCart: {
    backgroundColor: Colors.primary,
  },
  addPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  addPillTextInCart: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.textWhite,
  },

  /* ── Grid card ── */
  verticalCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  verticalImageBox: {
    height: 128,
    padding: 6,
    backgroundColor: Colors.background,
  },
  verticalAdd: {
    position: 'absolute',
    right: 6,
    bottom: 6,
  },
  verticalContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  verticalPrice: {
    marginTop: 2,
  },

  /* ── List card ── */
  horizontalCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  horizontalImageBox: {
    width: 112,
    height: 112,
    padding: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  horizontalContent: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 2,
    justifyContent: 'space-between',
  },
  horizontalFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  horizontalPrices: {
    flexShrink: 1,
    gap: 5,
  },
});
