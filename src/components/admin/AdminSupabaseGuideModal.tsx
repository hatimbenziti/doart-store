import React, { useState } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Server,
  Key,
  ShieldAlert,
  Save,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveLocalSupabaseCredentials,
  isSupabaseConnected,
} from '../../lib/supabase';

interface AdminSupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSupabaseGuideModal: React.FC<AdminSupabaseGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(currentCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(currentCreds.key);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fullSQL = `-- ==============================================================================
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

-- 7. Create Order Items Table (Articles commandés avec image du produit)
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

-- 9. Fonction Rôle Administrateur (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 10. Activation et Configuration RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin read admin_users" ON public.admin_users
FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "Allow public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow admin manage categories" ON public.categories
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow public read active products" ON public.products FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Allow admin manage products" ON public.products
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow public read variants" ON public.product_variants
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND (p.is_active = true OR public.is_admin()))
);
CREATE POLICY "Allow admin manage variants" ON public.product_variants
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Protection absolue de la vie privée des clients : aucun visiteur ne peut lire les commandes
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin manage orders" ON public.orders
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow public insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin manage order_items" ON public.order_items
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Allow public read store_settings" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin manage store_settings" ON public.store_settings
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 11. Fonction Transactionnelle de Commande COD (Stock verrouillé FOR UPDATE & recalcul prix)
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
    IF TRIM(COALESCE(p_customer_name, '')) = '' THEN RAISE EXCEPTION 'Le nom du client est requis.'; END IF;
    IF TRIM(COALESCE(p_customer_phone, '')) = '' THEN RAISE EXCEPTION 'Le téléphone WhatsApp est requis.'; END IF;
    IF TRIM(COALESCE(p_city, '')) = '' THEN RAISE EXCEPTION 'La ville est requise.'; END IF;
    IF TRIM(COALESCE(p_address, '')) = '' THEN RAISE EXCEPTION 'L''adresse de livraison est requise.'; END IF;
    IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Le panier est vide.'; END IF;

    v_order_ref := 'DOA-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

    SELECT delivery_fee, free_delivery_threshold INTO v_delivery_fee, v_free_threshold FROM public.store_settings LIMIT 1;
    IF v_delivery_fee IS NULL THEN v_delivery_fee := 35; END IF;
    IF v_free_threshold IS NULL THEN v_free_threshold := 600; END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN RAISE EXCEPTION 'Quantité invalide.'; END IF;

        SELECT * INTO v_variant FROM public.product_variants WHERE id = v_var_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Variante non trouvée.'; END IF;
        IF v_variant.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Stock insuffisant pour la taille % (Reste: % pièce(s)).', v_variant.size, v_variant.stock_quantity;
        END IF;

        SELECT * INTO v_prod FROM public.products WHERE id = v_variant.product_id;
        IF NOT FOUND OR NOT v_prod.is_active THEN RAISE EXCEPTION 'Produit indisponible.'; END IF;

        v_unit_price := COALESCE(v_prod.discount_price, v_prod.price);
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_qty, updated_at = timezone('utc'::text, now())
        WHERE id = v_var_id;
    END LOOP;

    IF v_subtotal >= v_free_threshold THEN v_delivery_fee := 0; END IF;
    v_total := v_subtotal + v_delivery_fee;

    INSERT INTO public.orders (
        id, order_reference, customer_name, customer_phone, city, address, notes,
        subtotal, total, status, payment_method, created_at
    ) VALUES (
        v_order_id, v_order_ref, p_customer_name, p_customer_phone, p_city, p_address, p_notes,
        v_subtotal, v_total, 'Pending WhatsApp Confirmation', 'COD', timezone('utc'::text, now())
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_var_id := (v_item->>'variant_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT v.*, p.name as prod_name, COALESCE(p.discount_price, p.price) as actual_price, (p.images)[1] as first_img
        INTO v_variant FROM public.product_variants v JOIN public.products p ON p.id = v.product_id WHERE v.id = v_var_id;

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
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveCredentials = () => {
    saveLocalSupabaseCredentials(supabaseUrl, supabaseKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isConnected = isSupabaseConnected();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-xs border border-[#F1D7C5] overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#FAF4EF] px-6 py-4 border-b border-[#F1D7C5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#CF7644]" />
            <h3 className="font-serif text-xl font-bold text-[#181818]">
              Guide de Configuration & Connexion Supabase
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-xs sm:text-sm text-gray-700">
          {/* Status badge */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-xs">
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <div>
                <p className="font-bold text-[#181818]">
                  {isConnected ? 'Supabase Connecté en direct' : 'Mode Stockage Local / Démo Actif'}
                </p>
                <p className="text-xs text-gray-500">
                  {isConnected
                    ? 'Toutes les opérations (produits, variantes, commandes COD) sont synchronisées avec votre base de données Supabase.'
                    : 'Le site fonctionne de manière autonome avec stockage persistant. Vous pouvez renseigner vos clés ci-dessous pour connecter votre instance Supabase.'}
                </p>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="border border-gray-200 p-5 rounded-xs space-y-4">
            <h4 className="font-bold uppercase tracking-wider text-gray-900 text-xs flex items-center gap-2">
              <Key className="w-4 h-4 text-[#CF7644]" />
              <span>Identifiants du Projet Supabase</span>
            </h4>

            {savedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Identifiants enregistrés avec succès ! Le client Supabase a été initialisé.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  URL du Projet (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Clé Publique Anonyme (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveCredentials}
                className="bg-[#181818] hover:bg-[#CF7644] text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer & Activer Supabase</span>
              </button>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-base text-[#181818]">
              Guide pas-à-pas de déploiement (Supabase, GitHub & Vercel)
            </h4>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 1 : Créer le projet Supabase</p>
                <p className="text-gray-600">
                  Rendez-vous sur <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#CF7644] underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-3 h-3" /></a> et créez un nouveau projet (ex: <code className="bg-gray-200 px-1">doart-store</code>). Choisissez la région Europe (Francfort ou Londres).
                </p>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-900">Étape 2 : Exécuter le Script SQL dans Supabase</p>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 bg-[#CF7644] text-white px-3 py-1 text-[11px] font-semibold uppercase rounded-xs hover:bg-[#b66133]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier tout le SQL'}</span>
                  </button>
                </div>
                <p className="text-gray-600">
                  Dans le tableau de bord Supabase, allez dans <strong>SQL Editor</strong>, collez le script ci-dessous et cliquez sur <strong>Run</strong>. Toutes les tables, RLS et fonctions RPC seront créées instantanément.
                </p>
                <pre className="bg-[#181818] text-[#F1D7C5] p-3 rounded-xs font-mono text-[11px] max-h-48 overflow-y-auto">
                  {fullSQL}
                </pre>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 3 : Créer le compte Administrateur</p>
                <p className="text-gray-600">
                  Dans Supabase, allez dans <strong>Authentication → Users → Add User</strong>. Créez votre email (ex: <code className="bg-gray-200 px-1">admin@doartstore.ma</code>) et définissez votre mot de passe pour vous connecter au Dashboard.
                </p>
              </div>

              <div className="p-3 bg-gray-50 border rounded-xs space-y-1">
                <p className="font-bold text-gray-900">Étape 4 : Déploiement Vercel & GitHub</p>
                <p className="text-gray-600">
                  Poussez le code sur GitHub, importez le dépôt dans Vercel, et renseignez dans les variables d'environnement de Vercel (<code className="bg-gray-200 px-1">Settings → Environment Variables</code>) :
                </p>
                <ul className="list-disc pl-5 text-gray-600 space-y-0.5">
                  <li><code className="bg-gray-200 px-1">VITE_SUPABASE_URL</code> : votre URL Supabase</li>
                  <li><code className="bg-gray-200 px-1">VITE_SUPABASE_ANON_KEY</code> : votre clé publique anon</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700 border border-gray-300 rounded-xs bg-white hover:bg-gray-100"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
