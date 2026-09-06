'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit2, Check, Star, X } from 'lucide-react';

export default function PortalAddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAddr, setEditAddr] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    type: 'SHIPPING',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Pakistan',
    contactName: '',
    contactPhone: '',
    isDefault: false,
  });

  const fetchAddresses = () => {
    fetch('/api/v1/addresses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAddresses(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const resetForm = () => {
    setForm({ type: 'SHIPPING', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'Pakistan', contactName: '', contactPhone: '', isDefault: false });
    setEditAddr(null);
  };

  const handleOpenForm = (addr?: any) => {
    if (addr) {
      setEditAddr(addr);
      setForm({
        type: addr.type,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || '',
        city: addr.city,
        state: addr.state || '',
        postalCode: addr.postalCode,
        country: addr.country,
        contactName: addr.contactName,
        contactPhone: addr.contactPhone || '',
        isDefault: addr.isDefault,
      });
    } else {
      resetForm();
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.addressLine1 || !form.city || !form.postalCode || !form.contactName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const method = editAddr ? 'PUT' : 'POST';
      const body = editAddr ? { ...form, id: editAddr.id } : form;

      const res = await fetch('/api/v1/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');

      setMessage({ type: 'success', text: editAddr ? 'Address updated' : 'Address added' });
      setShowForm(false);
      resetForm();
      fetchAddresses();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;

    try {
      const res = await fetch(`/api/v1/addresses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');

      setMessage({ type: 'success', text: 'Address deleted' });
      fetchAddresses();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const shippingAddresses = addresses.filter((a) => a.type === 'SHIPPING');
  const billingAddresses = addresses.filter((a) => a.type === 'BILLING');

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading addresses...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shipping Addresses</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your shipping and billing addresses for order dispatch.</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Address</span>
        </button>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Shipping Addresses */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <span>Shipping Addresses</span>
        </h2>
        {shippingAddresses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No shipping addresses yet</p>
            <p className="text-slate-400 text-xs mt-1">Add a shipping address so we know where to send your orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shippingAddresses.map((addr) => (
              <div key={addr.id} className={`bg-white border rounded-xl p-4 relative ${addr.isDefault ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'}`}>
                {addr.isDefault && (
                  <span className="absolute top-3 right-3 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Star className="w-3 h-3" />
                    <span>Default</span>
                  </span>
                )}
                <div className="font-semibold text-slate-900 text-sm">{addr.contactName}</div>
                <div className="text-xs text-slate-500 mt-1">{addr.addressLine1}</div>
                {addr.addressLine2 && <div className="text-xs text-slate-500">{addr.addressLine2}</div>}
                <div className="text-xs text-slate-500">{addr.city}, {addr.state || ''} {addr.postalCode}</div>
                <div className="text-xs text-slate-500">{addr.country}</div>
                {addr.contactPhone && <div className="text-xs text-slate-400 mt-1">Phone: {addr.contactPhone}</div>}
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => handleOpenForm(addr)} className="text-slate-400 hover:text-indigo-600 text-xs font-medium flex items-center space-x-1">
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium flex items-center space-x-1">
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editAddr ? 'Edit Address' : 'Add Address'}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="SHIPPING">Shipping</option>
                  <option value="BILLING">Billing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Receiver name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={form.addressLine2}
                  onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Apartment, suite, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State/Province</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Phone for delivery"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isDefault" className="text-sm text-slate-600">Set as default {form.type.toLowerCase()} address</label>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end space-x-3">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : editAddr ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
