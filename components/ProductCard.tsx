import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Check, Package, Plus } from 'lucide-react-native';
import type { Product } from '@/types/catalog';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Colors, getComponentTheme } from '@/constants/theme';
import { formatRate, pricePerKg } from '@/lib/perKg';

const badge = getComponentTheme(Colors).badge;

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
function PerKgTag({ perKg }: { perKg: number }) {
  return (
    <View style={styles.perKgTag}>
      <Text style={styles.perKgText}>
        {formatRate(perKg)}
        <Text style={styles.perKgUnit}> /kg</Text>
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
      hitSlop={6}
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
  const perKg = pricePerKg(priceVal, product.pack_kg);

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
          {/* The slot keeps its height without a rate, so prices line up across a row */}
          <View style={styles.perKgSlot}>{perKg !== null && <PerKgTag perKg={perKg} />}</View>
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
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 18,
    minHeight: 36, // always reserve two lines so prices align across a row
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
    gap: 6,
    marginTop: 4,
  },
  priceMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // The bag price is the strongest thing on the card, in deep primary green
  priceSm: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  priceMd: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 1,
  },
  // Clean, modern muted strikethrough MRP in neutral slate gray
  mrp: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    textDecorationColor: '#94a3b8',
  },

  perKgTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: Colors.primary10,
  },
  perKgSlot: {
    minHeight: 21,
    marginTop: 5,
    justifyContent: 'center',
  },
  perKgText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primaryDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.1,
  },
  perKgUnit: {
    fontSize: 11,
    fontWeight: '600',
  },

  discountTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 7,
    zIndex: 2,
  },
  discountTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 0.4,
  },

  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  addPillInCart: {
    backgroundColor: Colors.primary,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  addPillTextInCart: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textWhite,
  },

  /* ── Grid card ── */
  verticalCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  verticalImageBox: {
    height: 160,
    padding: 12,
    backgroundColor: Colors.background,
  },
  verticalAdd: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  verticalContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  verticalPrice: {
    marginTop: 8,
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
