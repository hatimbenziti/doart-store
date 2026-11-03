-- ==============================================================================
-- DOART STORE - SCHEMA COMPLET SUPABASE POSTGRESQL (AUDITÉ & SÉCURISÉ)
-- Marque Marocaine de Vêtements (Commandes Directes WhatsApp + Gestion Admin)
-- ==============================================================================
-- 
-- PRINCIPES D'ARCHITECTURE & SÉCURITÉ :
-- 1. Le flux client "Commander via WhatsApp" est 100% côté client (génération de message wa.me).
--    Il ne crée JAMAIS de commande en base et ne diminue JAMAIS le stock lors du clic client.
-- 2. Seuls les administrateurs authentifiés et vérifiés (RBAC admin_users) ont le droit
--    d'enregistrer une commande confirmée et de gérer le cycle de vie du stock.
-- 3. Les tables "orders" et "order_items" sont hermétiquement fermées au public et aux
--    utilisateurs anonymes (zéro permission INSERT ou SELECT publique).
-- 4. La création de commande administrative s'effectue via la procédure stockée atomique
--    "create_admin_manual_order" qui verrouille les stocks (FOR UPDATE), recalcule les prix
--    réels depuis la table "products", prévient les collisions de référence et effectue un ROLLBACK
--    intégral si la transaction échoue.
-- 5. L'annulation de commande via "cancel_order_and_restore_stock" est strictement idempotente
--    (aucun double réapprovisionnement possible si la commande est déjà annulée).
-- 6. Toutes les fonctions SECURITY DEFINER disposent de "SET search_path = public, pg_temp"
--    et de restrictions strictes (REVOKE EXECUTE FROM PUBLIC, anon).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TABLE DES ADMINISTRATEURS (RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. TABLE DES CATÉGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. TABLE DES PRODUITS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 5. TABLE DES VARIANTES DE PRODUITS (Stock indépendant par Taille & Couleur)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 6. TABLE DES COMMANDES (Admin Only - COD Maroc)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_reference VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (delivery_fee >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status VARCHAR(50) DEFAULT 'Pending WhatsApp Confirmation' NOT NULL CHECK (
        status IN ('Pending WhatsApp Confirmation', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled')
    ),
    payment_method VARCHAR(20) DEFAULT 'COD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 7. TABLE DES ARTICLES DE COMMANDE (Admin Only)
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 8. TABLE DES PARAMÈTRES BOUTIQUE & SHOWCASE HERO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(255) DEFAULT 'DoArt Store' NOT NULL,
    whatsapp_number VARCHAR(50) DEFAULT '212705176222' NOT NULL,
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

-- ------------------------------------------------------------------------------
-- 9. INDEX DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- ------------------------------------------------------------------------------
-- 10. FONCTION DE VÉRIFICATION RBAC is_admin() (SECURITY DEFINER SÉCURISÉE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$;

-- Restreindre strictement l'exécution
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 11. POLITIQUES ROW LEVEL SECURITY (RLS) AUDITÉES
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 11.1 Admin Users : Lecture et gestion réservées aux admins vérifiés
DROP POLICY IF EXISTS "Allow admin read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow admin manage admin_users" ON public.admin_users;

CREATE POLICY "Allow admin read admin_users" ON public.admin_users
FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Allow admin manage admin_users" ON public.admin_users
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.2 Categories : Lecture publique, gestion réservée aux admins
DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin manage categories" ON public.categories;

CREATE POLICY "Allow public read categories" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Allow admin manage categories" ON public.categories
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.3 Products : Public ne voit que les produits actifs, admin gère tout
DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated manage products" ON public.products;
DROP POLICY IF EXISTS "Allow admin manage products" ON public.products;

CREATE POLICY "Allow public read active products" ON public.products
FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Allow admin manage products" ON public.products
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.4 Product Variants : Lecture des variantes actives, admin gère tout
DROP POLICY IF EXISTS "Allow public read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow authenticated manage variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow admin manage variants" ON public.product_variants;

CREATE POLICY "Allow public read variants" ON public.product_variants
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id AND (p.is_active = true OR public.is_admin())
    )
);

CREATE POLICY "Allow admin manage variants" ON public.product_variants
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.5 Orders : TOTALEMENT FERMÉE AU PUBLIC ET ANON
-- Suppression de toutes les anciennes politiques permissives
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public select own orders by reference" ON public.orders;
DROP POLICY IF EXISTS "Allow public select own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated manage orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin manage orders" ON public.orders;

CREATE POLICY "Allow admin manage orders" ON public.orders
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.6 Order Items : TOTALEMENT FERMÉE AU PUBLIC ET ANON
DROP POLICY IF EXISTS "Allow public insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow authenticated manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow admin manage order_items" ON public.order_items;

CREATE POLICY "Allow admin manage order_items" ON public.order_items
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11.7 Store Settings : Lecture publique, modification admin uniquement
DROP POLICY IF EXISTS "Allow public read store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow authenticated manage store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow admin manage store_settings" ON public.store_settings;

CREATE POLICY "Allow public read store_settings" ON public.store_settings
FOR SELECT USING (true);

CREATE POLICY "Allow admin manage store_settings" ON public.store_settings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. SUPABASE STORAGE BUCKET POUR LES IMAGES
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Products Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Products Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Products Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Products Images" ON storage.objects;

CREATE POLICY "Public Access Products Images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Authenticated Upload Products Images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Authenticated Update Products Images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Authenticated Delete Products Images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

-- ------------------------------------------------------------------------------
-- 13. SUPPRESSION DE L'ANCIENNE RPC create_cod_order (NON RÉSERVÉE AUX ADMINS)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_cod_order(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_cod_order(character varying, character varying, character varying, text, text, jsonb);

-- ------------------------------------------------------------------------------
-- 14. NOUVELLE RPC ADMIN : create_admin_manual_order
-- Transactionnelle, atomique, vérifie is_admin(), verrouille avec FOR UPDATE,
-- recalcule les prix réels depuis la base et décrémente le stock.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_admin_manual_order(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_status VARCHAR DEFAULT 'Pending WhatsApp Confirmation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    v_order_status VARCHAR(50);
BEGIN
    -- 1. Contrôle d'accès strict : Seul un admin authentifié peut exécuter cette fonction
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs DoArt Store peuvent enregistrer une commande.';
    END IF;

    -- 2. Validation stricte des données d'entrée
    IF TRIM(COALESCE(p_customer_name, '')) = '' THEN
        RAISE EXCEPTION 'Le nom et prénom du client sont obligatoires.';
    END IF;
    IF TRIM(COALESCE(p_customer_phone, '')) = '' THEN
        RAISE EXCEPTION 'Le numéro de téléphone WhatsApp du client est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'La ville de livraison est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_address, '')) = '' THEN
        RAISE EXCEPTION 'L''adresse de livraison est obligatoire.';
    END IF;
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La commande doit comporter au moins un article.';
    END IF;

    -- Statut de la commande validé
    v_order_status := COALESCE(NULLIF(TRIM(p_status), ''), 'Pending WhatsApp Confirmation');
    IF v_order_status NOT IN ('Pending WhatsApp Confirmation', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled') THEN
        v_order_status := 'Pending WhatsApp Confirmation';
    END IF;

    -- 3. Génération référence unique sans collision : DOA-YYYY-XXXXXX
    LOOP
        v_order_ref := 'DOA-' || to_char(now(), 'YYYY') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_reference = v_order_ref);
    END LOOP;

    -- 4. Paramètres de livraison depuis store_settings
    SELECT COALESCE(delivery_fee, 35), COALESCE(free_delivery_threshold, 600)
    INTO v_delivery_fee, v_free_threshold
    FROM public.store_settings
    LIMIT 1;

    IF v_delivery_fee IS NULL THEN v_delivery_fee := 35; END IF;
    IF v_free_threshold IS NULL THEN v_free_threshold := 600; END IF;

    -- 5. Validation des stocks avec verrouillage de ligne (FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'La quantité commandée doit être supérieure à zéro.';
        END IF;

        -- Verrouillage de la variante pour éviter toute incohérence concurrente
        SELECT id, product_id, size, color_name, stock_quantity, sku
        INTO v_variant
        FROM public.product_variants
        WHERE id = v_var_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante introuvable (ID: %).', v_var_id;
        END IF;

        -- Vérification stricte du stock disponible
        IF v_variant.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Stock insuffisant pour la taille % / % (Disponible: % pièce(s), Demandé: %).',
                v_variant.size, v_variant.color_name, v_variant.stock_quantity, v_qty;
        END IF;

        -- Vérification du prix réel en base (sécurité anti-falsification)
        SELECT id, name, price, discount_price, is_active, images
        INTO v_prod
        FROM public.products
        WHERE id = v_variant.product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produit parent introuvable pour la variante %.', v_var_id;
        END IF;

        IF NOT v_prod.is_active THEN
            RAISE EXCEPTION 'Le produit "%" est actuellement inactif.', v_prod.name;
        END IF;

        v_unit_price := COALESCE(v_prod.discount_price, v_prod.price);
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        -- Décrémentation atomique du stock de la variante
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_var_id;
    END LOOP;

    -- 6. Calcul des frais de livraison
    IF v_subtotal >= v_free_threshold THEN
        v_delivery_fee := 0;
    END IF;
    v_total := v_subtotal + v_delivery_fee;

    -- 7. Insertion de la commande
    INSERT INTO public.orders (
        id, order_reference, customer_name, customer_phone, city, address, notes,
        subtotal, delivery_fee, total, status, payment_method, created_at, updated_at
    ) VALUES (
        v_order_id, v_order_ref, TRIM(p_customer_name), TRIM(p_customer_phone),
        TRIM(p_city), TRIM(p_address), TRIM(COALESCE(p_notes, '')),
        v_subtotal, v_delivery_fee, v_total, v_order_status, 'COD',
        timezone('utc'::text, now()), timezone('utc'::text, now())
    );

    -- 8. Insertion des articles de commande
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT v.id as var_id, v.product_id, v.size, v.color_name,
               p.name as prod_name, COALESCE(p.discount_price, p.price) as real_unit_price,
               (p.images)[1] as default_img
        INTO v_variant
        FROM public.product_variants v
        JOIN public.products p ON p.id = v.product_id
        WHERE v.id = v_var_id;

        v_unit_price := v_variant.real_unit_price;
        v_line_total := v_unit_price * v_qty;

        INSERT INTO public.order_items (
            id, order_id, product_id, variant_id, product_name, size, color_name,
            quantity, unit_price, total_price, product_image
        ) VALUES (
            gen_random_uuid(), v_order_id, v_variant.product_id, v_var_id,
            v_variant.prod_name, v_variant.size, v_variant.color_name,
            v_qty, v_unit_price, v_line_total,
            COALESCE(NULLIF(v_item->>'product_image', ''), v_variant.default_img)
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
            'product_image', COALESCE(NULLIF(v_item->>'product_image', ''), v_variant.default_img)
        );
    END LOOP;

    -- 9. Retour de l'objet complet de la commande créée
    RETURN jsonb_build_object(
        'id', v_order_id,
        'order_reference', v_order_ref,
        'customer_name', TRIM(p_customer_name),
        'customer_phone', TRIM(p_customer_phone),
        'city', TRIM(p_city),
        'address', TRIM(p_address),
        'notes', TRIM(COALESCE(p_notes, '')),
        'subtotal', v_subtotal,
        'delivery_fee', v_delivery_fee,
        'total', v_total,
        'status', v_order_status,
        'payment_method', 'COD',
        'created_at', timezone('utc'::text, now()),
        'items', v_created_items
    );
END;
$$;

-- Restreindre strictement aux administrateurs
REVOKE ALL ON FUNCTION public.create_admin_manual_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_manual_order TO authenticated;

-- ------------------------------------------------------------------------------
-- 15. RPC ADMIN IDEMPOTENTE : cancel_order_and_restore_stock
-- Restaure le stock des variantes et passe le statut à 'Cancelled'.
-- Protégée contre les doubles annulations (idempotence).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_order_and_restore_stock(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_restored_count INTEGER := 0;
BEGIN
    -- 1. Contrôle d'accès strict
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs autorisés.';
    END IF;

    -- 2. Verrouillage de la ligne commande
    SELECT id, status INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    -- 3. Idempotence : Ne pas restaurer le stock une seconde fois si déjà annulée
    IF v_order.status = 'Cancelled' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'already_cancelled', true,
            'message', 'Cette commande est déjà annulée. Aucun stock supplémentaire n''a été modifié.'
        );
    END IF;

    -- 4. Restauration atomique du stock par variante
    FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants
            SET stock_quantity = stock_quantity + v_item.quantity,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.variant_id;

            v_restored_count := v_restored_count + 1;
        END IF;
    END LOOP;

    -- 5. Mise à jour du statut
    UPDATE public.orders
    SET status = 'Cancelled',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'already_cancelled', false,
        'restored_items_count', v_restored_count,
        'new_status', 'Cancelled'
    );
END;
$$;

-- Restreindre strictement aux administrateurs
REVOKE ALL ON FUNCTION public.cancel_order_and_restore_stock FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock TO authenticated;

-- ------------------------------------------------------------------------------
-- 16. DONNÉES INITIALES (SEEDING)
-- ------------------------------------------------------------------------------
INSERT INTO public.store_settings (
    store_name,
    whatsapp_number,
    instagram_url,
    currency,
    delivery_fee,
    free_delivery_threshold,
    hero_title,
    hero_subtitle,
    hero_badge,
    hero_image,
    hero_tag_badge,
    hero_card_tag,
    hero_card_title,
    hero_card_price,
    hero_card_original_price,
    hero_card_image
) VALUES (
    'DoArt Store',
    '212705176222',
    'https://instagram.com/doartstore',
    'MAD',
    35,
    600,
    'L’Élégance Minimaliste Inspirée par le Maroc.',
    'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.',
    'Nouvelle Collection 2026 • DoArt Studio',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
    'Casablanca Atelier',
    'Best-Seller',
    'Tracksuit Signature DoArt',
    '520 DH',
    '650 DH',
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80'
) ON CONFLICT DO NOTHING;
