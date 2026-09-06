'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Plus, Calendar, Factory, AlertTriangle, CheckCircle, X, Save, ArrowUpDown } from 'lucide-react';

export default function AdminStockPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'production' | 'low'>('all');

  // Edit modal
  const [editVariant, setEditVariant] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInProduction, setEditInProduction] = useState(false);
  const [editEstDate, setEditEstDate] = useState('');
  const [editAddStock, setEditAddStock] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk stock
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkItems, setBulkItems] = useState<{ variantId: string; sku: string; productName: string; color: string; size: string; qty: number }[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const fetchVariants = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter === 'production') params.set('inProduction', 'true');
    if (filter === 'low') params.set('lowStock', 'true');

    fetch(`/api/v1/admin/stock?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVariants(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVariants();
  }, [filter]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchVariants(), 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleEdit = (variant: any) => {
    setEditVariant(variant);
    setEditInProduction(variant.inProduction);
    setEditEstDate(variant.estimatedAvailability ? new Date(variant.estimatedAvailability).toISOString().split('T')[0] : '');
    setEditAddStock('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editVariant) return;
    setSaving(true);

    try {
      const body: any = {
        inProduction: editInProduction,
        estimatedAvailability: editEstDate || null,
      };
      if (editAddStock && parseInt(editAddStock) > 0) {
        body.addStock = parseInt(editAddStock);
      }

      const res = await fetch(`/api/v1/admin/stock/${editVariant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update');

      setShowEditModal(false);
      setEditVariant(null);
      fetchVariants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Bulk search
  useEffect(() => {
    if (!showBulkModal || !bulkSearch) {
      setBulkResults([]);
      return;
    }
    const debounce = setTimeout(() => {
      fetch(`/api/v1/admin/stock?search=${bulkSearch}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setBulkResults(data.data);
        });
    }, 300);
    return () => clearTimeout(debounce);
  }, [bulkSearch, showBulkModal]);

  const handleAddBulkItem = (variant: any) => {
    if (bulkItems.find((i) => i.variantId === variant.id)) return;
    setBulkItems([
      ...bulkItems,
      {
        variantId: variant.id,
        sku: variant.sku,
        productName: variant.productName,
        color: variant.color?.name || '',
        size: variant.size?.name || '',
        qty: 0,
      },
    ]);
    setBulkSearch('');
    setBulkResults([]);
  };

  const handleBulkQtyChange = (variantId: string, qty: number) => {
    setBulkItems(bulkItems.map((i) => (i.variantId === variantId ? { ...i, qty } : i)));
  };

  const handleRemoveBulkItem = (variantId: string) => {
    setBulkItems(bulkItems.filter((i) => i.variantId !== variantId));
  };

  const handleBulkSubmit = async () => {
    const items = bulkItems.filter((i) => i.qty > 0);
    if (items.length === 0) return alert('Add quantities for at least one item');

    setBulkSaving(true);
    try {
      const res = await fetch('/api/v1/admin/stock/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.qty })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to add stock');

      alert(`Stock added to ${data.data.updated} variants`);
      setShowBulkModal(false);
      setBulkItems([]);
      fetchVariants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">New Stock</h1>
          <p className="text-slate-400 text-xs mt-1">Manage stock levels, mark articles in production, and set estimated availability dates.</p>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Bulk Add Stock</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by article, product name, SKU, or color..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'production', label: 'In Production' },
            { key: 'low', label: 'Low Stock' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-950/50 text-slate-400 uppercase font-semibold text-[10px]">
                <th className="text-left py-3 px-4">Article</th>
                <th className="text-left py-3 px-4">Product / Variant</th>
                <th className="text-center py-3 px-4">Stock</th>
                <th className="text-center py-3 px-4">Reserved</th>
                <th className="text-center py-3 px-4">Available</th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Est. Availability</th>
                <th className="text-center py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-400">Loading stock data...</td>
                </tr>
              ) : variants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-slate-500">No variants found</td>
                </tr>
              ) : (
                variants.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300">{v.articleNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{v.productName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono">{v.sku}</span>
                        <span>|</span>
                        {v.color && (
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full border border-slate-600" style={{ backgroundColor: v.color.hexCode }} />
                            <span>{v.color.name}</span>
                          </span>
                        )}
                        {v.size && <span>/ {v.size.name}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-300 font-bold">{v.totalStock}</td>
                    <td className="py-3 px-4 text-center text-amber-400">{v.totalReserved}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-bold ${v.available <= 0 ? 'text-red-400' : v.available <= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {v.available}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {v.inProduction ? (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                          <Factory className="w-3 h-3" />
                          <span>In Production</span>
                        </span>
                      ) : v.available <= 10 ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">In Stock</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400 text-[11px]">
                      {v.estimatedAvailability
                        ? new Date(v.estimatedAvailability).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleEdit(v)}
                        className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editVariant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Variant</h2>
                <p className="text-slate-400 text-xs mt-1">
                  {editVariant.articleNumber} | {editVariant.productName} | {editVariant.color?.name}/{editVariant.size?.name}
                </p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current Stock */}
              <div className="bg-slate-950/50 rounded-xl p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold mb-2">Current Stock</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-extrabold text-white">{editVariant.totalStock}</div>
                    <div className="text-[10px] text-slate-500">On Hand</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-amber-400">{editVariant.totalReserved}</div>
                    <div className="text-[10px] text-slate-500">Reserved</div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-emerald-400">{editVariant.available}</div>
                    <div className="text-[10px] text-slate-500">Available</div>
                  </div>
                </div>
              </div>

              {/* In Production */}
              <div className="flex items-center justify-between bg-slate-950/50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Factory className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-sm font-semibold text-white">In Production</div>
                    <div className="text-[11px] text-slate-400">Mark this variant as being manufactured</div>
                  </div>
                </div>
                <button
                  onClick={() => setEditInProduction(!editInProduction)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${editInProduction ? 'bg-blue-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${editInProduction ? 'left-5.5 translate-x-0' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Estimated Availability */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />
                  Estimated Availability Date
                </label>
                <input
                  type="date"
                  value={editEstDate}
                  onChange={(e) => setEditEstDate(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">When will this variant be available for sale?</p>
              </div>

              {/* Add Stock */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Add Stock (units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editAddStock}
                  onChange={(e) => setEditAddStock(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="0"
                />
                <p className="text-[11px] text-slate-500 mt-1">Units to add to current stock</p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Bulk Add Stock</h2>
                <p className="text-slate-400 text-xs mt-1">Search for variants and add stock quantities</p>
              </div>
              <button onClick={() => { setShowBulkModal(false); setBulkItems([]); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  placeholder="Search by article, product name, SKU, or color..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Search Results */}
              {bulkResults.length > 0 && (
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-800/50">
                  {bulkResults.slice(0, 10).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleAddBulkItem(v)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm text-white font-medium">{v.productName}</span>
                        <span className="text-xs text-slate-400 ml-2">{v.sku} | {v.color?.name}/{v.size?.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">Stock: {v.available}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Items */}
              {bulkItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Selected Variants ({bulkItems.length})</div>
                  {bulkItems.map((item) => (
                    <div key={item.variantId} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium">{item.productName}</div>
                        <div className="text-[10px] text-slate-400">{item.sku} | {item.color}/{item.size}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-400">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.qty || ''}
                          onChange={(e) => handleBulkQtyChange(item.variantId, parseInt(e.target.value) || 0)}
                          className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveBulkItem(item.variantId)}
                        className="text-slate-400 hover:text-red-400 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => { setShowBulkModal(false); setBulkItems([]); }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkSaving || bulkItems.filter((i) => i.qty > 0).length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <Package className="w-4 h-4" />
                <span>{bulkSaving ? 'Adding...' : `Add Stock to ${bulkItems.filter((i) => i.qty > 0).length} Variants`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
