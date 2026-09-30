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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingBag, Trash2, Plus, Minus, Check, Store, ArrowRight } from 'lucide-react-native';
import { useCart, CartItem } from '@/context/CartContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { URLs } from '@/config/urls';
import { Colors } from '@/constants/theme';
import QtyInput from '@/components/QtyInput';

export default function CartScreen() {
  const {
    cartItems,
    cartMap,
    cartSelectedCount,
    selectedTotal,
    isLoading,
    fetchCart,
    updateQty,
    removeItem,
    selectUnselectItem,
    selectUnselectSeller,
    selectUnselectAll,
  } = useCart();

  const router = useRouter();

  // Helper to determine if all items in a seller's group are selected
  const isSellerAllSelected = (sellerItems: CartItem[]) => {
    return sellerItems.every((item) => item.is_select === 1);
  };

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        {cartItems.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </Text>
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
            {Object.keys(cartMap).map((sellerId) => {
              const sellerItems = cartMap[sellerId];
              const sellerName = sellerItems[0]?.seller?.seller_shop_name || `Seller #${sellerId}`;
              const sellerSelected = isSellerAllSelected(sellerItems);

              return (
                <View key={sellerId} style={styles.sellerGroup}>
                  {/* Seller Header */}
                  <View style={styles.sellerHeader}>
                    <TouchableOpacity
                      onPress={() => selectUnselectSeller(parseInt(sellerId), !sellerSelected)}
                      style={[styles.checkbox, sellerSelected && styles.checkboxActive]}
                      activeOpacity={0.7}
                    >
                      {sellerSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                    </TouchableOpacity>
                    <Store size={18} color="#475569" style={styles.storeIcon} />
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {sellerName}
                    </Text>
                  </View>

                  {/* Seller Items */}
                  <View style={styles.itemsList}>
                    {sellerItems.map((item) => {
                      const productName = item.product?.product?.product_name || 'Product Details';
                      // sku is an object from the API — extract the sku string field from it
                      const skuName = (item.product?.sku as any)?.sku || 'Default';
                      const thumbSrc =
                        (item.product?.product as any)?.thumbnail_image_source ||
                        (item.product?.product as any)?.thumbnail_image_url;
                      const productImg = thumbSrc ? URLs.assetUrl(thumbSrc) : null;
                      const itemSelected = item.is_select === 1;

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
                                <ShoppingBag size={20} color="#94a3b8" />
                              </View>
                            )}
                          </View>

                          {/* Product Details */}
                          <View style={styles.productDetails}>
                            <Text style={styles.productName} numberOfLines={1}>
                              {productName}
                            </Text>
                            <Text style={styles.skuName} numberOfLines={1}>
                              SKU: {skuName}
                            </Text>
                            <Text style={styles.priceText}>
                              ₹{item.price.toLocaleString('en-IN')}
                            </Text>

                            {/* Stepper & Actions Row */}
                            <View style={styles.actionsRow}>
                              <View style={styles.stepper}>
                                <TouchableOpacity
                                  onPress={() => handleQtyChange(item, item.qty - 1)}
                                  disabled={item.qty <= 1}
                                  style={[styles.stepperBtn, item.qty <= 1 && styles.stepperBtnDisabled]}
                                >
                                  <Minus size={14} color={item.qty <= 1 ? '#cbd5e1' : '#475569'} />
                                </TouchableOpacity>
                                <QtyInput
                                  value={item.qty}
                                  onCommit={(qty) => handleQtyChange(item, qty)}
                                  style={styles.stepperValue}
                                />
                                <TouchableOpacity
                                  onPress={() => handleQtyChange(item, item.qty + 1)}
                                  style={styles.stepperBtn}
                                >
                                  <Plus size={14} color="#475569" />
                                </TouchableOpacity>
                              </View>

                              <TouchableOpacity
                                onPress={() => removeItem(item.id)}
                                style={styles.deleteBtn}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Checkout Panel */}
          <View style={styles.checkoutPanel}>
            {/* Summary Row — at top for immediate visibility */}
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.totalLabel}>Selected Total</Text>
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
                  colors={cartSelectedCount === 0 ? ['#94a3b8', '#cbd5e1'] : [Colors.primaryDark, Colors.primary]}
                  style={styles.checkoutBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.checkoutBtnText}>
                    Checkout {cartSelectedCount > 0 ? `(${cartSelectedCount})` : ''}
                  </Text>
                  <ArrowRight size={16} color="#fff" style={{ marginLeft: 6 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Select All row — below total */}
            <View style={styles.selectAllRow}>
              <TouchableOpacity
                onPress={() => selectUnselectAll(!isAllSelected())}
                style={[styles.checkbox, isAllSelected() && styles.checkboxActive]}
                activeOpacity={0.7}
              >
                {isAllSelected() && <Check size={14} color="#fff" strokeWidth={3} />}
              </TouchableOpacity>
              <Text style={styles.selectAllText}>Select All ({cartItems.length} items)</Text>
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
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
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  sellerGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  storeIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  itemsList: {
    paddingVertical: 8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productImageWrapper: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginLeft: 12,
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
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  skuName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
  },
  stepperBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  stepperBtnDisabled: {
    opacity: 0.5,
  },
  stepperValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    paddingHorizontal: 8,
    textAlign: 'center',
    minWidth: 44,
  },
  deleteBtn: {
    padding: 6,
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    gap: 12,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  checkoutBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
  },
  checkoutBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
