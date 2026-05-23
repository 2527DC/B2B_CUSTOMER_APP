/*
  # Initial Schema for E-commerce App

  1. New Tables
    - `brands`: Stores brand information
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo_url` (text)
      - `created_at` (timestamp)
    
    - `categories`: Stores product categories
      - `id` (uuid, primary key)
      - `name` (text)
      - `icon` (text)
      - `created_at` (timestamp)
    
    - `products`: Stores product information
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (decimal)
      - `image_url` (text)
      - `brand_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key)
      - `description` (text)
      - `rating` (decimal)
      - `reviews_count` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public read access for all tables (e-commerce catalog)
*/

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price decimal(10,2) NOT NULL DEFAULT 0,
  image_url text DEFAULT '',
  brand_id uuid REFERENCES brands(id),
  category_id uuid REFERENCES categories(id),
  description text DEFAULT '',
  rating decimal(2,1) DEFAULT 0,
  reviews_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public can view brands"
  ON brands FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view products"
  ON products FOR SELECT
  TO public
  USING (true);

-- Insert sample brands
INSERT INTO brands (name, logo_url) VALUES
  ('Nike', 'https://logo.clearbit.com/nike.com'),
  ('Adidas', 'https://logo.clearbit.com/adidas.com'),
  ('Apple', 'https://logo.clearbit.com/apple.com'),
  ('Samsung', 'https://logo.clearbit.com/samsung.com'),
  ('Sony', 'https://logo.clearbit.com/sony.com'),
  ('LG', 'https://logo.clearbit.com/lg.com');

-- Insert sample categories
INSERT INTO categories (name, icon) VALUES
  ('Electronics', 'Smartphone'),
  ('Fashion', 'Shirt'),
  ('Sports', 'Dumbbell'),
  ('Home', 'Home'),
  ('Beauty', 'Sparkles'),
  ('Books', 'BookOpen'),
  ('Toys', 'Gamepad2'),
  ('Food', 'Utensils');

-- Insert sample products
INSERT INTO products (name, price, image_url, brand_id, category_id, description, rating, reviews_count) VALUES
  ('iPhone 15 Pro', 999.99, 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Apple'), (SELECT id FROM categories WHERE name = 'Electronics'), 'Latest iPhone with A17 Pro chip', 4.8, 1250),
  ('Galaxy S24 Ultra', 1199.99, 'https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Samsung'), (SELECT id FROM categories WHERE name = 'Electronics'), 'Flagship Samsung smartphone', 4.7, 890),
  ('Sony WH-1000XM5', 349.99, 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Sony'), (SELECT id FROM categories WHERE name = 'Electronics'), 'Premium noise-canceling headphones', 4.9, 2100),
  ('Nike Air Max', 179.99, 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Nike'), (SELECT id FROM categories WHERE name = 'Fashion'), 'Classic Nike Air Max sneakers', 4.6, 540),
  ('Adidas Ultraboost', 189.99, 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Adidas'), (SELECT id FROM categories WHERE name = 'Sports'), 'Running shoes with boost technology', 4.7, 780),
  ('LG OLED TV 65"', 1799.99, 'https://images.pexels.com/photos/4002/samsung-tv.jpg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'LG'), (SELECT id FROM categories WHERE name = 'Electronics'), '65 inch OLED 4K Smart TV', 4.8, 450),
  ('Nike Dri-FIT Shirt', 49.99, 'https://images.pexels.com/photos/1652705/pexels-photo-1652705.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Nike'), (SELECT id FROM categories WHERE name = 'Fashion'), 'Breathable sports shirt', 4.5, 320),
  ('Adidas Backpack', 79.99, 'https://images.pexels.com/photos/1660214/pexels-photo-1660214.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM brands WHERE name = 'Adidas'), (SELECT id FROM categories WHERE name = 'Fashion'), 'Sporty backpack with laptop compartment', 4.4, 180);
