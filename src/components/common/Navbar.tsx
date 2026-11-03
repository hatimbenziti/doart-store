import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, X, ShieldCheck, PhoneCall, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onOpenSearch }) => {
  const { itemCount, openCart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Accueil', view: 'home' },
    { label: 'Boutique', view: 'shop' },
    { label: 'Nouveautés', view: 'shop', params: { filter: 'new' } },
    { label: 'Best-Sellers', view: 'shop', params: { filter: 'featured' } },
  ];

  const handleLinkClick = (view: string, params?: Record<string, string>) => {
    onNavigate(view, params);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#F1D7C5]/40 transition-all">
      {/* Top Announcement Bar */}
      <div className="bg-[#181818] text-[#F1D7C5] text-[11px] md:text-xs py-2 px-4 text-center tracking-wider uppercase font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#CF7644]" />
        <span>Livraison Partout au Maroc 🇲🇦 • Paiement à la Livraison (COD) • Confirmation WhatsApp Rapide</span>
        <Sparkles className="w-3.5 h-3.5 text-[#CF7644] hidden sm:inline" />
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Mobile Menu Trigger & Desktop Nav */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -ml-2 text-[#181818] hover:text-[#CF7644] transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <nav className="hidden md:flex items-center space-x-8 text-sm uppercase tracking-widest font-medium">
            {navLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => handleLinkClick(link.view, link.params)}
                className={`transition-colors hover:text-[#CF7644] relative py-1 ${
                  currentView === link.view && (!link.params || link.params.filter === undefined)
                    ? 'text-[#CF7644] font-semibold'
                    : 'text-[#181818]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Center: Brand Logo */}
        <div
          className="flex items-center justify-center cursor-pointer select-none py-1 group"
          onClick={() => handleLinkClick('home')}
          title="Accueil DoArt Store"
        >
          <img
            src="/images/banners/Dologo-01.png"
            alt="DoArt Studio Store"
            className="h-10 sm:h-12 md:h-13 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Right: Actions (Search, Admin, Cart) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={onOpenSearch}
            className="p-2 text-[#181818] hover:text-[#CF7644] transition-colors rounded-full hover:bg-[#FAF4EF]"
            aria-label="Rechercher"
            title="Rechercher un vêtement"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Admin link button */}
          <button
            onClick={() => handleLinkClick('admin')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all ${
              currentView === 'admin'
                ? 'bg-[#CF7644] text-white border-[#CF7644]'
                : 'border-[#F1D7C5] text-[#555555] hover:border-[#CF7644] hover:text-[#CF7644] bg-[#FAF4EF]/50'
            }`}
            title="Espace Administration"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-medium">Admin</span>
          </button>

          {/* Cart Trigger */}
          <button
            onClick={openCart}
            className="p-2 relative text-[#181818] hover:text-[#CF7644] transition-colors rounded-full hover:bg-[#FAF4EF]"
            aria-label="Panier d'achats"
            title="Mon Panier"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#CF7644] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#F1D7C5] px-6 py-6 space-y-4 shadow-xl">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={() => handleLinkClick(link.view, link.params)}
                className="text-left text-base font-medium uppercase tracking-wider py-2 text-[#181818] hover:text-[#CF7644] border-b border-gray-100"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleLinkClick('admin')}
              className="flex items-center gap-2 text-left text-sm font-medium uppercase tracking-wider py-2 text-[#CF7644]"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Espace Administration</span>
            </button>
          </div>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
            <p className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-[#CF7644]" />
              Support WhatsApp disponible 7j/7
            </p>
            <p className="text-[11px] text-gray-400">Paiement en espèces à la livraison partout au Maroc.</p>
          </div>
        </div>
      )}
    </header>
  );
};
