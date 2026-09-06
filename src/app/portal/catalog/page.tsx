'use client';

import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Check, X, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

export default function WholesaleCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Per-product selection state: { [productId]: { color, size, qty } }
  const [selections, setSelections] = useState<{ [productId: string]: { color: string; size: string; qty: number } }>({});
  const [submittingProduct, setSubmittingProduct] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Per-product image carousel index: { [productId]: currentIndex }
  const [imageIndices, setImageIndices] = useState<{ [productId: string]: number }>({});

  // Image preview modal
  const [previewImages, setPreviewImages] = useState<any[]>([]);
  const [previewColor, setPreviewColor] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  const fetchCatalog = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedCategory) params.set('categoryId', selectedCategory);

    fetch(`/api/v1/catalog/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data.products);
          setCategories(data.data.categories);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCatalog();
  }, [search, selectedCategory]);

  const getSelection = (productId: string) => selections[productId] || { color: '', size: '', qty: 0 };

  const setSelection = (productId: string, update: Partial<{ color: string; size: string; qty: number }>) => {
    if (update.color !== undefined) {
      setImageIndices((prev) => ({ ...prev, [productId]: 0 }));
    }
    setSelections((prev) => {
      const current = prev[productId] || { color: '', size: '', qty: 0 };
      return { ...prev, [productId]: { ...current, ...update } };
    });
  };

  const getProductColors = (product: any) => {
    const colorMap: { [name: string]: any } = {};
    product.variants.forEach((v: any) => {
      if (!colorMap[v.color?.name]) {
        colorMap[v.color?.name] = v.color;
      }
    });
    return Object.values(colorMap);
  };

  const getProductSizes = (product: any, colorName: string) => {
    const sizes: string[] = [];
    product.variants.forEach((v: any) => {
      if (v.color?.name === colorName && !sizes.includes(v.size?.name)) {
        sizes.push(v.size?.name);
      }
    });
    return sizes;
  };

  const getVariant = (product: any, colorName: string, sizeName: string) => {
    return product.variants.find((v: any) => v.color?.name === colorName && v.size?.name === sizeName);
  };

  const getColorImage = (product: any, colorName: string) => {
    return product.images?.find((img: any) => img.color?.name === colorName);
  };

  const getColorImages = (product: any, colorName: string): any[] => {
    if (!product.images?.length) return [];
    if (colorName) {
      const filtered = product.images.filter((img: any) => img.color?.name === colorName);
      return filtered.length > 0 ? filtered : product.images;
    }
    return product.images;
  };

  const getImageIndex = (productId: string) => imageIndices[productId] || 0;

  const setImageIndex = (productId: string, index: number) => {
    setImageIndices((prev) => ({ ...prev, [productId]: index }));
  };

  const prevImage = (productId: string, total: number) => {
    setImageIndex(productId, (getImageIndex(productId) - 1 + total) % total);
  };

  const nextImage = (productId: string, total: number) => {
    setImageIndex(productId, (getImageIndex(productId) + 1) % total);
  };

  const handleAddToCart = async (product: any) => {
    const sel = getSelection(product.id);
    if (!sel.color || !sel.size || sel.qty <= 0) return;

    const variant = getVariant(product, sel.color, sel.size);
    if (!variant) return;

    setSubmittingProduct(product.id);
    try {
      const res = await fetch('/api/v1/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ variantId: variant.id, quantity: sel.qty }] }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Added ${sel.qty} units of ${product.name} (${sel.color}/${sel.size}) to cart.`);
        setSelections((prev) => ({ ...prev, [product.id]: { color: sel.color, size: sel.size, qty: 0 } }));
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } finally {
      setSubmittingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wholesale Catalogue</h1>
          <p className="text-slate-500 text-sm mt-1">Browse and order wholesale articles.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-4 flex items-center space-x-2 shadow-sm">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading catalogue...</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 font-medium">No articles found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {products.map((product) => {
            const colors = getProductColors(product);
            const sel = getSelection(product.id);
            const selectedColor = sel.color || colors[0]?.name || '';
            const sizes = getProductSizes(product, selectedColor);
            const colorImages = getColorImages(product, selectedColor);
            const currentIdx = Math.min(getImageIndex(product.id), Math.max(0, colorImages.length - 1));
            const displayImage = colorImages[currentIdx] || product.images?.[0];
            const variant = sel.color && sel.size ? getVariant(product, sel.color, sel.size) : null;

            return (
              <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
                {/* Image Carousel */}
                <div className="relative aspect-[4/5] bg-slate-100 overflow-hidden group">
                  {displayImage ? (
                    <img
                      src={displayImage.imagePath}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                  )}

                  {/* Article badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-bold text-indigo-700 px-2.5 py-1 rounded-full z-10">
                    {product.articleNumber}
                  </div>

                  {/* Prev / Next arrows */}
                  {colorImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); prevImage(product.id, colorImages.length); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); nextImage(product.id, colorImages.length); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                      </button>
                    </>
                  )}

                  {/* Dot indicators */}
                  {colorImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-1.5 z-10">
                      {colorImages.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setImageIndex(product.id, idx); }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${idx === currentIdx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-900 text-base leading-tight">{product.name}</h3>
                    {product.description && (
                      <p className="text-slate-400 text-xs mt-1 line-clamp-2">{product.description}</p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-xl font-extrabold text-slate-900">Rs.{product.basePrice.toFixed(2)}</span>
                    <span className="text-slate-400 text-xs ml-1">/ unit</span>
                  </div>

                  {/* Color Swatches */}
                  {colors.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Color</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {colors.map((color: any) => {
                          const isSelected = selectedColor === color.name;
                          const img = getColorImage(product, color.name);
                          return (
                            <button
                              key={color.id}
                              onClick={() => {
                                setSelection(product.id, { color: color.name, size: '', qty: getSelection(product.id).qty });
                              }}
                              className={`relative w-9 h-9 rounded-full border-2 transition-all duration-200 overflow-hidden ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                              title={color.name}
                            >
                              {img ? (
                                <img src={img.imagePath} alt={color.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="w-full h-full block" style={{ backgroundColor: color.hexCode || '#ccc' }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size Pills */}
                  {sizes.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Size</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sizes.map((sizeName: string) => {
                          const isSelected = sel.size === sizeName;
                          return (
                            <button
                              key={sizeName}
                              onClick={() => setSelection(product.id, { size: sizeName, qty: getSelection(product.id).qty })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {sizeName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity + Add to Cart */}
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    {sel.color && sel.size ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-100 rounded-lg">
                          <button
                            onClick={() => setSelection(product.id, { qty: Math.max(0, sel.qty - 1) })}
                            className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={sel.qty || ''}
                            placeholder="0"
                            onChange={(e) => setSelection(product.id, { qty: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-14 text-center bg-transparent text-sm font-bold text-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => setSelection(product.id, { qty: sel.qty + 1 })}
                            className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={sel.qty <= 0 || submittingProduct === product.id}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center space-x-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>{submittingProduct === product.id ? 'Adding...' : 'Add to Cart'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 text-xs py-2">
                        Select color and size to order
                      </div>
                    )}
                    {sel.qty > 0 && variant && (
                      <div className="mt-2 text-right text-[11px] text-slate-400">
                        Rs.{(product.basePrice * sel.qty).toFixed(2)} before discount
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {showPreview && previewImages.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: previewImages[0]?.color?.hexCode || '#ccc' }} />
                <h3 className="font-bold text-slate-900">{previewColor}</h3>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                <img src={previewImages[previewIndex]?.imagePath} alt={previewColor} className="w-full h-full object-contain" />
              </div>
              {previewImages.length > 1 && (
                <>
                  <button onClick={() => setPreviewIndex((p) => (p === 0 ? previewImages.length - 1 : p - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"><ChevronLeft className="w-5 h-5 text-slate-700" /></button>
                  <button onClick={() => setPreviewIndex((p) => (p === previewImages.length - 1 ? 0 : p + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"><ChevronRight className="w-5 h-5 text-slate-700" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
