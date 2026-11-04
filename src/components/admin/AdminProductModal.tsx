import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Layers,
  Sparkles,
  Upload,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Product, ProductVariant, Category } from '../../types';
import { getSupabaseClient } from '../../lib/supabase';

interface AdminProductModalProps {
  product: Product | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<Product>, variants: Partial<ProductVariant>[]) => Promise<void>;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSave,
}) => {
  // Basic info states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [discountPrice, setDiscountPrice] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);

  // File upload states for Supabase Storage 'products' bucket
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Variant configuration states: Sizes list and Colors list
  const [sizesList, setSizesList] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [newSizeInput, setNewSizeInput] = useState('');

  const [colorsList, setColorsList] = useState<{ name: string; hex: string }[]>([
    { name: 'Noir', hex: '#111111' },
    { name: 'Terracotta', hex: '#CF7644' },
    { name: 'Beige Sable', hex: '#EAD8C7' },
  ]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#CF7644');

  // Matrix of variant stocks: key is `${size}_${color_name}`
  const [variantStocks, setVariantStocks] = useState<Record<string, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize state when product changes or modal opens
  useEffect(() => {
    if (product) {
      setName(product.name);
      setSlug(product.slug);
      setDescription(product.description);
      setPrice(product.price);
      setDiscountPrice(product.discount_price ? String(product.discount_price) : '');
      setCategoryId(product.category_id || categories[0]?.id || '');
      setImages(product.images || []);
      setIsActive(product.is_active);
      setIsFeatured(product.is_featured);
      setIsNew(product.is_new);

      // Extract existing sizes & colors
      const existingVariants = product.variants || [];
      const extractedSizes = Array.from(new Set(existingVariants.map((v) => v.size)));
      const extractedColorsMap = new Map<string, string>();
      existingVariants.forEach((v) => {
        if (!extractedColorsMap.has(v.color_name)) {
          extractedColorsMap.set(v.color_name, v.color_hex);
        }
      });

      if (extractedSizes.length > 0) {
        setSizesList(extractedSizes);
      }
      if (extractedColorsMap.size > 0) {
        setColorsList(
          Array.from(extractedColorsMap.entries()).map(([cName, cHex]) => ({
            name: cName,
            hex: cHex,
          }))
        );
      }

      // Populate variant stocks
      const stocks: Record<string, number> = {};
      existingVariants.forEach((v) => {
        stocks[`${v.size}_${v.color_name}`] = v.stock_quantity;
      });
      setVariantStocks(stocks);
    } else {
      // Default new product values
      setName('');
      setSlug('');
      setDescription('');
      setPrice(590);
      setDiscountPrice('');
      setCategoryId(categories[0]?.id || '');
      setImages([
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85',
      ]);
      setIsActive(true);
      setIsFeatured(false);
      setIsNew(true);
      setSizesList(['S', 'M', 'L', 'XL']);
      setColorsList([
        { name: 'Noir', hex: '#111111' },
        { name: 'Terracotta', hex: '#CF7644' },
      ]);
      setVariantStocks({
        S_Noir: 5,
        M_Noir: 10,
        L_Noir: 8,
        XL_Noir: 4,
        S_Terracotta: 3,
        M_Terracotta: 6,
        L_Terracotta: 5,
        XL_Terracotta: 2,
      });
    }
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  // Auto-generate slug on name change
  const handleNameChange = (val: string) => {
    setName(val);
    if (!product) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  // Add Size
  const handleAddSize = () => {
    const s = newSizeInput.trim().toUpperCase();
    if (s && !sizesList.includes(s)) {
      setSizesList([...sizesList, s]);
      setNewSizeInput('');
    }
  };

  // Remove Size
  const handleRemoveSize = (szToRemove: string) => {
    setSizesList(sizesList.filter((s) => s !== szToRemove));
  };

  // Add Color
  const handleAddColor = () => {
    const cName = newColorName.trim();
    if (cName && !colorsList.some((c) => c.name.toLowerCase() === cName.toLowerCase())) {
      setColorsList([...colorsList, { name: cName, hex: newColorHex }]);
      setNewColorName('');
      setNewColorHex('#CF7644');
    }
  };

  // Remove Color
  const handleRemoveColor = (cNameToRemove: string) => {
    setColorsList(colorsList.filter((c) => c.name !== cNameToRemove));
  };

  // Update specific stock in matrix
  const handleStockChange = (size: string, colorName: string, quantity: number) => {
    const key = `${size}_${colorName}`;
    setVariantStocks((prev) => ({
      ...prev,
      [key]: Math.max(0, quantity),
    }));
  };

  // Add Image URL
  const handleAddImage = () => {
    if (imageUrlInput.trim()) {
      setImages([...images, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  // Upload local images directly to Supabase Storage 'products' bucket
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const filesToUpload: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (validTypes.includes(file.type.toLowerCase())) {
        filesToUpload.push(file);
      } else {
        setUploadError(`Le fichier "${file.name}" n'est pas un format valide. Seuls les formats JPG, PNG et WEBP sont acceptés.`);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const uploadedUrls: string[] = [];
    const supabase = getSupabaseClient();

    try {
      for (const file of filesToUpload) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const cleanBase = file.name
          .replace(/\.[^/.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 30);
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanBase || 'produit'}.${ext}`;

        if (supabase) {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('products')
            .upload(uniqueFileName, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadErr) {
            throw new Error(`Échec du téléversement de "${file.name}" : ${uploadErr.message}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from('products')
            .getPublicUrl(uploadData.path);

          if (publicUrlData?.publicUrl) {
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        } else {
          // Mode Démo / Hors-ligne : Aperçu immédiat via DataURL
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          uploadedUrls.push(dataUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setImages((prev) => [...prev, ...uploadedUrls]);
        setUploadSuccess(
          uploadedUrls.length === 1
            ? '1 image importée et ajoutée au produit avec succès !'
            : `${uploadedUrls.length} images importées et ajoutées avec succès !`
        );
        setTimeout(() => setUploadSuccess(null), 5000);
      }
    } catch (err: unknown) {
      console.error('Erreur import image:', err);
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de l’importation des images.'
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Veuillez renseigner le nom du vêtement.');
      return;
    }
    if (price <= 0) {
      setError('Le prix doit être supérieur à 0 DH.');
      return;
    }
    if (sizesList.length === 0 || colorsList.length === 0) {
      setError('Veuillez configurer au moins une taille et une couleur pour ce vêtement.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build variants list
      const variantsToSave: Partial<ProductVariant>[] = [];

      sizesList.forEach((sz) => {
        colorsList.forEach((col) => {
          const key = `${sz}_${col.name}`;
          const stock = Number(variantStocks[key] ?? 0);

          // Find existing variant ID if editing
          const existingVar = product?.variants?.find(
            (v) => v.size === sz && v.color_name === col.name
          );

          variantsToSave.push({
            id: existingVar?.id,
            size: sz,
            color_name: col.name,
            color_hex: col.hex,
            stock_quantity: stock,
            expected_stock: existingVar ? existingVar.stock_quantity : undefined,
            sku: existingVar?.sku || `DOA-${sz}-${col.name.slice(0, 3).toUpperCase()}`,
          });
        });
      });

      const productPayload: Partial<Product> = {
        id: product?.id,
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
        price: Number(price),
        discount_price: discountPrice ? Number(discountPrice) : null,
        category_id: categoryId || categories[0]?.id || '',
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85'],
        is_active: isActive,
        is_featured: isFeatured,
        is_new: isNew,
      };

      await onSave(productPayload, variantsToSave);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du produit.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVariantStock = sizesList.reduce((acc, sz) => {
    return (
      acc +
      colorsList.reduce((cAcc, col) => {
        const key = `${sz}_${col.name}`;
        return cAcc + (variantStocks[key] || 0);
      }, 0)
    );
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl shadow-2xl rounded-xs border border-[#F1D7C5] overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-[#FAF4EF] px-6 py-4 border-b border-[#F1D7C5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#CF7644] text-white rounded-xs">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="font-serif text-xl font-bold text-[#181818]">
              {product ? `Modifier « ${product.name} »` : 'Ajouter un nouveau vêtement DoArt'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-black rounded-full hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 rounded-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Informations Générales */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase tracking-widest font-bold text-[#CF7644] border-b pb-1">
              1. Informations Générales
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Nom du vêtement <span className="text-[#CF7644]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ex: Classic Tracksuit DoArt Signature"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="classic-tracksuit-doart-signature"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs bg-gray-50 text-gray-600 focus:outline-none focus:border-[#CF7644]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Prix en MAD (DH) <span className="text-[#CF7644]">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Prix promotionnel (Optionnel)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  placeholder="ex: 490"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                  Catégorie
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs bg-white focus:outline-none focus:border-[#CF7644]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Description du vêtement
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Matière, coupe, détails de fabrication à Casablanca..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
              />
            </div>

            {/* Status Checkboxes */}
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded-xs text-[#CF7644] focus:ring-[#CF7644] w-4 h-4"
                />
                <span>Produit Actif (Visible en boutique)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded-xs text-[#CF7644] focus:ring-[#CF7644] w-4 h-4"
                />
                <span>Best-Seller / Mis en avant</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="rounded-xs text-[#CF7644] focus:ring-[#CF7644] w-4 h-4"
                />
                <span>Nouveauté</span>
              </label>
            </div>
          </div>

          {/* Section 2: Galerie Photos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h4 className="text-xs uppercase tracking-widest font-bold text-[#CF7644]">
                2. Photographies du Produit
              </h4>
              <span className="text-[11px] text-gray-500">
                Import direct depuis l'ordinateur ou saisie par URL web
              </span>
            </div>

            {/* Téléversement direct depuis l'ordinateur vers Supabase Storage 'products' */}
            <div className="p-4 bg-white border-2 border-dashed border-[#F1D7C5] rounded-xs hover:border-[#CF7644] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileSelect}
                className="hidden"
                id="product-image-file-input"
                disabled={isUploading}
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-gray-800 flex items-center justify-center sm:justify-start gap-1.5">
                    <Upload className="w-4 h-4 text-[#CF7644]" />
                    <span>Importer des photos depuis votre ordinateur</span>
                  </span>
                  <p className="text-[11px] text-gray-500">
                    Formats acceptés : JPG, PNG, WEBP • Sélection multiple • Stockage direct dans le bucket <code className="text-[#CF7644] font-mono font-bold">products</code>
                  </p>
                </div>

                <label
                  htmlFor="product-image-file-input"
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xs text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer transition-colors shrink-0 ${
                    isUploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#CF7644] hover:bg-[#b56133]'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Téléversement en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Importer depuis mon ordinateur</span>
                    </>
                  )}
                </label>
              </div>

              {/* État de réussite */}
              {uploadSuccess && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xs">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* État d'erreur */}
              {uploadError && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            {/* Séparateur alternatif */}
            <div className="relative flex items-center justify-center pt-1 pb-1">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[10px] uppercase font-bold text-gray-400 tracking-wider absolute">
                ou ajouter par URL web / chemin local
              </span>
            </div>

            {/* Ajout par URL web ou chemin local (conservé intégralement) */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="URL web (https://...) ou chemin local (/images/products/nom.jpg)"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="bg-gray-800 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-xs hover:bg-[#CF7644] transition-colors shrink-0"
                >
                  Ajouter Image
                </button>
              </div>

              {/* Raccourcis rapides */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-gray-500">Raccourcis rapides :</span>
                <button
                  type="button"
                  onClick={() => setImageUrlInput('/images/products/')}
                  className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-2xs font-mono"
                >
                  + /images/products/
                </button>
                <button
                  type="button"
                  onClick={() => setImageUrlInput('/images/categories/')}
                  className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-2xs font-mono"
                >
                  + /images/categories/
                </button>
              </div>
            </div>

            {/* Aperçu immédiat des images importées avec possibilité de retrait avant enregistrement */}
            {images.length > 0 ? (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    Aperçu des images du produit ({images.length}) :
                  </span>
                  <span className="text-[11px] text-gray-400">
                    La première photo sera l'image principale affichée en boutique
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-1">
                  {images.map((imgUrl, idx) => (
                    <div key={idx} className="relative aspect-3/4 rounded-xs overflow-hidden border border-gray-200 group bg-gray-50 shadow-2xs">
                      <img src={imgUrl} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                        title="Retirer cette photo du produit"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] px-1.5 py-0.5 rounded-2xs font-medium">
                          Principale
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center border border-dashed border-gray-200 rounded-xs bg-gray-50/50">
                <p className="text-xs text-gray-400">Aucune photo ajoutée pour le moment.</p>
              </div>
            )}
          </div>

          {/* Section 3: Variantes & Gestion des Stocks (Sizes & Colors Matrix) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h4 className="text-xs uppercase tracking-widest font-bold text-[#CF7644]">
                3. Tailles, Couleurs & Gestion des Stocks par Variante
              </h4>
              <span className="text-xs font-bold text-[#181818] bg-[#FAF4EF] px-2.5 py-0.5 rounded-full border border-[#F1D7C5]">
                Stock Total : {totalVariantStock} pièces
              </span>
            </div>

            {/* Configuration des Tailles */}
            <div className="bg-gray-50 p-4 rounded-xs border border-gray-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                Tailles configurées :
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {sizesList.map((sz) => (
                  <span
                    key={sz}
                    className="inline-flex items-center gap-1.5 bg-white border border-gray-300 px-3 py-1 rounded-xs text-xs font-semibold text-gray-800"
                  >
                    <span>{sz}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSize(sz)}
                      className="text-gray-400 hover:text-red-500"
                      title="Supprimer cette taille"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    placeholder="Nouvelle taille (ex: XXL)"
                    className="w-36 px-2.5 py-1 text-xs border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="p-1 bg-[#CF7644] text-white rounded-xs hover:bg-[#b66133]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Configuration des Couleurs */}
            <div className="bg-gray-50 p-4 rounded-xs border border-gray-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                Couleurs configurées avec nuancier :
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {colorsList.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-2 bg-white border border-gray-300 px-3 py-1 rounded-xs text-xs font-semibold text-gray-800"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-gray-300"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(c.name)}
                      className="text-gray-400 hover:text-red-500 ml-1"
                      title="Supprimer cette couleur"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-8 h-8 rounded-xs cursor-pointer border border-gray-300 p-0.5 bg-white"
                    title="Choisir la couleur"
                  />
                  <input
                    type="text"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    placeholder="Nom couleur (ex: Moka)"
                    className="w-36 px-2.5 py-1 text-xs border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644]"
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="p-1.5 bg-[#CF7644] text-white rounded-xs hover:bg-[#b66133]"
                    title="Ajouter la couleur"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Inventory Matrix Table (Stock per size & color) */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                Tableau d’inventaire (Stock par combinaison) :
              </span>
              <div className="border border-gray-200 overflow-x-auto rounded-xs">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-[#FAF4EF]">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                        Taille
                      </th>
                      <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                        Couleur
                      </th>
                      <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                        Quantité en stock
                      </th>
                      <th className="px-4 py-2.5 text-left font-bold text-gray-700 uppercase tracking-wider">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {sizesList.flatMap((sz) =>
                      colorsList.map((col) => {
                        const key = `${sz}_${col.name}`;
                        const stock = variantStocks[key] ?? 0;
                        return (
                          <tr key={key} className="hover:bg-gray-50/80">
                            <td className="px-4 py-2 font-bold text-gray-900">{sz}</td>
                            <td className="px-4 py-2 flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-gray-300"
                                style={{ backgroundColor: col.hex }}
                              />
                              <span className="font-medium text-gray-700">{col.name}</span>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={stock}
                                onChange={(e) =>
                                  handleStockChange(sz, col.name, Number(e.target.value))
                                }
                                className="w-24 px-2 py-1 border border-gray-300 rounded-xs focus:outline-none focus:border-[#CF7644] font-semibold text-center"
                              />
                            </td>
                            <td className="px-4 py-2">
                              {stock > 0 ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs font-semibold text-[11px]">
                                  Disponible ({stock})
                                </span>
                              ) : (
                                <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-xs font-semibold text-[11px]">
                                  Rupture de stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-600 hover:text-black border border-gray-300 rounded-xs transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#CF7644] hover:bg-[#b66133] disabled:opacity-50 text-white px-7 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xs transition-colors shadow-md"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
