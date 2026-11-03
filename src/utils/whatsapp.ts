import { Order, CartItem } from '../types';

/**
 * Normalizes a Moroccan or international phone number into standard WhatsApp format (e.g., 212661234567)
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  let cleaned = (rawNumber || '').replace(/[^0-9]/g, '');

  if (!cleaned) {
    return '212661000000';
  }

  // If starts with 0 (e.g. 0661234567 or 0761234567), replace leading 0 with 212
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '212' + cleaned.substring(1);
  }

  // If starts with 00212, strip leading 00
  if (cleaned.startsWith('00212')) {
    cleaned = cleaned.substring(2);
  }

  // Default to Moroccan country code 212 if 9 digits
  if (cleaned.length === 9) {
    cleaned = '212' + cleaned;
  }

  return cleaned;
}

export interface DirectWhatsAppProduct {
  id: string;
  name: string;
  size: string;
  color_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_url?: string;
}

export interface DirectWhatsAppMessageParams {
  items: DirectWhatsAppProduct[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  storeName?: string;
}

/**
 * Builds the professional, pre-filled French WhatsApp order message for DoArt Store
 * Includes: items list, sizes, colors, quantities, prices, subtotal, delivery fee, final total, product links.
 */
export function generateDirectWhatsAppOrderMessage(params: DirectWhatsAppMessageParams): string {
  const { items, subtotal, deliveryFee, total, storeName = 'DoArt Store' } = params;

  const itemsList = items
    .map((item, index) => {
      const urlLine = item.product_url ? `\n   🔗 Lien produit : ${item.product_url}` : '';
      return `*${index + 1}. ${item.name}*\n   ▫️ Taille : *${item.size}*\n   ▫️ Couleur : *${item.color_name}*\n   ▫️ Quantité : *${item.quantity}* x ${item.unit_price} DH\n   ▫️ Sous-total : *${item.total_price} DH*${urlLine}`;
    })
    .join('\n\n');

  const deliveryNotice = deliveryFee === 0 ? 'Offerte (Gratuite 🎉)' : `${deliveryFee} DH`;

  return `🇲🇦 *COMMANDE — ${storeName.toUpperCase()}*
Bonjour ! Je souhaite passer commande pour les articles suivants en Paiement à la Livraison (Cash on Delivery) :

🛍️ *ARTICLES SÉLECTIONNÉS :*
━━━━━━━━━━━━━━━━━━━━━
${itemsList}

━━━━━━━━━━━━━━━━━━━━━
💵 *Sous-total :* ${subtotal} DH
🚚 *Livraison Maroc :* ${deliveryNotice}
💰 *TOTAL ESTIMÉ (COD) : ${total} DH*
━━━━━━━━━━━━━━━━━━━━━
💳 *Mode de paiement :* Espèces à la livraison (Cash on Delivery)
📍 *Destination :* Livraison partout au Maroc

👤 *Mes coordonnées de livraison :*
• Nom & Prénom : 
• Ville de livraison : 
• Adresse exacte : 
• Téléphone WhatsApp : 
• Notes complémentaires : 

Merci de me confirmer la disponibilité des articles et le délai d'expédition ! ✨`;
}

/**
 * Converts CartItem array into DirectWhatsAppProduct array with clean product URLs
 */
export function convertCartItemsToWhatsAppProducts(
  cartItems: CartItem[],
  baseUrl?: string
): DirectWhatsAppProduct[] {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

  return cartItems.map((item) => {
    const unitPrice = item.product.discount_price ?? item.product.price;
    const productUrl = base ? `${base}/?product=${item.product.id}` : undefined;

    return {
      id: item.product.id,
      name: item.product.name,
      size: item.variant.size,
      color_name: item.variant.color_name,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_price: unitPrice * item.quantity,
      product_url: productUrl,
    };
  });
}

/**
 * Generates https://wa.me/ URL for direct WhatsApp mobile & desktop app
 */
export function createWhatsAppDirectUrl(storeNumber: string, message: string): string {
  const cleanNumber = normalizeWhatsAppNumber(storeNumber);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}

/**
 * Generates https://web.whatsapp.com URL as an additional fallback for desktop users
 */
export function createWhatsAppWebDirectUrl(storeNumber: string, message: string): string {
  const cleanNumber = normalizeWhatsAppNumber(storeNumber);
  const encoded = encodeURIComponent(message);
  return `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${encoded}`;
}

/**
 * Formats a WhatsApp message for an existing registered order (used by admin or order details modal)
 */
export function generateWhatsAppOrderMessage(order: Order, deliveryFee = 0): string {
  const itemsText = (order.items || [])
    .map((item, index) => {
      return `*${index + 1}. ${item.product_name}*\n   ▫️ Taille : *${item.size}*\n   ▫️ Couleur : *${item.color_name}*\n   ▫️ Quantité : *${item.quantity}* x ${item.unit_price} DH\n   ▫️ Sous-total : *${item.total_price} DH*`;
    })
    .join('\n\n');

  const deliveryNotice = deliveryFee === 0 ? 'Offerte (Gratuite)' : `${deliveryFee} DH`;

  return `🇲🇦 *COMMANDE DOART STORE*
━━━━━━━━━━━━━━━━━━━━━
📋 *Référence :* #${order.order_reference}
📅 *Date :* ${new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}

👤 *INFORMATIONS CLIENT :*
• Nom complet : *${order.customer_name}*
• Téléphone : *${order.customer_phone}*
• Ville : *${order.city}*
• Adresse : *${order.address}*${order.notes ? `\n• Notes : _${order.notes}_` : ''}

🛍️ *DÉTAIL DU PANIER :*
━━━━━━━━━━━━━━━━━━━━━
${itemsText}

━━━━━━━━━━━━━━━━━━━━━
💵 *Sous-total :* ${order.subtotal} DH
🚚 *Frais de livraison :* ${deliveryNotice}
💰 *TOTAL À PAYER : ${order.total} DH*
━━━━━━━━━━━━━━━━━━━━━
💳 *Paiement :* Espèces à la livraison (Cash on Delivery)
📍 *Destination :* Livraison partout au Maroc

_Merci de me confirmer la réception de ma commande et le délai d'expédition !_`;
}

/**
 * Generates the wa.me link for an existing order (used in admin)
 */
export function createWhatsAppLink(storeWhatsAppNumber: string, order: Order, deliveryFee = 0): string {
  const cleanNumber = normalizeWhatsAppNumber(storeWhatsAppNumber);
  const message = generateWhatsAppOrderMessage(order, deliveryFee);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}
