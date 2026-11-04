-- ==============================================================================
-- DOART STORE - SCHEMA COMPLET SUPABASE POSTGRESQL (ARCHITECTURE V5 SÉCURISÉE)
-- Boutique E-commerce Marocaine (Commandes Directes WhatsApp + 8 RPC Métier Admin)
-- ==============================================================================
-- 
-- PRINCIPES D'ARCHITECTURE V5 :
-- 1. Le flux client "Commander via WhatsApp" s'exécute exclusivement côté client (wa.me).
--    Il ne crée JAMAIS de commande en base et ne décrémente JAMAIS les stocks lors du clic.
-- 2. Herméticité absolue PostgREST : Les tables sensibles (products, product_variants,
--    orders, order_items) n'ont AUCUNE politique d'écriture directe (INSERT/UPDATE/DELETE).
--    Toutes les mutations transitent exclusivement par les 8 RPC transactionnelles auditées.
-- 3. Protection absolue du stock et des variantes :
--    - expected_stock obligatoire pour toutes les variantes existantes sous verrou FOR UPDATE.
--    - Gestion granulaire du stock dans admin_save_product_with_variants : conservation du stock
--      si non spécifié, nouveau stock initialisé à zéro sans transfert automatique pour les variantes
--      historiques réidentifiées, validation stricte d'appartenance au produit.
-- 4. Protection historique totale des commandes :
--    - Clés étrangères ON DELETE RESTRICT sur order_items.order_id, order_items.product_id
--      et order_items.variant_id pour interdire toute suppression physique accidentelle.
-- 5. Prévention des Deadlocks (Verrouillage Déterministe) :
--    - Verrouillage ordonné (ORDER BY variant_id ASC FOR UPDATE) dans create_admin_manual_order
--      et admin_batch_update_variant_stock.
-- 6. Révocation exhaustive des fonctions SECURITY DEFINER non autorisées :
--    - Contrôle dynamique de toutes les fonctions SECURITY DEFINER de public avec révocation
--      des droits pour anon et authenticated, à l'exception stricte des 8 RPC et fonctions RBAC.
-- 7. Modèle générique et extensible pour toutes collections (prêt-à-porter, accessoires, bijoux).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. TABLES FONDAMENTALES (CRÉATION SI ABSENTES)
-- ------------------------------------------------------------------------------

-- 2.1 Table des Administrateurs (RBAC)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' NOT NULL CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 Table des Catégories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 Table des Produits
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

-- 2.4 Table des Variantes de Produits
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size VARCHAR(50) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#000000',
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    sku VARCHAR(100),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 Table des Commandes (Admin Only - COD Maroc)
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
    status VARCHAR(50) DEFAULT 'Confirmed' NOT NULL CHECK (
        status IN ('Pending WhatsApp Confirmation', 'Confirmed', 'Preparing', 'Shipped', 'Delivered', 'Cancelled')
    ),
    payment_method VARCHAR(20) DEFAULT 'COD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.6 Table des Articles de Commande (Relations historiques protégées)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(50) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    product_image TEXT
);

-- 2.7 Table des Paramètres Boutique (Singleton officiel)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT 'c0000001-0000-4000-8000-000000000001'::uuid,
    is_singleton BOOLEAN DEFAULT true NOT NULL,
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
-- 3. MIGRATIONS PROGRESSIVES (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10, 2) DEFAULT 0 NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD' NOT NULL;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id UUID;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS is_singleton BOOLEAN DEFAULT true;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_badge TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_image TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_tag_badge TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_card_tag TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_card_title TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_card_price TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_card_original_price TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_card_image TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS hero_featured_product_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. INTÉGRITÉ HISTORIQUE : CORRECTION DES CLÉS ÉTRANGÈRES & CONTRAINTES
-- SANS UTILISATION DE "DROP ... CASCADE"
-- VÉRIFICATION STRICTE DE LA DÉFINITION RÉELLE DANS PG_CONSTRAINT
-- (confrelid, confdeltype = 'r', confkey = 'id', convalidated = true)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
    v_order_items_oid OID := 'public.order_items'::regclass;
    v_orders_oid OID := 'public.orders'::regclass;
    v_variants_oid OID := 'public.product_variants'::regclass;
    v_products_oid OID := 'public.products'::regclass;
BEGIN
    -- 4.1 Remplacer toute contrainte FK sur order_items.order_id dont la définition réelle est incorrecte
    -- (confrelid != orders, confdeltype != 'r' [RESTRICT], confkey ne référence pas 'id', convalidated != true, ou nom non standard/doublon)
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = v_order_items_oid
          AND con.contype = 'f'
          AND att.attname = 'order_id'
          AND (
              con.confrelid != v_orders_oid
              OR con.confdeltype != 'r'
              OR con.conname != 'fk_order_items_order_id'
              OR cardinality(con.conkey) != 1
              OR cardinality(con.confkey) != 1
              OR NOT con.convalidated
              OR NOT EXISTS (
                  SELECT 1 FROM pg_attribute att_ref
                  WHERE att_ref.attrelid = con.confrelid
                    AND att_ref.attnum = con.confkey[1]
                    AND att_ref.attname = 'id'
              )
          )
    ) LOOP
        EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- 4.2 Remplacer toute contrainte FK sur order_items.variant_id dont la définition réelle est incorrecte
    -- (confrelid != product_variants, confdeltype != 'r' [RESTRICT], confkey ne référence pas 'id', convalidated != true, ou nom non standard/doublon)
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = v_order_items_oid
          AND con.contype = 'f'
          AND att.attname = 'variant_id'
          AND (
              con.confrelid != v_variants_oid
              OR con.confdeltype != 'r'
              OR con.conname != 'fk_order_items_variant_id'
              OR cardinality(con.conkey) != 1
              OR cardinality(con.confkey) != 1
              OR NOT con.convalidated
              OR NOT EXISTS (
                  SELECT 1 FROM pg_attribute att_ref
                  WHERE att_ref.attrelid = con.confrelid
                    AND att_ref.attnum = con.confkey[1]
                    AND att_ref.attname = 'id'
              )
          )
    ) LOOP
        EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- 4.3 Remplacer toute contrainte FK sur order_items.product_id dont la définition réelle est incorrecte
    -- (confrelid != products, confdeltype != 'r' [RESTRICT], confkey ne référence pas 'id', convalidated != true, ou nom non standard/doublon)
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = v_order_items_oid
          AND con.contype = 'f'
          AND att.attname = 'product_id'
          AND (
              con.confrelid != v_products_oid
              OR con.confdeltype != 'r'
              OR con.conname != 'fk_order_items_product_id'
              OR cardinality(con.conkey) != 1
              OR cardinality(con.confkey) != 1
              OR NOT con.convalidated
              OR NOT EXISTS (
                  SELECT 1 FROM pg_attribute att_ref
                  WHERE att_ref.attrelid = con.confrelid
                    AND att_ref.attnum = con.confkey[1]
                    AND att_ref.attname = 'id'
              )
          )
    ) LOOP
        EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    -- 4.4 Appliquer les contraintes ON DELETE RESTRICT strictes si non conformes ou absentes
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = v_order_items_oid
          AND con.conname = 'fk_order_items_order_id'
          AND con.confrelid = v_orders_oid
          AND con.confdeltype = 'r'
          AND con.contype = 'f'
          AND con.convalidated = true
          AND cardinality(con.conkey) = 1
          AND cardinality(con.confkey) = 1
          AND EXISTS (
              SELECT 1 FROM pg_attribute att_ref
              WHERE att_ref.attrelid = con.confrelid
                AND att_ref.attnum = con.confkey[1]
                AND att_ref.attname = 'id'
          )
    ) THEN
        ALTER TABLE public.order_items
            ADD CONSTRAINT fk_order_items_order_id
            FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = v_order_items_oid
          AND con.conname = 'fk_order_items_variant_id'
          AND con.confrelid = v_variants_oid
          AND con.confdeltype = 'r'
          AND con.contype = 'f'
          AND con.convalidated = true
          AND cardinality(con.conkey) = 1
          AND cardinality(con.confkey) = 1
          AND EXISTS (
              SELECT 1 FROM pg_attribute att_ref
              WHERE att_ref.attrelid = con.confrelid
                AND att_ref.attnum = con.confkey[1]
                AND att_ref.attname = 'id'
          )
    ) THEN
        ALTER TABLE public.order_items
            ADD CONSTRAINT fk_order_items_variant_id
            FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = v_order_items_oid
          AND con.conname = 'fk_order_items_product_id'
          AND con.confrelid = v_products_oid
          AND con.confdeltype = 'r'
          AND con.contype = 'f'
          AND con.convalidated = true
          AND cardinality(con.conkey) = 1
          AND cardinality(con.confkey) = 1
          AND EXISTS (
              SELECT 1 FROM pg_attribute att_ref
              WHERE att_ref.attrelid = con.confrelid
                AND att_ref.attnum = con.confkey[1]
                AND att_ref.attname = 'id'
          )
    ) THEN
        ALTER TABLE public.order_items
            ADD CONSTRAINT fk_order_items_product_id
            FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;

    -- 4.5 Retirer la contrainte UNIQUE globale sur (product_id, size, color_name)
    -- pour laisser place à l'index partiel actif
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_product_size_color'
          AND conrelid = 'public.product_variants'::regclass
    ) THEN
        ALTER TABLE public.product_variants DROP CONSTRAINT unique_product_size_color;
    END IF;
END $$;

-- Index partiel garantissant l'unicité uniquement parmi les variantes ACTIVES
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_product_size_color
ON public.product_variants (product_id, size, color_name)
WHERE is_active = true;

-- ------------------------------------------------------------------------------
-- 5. MIGRATION DU SINGLETON STORE_SETTINGS SANS CONFLIT NI PERTE DE DONNÉES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    c RECORD;
    v_count INTEGER;
    v_merged RECORD;
BEGIN
    FOR c IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.store_settings'::regclass
          AND contype = 'u'
    ) LOOP
        EXECUTE format('ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;

    SELECT COUNT(*) INTO v_count FROM public.store_settings;

    IF v_count > 0 THEN
        SELECT
            COALESCE((SELECT store_name FROM public.store_settings WHERE store_name IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'DoArt Store') as store_name,
            COALESCE((SELECT whatsapp_number FROM public.store_settings WHERE whatsapp_number IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), '212705176222') as whatsapp_number,
            COALESCE((SELECT instagram_url FROM public.store_settings WHERE instagram_url IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'https://instagram.com/doartstore') as instagram_url,
            COALESCE((SELECT currency FROM public.store_settings WHERE currency IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'MAD') as currency,
            COALESCE((SELECT delivery_fee FROM public.store_settings WHERE delivery_fee IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 35) as delivery_fee,
            COALESCE((SELECT free_delivery_threshold FROM public.store_settings WHERE free_delivery_threshold IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 600) as free_delivery_threshold,
            COALESCE((SELECT hero_title FROM public.store_settings WHERE hero_title IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'L’Élégance Minimaliste Inspirée par le Maroc.') as hero_title,
            COALESCE((SELECT hero_subtitle FROM public.store_settings WHERE hero_subtitle IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.') as hero_subtitle,
            COALESCE((SELECT hero_badge FROM public.store_settings WHERE hero_badge IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'Nouvelle Collection 2026 • DoArt Studio') as hero_badge,
            COALESCE((SELECT hero_image FROM public.store_settings WHERE hero_image IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85') as hero_image,
            COALESCE((SELECT hero_tag_badge FROM public.store_settings WHERE hero_tag_badge IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'Casablanca Atelier') as hero_tag_badge,
            COALESCE((SELECT hero_card_tag FROM public.store_settings WHERE hero_card_tag IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'Best-Seller') as hero_card_tag,
            COALESCE((SELECT hero_card_title FROM public.store_settings WHERE hero_card_title IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'Tracksuit Signature DoArt') as hero_card_title,
            COALESCE((SELECT hero_card_price FROM public.store_settings WHERE hero_card_price IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), '520 DH') as hero_card_price,
            COALESCE((SELECT hero_card_original_price FROM public.store_settings WHERE hero_card_original_price IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), '650 DH') as hero_card_original_price,
            COALESCE((SELECT hero_card_image FROM public.store_settings WHERE hero_card_image IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1), 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80') as hero_card_image,
            (SELECT hero_featured_product_id FROM public.store_settings WHERE hero_featured_product_id IS NOT NULL ORDER BY updated_at DESC NULLS LAST LIMIT 1) as hero_featured_product_id
        INTO v_merged;

        INSERT INTO public.store_settings (
            id, is_singleton, store_name, whatsapp_number, instagram_url, currency,
            delivery_fee, free_delivery_threshold, hero_title, hero_subtitle, hero_badge,
            hero_image, hero_tag_badge, hero_card_tag, hero_card_title, hero_card_price,
            hero_card_original_price, hero_card_image, hero_featured_product_id, updated_at
        ) VALUES (
            'c0000001-0000-4000-8000-000000000001'::uuid, true,
            v_merged.store_name, v_merged.whatsapp_number, v_merged.instagram_url, v_merged.currency,
            v_merged.delivery_fee, v_merged.free_delivery_threshold, v_merged.hero_title, v_merged.hero_subtitle,
            v_merged.hero_badge, v_merged.hero_image, v_merged.hero_tag_badge, v_merged.hero_card_tag,
            v_merged.hero_card_title, v_merged.hero_card_price, v_merged.hero_card_original_price,
            v_merged.hero_card_image, v_merged.hero_featured_product_id, timezone('utc'::text, now())
        )
        ON CONFLICT (id) DO UPDATE SET
            is_singleton = true,
            store_name = EXCLUDED.store_name,
            whatsapp_number = EXCLUDED.whatsapp_number,
            instagram_url = EXCLUDED.instagram_url,
            currency = EXCLUDED.currency,
            delivery_fee = EXCLUDED.delivery_fee,
            free_delivery_threshold = EXCLUDED.free_delivery_threshold,
            hero_title = EXCLUDED.hero_title,
            hero_subtitle = EXCLUDED.hero_subtitle,
            hero_badge = EXCLUDED.hero_badge,
            hero_image = EXCLUDED.hero_image,
            hero_tag_badge = EXCLUDED.hero_tag_badge,
            hero_card_tag = EXCLUDED.hero_card_tag,
            hero_card_title = EXCLUDED.hero_card_title,
            hero_card_price = EXCLUDED.hero_card_price,
            hero_card_original_price = EXCLUDED.hero_card_original_price,
            hero_card_image = EXCLUDED.hero_card_image,
            hero_featured_product_id = EXCLUDED.hero_featured_product_id,
            updated_at = timezone('utc'::text, now());

        DELETE FROM public.store_settings WHERE id != 'c0000001-0000-4000-8000-000000000001'::uuid;
    ELSE
        INSERT INTO public.store_settings (
            id, is_singleton, store_name, whatsapp_number, instagram_url, currency,
            delivery_fee, free_delivery_threshold, hero_title, hero_subtitle, hero_badge,
            hero_image, hero_tag_badge, hero_card_tag, hero_card_title, hero_card_price,
            hero_card_original_price, hero_card_image, updated_at
        ) VALUES (
            'c0000001-0000-4000-8000-000000000001'::uuid, true,
            'DoArt Store', '212705176222', 'https://instagram.com/doartstore', 'MAD',
            35, 600,
            'L’Élégance Minimaliste Inspirée par le Maroc.',
            'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.',
            'Nouvelle Collection 2026 • DoArt Studio',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
            'Casablanca Atelier', 'Best-Seller', 'Tracksuit Signature DoArt', '520 DH', '650 DH',
            'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80',
            timezone('utc'::text, now())
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    UPDATE public.store_settings SET is_singleton = true WHERE id = 'c0000001-0000-4000-8000-000000000001'::uuid;
END $$;

ALTER TABLE public.store_settings ALTER COLUMN is_singleton SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'store_settings_singleton_key'
    ) THEN
        ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_singleton_key UNIQUE (is_singleton);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. INDEX DE PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_is_active ON public.product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- ------------------------------------------------------------------------------
-- 7. FONCTIONS DE VÉRIFICATION RBAC (SECURITY DEFINER)
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

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. HERMÉTICITÉ POSTGREST & NETTOYAGE DES POLITIQUES RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('products', 'product_variants', 'orders', 'order_items')
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.product_variants FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated, PUBLIC;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.store_settings TO anon, authenticated;

DROP POLICY IF EXISTS "Allow admin read admin_users" ON public.admin_users;
CREATE POLICY "Allow admin read admin_users" ON public.admin_users
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow public read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin manage categories" ON public.categories;
CREATE POLICY "Allow public read categories" ON public.categories
FOR SELECT USING (true);
CREATE POLICY "Allow admin manage categories" ON public.categories
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
DROP POLICY IF EXISTS "Allow admin read all products" ON public.products;
CREATE POLICY "Allow public read active products" ON public.products
FOR SELECT USING (is_active = true);
CREATE POLICY "Allow admin read all products" ON public.products
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow public read active variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow admin read all variants" ON public.product_variants;
CREATE POLICY "Allow public read active variants" ON public.product_variants
FOR SELECT USING (
    is_active = true AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id AND p.is_active = true
    )
);
CREATE POLICY "Allow admin read all variants" ON public.product_variants
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin read orders" ON public.orders;
CREATE POLICY "Allow admin read orders" ON public.orders
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow admin read order_items" ON public.order_items;
CREATE POLICY "Allow admin read order_items" ON public.order_items
FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow public read store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow admin update store_settings" ON public.store_settings;
CREATE POLICY "Allow public read store_settings" ON public.store_settings
FOR SELECT USING (true);
CREATE POLICY "Allow admin update store_settings" ON public.store_settings
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. RÉVOCATION EXHAUSTIVE DES FONCTIONS SECURITY DEFINER NON AUTORISÉES
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_cod_order(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_cod_order(character varying, character varying, character varying, text, text, jsonb);
DROP FUNCTION IF EXISTS public.activate_super_admin(VARCHAR);
DROP FUNCTION IF EXISTS public.activate_super_admin(character varying);

-- Révocation et suppression de l'ancienne signature à 6 paramètres de create_admin_manual_order
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT p.proname, oidvectortypes(p.proargtypes) AS argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'create_admin_manual_order'
          AND p.pronargs = 6
    ) LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
            r.proname, r.argtypes);
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s)',
            r.proname, r.argtypes);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.create_admin_manual_order(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.create_admin_manual_order(character varying, character varying, character varying, text, text, jsonb);

-- Révoquer dynamiquement les privilèges anon/authenticated sur TOUTE fonction SECURITY DEFINER
-- du schéma public dont la signature exacte ne figure pas dans la whitelist des 8 RPC officielles
-- et des 2 fonctions RBAC (révoquant ainsi toutes les surcharges non autorisées).
DO $$
DECLARE
    r RECORD;
    v_sig TEXT;
    v_authorized_signatures TEXT[] := ARRAY[
        -- 2 Fonctions RBAC
        'is_admin()',
        'is_super_admin()',
        -- 8 RPC Métier Officielles (signatures canoniques PostgreSQL et alias varchar)
        'admin_save_product_with_variants(jsonb, jsonb)',
        'admin_archive_product(uuid)',
        'admin_update_variant_stock(uuid, integer, integer)',
        'admin_update_variant_stock(uuid, int4, int4)',
        'admin_batch_update_variant_stock(jsonb)',
        'admin_update_order_customer(uuid, character varying, character varying, character varying, text, text)',
        'admin_update_order_customer(uuid, varchar, varchar, varchar, text, text)',
        'create_admin_manual_order(character varying, character varying, character varying, text, text, jsonb, character varying)',
        'create_admin_manual_order(varchar, varchar, varchar, text, text, jsonb, varchar)',
        'cancel_order_and_restore_stock(uuid)',
        'admin_update_order_status(uuid, character varying)',
        'admin_update_order_status(uuid, varchar)'
    ];
BEGIN
    FOR r IN (
        SELECT p.proname, oidvectortypes(p.proargtypes) AS argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
    ) LOOP
        v_sig := r.proname || '(' || COALESCE(r.argtypes, '') || ')';
        IF NOT (v_sig = ANY(v_authorized_signatures)) THEN
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                r.proname, r.argtypes);
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 10. STORAGE BUCKET POUR LES IMAGES
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

-- ==============================================================================
-- 11. LES 8 FONCTIONS STOCKÉES MÉTIER OFFICIELLES (V5 VALIDÉES)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- RPC 1 : admin_save_product_with_variants
-- Enregistrement transactionnel d'un produit et de ses variantes.
-- expected_stock OBLIGATOIRE pour toute variante existante sous FOR UPDATE.
-- Conservation du stock existant en cas d'omission.
-- Pour variante historique modifiée : archivage de l'ancien UUID sans transfert
-- automatique du stock, initialisation à zéro du nouvel UUID si non spécifié.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_save_product_with_variants(
    p_product JSONB,
    p_variants JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_product_id UUID;
    v_slug VARCHAR;
    v_variant JSONB;
    v_var_id UUID;
    v_size VARCHAR;
    v_color_name VARCHAR;
    v_stock INTEGER;
    v_expected_stock INTEGER;
    v_existing RECORD;
    v_is_referenced BOOLEAN;
    v_active_var_ids UUID[] := '{}';
    v_saved_variants JSONB := '[]'::JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    IF p_product ? 'id' AND p_product->>'id' IS NOT NULL AND p_product->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_product_id := (p_product->>'id')::UUID;
    ELSE
        v_product_id := gen_random_uuid();
    END IF;

    v_slug := TRIM(COALESCE(p_product->>'slug', ''));
    IF v_slug = '' THEN
        v_slug := lower(regexp_replace(COALESCE(p_product->>'name', 'produit'), '[^a-zA-Z0-9]+', '-', 'g'));
    END IF;

    INSERT INTO public.products (
        id, name, slug, description, price, discount_price, category_id,
        images, is_active, is_featured, is_new, updated_at
    ) VALUES (
        v_product_id,
        TRIM(COALESCE(p_product->>'name', 'Sans titre')),
        v_slug,
        COALESCE(p_product->>'description', ''),
        COALESCE((p_product->>'price')::NUMERIC, 0),
        CASE WHEN (p_product->>'discount_price') IS NOT NULL AND (p_product->>'discount_price') != '' THEN (p_product->>'discount_price')::NUMERIC ELSE NULL END,
        CASE WHEN (p_product->>'category_id') IS NOT NULL AND (p_product->>'category_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (p_product->>'category_id')::UUID ELSE NULL END,
        COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(COALESCE(p_product->'images', '[]'::jsonb)) t(x)), '{}'),
        COALESCE((p_product->>'is_active')::BOOLEAN, true),
        COALESCE((p_product->>'is_featured')::BOOLEAN, false),
        COALESCE((p_product->>'is_new')::BOOLEAN, true),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        discount_price = EXCLUDED.discount_price,
        category_id = EXCLUDED.category_id,
        images = EXCLUDED.images,
        is_active = EXCLUDED.is_active,
        is_featured = EXCLUDED.is_featured,
        is_new = EXCLUDED.is_new,
        updated_at = timezone('utc'::text, now());

    IF p_variants IS NOT NULL AND jsonb_typeof(p_variants) = 'array' THEN
        FOR v_variant IN SELECT * FROM jsonb_array_elements(p_variants)
        LOOP
            v_size := TRIM(COALESCE(v_variant->>'size', 'Standard'));
            v_color_name := TRIM(COALESCE(v_variant->>'color_name', 'Standard'));

            IF v_variant ? 'id' AND v_variant->>'id' IS NOT NULL AND v_variant->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                v_var_id := (v_variant->>'id')::UUID;
                SELECT * INTO v_existing FROM public.product_variants WHERE id = v_var_id FOR UPDATE;

                IF FOUND THEN
                    -- Vérification stricte d'appartenance de la variante au produit
                    IF v_existing.product_id != v_product_id THEN
                        RAISE EXCEPTION 'Sécurité : La variante % n''appartient pas au produit % (propriétaire réel: %).',
                            v_var_id, v_product_id, v_existing.product_id;
                    END IF;

                    -- expected_stock OBLIGATOIRE pour toute variante existante
                    IF NOT (v_variant ? 'expected_stock') 
                       OR v_variant->>'expected_stock' IS NULL 
                       OR (v_variant->>'expected_stock') !~ '^-?[0-9]+$' 
                       OR (v_variant->>'expected_stock')::INTEGER < 0 THEN
                        RAISE EXCEPTION 'Le paramètre expected_stock est obligatoire pour toute variante existante (Variante: % / %).',
                            v_size, v_color_name;
                    END IF;

                    v_expected_stock := (v_variant->>'expected_stock')::INTEGER;
                    IF v_existing.stock_quantity != v_expected_stock THEN
                        RAISE EXCEPTION 'Conflit de concurrence sur la variante % : le stock en base (%) ne correspond pas au stock attendu (%).',
                            v_var_id, v_existing.stock_quantity, v_expected_stock;
                    END IF;

                    -- Déterminer le stock à appliquer
                    IF v_variant ? 'stock_quantity' AND v_variant->>'stock_quantity' IS NOT NULL THEN
                        IF (v_variant->>'stock_quantity') !~ '^-?[0-9]+$' OR (v_variant->>'stock_quantity')::INTEGER < 0 THEN
                            RAISE EXCEPTION 'La quantité de stock doit être un entier supérieur ou égal à zéro (Variante: % / %).',
                                v_size, v_color_name;
                        END IF;
                        v_stock := (v_variant->>'stock_quantity')::INTEGER;
                    ELSE
                        -- Stock omis : conserver le stock actuel de la variante existante
                        v_stock := v_existing.stock_quantity;
                    END IF;

                    -- Changement de taille ou couleur ?
                    IF v_existing.size != v_size OR v_existing.color_name != v_color_name THEN
                        SELECT EXISTS(SELECT 1 FROM public.order_items WHERE variant_id = v_var_id) INTO v_is_referenced;
                        IF v_is_referenced THEN
                            -- Variante historique commandée : archiver l'ancien UUID sans modifier son stock
                            UPDATE public.product_variants SET is_active = false, updated_at = timezone('utc'::text, now()) WHERE id = v_var_id;

                            -- Créer un nouvel UUID avec stock spécifié ou zéro (aucun transfert automatique)
                            IF v_variant ? 'stock_quantity' AND v_variant->>'stock_quantity' IS NOT NULL THEN
                                v_stock := (v_variant->>'stock_quantity')::INTEGER;
                            ELSE
                                v_stock := 0;
                            END IF;

                            v_var_id := gen_random_uuid();
                            INSERT INTO public.product_variants (
                                id, product_id, size, color_name, color_hex, stock_quantity, sku, is_active, updated_at
                            ) VALUES (
                                v_var_id, v_product_id, v_size, v_color_name,
                                COALESCE(v_variant->>'color_hex', '#000000'),
                                v_stock,
                                v_variant->>'sku', true, timezone('utc'::text, now())
                            );
                        ELSE
                            -- Variante non commandée : mise à jour en place (stock conservé ou mis à jour)
                            UPDATE public.product_variants SET
                                size = v_size,
                                color_name = v_color_name,
                                color_hex = COALESCE(v_variant->>'color_hex', '#000000'),
                                stock_quantity = v_stock,
                                sku = v_variant->>'sku',
                                is_active = true,
                                updated_at = timezone('utc'::text, now())
                            WHERE id = v_var_id;
                        END IF;
                    ELSE
                        -- Même taille et même couleur : mise à jour en place
                        UPDATE public.product_variants SET
                            color_hex = COALESCE(v_variant->>'color_hex', '#000000'),
                            stock_quantity = v_stock,
                            sku = v_variant->>'sku',
                            is_active = true,
                            updated_at = timezone('utc'::text, now())
                        WHERE id = v_var_id;
                    END IF;
                ELSE
                    -- ID fourni mais inexistant en base : création
                    IF v_variant ? 'stock_quantity' AND v_variant->>'stock_quantity' IS NOT NULL THEN
                        IF (v_variant->>'stock_quantity') !~ '^-?[0-9]+$' OR (v_variant->>'stock_quantity')::INTEGER < 0 THEN
                            RAISE EXCEPTION 'La quantité de stock doit être un entier supérieur ou égal à zéro.';
                        END IF;
                        v_stock := (v_variant->>'stock_quantity')::INTEGER;
                    ELSE
                        v_stock := 0;
                    END IF;

                    INSERT INTO public.product_variants (
                        id, product_id, size, color_name, color_hex, stock_quantity, sku, is_active, updated_at
                    ) VALUES (
                        v_var_id, v_product_id, v_size, v_color_name,
                        COALESCE(v_variant->>'color_hex', '#000000'),
                        v_stock,
                        v_variant->>'sku', true, timezone('utc'::text, now())
                    );
                END IF;
            ELSE
                -- Pas d'UUID fourni : création systématique d'une NOUVELLE variante avec nouvel UUID
                -- (Ne jamais réactiver automatiquement une variante inactive sans son UUID explicite)
                IF v_variant ? 'stock_quantity' AND v_variant->>'stock_quantity' IS NOT NULL THEN
                    IF (v_variant->>'stock_quantity') !~ '^-?[0-9]+$' OR (v_variant->>'stock_quantity')::INTEGER < 0 THEN
                        RAISE EXCEPTION 'La quantité de stock doit être un entier supérieur ou égal à zéro.';
                    END IF;
                    v_stock := (v_variant->>'stock_quantity')::INTEGER;
                ELSE
                    v_stock := 0;
                END IF;

                v_var_id := gen_random_uuid();
                INSERT INTO public.product_variants (
                    id, product_id, size, color_name, color_hex, stock_quantity, sku, is_active, updated_at
                ) VALUES (
                    v_var_id, v_product_id, v_size, v_color_name,
                    COALESCE(v_variant->>'color_hex', '#000000'),
                    v_stock,
                    v_variant->>'sku', true, timezone('utc'::text, now())
                );
            END IF;

            v_active_var_ids := array_append(v_active_var_ids, v_var_id);
        END LOOP;

        -- Archiver (is_active = false) les variantes retirées de la matrice sans suppression physique
        UPDATE public.product_variants
        SET is_active = false, updated_at = timezone('utc'::text, now())
        WHERE product_id = v_product_id AND NOT (id = ANY(v_active_var_ids));
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
        'id', pv.id,
        'product_id', pv.product_id,
        'size', pv.size,
        'color_name', pv.color_name,
        'color_hex', pv.color_hex,
        'stock_quantity', pv.stock_quantity,
        'sku', pv.sku,
        'is_active', pv.is_active
    )) INTO v_saved_variants
    FROM public.product_variants pv
    WHERE pv.product_id = v_product_id AND pv.is_active = true;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', v_product_id,
        'product', (SELECT row_to_json(p.*) FROM public.products p WHERE p.id = v_product_id),
        'variants', COALESCE(v_saved_variants, '[]'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_product_with_variants FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product_with_variants TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 2 : admin_archive_product
-- Archive logiquement un produit et ses variantes (is_active = false)
-- sans suppression physique et sans perte ni remise à zéro des stocks.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_archive_product(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    UPDATE public.products
    SET is_active = false, updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produit introuvable (ID: %).', p_product_id;
    END IF;

    UPDATE public.product_variants
    SET is_active = false, updated_at = timezone('utc'::text, now())
    WHERE product_id = p_product_id;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'is_active', false,
        'message', 'Produit et variantes archivés sans suppression physique.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_archive_product FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_product TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 3 : admin_update_variant_stock
-- Met à jour le stock d'une variante individuelle.
-- p_expected_stock est OBLIGATOIRE pour garantir le contrôle optimiste.
-- Refuse toute valeur de stock invalide ou négative.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_variant_stock(
    p_variant_id UUID,
    p_new_stock INTEGER,
    p_expected_stock INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_variant RECORD;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    IF p_new_stock IS NULL OR p_new_stock < 0 THEN
        RAISE EXCEPTION 'La quantité de stock doit être un entier supérieur ou égal à zéro.';
    END IF;

    IF p_expected_stock IS NULL OR p_expected_stock < 0 THEN
        RAISE EXCEPTION 'Le paramètre p_expected_stock est obligatoire pour le contrôle de concurrence optimiste et doit être supérieur ou égal à zéro.';
    END IF;

    SELECT id, stock_quantity, size, color_name INTO v_variant
    FROM public.product_variants
    WHERE id = p_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Variante introuvable (ID: %).', p_variant_id;
    END IF;

    IF v_variant.stock_quantity != p_expected_stock THEN
        RAISE EXCEPTION 'Conflit de concurrence : le stock actuel (%) est différent du stock attendu (%).',
            v_variant.stock_quantity, p_expected_stock;
    END IF;

    UPDATE public.product_variants
    SET stock_quantity = p_new_stock,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_variant_id;

    RETURN jsonb_build_object(
        'success', true,
        'variant_id', p_variant_id,
        'previous_stock', v_variant.stock_quantity,
        'stock_quantity', p_new_stock
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_variant_stock FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_variant_stock TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 4 : admin_batch_update_variant_stock
-- Mise à jour groupée transactionnelle du stock.
-- Verrouille les variantes par ordre déterministe (UUID croissant) pour éliminer les deadlocks.
-- Exige expected_stock sur chaque élément.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_batch_update_variant_stock(p_updates JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_update JSONB;
    v_var_id UUID;
    v_new_stock INTEGER;
    v_expected_stock INTEGER;
    v_variant RECORD;
    v_updated_variants JSONB := '[]'::JSONB;
    v_count INTEGER := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    IF p_updates IS NULL OR jsonb_typeof(p_updates) != 'array' OR jsonb_array_length(p_updates) = 0 THEN
        RAISE EXCEPTION 'Le tableau des mises à jour de stock est vide ou invalide.';
    END IF;

    FOR v_update IN
        SELECT item FROM (
            SELECT value as item, (value->>'variant_id')::UUID as v_id
            FROM jsonb_array_elements(p_updates)
        ) sub
        ORDER BY sub.v_id ASC
    LOOP
        v_var_id := (v_update->>'variant_id')::UUID;

        IF (v_update->>'new_stock') IS NULL 
           OR (v_update->>'new_stock') !~ '^-?[0-9]+$' 
           OR (v_update->>'new_stock')::INTEGER < 0 THEN
            RAISE EXCEPTION 'La quantité de stock doit être un entier supérieur ou égal à zéro (Variante %).', v_var_id;
        END IF;
        v_new_stock := (v_update->>'new_stock')::INTEGER;

        IF NOT (v_update ? 'expected_stock')
           OR v_update->>'expected_stock' IS NULL
           OR (v_update->>'expected_stock') !~ '^-?[0-9]+$'
           OR (v_update->>'expected_stock')::INTEGER < 0 THEN
            RAISE EXCEPTION 'Le paramètre expected_stock est obligatoire et doit être un entier >= 0 pour la variante %.', v_var_id;
        END IF;
        v_expected_stock := (v_update->>'expected_stock')::INTEGER;

        SELECT id, stock_quantity, size, color_name INTO v_variant
        FROM public.product_variants
        WHERE id = v_var_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante introuvable (ID: %).', v_var_id;
        END IF;

        IF v_variant.stock_quantity != v_expected_stock THEN
            RAISE EXCEPTION 'Conflit de concurrence sur la variante % : stock actuel % vs attendu %.',
                v_var_id, v_variant.stock_quantity, v_expected_stock;
        END IF;

        UPDATE public.product_variants
        SET stock_quantity = v_new_stock,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_var_id;

        v_count := v_count + 1;
        v_updated_variants := v_updated_variants || jsonb_build_object(
            'variant_id', v_var_id,
            'stock_quantity', v_new_stock
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_count,
        'variants', v_updated_variants
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_batch_update_variant_stock FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_batch_update_variant_stock TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 5 : admin_update_order_customer
-- Met à jour les coordonnées client d'une commande.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_order_customer(
    p_order_id UUID,
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    IF TRIM(COALESCE(p_customer_name, '')) = '' THEN
        RAISE EXCEPTION 'Le nom du client est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_customer_phone, '')) = '' THEN
        RAISE EXCEPTION 'Le téléphone WhatsApp du client est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_city, '')) = '' THEN
        RAISE EXCEPTION 'La ville de livraison est obligatoire.';
    END IF;
    IF TRIM(COALESCE(p_address, '')) = '' THEN
        RAISE EXCEPTION 'L''adresse de livraison est obligatoire.';
    END IF;

    UPDATE public.orders
    SET customer_name = TRIM(p_customer_name),
        customer_phone = TRIM(p_customer_phone),
        city = TRIM(p_city),
        address = TRIM(p_address),
        notes = TRIM(COALESCE(p_notes, '')),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'message', 'Coordonnées client mises à jour avec succès.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_customer FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_customer TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 6 : create_admin_manual_order
-- Création transactionnelle d'une commande administrative.
-- Accepte p_status VARCHAR DEFAULT 'Confirmed' pour alignement strict frontend
-- et refuse toute valeur différente de 'Confirmed'.
-- Verrouille les variantes par ordre déterministe (UUID croissant).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_admin_manual_order(
    p_customer_name VARCHAR,
    p_customer_phone VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_notes TEXT,
    p_items JSONB,
    p_status VARCHAR DEFAULT 'Confirmed'
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
    v_item_id UUID;
    v_product_img TEXT;
    v_created_items JSONB := '[]'::JSONB;
    v_attempt INTEGER := 0;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Seuls les administrateurs DoArt Store peuvent enregistrer une commande.';
    END IF;

    -- Refuser toute valeur de statut différente de 'Confirmed'
    IF p_status IS NOT NULL AND TRIM(p_status) != 'Confirmed' THEN
        RAISE EXCEPTION 'Statut initial invalide : toute nouvelle commande enregistrée doit être au statut Confirmed.';
    END IF;

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

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La commande doit comporter au moins un article.';
    END IF;
    IF jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION 'Une commande ne peut pas contenir plus de 50 articles distincts.';
    END IF;

    SELECT COALESCE(delivery_fee, 35), COALESCE(free_delivery_threshold, 600)
    INTO v_delivery_fee, v_free_threshold
    FROM public.store_settings
    LIMIT 1;

    IF v_delivery_fee IS NULL THEN v_delivery_fee := 35; END IF;
    IF v_free_threshold IS NULL THEN v_free_threshold := 600; END IF;

    -- Parcours déterministe ordonné par UUID croissant pour éliminer tout risque d'interblocage
    FOR v_item IN
        SELECT item FROM (
            SELECT value as item, (value->>'variant_id')::UUID as v_id
            FROM jsonb_array_elements(p_items)
        ) sub
        ORDER BY sub.v_id ASC
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 100 THEN
            RAISE EXCEPTION 'Quantité invalide (doit être comprise entre 1 et 100).';
        END IF;

        SELECT id, product_id, size, color_name, stock_quantity, is_active
        INTO v_variant
        FROM public.product_variants
        WHERE id = v_var_id
        FOR UPDATE;

        IF NOT FOUND OR NOT v_variant.is_active THEN
            RAISE EXCEPTION 'Variante introuvable ou inactive (ID: %).', v_var_id;
        END IF;

        IF v_variant.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Stock insuffisant pour % (Taille: %, Couleur: %). Disponible: % pièce(s), Demandé: %.',
                v_variant.size, v_variant.color_name, v_variant.stock_quantity, v_qty;
        END IF;

        SELECT id, name, price, discount_price, is_active, images
        INTO v_prod
        FROM public.products
        WHERE id = v_variant.product_id;

        IF NOT FOUND OR NOT v_prod.is_active THEN
            RAISE EXCEPTION 'Le produit parent est introuvable ou inactif.';
        END IF;

        v_unit_price := COALESCE(v_prod.discount_price, v_prod.price);
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_var_id;
    END LOOP;

    IF v_subtotal >= v_free_threshold THEN
        v_delivery_fee := 0;
    END IF;
    v_total := v_subtotal + v_delivery_fee;

    -- Statut initial : IMPÉRATIVEMENT 'Confirmed'
    FOR v_attempt IN 1..5 LOOP
        v_order_ref := 'DOA-' || to_char(now(), 'YYYY') || '-' || upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 8));
        BEGIN
            INSERT INTO public.orders (
                id, order_reference, customer_name, customer_phone, city, address, notes,
                subtotal, delivery_fee, total, status, payment_method, created_at, updated_at
            ) VALUES (
                v_order_id, v_order_ref, TRIM(p_customer_name), TRIM(p_customer_phone),
                TRIM(p_city), TRIM(p_address), TRIM(COALESCE(p_notes, '')),
                v_subtotal, v_delivery_fee, v_total, 'Confirmed', 'COD',
                timezone('utc'::text, now()), timezone('utc'::text, now())
            );
            EXIT;
        EXCEPTION
            WHEN unique_violation THEN
                IF v_attempt = 5 THEN
                    RAISE EXCEPTION 'Échec de génération d''une référence unique après 5 tentatives.';
                END IF;
        END;
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_item_id := gen_random_uuid();

        SELECT v.id as var_id, v.product_id, v.size, v.color_name, v.stock_quantity as remaining_stock,
               p.name as prod_name, COALESCE(p.discount_price, p.price) as real_unit_price,
               p.images as prod_images
        INTO v_variant
        FROM public.product_variants v
        JOIN public.products p ON p.id = v.product_id
        WHERE v.id = v_var_id;

        v_unit_price := v_variant.real_unit_price;
        v_line_total := v_unit_price * v_qty;

        IF v_variant.prod_images IS NOT NULL AND array_length(v_variant.prod_images, 1) > 0 THEN
            v_product_img := v_variant.prod_images[1];
        ELSE
            v_product_img := NULL;
        END IF;

        INSERT INTO public.order_items (
            id, order_id, product_id, variant_id, product_name, size, color_name,
            quantity, unit_price, total_price, product_image
        ) VALUES (
            v_item_id, v_order_id, v_variant.product_id, v_var_id,
            v_variant.prod_name, v_variant.size, v_variant.color_name,
            v_qty, v_unit_price, v_line_total, v_product_img
        );

        v_created_items := v_created_items || jsonb_build_object(
            'id', v_item_id,
            'order_id', v_order_id,
            'product_id', v_variant.product_id,
            'variant_id', v_var_id,
            'product_name', v_variant.prod_name,
            'size', v_variant.size,
            'color_name', v_variant.color_name,
            'quantity', v_qty,
            'unit_price', v_unit_price,
            'total_price', v_line_total,
            'product_image', v_product_img,
            'remaining_stock', v_variant.remaining_stock
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_order_id,
        'order_id', v_order_id,
        'order_reference', v_order_ref,
        'customer_name', TRIM(p_customer_name),
        'customer_phone', TRIM(p_customer_phone),
        'city', TRIM(p_city),
        'address', TRIM(p_address),
        'notes', TRIM(COALESCE(p_notes, '')),
        'subtotal', v_subtotal,
        'delivery_fee', v_delivery_fee,
        'total', v_total,
        'status', 'Confirmed',
        'payment_method', 'COD',
        'created_at', timezone('utc'::text, now()),
        'items', v_created_items
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_manual_order(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, JSONB, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_manual_order(VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, JSONB, VARCHAR) TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 7 : cancel_order_and_restore_stock
-- Annulation idempotente : ne réincrémente jamais si la commande est déjà annulée.
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
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs autorisés.';
    END IF;

    SELECT id, status INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    IF v_order.status = 'Cancelled' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'already_cancelled', true,
            'message', 'Cette commande est déjà annulée. Aucun stock supplémentaire n''a été modifié.'
        );
    END IF;

    -- Parcourir par ordre déterministe pour éviter les deadlocks lors de la restitution des stocks
    FOR v_item IN 
        SELECT variant_id, quantity 
        FROM public.order_items 
        WHERE order_id = p_order_id 
        ORDER BY variant_id ASC
    LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants
            SET stock_quantity = stock_quantity + v_item.quantity,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.variant_id;

            v_restored_count := v_restored_count + 1;
        END IF;
    END LOOP;

    UPDATE public.orders
    SET status = 'Cancelled',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'already_cancelled', false,
        'restored_items_count', v_restored_count,
        'status', 'Cancelled'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_and_restore_stock FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_restore_stock TO authenticated;

-- ------------------------------------------------------------------------------
-- RPC 8 : admin_update_order_status
-- Met à jour le statut d'une commande.
-- Interdiction formelle de réactiver une commande annulée.
-- Interdiction de passer à 'Cancelled' directement (oblige l'usage de cancel_order_and_restore_stock).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_status VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current_status VARCHAR;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Accès refusé : Action réservée aux administrateurs.';
    END IF;

    SELECT status INTO v_current_status
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commande introuvable (ID: %).', p_order_id;
    END IF;

    IF v_current_status = 'Cancelled' THEN
        RAISE EXCEPTION 'Une commande annulée ne peut pas être réactivée.';
    END IF;

    IF p_status = 'Cancelled' THEN
        RAISE EXCEPTION 'L''annulation d''une commande doit obligatoirement passer par la procédure cancel_order_and_restore_stock afin de restaurer les stocks.';
    END IF;

    IF p_status NOT IN ('Pending WhatsApp Confirmation', 'Confirmed', 'Preparing', 'Shipped', 'Delivered') THEN
        RAISE EXCEPTION 'Statut de commande invalide: %', p_status;
    END IF;

    UPDATE public.orders
    SET status = p_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', p_status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_status FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_status TO authenticated;

-- ==============================================================================
-- 12. PROCÉDURE MANUELLE D'ACTIVATION SUPER_ADMIN (À EXÉCUTER DANS LE SQL EDITOR)
-- Exige l'UUID utilisateur explicite, l'e-mail correspondant et email_confirmed_at IS NOT NULL.
-- ==============================================================================
/*
DO $$
DECLARE
    v_user_id UUID := 'VOTRE-UUID-UTILISATEUR-AUTH'::uuid;
    v_email VARCHAR := 'hatim.benziti@gmail.com';
    v_confirmed_at TIMESTAMPTZ;
BEGIN
    SELECT email_confirmed_at INTO v_confirmed_at
    FROM auth.users
    WHERE id = v_user_id AND LOWER(email) = LOWER(v_email);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Compte introuvable dans auth.users avec cet UUID et cette adresse e-mail.';
    END IF;

    IF v_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'L''utilisateur n''a pas encore confirmé son adresse e-mail dans Supabase Auth.';
    END IF;

    INSERT INTO public.admin_users (id, email, role, created_at)
    VALUES (v_user_id, LOWER(v_email), 'super_admin', timezone('utc'::text, now()))
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin',
        email = LOWER(v_email);

    RAISE NOTICE 'Super admin activé avec succès pour % (UUID: %)', v_email, v_user_id;
END $$;
*/
