import { getSupabaseClient } from '../lib/supabase';
import {
  Category,
  Product,
  ProductVariant,
  Order,
  StoreSettings,
  OrderStatus,
  CreateOrderParams,
  InstagramPost,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_INSTAGRAM_POSTS,
  generateUUID,
} from '../data/mockData';

const LOCAL_STORAGE_KEYS = {
  CATEGORIES: 'doart_categories_v2',
  PRODUCTS: 'doart_products_v2',
  VARIANTS: 'doart_variants_v2',
  ORDERS: 'doart_orders_v2',
  SETTINGS: 'doart_settings_v2',
  INSTAGRAM_POSTS: 'doart_instagram_posts_v2',
};

// UUID validation helper
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// Initialize local cache if empty
function initializeLocalStorage() {
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS)) {
    const productsWithoutVariants = INITIAL_PRODUCTS.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variants, ...rest } = p;
      return rest;
    });
    localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(productsWithoutVariants));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS)) {
    const allVariants: ProductVariant[] = [];
    INITIAL_PRODUCTS.forEach((p) => {
      if (p.variants) {
        allVariants.push(...p.variants);
      }
    });
    localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  }
  if (!localStorage.getItem(LOCAL_STORAGE_KEYS.INSTAGRAM_POSTS)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.INSTAGRAM_POSTS, JSON.stringify(INITIAL_INSTAGRAM_POSTS));
  }
}

// Ensure local store is ready
initializeLocalStorage();

// ==========================================
// ADMIN VERIFICATION (RBAC)
// ==========================================
export async function checkAdminPrivileges(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // If not connected to Supabase, check local session storage for preview mode
    return sessionStorage.getItem('doart_admin_session') === 'active';
  }

  try {
    const { data: userResp } = await supabase.auth.getUser();
    if (!userResp?.user) return false;

    // Check through security definer RPC is_admin
    const { data: isAdm, error: rpcErr } = await supabase.rpc('is_admin');
    if (!rpcErr && typeof isAdm === 'boolean') {
      return isAdm;
    }

    // Direct check in admin_users table
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userResp.user.id)
      .in('role', ['admin', 'super_admin'])
      .maybeSingle();

    return !!adminRow;
  } catch (err) {
    console.warn('Failed to verify admin status:', err);
    return false;
  }
}

// ==========================================
// CATEGORIES
// ==========================================
export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!error && data && data.length > 0) {
      return data as Category[];
    }
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);
  return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
}

export async function saveCategory(category: Partial<Category>): Promise<Category> {
  const supabase = getSupabaseClient();
  const id = category.id && isValidUUID(category.id) ? category.id : generateUUID();
  const slug = category.slug || (category.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const newCat: Category = {
    id,
    name: category.name || '',
    slug,
    image_url: category.image_url || '',
    created_at: category.created_at || new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from('categories').upsert({
      id: newCat.id,
      name: newCat.name,
      slug: newCat.slug,
      image_url: newCat.image_url,
    });
    if (error) {
      console.error('Supabase saveCategory error:', error);
    }
  }

  const list = await getCategories();
  const existingIdx = list.findIndex((c) => c.id === id);
  if (existingIdx >= 0) {
    list[existingIdx] = newCat;
  } else {
    list.push(newCat);
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(list));
  return newCat;
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from('categories').delete().eq('id', id);
  }
  const list = await getCategories();
  const filtered = list.filter((c) => c.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
}

// ==========================================
// PRODUCTS & VARIANTS
// ==========================================
export async function getProducts(includeInactive = false): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from('products').select(`
      *,
      category:categories(*),
      variants:product_variants(*)
    `);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data as Product[];
    }
  }

  // Fallback to local storage
  const storedProds: Product[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS) || '[]'
  );
  const storedVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  const categories = await getCategories();

  const combined = storedProds
    .filter((p) => includeInactive || p.is_active)
    .map((p) => {
      const vars = storedVariants.filter((v) => v.product_id === p.id);
      const cat = categories.find((c) => c.id === p.category_id);
      return {
        ...p,
        category: cat,
        variants: vars,
      };
    });

  return combined;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getProducts(true);
  return products.find((p) => p.slug === slug) || null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts(true);
  return products.find((p) => p.id === id) || null;
}

export async function saveProduct(
  productData: Partial<Product>,
  variantsData: Partial<ProductVariant>[]
): Promise<Product> {
  const supabase = getSupabaseClient();
  const id = productData.id && isValidUUID(productData.id) ? productData.id : generateUUID();
  const slug =
    productData.slug ||
    (productData.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const productRecord: Product = {
    id,
    name: productData.name || '',
    slug,
    description: productData.description || '',
    price: Number(productData.price) || 0,
    discount_price: productData.discount_price ? Number(productData.discount_price) : null,
    category_id: productData.category_id && isValidUUID(productData.category_id) ? productData.category_id : '',
    images: productData.images && productData.images.length > 0 ? productData.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85'],
    is_active: productData.is_active ?? true,
    is_featured: productData.is_featured ?? false,
    is_new: productData.is_new ?? true,
    created_at: productData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const storedVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );

  const finalVariants: ProductVariant[] = variantsData.map((v, i) => {
    const varId = v.id && isValidUUID(v.id) ? v.id : generateUUID();
    const existing = storedVariants.find((sv) => sv.id === varId);
    return {
      id: varId,
      product_id: id,
      size: v.size || 'M',
      color_name: v.color_name || 'Standard',
      color_hex: v.color_hex || '#000000',
      stock_quantity: Number(v.stock_quantity) || 0,
      expected_stock: typeof v.expected_stock === 'number' ? v.expected_stock : (existing ? existing.stock_quantity : undefined),
      sku: v.sku || `DOA-${slug.toUpperCase().slice(0, 4)}-${v.size}-${i + 1}`,
      created_at: v.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (supabase) {
    try {
      const { data: rpcResp, error: rpcErr } = await supabase.rpc('admin_save_product_with_variants', {
        p_product: {
          id: productRecord.id,
          name: productRecord.name,
          slug: productRecord.slug,
          description: productRecord.description,
          price: productRecord.price,
          discount_price: productRecord.discount_price,
          category_id: productRecord.category_id || null,
          images: productRecord.images,
          is_active: productRecord.is_active,
          is_featured: productRecord.is_featured,
          is_new: productRecord.is_new,
        },
        p_variants: finalVariants.map((v) => ({
          id: v.id,
          size: v.size,
          color_name: v.color_name,
          color_hex: v.color_hex,
          stock_quantity: v.stock_quantity,
          expected_stock: typeof v.expected_stock === 'number' ? v.expected_stock : undefined,
          sku: v.sku,
        })),
      });

      if (rpcErr) throw rpcErr;

      if (rpcResp?.variants && Array.isArray(rpcResp.variants)) {
        finalVariants.splice(0, finalVariants.length, ...rpcResp.variants);
      }
    } catch (err) {
      console.error('Supabase admin_save_product_with_variants error:', err);
    }
  }

  // Update local storage
  const prods: Product[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS) || '[]');
  const pIdx = prods.findIndex((p) => p.id === id);
  if (pIdx >= 0) {
    prods[pIdx] = productRecord;
  } else {
    prods.unshift(productRecord);
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));

  // Update variants in local storage
  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  const remainingVariants = allVariants.filter((v) => v.product_id !== id);
  remainingVariants.push(...finalVariants);
  localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(remainingVariants));

  return {
    ...productRecord,
    variants: finalVariants,
  };
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.rpc('admin_archive_product', {
        p_product_id: id,
      });
      if (error) {
        console.error('Supabase admin_archive_product error:', error);
      }
    } catch (err) {
      console.error('Supabase archive product error:', err);
    }
  }

  const prods: Product[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.PRODUCTS) || '[]');
  localStorage.setItem(LOCAL_STORAGE_KEYS.PRODUCTS, JSON.stringify(prods.filter((p) => p.id !== id)));

  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.VARIANTS,
    JSON.stringify(allVariants.filter((v) => v.product_id !== id))
  );
}

// ==========================================
// ORDERS & WHATSAPP COD (AUDITÉ & SÉCURISÉ)
// ==========================================
export async function getOrders(): Promise<Order[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });
    if (!error && data) {
      return data as Order[];
    }
    if (error) {
      console.warn('Orders fetch note:', error.message);
    }
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ORDERS);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Creates an admin manual order with server-side transactional validation and inventory lock
 * Exclusively executed by authenticated administrators.
 */
export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const supabase = getSupabaseClient();

  // 1. If Supabase is connected, execute the secure admin RPC
  if (supabase) {
    const itemsPayload = params.items.map((it) => ({
      variant_id: it.variant_id,
      quantity: it.quantity,
      product_image: it.product_image || '',
    }));

    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_admin_manual_order', {
      p_customer_name: params.customer_name.trim(),
      p_customer_phone: params.customer_phone.trim(),
      p_city: params.city.trim(),
      p_address: params.address.trim(),
      p_notes: params.notes?.trim() || '',
      p_items: itemsPayload,
      p_status: 'Confirmed',
    });

    if (rpcErr) {
      console.error('RPC create_admin_manual_order error:', rpcErr);
      throw new Error(rpcErr.message || 'Erreur lors de la création de la commande sur Supabase.');
    }

    if (rpcData && (rpcData.id || rpcData.order_id)) {
      const orderId = rpcData.id || rpcData.order_id;
      const confirmedOrder: Order = {
        id: orderId,
        order_reference: rpcData.order_reference,
        customer_name: rpcData.customer_name,
        customer_phone: rpcData.customer_phone,
        city: rpcData.city,
        address: rpcData.address,
        notes: rpcData.notes,
        subtotal: Number(rpcData.subtotal),
        total: Number(rpcData.total),
        status: (rpcData.status as OrderStatus) || 'Confirmed',
        payment_method: 'COD',
        created_at: rpcData.created_at,
        items: rpcData.items || params.items.map((it) => ({
          id: generateUUID(),
          order_id: rpcData.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_name: it.product_name,
          size: it.size,
          color_name: it.color_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          product_image: it.product_image,
        })),
      };

      // Sync with local cache
      const orders = await getOrders();
      orders.unshift(confirmedOrder);
      localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));

      // Also refresh product variants in local cache so stock reflects in UI immediately
      const allVariants: ProductVariant[] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
      );
      for (const item of params.items) {
        const v = allVariants.find((varItem) => varItem.id === item.variant_id);
        if (v) {
          v.stock_quantity = Math.max(0, v.stock_quantity - item.quantity);
        }
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));

      return confirmedOrder;
    }
  }

  // 2. Client-side / Offline fallback (preview mode when Supabase not connected)
  const orderRef = `DOA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = generateUUID();

  // Validate and deduct stock locally
  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );

  for (const item of params.items) {
    const v = allVariants.find((varItem) => varItem.id === item.variant_id);
    if (v) {
      if (v.stock_quantity < item.quantity) {
        throw new Error(`Stock insuffisant pour l'article ${item.product_name} (${item.size}).`);
      }
      v.stock_quantity = Math.max(0, v.stock_quantity - item.quantity);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));

  const newOrder: Order = {
    id: orderId,
    order_reference: orderRef,
    customer_name: params.customer_name.trim(),
    customer_phone: params.customer_phone.trim(),
    city: params.city.trim(),
    address: params.address.trim(),
    notes: params.notes?.trim() || '',
    subtotal: params.subtotal,
    total: params.total,
    status: 'Pending WhatsApp Confirmation',
    payment_method: 'COD',
    created_at: new Date().toISOString(),
    items: params.items.map((item) => ({
      id: generateUUID(),
      order_id: orderId,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      size: item.size,
      color_name: item.color_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      product_image: item.product_image,
    })),
  };

  // Save in local storage
  const orders = await getOrders();
  orders.unshift(newOrder);
  localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  return newOrder;
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const supabase = getSupabaseClient();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);

  if (supabase) {
    if (newStatus === 'Cancelled') {
      const { error: cancelErr } = await supabase.rpc('cancel_order_and_restore_stock', {
        p_order_id: orderId,
      });
      if (cancelErr) {
        throw new Error(`Erreur lors de l'annulation de la commande: ${cancelErr.message}`);
      }
    } else {
      const { error: statErr } = await supabase.rpc('admin_update_order_status', {
        p_order_id: orderId,
        p_status: newStatus,
      });
      if (statErr) {
        throw new Error(`Erreur lors de la mise à jour du statut: ${statErr.message}`);
      }
    }
  }

  // Local state update
  if (order) {
    if (newStatus === 'Cancelled' && order.status !== 'Cancelled') {
      // If offline / preview mode, restore stock locally
      const allVariants: ProductVariant[] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
      );
      for (const item of order.items || []) {
        const v = allVariants.find((varItem) => varItem.id === item.variant_id);
        if (v) {
          v.stock_quantity += item.quantity;
        }
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));
    }

    order.status = newStatus;
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
}

export async function updateOrderCustomer(
  orderId: string,
  updates: { customer_name: string; customer_phone: string; city: string; address: string; notes?: string }
): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.rpc('admin_update_order_customer', {
      p_order_id: orderId,
      p_customer_name: updates.customer_name,
      p_customer_phone: updates.customer_phone,
      p_city: updates.city,
      p_address: updates.address,
      p_notes: updates.notes || '',
    });
    if (error) {
      throw new Error(`Erreur lors de la mise à jour des coordonnées client: ${error.message}`);
    }
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    Object.assign(order, updates);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
}

// ==========================================
// INSTAGRAM GALLERY POSTS
// ==========================================
export async function getInstagramPosts(): Promise<InstagramPost[]> {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.INSTAGRAM_POSTS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fallback
    }
  }
  return INITIAL_INSTAGRAM_POSTS;
}

export async function saveInstagramPosts(posts: InstagramPost[]): Promise<InstagramPost[]> {
  localStorage.setItem(LOCAL_STORAGE_KEYS.INSTAGRAM_POSTS, JSON.stringify(posts));
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.instagram_posts = posts;
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('doart_instagram_posts_changed'));
  return posts;
}

// ==========================================
// STORE SETTINGS
// ==========================================
export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
    if (!error && data) {
      const dbSettings = data as StoreSettings;
      if (!dbSettings.whatsapp_number || dbSettings.whatsapp_number === '212661000000') {
        dbSettings.whatsapp_number = '212705176222';
      }
      if (!dbSettings.instagram_posts || dbSettings.instagram_posts.length === 0) {
        dbSettings.instagram_posts = await getInstagramPosts();
      }
      return dbSettings;
    }
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoreSettings;
      if (!parsed.whatsapp_number || parsed.whatsapp_number === '212661000000') {
        parsed.whatsapp_number = '212705176222';
      }
      if (!parsed.instagram_posts || parsed.instagram_posts.length === 0) {
        parsed.instagram_posts = await getInstagramPosts();
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
      return parsed;
    } catch {
      // fallback
    }
  }
  return {
    ...INITIAL_SETTINGS,
    instagram_posts: await getInstagramPosts(),
  };
}

export interface BatchVariantStockUpdate {
  variant_id: string;
  new_stock: number;
  expected_stock: number;
}

/**
 * Synchronisation groupée atomique du stock des variantes.
 * Exige une confirmation stricte et complète du serveur avant toute mise à jour du cache local.
 */
export async function batchUpdateVariantStock(
  updates: BatchVariantStockUpdate[]
): Promise<{ success: boolean; variants: { variant_id: string; stock_quantity: number }[] }> {
  if (!updates || updates.length === 0) {
    return { success: true, variants: [] };
  }

  // Validation préalable des données demandées
  for (const item of updates) {
    if (!item.variant_id || !isValidUUID(item.variant_id)) {
      throw new Error(`Identifiant de variante invalide: ${item.variant_id}`);
    }
    if (typeof item.new_stock !== 'number' || !Number.isInteger(item.new_stock) || item.new_stock < 0) {
      throw new Error(
        `La quantité de stock doit être un entier supérieur ou égal à zéro pour la variante ${item.variant_id}.`
      );
    }
    if (typeof item.expected_stock !== 'number' || !Number.isInteger(item.expected_stock) || item.expected_stock < 0) {
      throw new Error(
        `Le paramètre expected_stock est obligatoire et doit être un entier supérieur ou égal à zéro pour la variante ${item.variant_id}.`
      );
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const payload = updates.map((u) => ({
      variant_id: u.variant_id,
      new_stock: u.new_stock,
      expected_stock: u.expected_stock,
    }));

    const { data, error } = await supabase.rpc('admin_batch_update_variant_stock', {
      p_updates: payload,
    });

    if (error) {
      throw new Error(`Échec de la mise à jour groupée du stock: ${error.message}`);
    }

    // Exiger une réponse success === true
    if (!data || data.success !== true || !Array.isArray(data.variants)) {
      throw new Error('Réponse invalide ou échec de la procédure Supabase admin_batch_update_variant_stock.');
    }

    // Exiger que rpcResult.variants contienne exactement toutes les variantes demandées
    if (data.variants.length !== updates.length) {
      throw new Error(
        `Réponse incomplète: ${data.variants.length} variante(s) reçue(s) sur ${updates.length} demandée(s).`
      );
    }

    const verifiedStockMap = new Map<string, number>();

    // Vérifier chaque variant_id et chaque stock_quantity (entier >= 0)
    for (const v of data.variants) {
      if (!v || typeof v.variant_id !== 'string' || !isValidUUID(v.variant_id)) {
        throw new Error('Identifiant de variante invalide retourné par Supabase.');
      }
      if (typeof v.stock_quantity !== 'number' || !Number.isInteger(v.stock_quantity) || v.stock_quantity < 0) {
        throw new Error(`Quantité de stock invalide retournée par Supabase pour la variante ${v.variant_id}.`);
      }
      verifiedStockMap.set(v.variant_id, v.stock_quantity);
    }

    // Vérifier que chaque variante demandée est bien présente dans la réponse confirmée
    for (const item of updates) {
      if (!verifiedStockMap.has(item.variant_id)) {
        throw new Error(
          `La variante demandée ${item.variant_id} est absente de la confirmation retournée par Supabase.`
        );
      }
    }

    // Ne synchroniser le cache local qu'avec les valeurs réellement retournées par Supabase
    // (AUCUN fallback ?? item.new_stock)
    const allVariants: ProductVariant[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
    );
    for (const [varId, confirmedStock] of verifiedStockMap.entries()) {
      const found = allVariants.find((v) => v.id === varId);
      if (found) {
        found.stock_quantity = confirmedStock;
        found.updated_at = new Date().toISOString();
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));

    return {
      success: true,
      variants: data.variants.map((v: { variant_id: string; stock_quantity: number }) => ({
        variant_id: v.variant_id,
        stock_quantity: v.stock_quantity,
      })),
    };
  }

  // Fallback mode hors-ligne / prévisualisation locale
  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  const localConfirmedList: { variant_id: string; stock_quantity: number }[] = [];

  for (const item of updates) {
    const found = allVariants.find((v) => v.id === item.variant_id);
    if (found) {
      if (typeof item.expected_stock === 'number' && found.stock_quantity !== item.expected_stock) {
        throw new Error(`Conflit de concurrence local pour la variante ${item.variant_id}`);
      }
      found.stock_quantity = item.new_stock;
      found.updated_at = new Date().toISOString();
      localConfirmedList.push({ variant_id: item.variant_id, stock_quantity: item.new_stock });
    }
  }

  localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));
  return { success: true, variants: localConfirmedList };
}

/**
 * Met à jour le stock d'une variante individuelle avec contrôle optimiste expected_stock
 */
export async function updateVariantStock(
  variantId: string,
  newStock: number,
  expectedStock: number
): Promise<{ success: boolean; variant_id: string; previous_stock?: number; new_stock: number }> {
  if (!isValidUUID(variantId)) {
    throw new Error(`Identifiant de variante invalide: ${variantId}`);
  }
  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new Error('La quantité de stock doit être un entier supérieur ou égal à zéro.');
  }
  if (typeof expectedStock !== 'number' || !Number.isInteger(expectedStock) || expectedStock < 0) {
    throw new Error('Le paramètre expectedStock est obligatoire et doit être un entier supérieur ou égal à zéro.');
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc('admin_update_variant_stock', {
      p_variant_id: variantId,
      p_new_stock: newStock,
      p_expected_stock: expectedStock,
    });

    if (error) {
      throw new Error(`Échec de la mise à jour du stock: ${error.message}`);
    }

    if (!data || data.success !== true || typeof data.new_stock !== 'number') {
      throw new Error('Réponse invalide du serveur lors de la mise à jour du stock.');
    }

    // Mise à jour du cache local uniquement avec la valeur confirmée par Supabase
    const allVariants: ProductVariant[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
    );
    const found = allVariants.find((v) => v.id === variantId);
    if (found) {
      found.stock_quantity = data.new_stock;
      found.updated_at = new Date().toISOString();
      localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));
    }

    return {
      success: true,
      variant_id: variantId,
      previous_stock: data.previous_stock,
      new_stock: data.new_stock,
    };
  }

  // Fallback local
  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  const found = allVariants.find((v) => v.id === variantId);
  if (!found) {
    throw new Error(`Variante introuvable: ${variantId}`);
  }
  if (typeof expectedStock === 'number' && found.stock_quantity !== expectedStock) {
    throw new Error(`Conflit de stock local pour la variante ${variantId}`);
  }
  const prev = found.stock_quantity;
  found.stock_quantity = newStock;
  found.updated_at = new Date().toISOString();
  localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));

  return {
    success: true,
    variant_id: variantId,
    previous_stock: prev,
    new_stock: newStock,
  };
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  const current = await getStoreSettings();
  const updated: StoreSettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    // Mise à jour ciblée sur l'enregistrement singleton existant
    const payload = {
      store_name: updated.store_name,
      whatsapp_number: updated.whatsapp_number,
      instagram_url: updated.instagram_url,
      currency: updated.currency,
      delivery_fee: updated.delivery_fee,
      free_delivery_threshold: updated.free_delivery_threshold,
      hero_title: updated.hero_title,
      hero_subtitle: updated.hero_subtitle,
      hero_badge: updated.hero_badge,
      hero_image: updated.hero_image,
      hero_tag_badge: updated.hero_tag_badge,
      hero_card_tag: updated.hero_card_tag,
      hero_card_title: updated.hero_card_title,
      hero_card_price: updated.hero_card_price,
      hero_card_original_price: updated.hero_card_original_price,
      hero_card_image: updated.hero_card_image,
      hero_featured_product_id: updated.hero_featured_product_id,
      updated_at: new Date().toISOString(),
    };

    if (current.id && isValidUUID(current.id)) {
      const { error: updateErr } = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', current.id);

      if (updateErr) {
        console.warn('Update store_settings by ID error, attempting singleton fallback:', updateErr);
        await supabase.from('store_settings').update(payload).eq('is_singleton', true);
      }
    } else {
      await supabase.from('store_settings').update(payload).eq('is_singleton', true);
    }
  }

  if (updated.instagram_posts && Array.isArray(updated.instagram_posts)) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.INSTAGRAM_POSTS, JSON.stringify(updated.instagram_posts));
  }
  localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  window.dispatchEvent(new Event('doart_instagram_posts_changed'));
  return updated;
}
