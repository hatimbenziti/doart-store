import React, { useState } from 'react';
import { X, Plus, Trash2, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Product, ProductVariant, Order } from '../../types';
import { createOrder } from '../../services/storeService';
import { MOROCCAN_CITIES } from '../../data/mockData';

interface AdminManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onOrderCreated: (order: Order) => void;
}

interface ManualItemRow {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export const AdminManualOrderModal: React.FC<AdminManualOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  onOrderCreated,
}) => {
  if (!isOpen) return null;

  // Selected items list
  const [items, setItems] = useState<ManualItemRow[]>([]);

  // Item selector states
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const availableVariants = selectedProduct?.variants || [];
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    availableVariants[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  // Customer states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [customCity, setCustomCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add item to manual order
  const handleAddItem = () => {
    if (!selectedProduct) return;
    const variant = availableVariants.find((v) => v.id === selectedVariantId) || availableVariants[0];
    if (!variant) {
      setError('Veuillez sélectionner une variante de taille/couleur.');
      return;
    }
    if (variant.stock_quantity < quantity) {
      setError(`Stock insuffisant (${variant.stock_quantity} disponible(s)).`);
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.variant.id === variant.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      }
      return [...prev, { product: selectedProduct, variant, quantity }];
    });
    setError(null);
  };

  const handleRemoveItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variant.id !== variantId));
  };

  // Pricing calculation
  const subtotal = items.reduce((sum, item) => {
    const price = item.product.discount_price ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = subtotal >= 600 || subtotal === 0 ? 0 : 35;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Le nom du client est requis.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Le numéro WhatsApp du client est requis.');
      return;
    }
    const finalCity = city === 'Autre ville au Maroc' ? customCity.trim() : city;
    if (!finalCity) {
      setError('La ville de destination est requise.');
      return;
    }
    if (!address.trim()) {
      setError('L’adresse de livraison est requise.');
      return;
    }
    if (items.length === 0) {
      setError('Veuillez ajouter au moins un article à la commande.');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        city: finalCity,
        address: address.trim(),
        notes: notes.trim(),
        subtotal,
        total,
        items: items.map((it) => {
          const unitPrice = it.product.discount_price ?? it.product.price;
          return {
            product_id: it.product.id,
            variant_id: it.variant.id,
            product_name: it.product.name,
            size: it.variant.size,
            color_name: it.variant.color_name,
            quantity: it.quantity,
            unit_price: unitPrice,
            total_price: unitPrice * it.quantity,
            product_image: it.product.images[0] || '',
          };
        }),
      };

      const created = await createOrder(orderPayload);
      onOrderCreated(created);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création de la commande.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl shadow-2xl relative border border-[#F1D7C5] overflow-hidden my-8 rounded-xs">
        {/* Header */}
        <div className="bg-[#FAF4EF] px-6 py-4 border-b border-[#F1D7C5] flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#181818]">
              Enregistrer une Commande WhatsApp
            </h3>
            <p className="text-xs text-gray-500">
              Saisissez la commande convenue sur WhatsApp pour décompter le stock et planifier l'expédition.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-black rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Customer details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1">
              Coordonnées Client
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-gray-600 mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Salma Benani"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Téléphone WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: 0661234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Ville de livraison *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs bg-white focus:outline-none focus:border-[#CF7644]"
                >
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="Autre ville au Maroc">Autre ville au Maroc</option>
                </select>
                {city === 'Autre ville au Maroc' && (
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Précisez votre ville"
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-xs"
                  />
                )}
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Adresse complète *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, Rue, N° d’appartement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product & variant selector */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 border-b border-gray-100 pb-1">
              Ajouter des articles
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end text-xs">
              <div className="sm:col-span-2">
                <label className="block text-gray-600 mb-1">Produit</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod?.variants?.[0]) setSelectedVariantId(prod.variants[0].id);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.price} DH)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-600 mb-1">Taille / Couleur</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xs bg-white"
                >
                  {availableVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.size} - {v.color_name} (Stock: {v.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="w-16">
                  <label className="block text-gray-600 mb-1">Qté</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-xs text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex-1 mt-auto bg-[#CF7644] hover:bg-[#b66133] text-white py-2 px-3 rounded-xs font-bold uppercase tracking-wider text-xs"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Selected items table */}
            {items.length > 0 ? (
              <div className="border border-gray-200 rounded-xs divide-y divide-gray-100 text-xs">
                {items.map((it) => {
                  const price = it.product.discount_price ?? it.product.price;
                  return (
                    <div key={it.variant.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <strong className="text-[#181818]">{it.product.name}</strong>
                        <span className="text-gray-500 ml-2">
                          ({it.variant.size} • {it.variant.color_name}) x {it.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#181818]">{price * it.quantity} DH</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.variant.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Aucun article ajouté pour le moment.</p>
            )}
          </div>

          {/* Pricing summary */}
          <div className="bg-[#FAF4EF] p-4 rounded-xs border border-[#F1D7C5] flex justify-between text-xs">
            <div>
              <span className="text-gray-600 block">Sous-total : {subtotal} DH</span>
              <span className="text-gray-600 block">
                Livraison : {deliveryFee === 0 ? 'Gratuite' : `${deliveryFee} DH`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Commande (COD)</span>
              <span className="text-lg font-serif font-bold text-[#CF7644]">{total} DH</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase tracking-wider text-gray-600 hover:text-black"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xs shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Valider & Décompter le stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
