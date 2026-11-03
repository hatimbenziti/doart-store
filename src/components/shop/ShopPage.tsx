import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw, AlertCircle } from 'lucide-react';
import { Product, Category } from '../../types';
import { ProductCard } from '../products/ProductCard';

interface ShopPageProps {
  products: Product[];
  categories: Category[];
  initialCategorySlug?: string;
  initialFilter?: string;
  searchQuery?: string;
  onSelectProduct: (product: Product) => void;
  onClearInitialFilters?: () => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  categories,
  initialCategorySlug,
  initialFilter,
  searchQuery = '',
  onSelectProduct,
  onClearInitialFilters,
}) => {
  // Local filter states
  const [search, setSearch] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategorySlug || 'all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>(initialFilter === 'new' ? 'newest' : 'featured');
  const [showInStockOnly, setShowInStockOnly] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Extract all unique sizes & colors from available products
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        if (v.size) set.add(v.size);
      });
    });
    return Array.from(set).sort();
  }, [products]);

  const allColors = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        if (v.color_name && !map.has(v.color_name)) {
          map.set(v.color_name, v.color_hex);
        }
      });
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [products]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Active check
        if (!p.is_active) return false;

        // Search name
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesDesc = p.description.toLowerCase().includes(q);
          if (!matchesName && !matchesDesc) return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          const cat = categories.find((c) => c.slug === selectedCategory);
          if (cat && p.category_id !== cat.id) return false;
        }

        // In-stock only
        const totalStock = (p.variants || []).reduce((sum, v) => sum + v.stock_quantity, 0);
        if (showInStockOnly && totalStock <= 0) return false;

        // Size filter
        if (selectedSize !== 'all') {
          const hasSize = (p.variants || []).some(
            (v) => v.size === selectedSize && v.stock_quantity > 0
          );
          if (!hasSize) return false;
        }

        // Color filter
        if (selectedColor !== 'all') {
          const hasColor = (p.variants || []).some(
            (v) => v.color_name.toLowerCase() === selectedColor.toLowerCase() && v.stock_quantity > 0
          );
          if (!hasColor) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.discount_price ?? a.price;
        const priceB = b.discount_price ?? b.price;

        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'newest') {
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        }
        // Default featured: is_featured first
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      });
  }, [
    products,
    categories,
    search,
    selectedCategory,
    selectedSize,
    selectedColor,
    sortBy,
    showInStockOnly,
  ]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setSortBy('featured');
    setShowInStockOnly(false);
    if (onClearInitialFilters) onClearInitialFilters();
  };

  const hasActiveFilters =
    search !== '' ||
    selectedCategory !== 'all' ||
    selectedSize !== 'all' ||
    selectedColor !== 'all' ||
    showInStockOnly;

  return (
    <div className="bg-white min-h-screen">
      {/* Header Banner */}
      <div className="bg-[#FAF4EF] border-b border-[#F1D7C5] py-12 px-4 text-center">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#CF7644]">
          Vestiaire DoArt
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#181818] mt-1">
          La Collection Complète
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto mt-2">
          Pièces intemporelles au design épuré, livrées chez vous partout au Maroc avec paiement en espèces à la livraison.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Control Bar: Search, Quick Filters & Mobile Trigger */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom de vêtement..."
              className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xs focus:bg-white focus:outline-none focus:border-[#CF7644] transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort & Mobile Filters Button */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-2 border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs text-gray-700 hover:border-[#CF7644]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#CF7644]" />
              <span>Filtres {hasActiveFilters && '•'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 hidden sm:inline">Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-200 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#CF7644] rounded-xs cursor-pointer"
              >
                <option value="featured">Sélection DoArt</option>
                <option value="newest">Plus récents</option>
                <option value="price-asc">Prix : Croissant</option>
                <option value="price-desc">Prix : Décroissant</option>
                <option value="name">Nom (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Pills Horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#181818] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous ({products.filter((p) => p.is_active).length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.is_active && p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all shrink-0 ${
                  selectedCategory === cat.slug
                    ? 'bg-[#CF7644] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Desktop Filter Bar & Product Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
          {/* Desktop Left Sidebar Filters */}
          <aside className="hidden md:block md:col-span-3 space-y-6 border-r border-gray-100 pr-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-serif font-bold text-base text-[#181818]">Filtres</h3>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] text-[#CF7644] hover:underline flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

            {/* In-Stock Toggle */}
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-xs font-medium text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInStockOnly}
                  onChange={(e) => setShowInStockOnly(e.target.checked)}
                  className="rounded-xs text-[#CF7644] focus:ring-[#CF7644] w-4 h-4 cursor-pointer"
                />
                <span>En stock uniquement</span>
              </label>
            </div>

            {/* Size Filter */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase tracking-wider font-bold text-gray-900">
                Tailles disponibles
              </h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSize('all')}
                  className={`px-3 py-1.5 text-xs rounded-xs font-medium transition-colors ${
                    selectedSize === 'all'
                      ? 'bg-[#CF7644] text-white font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Toutes
                </button>
                {allSizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-3 py-1.5 text-xs rounded-xs font-medium transition-colors ${
                      selectedSize === sz
                        ? 'bg-[#CF7644] text-white font-bold'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Filter */}
            <div className="space-y-2.5">
              <h4 className="text-xs uppercase tracking-wider font-bold text-gray-900">
                Couleurs
              </h4>
              <div className="space-y-1.5">
                <button
                  onClick={() => setSelectedColor('all')}
                  className={`w-full text-left px-2.5 py-1 text-xs rounded-xs flex items-center justify-between ${
                    selectedColor === 'all'
                      ? 'bg-[#FAF4EF] text-[#CF7644] font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>Toutes les teintes</span>
                </button>
                {allColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xs flex items-center gap-2.5 transition-colors ${
                      selectedColor === c.name
                        ? 'bg-[#FAF4EF] text-[#CF7644] font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Moroccan COD notice */}
            <div className="p-4 bg-[#FAF4EF] rounded-xs border border-[#F1D7C5] text-xs space-y-1">
              <p className="font-semibold text-[#181818]">Paiement à la livraison</p>
              <p className="text-gray-600 text-[11px] leading-relaxed">
                Commandez vos pièces en toute sérénité. Vérification et règlement en espèces lors de la réception par le livreur.
              </p>
            </div>
          </aside>

          {/* Right Main Grid (2 cols mobile, 4 cols desktop on 12-col layout) */}
          <main className="md:col-span-9">
            {/* Results count & active tags */}
            <div className="flex items-center justify-between pb-4 text-xs text-gray-500">
              <span>
                {filteredProducts.length} {filteredProducts.length <= 1 ? 'article trouvé' : 'articles trouvés'}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-[#CF7644] hover:underline flex items-center gap-1 font-medium md:hidden"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>

            {/* 2 columns on mobile, 3/4 columns on desktop */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xs border border-dashed border-gray-200 p-8 space-y-4">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto" />
                <h3 className="font-serif text-xl font-bold text-gray-800">
                  Aucun vêtement ne correspond à votre recherche
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Essayez de modifier vos critères de filtrage ou réinitialisez les filtres pour voir toutes les créations DoArt Store.
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-[#CF7644] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xs hover:bg-[#b66133] transition-colors"
                >
                  Voir tous les vêtements
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white p-6 flex flex-col justify-between">
              <div className="space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="font-serif font-bold text-lg">Filtrer les pièces</h3>
                  <button onClick={() => setMobileFilterOpen(false)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* In stock */}
                <label className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="text-[#CF7644] rounded-xs"
                  />
                  <span>En stock uniquement</span>
                </label>

                {/* Sizes */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Taille</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedSize('all')}
                      className={`px-3 py-1 text-xs rounded-xs ${
                        selectedSize === 'all' ? 'bg-[#CF7644] text-white' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      Toutes
                    </button>
                    {allSizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1 text-xs rounded-xs ${
                          selectedSize === sz ? 'bg-[#CF7644] text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Colors */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Couleur</h4>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedColor('all')}
                      className={`w-full text-left p-1 text-xs ${
                        selectedColor === 'all' ? 'text-[#CF7644] font-bold' : 'text-gray-700'
                      }`}
                    >
                      Toutes les couleurs
                    </button>
                    {allColors.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setSelectedColor(c.name)}
                        className={`w-full text-left p-1 text-xs flex items-center gap-2 ${
                          selectedColor === c.name ? 'text-[#CF7644] font-bold' : 'text-gray-700'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: c.hex }} />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t space-y-2">
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full bg-[#CF7644] text-white py-3 text-xs font-bold uppercase tracking-wider"
                >
                  Afficher les résultats ({filteredProducts.length})
                </button>
                <button
                  onClick={() => {
                    resetFilters();
                    setMobileFilterOpen(false);
                  }}
                  className="w-full text-gray-500 py-2 text-xs uppercase"
                >
                  Tout réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
