import React from 'react';
import { ArrowRight, ShieldCheck, Truck, MessageCircle } from 'lucide-react';

interface HeroSectionProps {
  onShopClick: () => void;
  onExploreCollection: (categorySlug: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onShopClick }) => {
  return (
    <section className="relative overflow-hidden bg-[#FAF4EF] border-b border-[#F1D7C5]">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#F1D7C5]/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#CF7644]/10 blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#F1D7C5] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#CF7644] animate-ping" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#CF7644]">
                Nouvelle Collection 2026 • DoArt Studio
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#181818] font-bold leading-[1.15] tracking-tight">
                L’Élégance <span className="italic font-normal text-[#CF7644]">Minimaliste</span> Inspirée par le Maroc.
              </h1>
              <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                Des coupes contemporaines, des matières nobles et une fabrication soignée.
                Découvrez la garde-robe DoArt Store avec{' '}
                <strong className="text-black font-medium">paiement à la livraison</strong> partout au Maroc.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onShopClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-[#CF7644] hover:bg-[#b66133] text-white px-8 py-4 text-sm font-semibold uppercase tracking-widest transition-all shadow-md hover:shadow-lg"
              >
                <span>Découvrir la Boutique</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onShopClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#181818] border border-[#F1D7C5] px-7 py-4 text-sm font-medium uppercase tracking-wider transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#CF7644]" />
                <span>Commander par WhatsApp</span>
              </button>
            </div>

            {/* Guarantees Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-[#F1D7C5]/60">
              <div className="flex items-center gap-2.5 text-left">
                <Truck className="w-5 h-5 text-[#CF7644] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#181818]">Partout au Maroc</p>
                  <p className="text-[11px] text-gray-500">Expédition 24h - 48h</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-left">
                <ShieldCheck className="w-5 h-5 text-[#CF7644] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#181818]">Cash on Delivery</p>
                  <p className="text-[11px] text-gray-500">Paiement à la réception</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2.5 text-left">
                <MessageCircle className="w-5 h-5 text-[#CF7644] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#181818]">Assistance WhatsApp</p>
                  <p className="text-[11px] text-gray-500">Réponse immédiate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Fashion Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Image */}
              <div className="aspect-3/4 overflow-hidden rounded-xs shadow-2xl bg-gray-200 border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85"
                  alt="DoArt Store Fashion Model"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Floating Accent Card */}
              <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 rounded-xs shadow-xl border border-[#F1D7C5] max-w-xs hidden sm:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80"
                      alt="Classic Tracksuit preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#CF7644] uppercase tracking-wider block">
                      Best-Seller
                    </span>
                    <p className="text-xs font-medium text-black line-clamp-1">Tracksuit Signature DoArt</p>
                    <p className="text-xs font-bold text-[#181818]">520 DH <span className="line-through text-gray-400 font-normal text-[11px]">650 DH</span></p>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute top-6 -right-4 bg-[#CF7644] text-white px-4 py-2 shadow-lg rounded-xs font-serif italic text-sm">
                Casablanca Atelier
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
