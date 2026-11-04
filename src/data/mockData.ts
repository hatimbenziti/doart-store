import { Category, Product, StoreSettings, InstagramPost } from '../types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'e0000001-0000-4000-8000-000000000001',
    name: 'Ensembles & Tracksuits',
    slug: 'ensembles-tracksuits',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'e0000001-0000-4000-8000-000000000002',
    name: 'Kimonos & Djellabas',
    slug: 'kimonos-djellabas',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'e0000001-0000-4000-8000-000000000003',
    name: 'Tops & Chemises',
    slug: 'tops-chemises',
    image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'e0000001-0000-4000-8000-000000000004',
    name: 'Pantalons & Bas',
    slug: 'pantalons-bas',
    image_url: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80',
    created_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'f0000001-0000-4000-8000-000000000001',
    name: 'Classic Tracksuit DoArt Signature',
    slug: 'classic-tracksuit-doart-signature',
    description:
      'Notre ensemble signature taillé dans un coton lourd de 420 GSM. Coupe décontractée contemporaine avec broderie discrète ton-sur-ton. Conçu à Casablanca avec une attention absolue aux finitions.',
    price: 650,
    discount_price: 520,
    category_id: 'e0000001-0000-4000-8000-000000000001',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: true,
    is_new: true,
    variants: [
      { id: 'd0000001-0001-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'S', color_name: 'Noir', color_hex: '#111111', stock_quantity: 6, sku: 'DOA-TS-BLK-S' },
      { id: 'd0000001-0001-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'M', color_name: 'Noir', color_hex: '#111111', stock_quantity: 12, sku: 'DOA-TS-BLK-M' },
      { id: 'd0000001-0001-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'L', color_name: 'Noir', color_hex: '#111111', stock_quantity: 8, sku: 'DOA-TS-BLK-L' },
      { id: 'd0000001-0001-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'XL', color_name: 'Noir', color_hex: '#111111', stock_quantity: 4, sku: 'DOA-TS-BLK-XL' },
      { id: 'd0000001-0001-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'S', color_name: 'Beige Sable', color_hex: '#EAD8C7', stock_quantity: 5, sku: 'DOA-TS-BEI-S' },
      { id: 'd0000001-0001-4000-8000-000000000006', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'M', color_name: 'Beige Sable', color_hex: '#EAD8C7', stock_quantity: 9, sku: 'DOA-TS-BEI-M' },
      { id: 'd0000001-0001-4000-8000-000000000007', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'L', color_name: 'Beige Sable', color_hex: '#EAD8C7', stock_quantity: 7, sku: 'DOA-TS-BEI-L' },
      { id: 'd0000001-0001-4000-8000-000000000008', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'M', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 8, sku: 'DOA-TS-TER-M' },
      { id: 'd0000001-0001-4000-8000-000000000009', product_id: 'f0000001-0000-4000-8000-000000000001', size: 'L', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 5, sku: 'DOA-TS-TER-L' },
    ],
  },
  {
    id: 'f0000001-0000-4000-8000-000000000002',
    name: 'Djellaba Contemporaine en Lin Pur',
    slug: 'djellaba-contemporaine-lin-pur',
    description:
      'Une réinterprétation moderne et minimaliste de la djellaba marocaine traditionnelle. Confectionnée en pur lin lavé premium, avec col sans couture et randa revisitée discrète.',
    price: 790,
    discount_price: null,
    category_id: 'e0000001-0000-4000-8000-000000000002',
    images: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: true,
    is_new: true,
    variants: [
      { id: 'd0000001-0002-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'S', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 4, sku: 'DOA-DJ-TER-S' },
      { id: 'd0000001-0002-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'M', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 7, sku: 'DOA-DJ-TER-M' },
      { id: 'd0000001-0002-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'L', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 6, sku: 'DOA-DJ-TER-L' },
      { id: 'd0000001-0002-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'M', color_name: 'Blanc Écru', color_hex: '#F7F4EE', stock_quantity: 8, sku: 'DOA-DJ-WHT-M' },
      { id: 'd0000001-0002-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'L', color_name: 'Blanc Écru', color_hex: '#F7F4EE', stock_quantity: 5, sku: 'DOA-DJ-WHT-L' },
      { id: 'd0000001-0002-4000-8000-000000000006', product_id: 'f0000001-0000-4000-8000-000000000002', size: 'M', color_name: 'Noir Ébène', color_hex: '#151515', stock_quantity: 10, sku: 'DOA-DJ-BLK-M' },
    ],
  },
  {
    id: 'f0000001-0000-4000-8000-000000000003',
    name: 'Ensemble Kimono & Pantalon Soie Végétale',
    slug: 'ensemble-kimono-pantalon-soie-vegetale',
    description:
      'Légèreté absolue et tombé fluide d’exception en soie végétale naturelle (Sabra). Veste kimono ceinturée assortie d’un pantalon fluide à pinces.',
    price: 890,
    discount_price: 750,
    category_id: 'e0000001-0000-4000-8000-000000000002',
    images: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: true,
    is_new: false,
    variants: [
      { id: 'd0000001-0003-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000003', size: 'S', color_name: 'Beige Doux', color_hex: '#F1D7C5', stock_quantity: 5, sku: 'DOA-KM-BEI-S' },
      { id: 'd0000001-0003-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000003', size: 'M', color_name: 'Beige Doux', color_hex: '#F1D7C5', stock_quantity: 8, sku: 'DOA-KM-BEI-M' },
      { id: 'd0000001-0003-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000003', size: 'L', color_name: 'Beige Doux', color_hex: '#F1D7C5', stock_quantity: 3, sku: 'DOA-KM-BEI-L' },
      { id: 'd0000001-0003-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000003', size: 'M', color_name: 'Noir Profond', color_hex: '#111111', stock_quantity: 6, sku: 'DOA-KM-BLK-M' },
      { id: 'd0000001-0003-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000003', size: 'L', color_name: 'Noir Profond', color_hex: '#111111', stock_quantity: 4, sku: 'DOA-KM-BLK-L' },
    ],
  },
  {
    id: 'f0000001-0000-4000-8000-000000000004',
    name: 'Chemise Col Mao Coton Peigné',
    slug: 'chemise-col-mao-coton-peigne',
    description:
      'Une chemise intemporelle à col officier épuré. Popeline de coton égyptien 100% biologique au toucher satiné. Boutonnage caché sous patte pour un look minimaliste absolu.',
    price: 420,
    discount_price: null,
    category_id: 'e0000001-0000-4000-8000-000000000003',
    images: [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: false,
    is_new: true,
    variants: [
      { id: 'd0000001-0004-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'S', color_name: 'Blanc Pure', color_hex: '#FFFFFF', stock_quantity: 8, sku: 'DOA-CH-WHT-S' },
      { id: 'd0000001-0004-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'M', color_name: 'Blanc Pure', color_hex: '#FFFFFF', stock_quantity: 15, sku: 'DOA-CH-WHT-M' },
      { id: 'd0000001-0004-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'L', color_name: 'Blanc Pure', color_hex: '#FFFFFF', stock_quantity: 10, sku: 'DOA-CH-WHT-L' },
      { id: 'd0000001-0004-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'XL', color_name: 'Blanc Pure', color_hex: '#FFFFFF', stock_quantity: 5, sku: 'DOA-CH-WHT-XL' },
      { id: 'd0000001-0004-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'M', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 6, sku: 'DOA-CH-TER-M' },
      { id: 'd0000001-0004-4000-8000-000000000006', product_id: 'f0000001-0000-4000-8000-000000000004', size: 'L', color_name: 'Terracotta', color_hex: '#CF7644', stock_quantity: 6, sku: 'DOA-CH-TER-L' },
    ],
  },
  {
    id: 'f0000001-0000-4000-8000-000000000005',
    name: 'Pantalon Tailleur Fluide Plissé',
    slug: 'pantalon-tailleur-fluide-plisse',
    description:
      'Pantalon élégant à taille haute ceinturée et double pli d’aisance. Tissu fluide infroissable idéal pour le climat marocain.',
    price: 490,
    discount_price: 390,
    category_id: 'e0000001-0000-4000-8000-000000000004',
    images: [
      'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: true,
    is_new: false,
    variants: [
      { id: 'd0000001-0005-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000005', size: 'S', color_name: 'Noir', color_hex: '#181818', stock_quantity: 7, sku: 'DOA-PT-BLK-S' },
      { id: 'd0000001-0005-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000005', size: 'M', color_name: 'Noir', color_hex: '#181818', stock_quantity: 11, sku: 'DOA-PT-BLK-M' },
      { id: 'd0000001-0005-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000005', size: 'L', color_name: 'Noir', color_hex: '#181818', stock_quantity: 8, sku: 'DOA-PT-BLK-L' },
      { id: 'd0000001-0005-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000005', size: 'M', color_name: 'Beige Moka', color_hex: '#D7C4B7', stock_quantity: 6, sku: 'DOA-PT-BEI-M' },
      { id: 'd0000001-0005-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000005', size: 'L', color_name: 'Beige Moka', color_hex: '#D7C4B7', stock_quantity: 4, sku: 'DOA-PT-BEI-L' },
    ],
  },
  {
    id: 'f0000001-0000-4000-8000-000000000006',
    name: 'Veste Saharienne Terracotta DoArt',
    slug: 'veste-saharienne-terracotta-doart',
    description:
      'Veste d’inspiration saharienne coupée dans une gabardine de coton robuste. Quatre poches soufflet plaquées, cordon de serrage intérieur et boutons en corne naturelle.',
    price: 850,
    discount_price: null,
    category_id: 'e0000001-0000-4000-8000-000000000001',
    images: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
    ],
    is_active: true,
    is_featured: true,
    is_new: true,
    variants: [
      { id: 'd0000001-0006-4000-8000-000000000001', product_id: 'f0000001-0000-4000-8000-000000000006', size: 'S', color_name: 'Terracotta Signature', color_hex: '#CF7644', stock_quantity: 3, sku: 'DOA-VS-TER-S' },
      { id: 'd0000001-0006-4000-8000-000000000002', product_id: 'f0000001-0000-4000-8000-000000000006', size: 'M', color_name: 'Terracotta Signature', color_hex: '#CF7644', stock_quantity: 6, sku: 'DOA-VS-TER-M' },
      { id: 'd0000001-0006-4000-8000-000000000003', product_id: 'f0000001-0000-4000-8000-000000000006', size: 'L', color_name: 'Terracotta Signature', color_hex: '#CF7644', stock_quantity: 5, sku: 'DOA-VS-TER-L' },
      { id: 'd0000001-0006-4000-8000-000000000004', product_id: 'f0000001-0000-4000-8000-000000000006', size: 'M', color_name: 'Kaki Désert', color_hex: '#7A7A64', stock_quantity: 4, sku: 'DOA-VS-KHK-M' },
      { id: 'd0000001-0006-4000-8000-000000000005', product_id: 'f0000001-0000-4000-8000-000000000006', size: 'L', color_name: 'Kaki Désert', color_hex: '#7A7A64', stock_quantity: 4, sku: 'DOA-VS-KHK-L' },
    ],
  },
];

export const INITIAL_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: 'post-1',
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#DoArtMarrakech',
  },
  {
    id: 'post-2',
    image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#MinimalistMorocco',
  },
  {
    id: 'post-3',
    image_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#DoArtStyle',
  },
  {
    id: 'post-4',
    image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#SabraVibes',
  },
  {
    id: 'post-5',
    image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#TracksuitLife',
  },
  {
    id: 'post-6',
    image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80',
    post_url: 'https://instagram.com/doartstore',
    tag: '#DoArtStore',
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  id: 'c0000001-0000-4000-8000-000000000001',
  store_name: 'DoArt Store',
  whatsapp_number: '212705176222', // Moroccan official WhatsApp: 0705176222
  instagram_url: 'https://instagram.com/doartstore',
  currency: 'MAD',
  delivery_fee: 35,
  free_delivery_threshold: 600,
  updated_at: '2026-01-01T00:00:00Z',
  // Hero Visual Showcase Settings
  hero_title: 'L’Élégance Minimaliste Inspirée par le Maroc.',
  hero_subtitle: 'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.',
  hero_badge: 'Nouvelle Collection 2026 • DoArt Studio',
  hero_image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
  hero_tag_badge: 'Marrakech Atelier',
  hero_card_tag: 'Best-Seller',
  hero_card_title: 'Tracksuit Signature DoArt',
  hero_card_price: '520 DH',
  hero_card_original_price: '650 DH',
  hero_card_image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80',
  hero_featured_product_id: 'f0000001-0000-4000-8000-000000000001',
  instagram_posts: INITIAL_INSTAGRAM_POSTS,
};

export const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Tanger',
  'Fès',
  'Agadir',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Mohammédia',
  'El Jadida',
  'Essaouira',
  'Nador',
  'Safi',
  'Béni Mellal',
  'Taza',
  'Khémisset',
  'Dakhla',
  'Laâyoune',
  'Autre ville au Maroc',
];
