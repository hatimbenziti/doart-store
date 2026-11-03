import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariant, Order } from '../types';
import { getStoreSettings } from '../services/storeService';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => { success: boolean; message?: string };
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, deltaOrQuantity: number, isDelta?: boolean) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  // Direct WhatsApp Ordering
  isWhatsAppModalOpen: boolean;
  directOrderItem: CartItem | null;
  openWhatsAppOrder: (directItem?: CartItem | null) => void;
  closeWhatsAppOrder: () => void;
  storeWhatsAppNumber: string;
  deliverySettings: { fee: number; freeThreshold: number };
  // Backwards compatibility aliases
  isCheckoutOpen: boolean;
  directCheckoutItem: CartItem | null;
  openCheckout: (directItem?: CartItem | null) => void;
  closeCheckout: () => void;
  lastCreatedOrder: Order | null;
  setLastCreatedOrder: (order: Order | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'doart_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [directOrderItem, setDirectOrderItem] = useState<CartItem | null>(null);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [deliverySettings, setDeliverySettings] = useState({ fee: 35, freeThreshold: 600 });
  const [storeWhatsAppNumber, setStoreWhatsAppNumber] = useState('212705176222');

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to store cart in localStorage', e);
    }
  }, [items]);

  useEffect(() => {
    getStoreSettings().then((s) => {
      setDeliverySettings({
        fee: s.delivery_fee ?? 35,
        freeThreshold: s.free_delivery_threshold ?? 600,
      });
      if (s.whatsapp_number) {
        setStoreWhatsAppNumber(s.whatsapp_number);
      }
    });
  }, []);

  const addItem = (product: Product, variant: ProductVariant, quantity = 1) => {
    if (variant.stock_quantity <= 0) {
      return { success: false, message: 'Cette taille/couleur est en rupture de stock.' };
    }

    const currentQtyInCart = items.find((it) => it.variant.id === variant.id)?.quantity || 0;
    const newTotalQty = currentQtyInCart + quantity;

    if (newTotalQty > variant.stock_quantity) {
      return {
        success: false,
        message: `Stock insuffisant. Maximum disponible : ${variant.stock_quantity}`,
      };
    }

    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variant.id === variant.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity = newTotalQty;
        return copy;
      }
      return [
        ...prev,
        {
          id: variant.id,
          product,
          variant,
          quantity,
        },
      ];
    });

    return { success: true };
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, value: number, isDelta = false) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.variant.id !== variantId) return item;
          const newQty = isDelta ? item.quantity + value : value;
          if (newQty <= 0) return null;
          // Cap at available stock
          const finalQty = Math.min(newQty, item.variant.stock_quantity);
          return { ...item, quantity: finalQty };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Direct WhatsApp Ordering triggers
  const openWhatsAppOrder = (directItem: CartItem | null = null) => {
    setDirectOrderItem(directItem || null);
    setIsCartOpen(false);
    setIsWhatsAppModalOpen(true);
  };

  const closeWhatsAppOrder = () => {
    setIsWhatsAppModalOpen(false);
    setDirectOrderItem(null);
  };

  // Subtotal calculation
  const subtotal = items.reduce((sum, item) => {
    const price = item.product.discount_price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const deliveryFee = subtotal >= deliverySettings.freeThreshold || subtotal === 0 ? 0 : deliverySettings.fee;
  const total = subtotal + deliveryFee;
  const itemCount = items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        subtotal,
        deliveryFee,
        total,
        itemCount,
        // Direct WhatsApp ordering
        isWhatsAppModalOpen,
        directOrderItem,
        openWhatsAppOrder,
        closeWhatsAppOrder,
        storeWhatsAppNumber,
        deliverySettings,
        // Aliases for compatibility
        isCheckoutOpen: isWhatsAppModalOpen,
        directCheckoutItem: directOrderItem,
        openCheckout: openWhatsAppOrder,
        closeCheckout: closeWhatsAppOrder,
        lastCreatedOrder,
        setLastCreatedOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
