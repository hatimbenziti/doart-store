import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Category } from '../../types';

interface FeaturedCollectionsProps {
  categories: Category[];
  onSelectCategory: (categorySlug: string) => void;
}

export const FeaturedCollections: React.FC<FeaturedCollectionsProps> = ({
  categories,
  onSelectCategory,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#CF7644]">
          Lignes & Silhouettes
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#181818] font-bold">
          Nos Collections Signatures
        </h2>
        <div className="w-12 h-0.5 bg-[#CF7644] mx-auto mt-3" />
        <p className="text-gray-500 text-sm font-light pt-2">
          Chaque pièce est dessinée pour offrir une allure contemporaine et un confort parfait au quotidien.
        </p>
      </div>

      {/* Grid of collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className="group relative aspect-4/5 overflow-hidden rounded-xs cursor-pointer shadow-md"
          >
            {/* Background Image */}
            <img
              src={cat.image_url}
              alt={cat.name}
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent transition-opacity group-hover:from-black/90" />

            {/* Content Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-6 text-white space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#F1D7C5] font-semibold">
                Collection
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                {cat.name}
              </h3>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white group-hover:text-[#F1D7C5] transition-colors pt-1">
                <span>Explorer</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
