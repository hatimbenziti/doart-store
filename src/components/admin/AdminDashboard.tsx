import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  Settings,
  Plus,
  Search,
  ExternalLink,
  LogOut,
  ArrowLeft,
  Database,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  Edit,
  Phone,
  MessageCircle,
  TrendingUp,
  Save,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Product,
  Category,
  Order,
  StoreSettings,
  OrderStatus,
  ProductVariant,
} from '../../types';
import {
  getProducts,
  getCategories,
  getOrders,
  getStoreSettings,
  saveProduct,
  deleteProduct,
  saveCategory,
  deleteCategory,
  updateOrderStatus,
  updateOrderCustomer,
  updateStoreSettings,
} from '../../services/storeService';
import { isSupabaseConnected } from '../../lib/supabase';
import { normalizeWhatsAppNumber } from '../../utils/whatsapp';
import { AdminProductModal } from './AdminProductModal';
import { AdminOrderDetailsModal } from './AdminOrderDetailsModal';
import { AdminSupabaseGuideModal } from './AdminSupabaseGuideModal';
import { AdminManualOrderModal } from './AdminManualOrderModal';

interface AdminDashboardProps {
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExit }) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'categories' | 'settings'>('overview');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({
    id: 'settings-1',
    store_name: 'DoArt Store',
    whatsapp_number: '212661000000',
    instagram_url: 'https://instagram.com/doartstore',
    currency: 'MAD',
    delivery_fee: 35,
    free_delivery_threshold: 600,
  });

  const [loading, setLoading] = useState(true);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState(false);

  // Order filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<string>('all');

  // Product filters
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState<string>('all');

  // Category form modal state
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Settings form
  const [settingsWhatsApp, setSettingsWhatsApp] = useState('');
  const [settingsStoreName, setSettingsStoreName] = useState('');
  const [settingsInstagram, setSettingsInstagram] = useState('');
  const [settingsDeliveryFee, setSettingsDeliveryFee] = useState(35);
  const [settingsThreshold, setSettingsThreshold] = useState(600);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Hero Showcase states (photo, badge, floating product card)
  const [heroImage, setHeroImage] = useState('');
  const [heroTagBadge, setHeroTagBadge] = useState('Casablanca Atelier');
  const [heroCardTag, setHeroCardTag] = useState('Best-Seller');
  const [heroCardTitle, setHeroCardTitle] = useState('Tracksuit Signature DoArt');
  const [heroCardPrice, setHeroCardPrice] = useState('520 DH');
  const [heroCardOriginalPrice, setHeroCardOriginalPrice] = useState('650 DH');
  const [heroCardImage, setHeroCardImage] = useState('');
  const [heroFeaturedProductId, setHeroFeaturedProductId] = useState('');
  const [heroTitle, setHeroTitle] = useState('L’Élégance Minimaliste Inspirée par le Maroc.');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBadge, setHeroBadge] = useState('Nouvelle Collection 2026 • DoArt Studio');

  const isConnected = isSupabaseConnected();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prods, cats, ords, sets] = await Promise.all([
        getProducts(true),
        getCategories(),
        getOrders(),
        getStoreSettings(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setSettings(sets);

      setSettingsWhatsApp(sets.whatsapp_number);
      setSettingsStoreName(sets.store_name);
      setSettingsInstagram(sets.instagram_url);
      setSettingsDeliveryFee(sets.delivery_fee);
      setSettingsThreshold(sets.free_delivery_threshold);

      // Hero settings
      setHeroImage(sets.hero_image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85');
      setHeroTagBadge(sets.hero_tag_badge || 'Casablanca Atelier');
      setHeroCardTag(sets.hero_card_tag || 'Best-Seller');
      setHeroCardTitle(sets.hero_card_title || 'Tracksuit Signature DoArt');
      setHeroCardPrice(sets.hero_card_price || '520 DH');
      setHeroCardOriginalPrice(sets.hero_card_original_price || '650 DH');
      setHeroCardImage(sets.hero_card_image || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=300&q=80');
      setHeroFeaturedProductId(sets.hero_featured_product_id || '');
      setHeroTitle(sets.hero_title || 'L’Élégance Minimaliste Inspirée par le Maroc.');
      setHeroSubtitle(sets.hero_subtitle || 'Des coupes contemporaines, des matières nobles et une fabrication soignée. Découvrez la garde-robe DoArt Store avec paiement à la livraison partout au Maroc.');
      setHeroBadge(sets.hero_badge || 'Nouvelle Collection 2026 • DoArt Studio');
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleConfigChange = () => {
      loadAllData();
    };
    window.addEventListener('doart_supabase_config_changed', handleConfigChange);
    return () => {
      window.removeEventListener('doart_supabase_config_changed', handleConfigChange);
    };
  }, []);

  // Overview stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === 'Pending WhatsApp Confirmation').length;
    const confirmedOrders = orders.filter((o) => o.status === 'Confirmed' || o.status === 'Preparing').length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
    const totalSales = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.total, 0);
    const activeProducts = products.filter((p) => p.is_active).length;

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      totalSales,
      activeProducts,
    };
  }, [orders, products]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchesRef = o.order_reference.toLowerCase().includes(q);
        const matchesName = o.customer_name.toLowerCase().includes(q);
        const matchesPhone = o.customer_phone.toLowerCase().includes(q);
        const matchesCity = o.city.toLowerCase().includes(q);
        if (!matchesRef && !matchesName && !matchesPhone && !matchesCity) return false;
      }

      // Status
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }

      // Date
      if (orderDateFilter === 'today') {
        const orderDate = new Date(o.created_at).toDateString();
        const today = new Date().toDateString();
        if (orderDate !== today) return false;
      }

      return true;
    });
  }, [orders, orderSearch, orderStatusFilter, orderDateFilter]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
      }
      if (productCatFilter !== 'all' && p.category_id !== productCatFilter) {
        return false;
      }
      return true;
    });
  }, [products, productSearch, productCatFilter]);

  // Product Actions
  const handleSaveProduct = async (
    productData: Partial<Product>,
    variantsData: Partial<ProductVariant>[]
  ) => {
    await saveProduct(productData, variantsData);
    await loadAllData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce vêtement ?')) {
      await deleteProduct(id);
      await loadAllData();
    }
  };

  const handleToggleProductActive = async (p: Product) => {
    await saveProduct({ ...p, is_active: !p.is_active }, p.variants || []);
    await loadAllData();
  };

  // Order Actions
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    await loadAllData();
  };

  const handleUpdateCustomer = async (
    orderId: string,
    customerData: { customer_name: string; customer_phone: string; city: string; address: string; notes?: string }
  ) => {
    await updateOrderCustomer(orderId, customerData);
    await loadAllData();
  };

  const handleManualOrderCreated = async (_newOrder: Order) => {
    await loadAllData();
  };

  // Category Actions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await saveCategory({
      name: newCatName.trim(),
      image_url: newCatImage.trim() || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    });
    setNewCatName('');
    setNewCatImage('');
    setIsAddingCat(false);
    await loadAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Supprimer cette catégorie ?')) {
      await deleteCategory(id);
      await loadAllData();
    }
  };

  // Auto-link a product to the Hero floating card
  const handleLinkProductToHeroCard = (prodId: string) => {
    setHeroFeaturedProductId(prodId);
    if (!prodId) return;
    const p = products.find((prod) => prod.id === prodId);
    if (p) {
      setHeroCardTitle(p.name);
      setHeroCardPrice(`${p.discount_price ?? p.price} DH`);
      setHeroCardOriginalPrice(p.discount_price ? `${p.price} DH` : '');
      if (p.images && p.images[0]) {
        setHeroCardImage(p.images[0]);
      }
    }
  };

  // Settings Save (WhatsApp, Delivery & Hero Showcase Visuals)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreSettings({
      whatsapp_number: settingsWhatsApp.trim(),
      store_name: settingsStoreName.trim(),
      instagram_url: settingsInstagram.trim(),
      delivery_fee: Number(settingsDeliveryFee),
      free_delivery_threshold: Number(settingsThreshold),
      // Hero showcase values
      hero_image: heroImage.trim(),
      hero_tag_badge: heroTagBadge.trim(),
      hero_card_tag: heroCardTag.trim(),
      hero_card_title: heroCardTitle.trim(),
      hero_card_price: heroCardPrice.trim(),
      hero_card_original_price: heroCardOriginalPrice.trim(),
      hero_card_image: heroCardImage.trim(),
      hero_featured_product_id: heroFeaturedProductId,
      hero_title: heroTitle.trim(),
      hero_subtitle: heroSubtitle.trim(),
      hero_badge: heroBadge.trim(),
    });
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
    await loadAllData();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('doart_admin_session');
    onExit();
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending WhatsApp Confirmation':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Preparing':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'Shipped':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-900 border-rose-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F7] text-[#181818]">
      {/* Admin Top Navigation Bar */}
      <header className="bg-white border-b border-[#F1D7C5] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onExit}
              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xs flex items-center gap-1.5 text-xs font-semibold"
              title="Retour à la boutique"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Boutique</span>
            </button>

            <div className="h-4 w-px bg-gray-200" />

            <div className="flex items-center gap-3">
              <img
                src="/images/banners/Dologo-01.png"
                alt="DoArt Store Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF4EF] text-[#CF7644] border border-[#F1D7C5]">
                Dashboard Admin
              </span>
            </div>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-3">
            {/* Supabase status pill */}
            <button
              onClick={() => setIsSupabaseGuideOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>{isConnected ? 'Supabase Connecté' : 'Config Supabase (Démo)'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 rounded-xs transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 overflow-x-auto text-xs font-bold uppercase tracking-wider">
          {[
            { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
            { id: 'orders', label: `Commandes (${orders.length})`, icon: ShoppingBag },
            { id: 'products', label: `Produits (${products.length})`, icon: Package },
            { id: 'categories', label: `Catégories (${categories.length})`, icon: FolderTree },
            { id: 'settings', label: 'Paramètres & WhatsApp', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#CF7644] text-[#CF7644]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-xs border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Total Commandes
                </span>
                <p className="font-serif text-2xl font-bold text-[#181818]">{stats.totalOrders}</p>
                <span className="text-[11px] text-gray-500">Toutes références</span>
              </div>

              <div className="bg-white p-5 rounded-xs border border-amber-200 bg-amber-50/20 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  En attente WhatsApp
                </span>
                <p className="font-serif text-2xl font-bold text-amber-800">{stats.pendingOrders}</p>
                <span className="text-[11px] text-amber-600 font-medium">À confirmer</span>
              </div>

              <div className="bg-white p-5 rounded-xs border border-blue-200 bg-blue-50/20 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Confirmées / Préparation
                </span>
                <p className="font-serif text-2xl font-bold text-blue-800">{stats.confirmedOrders}</p>
                <span className="text-[11px] text-blue-600 font-medium">En atelier</span>
              </div>

              <div className="bg-white p-5 rounded-xs border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Livrées (Encaissées)
                </span>
                <p className="font-serif text-2xl font-bold text-emerald-800">{stats.deliveredOrders}</p>
                <span className="text-[11px] text-emerald-600 font-medium">Succès</span>
              </div>

              <div className="bg-white p-5 rounded-xs border border-[#F1D7C5] bg-[#FAF4EF]/40 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#CF7644]">
                  Chiffre d’affaires
                </span>
                <p className="font-serif text-2xl font-bold text-[#CF7644]">{stats.totalSales} DH</p>
                <span className="text-[11px] text-gray-500">Paiements COD</span>
              </div>

              <div className="bg-white p-5 rounded-xs border border-gray-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Articles Actifs
                </span>
                <p className="font-serif text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
                <span className="text-[11px] text-gray-500">En vitrine</span>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="bg-white border border-gray-200 rounded-xs shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#181818]">
                    Commandes Récentes (Cash on Delivery)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Dernières commandes enregistrées via la confirmation WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs text-[#CF7644] hover:underline font-bold uppercase tracking-wider"
                >
                  Voir toutes les commandes →
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  Aucune commande enregistrée pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-[#FAF4EF]">
                      <tr>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Réf.</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Client</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Ville</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Total</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Statut</th>
                        <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/70">
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">
                            #{order.order_reference}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">{order.customer_name}</p>
                            <p className="text-[11px] text-gray-500">{order.customer_phone}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">{order.city}</td>
                          <td className="px-6 py-4 font-bold text-[#CF7644]">{order.total} DH</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                                order.status
                              )}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsOrderDetailsOpen(true);
                              }}
                              className="text-gray-600 hover:text-[#CF7644] font-semibold text-xs flex items-center gap-1 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Gérer</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ORDERS MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#181818]">
                  Gestion des Commandes WhatsApp
                </h2>
                <p className="text-xs text-gray-500">
                  Consultez, confirmez ou enregistrez les commandes convenues avec vos clients sur WhatsApp.
                </p>
              </div>
              <button
                onClick={() => setIsManualOrderOpen(true)}
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer commande WhatsApp</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 border border-gray-200 rounded-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Rechercher par référence, client, téléphone, ville..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="border border-gray-300 bg-white px-3 py-2 text-xs rounded-xs focus:outline-none focus:border-[#CF7644]"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="Pending WhatsApp Confirmation">En attente WhatsApp</option>
                  <option value="Confirmed">Confirmée</option>
                  <option value="Preparing">En préparation</option>
                  <option value="Shipped">Expédiée</option>
                  <option value="Delivered">Livrée</option>
                  <option value="Cancelled">Annulée</option>
                </select>

                <select
                  value={orderDateFilter}
                  onChange={(e) => setOrderDateFilter(e.target.value)}
                  className="border border-gray-300 bg-white px-3 py-2 text-xs rounded-xs focus:outline-none focus:border-[#CF7644]"
                >
                  <option value="all">Toutes dates</option>
                  <option value="today">Aujourd’hui</option>
                </select>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-gray-200 rounded-xs shadow-2xs overflow-hidden">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500 text-sm">
                  Aucune commande ne correspond aux critères sélectionnés.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-[#FAF4EF]">
                      <tr>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Réf.</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Date</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Client & Tél</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Ville</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Articles & Tailles</th>
                        <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase">Total</th>
                        <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Statut</th>
                        <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredOrders.map((order) => {
                        const cleanPhone = normalizeWhatsAppNumber(order.customer_phone);
                        return (
                          <tr key={order.id} className="hover:bg-gray-50/70">
                            <td className="px-6 py-4 font-mono font-bold text-gray-900">
                              #{order.order_reference}
                            </td>
                            <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                              {new Date(order.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-gray-900">{order.customer_name}</p>
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 hover:text-emerald-700 flex items-center gap-1 font-mono text-[11px]"
                              >
                                <MessageCircle className="w-3 h-3 text-[#25D366]" />
                                <span>{order.customer_phone}</span>
                              </a>
                            </td>
                            <td className="px-6 py-4 font-semibold text-gray-800">{order.city}</td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="space-y-1">
                                {(order.items || []).map((it, i) => (
                                  <div key={i} className="text-[11px] text-gray-700">
                                    <span className="font-semibold">{it.quantity}x</span> {it.product_name}{' '}
                                    <span className="text-gray-500 font-mono">({it.size} • {it.color_name})</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-[#CF7644] text-sm whitespace-nowrap">
                              {order.total} DH
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${getStatusBadge(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsOrderDetailsOpen(true);
                                }}
                                className="bg-gray-100 hover:bg-[#CF7644] hover:text-white px-3 py-1.5 rounded-xs font-semibold text-xs text-gray-700 transition-colors"
                              >
                                Détails & Statut
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PRODUCTS & VARIANTS MANAGEMENT */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#181818]">
                  Gestion des Produits & Variantes
                </h2>
                <p className="text-xs text-gray-500">
                  Gérez les collections, tarifs, photos et stocks indépendants par taille et couleur.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-[#CF7644] hover:bg-[#b66133] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Vêtement</span>
              </button>
            </div>

            {/* Product Filters */}
            <div className="bg-white p-4 border border-gray-200 rounded-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher par nom de vêtement..."
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <select
                value={productCatFilter}
                onChange={(e) => setProductCatFilter(e.target.value)}
                className="border border-gray-300 bg-white px-3 py-2 text-xs rounded-xs focus:outline-none focus:border-[#CF7644] w-full md:w-auto"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-gray-200 rounded-xs shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-[#FAF4EF]">
                    <tr>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Aperçu</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Vêtement</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Catégorie</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Prix (MAD)</th>
                      <th className="px-6 py-3 text-left font-bold text-gray-700 uppercase">Stock Variantes</th>
                      <th className="px-6 py-3 text-center font-bold text-gray-700 uppercase">Statut</th>
                      <th className="px-6 py-3 text-right font-bold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredProducts.map((p) => {
                      const totalStock = (p.variants || []).reduce((acc, v) => acc + v.stock_quantity, 0);
                      const uniqueSizes = Array.from(new Set((p.variants || []).map((v) => v.size)));
                      const uniqueColors = Array.from(new Set((p.variants || []).map((v) => v.color_name)));

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70">
                          <td className="px-6 py-3">
                            <div className="w-12 h-16 bg-gray-100 rounded-xs overflow-hidden">
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <p className="font-bold text-gray-900">{p.name}</p>
                            <div className="flex items-center gap-2 pt-1">
                              {p.is_new && (
                                <span className="bg-[#181818] text-[#F1D7C5] px-1.5 py-0.5 text-[9px] font-bold rounded-2xs">
                                  Nouveau
                                </span>
                              )}
                              {p.is_featured && (
                                <span className="bg-[#CF7644] text-white px-1.5 py-0.5 text-[9px] font-bold rounded-2xs">
                                  Best-Seller
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600 font-medium">
                            {p.category?.name || 'Non classé'}
                          </td>
                          <td className="px-6 py-3 font-bold text-gray-900">
                            {p.discount_price ? (
                              <div>
                                <span className="text-[#CF7644]">{p.discount_price} DH</span>
                                <span className="text-[10px] text-gray-400 line-through ml-1.5">
                                  {p.price} DH
                                </span>
                              </div>
                            ) : (
                              <span>{p.price} DH</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                totalStock > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                              }`}
                            >
                              {totalStock} en stock
                            </span>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {uniqueSizes.join(', ')} • {uniqueColors.length} teintes
                            </p>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => handleToggleProductActive(p)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                p.is_active
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {p.is_active ? 'Actif' : 'Inactif'}
                            </button>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-[#CF7644] rounded-xs hover:bg-gray-100"
                                title="Modifier"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-xs hover:bg-gray-100"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: CATEGORIES */}
        {/* ============================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-[#181818]">
                  Catégories & Lignes
                </h2>
                <p className="text-xs text-gray-500">
                  Organisez les collections de la boutique DoArt Store.
                </p>
              </div>

              <button
                onClick={() => setIsAddingCat(!isAddingCat)}
                className="inline-flex items-center gap-2 bg-[#CF7644] hover:bg-[#b66133] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Catégorie</span>
              </button>
            </div>

            {/* Add Cat form */}
            {isAddingCat && (
              <form onSubmit={handleCreateCategory} className="bg-white p-5 border border-[#F1D7C5] rounded-xs space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-800">
                  Créer une nouvelle catégorie
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Nom de la collection</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="ex: Manteaux & Capes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">URL Image de couverture</label>
                    <input
                      type="url"
                      value={newCatImage}
                      onChange={(e) => setNewCatImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCat(false)}
                    className="px-4 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-xs"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-[#CF7644] text-white px-5 py-1.5 text-xs font-bold uppercase rounded-xs"
                  >
                    Créer la catégorie
                  </button>
                </div>
              </form>
            )}

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white border border-gray-200 rounded-xs overflow-hidden shadow-2xs group">
                  <div className="aspect-video relative overflow-hidden bg-gray-100">
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{cat.name}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">{cat.slug}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: SETTINGS */}
        {/* ============================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-8">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#181818]">
                Paramètres de la Boutique & WhatsApp COD
              </h2>
              <p className="text-xs text-gray-500">
                Configurez le numéro WhatsApp officiel recevant les commandes ainsi que les frais d'expédition.
              </p>
            </div>

            {settingsSavedMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Paramètres enregistrés avec succès !</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="bg-white p-6 border border-gray-200 rounded-xs space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#CF7644] border-b pb-1">
                  Numéro WhatsApp Officiel (Commandes Directes)
                </h3>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                    Numéro de réception WhatsApp (Format international sans +)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={settingsWhatsApp}
                      onChange={(e) => setSettingsWhatsApp(e.target.value)}
                      placeholder="212661000000"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644] font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Ce numéro sera utilisé dans le lien <code>https://wa.me/[NUMERO]</code> lors de la validation du panier par les clients.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#CF7644] border-b pb-1">
                  Identité de la Boutique & Réseaux
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Nom de la boutique
                    </label>
                    <input
                      type="text"
                      value={settingsStoreName}
                      onChange={(e) => setSettingsStoreName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Lien Compte Instagram
                    </label>
                    <input
                      type="url"
                      value={settingsInstagram}
                      onChange={(e) => setSettingsInstagram(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-wider font-bold text-[#CF7644] border-b pb-1">
                  Conditions de Livraison au Maroc
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Frais de livraison standard (MAD)
                    </label>
                    <input
                      type="number"
                      value={settingsDeliveryFee}
                      onChange={(e) => setSettingsDeliveryFee(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Seuil de livraison gratuite (MAD)
                    </label>
                    <input
                      type="number"
                      value={settingsThreshold}
                      onChange={(e) => setSettingsThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* SECTION: VISUELS DU HERO (IMAGE, BADGE & CARTE PRODUIT) */}
              {/* ========================================================= */}
              <div className="space-y-6 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider font-bold text-[#CF7644]">
                      Visuels & Showcase du Hero (Page d'Accueil)
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Personnalisez la grande photo de présentation, le badge flottant et la carte produit mise en avant.
                    </p>
                  </div>
                  <span className="text-[10px] bg-[#FAF4EF] text-[#CF7644] font-bold px-2 py-0.5 rounded border border-[#F1D7C5]">
                    En direct sur le site
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Form Inputs */}
                  <div className="lg:col-span-7 space-y-4 text-xs">
                    {/* 1. Main Hero Image */}
                    <div className="bg-gray-50 p-3.5 border border-gray-200 rounded-xs space-y-2">
                      <label className="font-bold uppercase tracking-wider text-gray-800 block">
                        Grande Photo du Hero (Modèle) <span className="text-[#CF7644]">*</span>
                      </label>
                      <input
                        type="text"
                        value={heroImage}
                        onChange={(e) => setHeroImage(e.target.value)}
                        placeholder="URL web ou /images/banners/nom.jpg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xs bg-white focus:outline-none focus:border-[#CF7644]"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-gray-500">
                        <span>Raccourcis :</span>
                        <button
                          type="button"
                          onClick={() => setHeroImage('/images/banners/')}
                          className="bg-white border px-1.5 py-0.5 rounded text-[#CF7644] font-mono hover:bg-gray-100"
                        >
                          + /images/banners/
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeroImage('/images/products/')}
                          className="bg-white border px-1.5 py-0.5 rounded text-[#CF7644] font-mono hover:bg-gray-100"
                        >
                          + /images/products/
                        </button>
                      </div>
                    </div>

                    {/* 2. Top-Right Floating Badge */}
                    <div className="bg-gray-50 p-3.5 border border-gray-200 rounded-xs space-y-1.5">
                      <label className="font-bold uppercase tracking-wider text-gray-800 block">
                        Badge Flottant (Haut à Droite)
                      </label>
                      <input
                        type="text"
                        value={heroTagBadge}
                        onChange={(e) => setHeroTagBadge(e.target.value)}
                        placeholder="ex: Casablanca Atelier ou Édition Limitée"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xs bg-white focus:outline-none focus:border-[#CF7644]"
                      />
                      <p className="text-[11px] text-gray-500">
                        Affiché dans l'étiquette terracotta en haut à droite de l'image.
                      </p>
                    </div>

                    {/* 3. Bottom-Left Floating Product Card */}
                    <div className="bg-gray-50 p-3.5 border border-gray-200 rounded-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="font-bold uppercase tracking-wider text-gray-800 block">
                          Carte Produit Flottante (Bas à Gauche)
                        </label>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                          Cliquable vers le produit
                        </span>
                      </div>

                      {/* Quick auto-fill from existing products */}
                      <div className="bg-white p-2.5 border border-[#F1D7C5] rounded-xs space-y-1">
                        <label className="text-[11px] font-semibold text-gray-700 block">
                          Pré-remplir automatiquement depuis votre catalogue :
                        </label>
                        <select
                          value={heroFeaturedProductId}
                          onChange={(e) => handleLinkProductToHeroCard(e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-xs text-xs bg-white focus:outline-none focus:border-[#CF7644]"
                        >
                          <option value="">-- Choisir un vêtement existant --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.discount_price ?? p.price} DH)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Tag de la carte
                          </label>
                          <input
                            type="text"
                            value={heroCardTag}
                            onChange={(e) => setHeroCardTag(e.target.value)}
                            placeholder="ex: Best-Seller"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Titre du vêtement
                          </label>
                          <input
                            type="text"
                            value={heroCardTitle}
                            onChange={(e) => setHeroCardTitle(e.target.value)}
                            placeholder="ex: Tracksuit Signature DoArt"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Prix affiché
                          </label>
                          <input
                            type="text"
                            value={heroCardPrice}
                            onChange={(e) => setHeroCardPrice(e.target.value)}
                            placeholder="ex: 520 DH"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                            Prix d'origine barré (Optionnel)
                          </label>
                          <input
                            type="text"
                            value={heroCardOriginalPrice}
                            onChange={(e) => setHeroCardOriginalPrice(e.target.value)}
                            placeholder="ex: 650 DH"
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                          Miniature de la carte (URL ou /images/...)
                        </label>
                        <input
                          type="text"
                          value={heroCardImage}
                          onChange={(e) => setHeroCardImage(e.target.value)}
                          placeholder="URL ou /images/products/..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* 4. Hero Texts */}
                    <div className="bg-gray-50 p-3.5 border border-gray-200 rounded-xs space-y-3">
                      <label className="font-bold uppercase tracking-wider text-gray-800 block">
                        Textes & Slogan du Hero
                      </label>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                          Badge d'en-tête
                        </label>
                        <input
                          type="text"
                          value={heroBadge}
                          onChange={(e) => setHeroBadge(e.target.value)}
                          placeholder="ex: Nouvelle Collection 2026 • DoArt Studio"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                          Titre Principal
                        </label>
                        <input
                          type="text"
                          value={heroTitle}
                          onChange={(e) => setHeroTitle(e.target.value)}
                          placeholder="L’Élégance Minimaliste Inspirée par le Maroc."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">
                          Slogan / Description
                        </label>
                        <textarea
                          rows={2}
                          value={heroSubtitle}
                          onChange={(e) => setHeroSubtitle(e.target.value)}
                          placeholder="Des coupes contemporaines, des matières nobles..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live Interactive Visual Preview */}
                  <div className="lg:col-span-5 bg-white p-4 border border-[#F1D7C5] rounded-xs shadow-xs space-y-3 sticky top-24">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="font-bold text-xs uppercase tracking-wider text-[#181818] flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-[#CF7644]" />
                        <span>Aperçu en direct du Hero</span>
                      </span>
                      <span className="text-[10px] text-gray-400">Simulation</span>
                    </div>

                    {/* Miniature Hero Visual Showcase */}
                    <div className="relative aspect-3/4 overflow-hidden rounded-xs bg-gray-100 border-2 border-[#FAF4EF] shadow-md">
                      <img
                        src={heroImage || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80'}
                        alt="Hero Preview"
                        className="w-full h-full object-cover object-top"
                      />

                      {/* Top-Right Badge Preview */}
                      {heroTagBadge && (
                        <div className="absolute top-3 right-2 bg-[#CF7644] text-white px-2.5 py-1 shadow-md rounded-2xs font-serif italic text-[11px]">
                          {heroTagBadge}
                        </div>
                      )}

                      {/* Bottom-Left Floating Card Preview */}
                      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-xs shadow-xl border border-[#F1D7C5] max-w-[210px]">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-11 bg-gray-200 overflow-hidden shrink-0 rounded-2xs">
                            <img
                              src={heroCardImage || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=200&q=80'}
                              alt="Thumbnail"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-[#CF7644] uppercase tracking-wider block truncate">
                              {heroCardTag || 'Best-Seller'}
                            </span>
                            <p className="text-[11px] font-bold text-[#181818] truncate leading-tight">
                              {heroCardTitle || 'Tracksuit Signature'}
                            </p>
                            <p className="text-[11px] font-bold text-[#181818]">
                              {heroCardPrice || '520 DH'}{' '}
                              {heroCardOriginalPrice && (
                                <span className="line-through text-gray-400 font-normal text-[9px] ml-1">
                                  {heroCardOriginalPrice}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-500 text-center italic">
                      Les modifications s'appliqueront immédiatement dès que vous cliquerez sur « Sauvegarder les paramètres ».
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-[#CF7644] hover:bg-[#b66133] text-white px-8 py-3 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Sauvegarder les paramètres & Visuels Hero</span>
                </button>
              </div>
            </form>

            {/* Supabase Guide Banner */}
            <div className="bg-[#FAF4EF] p-6 border border-[#F1D7C5] rounded-xs flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#181818]">Base de Données & Guide Supabase</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Consultez le schéma SQL complet ou mettez à jour vos identifiants Supabase en 1 clic.
                </p>
              </div>
              <button
                onClick={() => setIsSupabaseGuideOpen(true)}
                className="bg-[#181818] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs hover:bg-[#CF7644] transition-colors"
              >
                Ouvrir le Guide SQL
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      <AdminProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
      />

      {/* Order Details Modal */}
      <AdminOrderDetailsModal
        isOpen={isOrderDetailsOpen}
        order={selectedOrder}
        onClose={() => setIsOrderDetailsOpen(false)}
        onUpdateStatus={handleUpdateOrderStatus}
        onUpdateCustomer={handleUpdateCustomer}
      />

      {/* Manual Order Modal */}
      <AdminManualOrderModal
        isOpen={isManualOrderOpen}
        products={products}
        onClose={() => setIsManualOrderOpen(false)}
        onOrderCreated={handleManualOrderCreated}
      />

      {/* Supabase Guide Modal */}
      <AdminSupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
      />
    </div>
  );
};
