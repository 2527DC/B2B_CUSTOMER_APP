import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Trash2, Plus, Minus, Check, ArrowRight } from 'lucide-react-native';
import { useCart, CartItem } from '@/context/CartContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import QtyInput from '@/components/QtyInput';
import { CartRecommendationsSection } from '@/components/CartRecommendationsSection';
import { useBottomSpacing } from '@/hooks/useBottomSpacing';

export default function CartScreen() {
  const { tabBarHeight } = useBottomSpacing();
  const {
    cartItems,
    cartSelectedCount,
    selectedTotal,
    isLoading,
    fetchCart,
    updateQty,
    removeItem,
    selectUnselectItem,
    selectUnselectAll,
  } = useCart();

  const router = useRouter();

  // Helper to determine if all items in the entire cart are selected
  const isAllSelected = () => {
    if (cartItems.length === 0) return false;
    return cartItems.every((item) => item.is_select === 1);
  };

  const handleQtyChange = async (item: CartItem, newQty: number) => {
    if (newQty < 1) return;
    await updateQty(item.id, newQty);
  };

  if (isLoading && cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSub}>B2B Wholesale Orders</Text>
        </View>
        {cartItems.length > 0 && (
          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>
        )}
      </View>

      {cartItems.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchCart} />}
        >
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            {"Looks like you haven't added anything to your B2B cart yet."}
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.container}>
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchCart} />}
          >
            {/* Select All Bar */}
            <View style={styles.selectAllHeader}>
              <TouchableOpacity
                onPress={() => selectUnselectAll(!isAllSelected())}
                style={styles.selectAllBtn}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, isAllSelected() && styles.checkboxActive]}>
                  {isAllSelected() && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
                <Text style={styles.selectAllText}>
                  Select All ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
                </Text>
              </TouchableOpacity>

              {cartSelectedCount > 0 && (
                <View style={styles.selectedCountBadge}>
                  <Text style={styles.selectedCountBadgeText}>
                    {cartSelectedCount} selected
                  </Text>
                </View>
              )}
            </View>

            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {cartItems.map((item) => {
                const productName = item.product?.product?.product_name || 'Product Details';
                const skuName = (item.product?.sku as any)?.sku || 'Default';
                const thumbSrc =
                  (item.product?.product as any)?.thumbnail_image_source ||
                  (item.product?.product as any)?.thumbnail_image_url;
                const productImg = thumbSrc ? URLs.assetUrl(thumbSrc) : null;
                const itemSelected = item.is_select === 1;
                const lineTotal = item.price * item.qty;

                return (
                  <View key={item.id} style={styles.itemCard}>
                    {/* Item Checkbox */}
                    <TouchableOpacity
                      onPress={() => selectUnselectItem(item.id, !itemSelected)}
                      style={[styles.checkbox, itemSelected && styles.checkboxActive]}
                      activeOpacity={0.7}
                    >
                      {itemSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                    </TouchableOpacity>

                    {/* Product Image */}
                    <View style={styles.productImageWrapper}>
                      {productImg ? (
                        <Image source={{ uri: productImg }} style={styles.productImage} />
                      ) : (
                        <View style={styles.fallbackImage}>
                          <ShoppingBag size={22} color="#94a3b8" />
                        </View>
                      )}
                    </View>

                    {/* Product Details */}
                    <View style={styles.productDetails}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {productName}
                      </Text>

                      {skuName && skuName !== 'Default' && (
                        <View style={styles.skuBadge}>
                          <Text style={styles.skuBadgeText} numberOfLines={1}>
                            SKU: {skuName}
                          </Text>
                        </View>
                      )}

                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>
                          ₹{item.price.toLocaleString('en-IN')}
                          <Text style={styles.unitText}> / unit</Text>
                        </Text>
                        {item.qty > 1 && (
                          <Text style={styles.lineTotalText}>
                            Total: ₹{lineTotal.toLocaleString('en-IN')}
                          </Text>
                        )}
                      </View>

                      {/* Stepper & Actions Row */}
                      <View style={styles.actionsRow}>
                        <View style={styles.stepper}>
                          <TouchableOpacity
                            onPress={() => handleQtyChange(item, item.qty - 1)}
                            disabled={item.qty <= 1}
                            style={[styles.stepperBtn, item.qty <= 1 && styles.stepperBtnDisabled]}
                            activeOpacity={0.7}
                          >
                            <Minus
                              size={14}
                              color={item.qty <= 1 ? '#cbd5e1' : '#334155'}
                              strokeWidth={2.5}
                            />
                          </TouchableOpacity>

                          <QtyInput
                            value={item.qty}
                            min={1}
                            unitPrice={item.price}
                            productName={productName}
                            onCommit={(qty) => handleQtyChange(item, qty)}
                            style={styles.stepperValue}
                          />

                          <TouchableOpacity
                            onPress={() => handleQtyChange(item, item.qty + 1)}
                            style={styles.stepperBtn}
                            activeOpacity={0.7}
                          >
                            <Plus size={14} color="#334155" strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => removeItem(item.id)}
                          style={styles.deleteBtn}
                          activeOpacity={0.7}
                          accessibilityLabel="Remove item"
                        >
                          <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Quick Restock & Frequently Ordered Together */}
            <CartRecommendationsSection onItemAdded={fetchCart} />
          </ScrollView>

          {/* Sticky Floating Checkout Dock — clear of bottom navigation tab bar */}
          <View style={[styles.checkoutPanel, { marginBottom: tabBarHeight + 14 }]}>
            <View style={styles.summaryRow}>
              <View style={styles.totalInfo}>
                <Text style={styles.totalLabel}>
                  Selected Total ({cartSelectedCount} {cartSelectedCount === 1 ? 'item' : 'items'})
                </Text>
                <Text style={styles.totalPrice}>
                  ₹{selectedTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, cartSelectedCount === 0 && styles.checkoutBtnDisabled]}
                disabled={cartSelectedCount === 0}
                onPress={() => router.push('/checkout')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    cartSelectedCount === 0
                      ? ['#94a3b8', '#cbd5e1']
                      : [Colors.primaryDark, Colors.primary]
                  }
                  style={styles.checkoutBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.checkoutBtnText}>Checkout</Text>
                  <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  itemCountBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  itemCountText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  selectAllHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  selectedCountBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  itemsList: {
    gap: 12,
    marginBottom: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productImageWrapper: {
    width: 76,
    height: 76,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginLeft: 10,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 19,
  },
  skuBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  skuBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  lineTotalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 3,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepperBtnDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.4,
    elevation: 0,
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 6,
    textAlign: 'center',
    minWidth: 40,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  checkoutPanel: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalInfo: {
    flex: 1,
    marginRight: 12,
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  checkoutBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
