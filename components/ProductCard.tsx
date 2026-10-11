import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Check, Package, Plus } from 'lucide-react-native';
import { Product } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import { Colors, getComponentTheme } from '@/constants/theme';

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
 * Struck price, selling price and unit on one shared baseline.
 * Rendered as a single Text so the parts never wrap apart; it shrinks slightly on narrow cards.
 */
function PriceLine({ price, mrp, unit, size }: { price: number; mrp: number | null; unit: string; size: 'sm' | 'md' }) {
  const amount = size === 'md' ? styles.amountMd : styles.amountSm;
  return (
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {mrp !== null ? (
        <>
          <Text style={[amount, styles.struck]}>{rupees(mrp)}</Text>
          <Text style={amount}> </Text>
        </>
      ) : null}
      <Text style={[amount, styles.selling]}>{rupees(price)}</Text>
      {unit ? <Text style={styles.unit}> / {unit}</Text> : null}
    </Text>
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

  if (viewMode === 'horizontal') {
    return (
      <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.9} onPress={handlePress}>
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

          {/* Price gets the full width; the add button sits below it on the right */}
          <View style={styles.horizontalFooter}>
            <PriceLine price={priceVal} mrp={struck} unit={unitSuffix} size="md" />
            <View style={styles.horizontalAdd}>
              <AddPill count={cartCount} onPress={handlePress} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.verticalCard} activeOpacity={0.9} onPress={handlePress}>
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
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 19,
    minHeight: 38, // always reserve two lines so prices align across a row
    letterSpacing: -0.1,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  amountSm: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  amountMd: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  struck: {
    color: badge.dangerText,
    fontWeight: '600',
    textDecorationLine: 'line-through',
    textDecorationColor: badge.dangerText,
  },
  selling: {
    color: Colors.primary,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  discountTag: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 10,
  },
  discountTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textWhite,
    letterSpacing: 0.4,
  },

  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 9,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    letterSpacing: 0.4,
  },
  addPillTextInCart: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textWhite,
  },

  /* ── Grid card ── */
  verticalCard: {
    flex: 1,
    margin: 6,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
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
    marginTop: 6,
    gap: 8,
  },
  horizontalAdd: {
    alignItems: 'flex-end',
  },
});
