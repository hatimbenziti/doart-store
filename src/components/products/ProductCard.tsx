import React from 'react';
import { Eye, MessageCircle, ShoppingBag } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { openCheckout } = useCart();

  // Calculate total stock across all variants
  const totalStock = (product.variants || []).reduce((sum, v) => sum + v.stock_quantity, 0);
  const isOutOfStock = totalStock <= 0;

  // Extract unique colors
  const uniqueColors = Array.from(
    new Map((product.variants || []).map((v) => [v.color_name, v])).values()
  );

  // Extract unique sizes
  const uniqueSizes = Array.from(new Set((product.variants || []).map((v) => v.size)));

  // Calculate discount percentage
  const discountPercent =
    product.discount_price && product.discount_price < product.price
      ? Math.round(((product.price - product.discount_price) / product.price) * 100)
      : null;

  const handleQuickWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pick first available variant
    const availableVariant = (product.variants || []).find((v) => v.stock_quantity > 0) || product.variants?.[0];
    if (availableVariant) {
      openCheckout({
        id: availableVariant.id,
        product,
        variant: availableVariant,
        quantity: 1,
      });
    } else {
      onSelect(product);
    }
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group cursor-pointer flex flex-col bg-white border border-gray-100 hover:border-[#F1D7C5] transition-all duration-300 hover:shadow-xl rounded-xs overflow-hidden"
    >
      {/* Visual Thumbnail */}
      <div className="relative aspect-3/4 overflow-hidden bg-[#FAF4EF]">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Secondary image hover effect if available */}
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={`${product.name} vue 2`}
            className="w-full h-full object-cover object-top absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out"
            loading="lazy"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {product.is_new && (
            <span className="bg-[#181818] text-[#F1D7C5] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
              Nouveau
            </span>
          )}
          {discountPercent && (
            <span className="bg-[#CF7644] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
              -{discountPercent}%
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-red-700 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
              Épuisé
            </span>
          )}
        </div>

        {/* Hover Quick Action Buttons */}
        <div className="absolute inset-x-2 bottom-3 flex items-center gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button
            onClick={handleQuickWhatsApp}
            disabled={isOutOfStock}
            className="flex-1 bg-[#181818] hover:bg-[#CF7644] text-white py-2.5 px-3 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:bg-gray-400"
            title="Commander via WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="p-2.5 bg-white text-gray-800 hover:text-[#CF7644] transition-colors shadow-md rounded-xs"
            title="Aperçu rapide"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Information Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          {product.category && (
            <span className="text-[10px] uppercase tracking-widest text-[#CF7644] font-semibold block">
              {product.category.name}
            </span>
          )}
          <h3 className="font-medium text-sm sm:text-base text-[#181818] group-hover:text-[#CF7644] transition-colors line-clamp-1">
            {product.name}
          </h3>
        </div>

        {/* Color swatches preview */}
        {uniqueColors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {uniqueColors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-2xs"
                style={{ backgroundColor: c.color_hex }}
                title={c.color_name}
              />
            ))}
            {uniqueColors.length > 4 && (
              <span className="text-[10px] text-gray-500 font-medium">
                +{uniqueColors.length - 4}
              </span>
            )}

            {/* Sizes badges */}
            <div className="ml-auto flex items-center gap-1">
              {uniqueSizes.slice(0, 3).map((sz, i) => (
                <span key={i} className="text-[9px] text-gray-500 bg-gray-100 px-1 rounded-2xs font-mono">
                  {sz}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing & Availability */}
        <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-base sm:text-lg text-[#181818]">
              {product.discount_price ?? product.price} DH
            </span>
            {product.discount_price && (
              <span className="text-xs text-gray-400 line-through">
                {product.price} DH
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-gray-400">
            {isOutOfStock ? (
              <span className="text-red-500">Rupture</span>
            ) : (
              <span className="text-emerald-700">En stock</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
