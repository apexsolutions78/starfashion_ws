'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Package, DollarSign, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function SalesDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/sales/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDashboard(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading sales dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="py-20 text-center text-slate-400 text-sm">Failed to load dashboard data.</div>;
  }

  const stats = [
    {
      label: 'Assigned Customers',
      value: dashboard.totalCustomers ?? 0,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
    },
    {
      label: 'Total Orders',
      value: dashboard.totalOrders ?? 0,
      icon: Package,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      label: 'Total Revenue',
      value: `Rs.${(dashboard.totalRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      border: 'border-violet-200',
    },
    {
      label: 'Pending Payments',
      value: `Rs.${(dashboard.pendingPayments ?? 0).toFixed(2)}`,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Dashboard</h1>
        <p className="text-slate-500 text-xs mt-1">Overview of your assigned accounts, orders, and revenue.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`bg-white border ${stat.border} rounded-2xl p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</div>
              <div className={`text-2xl font-extrabold ${stat.color} mt-1`}>{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/sales/customers"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-8 h-8 text-indigo-500" />
            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">View My Customers</h3>
          <p className="text-slate-500 text-xs mt-1">Browse assigned customer accounts and their order history.</p>
        </Link>

        <Link
          href="/sales/reports"
          className="bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-emerald-500" />
            <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Sales Reports</h3>
          <p className="text-slate-500 text-xs mt-1">View detailed sales reports filtered by customer and date range.</p>
        </Link>
      </div>

      {/* Recent Orders */}
      {dashboard.recentOrders && dashboard.recentOrders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Orders from Assigned Customers</h3>
            <Link href="/sales/reports" className="text-xs text-indigo-600 hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase font-semibold text-[10px]">
                  <th className="text-left py-3 px-4">Order #</th>
                  <th className="text-left py-3 px-4">Customer</th>
                  <th className="text-center py-3 px-4">Status</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-right py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dashboard.recentOrders.slice(0, 5).map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{order.customer?.companyName || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        order.status === 'CONFIRMED' || order.status === 'DISPATCHED' || order.status === 'SHIPPED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : order.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">Rs.{order.grandTotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{new Date(order.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {dashboard.topCustomers && dashboard.topCustomers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Top Performing Customers</h3>
          </div>

          <div className="p-5">
            <div className="space-y-3">
              {dashboard.topCustomers.map((customer: any, idx: number) => (
                <div key={customer.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{customer.companyName}</div>
                      <div className="text-[11px] text-slate-400">{customer.totalOrders ?? 0} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">Rs.{(customer.totalSpent ?? 0).toFixed(2)}</div>
                    <div className="text-[11px] text-slate-400">total spent</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
