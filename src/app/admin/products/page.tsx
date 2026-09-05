'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Eye, EyeOff, Package, Image as ImageIcon } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (categoryFilter) params.set('categoryId', categoryFilter);

      const res = await fetch(`/api/v1/admin/products?${params}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data.products);
        setCategories(data.data.categories);
        setCollections(data.data.collections);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter]);

  const handleDelete = async (productId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setProducts(products.filter(p => p.id !== productId));
        setDeleteModal(null);
      } else {
        alert(data.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const getStockInfo = (variants: any[]) => {
    let totalStock = 0;
    let totalReserved = 0;

    variants.forEach(variant => {
      variant.inventory.forEach((inv: any) => {
        totalStock += inv.onHand;
        totalReserved += inv.reserved;
      });
    });

    return { totalStock, totalReserved, available: totalStock - totalReserved };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your wholesale product catalogue</p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No products found</p>
          <Link
            href="/admin/products/new"
            className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block"
          >
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const stock = getStockInfo(product.variants);
            const primaryImage = product.images.find((img: any) => img.isPrimary) || product.images[0];

            return (
              <div key={product.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
                {/* Product Image */}
                <div className="h-48 bg-slate-800 relative">
                  {primaryImage ? (
                    <img
                      src={primaryImage.imagePath}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {product.images.length > 0 && (
                      <span className="bg-slate-900/80 text-slate-300 text-xs px-2 py-1 rounded-full">
                        {product.images.length} img
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{product.name}</h3>
                      <p className="text-slate-500 text-xs">{product.articleNumber}</p>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm">€{product.basePrice.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 mb-3">
                    <span className="bg-slate-800 px-2 py-0.5 rounded">{product.category?.name}</span>
                    {product.collection && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded">{product.collection.name}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs mb-4">
                    <div className="text-slate-400">
                      <span className="font-medium text-slate-300">{product.variants.length}</span> variants
                    </div>
                    <div className={stock.available > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                      <span className="font-medium">{stock.available}</span> in stock
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteModal(product.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="text-emerald-400 hover:text-emerald-300 text-xs font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>

                {/* Delete Modal */}
                {deleteModal === product.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
                      <h3 className="text-lg font-bold text-white mb-2">Delete Product</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Are you sure you want to delete <strong className="text-white">{product.name}</strong>? This action cannot be undone.
                      </p>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setDeleteModal(null)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
