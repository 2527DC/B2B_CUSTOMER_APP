import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { RotateCcw, Sparkles, Plus, Check, Package, Clock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { useCart } from '@/context/CartContext';
import { Colors } from '@/constants/theme';
import { formatRate, pricePerKg } from '@/lib/perKg';

export interface RecommendedItem {
  id: string;
  listing_id?: string;
  sku_id: number;
  name: string;
  price: number;
  mrp?: number;
  image_url: string;
  thumbnail_image_source?: string;
  brand_id?: string;
  brand_name?: string | null;
  unit_name?: string;
  unit?: string;
  pack_size?: string;
  pack_kg?: number;
  min_order_qty: number;
  seller_id: number;
  source?: 'RECENT_PURCHASE' | 'CROSS_SALE' | 'TOP_SELLER';
  last_ordered_days_ago?: number;
}

interface Props {
  onItemAdded?: () => void;
}

export function CartRecommendationsSection({ onItemAdded }: Props) {
  const router = useRouter();
  const { addToCart, cartItems } = useCart();
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; recommendations: RecommendedItem[] }>(
        URLs.CART_RECOMMENDATIONS
      );
      if (res.data?.success && Array.isArray(res.data.recommendations)) {
        setItems(res.data.recommendations);
      }
    } catch (err) {
      // Quiet fail to avoid blocking cart experience
      console.warn('[CartRecommendations] Error loading recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Re-fetch when items in cart change (e.g. after adding or removing)
  useEffect(() => {
    if (cartItems.length > 0) {
      // Small debounce
      const t = setTimeout(() => {
        fetchRecommendations();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [cartItems.length, fetchRecommendations]);

  const handleQuickAdd = async (item: RecommendedItem) => {
    try {
      setAddingId(item.sku_id);
      const ok = await addToCart(
        Number(item.id),
        item.sku_id,
        item.min_order_qty || 1,
        item.price,
        item.seller_id || 1
      );

      if (ok) {
        setSuccessId(item.sku_id);
        if (onItemAdded) onItemAdded();
        // Remove item from recommendation list
        setTimeout(() => {
          setItems((prev) => prev.filter((p) => p.sku_id !== item.sku_id));
          setSuccessId(null);
        }, 800);
      }
    } catch (err) {
      console.error('[CartRecommendations] Quick add failed:', err);
    } finally {
      setAddingId(null);
    }
  };

  if (loading && items.length === 0) {
    return null;
  }

  if (items.length === 0) {
    return null;
  }

  // Determine section flavor
  const isRecentRestock = items.some((i) => i.source === 'RECENT_PURCHASE');

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconCircle, isRecentRestock ? styles.iconCircleRestock : styles.iconCircleCross]}>
            {isRecentRestock ? (
              <RotateCcw size={16} color={Colors.primary} strokeWidth={2.5} />
            ) : (
              <Sparkles size={16} color="#2563eb" strokeWidth={2.5} />
            )}
          </View>
          <View>
            <Text style={styles.titleText}>
              {isRecentRestock ? 'Quick Restock (Regular Items)' : 'Frequently Ordered Together'}
            </Text>
            <Text style={styles.subtitleText}>
              {isRecentRestock
                ? 'Forgot to restock your regular store inventory?'
                : 'Complete your wholesale inventory shipment'}
            </Text>
          </View>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {items.map((item) => {
          const ratePerKg = pricePerKg(item.price, item.pack_kg);
          const isAdding = addingId === item.sku_id;
          const isSuccess = successId === item.sku_id;
          const imgSrc = item.thumbnail_image_source || item.image_url;

          return (
            <TouchableOpacity
              key={`${item.id}-${item.sku_id}`}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              {/* Product Image & Badges */}
              <View style={styles.imageWrap}>
                {imgSrc ? (
                  <Image source={{ uri: URLs.assetUrl(imgSrc) }} style={styles.productImg} resizeMode="contain" />
                ) : (
                  <View style={styles.fallbackImg}>
                    <Package size={24} color="#94a3b8" />
                  </View>
                )}

                {item.source === 'RECENT_PURCHASE' && item.last_ordered_days_ago ? (
                  <View style={styles.restockBadge}>
                    <Clock size={10} color="#047857" />
                    <Text style={styles.restockBadgeText}>
                      Ordered {item.last_ordered_days_ago}d ago
                    </Text>
                  </View>
                ) : item.source === 'CROSS_SALE' ? (
                  <View style={styles.crossBadge}>
                    <Text style={styles.crossBadgeText}>Pairing Deal</Text>
                  </View>
                ) : null}
              </View>

              {/* Title & Brand */}
              <View style={styles.infoWrap}>
                <Text style={styles.productName} numberOfLines={2}>
                  {item.name}
                </Text>

                {item.pack_size ? (
                  <Text style={styles.packText} numberOfLines={1}>
                    Pack: {item.pack_size}
                  </Text>
                ) : null}

                {/* Price and Rate per Kg */}
                <View style={styles.priceRow}>
                  <Text style={styles.priceVal}>₹{item.price.toLocaleString('en-IN')}</Text>
                  {ratePerKg !== null && (
                    <Text style={styles.rateVal}>{formatRate(ratePerKg)}/kg</Text>
                  )}
                </View>
              </View>

              {/* Quick Add Button */}
              <TouchableOpacity
                style={[
                  styles.quickAddBtn,
                  isSuccess && styles.quickAddBtnSuccess,
                  isAdding && styles.quickAddBtnDisabled,
                ]}
                onPress={() => handleQuickAdd(item)}
                disabled={isAdding || isSuccess}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isSuccess
                      ? [Colors.success, '#15803d']
                      : [Colors.primaryDark, Colors.primary]
                  }
                  style={styles.btnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isAdding ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : isSuccess ? (
                    <View style={styles.btnContent}>
                      <Check size={13} color="#ffffff" strokeWidth={3} />
                      <Text style={styles.btnText}>Added ✓</Text>
                    </View>
                  ) : (
                    <View style={styles.btnContent}>
                      <Plus size={13} color="#ffffff" strokeWidth={3} />
                      <Text style={styles.btnText}>+ Add ({item.min_order_qty} MOQ)</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleRestock: {
    backgroundColor: Colors.primary10,
  },
  iconCircleCross: {
    backgroundColor: '#eff6ff',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 172,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 105,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImg: {
    width: '88%',
    height: '88%',
  },
  fallbackImg: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  restockBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  restockBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  crossBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  crossBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  infoWrap: {
    marginTop: 8,
    gap: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    minHeight: 36,
  },
  packText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 4,
  },
  priceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  rateVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  quickAddBtn: {
    marginTop: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quickAddBtnSuccess: {
    backgroundColor: Colors.success,
  },
  quickAddBtnDisabled: {
    opacity: 0.7,
  },
  btnGradient: {
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
