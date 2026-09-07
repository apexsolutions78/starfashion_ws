'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Plus, X, Trash2 } from 'lucide-react';
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
  const [description, setDescription] = useState('');
  const [shirtStyle, setShirtStyle] = useState('');
  const [dupattaStyle, setDupattaStyle] = useState('');
  const [trouserStyle, setTrouserStyle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [basePrice, setBasePrice] = useState('');

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [defaultStock, setDefaultStock] = useState('500');

  // Inline add state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#808080');
  const [showAddColor, setShowAddColor] = useState(false);

  useEffect(() => { fetchOptions(); }, []);

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

  const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const toggleColor = (colorId: string) => {
    setSelectedColors(prev => prev.includes(colorId) ? prev.filter(id => id !== colorId) : [...prev, colorId]);
  };

  const toggleSize = (sizeId: string) => {
    setSelectedSizes(prev => prev.includes(sizeId) ? prev.filter(id => id !== sizeId) : [...prev, sizeId]);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/v1/admin/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories([...categories, data.data]);
        setCategoryId(data.data.id);
        setNewCategoryName('');
        setShowAddCategory(false);
      } else {
        alert(data.error || 'Failed to create category');
      }
    } catch (error) { alert('Failed to create category'); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      const res = await fetch(`/api/v1/admin/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.filter(c => c.id !== id));
        if (categoryId === id) setCategoryId('');
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (error) { alert('Failed to delete category'); }
  };

  const handleAddCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const res = await fetch('/api/v1/admin/collections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      });
      const data = await res.json();
      if (data.success) {
        setCollections([...collections, data.data]);
        setCollectionId(data.data.id);
        setNewCollectionName('');
        setShowAddCollection(false);
      } else {
        alert(data.error || 'Failed to create collection');
      }
    } catch (error) { alert('Failed to create collection'); }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      const res = await fetch(`/api/v1/admin/collections?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCollections(collections.filter(c => c.id !== id));
        if (collectionId === id) setCollectionId('');
      } else {
        alert(data.error || 'Failed to delete collection');
      }
    } catch (error) { alert('Failed to delete collection'); }
  };

  const handleAddColor = async () => {
    if (!newColorName.trim()) return;
    try {
      const res = await fetch('/api/v1/admin/colors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newColorName, hexCode: newColorHex }),
      });
      const data = await res.json();
      if (data.success) {
        setColors([...colors, data.data]);
        setSelectedColors([...selectedColors, data.data.id]);
        setNewColorName('');
        setNewColorHex('#808080');
        setShowAddColor(false);
      } else {
        alert(data.error || 'Failed to create color');
      }
    } catch (error) { alert('Failed to create color'); }
  };

  const handleDeleteColor = async (id: string) => {
    if (!confirm('Delete this color?')) return;
    try {
      const res = await fetch(`/api/v1/admin/colors?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setColors(colors.filter(c => c.id !== id));
        setSelectedColors(selectedColors.filter(cid => cid !== id));
      } else {
        alert(data.error || 'Failed to delete color');
      }
    } catch (error) { alert('Failed to delete color'); }
  };

  const generateVariants = () => {
    const variants: any[] = [];
    for (const colorId of selectedColors) {
      for (const sizeId of selectedSizes) {
        const color = colors.find(c => c.id === colorId);
        const size = sizes.find(s => s.id === sizeId);
        if (color && size) {
          variants.push({
            colorId, sizeId, colorName: color.name, sizeName: size.name,
            sku: `${articleNumber}-${color.name.substring(0, 3).toUpperCase()}-${size.name}`,
            stock: parseInt(defaultStock) || 500,
          });
        }
      }
    }
    return variants;
  };

  const handleSubmit = async () => {
    if (!articleNumber || !categoryId || !basePrice) {
      alert('Please fill in all required fields (Article Number, Category, Base Price)');
      return;
    }
    if (selectedColors.length === 0 || selectedSizes.length === 0) {
      alert('Please select at least one color and one size');
      return;
    }

    setLoading(true);
    try {
      const slug = generateSlug(articleNumber);
      const variants = generateVariants();
      const res = await fetch('/api/v1/admin/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleNumber, name: name || null, slug,
          description: description || null,
          shirtStyle: shirtStyle || null, dupattaStyle: dupattaStyle || null, trouserStyle: trouserStyle || null,
          categoryId, collectionId: collectionId || null,
          basePrice: parseFloat(basePrice), variants,
        }),
      });
      const data = await res.json();
      if (data.success) { alert('Product created successfully'); router.push('/admin/products'); }
      else { alert(data.error || 'Failed to create product'); }
    } catch (error) { alert('Failed to create product'); }
    finally { setLoading(false); }
  };

  const previewVariants = generateVariants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/products" className="text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New Product</h1>
            <p className="text-slate-400 text-sm">Create a new wholesale product</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" /><span>{loading ? 'Creating...' : 'Create Product'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Article Number *</label>
                  <input type="text" value={articleNumber} onChange={(e) => setArticleNumber(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="ART-1001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Base Price (Rs.) *</label>
                  <input type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Product Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="Product description..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Shirt Style & Material</label>
                  <input type="text" value={shirtStyle} onChange={(e) => setShirtStyle(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Cotton Kurta" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Dupatta Style & Material</label>
                  <input type="text" value={dupattaStyle} onChange={(e) => setDupattaStyle(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Chiffon Dupatta" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Trouser Style & Material</label>
                  <input type="text" value={trouserStyle} onChange={(e) => setTrouserStyle(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="e.g. Cambric Trouser" />
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">Category *</label>
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center space-x-1"><Plus className="w-3 h-3" /><span>Add</span></button>
                    {categoryId && <button type="button" onClick={() => handleDeleteCategory(categoryId)} className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"><Trash2 className="w-3 h-3" /><span>Delete</span></button>}
                  </div>
                </div>
                {showAddCategory && (
                  <div className="flex items-center space-x-2 mb-2">
                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()} className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="New category name" />
                    <button type="button" onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Save</button>
                    <button type="button" onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Select category</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>

              {/* Collection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">Collection</label>
                  <div className="flex items-center space-x-2">
                    <button type="button" onClick={() => setShowAddCollection(!showAddCollection)} className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center space-x-1"><Plus className="w-3 h-3" /><span>Add</span></button>
                    {collectionId && <button type="button" onClick={() => handleDeleteCollection(collectionId)} className="text-red-400 hover:text-red-300 text-xs flex items-center space-x-1"><Trash2 className="w-3 h-3" /><span>Delete</span></button>}
                  </div>
                </div>
                {showAddCollection && (
                  <div className="flex items-center space-x-2 mb-2">
                    <input type="text" value={newCollectionName} onChange={(e) => setNewCollectionName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCollection()} className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="New collection name" />
                    <button type="button" onClick={handleAddCollection} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Save</button>
                    <button type="button" onClick={() => { setShowAddCollection(false); setNewCollectionName(''); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Select collection</option>
                  {collections.map((col) => (<option key={col.id} value={col.id}>{col.name}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Variant Matrix */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Variant Matrix</h2>

            {/* Colors with swatches */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-slate-300">Select Colors *</label>
                <button type="button" onClick={() => setShowAddColor(!showAddColor)} className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center space-x-1"><Plus className="w-3 h-3" /><span>Add Color</span></button>
              </div>
              {showAddColor && (
                <div className="flex items-center space-x-2 mb-3 bg-slate-800/50 rounded-lg p-3">
                  <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <input type="text" value={newColorName} onChange={(e) => setNewColorName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddColor()} className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" placeholder="Color name" />
                  <button type="button" onClick={handleAddColor} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium">Add</button>
                  <button type="button" onClick={() => { setShowAddColor(false); setNewColorName(''); setNewColorHex('#808080'); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <div key={color.id} className="relative group">
                    <button type="button" onClick={() => toggleColor(color.id)} className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedColors.includes(color.id) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                      <div className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: color.hexCode }} />
                      <span>{color.name}</span>
                    </button>
                    <button type="button" onClick={() => handleDeleteColor(color.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-300 mb-3">Select Sizes *</label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button key={size.id} type="button" onClick={() => toggleSize(size.id)} className={`px-3 py-2 rounded-lg text-sm transition-colors ${selectedSizes.includes(size.id) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>{size.name}</button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-300 mb-2">Default Stock per Variant</label>
              <input type="number" value={defaultStock} onChange={(e) => setDefaultStock(e.target.value)} className="w-32 bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500" min="0" />
            </div>

            {previewVariants.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-3">Preview ({previewVariants.length} variants)</label>
                <div className="bg-slate-950/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-slate-400"><th className="text-left pb-2 font-medium">SKU</th><th className="text-left pb-2 font-medium">Color</th><th className="text-left pb-2 font-medium">Size</th><th className="text-right pb-2 font-medium">Stock</th></tr></thead>
                    <tbody>{previewVariants.map((v, idx) => (<tr key={idx} className="border-t border-slate-800/50"><td className="py-2 text-slate-300 font-mono">{v.sku}</td><td className="py-2 text-slate-300">{v.colorName}</td><td className="py-2 text-slate-300">{v.sizeName}</td><td className="py-2 text-right text-emerald-400">{v.stock}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Colors Selected</span><span className="text-slate-300">{selectedColors.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Sizes Selected</span><span className="text-slate-300">{selectedSizes.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total Variants</span><span className="text-emerald-400 font-bold">{previewVariants.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Total Stock</span><span className="text-emerald-400">{previewVariants.reduce((sum, v) => sum + v.stock, 0).toLocaleString()}</span></div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tips</h2>
            <ul className="text-xs text-slate-400 space-y-2">
              <li>• Slug auto-generates from Article Number</li>
              <li>• Select colors and sizes to auto-generate variants</li>
              <li>• SKU format: ARTICLE-COLOR-SIZE</li>
              <li>• Add images after creating the product</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
