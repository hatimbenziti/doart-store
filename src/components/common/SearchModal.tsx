import React, { useState, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { Product } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter((p) => p.is_active && (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [products, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20">
      <div className="bg-white w-full max-w-2xl rounded-xs shadow-2xl overflow-hidden border border-[#F1D7C5] transition-all">
        {/* Search Input Bar */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#CF7644]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une chemise, un tracksuit, une djellaba..."
            className="flex-1 text-base sm:text-lg focus:outline-none text-[#181818] placeholder-gray-400"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {query.trim() === '' ? (
            <div className="py-6 text-center text-xs text-gray-400 space-y-2">
              <p>Suggestions fréquentes :</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Tracksuit', 'Djellaba', 'Kimono', 'Lin', 'Terracotta', 'Chemise'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="bg-[#FAF4EF] hover:bg-[#F1D7C5] text-gray-800 px-3 py-1 rounded-full text-xs transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Aucun résultat pour « {query} ».
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                {results.length} résultats trouvés
              </span>
              {results.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="flex items-center gap-4 p-2.5 hover:bg-[#FAF4EF] rounded-xs cursor-pointer transition-colors group"
                >
                  <div className="w-14 h-16 bg-gray-100 rounded-xs overflow-hidden shrink-0">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#181818] group-hover:text-[#CF7644] transition-colors truncate">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">{product.category?.name}</p>
                    <p className="text-xs font-bold text-[#CF7644] mt-0.5">
                      {product.discount_price ?? product.price} DH
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#CF7644] group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
