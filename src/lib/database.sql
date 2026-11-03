-- ==============================================================================
-- DOART STORE - SCHEMA COMPLET SUPABASE POSTGRESQL
-- Marque Marocaine de Vêtements (Cash On Delivery + Confirmation WhatsApp)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(10, 2) CHECK (discount_price IS NULL OR discount_price >= 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    is_new BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Product Variants Table (Stock per Size & Color combination)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#000000',
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    sku VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_product_size_color UNIQUE (product_id, size, color_name)
);

-- 5. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'Pending WhatsApp Confirmation' NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'COD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0)
);

-- 7. Create Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name VARCHAR(255) DEFAULT 'DoArt Store' NOT NULL,
    whatsapp_number VARCHAR(50) DEFAULT '212661000000' NOT NULL,
    instagram_url VARCHAR(255) DEFAULT 'https://instagram.com/doartstore',
    currency VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 35 NOT NULL,
    free_delivery_threshold NUMERIC(10, 2) DEFAULT 600 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, authenticated users can manage
CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products: Public can read active products, authenticated can manage all
CREATE POLICY "Allow public read active products" ON public.products FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Product Variants: Public read, authenticated manage
CREATE POLICY "Allow public read variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage variants" ON public.product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Orders: Public can create orders (COD submission)
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select own orders by reference" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Order Items: Public can insert items
CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage order_items" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Store Settings: Public read, authenticated manage
CREATE POLICY "Allow public read store_settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage store_settings" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION FOR PRODUCT IMAGES
-- ==============================================================================
-- Insert the "products" storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images from "products" bucket
CREATE POLICY "Public Access Products Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Authenticated users can upload to "products" bucket
CREATE POLICY "Authenticated Upload Products Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated Update Products Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Authenticated Delete Products Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- ==============================================================================
-- STOCK MANAGEMENT FUNCTIONS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(var_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.product_variants
    SET stock_quantity = GREATEST(0, stock_quantity - qty),
        updated_at = timezone('utc'::text, now())
    WHERE id = var_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.restore_variant_stock(var_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + qty,
        updated_at = timezone('utc'::text, now())
    WHERE id = var_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
