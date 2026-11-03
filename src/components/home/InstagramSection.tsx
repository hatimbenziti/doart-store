import React from 'react';
import { Instagram, ArrowUpRight } from 'lucide-react';

export const InstagramSection: React.FC = () => {
  const instaPosts = [
    {
      img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      tag: '#DoArtCasablanca',
    },
    {
      img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
      tag: '#MinimalistMorocco',
    },
    {
      img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80',
      tag: '#DoArtStyle',
    },
    {
      img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80',
      tag: '#SabraVibes',
    },
    {
      img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
      tag: '#TracksuitLife',
    },
    {
      img: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80',
      tag: '#DoArtStore',
    },
  ];

  return (
    <section className="bg-[#FAF4EF]/50 py-16 sm:py-20 border-t border-[#F1D7C5]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-2 text-[#CF7644] text-xs font-bold uppercase tracking-widest mb-1">
              <Instagram className="w-4 h-4" />
              <span>Rejoignez la communauté</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#181818]">
              @doartstore sur Instagram
            </h2>
          </div>
          <a
            href="https://instagram.com/doartstore"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-[#CF7644] text-[#CF7644] hover:bg-[#CF7644] hover:text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs shadow-xs"
          >
            <span>Suivre sur Instagram</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 6-grid photos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {instaPosts.map((post, idx) => (
            <div
              key={idx}
              className="group relative aspect-square overflow-hidden bg-gray-200 rounded-xs shadow-xs"
            >
              <img
                src={post.img}
                alt={`Instagram look ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-white text-center">
                <Instagram className="w-6 h-6 mb-1 text-[#F1D7C5]" />
                <span className="text-[10px] font-mono tracking-wider">{post.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
