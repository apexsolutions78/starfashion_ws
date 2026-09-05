'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Check, Tag, Info } from 'lucide-react';

export default function WholesaleCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loading, setLoading] = useState(true);

  // Matrix quantities state: { [variantId]: quantity }
  const [matrixQty, setMatrixQty] = useState<{ [variantId: string]: number }>({});
  const [submittingProduct, setSubmittingProduct] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCatalog = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedCollection) params.set('collectionId', selectedCollection);

    fetch(`/api/v1/catalog/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProducts(data.data.products);
          setCategories(data.data.categories);
          setCollections(data.data.collections);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCatalog();
  }, [search, selectedCategory, selectedCollection]);

  const handleQtyChange = (variantId: string, value: string) => {
    const qty = parseInt(value, 10);
    setMatrixQty((prev) => ({
      ...prev,
      [variantId]: isNaN(qty) || qty < 0 ? 0 : qty,
    }));
  };

  const handleAddToCart = async (product: any) => {
    setSubmittingProduct(product.id);
    const itemsToUpdate = product.variants
      .map((v: any) => ({
        variantId: v.id,
        quantity: matrixQty[v.id] || 0,
      }))
      .filter((item: any) => item.quantity > 0);

    if (itemsToUpdate.length === 0) {
      setSubmittingProduct(null);
      return;
    }

    try {
      const res = await fetch('/api/v1/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUpdate }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Added ${itemsToUpdate.reduce((s: number, i: any) => s + i.quantity, 0)} units of ${product.name} to cart.`);
        setTimeout(() => setSuccessMessage(null), 3000);
        // Refresh page header cart count
        window.location.reload();
      }
    } finally {
      setSubmittingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wholesale Catalogue</h1>
          <p className="text-slate-500 text-sm mt-1">Select article variants and quantities using the wholesale order matrix below.</p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Article # or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl p-4 flex items-center space-x-2">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Catalogue Cards List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading product catalogue...</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">No wholesale articles match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {products.map((product) => {
            // Group variants by Color name
            const colorsMap: { [colorName: string]: any[] } = {};
            const sizesSet = new Set<string>();

            product.variants.forEach((v: any) => {
              const colorName = v.color?.name || 'Default';
              const sizeName = v.size?.name || 'OS';
              if (!colorsMap[colorName]) colorsMap[colorName] = [];
              colorsMap[colorName].push(v);
              sizesSet.add(sizeName);
            });

            const uniqueSizes = Array.from(sizesSet);

            // Compute total matrix quantity entered for this product
            const totalProductQty = product.variants.reduce((sum: number, v: any) => {
              return sum + (matrixQty[v.id] || 0);
            }, 0);

            const totalProductGross = totalProductQty * product.basePrice;

            return (
              <div
                key={product.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {product.articleNumber}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900">{product.name}</h2>
                    </div>
                    <p className="text-slate-500 text-xs">{product.description}</p>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Base Wholesale Price</div>
                      <div className="text-xl font-extrabold text-slate-900">€{product.basePrice.toFixed(2)}</div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={totalProductQty === 0 || submittingProduct === product.id}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center space-x-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>
                        {submittingProduct === product.id
                          ? 'Adding...'
                          : `Add to Cart (${totalProductQty} units)`}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Wholesale Variant Matrix Entry Table */}
                <div className="p-6 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[11px]">
                        <th className="text-left py-2 px-3">Color</th>
                        {uniqueSizes.map((size) => (
                          <th key={size} className="text-center py-2 px-3 w-28">
                            Size: {size}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.keys(colorsMap).map((colorName) => (
                        <tr key={colorName} className="hover:bg-slate-50/80">
                          <td className="py-3 px-3 font-semibold text-slate-800 flex items-center space-x-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xs inline-block"
                              style={{ backgroundColor: colorsMap[colorName][0]?.color?.hexCode || '#ccc' }}
                            ></span>
                            <span>{colorName}</span>
                          </td>

                          {uniqueSizes.map((sizeName) => {
                            const variant = colorsMap[colorName].find((v: any) => v.size?.name === sizeName);
                            if (!variant) {
                              return <td key={sizeName} className="text-center py-3 px-3 text-slate-300">-</td>;
                            }

                            const stock = variant.inventory.reduce((sum: number, inv: any) => sum + (inv.onHand - inv.reserved), 0);
                            const currentQty = matrixQty[variant.id] || 0;

                            return (
                              <td key={sizeName} className="py-3 px-3 text-center">
                                <div className="flex flex-col items-center space-y-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={stock}
                                    value={currentQty === 0 ? '' : currentQty}
                                    placeholder="0"
                                    onChange={(e) => handleQtyChange(variant.id, e.target.value)}
                                    className="w-20 text-center bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                  <span className={`text-[10px] ${stock <= 10 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                                    Stock: {stock}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {totalProductQty > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs bg-indigo-50/50 p-3 rounded-xl">
                      <span className="text-indigo-900 font-medium">
                        Selected: <strong className="font-bold">{totalProductQty} units</strong> across variants
                      </span>
                      <span className="text-indigo-900 font-bold">
                        Article Merchandise Subtotal: €{totalProductGross.toFixed(2)} (before volume discount)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
