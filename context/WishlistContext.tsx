import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  mrp?: number;
  image?: string;
  stock?: number;
  skuId?: number;
  createdAt: string;
}

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistCount: number;
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (item: Omit<WishlistItem, 'createdAt'>) => Promise<boolean>;
  removeFromWishlist: (productId: number) => Promise<void>;
  clearWishlist: () => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const WISHLIST_STORAGE_KEY = '@dhatri_b2b_wishlist';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load wishlist from AsyncStorage
  useEffect(() => {
    async function loadWishlist() {
      try {
        const stored = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setWishlist(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load wishlist:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadWishlist();
  }, []);

  const saveWishlist = async (items: WishlistItem[]) => {
    try {
      await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
      setWishlist(items);
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
  };

  const isInWishlist = (productId: number): boolean => {
    return wishlist.some((item) => item.productId === productId);
  };

  const toggleWishlist = async (item: Omit<WishlistItem, 'createdAt'>): Promise<boolean> => {
    const existingIndex = wishlist.findIndex((w) => w.productId === item.productId);
    if (existingIndex >= 0) {
      const updated = wishlist.filter((w) => w.productId !== item.productId);
      await saveWishlist(updated);
      return false; // Removed
    } else {
      const newItem: WishlistItem = {
        ...item,
        createdAt: new Date().toISOString(),
      };
      const updated = [newItem, ...wishlist];
      await saveWishlist(updated);
      return true; // Added
    }
  };

  const removeFromWishlist = async (productId: number): Promise<void> => {
    const updated = wishlist.filter((w) => w.productId !== productId);
    await saveWishlist(updated);
  };

  const clearWishlist = async (): Promise<void> => {
    await saveWishlist([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
