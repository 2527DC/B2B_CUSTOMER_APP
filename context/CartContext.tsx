import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../config/api';
import { URLs } from '../config/urls';
import { useAuth } from './AuthContext';

export interface SkuObject {
  id: number;
  product_id: number;
  sku: string;            // the actual SKU code string
  selling_price: number;
  product_stock: number;
  weight?: string;
  additional_shipping?: number;
  variant_image?: string;
}

export interface SkuProduct {
  id: number;
  product_id: number;
  sku?: SkuObject;        // full SKU object from API
  price: number;
  qty: number;
  product?: {
    product_name: string;
    thumbnail_image_url: string;
    thumbnail_image_source?: string;
    product_unit_min_price?: number;
  };
}

export interface SellerData {
  id: number;
  seller_shop_name?: string;
}

export interface CartItem {
  id: number;
  user_id: number;
  seller_id: number;
  product_id: number;
  qty: number;
  price: number;
  total_price: number;
  is_select: number; // 1 selected, 0 unselected
  shipping_method_id: number;
  product?: SkuProduct;
  seller?: SellerData;
}

interface CartContextType {
  cartItems: CartItem[];
  cartMap: Record<string, CartItem[]>;
  cartCount: number;
  cartSelectedCount: number;
  selectedTotal: number;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: number, skuId: number, qty: number, price: number, sellerId: number) => Promise<boolean>;
  updateQty: (cartId: number, qty: number) => Promise<boolean>;
  removeItem: (cartId: number) => Promise<boolean>;
  selectUnselectItem: (cartId: number, isSelected: boolean) => Promise<boolean>;
  selectUnselectSeller: (sellerId: number, isSelected: boolean) => Promise<boolean>;
  selectUnselectAll: (isSelected: boolean) => Promise<boolean>;
  removeAll: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartMap, setCartMap] = useState<Record<string, CartItem[]>>({});
  const [cartCount, setCartCount] = useState(0);
  const [cartSelectedCount, setCartSelectedCount] = useState(0);
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCart = async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      setCartMap({});
      setCartCount(0);
      setCartSelectedCount(0);
      setSelectedTotal(0);
      return;
    }

    setIsLoading(true);
    try {
      const userIdParam = user?.id ? `&user_id=${user.id}` : '';
      const response = await apiClient.get(
        `${URLs.CART}?device_token=RN_B2B_DEVICE${userIdParam}`
      );

      if (response.data && response.data.carts) {
        const cartsData = response.data.carts as Record<string, CartItem[]>;
        setCartMap(cartsData);

        // Flatten all cart items
        const flatItems: CartItem[] = [];
        let count = 0;
        let selectedCount = 0;
        let total = 0;

        Object.values(cartsData).forEach((itemsList) => {
          itemsList.forEach((item) => {
            flatItems.push(item);
            count += item.qty;
            if (item.is_select === 1) {
              selectedCount += item.qty;
              total += item.total_price;
            }
          });
        });

        setCartItems(flatItems);
        setCartCount(count);
        setCartSelectedCount(selectedCount);
        setSelectedTotal(total);
      } else {
        setCartItems([]);
        setCartMap({});
        setCartCount(0);
        setCartSelectedCount(0);
        setSelectedTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch cart when authentication state changes
  useEffect(() => {
    fetchCart();
  }, [isAuthenticated, user]);

  const addToCart = async (
    productId: number,
    skuId: number,
    qty: number,
    price: number,
    sellerId: number
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(URLs.CART, {
        product_id: productId,
        sku_id: skuId,
        qty,
        price,
        seller_id: sellerId,
        shipping_method_id: 1, // default shipping method
        product_type: 'product',
        device_token: 'RN_B2B_DEVICE',
        user_id: user?.id,
      });

      if (response.status === 201 || response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQty = async (cartId: number, qty: number): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.CART_QUANTITY_UPDATE, {
        id: cartId,
        qty,           // API expects 'qty' not 'quantity'
      });
      if (response.status === 202 || response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update cart qty:', error);
      return false;
    }
  };

  const removeItem = async (cartId: number): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.CART_REMOVE_CART_ITEM, {
        id: cartId,
      });
      if (response.status === 203 || response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove cart item:', error);
      return false;
    }
  };

  const selectUnselectItem = async (cartId: number, isSelected: boolean): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.CART_SELECT_UNSELECT_SINGLE, {
        id: cartId,
        is_select: isSelected ? 1 : 0,   // API expects 'is_select'
      });
      if (response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select/unselect item:', error);
      return false;
    }
  };

  const selectUnselectSeller = async (sellerId: number, isSelected: boolean): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.CART_SELECT_UNSELECT_SELLER, {
        seller_id: sellerId,
        is_select: isSelected ? 1 : 0,   // API expects 'is_select'
      });
      if (response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select/unselect seller items:', error);
      return false;
    }
  };

  const selectUnselectAll = async (isSelected: boolean): Promise<boolean> => {
    try {
      const response = await apiClient.post(URLs.CART_SELECT_UNSELECT_ALL, {
        is_select: isSelected ? 1 : 0,   // API expects 'is_select'
      });
      if (response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select/unselect all items:', error);
      return false;
    }
  };

  const removeAll = async (): Promise<boolean> => {
    try {
      const userIdParam = user?.id ? `&user_id=${user.id}` : '';
      const response = await apiClient.post(
        `${URLs.CART_REMOVE_ALL}?device_token=RN_B2B_DEVICE${userIdParam}`
      );
      if (response.status === 203 || response.status === 200) {
        await fetchCart();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove all items:', error);
      return false;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartMap,
        cartCount,
        cartSelectedCount,
        selectedTotal,
        isLoading,
        fetchCart,
        addToCart,
        updateQty,
        removeItem,
        selectUnselectItem,
        selectUnselectSeller,
        selectUnselectAll,
        removeAll,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
