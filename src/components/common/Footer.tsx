import React from 'react';
import { ShieldCheck, Truck, MessageCircle, Heart, Phone, MapPin, Mail, Instagram } from 'lucide-react';
import { normalizeWhatsAppNumber, formatMoroccanDisplayPhone } from '../../utils/whatsapp';

interface FooterProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  whatsappNumber?: string;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, whatsappNumber = '212705176222' }) => {
  const cleanNumber = normalizeWhatsAppNumber(whatsappNumber);
  const displayPhone = formatMoroccanDisplayPhone(cleanNumber);
  return (
    <footer className="bg-[#181818] text-[#F1D7C5] pt-16 pb-12 border-t border-[#333333]">
      {/* Guarantees Ribbon */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 border-b border-[#282828]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#CF7644]/20 border border-[#CF7644] flex items-center justify-center text-[#CF7644] shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wider">
                Livraison Partout au Maroc
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Expédition rapide en 24h à 48h directement à votre porte.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#CF7644]/20 border border-[#CF7644] flex items-center justify-center text-[#CF7644] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wider">
                Paiement à la Livraison (COD)
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Réglez en toute sécurité en espèces lors de la remise du colis.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#CF7644]/20 border border-[#CF7644] flex items-center justify-center text-[#CF7644] shrink-0">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-white text-sm font-bold uppercase tracking-wider">
                Confirmation WhatsApp
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Processus fluide et transparent avec notre équipe locale.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Brand identity */}
        <div className="md:col-span-4 space-y-4">
          <div>
            <h3 className="font-serif text-2xl tracking-[0.25em] font-semibold text-white">
              DOART STORE
            </h3>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#CF7644] font-medium">
              Casablanca • Maroc
            </p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed max-w-sm">
            Maison de prêt-à-porter contemporain et minimaliste. Nous concevons des pièces haut de gamme taillées dans des étoffes sélectionnées avec exigence, pour sublimer votre allure avec élégance et simplicité.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <a
              href="https://instagram.com/doartstore"
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#CF7644] flex items-center justify-center text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/${cleanNumber}`}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-[#242424] hover:bg-[#25D366] flex items-center justify-center text-white transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="md:col-span-2 space-y-3">
          <h4 className="text-white text-xs font-bold uppercase tracking-widest">
            Boutique
          </h4>
          <ul className="space-y-2 text-xs text-gray-400">
            <li>
              <button
                onClick={() => onNavigate('shop')}
                className="hover:text-[#CF7644] transition-colors"
              >
                Tous les vêtements
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('shop', { filter: 'new' })}
                className="hover:text-[#CF7644] transition-colors"
              >
                Nouveautés 2026
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('shop', { filter: 'featured' })}
                className="hover:text-[#CF7644] transition-colors"
              >
                Best-Sellers
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('shop', { category: 'ensembles-tracksuits' })}
                className="hover:text-[#CF7644] transition-colors"
              >
                Ensembles & Tracksuits
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('shop', { category: 'kimonos-djellabas' })}
                className="hover:text-[#CF7644] transition-colors"
              >
                Kimonos & Djellabas
              </button>
            </li>
          </ul>
        </div>

        {/* Client Care & COD */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-white text-xs font-bold uppercase tracking-widest">
            Service Client & COD
          </h4>
          <ul className="space-y-2 text-xs text-gray-400">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CF7644]" />
              <span>Paiement en espèces à la livraison</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CF7644]" />
              <span>Vérification du colis avant paiement</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CF7644]" />
              <span>Échanges de taille disponibles (48h)</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CF7644]" />
              <span>Livraison offerte dès 600 DH d'achats</span>
            </li>
          </ul>
        </div>

        {/* Contact Morocco */}
        <div className="md:col-span-3 space-y-3">
          <h4 className="text-white text-xs font-bold uppercase tracking-widest">
            Atelier Casablanca
          </h4>
          <div className="space-y-2.5 text-xs text-gray-400">
            <p className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#CF7644] shrink-0 mt-0.5" />
              <span>Boulevard d'Anfa, Maarif, Casablanca, Maroc</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#CF7644] shrink-0" />
              <a
                href={`https://wa.me/${cleanNumber}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
                title="Contacter sur WhatsApp"
              >
                {displayPhone.international} <span className="text-gray-400">({displayPhone.local})</span>
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#CF7644] shrink-0" />
              <span>contact@doartstore.ma</span>
            </p>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-[#252525] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <p>© {new Date().getFullYear()} DoArt Store. Tous droits réservés.</p>
        <p className="flex items-center gap-1.5">
          <span>Créé avec élégance au Maroc</span>
          <Heart className="w-3.5 h-3.5 text-[#CF7644] fill-[#CF7644]" />
          <span>• Casablanca</span>
        </p>
      </div>
    </footer>
  );
};
