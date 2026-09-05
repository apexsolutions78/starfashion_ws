'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Trash2, Package, Image as ImageIcon, Download, Upload, FileText, X, CheckCircle, AlertCircle, FolderPlus } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [pendingCsvContent, setPendingCsvContent] = useState<string | null>(null);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [categoryConfirmation, setCategoryConfirmation] = useState<'pending' | 'confirmed' | 'rejected' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/v1/admin/products/import/template');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'product-import-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Failed to download template');
    }
  };

  const handleImportClick = () => {
    setImportResult(null);
    setPendingCsvContent(null);
    setNewCategories([]);
    setCategoryConfirmation(null);
    setImportModal(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setNewCategories([]);
    setCategoryConfirmation(null);

    try {
      const csvContent = await file.text();
      setPendingCsvContent(csvContent);

      // First pass: check for new categories
      const res = await fetch('/api/v1/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent, createCategories: false }),
      });

      const data = await res.json();

      if (data.success && data.data?.requiresConfirmation) {
        // New categories found, show confirmation
        setNewCategories(data.data.newCategories);
        setCategoryConfirmation('pending');
      } else if (data.success) {
        // No new categories, proceed directly
        setImportResult(data.data);
        fetchProducts();
      } else {
        setImportResult({ error: data.error });
      }
    } catch (error) {
      console.error('Error importing products:', error);
      setImportResult({ error: 'Failed to import products' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCategoryConfirmation = async (confirmed: boolean) => {
    if (!pendingCsvContent) return;

    if (!confirmed) {
      setCategoryConfirmation('rejected');
      setImportResult({ error: 'Import cancelled. Please update your CSV file with existing categories.' });
      return;
    }

    setCategoryConfirmation('confirmed');
    setImporting(true);

    try {
      const res = await fetch('/api/v1/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent: pendingCsvContent, createCategories: true }),
      });

      const data = await res.json();

      if (data.success) {
        setImportResult(data.data);
        fetchProducts();
      } else {
        setImportResult({ error: data.error });
      }
    } catch (error) {
      console.error('Error importing products:', error);
      setImportResult({ error: 'Failed to import products' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your wholesale product catalogue</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadTemplate}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Template</span>
          </button>
          <button
            onClick={handleImportClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <Link
            href="/admin/products/new"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </Link>
        </div>
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

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Import Products from CSV</h3>
              <button
                onClick={() => {
                  setImportModal(false);
                  setImportResult(null);
                  setPendingCsvContent(null);
                  setNewCategories([]);
                  setCategoryConfirmation(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Show category confirmation if needed */}
            {categoryConfirmation === 'pending' && (
              <div className="mb-4">
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <FolderPlus className="w-5 h-5 text-indigo-400" />
                    <span className="text-indigo-400 font-medium">New Categories Detected</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3">
                    The following categories were found in your CSV file but don't exist in the system:
                  </p>
                  <div className="bg-slate-950/50 rounded-lg p-3 mb-4">
                    <ul className="space-y-1">
                      {newCategories.map((cat, idx) => (
                        <li key={idx} className="flex items-center space-x-2 text-sm">
                          <FolderPlus className="w-4 h-4 text-indigo-400" />
                          <span className="text-white font-medium">{cat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">
                    Would you like to create these categories automatically?
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleCategoryConfirmation(true)}
                      disabled={importing}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Yes, Create & Import</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCategoryConfirmation(false)}
                      disabled={importing}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      No, Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show upload area only if not waiting for confirmation */}
            {!importResult && categoryConfirmation !== 'pending' && (
              <>
                <div className="mb-4">
                  <p className="text-slate-400 text-sm mb-4">
                    Upload a CSV file with product data. Each row represents one variant (color + size combination).
                  </p>
                  <div className="bg-slate-950/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <FileText className="w-8 h-8 text-indigo-400" />
                      <div>
                        <p className="text-white text-sm font-medium">CSV File</p>
                        <p className="text-slate-500 text-xs">Format: .csv only</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center space-x-1"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download template first</span>
                    </button>
                  </div>

                  <label className="block w-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-6 text-center cursor-pointer transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={importing}
                    />
                    {importing ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mb-2"></div>
                        <span className="text-slate-400 text-sm">Processing CSV...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <span className="text-slate-400 text-sm">Click to select CSV file</span>
                      </>
                    )}
                  </label>
                </div>

                <div className="bg-slate-950/50 rounded-lg p-4">
                  <h4 className="text-white text-sm font-medium mb-2">Expected Format:</h4>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>• Article Number, Name, Slug, Description</p>
                    <p>• Category, Collection, Base Price</p>
                    <p>• Color, Size, SKU (optional), Stock</p>
                  </div>
                </div>
              </>
            )}

            {/* Show results */}
            {importResult && (
              <div>
                {importResult.error ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-400 font-medium">Import Failed</span>
                    </div>
                    <p className="text-red-300 text-sm">{importResult.error}</p>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Import Completed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">Total Rows:</span>
                        <span className="text-white ml-2 font-bold">{importResult.total}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Products Created:</span>
                        <span className="text-emerald-400 ml-2 font-bold">{importResult.created}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Variants Created:</span>
                        <span className="text-emerald-400 ml-2 font-bold">{importResult.variantsCreated}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Skipped:</span>
                        <span className="text-amber-400 ml-2 font-bold">{importResult.skipped}</span>
                      </div>
                    </div>

                    {importResult.categoriesCreated && importResult.categoriesCreated.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-emerald-500/30">
                        <p className="text-emerald-300 text-xs mb-1">New categories created:</p>
                        <div className="flex flex-wrap gap-1">
                          {importResult.categoriesCreated.map((cat: string, idx: number) => (
                            <span key={idx} className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-4">
                        <p className="text-slate-400 text-xs mb-2">Errors:</p>
                        <div className="bg-slate-950/50 rounded p-2 max-h-32 overflow-y-auto">
                          {importResult.errors.map((err: string, idx: number) => (
                            <p key={idx} className="text-red-300 text-xs">{err}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setImportModal(false);
                    setImportResult(null);
                    setPendingCsvContent(null);
                    setNewCategories([]);
                    setCategoryConfirmation(null);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
