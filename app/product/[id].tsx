import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, Alert,
  KeyboardAvoidingView, Keyboard, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Star, Heart, ShoppingCart,
  Plus, Minus, ShieldCheck, Truck, RotateCcw, Tag,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { useCart } from '@/context/CartContext';
import { Colors } from '@/constants/theme';
import QtyInput from '@/components/QtyInput';

const { width } = Dimensions.get('window');

// ─── API response types (matching actual backend shape) ────────────────────────
interface GalleryImage {
  id: number;
  images_source: string;
}
interface Brand {
  id: number;
  name: string;
  logo: string;
}
interface ProductInfo {
  id: number;
  mrp?: number;
  product_name: string;
  thumbnail_image_source: string;
  description?: string;
  specification?: string;
  gallary_images?: GalleryImage[];
  brand?: Brand;
  minimum_order_qty?: number;
  max_order_qty?: number;
  created_by?: number;
}
interface WholesalePrice {
  id: number;
  min_qty: number;
  max_qty: number | null; // null = no upper limit
  selling_price: number;
  sell_price?: number;
}
interface Sku {
  id: number;
  sku?: string;
  variant_name?: string;
  attributes?: { name: string; value: string }[];
  variant_image?: string;
  mrp?: number;
  selling_price: number;
  product_stock: number;
  whole_sale_prices?: WholesalePrice[];
}
interface Seller {
  id?: number;
  name: string;
  phone?: string;
  description?: string;
}
interface ProductData {
  id: number;
  product_name: string;
  min_sell_price: number;
  max_sell_price: number;
  avg_rating?: number;
  total_sale?: number;
  product: ProductInfo;
  skus?: Sku[];
  seller?: Seller;
}
interface ApiResponse {
  data: ProductData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const assetUrl = (path?: string): string => URLs.assetUrl(path);

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addToCart, cartItems } = useCart();

  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null);

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const url = `${URLs.ALL_PRODUCTS}/${id}`;
      console.log('[ProductDetail] REQUEST →', url);
      const res = await apiClient.get<ApiResponse>(url);
      console.log('[ProductDetail] status:', res.status, 'keys:', Object.keys(res.data));
      setData(res.data.data);
      // Default to the first variant that has stock, else the first one
      const skus = res.data.data?.skus ?? [];
      const initial = skus.find((s) => s.product_stock > 0) ?? skus[0];
      setSelectedSkuId(initial ? initial.id : null);
      setQuantity(Math.max(1, res.data.data?.product?.minimum_order_qty ?? 1));
    } catch (err: any) {
      console.error('[ProductDetail] Error:', err?.message, err?.response?.status);
      setError('Could not load product details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!sku || !data) return;
    Keyboard.dismiss();
    const orderQty = Math.max(minQty, maxQty ? Math.min(maxQty, quantity) : quantity);
    if (orderQty !== quantity) setQuantity(orderQty);
    setAddingToCart(true);
    try {
      const sellerId = data.product?.created_by ?? data.seller?.id ?? 1;
      const success = await addToCart(
        data.id,
        sku.id,
        orderQty,
        sellPrice,
        sellerId
      );
      if (success) {
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 2000);
      } else {
        Alert.alert('Error', 'Failed to add item to cart.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'An error occurred while adding to cart.');
    } finally {
      setAddingToCart(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Product Not Found</Text>
        <Text style={styles.errorSubtitle}>{error ?? 'The product does not exist.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const p = data.product;
  const skus = data.skus ?? [];
  const hasVariants = skus.length > 1;
  const sku = skus.find((s) => s.id === selectedSkuId) ?? skus[0];

  // Pricing follows the selected variant: its wholesale tier for the current quantity, else its own price
  const wholeSalePrices: WholesalePrice[] = [...(sku?.whole_sale_prices ?? [])].sort((a, b) => a.min_qty - b.min_qty);
  const tierPrice = (t: WholesalePrice) => t.sell_price ?? t.selling_price;
  const activeTier = wholeSalePrices.find(
    (t) => quantity >= t.min_qty && (t.max_qty == null || t.max_qty <= 0 || quantity <= t.max_qty)
  );
  const baseSellPrice = sku?.selling_price ?? data.min_sell_price ?? 0;
  const sellPrice = activeTier ? tierPrice(activeTier) : baseSellPrice;
  const mrpPrice  = sku?.mrp ?? p?.mrp ?? data.max_sell_price ?? baseSellPrice;
  const hasDiscount = mrpPrice > sellPrice;
  const discountPct = hasDiscount ? Math.round(((mrpPrice - sellPrice) / mrpPrice) * 100) : 0;
  const inStock = (sku?.product_stock ?? 1) >= 0; // stock_manage=0 means always in stock
  // Next cheaper tier, to nudge bigger orders
  const nextTier = wholeSalePrices.find((t) => t.min_qty > quantity && tierPrice(t) < sellPrice);

  const selectVariant = (next: Sku) => {
    if (next.id === sku?.id) return;
    setSelectedSkuId(next.id);
    setActiveImage(0);
  };
  const rating = data.avg_rating ?? 0;
  const totalSales = data.total_sale ?? 0;

  // Gallery: thumbnail first, then gallery images
  const galleryUris = [
    ...(sku?.variant_image ? [assetUrl(sku.variant_image)] : []),
    assetUrl(p?.thumbnail_image_source),
    ...(p?.gallary_images ?? []).map(g => assetUrl(g.images_source)),
  ].filter(Boolean);

  const heroUri = galleryUris[activeImage] ?? galleryUris[0] ?? '';
  const minQty = p?.minimum_order_qty ?? 1;
  const maxQty = p?.max_order_qty && p.max_order_qty > 0 ? p.max_order_qty : undefined;

  // Cart summary: distinct lines in the whole cart, units of this product already in it
  const cartLineCount = cartItems.length;
  // Cart items carry the SKU id in item.product.id; count only the selected variant when there are several
  const inCartQty = cartItems
    .filter((item) => item.product_id === data.id && (!hasVariants || item.product?.id === sku?.id))
    .reduce((sum, item) => sum + item.qty, 0);
  const openCart = () => router.push('/(tabs)/cart');

  const formatINR = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const lineTotal = sellPrice * quantity;
  const lineBreakdown = `${quantity} × ${formatINR(sellPrice)}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Floating Header */}
      <View style={[styles.floatingHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color="#1e293b" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.7}
          >
            <Heart size={22} color={isFavorite ? '#ef4444' : '#64748b'} fill={isFavorite ? '#ef4444' : 'none'} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn} onPress={openCart} activeOpacity={0.7}>
            <ShoppingCart size={22} color={Colors.text} strokeWidth={2} />
            {cartLineCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartLineCount > 99 ? '99+' : cartLineCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        <View style={[styles.imageContainer, { marginTop: insets.top + 56 }]}>
          {heroUri ? (
            <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.10)', 'transparent']} style={styles.imageGradient} />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPct}% OFF</Text>
            </View>
          )}
        </View>

        {/* Thumbnail strip (if multiple images) */}
        {galleryUris.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbStrip}>
            {galleryUris.map((uri, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveImage(i)} activeOpacity={0.8}>
                <Image
                  source={{ uri }}
                  style={[styles.thumb, i === activeImage && styles.thumbActive]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Details Card */}
        <View style={styles.detailsCard}>
          {/* Brand chip */}
          {p?.brand && (
            <View style={styles.brandRow}>
              {p.brand.logo && p.brand.logo.trim() !== '' ? (
                <Image
                  source={{ uri: assetUrl(p.brand.logo) }}
                  style={styles.brandLogo}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.brandLogo, { backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>
                    {p.brand.name ? p.brand.name.substring(0, 2).toUpperCase() : 'B'}
                  </Text>
                </View>
              )}
              <Text style={styles.brandName}>{p.brand.name}</Text>
            </View>
          )}

          {/* Name */}
          <Text style={styles.productName}>{data.product_name}</Text>

          {/* Rating + Sales */}
          <View style={styles.metaRow}>
            {rating > 0 && (
              <View style={styles.ratingChip}>
                <Star size={13} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
            )}
            {totalSales > 0 && (
              <Text style={styles.salesText}>{totalSales} sold</Text>
            )}
          </View>

          {/* Pricing */}
          <View style={styles.pricingRow}>
            <Text style={styles.sellPrice}>₹{sellPrice.toFixed(0)}</Text>
            {hasDiscount && (
              <Text style={styles.mrpText}>₹{mrpPrice.toFixed(0)}</Text>
            )}
            <View style={[styles.stockBadge, !inStock && styles.outOfStockBadge]}>
              <View style={[styles.stockDot, !inStock && styles.outOfStockDot]} />
              <Text style={[styles.stockText, !inStock && styles.outOfStockText]}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {activeTier && (
            <Text style={styles.tierAppliedText}>
              Wholesale price for {quantity} units (regular {formatINR(baseSellPrice)})
            </Text>
          )}

          {/* Min order note */}
          {minQty > 1 && (
            <View style={styles.minOrderRow}>
              <Tag size={12} color="#64748b" />
              <Text style={styles.minOrderText}>Minimum order: {minQty} units</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Variant picker: one row, scrolls horizontally when it overflows */}
          {hasVariants && (
            <>
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Select Variant</Text>
                  <Text style={styles.sectionHint}>{skus.length} options</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.variantRow}
                >
                  {skus.map((v) => {
                    const selected = v.id === sku?.id;
                    const outOfStock = v.product_stock <= 0;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => selectVariant(v)}
                        activeOpacity={0.8}
                        style={[
                          styles.variantChip,
                          selected && styles.variantChipActive,
                          outOfStock && !selected && styles.variantChipMuted,
                        ]}
                      >
                        <Text
                          style={[styles.variantName, selected && styles.variantNameActive]}
                          numberOfLines={1}
                        >
                          {v.variant_name || v.sku || `#${v.id}`}
                        </Text>
                        <Text style={[styles.variantPrice, selected && styles.variantPriceActive]}>
                          {formatINR(v.selling_price)}
                        </Text>
                        {(v.whole_sale_prices?.length ?? 0) > 0 && (
                          <Text style={[styles.variantMeta, selected && styles.variantMetaActive]}>
                            Bulk from {formatINR(Math.min(...v.whole_sale_prices!.map(tierPrice)))}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Wholesale pricing table for the selected variant */}
          {wholeSalePrices.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Bulk / Wholesale Pricing</Text>
                {hasVariants && (
                  <Text style={styles.sectionHint} numberOfLines={1}>
                    {sku?.variant_name}
                  </Text>
                )}
              </View>
              <View style={[styles.wholesaleRow, styles.wholesaleHeaderRow]}>
                <Text style={styles.wholesaleHeaderText}>Quantity</Text>
                <Text style={styles.wholesaleHeaderText}>Price / unit</Text>
              </View>
              <View style={[styles.wholesaleRow, !activeTier && styles.wholesaleRowActive]}>
                <Text style={[styles.wholesaleQty, !activeTier && styles.wholesaleQtyActive]}>
                  {wholeSalePrices[0].min_qty > 1 ? `1 – ${wholeSalePrices[0].min_qty - 1} units` : 'Regular price'}
                </Text>
                <Text style={styles.wholesalePrice}>{formatINR(baseSellPrice)}</Text>
              </View>
              {wholeSalePrices.map((tier) => {
                const isActive = tier.id === activeTier?.id;
                const range = tier.max_qty && tier.max_qty > 0
                  ? `${tier.min_qty} – ${tier.max_qty} units`
                  : `${tier.min_qty}+ units`;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    activeOpacity={0.7}
                    onPress={() => setQuantity(maxQty ? Math.min(maxQty, tier.min_qty) : tier.min_qty)}
                    style={[styles.wholesaleRow, isActive && styles.wholesaleRowActive]}
                  >
                    <Text style={[styles.wholesaleQty, isActive && styles.wholesaleQtyActive]}>{range}</Text>
                    <Text style={styles.wholesalePrice}>{formatINR(tierPrice(tier))}</Text>
                  </TouchableOpacity>
                );
              })}
              {nextTier && (
                <Text style={styles.nextTierText}>
                  Add {nextTier.min_qty - quantity} more to pay {formatINR(tierPrice(nextTier))} per unit
                </Text>
              )}
            </View>
          )}

          {wholeSalePrices.length > 0 && <View style={styles.divider} />}

          {/* Description */}
          {!!p?.description && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Product Details</Text>
                <Text style={styles.descText}>{p.description}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Specification */}
          {!!p?.specification && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Specifications</Text>
                <Text style={styles.descText}>{p.specification}</Text>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Seller info */}
          {data.seller && (
            <View style={styles.sellerCard}>
              <Text style={styles.sellerLabel}>Sold by</Text>
              <Text style={styles.sellerName}>{data.seller.name}</Text>
              {data.seller.phone && (
                <Text style={styles.sellerPhone}>{data.seller.phone}</Text>
              )}
            </View>
          )}

          {/* Delivery & Returns */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Truck size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.featureTitle}>Free Delivery</Text>
                <Text style={styles.featureSub}>On orders over ₹500</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <RotateCcw size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.featureTitle}>Easy Returns</Text>
                <Text style={styles.featureSub}>30-day return window</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {inCartQty > 0 && (
          <TouchableOpacity style={styles.inCartRow} onPress={openCart} activeOpacity={0.8}>
            <Text style={styles.inCartText}>
              {inCartQty} {inCartQty === 1 ? 'unit' : 'units'} of this {hasVariants ? 'variant' : 'product'} in your cart
            </Text>
            <Text style={styles.inCartLink}>View Cart ›</Text>
          </TouchableOpacity>
        )}
        <View style={styles.bottomActions}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(Math.max(minQty, quantity - 1))}
            >
              <Minus size={16} color="#475569" strokeWidth={2.5} />
            </TouchableOpacity>
            <QtyInput
              value={quantity}
              min={minQty}
              max={maxQty}
              onCommit={setQuantity}
              live
              keypadLabel={`${lineBreakdown} = ${formatINR(lineTotal)}`}
              style={styles.qtyVal}
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity(maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)}
            >
              <Plus size={16} color="#475569" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cartButton}
            onPress={handleAddToCart}
            disabled={addingToCart || addedSuccess}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={addedSuccess ? [Colors.success, '#34a36f'] : [Colors.primaryDark, Colors.primary]}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {addingToCart ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : addedSuccess ? (
                <View style={styles.btnRow}>
                  <ShieldCheck size={20} color="#ffffff" strokeWidth={2.5} />
                  <Text style={styles.btnText}>Added ✓</Text>
                </View>
              ) : (
                <View style={styles.btnRowSplit}>
                  <View style={styles.btnAmountCol}>
                    <Text style={styles.btnAmount} numberOfLines={1} adjustsFontSizeToFit>
                      {formatINR(lineTotal)}
                    </Text>
                    <Text style={styles.btnBreakdown} numberOfLines={1} adjustsFontSizeToFit>
                      {lineBreakdown}
                    </Text>
                  </View>
                  <View style={styles.btnRow}>
                    <ShoppingCart size={18} color={Colors.textWhite} strokeWidth={2} />
                    <Text style={styles.btnText}>Add</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText:      { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 30 },
  errorTitle:       { fontSize: 22, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  errorSubtitle:    { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  backBtn:          { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 },
  backBtnText:      { color: '#ffffff', fontSize: 15, fontWeight: '700' },

  floatingHeader: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerActions: { flexDirection: 'row', gap: 10 },
  circleBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },

  scrollContent: { paddingBottom: 170 },

  imageContainer: {
    width, height: width,           // square image area
    backgroundColor: '#ffffff', position: 'relative',
  },
  heroImage:        { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#f1f5f9' },
  imageGradient:    { position: 'absolute', top: 0, left: 0, right: 0, height: 100 },
  discountBadge:    {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#ef4444', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  discountText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  thumbStrip:  { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  thumb:       { width: 64, height: 64, borderRadius: 10, marginRight: 8, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#f8fafc' },
  thumbActive: { borderColor: Colors.primary },

  detailsCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -16, paddingHorizontal: 20, paddingTop: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 5,
  },

  brandRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  brandLogo:  { width: 32, height: 32, borderRadius: 6, backgroundColor: '#f1f5f9' },
  brandName:  { fontSize: 13, fontWeight: '600', color: '#64748b' },

  productName: { fontSize: 20, fontWeight: '800', color: '#1e293b', lineHeight: 26, marginBottom: 8 },

  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  ratingText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  salesText:  { fontSize: 12, color: '#94a3b8' },

  pricingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  sellPrice:   { fontSize: 28, fontWeight: '800', color: Colors.primary },
  mrpText:     { fontSize: 17, color: '#94a3b8', textDecorationLine: 'line-through', alignSelf: 'flex-end', marginBottom: 3 },

  stockBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5',
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, gap: 5,
  },
  outOfStockBadge: { backgroundColor: '#fef2f2' },
  stockDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  outOfStockDot:   { backgroundColor: Colors.danger },
  stockText:       { fontSize: 12, fontWeight: '600', color: '#065f46' },
  outOfStockText:  { color: '#991b1b' },

  minOrderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  minOrderText: { fontSize: 12, color: '#64748b' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 18 },

  section:       { gap: 10, marginBottom: 4 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  descText:      { fontSize: 14, color: '#64748b', lineHeight: 22 },

  wholesaleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  wholesaleQty:   { fontSize: 14, color: '#475569' },
  wholesalePrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  wholesaleHeaderRow: { paddingVertical: 6 },
  wholesaleHeaderText: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase' },
  wholesaleRowActive: { backgroundColor: Colors.primary10, borderRadius: 8, paddingHorizontal: 8, borderBottomColor: 'transparent' },
  wholesaleQtyActive: { color: Colors.text, fontWeight: '700' },
  nextTierText: { fontSize: 12, fontWeight: '600', color: Colors.success, marginTop: 2 },
  tierAppliedText: { fontSize: 12, fontWeight: '600', color: Colors.success, marginBottom: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sectionHint: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },

  variantRow: { gap: 10, paddingRight: 4 },
  variantChip: {
    minWidth: 96, maxWidth: 180,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  variantChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary10 },
  variantChipMuted: { opacity: 0.5 },
  variantName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  variantNameActive: { color: Colors.primary },
  variantPrice: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },
  variantPriceActive: { color: Colors.text },
  variantMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  variantMetaActive: { color: Colors.textSecondary },

  sellerCard: {
    backgroundColor: '#f8fafc', borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  sellerLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  sellerName:  { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sellerPhone: { fontSize: 13, color: '#64748b', marginTop: 2 },

  featuresGrid: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  featureItem:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon:  { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primary10, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  featureSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inCartRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary10, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  inCartText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  inCartLink: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: Colors.textWhite, fontSize: 10, fontWeight: '800' },
  qtyContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 14, height: 52, paddingHorizontal: 6,
  },
  qtyBtn:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  qtyVal:  { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 48, paddingHorizontal: 6 },
  cartButton: {
    flex: 1, borderRadius: 14, overflow: 'hidden',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  btnGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  btnRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnRowSplit: {
    flex: 1, alignSelf: 'stretch', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, gap: 8,
  },
  btnAmountCol: { flexShrink: 1 },
  btnAmount:    { color: Colors.textWhite, fontSize: 16, fontWeight: '800' },
  btnBreakdown: { color: Colors.textWhite, fontSize: 11, fontWeight: '500', opacity: 0.85 },
  btnText:     { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
