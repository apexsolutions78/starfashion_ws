'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);

  const [articleNumber, setArticleNumber] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [basePrice, setBasePrice] = useState('');

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [defaultStock, setDefaultStock] = useState('500');

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/v1/admin/products');
      const data = await res.json();

      if (data.success) {
        setCategories(data.data.categories);
        setCollections(data.data.collections);
        setColors(data.data.colors);
        setSizes(data.data.sizes);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const generateSlug = (productName: string) => {
    return productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev =>
      prev.includes(colorId)
        ? prev.filter(id => id !== colorId)
        : [...prev, colorId]
    );
  };

  const toggleSize = (sizeId: string) => {
    setSelectedSizes(prev =>
      prev.includes(sizeId)
        ? prev.filter(id => id !== sizeId)
        : [...prev, sizeId]
    );
  };

  const generateVariants = () => {
    const variants: any[] = [];
    for (const colorId of selectedColors) {
      for (const sizeId of selectedSizes) {
        const color = colors.find(c => c.id === colorId);
        const size = sizes.find(s => s.id === sizeId);
        if (color && size) {
          variants.push({
            colorId,
            sizeId,
            colorName: color.name,
            sizeName: size.name,
            sku: `${articleNumber}-${color.name.substring(0, 3).toUpperCase()}-${size.name}`,
            stock: parseInt(defaultStock) || 500,
          });
        }
      }
    }
    return variants;
  };

  const handleSubmit = async () => {
    if (!articleNumber || !name || !slug || !categoryId || !basePrice) {
      alert('Please fill in all required fields');
      return;
    }

    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Please select at least one color and one size');
      return;
    }

    setLoading(true);
    try {
      const variants = generateVariants();

      const res = await fetch('/api/v1/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleNumber,
          name,
          slug,
          description,
          categoryId,
          collectionId: collectionId || null,
          basePrice: parseFloat(basePrice),
          variants,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('Product created successfully');
        router.push('/admin/products');
      } else {
        alert(data.error || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const previewVariants = generateVariants();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/products"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New Product</h1>
            <p className="text-slate-400 text-sm">Create a new wholesale product</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{loading ? 'Creating...' : 'Create Product'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Article Number *</label>
                  <input
                    type="text"
                    value={articleNumber}
                    onChange={(e) => setArticleNumber(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="ART-1001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Base Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Product Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === generateSlug(name)) {
                      setSlug(generateSlug(e.target.value));
                    }
                  }}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Product name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="product-slug"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Product description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Collection</label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select collection</option>
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Variant Matrix Builder */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Variant Matrix</h2>

            {/* Colors */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-300 mb-3">Select Colors *</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => toggleColor(color.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedColors.includes(color.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-slate-600"
                      style={{ backgroundColor: color.hexCode }}
                    />
                    <span>{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-300 mb-3">Select Sizes *</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => toggleSize(size.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedSizes.includes(size.id)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {size.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Stock */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-300 mb-2">Default Stock per Variant</label>
              <input
                type="number"
                value={defaultStock}
                onChange={(e) => setDefaultStock(e.target.value)}
                className="w-32 bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                min="0"
              />
            </div>

            {/* Preview */}
            {previewVariants.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-3">
                  Preview ({previewVariants.length} variants will be created)
                </label>
                <div className="bg-slate-950/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400">
                        <th className="text-left pb-2 font-medium">SKU</th>
                        <th className="text-left pb-2 font-medium">Color</th>
                        <th className="text-left pb-2 font-medium">Size</th>
                        <th className="text-right pb-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewVariants.map((variant, idx) => (
                        <tr key={idx} className="border-t border-slate-800/50">
                          <td className="py-2 text-slate-300 font-mono">{variant.sku}</td>
                          <td className="py-2 text-slate-300">{variant.colorName}</td>
                          <td className="py-2 text-slate-300">{variant.sizeName}</td>
                          <td className="py-2 text-right text-emerald-400">{variant.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Colors Selected</span>
                <span className="text-slate-300">{selectedColors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sizes Selected</span>
                <span className="text-slate-300">{selectedSizes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Variants</span>
                <span className="text-emerald-400 font-bold">{previewVariants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Stock</span>
                <span className="text-emerald-400">
                  {previewVariants.reduce((sum, v) => sum + v.stock, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tips</h2>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>• Select colors and sizes to auto-generate variants</li>
              <li>• SKU format: ARTICLE-COLOR-SIZE</li>
              <li>• Stock can be adjusted later per variant</li>
              <li>• Add images after creating the product</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
