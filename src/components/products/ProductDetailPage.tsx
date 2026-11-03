import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  ShoppingBag,
  MessageCircle,
  Truck,
  ShieldCheck,
  Check,
  AlertCircle,
  Ruler,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { Product, ProductVariant } from '../../types';
import { useCart } from '../../context/CartContext';
import { ProductCard } from './ProductCard';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onBack,
  onSelectProduct,
}) => {
  const { addItem, openCart, openWhatsAppOrder } = useCart();

  // Active gallery image
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Extract unique available colors
  const availableColors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string }>();
    (product.variants || []).forEach((v) => {
      if (!map.has(v.color_name)) {
        map.set(v.color_name, { name: v.color_name, hex: v.color_hex });
      }
    });
    return Array.from(map.values());
  }, [product]);

  // Selected color (defaults to first color available with stock, or first color)
  const [selectedColorName, setSelectedColorName] = useState<string>(() => {
    const inStockVar = (product.variants || []).find((v) => v.stock_quantity > 0);
    return inStockVar?.color_name || availableColors[0]?.name || '';
  });

  // Extract unique sizes for this product
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    (product.variants || []).forEach((v) => set.add(v.size));
    // Sort standard sizes logically if standard
    const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Unique'];
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [product]);

  // Selected size
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    // Pick first size in stock for the selected color
    const match = (product.variants || []).find(
      (v) => v.color_name === selectedColorName && v.stock_quantity > 0
    );
    return match?.size || allSizes[0] || '';
  });

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Active toast feedback
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active tabs
  const [activeTab, setActiveTab] = useState<'desc' | 'guide' | 'delivery'>('desc');

  // Currently matched variant
  const currentVariant: ProductVariant | undefined = useMemo(() => {
    return (product.variants || []).find(
      (v) => v.size === selectedSize && v.color_name === selectedColorName
    );
  }, [product, selectedSize, selectedColorName]);

  const stockAvailable = currentVariant ? currentVariant.stock_quantity : 0;
  const isOutOfStock = stockAvailable <= 0;

  // Handle color change: auto-select available size if current size has 0 stock
  const handleColorChange = (colorName: string) => {
    setSelectedColorName(colorName);
    const existing = (product.variants || []).find(
      (v) => v.color_name === colorName && v.size === selectedSize && v.stock_quantity > 0
    );
    if (!existing) {
      const firstAvailableForColor = (product.variants || []).find(
        (v) => v.color_name === colorName && v.stock_quantity > 0
      );
      if (firstAvailableForColor) {
        setSelectedSize(firstAvailableForColor.size);
      }
    }
    setQuantity(1);
  };

  // Add to cart
  const handleAddToCart = () => {
    if (!currentVariant || isOutOfStock) {
      setNotification({
        type: 'error',
        message: 'Cette combinaison de taille et couleur est actuellement en rupture de stock.',
      });
      return;
    }

    const res = addItem(product, currentVariant, quantity);
    if (res.success) {
      setNotification({
        type: 'success',
        message: `« ${product.name} » (${selectedSize} • ${selectedColorName}) ajouté au panier !`,
      });
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({
        type: 'error',
        message: res.message || 'Impossible d’ajouter au panier.',
      });
    }
  };

  // Direct WhatsApp Checkout
  const handleDirectWhatsAppOrder = () => {
    if (!currentVariant || isOutOfStock) {
      setNotification({
        type: 'error',
        message: 'Veuillez sélectionner une taille et une couleur disponibles en stock.',
      });
      return;
    }

    openWhatsAppOrder({
      id: currentVariant.id,
      product,
      variant: currentVariant,
      quantity,
    });
  };

  // Related products
  const relatedProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== product.id && p.is_active)
      .slice(0, 4);
  }, [allProducts, product.id]);

  return (
    <div className="bg-white min-h-screen py-6 md:py-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm">
          <div
            className={`p-4 rounded-xs shadow-xl flex items-start gap-3 border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-semibold">{notification.message}</p>
              {notification.type === 'success' && (
                <button
                  onClick={openCart}
                  className="mt-1 text-[#CF7644] underline font-bold"
                >
                  Ouvrir le panier →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between pb-6 text-xs text-gray-500 border-b border-gray-100">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-gray-700 hover:text-[#CF7644] transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la boutique</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span>Accueil</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span>{product.category?.name || 'Vêtements'}</span>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-[#181818] font-medium line-clamp-1">{product.name}</span>
          </div>
        </div>

        {/* Product Main Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 pt-8">
          {/* Left: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage Image */}
            <div className="aspect-3/4 overflow-hidden rounded-xs bg-[#FAF4EF] relative border border-gray-100 shadow-xs">
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={`${product.name} photo ${activeImageIndex + 1}`}
                className="w-full h-full object-cover object-top"
              />

              {product.discount_price && (
                <span className="absolute top-4 left-4 bg-[#CF7644] text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xs shadow-sm">
                  Offre Spéciale
                </span>
              )}
            </div>

            {/* Thumbnail Navigation */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-24 rounded-xs overflow-hidden shrink-0 border-2 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#CF7644] opacity-100 ring-2 ring-[#CF7644]/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Miniature ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Buy Actions & Configuration */}
          <div className="lg:col-span-5 space-y-6">
            {/* Header info */}
            <div className="space-y-2 border-b border-gray-100 pb-5">
              {product.category && (
                <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#CF7644]">
                  {product.category.name}
                </span>
              )}
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#181818] leading-tight">
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 pt-2">
                <span className="font-serif text-3xl font-bold text-[#181818]">
                  {product.discount_price ?? product.price} DH
                </span>
                {product.discount_price && (
                  <span className="text-base text-gray-400 line-through">
                    {product.price} DH
                  </span>
                )}
                <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-xs border border-emerald-200">
                  Paiement à la livraison
                </span>
              </div>
            </div>

            {/* Color Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-700">
                  Couleur sélectionnée : <span className="text-[#181818] font-semibold">{selectedColorName}</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                {availableColors.map((color) => {
                  const isSelected = selectedColorName === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => handleColorChange(color.name)}
                      className={`group relative p-1 rounded-full border-2 transition-all ${
                        isSelected ? 'border-[#CF7644] scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                      }`}
                      title={color.name}
                    >
                      <span
                        className="w-7 h-7 rounded-full block border border-black/10 shadow-inner"
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size Selector with Stock Validation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-700">
                  Taille : <span className="text-[#181818] font-semibold">{selectedSize}</span>
                </span>
                <button
                  onClick={() => setActiveTab('guide')}
                  className="text-gray-500 hover:text-[#CF7644] flex items-center gap-1 underline text-[11px]"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Guide des tailles</span>
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {allSizes.map((sz) => {
                  // Find variant for this size + current selected color
                  const v = (product.variants || []).find(
                    (item) => item.color_name === selectedColorName && item.size === sz
                  );
                  const inStock = v && v.stock_quantity > 0;
                  const isSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      disabled={!inStock}
                      onClick={() => {
                        setSelectedSize(sz);
                        setQuantity(1);
                      }}
                      className={`py-2.5 text-xs font-semibold rounded-xs border transition-all text-center relative ${
                        isSelected
                          ? 'border-[#CF7644] bg-[#CF7644] text-white shadow-sm'
                          : inStock
                          ? 'border-gray-300 hover:border-[#CF7644] text-gray-800 bg-white'
                          : 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock Availability Status */}
            <div className="p-3 bg-gray-50 rounded-xs border border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-600">Disponibilité :</span>
              {isOutOfStock ? (
                <span className="font-bold text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Rupture de stock pour cette combinaison
                </span>
              ) : (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  En stock ({stockAvailable} disponibles)
                </span>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                  Quantité
                </label>
                <div className="flex items-center border border-gray-300 w-36 rounded-xs bg-white">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-10 py-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-bold text-sm text-[#181818]">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(stockAvailable, q + 1))}
                    disabled={quantity >= stockAvailable}
                    className="w-10 py-2.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons: WhatsApp Direct & Add to Cart */}
            <div className="space-y-3 pt-2">
              {/* WhatsApp Primary Button */}
              <button
                onClick={handleDirectWhatsAppOrder}
                disabled={isOutOfStock}
                className="w-full bg-[#25D366] hover:bg-[#20ba5a] disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 px-6 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg rounded-xs"
              >
                <MessageCircle className="w-5 h-5 fill-white/20" />
                <span>Commander via WhatsApp</span>
              </button>

              {/* Add to Cart secondary */}
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-full bg-white hover:bg-gray-50 border border-[#181818] text-[#181818] py-3.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors rounded-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ajouter au Panier</span>
              </button>
            </div>

            {/* COD & Moroccan Delivery Guarantee Box */}
            <div className="p-4 bg-[#FAF4EF] rounded-xs border border-[#F1D7C5] space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-gray-800">
                <Truck className="w-4 h-4 text-[#CF7644] shrink-0" />
                <span>
                  <strong>Livraison Partout au Maroc</strong> sous 24h à 48h (Amana ou livreur direct).
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-800">
                <ShieldCheck className="w-4 h-4 text-[#CF7644] shrink-0" />
                <span>
                  <strong>Paiement à la livraison</strong> en espèces à la réception de votre commande.
                </span>
              </div>
            </div>

            {/* Informational Tabs */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-3 text-xs uppercase tracking-wider font-bold border-b-2 mr-6 transition-colors ${
                    activeTab === 'desc'
                      ? 'border-[#CF7644] text-[#CF7644]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`pb-3 text-xs uppercase tracking-wider font-bold border-b-2 mr-6 transition-colors ${
                    activeTab === 'guide'
                      ? 'border-[#CF7644] text-[#CF7644]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Guide des Tailles
                </button>
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`pb-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-colors ${
                    activeTab === 'delivery'
                      ? 'border-[#CF7644] text-[#CF7644]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Livraison Maroc
                </button>
              </div>

              <div className="py-4 text-xs text-gray-600 leading-relaxed">
                {activeTab === 'desc' && (
                  <div className="space-y-3">
                    <p>{product.description}</p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-500">
                      <li>Confectionné avec soin dans notre atelier de Casablanca.</li>
                      <li>Tissu sélectionné pour sa longévité et son confort respirant.</li>
                      <li>Lavage délicat à 30°C conseillé, repassage doux.</li>
                    </ul>
                  </div>
                )}

                {activeTab === 'guide' && (
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-800">Barème des tailles marocaines :</p>
                    <div className="border border-gray-200 text-[11px] divide-y divide-gray-200">
                      <div className="flex bg-gray-50 font-bold p-2">
                        <span className="w-16">Taille</span>
                        <span className="flex-1">Tour de poitrine</span>
                        <span className="flex-1">Longueur</span>
                      </div>
                      <div className="flex p-2">
                        <span className="w-16 font-semibold">S</span>
                        <span className="flex-1">88 - 94 cm</span>
                        <span className="flex-1">68 cm</span>
                      </div>
                      <div className="flex p-2">
                        <span className="w-16 font-semibold">M</span>
                        <span className="flex-1">95 - 102 cm</span>
                        <span className="flex-1">70 cm</span>
                      </div>
                      <div className="flex p-2">
                        <span className="w-16 font-semibold">L</span>
                        <span className="flex-1">103 - 110 cm</span>
                        <span className="flex-1">72 cm</span>
                      </div>
                      <div className="flex p-2">
                        <span className="w-16 font-semibold">XL</span>
                        <span className="flex-1">111 - 118 cm</span>
                        <span className="flex-1">74 cm</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'delivery' && (
                  <div className="space-y-2">
                    <p>
                      <strong>Casablanca & Rabat :</strong> Livraison express en 24h.
                    </p>
                    <p>
                      <strong>Marrakech, Fès, Tanger, Agadir & autres villes :</strong> Livraison en 24h à 48h.
                    </p>
                    <p>
                      <strong>Frais d'envoi :</strong> 35 DH (Livraison offerte à partir de 600 DH).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <div className="mt-20 pt-12 border-t border-gray-100 space-y-8">
            <div className="text-center space-y-1">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#CF7644] font-bold">
                Vous aimerez aussi
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#181818]">
                Complétez votre vestiaire
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={onSelectProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
