import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageCircle,
  ShieldCheck,
  Truck,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { getStoreSettings } from '../../services/storeService';
import {
  convertCartItemsToWhatsAppProducts,
  generateDirectWhatsAppOrderMessage,
  createWhatsAppDirectUrl,
  createWhatsAppWebDirectUrl,
  normalizeWhatsAppNumber,
  formatMoroccanDisplayPhone,
} from '../../utils/whatsapp';

export const WhatsAppCheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    closeCheckout,
    items,
    directCheckoutItem,
    clearCart,
  } = useCart();

  // Active items being ordered (direct product or entire cart)
  const orderItems = useMemo(() => {
    return directCheckoutItem ? [directCheckoutItem] : items;
  }, [directCheckoutItem, items]);

  const [storeWhatsAppNumber, setStoreWhatsAppNumber] = useState('212705176222');
  const [storeName, setStoreName] = useState('DoArt Store');
  const [deliverySettings, setDeliverySettings] = useState({ fee: 35, freeThreshold: 600 });
  const [hasAttemptedOpen, setHasAttemptedOpen] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);

  useEffect(() => {
    getStoreSettings().then((s) => {
      if (s.whatsapp_number) setStoreWhatsAppNumber(s.whatsapp_number);
      if (s.store_name) setStoreName(s.store_name);
      setDeliverySettings({
        fee: s.delivery_fee ?? 35,
        freeThreshold: s.free_delivery_threshold ?? 600,
      });
    });
  }, []);

  // Reset state on open
  useEffect(() => {
    if (isCheckoutOpen) {
      setHasAttemptedOpen(false);
      setCopiedMessage(false);
      setShowTextPreview(false);
    }
  }, [isCheckoutOpen]);

  if (!isCheckoutOpen) return null;

  // Subtotal and delivery fee
  const subtotal = orderItems.reduce((acc, item) => {
    const price = item.product.discount_price ?? item.product.price;
    return acc + price * item.quantity;
  }, 0);

  const deliveryFee =
    subtotal >= deliverySettings.freeThreshold || subtotal === 0 ? 0 : deliverySettings.fee;
  const total = subtotal + deliveryFee;

  // Convert to WhatsApp format
  const whatsAppProducts = convertCartItemsToWhatsAppProducts(orderItems);
  const orderMessage = generateDirectWhatsAppOrderMessage({
    items: whatsAppProducts,
    subtotal,
    deliveryFee,
    total,
    storeName,
  });

  const waMobileUrl = createWhatsAppDirectUrl(storeWhatsAppNumber, orderMessage);
  const waWebUrl = createWhatsAppWebDirectUrl(storeWhatsAppNumber, orderMessage);

  const handleOpenWhatsApp = () => {
    setHasAttemptedOpen(true);
    try {
      window.open(waMobileUrl, '_blank');
    } catch (err) {
      console.warn('Direct popup blocked, showing fallback options:', err);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(orderMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);
  };

  const handleFinishAndClose = () => {
    if (!directCheckoutItem) {
      clearCart();
    }
    closeCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl shadow-2xl relative border border-[#F1D7C5] overflow-hidden my-8 rounded-xs">
        {/* Modal Header */}
        <div className="bg-[#FAF4EF] px-6 py-4 border-b border-[#F1D7C5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs">
              <MessageCircle className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#181818]">
                Commande Directe WhatsApp
              </h3>
              <p className="text-[11px] text-gray-500">
                Paiement à la livraison (COD) partout au Maroc
              </p>
            </div>
          </div>
          <button
            onClick={closeCheckout}
            className="p-1.5 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-white"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Order items recap */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
              <span>Articles sélectionnés ({orderItems.length})</span>
              <span>Prix unitaire</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto border border-gray-100 rounded-xs bg-[#FAF4EF]/30 p-2">
              {orderItems.map((item) => {
                const unitPrice = item.product.discount_price ?? item.product.price;
                return (
                  <div key={item.variant.id} className="py-2.5 flex items-center gap-3">
                    <img
                      src={
                        item.product.images[0] ||
                        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=150&q=80'
                      }
                      alt={item.product.name}
                      className="w-12 h-14 object-cover rounded-xs border border-gray-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#181818] truncate">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded-xs font-medium">
                          Taille : {item.variant.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block"
                            style={{ backgroundColor: item.variant.color_hex }}
                          />
                          {item.variant.color_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Quantité : <strong>{item.quantity}</strong>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#181818]">
                        {unitPrice * item.quantity} DH
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing summary */}
          <div className="bg-[#FAF4EF] p-4 rounded-xs border border-[#F1D7C5] space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Sous-total</span>
              <span className="font-semibold text-gray-900">{subtotal} DH</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#CF7644]" />
                <span>Livraison Maroc</span>
              </span>
              <span className="font-semibold text-gray-900">
                {deliveryFee === 0 ? (
                  <span className="text-emerald-700 font-bold">Gratuite</span>
                ) : (
                  `${deliveryFee} DH`
                )}
              </span>
            </div>
            <div className="border-t border-[#EAD8C7] pt-2 flex justify-between text-sm font-bold text-[#181818]">
              <span>Total Estimé (COD)</span>
              <span className="text-[#CF7644] font-serif text-lg">{total} DH</span>
            </div>
          </div>

          {/* Workflow Explanation Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <strong className="block font-semibold">Paiement à la livraison 100% sécurisé</strong>
              Votre message de commande sera pré-rempli avec votre sélection. Notre équipe DoArt Store vous confirme la commande et planifie la livraison à domicile sous 24h-48h.
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="space-y-3">
            <a
              href={waMobileUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setHasAttemptedOpen(true)}
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 px-6 text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg rounded-xs"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Ouvrir WhatsApp pour commander</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Notification / Fallback after clicking or if needed */}
            {hasAttemptedOpen && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xs text-xs space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Redirection WhatsApp initiée !</span>
                </div>
                <p className="text-gray-600">
                  Si la fenêtre WhatsApp ne s'est pas ouverte automatiquement sur votre appareil, utilisez les alternatives ci-dessous :
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={waWebUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-300 text-gray-700 hover:text-black rounded-xs font-medium text-xs shadow-2xs hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir sur WhatsApp Web</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-300 text-gray-700 hover:text-black rounded-xs font-medium text-xs shadow-2xs hover:bg-gray-50 transition-colors"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Message copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le texte complet</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-gray-500 pt-1">
                  Numéro WhatsApp direct :{' '}
                  <strong className="text-gray-800 font-mono">
                    {formatMoroccanDisplayPhone(storeWhatsAppNumber).international}
                  </strong>{' '}
                  <span className="text-gray-500 font-medium">
                    ({formatMoroccanDisplayPhone(storeWhatsAppNumber).local})
                  </span>
                </div>
              </div>
            )}

            {/* Toggle message preview */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTextPreview((prev) => !prev)}
                className="text-[11px] text-gray-500 hover:text-[#CF7644] underline flex items-center gap-1 mx-auto"
              >
                <span>{showTextPreview ? 'Masquer' : 'Voir'} le message pré-rempli pour WhatsApp</span>
              </button>

              {showTextPreview && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xs text-[11px] font-mono text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {orderMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF4EF] px-6 py-3 border-t border-[#F1D7C5] flex items-center justify-between text-xs text-gray-600">
          <button
            type="button"
            onClick={closeCheckout}
            className="hover:text-black underline uppercase tracking-wider text-[11px]"
          >
            Fermer
          </button>
          {hasAttemptedOpen && (
            <button
              type="button"
              onClick={handleFinishAndClose}
              className="text-[#CF7644] font-semibold hover:underline"
            >
              J’ai envoyé mon message → Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
