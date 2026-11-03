import React, { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HeroSection } from './components/home/HeroSection';
import { FeaturedCollections } from './components/home/FeaturedCollections';
import { InstagramSection } from './components/home/InstagramSection';
import { ProductCard } from './components/products/ProductCard';
import { ShopPage } from './components/shop/ShopPage';
import { ProductDetailPage } from './components/products/ProductDetailPage';
import { CartDrawer } from './components/cart/CartDrawer';
import { WhatsAppCheckoutModal } from './components/checkout/WhatsAppCheckoutModal';
import { SearchModal } from './components/common/SearchModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { getProducts, getCategories, getStoreSettings } from './services/storeService';
import { Product, Category, StoreSettings } from './types';
import { Sparkles, ArrowRight, ShieldCheck, Truck, MessageCircle } from 'lucide-react';

export default function App() {
  // Current view: 'home' | 'shop' | 'product-detail' | 'admin'
  const [currentView, setCurrentView] = useState<string>(() => {
    if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
      return 'admin';
    }
    return 'home';
  });

  // Selected product for detail view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Shop filter parameters when navigating
  const [shopCategorySlug, setShopCategorySlug] = useState<string | undefined>(undefined);
  const [shopFilter, setShopFilter] = useState<string | undefined>(undefined);

  // Search modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('doart_admin_session') === 'active';
  });

  // Catalog data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load store data
  const loadStoreData = async () => {
    try {
      const [prods, cats, sets] = await Promise.all([
        getProducts(false),
        getCategories(),
        getStoreSettings(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSettings(sets);
    } catch (err) {
      console.error('Failed to load initial store data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  // Sync hash/path for admin
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        setCurrentView('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const handleNavigate = (view: string, params?: Record<string, string>) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (params?.category) {
      setShopCategorySlug(params.category);
    } else {
      setShopCategorySlug(undefined);
    }
    if (params?.filter) {
      setShopFilter(params.filter);
    } else {
      setShopFilter(undefined);
    }
    setCurrentView(view);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Featured and new arrivals for homepage
  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 4);
  const newArrivals = products.filter((p) => p.is_new).slice(0, 4);

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-white text-[#181818] selection:bg-[#F1D7C5] selection:text-[#CF7644]">
        {/* Render Admin directly if in admin view */}
        {currentView === 'admin' ? (
          isAdminAuthenticated ? (
            <AdminDashboard onExit={() => handleNavigate('home')} />
          ) : (
            <AdminLogin
              onSuccess={() => setIsAdminAuthenticated(true)}
              onExit={() => handleNavigate('home')}
            />
          )
        ) : (
          /* Customer Storefront */
          <>
            <Navbar
              currentView={currentView}
              onNavigate={handleNavigate}
              onOpenSearch={() => setIsSearchOpen(true)}
            />

            <main className="flex-1">
              {/* HOMEPAGE */}
              {currentView === 'home' && (
                <div className="space-y-16 sm:space-y-24">
                  {/* Hero Banner */}
                  <HeroSection
                    onShopClick={() => handleNavigate('shop')}
                    onExploreCollection={(slug) => handleNavigate('shop', { category: slug })}
                  />

                  {/* Featured Collections Showcase */}
                  <FeaturedCollections
                    categories={categories}
                    onSelectCategory={(slug) => handleNavigate('shop', { category: slug })}
                  />

                  {/* New Arrivals Section */}
                  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4 text-center sm:text-left">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[#CF7644] text-[10px] font-bold uppercase tracking-[0.25em] mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Dernières créations</span>
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#181818]">
                          Nouveautés 2026
                        </h2>
                      </div>
                      <button
                        onClick={() => handleNavigate('shop', { filter: 'new' })}
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-800 hover:text-[#CF7644] transition-colors"
                      >
                        <span>Tout voir ({products.filter((p) => p.is_new).length})</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {newArrivals.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleSelectProduct}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Moroccan Craftsmanship & Brand Identity Banner */}
                  <section className="bg-[#FAF4EF] py-16 sm:py-20 border-y border-[#F1D7C5]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
                        <div className="md:col-span-6 space-y-6">
                          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#CF7644]">
                            L'Esprit DoArt Store
                          </span>
                          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#181818] leading-tight">
                            Une Vision Épurée de la Mode Marocaine.
                          </h2>
                          <p className="text-sm text-gray-600 leading-relaxed font-light">
                            DoArt Store redéfinit les codes du vêtement contemporain à travers des silhouettes minimalistes, des tissus soigneusement sélectionnés et un confort sans compromis.
                          </p>
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs font-medium text-gray-800">
                              <span className="w-2 h-2 rounded-full bg-[#CF7644]" />
                              <span>Matières nobles : Coton lourd, lin pur, sabra fluide et gabardine.</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-gray-800">
                              <span className="w-2 h-2 rounded-full bg-[#CF7644]" />
                              <span>Coupes pensées pour le quotidien moderne au Maroc.</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-medium text-gray-800">
                              <span className="w-2 h-2 rounded-full bg-[#CF7644]" />
                              <span>Paiement à la livraison et essayage possible avec le livreur.</span>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-6 grid grid-cols-2 gap-4">
                          <div className="aspect-3/4 rounded-xs overflow-hidden shadow-lg">
                            <img
                              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80"
                              alt="Moroccan modern tailoring"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="aspect-3/4 rounded-xs overflow-hidden shadow-lg mt-8">
                            <img
                              src="https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80"
                              alt="Fabric detail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Best Sellers Section */}
                  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4 text-center sm:text-left">
                      <div>
                        <div className="inline-flex items-center gap-1.5 text-[#CF7644] text-[10px] font-bold uppercase tracking-[0.25em] mb-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Les Incontournables</span>
                        </div>
                        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#181818]">
                          Nos Best-Sellers
                        </h2>
                      </div>
                      <button
                        onClick={() => handleNavigate('shop', { filter: 'featured' })}
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-800 hover:text-[#CF7644] transition-colors"
                      >
                        <span>Découvrir la sélection</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {featuredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleSelectProduct}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Instagram Community Section */}
                  <InstagramSection />
                </div>
              )}

              {/* SHOP PAGE */}
              {currentView === 'shop' && (
                <ShopPage
                  products={products}
                  categories={categories}
                  initialCategorySlug={shopCategorySlug}
                  initialFilter={shopFilter}
                  onSelectProduct={handleSelectProduct}
                  onClearInitialFilters={() => {
                    setShopCategorySlug(undefined);
                    setShopFilter(undefined);
                  }}
                />
              )}

              {/* PRODUCT DETAILS PAGE */}
              {currentView === 'product-detail' && selectedProduct && (
                <ProductDetailPage
                  product={selectedProduct}
                  allProducts={products}
                  onBack={() => handleNavigate('shop')}
                  onSelectProduct={handleSelectProduct}
                />
              )}
            </main>

            <Footer
              onNavigate={handleNavigate}
              whatsappNumber={settings?.whatsapp_number}
            />
          </>
        )}

        {/* Global Slide-over Cart Drawer */}
        <CartDrawer onNavigateToShop={() => handleNavigate('shop')} />

        {/* Global WhatsApp COD Checkout Modal */}
        <WhatsAppCheckoutModal />

        {/* Global Search Modal */}
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          products={products}
          onSelectProduct={handleSelectProduct}
        />
      </div>
    </CartProvider>
  );
}
