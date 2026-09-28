import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Store, CreditCard, ChevronRight, Plus, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCart } from '@/context/CartContext';
import apiClient from '@/config/api';
import { URLs } from '@/config/urls';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

interface Address {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  is_shipping_default: number;
  is_billing_default: number;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const { fetchCart } = useCart();

  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<Address | null>(null);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<Address | null>(null);
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<Record<string, any>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressModalType, setAddressModalType] = useState<'shipping' | 'billing'>('shipping');
  const [newAddressVisible, setNewAddressVisible] = useState(false);

  // New Address Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formCountry, setFormCountry] = useState('India');
  const [formPostalCode, setFormPostalCode] = useState('');

  // Calculations state
  const [subTotal, setSubTotal] = useState(0);
  const [shippingTotal, setShippingTotal] = useState(0);
  const [gstTotal, setGstTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [packageCount, setPackageCount] = useState(0);
  const [totalQty, setTotalQty] = useState(0);

  const loadCheckoutDetails = async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch addresses
      const addressRes = await apiClient.get(URLs.ADDRESS_LIST);
      const addressList = addressRes.data?.addresses || [];
      setAddresses(addressList);
      
      const defaultShipping = addressList.find((a: Address) => a.is_shipping_default === 1) || addressList[0] || null;
      const defaultBilling = addressList.find((a: Address) => a.is_billing_default === 1) || addressList[0] || null;
      
      setSelectedShippingAddress(defaultShipping);
      setSelectedBillingAddress(defaultBilling);

      // 2. Fetch checkout items/packages
      const checkoutRes = await apiClient.get(URLs.CHECKOUT);
      if (checkoutRes.data && checkoutRes.data.packages) {
        setCheckoutData(checkoutRes.data);
        
        // Initialize default shipping method for each package
        const initialMethods: Record<string, any> = {};
        Object.entries(checkoutRes.data.packages).forEach(([pkgKey, pkgValue]: [string, any]) => {
          if (pkgValue.shipping && pkgValue.shipping.length > 0) {
            initialMethods[pkgKey] = pkgValue.shipping[0];
          }
        });
        setSelectedShippingMethods(initialMethods);
      } else {
        Alert.alert('Checkout Empty', 'You have no selected items to checkout.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error('Failed to load checkout information:', error);
      Alert.alert('Error', 'Unable to fetch checkout details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCheckoutDetails();
  }, []);

  // Update calculations whenever packages, selected shipping methods, or shipping address state changes
  useEffect(() => {
    if (!checkoutData || !checkoutData.packages) return;

    let sub = 0;
    let qty = 0;
    let pkgCount = Object.keys(checkoutData.packages).length;

    // Calculate subtotal and item quantities
    Object.values(checkoutData.packages).forEach((pkg: any) => {
      pkg.items.forEach((item: any) => {
        sub += item.price * item.qty;
        qty += item.qty;
      });
    });

    // Calculate shipping cost
    let shipCost = 0;
    let shipAdditional = 0;
    Object.entries(checkoutData.packages).forEach(([pkgKey, pkgValue]: [string, any]) => {
      const selectedMethod = selectedShippingMethods[pkgKey] || pkgValue.shipping?.[0];
      if (!selectedMethod) return;

      pkgValue.items.forEach((item: any) => {
        let itemShipping = 0;
        if (selectedMethod.cost_based_on === 'Price') {
          itemShipping = (item.price / 100) * (selectedMethod.cost || 0);
        } else if (selectedMethod.cost_based_on === 'Weight') {
          const weight = parseFloat(item.product?.weight || '0') || 0;
          itemShipping = (weight / 100) * (selectedMethod.cost || 0);
        } else {
          itemShipping = selectedMethod.cost || 0;
        }
        shipCost += itemShipping * item.qty;
        shipAdditional += (item.product?.sku?.additional_shipping || 0) * item.qty;
      });
    });
    const finalShipCost = shipCost + shipAdditional;

    // Calculate GST Tax
    let gstSum = 0;
    const sameState = selectedShippingAddress?.state === 'Karnataka'; // placeholder matching state
    const flatGstPct = checkoutData.flat_gst?.tax_percentage || 0;
    const isGstEnabled = checkoutData.is_gst_enable === 1;
    const isGstModuleEnabled = checkoutData.is_gst_module_enable === 1;

    Object.values(checkoutData.packages).forEach((pkg: any) => {
      pkg.items.forEach((item: any) => {
        let taxRate = flatGstPct;
        if (item.product?.product?.gst_group) {
          try {
            const gstGroup = item.product.product.gst_group;
            const sameStateGst = JSON.parse(gstGroup.same_state_gst || '{}');
            const outsideStateGst = JSON.parse(gstGroup.outsite_state_gst || '{}');
            
            let rateSum = 0;
            const gstMap = sameState ? sameStateGst : outsideStateGst;
            Object.values(gstMap).forEach((val: any) => {
              rateSum += parseFloat(val) || 0;
            });
            taxRate = rateSum;
          } catch (e) {
            taxRate = flatGstPct;
          }
        } else if (isGstModuleEnabled && isGstEnabled) {
          taxRate = flatGstPct;
        }
        gstSum += ((item.price * item.qty) * taxRate) / 100;
      });
    });

    setSubTotal(sub);
    setTotalQty(qty);
    setPackageCount(pkgCount);
    setShippingTotal(finalShipCost);
    setGstTotal(gstSum);
    setGrandTotal(sub + finalShipCost + gstSum);
  }, [checkoutData, selectedShippingMethods, selectedShippingAddress]);

  const handleAddAddress = async () => {
    if (!formName || !formPhone || !formAddress || !formCity || !formState || !formPostalCode) {
      Alert.alert('Fields Required', 'Please fill out all mandatory fields.');
      return;
    }
    
    try {
      setIsLoading(true);
      await apiClient.post(URLs.ADD_ADDRESS, {
        name: formName,
        phone: formPhone,
        email: formEmail || 'no-email@dhatri.store',
        address: formAddress,
        city: formCity,
        state: formState,
        country: formCountry,
        postal_code: formPostalCode,
        is_shipping_default: addresses.length === 0 ? 1 : 0,
        is_billing_default: addresses.length === 0 ? 1 : 0,
      });

      // Reset address forms
      setFormName('');
      setFormPhone('');
      setFormEmail('');
      setFormAddress('');
      setFormCity('');
      setFormState('');
      setFormPostalCode('');
      setNewAddressVisible(false);

      // Refresh details
      await loadCheckoutDetails();
    } catch (e) {
      console.error('Add address error:', e);
      Alert.alert('Error', 'Failed to add address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedShippingAddress) {
      Alert.alert('Address Required', 'Please select a shipping address.');
      return;
    }
    if (!selectedBillingAddress) {
      Alert.alert('Address Required', 'Please select a billing address.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Build product_info object mapping product_id to its parameters
      const productInfo: Record<string, any> = {};
      Object.values(checkoutData.packages).forEach((pkg: any) => {
        pkg.items.forEach((item: any) => {
          productInfo[item.product_id] = {
            price: item.price.toString(),
            total_price: item.total_price.toString(),
            qty: typeof item.qty === 'number' ? item.qty : parseInt(item.qty.toString(), 10) || 1,
          };
        });
      });

      // 2. Prepare FormData body
      const orderFormData = new FormData();
      orderFormData.append('customer_shipping_address', selectedShippingAddress.id.toString());
      orderFormData.append('customer_billing_address', selectedBillingAddress.id.toString());
      orderFormData.append('customer_email', selectedShippingAddress.email);
      orderFormData.append('customer_phone', selectedShippingAddress.phone);
      orderFormData.append('customer_name', selectedShippingAddress.name);
      orderFormData.append('number_of_item', totalQty.toString());
      orderFormData.append('number_of_package', packageCount.toString());
      orderFormData.append('shipping_total', shippingTotal.toFixed(2));
      orderFormData.append('discount_total', '0.00');
      orderFormData.append('tax_total', gstTotal.toFixed(2));
      orderFormData.append('delivery_type', 'home_delivery');
      orderFormData.append('pickup_location_id', '0');
      orderFormData.append('sub_total', subTotal.toFixed(2));
      orderFormData.append('grand_total', grandTotal.toFixed(2));
      // COD payment fields (gateway id = 1 for Cash on Delivery)
      orderFormData.append('payment_method', '1');
      orderFormData.append('payment_id', 'id');
      orderFormData.append('wallet_amount', '0');
      
      // Pass product_info as a JSON string matching backend requirements
      orderFormData.append('product_info', JSON.stringify(productInfo));

      // Send to backend
      const response = await apiClient.post(URLs.ORDER_STORE, orderFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 201 || response.status === 200) {
        Alert.alert('Success', 'Order placed successfully!', [
          {
            text: 'OK',
            onPress: async () => {
              await fetchCart(); // Clear cart items locally
              router.replace('/(tabs)');
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to place the order.');
      }
    } catch (e: any) {
      console.error('Order Placement Error:', e?.response?.data || e.message);
      Alert.alert('Order Placement Failed', e?.response?.data?.message || 'Error occurred while placing the order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching checkout package details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Checkout</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Addresses Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Addresses</Text>
          </View>

          {/* Shipping Address */}
          <TouchableOpacity
            style={styles.addressSelector}
            onPress={() => {
              setAddressModalType('shipping');
              setAddressModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Shipping Address</Text>
              {selectedShippingAddress ? (
                <>
                  <Text style={styles.addressName}>{selectedShippingAddress.name}</Text>
                  <Text style={styles.addressDetail}>
                    {selectedShippingAddress.address}, {selectedShippingAddress.city}, {selectedShippingAddress.state} - {selectedShippingAddress.postal_code}
                  </Text>
                  <Text style={styles.addressContact}>Phone: {selectedShippingAddress.phone}</Text>
                </>
              ) : (
                <Text style={styles.noAddressText}>No shipping address selected</Text>
              )}
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Billing Address */}
          <TouchableOpacity
            style={styles.addressSelector}
            onPress={() => {
              setAddressModalType('billing');
              setAddressModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Billing Address</Text>
              {selectedBillingAddress ? (
                <>
                  <Text style={styles.addressName}>{selectedBillingAddress.name}</Text>
                  <Text style={styles.addressDetail}>
                    {selectedBillingAddress.address}, {selectedBillingAddress.city}, {selectedBillingAddress.state} - {selectedBillingAddress.postal_code}
                  </Text>
                  <Text style={styles.addressContact}>Phone: {selectedBillingAddress.phone}</Text>
                </>
              ) : (
                <Text style={styles.noAddressText}>No billing address selected</Text>
              )}
            </View>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Packages Section */}
        {checkoutData && checkoutData.packages && Object.entries(checkoutData.packages).map(([pkgKey, pkgValue]: [string, any]) => {
          const sellerName = pkgValue.items?.[0]?.seller?.seller_shop_name || `Seller Package #${pkgKey}`;
          const currentShipping = selectedShippingMethods[pkgKey] || pkgValue.shipping?.[0];

          return (
            <View key={pkgKey} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Store size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>{sellerName}</Text>
              </View>

              {/* Package Items */}
              <View style={styles.itemsList}>
                {pkgValue.items.map((item: any) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.product?.product?.product_name || 'Product'}
                    </Text>
                    <Text style={styles.itemQty}>x{item.qty}</Text>
                    <Text style={styles.itemPrice}>₹{(item.price * item.qty).toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>

              {/* Shipping Method Selector for this package */}
              {pkgValue.shipping && pkgValue.shipping.length > 0 && (
                <View style={styles.shippingSection}>
                  <Text style={styles.shippingMethodLabel}>Shipping Method:</Text>
                  <View style={styles.shippingOptions}>
                    {pkgValue.shipping.map((method: any) => {
                      const isSelected = currentShipping?.id === method.id;
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[styles.shippingOptionBtn, isSelected && styles.shippingOptionBtnActive]}
                          onPress={() => {
                            setSelectedShippingMethods({
                              ...selectedShippingMethods,
                              [pkgKey]: method,
                            });
                          }}
                        >
                          <Text style={[styles.shippingOptionText, isSelected && styles.shippingOptionTextActive]}>
                            {method.method_name} (₹{method.cost})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Payment Method Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <CreditCard size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Method</Text>
          </View>
          <View style={styles.paymentOption}>
            <View style={styles.paymentOptionLeft}>
              <View style={styles.paymentRadioActive}>
                <View style={styles.paymentRadioInner} />
              </View>
              <Text style={styles.paymentText}>Cash on Delivery (COD)</Text>
            </View>
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.summaryTitle}>Bill Details</Text>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>Items Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subTotal.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>GST Taxes</Text>
            <Text style={styles.summaryValue}>₹{gstTotal.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryText}>Delivery Charges</Text>
            <Text style={styles.summaryValue}>₹{shippingTotal.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.grandTotalText}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Footer */}
      <View style={styles.footerPanel}>
        <View>
          <Text style={styles.footerTotalLabel}>Total Amount</Text>
          <Text style={styles.footerTotalPrice}>₹{grandTotal.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.placeOrderBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.placeOrderBtnText}>Place Order</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Address Selector / Creation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addressModalVisible}
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {addressModalType === 'shipping' ? 'Shipping' : 'Billing'} Address
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setNewAddressVisible(true);
                }}
                style={styles.addAddressModalBtn}
              >
                <Plus size={16} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.addAddressModalTxt}>Add New</Text>
              </TouchableOpacity>
            </View>

            {newAddressVisible ? (
              <ScrollView style={styles.addressForm} showsVerticalScrollIndicator={false}>
                <Text style={styles.formTitle}>Add New Address</Text>
                
                <TextInput
                  placeholder="Full Name *"
                  value={formName}
                  onChangeText={setFormName}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />
                
                <TextInput
                  placeholder="Phone Number *"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  placeholder="Email Address"
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  placeholder="Address Details *"
                  value={formAddress}
                  onChangeText={setFormAddress}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  placeholder="City *"
                  value={formCity}
                  onChangeText={setFormCity}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  placeholder="State *"
                  value={formState}
                  onChangeText={setFormState}
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <TextInput
                  placeholder="Zip Code / Postal Code *"
                  value={formPostalCode}
                  onChangeText={setFormPostalCode}
                  keyboardType="number-pad"
                  style={styles.formInput}
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={() => setNewAddressVisible(false)}
                    style={styles.formCancelBtn}
                  >
                    <Text style={styles.formCancelBtnTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddAddress}
                    style={styles.formSubmitBtn}
                  >
                    <Text style={styles.formSubmitBtnTxt}>Save Address</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={styles.addressList}>
                {addresses.length === 0 ? (
                  <View style={styles.emptyAddress}>
                    <Text style={styles.emptyAddressText}>No addresses found.</Text>
                  </View>
                ) : (
                  addresses.map((addr) => {
                    const isSelected = addressModalType === 'shipping'
                      ? selectedShippingAddress?.id === addr.id
                      : selectedBillingAddress?.id === addr.id;

                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.addressCard, isSelected && styles.addressCardActive]}
                        onPress={() => {
                          if (addressModalType === 'shipping') {
                            setSelectedShippingAddress(addr);
                          } else {
                            setSelectedBillingAddress(addr);
                          }
                          setAddressModalVisible(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addressCardName}>{addr.name}</Text>
                          <Text style={styles.addressCardDetail}>
                            {addr.address}, {addr.city}, {addr.state} - {addr.postal_code}
                          </Text>
                          <Text style={styles.addressCardContact}>Phone: {addr.phone}</Text>
                        </View>
                        {isSelected && <Check size={18} color={Colors.primary} />}
                      </TouchableOpacity>
                    );
                  })
                )}

                <TouchableOpacity
                  onPress={() => setAddressModalVisible(false)}
                  style={styles.closeModalBtn}
                >
                  <Text style={styles.closeModalBtnTxt}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressInfo: {
    flex: 1,
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  addressDetail: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  addressContact: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  noAddressText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  itemQty: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginRight: 16,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  shippingSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 8,
  },
  shippingMethodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  shippingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shippingOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  shippingOptionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary10,
  },
  shippingOptionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  shippingOptionTextActive: {
    color: Colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentRadioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  grandTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  footerPanel: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTotalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  footerTotalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  placeOrderBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeOrderBtnGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeOrderBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  addAddressModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAddressModalTxt: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  addressList: {
    gap: 12,
  },
  emptyAddress: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyAddressText: {
    color: '#64748b',
    fontSize: 13,
  },
  addressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary10,
  },
  addressCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  addressCardDetail: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  addressCardContact: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
    marginTop: 4,
  },
  closeModalBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  closeModalBtnTxt: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  addressForm: {
    gap: 12,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 32,
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  formCancelBtnTxt: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  formSubmitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  formSubmitBtnTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
