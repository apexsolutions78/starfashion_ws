'use client';

import { useState, useEffect } from 'react';
import { User, Building2, MapPin, Phone, Mail, CreditCard, Plus, Trash2, Edit2, Check, Star, X, Save } from 'lucide-react';

export default function PortalProfilePage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editAddr, setEditAddr] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addrForm, setAddrForm] = useState({
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

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session) {
          setSession(data.data);
          setAddresses(data.data.customerCompany?.addresses || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const resetAddrForm = () => {
    setAddrForm({ type: 'SHIPPING', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'Pakistan', contactName: '', contactPhone: '', isDefault: false });
    setEditAddr(null);
  };

  const handleOpenAddrForm = (addr?: any) => {
    if (addr) {
      setEditAddr(addr);
      setAddrForm({
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
      resetAddrForm();
    }
    setShowAddrForm(true);
  };

  const handleSaveAddr = async () => {
    if (!addrForm.addressLine1 || !addrForm.city || !addrForm.contactName) {
      setMessage({ type: 'error', text: 'Please fill in address, city, and contact name' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const method = editAddr ? 'PUT' : 'POST';
      const body = editAddr ? { ...addrForm, id: editAddr.id } : addrForm;

      const res = await fetch('/api/v1/addresses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');

      setMessage({ type: 'success', text: editAddr ? 'Address updated' : 'Address added' });
      setShowAddrForm(false);
      resetAddrForm();
      // Re-fetch addresses
      const meRes = await fetch('/api/v1/auth/me');
      const meData = await meRes.json();
      if (meData.success) {
        setAddresses(meData.data.customerCompany?.addresses || []);
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddr = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      const res = await fetch(`/api/v1/addresses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');
      setMessage({ type: 'success', text: 'Address deleted' });
      setAddresses(addresses.filter((a) => a.id !== id));
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading profile...</div>;
  }

  const company = session?.customerCompany;
  const user = session?.user;
  const shippingAddresses = addresses.filter((a) => a.type === 'SHIPPING');

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">View your account details and manage shipping addresses.</p>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Company Information</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Company Name</div>
                <div className="text-slate-900 font-medium">{company?.companyName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Contact Person</div>
                <div className="text-slate-900 font-medium">{company?.contactName || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Phone</div>
                <div className="text-slate-900 font-medium">{company?.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">City</div>
                <div className="text-slate-900 font-medium">{company?.city || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Country</div>
                <div className="text-slate-900 font-medium">{company?.country || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Account Status</div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${company?.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {company?.status || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* User Login Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span>Login Details</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Email</div>
                <div className="text-slate-900 font-medium flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user?.email || '—'}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Last Login</div>
                <div className="text-slate-900 font-medium">{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</div>
              </div>
            </div>
          </div>

          {/* Addresses Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-indigo-500" />
                <span>Shipping Addresses</span>
              </h2>
              <button
                onClick={() => handleOpenAddrForm()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {shippingAddresses.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No shipping addresses yet</p>
                <p className="text-slate-400 text-xs mt-1">Add an address so we know where to send your orders.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shippingAddresses.map((addr) => (
                  <div key={addr.id} className={`border rounded-xl p-4 relative ${addr.isDefault ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'}`}>
                    {addr.isDefault && (
                      <span className="absolute top-3 right-3 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Star className="w-3 h-3" />
                        <span>Default</span>
                      </span>
                    )}
                    <div className="font-semibold text-slate-900 text-sm">{addr.contactName}</div>
                    <div className="text-xs text-slate-500 mt-1">{addr.addressLine1}</div>
                    {addr.addressLine2 && <div className="text-xs text-slate-500">{addr.addressLine2}</div>}
                    <div className="text-xs text-slate-500">{addr.city}{addr.state ? `, ${addr.state}` : ''}{addr.postalCode ? ` ${addr.postalCode}` : ''}</div>
                    <div className="text-xs text-slate-500">{addr.country}</div>
                    {addr.contactPhone && <div className="text-xs text-slate-400 mt-1">Phone: {addr.contactPhone}</div>}
                    <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-slate-100">
                      <button onClick={() => handleOpenAddrForm(addr)} className="text-slate-400 hover:text-indigo-600 text-xs font-medium flex items-center space-x-1">
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button onClick={() => handleDeleteAddr(addr.id)} className="text-slate-400 hover:text-red-600 text-xs font-medium flex items-center space-x-1">
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Terms */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span>Payment Terms</span>
            </h2>
            {company?.paymentTerms ? (
              <div className="text-sm">
                <div className="text-slate-900 font-bold text-lg">{company.paymentTerms.name}</div>
                {company.paymentTerms.description && (
                  <div className="text-slate-500 text-xs mt-1">{company.paymentTerms.description}</div>
                )}
                <div className="text-xs text-slate-400 mt-2">Due within {company.paymentTerms.daysDue} days</div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No payment terms set</div>
            )}
          </div>

          {/* Credit Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Credit Limit</h2>
            <div className="text-2xl font-extrabold text-slate-900">Rs.{(company?.creditLimit || 0).toFixed(2)}</div>
            <div className="text-xs text-slate-400 mt-1">Maximum credit allowed</div>
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {showAddrForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editAddr ? 'Edit Address' : 'Add Address'}</h2>
              <button onClick={() => { setShowAddrForm(false); resetAddrForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name *</label>
                <input type="text" value={addrForm.contactName} onChange={(e) => setAddrForm({ ...addrForm, contactName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Receiver name" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 1 *</label>
                <input type="text" value={addrForm.addressLine1} onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Street address" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Address Line 2</label>
                <input type="text" value={addrForm.addressLine2} onChange={(e) => setAddrForm({ ...addrForm, addressLine2: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Apartment, suite, etc." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">City *</label>
                  <input type="text" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">State/Province</label>
                  <input type="text" value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Postal Code</label>
                  <input type="text" value={addrForm.postalCode} onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
                  <input type="text" value={addrForm.country} onChange={(e) => setAddrForm({ ...addrForm, country: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
                <input type="text" value={addrForm.contactPhone} onChange={(e) => setAddrForm({ ...addrForm, contactPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Phone for delivery" />
              </div>

              <div className="flex items-center space-x-2">
                <input type="checkbox" id="isDefault" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="isDefault" className="text-sm text-slate-600">Set as default shipping address</label>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end space-x-3">
              <button onClick={() => { setShowAddrForm(false); resetAddrForm(); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleSaveAddr} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center space-x-2">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : editAddr ? 'Update' : 'Add Address'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
