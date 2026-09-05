'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Building2, CreditCard } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading customer accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">Wholesale Customer Accounts</h1>
        <p className="text-slate-400 text-xs mt-1">Manage customer company accounts, payment terms, and approved credit limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">{c.companyName}</h3>
                  <div className="text-[11px] text-slate-400">Tax ID: {c.taxId || 'N/A'} | HRB: {c.registrationNumber || 'N/A'}</div>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {c.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 font-semibold mb-0.5">Credit Limit</div>
                <div className="font-extrabold text-white text-sm">€{c.creditLimit?.toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 font-semibold mb-0.5">Payment Terms</div>
                <div className="font-extrabold text-indigo-400 text-sm">{c.paymentTerms?.name || 'Net 30'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
