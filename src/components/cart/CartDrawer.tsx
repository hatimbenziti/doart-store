import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface CartDrawerProps {
  onNavigateToShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigateToShop }) => {
  const {
    isCartOpen,
    closeCart,
    items,
    removeItem,
    updateQuantity,
    subtotal,
    deliveryFee,
    total,
    openCheckout,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-medium text-[#181818]">Mon Panier</h2>
              <span className="text-xs bg-[#FAF4EF] text-[#CF7644] font-semibold px-2.5 py-0.5 rounded-full border border-[#F1D7C5]">
                {items.length} {items.length <= 1 ? 'article' : 'articles'}
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-[#FAF4EF] flex items-center justify-center text-[#CF7644]">
                  <Truck className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-xl font-medium text-[#181818]">Votre panier est vide</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  Découvrez nos collections minimalistes et commandez en quelques clics via WhatsApp.
                </p>
                <button
                  onClick={() => {
                    closeCart();
                    onNavigateToShop();
                  }}
                  className="inline-flex items-center gap-2 bg-[#CF7644] text-white px-6 py-3 text-sm font-medium uppercase tracking-wider hover:bg-[#b66133] transition-colors shadow-sm"
                >
                  <span>Découvrir la collection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const unitPrice = item.product.discount_price ?? item.product.price;
                  return (
                    <div key={item.variant.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                      {/* Product Thumbnail */}
                      <div className="w-20 h-24 bg-gray-100 shrink-0 overflow-hidden rounded-xs relative">
                        <img
                          src={item.product.images[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & Controls */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium text-[#181818] line-clamp-1">
                              {item.product.name}
                            </h4>
                            <button
                              onClick={() => removeItem(item.variant.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Retirer cet article"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Selected variant specs */}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                            <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-xs">
                              Taille : {item.variant.size}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: item.variant.color_hex }}
                              />
                              <span>{item.variant.color_name}</span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Quantity Adjuster */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-gray-200 rounded-xs">
                            <button
                              onClick={() => updateQuantity(item.variant.id, -1, true)}
                              className="p-1 hover:bg-gray-50 text-gray-600 transition-colors"
                              aria-label="Diminuer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-semibold text-[#181818]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variant.id, 1, true)}
                              disabled={item.quantity >= item.variant.stock_quantity}
                              className="p-1 hover:bg-gray-50 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              aria-label="Augmenter"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <div className="text-sm font-bold text-[#181818]">
                              {unitPrice * item.quantity} DH
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {unitPrice} DH / unité
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer & Checkout Trigger */}
          {items.length > 0 && (
            <div className="p-6 bg-[#FAF4EF]/70 border-t border-[#F1D7C5] space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span className="font-medium">{subtotal} DH</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#CF7644]" />
                    <span>Livraison Maroc</span>
                  </span>
                  <span>{deliveryFee === 0 ? <strong className="text-green-700">Gratuite</strong> : `${deliveryFee} DH`}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[11px] text-[#CF7644]">
                    Ajoutez {600 - subtotal} DH pour profiter de la livraison gratuite !
                  </p>
                )}
                <div className="border-t border-[#EAD8C7] pt-2 flex justify-between text-base font-bold text-[#181818]">
                  <span>Total à payer (COD)</span>
                  <span className="text-[#CF7644] font-serif text-xl">{total} DH</span>
                </div>
              </div>

              {/* COD Badge */}
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Paiement à la livraison (En espèces lors de la réception)</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => openCheckout()}
                  className="w-full flex items-center justify-center gap-3 bg-[#CF7644] hover:bg-[#b66133] text-white py-3.5 px-6 text-sm font-semibold uppercase tracking-wider transition-colors shadow-md"
                >
                  <span>Commander via WhatsApp</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={closeCart}
                  className="w-full py-2 text-xs text-gray-600 hover:text-black uppercase tracking-wider text-center"
                >
                  Continuer mes achats
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
