'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, CreditCard, Sliders, Users, ArrowUpRight, DollarSign, AlertCircle } from 'lucide-react';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/orders').then((r) => r.json()),
      fetch('/api/v1/admin/payments').then((r) => r.json()),
      fetch('/api/v1/admin/customers').then((r) => r.json()),
    ])
      .then(([ordersRes, paymentsRes, customersRes]) => {
        if (ordersRes.success) setOrders(ordersRes.data);
        if (paymentsRes.success) setPayments(paymentsRes.data);
        if (customersRes.success) setCustomers(customersRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading admin dashboard...</div>;
  }

  const totalGrossSales = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const pendingOrders = orders.filter((o) => o.status === 'SUBMITTED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Executive Dashboard</h1>
        <p className="text-slate-400 text-xs mt-1">Operational queues, financial metrics, and quick admin actions.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Total Gross Sales</div>
          <div className="text-3xl font-extrabold text-emerald-400">Rs.{totalGrossSales.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-2">{orders.length} total orders submitted</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">New Orders Queue</div>
          <div className="text-3xl font-extrabold text-amber-400">{pendingOrders.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-2 font-semibold">Requires confirmation</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Payments Collected</div>
          <div className="text-3xl font-extrabold text-indigo-400">
            Rs.{payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">{payments.length} posted transactions</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Active Accounts</div>
          <div className="text-3xl font-extrabold text-white">{customers.length}</div>
          <div className="text-[11px] text-slate-500 mt-2">Wholesale companies</div>
        </div>
      </div>

      {/* Quick Action Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/orders"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 transition-all group shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <Package className="w-8 h-8 text-amber-400" />
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-white text-base">Process Orders</h3>
          <p className="text-slate-400 text-xs mt-1">Confirm submitted orders and auto-generate invoices.</p>
        </Link>

        <Link
          href="/admin/tiers"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 transition-all group shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <Sliders className="w-8 h-8 text-indigo-400" />
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-white text-base">Configurable Pricing Tiers</h3>
          <p className="text-slate-400 text-xs mt-1">Edit volume discount thresholds (30+=10%, 70+=12%, 101+=15%).</p>
        </Link>

        <Link
          href="/admin/payments"
          className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 transition-all group shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="font-bold text-white text-base">Record Customer Payments</h3>
          <p className="text-slate-400 text-xs mt-1">Post bank transfers and auto-allocate to open invoices.</p>
        </Link>
      </div>

      {/* Recent Orders Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Recent Order Submissions</h3>
          <Link href="/admin/orders" className="text-xs text-indigo-400 hover:underline">
            View All
          </Link>
        </div>

        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 uppercase font-semibold text-[10px]">
              <th className="text-left py-3 px-4">Order #</th>
              <th className="text-left py-3 px-4">Customer Company</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Net Total</th>
              <th className="text-right py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {orders.slice(0, 5).map((o) => (
              <tr key={o.id} className="hover:bg-slate-800/50">
                <td className="py-3 px-4 font-bold text-white">{o.orderNumber}</td>
                <td className="py-3 px-4 text-slate-300">{o.customer?.companyName}</td>
                <td className="py-3 px-4 text-center">
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-emerald-400">Rs.{o.grandTotal.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-slate-500">{new Date(o.submittedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
