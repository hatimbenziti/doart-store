import { Order } from '../types';

/**
 * Normalizes phone number into international WhatsApp format (e.g., 212661234567)
 */
export function normalizeWhatsAppNumber(rawNumber: string): string {
  let cleaned = rawNumber.replace(/[^0-9]/g, '');

  // If starts with 0 (e.g. 0661234567 or 0761234567), replace 0 with 212
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '212' + cleaned.substring(1);
  }

  // If starts with +212 or 00212, already stripped symbols
  if (cleaned.startsWith('00212')) {
    cleaned = cleaned.substring(2);
  }

  // Default to Moroccan code 212 if 9 digits
  if (cleaned.length === 9) {
    cleaned = '212' + cleaned;
  }

  return cleaned;
}

/**
 * Builds the elegant, structured French WhatsApp order message for DoArt Store
 */
export function generateWhatsAppOrderMessage(order: Order, deliveryFee = 0): string {
  const itemsText = (order.items || [])
    .map((item, index) => {
      return `*${index + 1}. ${item.product_name}*\n   ▫️ Taille : *${item.size}*\n   ▫️ Couleur : *${item.color_name}*\n   ▫️ Quantité : *${item.quantity}* x ${item.unit_price} DH\n   ▫️ Sous-total : *${item.total_price} DH*`;
    })
    .join('\n\n');

  const deliveryNotice = deliveryFee === 0 ? 'Offerte (Gratuite)' : `${deliveryFee} DH`;

  const message = `🇲🇦 *NOUVELLE COMMANDE — DOART STORE*
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

  return message;
}

/**
 * Generates the wa.me link with encoded text
 */
export function createWhatsAppLink(storeWhatsAppNumber: string, order: Order, deliveryFee = 0): string {
  const cleanNumber = normalizeWhatsAppNumber(storeWhatsAppNumber);
  const message = generateWhatsAppOrderMessage(order, deliveryFee);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanNumber}?text=${encoded}`;
}
