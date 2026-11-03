import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { MOROCCAN_CITIES } from '../../data/mockData';
import { createOrder, getStoreSettings } from '../../services/storeService';
import { createWhatsAppLink, normalizeWhatsAppNumber } from '../../utils/whatsapp';
import { Order } from '../../types';

export const WhatsAppCheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    closeCheckout,
    items,
    directCheckoutItem,
    clearCart,
    setLastCreatedOrder,
  } = useCart();

  // Active items being checked out
  const checkoutItems = directCheckoutItem ? [directCheckoutItem] : items;

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [customCity, setCustomCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [storeWhatsAppNumber, setStoreWhatsAppNumber] = useState('212661000000');

  useEffect(() => {
    getStoreSettings().then((s) => {
      if (s.whatsapp_number) {
        setStoreWhatsAppNumber(s.whatsapp_number);
      }
    });
  }, []);

  if (!isCheckoutOpen) return null;

  // Calculate pricing
  const subtotal = checkoutItems.reduce((acc, item) => {
    const price = item.product.discount_price ?? item.product.price;
    return acc + price * item.quantity;
  }, 0);
  const deliveryFee = subtotal >= 600 || subtotal === 0 ? 0 : 35;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage('Veuillez saisir votre nom et prénom complet.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9) {
      setErrorMessage('Veuillez renseigner un numéro de téléphone marocain valide (ex: 06 61 23 45 67).');
      return;
    }

    const effectiveCity = city === 'Autre ville au Maroc' ? customCity.trim() : city;
    if (!effectiveCity) {
      setErrorMessage('Veuillez préciser votre ville de livraison.');
      return;
    }

    if (!address.trim() || address.trim().length < 6) {
      setErrorMessage('Veuillez indiquer une adresse de livraison précise (Quartier, Rue, N° d’appartement).');
      return;
    }

    if (checkoutItems.length === 0) {
      setErrorMessage('Votre panier est vide.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer_name: fullName.trim(),
        customer_phone: phone.trim(),
        city: effectiveCity,
        address: address.trim(),
        notes: notes.trim(),
        subtotal,
        total,
        items: checkoutItems.map((item) => {
          const unitPrice = item.product.discount_price ?? item.product.price;
          return {
            product_id: item.product.id,
            variant_id: item.variant.id,
            product_name: item.product.name,
            size: item.variant.size,
            color_name: item.variant.color_name,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: unitPrice * item.quantity,
            product_image: item.product.images[0] || '',
          };
        }),
      };

      // 1. Create order in Supabase/store
      const createdOrder = await createOrder(orderPayload);
      setCompletedOrder(createdOrder);
      setLastCreatedOrder(createdOrder);

      // 2. Clear cart if we checked out from cart
      if (!directCheckoutItem) {
        clearCart();
      }

      // 3. Build WhatsApp redirect link
      const waLink = createWhatsAppLink(storeWhatsAppNumber, createdOrder, deliveryFee);

      // 4. Open WhatsApp in new tab/app
      window.open(waLink, '_blank');
    } catch (err: unknown) {
      console.error('Error creating WhatsApp order:', err);
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue lors de la création de la commande.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompletedOrder(null);
    closeCheckout();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl shadow-2xl relative border border-[#F1D7C5] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[#FAF4EF] px-6 py-5 border-b border-[#F1D7C5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#CF7644] block">
              Paiement à la livraison (COD)
            </span>
            <h3 className="font-serif text-2xl font-semibold text-[#181818]">
              {completedOrder ? 'Commande Enregistrée !' : 'Commander via WhatsApp'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {completedOrder ? (
          /* SUCCESS SCREEN AFTER ORDER PLACEMENT */
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="font-serif text-2xl text-[#181818] font-bold">
                Merci {completedOrder.customer_name} !
              </h4>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Votre commande <strong className="text-[#CF7644]">#{completedOrder.order_reference}</strong> a été enregistrée avec succès avec le statut{' '}
                <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200 text-xs">
                  En attente WhatsApp
                </span>.
              </p>
            </div>

            {/* Steps explanations */}
            <div className="bg-[#FAF4EF] p-5 border border-[#F1D7C5] space-y-3 text-xs md:text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#CF7644] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </span>
                <div>
                  <strong className="text-black">Confirmation WhatsApp :</strong>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Un onglet WhatsApp s’est ouvert avec le résumé de votre commande. Cliquez sur "Envoyer" dans WhatsApp pour valider l'expédition.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#CF7644] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <div>
                  <strong className="text-black">Préparation & Expédition :</strong>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Notre équipe vérifie le stock et expédie sous 24h-48h à {completedOrder.city}.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#CF7644] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </span>
                <div>
                  <strong className="text-black">Paiement à la livraison :</strong>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Vous payez le montant total de <strong className="text-[#CF7644]">{completedOrder.total} DH</strong> en espèces au livreur à réception.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <div className="border border-gray-200 p-4 rounded-xs text-xs space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Destinataire :</span>
                <span className="font-medium text-gray-800">{completedOrder.customer_name} ({completedOrder.customer_phone})</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Ville & Adresse :</span>
                <span className="font-medium text-gray-800 text-right">{completedOrder.city}, {completedOrder.address}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Articles ({completedOrder.items?.length || 0}) :</span>
                <span className="font-medium text-gray-800">{completedOrder.subtotal} DH</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#181818] border-t border-gray-100 pt-2">
                <span>Total en espèces :</span>
                <span className="text-[#CF7644]">{completedOrder.total} DH</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <a
                href={createWhatsAppLink(storeWhatsAppNumber, completedOrder, deliveryFee)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 px-6 font-semibold uppercase tracking-wider text-xs md:text-sm transition-colors shadow-md rounded-xs"
              >
                <Send className="w-4 h-4" />
                <span>Ouvrir WhatsApp pour confirmer</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleClose}
                className="w-full py-2.5 text-xs text-gray-600 hover:text-black uppercase tracking-wider text-center"
              >
                Retour à la boutique DoArt
              </button>
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM */
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* COD Notice Banner */}
            <div className="bg-[#FAF4EF] border-l-4 border-[#CF7644] p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#CF7644] shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 leading-relaxed">
                <strong className="text-black font-semibold">Paiement en espèces à la livraison.</strong>
                <p className="text-gray-600 mt-0.5">
                  Aucun paiement par carte requis. Renseignez vos coordonnées, validez sur WhatsApp, et payez directement à la réception de votre colis.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                  Nom et Prénom <span className="text-[#CF7644]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Yassine Benjelloun"
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#CF7644] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                  Numéro de téléphone WhatsApp <span className="text-[#CF7644]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: 06 61 23 45 67 ou 07..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#CF7644] transition-colors"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Nous vous contacterons sur ce numéro pour confirmer l'expédition.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                    Ville de livraison <span className="text-[#CF7644]">*</span>
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 bg-white focus:outline-none focus:border-[#CF7644] transition-colors"
                  >
                    {MOROCCAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {city === 'Autre ville au Maroc' && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                      Précisez la ville <span className="text-[#CF7644]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      placeholder="Nom de votre ville"
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 focus:outline-none focus:border-[#CF7644] transition-colors"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                  Adresse de livraison complète <span className="text-[#CF7644]">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, Boulevard/Rue, Immeuble, Numéro d'appartement..."
                  className="w-full px-4 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#CF7644] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-gray-700 mb-1.5">
                  Remarques ou instructions de livraison (Optionnel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: Appelez-moi avant de passer, après 17h..."
                  className="w-full px-4 py-2 text-sm border border-gray-300 focus:outline-none focus:border-[#CF7644] transition-colors"
                />
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-xs space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Résumé des articles ({checkoutItems.length})
              </h5>
              <div className="divide-y divide-gray-200/60 max-h-40 overflow-y-auto pr-1 text-xs">
                {checkoutItems.map((item) => {
                  const price = item.product.discount_price ?? item.product.price;
                  return (
                    <div key={item.variant.id} className="py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center font-medium text-[10px]">
                          {item.quantity}x
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800 line-clamp-1">{item.product.name}</p>
                          <p className="text-[11px] text-gray-500">
                            Taille: {item.variant.size} • Couleur: {item.variant.color_name}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-gray-900">{price * item.quantity} DH</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{subtotal} DH</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-[#CF7644]" />
                    <span>Livraison partout au Maroc</span>
                  </span>
                  <span>{deliveryFee === 0 ? <strong className="text-green-700">Gratuite</strong> : `${deliveryFee} DH`}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Montant Total à Payer (COD)</span>
                  <span className="text-[#CF7644] font-serif text-lg">{total} DH</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 bg-[#CF7644] hover:bg-[#b66133] disabled:opacity-50 text-white py-4 px-6 text-sm font-bold uppercase tracking-wider transition-colors shadow-lg"
              >
                {isSubmitting ? (
                  <span>Génération de la commande...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmer et Commander sur WhatsApp</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-gray-500">
                En cliquant, votre commande sera enregistrée et envoyée au numéro WhatsApp officiel DoArt Store.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
