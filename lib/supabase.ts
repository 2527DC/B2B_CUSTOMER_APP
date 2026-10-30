import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

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
  price?: number;        // selling price (min_sell_price)
  mrp?: number;          // original MRP (max_sell_price) – shown struck-through
  image_url?: string;
  brand_id?: string;
  category_id?: string;
  description?: string;
  unit_name?: string;
  unit?: string;
  units?: string;
  unit_value?: string;
  pack_size?: string;
  pack_kg?: number;      // kg in one bag; price per kg = price / pack_kg
  rating?: number;
  reviews_count?: number;
  created_at: string;
  // Optional wholesale pricing tiers for bulk orders
  wholesale_tiers?: { min_qty: number; max_qty: number; price_per_bag: number }[];
};
