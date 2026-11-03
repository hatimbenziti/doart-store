import { getSupabaseClient } from '../lib/supabase';
import {
  Category,
  Product,
  ProductVariant,
  Order,
  OrderItem,
  StoreSettings,
  OrderStatus,
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
} from '../data/mockData';

const LOCAL_STORAGE_KEYS = {
  CATEGORIES: 'doart_categories_v1',
  PRODUCTS: 'doart_products_v1',
  VARIANTS: 'doart_variants_v1',
  ORDERS: 'doart_orders_v1',
  SETTINGS: 'doart_settings_v1',
};

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
}

// Ensure local store is ready
initializeLocalStorage();

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
      return data;
    }
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);
  return stored ? JSON.parse(stored) : INITIAL_CATEGORIES;
}

export async function saveCategory(category: Partial<Category>): Promise<Category> {
  const supabase = getSupabaseClient();
  const id = category.id || `cat-${Date.now()}`;
  const slug = category.slug || (category.name || '').toLowerCase().replace(/\s+/g, '-');
  const newCat: Category = {
    id,
    name: category.name || '',
    slug,
    image_url: category.image_url || '',
    created_at: category.created_at || new Date().toISOString(),
  };

  if (supabase) {
    await supabase.from('categories').upsert(newCat);
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
  const id = productData.id || `prod-${Date.now()}`;
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
    category_id: productData.category_id || '',
    images: productData.images && productData.images.length > 0 ? productData.images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85'],
    is_active: productData.is_active ?? true,
    is_featured: productData.is_featured ?? false,
    is_new: productData.is_new ?? true,
    created_at: productData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const finalVariants: ProductVariant[] = variantsData.map((v, i) => ({
    id: v.id || `v-${Date.now()}-${i}`,
    product_id: id,
    size: v.size || 'M',
    color_name: v.color_name || 'Standard',
    color_hex: v.color_hex || '#000000',
    stock_quantity: Number(v.stock_quantity) || 0,
    sku: v.sku || `DOA-${slug.toUpperCase().slice(0, 4)}-${v.size}-${i}`,
    created_at: v.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  if (supabase) {
    try {
      await supabase.from('products').upsert({
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
        updated_at: new Date().toISOString(),
      });

      // Clear existing variants for this product and reinsert
      await supabase.from('product_variants').delete().eq('product_id', id);
      if (finalVariants.length > 0) {
        await supabase.from('product_variants').insert(finalVariants);
      }
    } catch (err) {
      console.warn('Supabase upsert failed, syncing to local storage:', err);
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
    await supabase.from('products').delete().eq('id', id);
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
// ORDERS & WHATSAPP COD
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
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.ORDERS);
  return stored ? JSON.parse(stored) : [];
}

export interface CreateOrderParams {
  customer_name: string;
  customer_phone: string;
  city: string;
  address: string;
  notes?: string;
  items: {
    product_id: string;
    variant_id: string;
    product_name: string;
    size: string;
    color_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product_image?: string;
  }[];
  subtotal: number;
  total: number;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const supabase = getSupabaseClient();
  const orderRef = `DOA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = `ord-${Date.now()}`;

  const newOrder: Order = {
    id: orderId,
    order_reference: orderRef,
    customer_name: params.customer_name,
    customer_phone: params.customer_phone,
    city: params.city,
    address: params.address,
    notes: params.notes || '',
    subtotal: params.subtotal,
    total: params.total,
    status: 'Pending WhatsApp Confirmation',
    payment_method: 'COD',
    created_at: new Date().toISOString(),
    items: params.items.map((item, idx) => ({
      id: `item-${Date.now()}-${idx}`,
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

  // Attempt Supabase insert
  if (supabase) {
    try {
      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          id: newOrder.id,
          order_reference: newOrder.order_reference,
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          city: newOrder.city,
          address: newOrder.address,
          notes: newOrder.notes,
          subtotal: newOrder.subtotal,
          total: newOrder.total,
          status: newOrder.status,
          payment_method: newOrder.payment_method,
        })
        .select()
        .single();

      if (!orderErr && insertedOrder) {
        const orderItemsToInsert = (newOrder.items || []).map((it) => ({
          order_id: insertedOrder.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          product_name: it.product_name,
          size: it.size,
          color_name: it.color_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
        }));
        await supabase.from('order_items').insert(orderItemsToInsert);

        // Deduct stock for each variant in Supabase
        for (const it of newOrder.items || []) {
          try {
            await supabase.rpc('decrement_variant_stock', {
              var_id: it.variant_id,
              qty: it.quantity,
            });
          } catch (e) {
            console.warn('RPC decrement_variant_stock failed or not created yet:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Supabase order creation fallback to local store:', err);
    }
  }

  // Deduct local variant stock
  const allVariants: ProductVariant[] = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
  );
  (newOrder.items || []).forEach((item) => {
    const v = allVariants.find((varItem) => varItem.id === item.variant_id);
    if (v) {
      v.stock_quantity = Math.max(0, v.stock_quantity - item.quantity);
    }
  });
  localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));

  // Save order in local storage
  const orders = await getOrders();
  orders.unshift(newOrder);
  localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));

  return newOrder;
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const supabase = getSupabaseClient();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);

  // If cancelling order, restore stock
  if (order && newStatus === 'Cancelled' && order.status !== 'Cancelled') {
    const allVariants: ProductVariant[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_KEYS.VARIANTS) || '[]'
    );
    for (const item of order.items || []) {
      const v = allVariants.find((varItem) => varItem.id === item.variant_id);
      if (v) {
        v.stock_quantity += item.quantity;
      }
      if (supabase) {
        try {
          await supabase.rpc('restore_variant_stock', {
            var_id: item.variant_id,
            qty: item.quantity,
          });
        } catch {
          // ignore if rpc not deployed yet
        }
      }
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.VARIANTS, JSON.stringify(allVariants));
  }

  if (supabase) {
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  }

  if (order) {
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
    await supabase.from('orders').update(updates).eq('id', orderId);
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    Object.assign(order, updates);
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }
}

// ==========================================
// STORE SETTINGS
// ==========================================
export async function getStoreSettings(): Promise<StoreSettings> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.from('store_settings').select('*').limit(1).single();
    if (!error && data) {
      return data as StoreSettings;
    }
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
  return stored ? JSON.parse(stored) : INITIAL_SETTINGS;
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
    await supabase.from('store_settings').upsert(updated);
  }

  localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}
