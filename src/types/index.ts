export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color_name: string;
  color_hex: string;
  stock_quantity: number;
  sku?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  discount_price?: number | null;
  category_id: string;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  created_at?: string;
  updated_at?: string;
  category?: Category;
  variants?: ProductVariant[];
}

export type OrderStatus =
  | 'Pending WhatsApp Confirmation'
  | 'Confirmed'
  | 'Preparing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  size: string;
  color_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_image?: string;
}

export interface Order {
  id: string;
  order_reference: string;
  customer_name: string;
  customer_phone: string;
  city: string;
  address: string;
  notes?: string;
  subtotal: number;
  total: number;
  status: OrderStatus;
  payment_method: 'COD';
  created_at: string;
  items?: OrderItem[];
}

export interface StoreSettings {
  id: string;
  store_name: string;
  whatsapp_number: string;
  instagram_url: string;
  currency: string;
  delivery_fee: number;
  free_delivery_threshold: number;
  updated_at?: string;
}

export interface CartItem {
  id: string; // unique item key: `${variant_id}`
  product: Product;
  variant: ProductVariant;
  quantity: number;
}
