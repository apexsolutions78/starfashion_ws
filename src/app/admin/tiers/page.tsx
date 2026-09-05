'use client';

import { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, ShieldAlert, Plus, Trash2 } from 'lucide-react';

export default function AdminTiersPage() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/admin/pricing-tiers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTiers(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTierChange = (index: number, field: string, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleAddTier = () => {
    const nextMin = tiers.length > 0 ? Math.max(...tiers.map((t) => t.minQuantity)) + 30 : 30;
    setTiers([
      ...tiers,
      { name: `Tier ${tiers.length + 1} (${nextMin}+)`, minQuantity: nextMin, discountPercent: 15.0, active: true },
    ]);
  };

  const handleSaveTiers = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/admin/pricing-tiers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save tiers');
      }

      setTiers(data.data);
      setMessage('Configurable wholesale pricing tiers updated & logged to audit trail.');
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading pricing tier configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configurable Wholesale Pricing Tiers</h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure quantity thresholds and volume discount percentages. Applied automatically server-side.
          </p>
        </div>

        <button
          onClick={handleSaveTiers}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save & Log Changes'}</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-4 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tier Configuration Cards */}
      <div className="space-y-4">
        {tiers.map((tier, index) => (
          <div key={index} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tier Label Name
                </label>
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Min Qualifying Quantity (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={tier.minQuantity}
                  onChange={(e) => handleTierChange(index, 'minQuantity', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={tier.discountPercent}
                  onChange={(e) => handleTierChange(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2 md:pt-0">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.active !== false}
                  onChange={(e) => handleTierChange(index, 'active', e.target.checked)}
                  className="rounded border-slate-800 text-emerald-600 focus:ring-emerald-500 bg-slate-950"
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddTier}
        className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold text-slate-400 hover:text-white flex items-center justify-center space-x-2 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>Add New Pricing Tier</span>
      </button>
    </div>
  );
}
