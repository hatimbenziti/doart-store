import React, { useState, useEffect } from 'react';
import { Instagram, ArrowUpRight, ExternalLink } from 'lucide-react';
import { InstagramPost } from '../../types';
import { getInstagramPosts } from '../../services/storeService';
import { INITIAL_INSTAGRAM_POSTS } from '../../data/mockData';

interface InstagramSectionProps {
  posts?: InstagramPost[];
  instagramUrl?: string;
}

export const InstagramSection: React.FC<InstagramSectionProps> = ({
  posts: propPosts,
  instagramUrl = 'https://instagram.com/doartstore',
}) => {
  const [posts, setPosts] = useState<InstagramPost[]>(() => {
    if (propPosts && propPosts.length > 0) return propPosts;
    return INITIAL_INSTAGRAM_POSTS;
  });

  useEffect(() => {
    if (propPosts && propPosts.length > 0) {
      setPosts(propPosts);
      return;
    }
    const load = async () => {
      const data = await getInstagramPosts();
      if (data && data.length > 0) {
        setPosts(data);
      }
    };
    load();

    const handleUpdate = () => {
      load();
    };
    window.addEventListener('doart_instagram_posts_changed', handleUpdate);
    return () => {
      window.removeEventListener('doart_instagram_posts_changed', handleUpdate);
    };
  }, [propPosts]);

  // Extract Instagram username from URL (e.g. "doartstore")
  const username = instagramUrl.replace(/\/+$/, '').split('/').pop() || 'doartstore';

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
              @{username} sur Instagram
            </h2>
          </div>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border border-[#CF7644] text-[#CF7644] hover:bg-[#CF7644] hover:text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-xs shadow-xs"
          >
            <span>Suivre sur Instagram</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Responsive Grid Photos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {posts.map((post, idx) => {
            const targetUrl = post.post_url && post.post_url.trim() ? post.post_url.trim() : instagramUrl;

            return (
              <a
                key={post.id || idx}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Voir le post Instagram ${post.tag || ''}`}
                className="group relative aspect-square overflow-hidden bg-gray-200 rounded-xs shadow-xs block cursor-pointer"
              >
                <img
                  src={post.image_url}
                  alt={`Instagram look ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 text-white text-center">
                  <Instagram className="w-6 h-6 mb-1 text-[#F1D7C5]" />
                  {post.tag && (
                    <span className="text-[10px] font-mono tracking-wider max-w-full truncate px-1">
                      {post.tag}
                    </span>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-[#F1D7C5] font-semibold">
                    <span>Voir le post</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};
