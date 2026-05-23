import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Brand = {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  brand_id: string;
  category_id: string;
  description: string;
  rating: number;
  reviews_count: number;
  created_at: string;
  // Optional wholesale pricing tiers for bulk orders
  wholesale_tiers?: { min_qty: number; max_qty: number; price_per_bag: number }[];
};
