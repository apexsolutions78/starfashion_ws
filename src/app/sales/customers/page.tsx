'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Search, Building2, MapPin, Phone, Mail, Package, DollarSign, CreditCard, ChevronRight } from 'lucide-react';

export default function SalesCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/v1/sales/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCustomers(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.companyName?.toLowerCase().includes(q) ||
      c.contactName?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading assigned customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Assigned Customers</h1>
        <p className="text-slate-500 text-xs mt-1">Manage your wholesale customer accounts and track their activity.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by company, contact, city, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No customers found</h3>
          <p className="text-slate-400 text-xs mt-1">
            {search ? 'Try a different search term.' : 'No customers are assigned to you yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase font-semibold text-[10px]">
                    <th className="text-left py-3 px-4">Company</th>
                    <th className="text-left py-3 px-4">Contact</th>
                    <th className="text-left py-3 px-4">City</th>
                    <th className="text-center py-3 px-4">Orders</th>
                    <th className="text-right py-3 px-4">Total Spent</th>
                    <th className="text-right py-3 px-4">Balance Due</th>
                    <th className="text-right py-3 px-4">Last Order</th>
                    <th className="text-center py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-900">{c.companyName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.contactName || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{c.city || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{c.totalOrders ?? 0}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">Rs.{(c.totalSpent ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${(c.balanceDue ?? 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          Rs.{(c.balanceDue ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link href={`/sales/customers?view=${c.id}`} className="text-indigo-500 hover:text-indigo-700 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <span className="font-bold text-slate-900 text-sm">{c.companyName}</span>
                  </div>
                  <Link href={`/sales/customers?view=${c.id}`} className="text-indigo-500 hover:text-indigo-700">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{c.contactName || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{c.city || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-600">{c.totalOrders ?? 0} orders</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-bold text-emerald-600">Rs.{(c.totalSpent ?? 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="text-xs">
                    <span className="text-slate-400">Balance: </span>
                    <span className={`font-bold ${(c.balanceDue ?? 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      Rs.{(c.balanceDue ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Last: {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-xs text-slate-400 text-center">
        Showing {filtered.length} of {customers.length} assigned customers
      </div>
    </div>
  );
}
