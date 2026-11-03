-- ==============================================================================
-- DOART STORE - SCHEMA COMPLET SUPABASE POSTGRESQL (PRODUCTION AUDITÉ)
-- Marque Marocaine de Vêtements (Cash On Delivery + Confirmation WhatsApp)
-- ==============================================================================

-- 1. Enable UUID Extension & Crypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Admin Users Table (Contrôle d'accès RBAC sécurisé)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5. Create Product Variants Table (Stock indépendant par Taille et Couleur)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Create Orders Table (Commandes COD)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'Pending WhatsApp Confirmation' NOT NULL CHECK (
        status IN ('Pending WhatsApp Confirmation', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled')
    ),
    payment_method VARCHAR(20) DEFAULT 'COD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Order Items Table (Articles commandés avec variante et image)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    product_image TEXT
);

-- 8. Create Store Settings Table (Paramètres Boutique & Showcase Hero)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(255) DEFAULT 'DoArt Store' NOT NULL,
    whatsapp_number VARCHAR(50) DEFAULT '212661000000' NOT NULL,
    instagram_url VARCHAR(255) DEFAULT 'https://instagram.com/doartstore',
    currency VARCHAR(10) DEFAULT 'MAD' NOT NULL,
    delivery_fee NUMERIC(10, 2) DEFAULT 35 NOT NULL,
    free_delivery_threshold NUMERIC(10, 2) DEFAULT 600 NOT NULL,
    hero_title TEXT DEFAULT 'L’Élégance Minimaliste Inspirée par le Maroc.',
    hero_subtitle TEXT DEFAULT 'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.',
    hero_badge TEXT DEFAULT 'Nouvelle Collection 2026 • DoArt Studio',
    hero_image TEXT DEFAULT 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
    hero_tag_badge TEXT DEFAULT 'Casablanca Atelier',
    hero_card_tag TEXT DEFAULT 'Best-Seller',
    hero_card_title TEXT DEFAULT 'Tracksuit Signature DoArt',
    hero_card_price TEXT DEFAULT '520 DH',
    hero_card_original_price TEXT DEFAULT '650 DH',
    hero_card_image TEXT DEFAULT 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80',
    hero_featured_product_id TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- FONCTION DE VERIFICATION DU RÔLE ADMINISTRATEUR (SECURITY DEFINER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES AUDITÉES & SÉCURISÉES
-- ==============================================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 1. Admin Users: Seuls les admins vérifiés peuvent lire
DROP POLICY IF EXISTS "Allow admin read admin_users" ON public.admin_users;
CREATE POLICY "Allow admin read admin_users" ON public.admin_users
FOR SELECT TO authenticated USING (public.is_admin());

-- 2. Categories: Lecture publique, gestion admin uniquement
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated manage categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Allow admin manage categories" ON public.categories
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Products: Public peut lire uniquement les produits actifs, admin gère tout
DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated manage products" ON public.products;
CREATE POLICY "Allow public read active products" ON public.products
FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Allow admin manage products" ON public.products
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Product Variants: Lecture des variantes des produits actifs, gestion admin uniquement
DROP POLICY IF EXISTS "Allow public read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow authenticated manage variants" ON public.product_variants;
CREATE POLICY "Allow public read variants" ON public.product_variants
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id AND (p.is_active = true OR public.is_admin())
    )
);

CREATE POLICY "Allow admin manage variants" ON public.product_variants
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Orders: Public peut UNIQUEMENT insérer (COD submission), JAMAIS consulter les commandes d'autrui !
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public select own orders by reference" ON public.orders;
DROP POLICY IF EXISTS "Allow public select own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated manage orders" ON public.orders;
CREATE POLICY "Allow public insert orders" ON public.orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin manage orders" ON public.orders
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Order Items: Public peut insérer, seuls les admins peuvent consulter et modifier
DROP POLICY IF EXISTS "Allow public insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow authenticated manage order_items" ON public.order_items;
CREATE POLICY "Allow public insert order_items" ON public.order_items
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin manage order_items" ON public.order_items
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Store Settings: Lecture publique, modification admin uniquement
DROP POLICY IF EXISTS "Allow public read store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow authenticated manage store_settings" ON public.store_settings;
CREATE POLICY "Allow public read store_settings" ON public.store_settings
FOR SELECT USING (true);

CREATE POLICY "Allow admin manage store_settings" ON public.store_settings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- STORAGE BUCKET CONFIGURATION FOR PRODUCT IMAGES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Products Images" ON storage.objects;
CREATE POLICY "Public Access Products Images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Authenticated Upload Products Images" ON storage.objects;
CREATE POLICY "Authenticated Upload Products Images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated Update Products Images" ON storage.objects;
CREATE POLICY "Authenticated Update Products Images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated Delete Products Images" ON storage.objects;
CREATE POLICY "Authenticated Delete Products Images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

-- ==============================================================================
-- PROCESSUS TRANSACTIONNEL DE COMMANDE COD SÉCURISÉ (RPC)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_cod_order(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_notes TEXT,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_order_ref VARCHAR;
    v_subtotal NUMERIC(10, 2) := 0;
    v_delivery_fee NUMERIC(10, 2) := 35;
    v_free_threshold NUMERIC(10, 2) := 600;
    v_total NUMERIC(10, 2) := 0;
    v_item JSONB;
    v_var_id UUID;
    v_qty INTEGER;
    v_variant RECORD;
    v_prod RECORD;
    v_unit_price NUMERIC(10, 2);
    v_line_total NUMERIC(10, 2);
    v_created_items JSONB := '[]'::JSONB;
BEGIN
    -- 1. Validation stricte des données client
    IF TRIM(COALESCE(p_customer_name, '')) = '' THEN
        RAISE EXCEPTION 'Le nom et prénom du client sont obligatoires.';
    END IF;
    IF TRIM(COALESCE(p_customer_phone, '')) = '' THEN
        RAISE EXCEPTION 'Le numéro de téléphone WhatsApp est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'La ville de livraison est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_address, '')) = '' THEN
        RAISE EXCEPTION 'L''adresse de livraison est obligatoire.';
    END IF;
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Le panier est vide.';
    END IF;

    -- 2. Génération référence unique DoArt Store : DOA-YYYY-XXXX
    v_order_ref := 'DOA-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    -- 3. Récupération des paramètres de livraison
    SELECT delivery_fee, free_delivery_threshold INTO v_delivery_fee, v_free_threshold
    FROM public.store_settings LIMIT 1;
    IF v_delivery_fee IS NULL THEN v_delivery_fee := 35; END IF;
    IF v_free_threshold IS NULL THEN v_free_threshold := 600; END IF;

    -- 4. Vérification et décompte des stocks avec verrou de ligne (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'La quantité commandée doit être supérieure à zéro.';
        END IF;

        -- Verrouillage de la variante pour éviter toute vente simultanée
        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_var_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante introuvable.';
        END IF;

        IF v_variant.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Stock insuffisant pour la taille % (Disponible: % pièce(s)).', v_variant.size, v_variant.stock_quantity;
        END IF;

        -- Vérification du prix réel en base (sécurité serveur anti-altération client)
        SELECT * INTO v_prod
        FROM public.products
        WHERE id = v_variant.product_id;

        IF NOT FOUND OR NOT v_prod.is_active THEN
            RAISE EXCEPTION 'Le vêtement sélectionné est indisponible ou inactif.';
        END IF;

        v_unit_price := COALESCE(v_prod.discount_price, v_prod.price);
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        -- Décrémentation atomique du stock
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_var_id;
    END LOOP;

    -- 5. Calcul des frais de port
    IF v_subtotal >= v_free_threshold THEN
        v_delivery_fee := 0;
    END IF;
    v_total := v_subtotal + v_delivery_fee;

    -- 6. Enregistrement de la commande
    INSERT INTO public.orders (
        id, order_reference, customer_name, customer_phone, city, address, notes,
        subtotal, total, status, payment_method, created_at
    ) VALUES (
        v_order_id, v_order_ref, p_customer_name, p_customer_phone, p_city, p_address, p_notes,
        v_subtotal, v_total, 'Pending WhatsApp Confirmation', 'COD', timezone('utc'::text, now())
    );

    -- 7. Enregistrement des lignes d'articles de commande
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT v.*, p.name as prod_name, COALESCE(p.discount_price, p.price) as actual_price,
               (p.images)[1] as first_img
        INTO v_variant
        FROM public.product_variants v
        JOIN public.products p ON p.id = v.product_id
        WHERE v.id = v_var_id;

        v_unit_price := v_variant.actual_price;
        v_line_total := v_unit_price * v_qty;

        INSERT INTO public.order_items (
            id, order_id, product_id, variant_id, product_name, size, color_name,
            quantity, unit_price, total_price, product_image
        ) VALUES (
            gen_random_uuid(), v_order_id, v_variant.product_id, v_var_id,
            v_variant.prod_name, v_variant.size, v_variant.color_name,
            v_qty, v_unit_price, v_line_total, COALESCE(v_item->>'product_image', v_variant.first_img)
        );

        v_created_items := v_created_items || jsonb_build_object(
            'product_id', v_variant.product_id,
            'variant_id', v_var_id,
            'product_name', v_variant.prod_name,
            'size', v_variant.size,
            'color_name', v_variant.color_name,
            'quantity', v_qty,
            'unit_price', v_unit_price,
            'total_price', v_line_total,
            'product_image', COALESCE(v_item->>'product_image', v_variant.first_img)
        );
    END LOOP;

    -- 8. Retour de l'objet commande complète
    RETURN jsonb_build_object(
        'id', v_order_id,
        'order_reference', v_order_ref,
        'customer_name', p_customer_name,
        'customer_phone', p_customer_phone,
        'city', p_city,
        'address', p_address,
        'notes', p_notes,
        'subtotal', v_subtotal,
        'delivery_fee', v_delivery_fee,
        'total', v_total,
        'status', 'Pending WhatsApp Confirmation',
        'payment_method', 'COD',
        'created_at', timezone('utc'::text, now()),
        'items', v_created_items
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- RESTAURATION DU STOCK LORS DE L'ANNULATION PAR L'ADMINISTRATEUR (RPC)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Action réservée aux administrateurs autorisés.';
    END IF;

    UPDATE public.orders
    SET status = 'Cancelled'
    WHERE id = p_order_id AND status != 'Cancelled';

    IF FOUND THEN
        FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
        LOOP
            IF v_item.variant_id IS NOT NULL THEN
                UPDATE public.product_variants
                SET stock_quantity = stock_quantity + v_item.quantity,
                    updated_at = timezone('utc'::text, now())
                WHERE id = v_item.variant_id;
            END IF;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
