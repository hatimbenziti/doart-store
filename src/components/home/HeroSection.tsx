import React from 'react';
import { ArrowRight, ShieldCheck, Truck, MessageCircle } from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { normalizeWhatsAppNumber } from '../../utils/whatsapp';

interface HeroSectionProps {
  settings?: StoreSettings | null;
  products?: Product[];
  onShopClick: () => void;
  onExploreCollection: (categorySlug: string) => void;
  onSelectProduct?: (product: Product) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  settings,
  products = [],
  onShopClick,
  onSelectProduct,
}) => {
  // Resolve Hero Configuration from Supabase/Store Settings with elegant fallbacks
  const heroBadge = settings?.hero_badge || 'Nouvelle Collection 2026 • DoArt Studio';
  const heroTitle = settings?.hero_title || 'L’Élégance Minimaliste Inspirée par le Maroc.';
  const heroSubtitle =
    settings?.hero_subtitle ||
    'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.';

  const heroImage =
    settings?.hero_image ||
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85';
  const heroTagBadge = settings?.hero_tag_badge || 'Casablanca Atelier';

  const cardTag = settings?.hero_card_tag || 'Best-Seller';
  const cardTitle = settings?.hero_card_title || 'Tracksuit Signature DoArt';
  const cardPrice = settings?.hero_card_price || '520 DH';
  const cardOriginalPrice = settings?.hero_card_original_price || '650 DH';
  const cardImage =
    settings?.hero_card_image ||
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80';

  // Find linked product if available
  const linkedProduct = products.find(
    (p) =>
      p.id === settings?.hero_featured_product_id ||
      p.name.toLowerCase().includes(cardTitle.toLowerCase()) ||
      p.slug === 'classic-tracksuit-doart-signature'
  );

  const handleFloatingCardClick = () => {
    if (linkedProduct && onSelectProduct) {
      onSelectProduct(linkedProduct);
    } else {
      onShopClick();
    }
  };

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
                {heroBadge}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#181818] font-bold leading-[1.15] tracking-tight">
                {heroTitle}
              </h1>
              <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
                {heroSubtitle}
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

              <a
                href={`https://wa.me/${normalizeWhatsAppNumber(settings?.whatsapp_number || '212661000000')}?text=${encodeURIComponent('Bonjour DoArt Store ! 👋 Je souhaite avoir plus d’informations sur vos collections et commander.')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#181818] border border-[#F1D7C5] px-7 py-4 text-sm font-medium uppercase tracking-wider transition-colors shadow-2xs"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>Commander par WhatsApp</span>
              </a>
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

          {/* Right Fashion Visual Showcase (Fully dynamic and connected to Supabase) */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Main Image */}
              <div className="aspect-3/4 overflow-hidden rounded-xs shadow-2xl bg-gray-200 border-4 border-white">
                <img
                  src={heroImage}
                  alt="DoArt Store Fashion Model"
                  className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Floating Accent Card (Clickable to view product) */}
              <div
                onClick={handleFloatingCardClick}
                className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md p-4 rounded-xs shadow-xl border border-[#F1D7C5] max-w-xs hidden sm:block cursor-pointer hover:shadow-2xl hover:scale-102 transition-all duration-300 z-10"
                title="Découvrir cet article"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-gray-100 overflow-hidden shrink-0 rounded-2xs">
                    <img
                      src={cardImage}
                      alt={cardTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#CF7644] uppercase tracking-wider block">
                      {cardTag}
                    </span>
                    <p className="text-xs font-medium text-black line-clamp-1">{cardTitle}</p>
                    <p className="text-xs font-bold text-[#181818]">
                      {cardPrice}{' '}
                      {cardOriginalPrice && (
                        <span className="line-through text-gray-400 font-normal text-[11px]">
                          {cardOriginalPrice}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Badge (e.g. "Casablanca Atelier") */}
              {heroTagBadge && (
                <div className="absolute top-6 -right-4 bg-[#CF7644] text-white px-4 py-2 shadow-lg rounded-xs font-serif italic text-sm select-none">
                  {heroTagBadge}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
