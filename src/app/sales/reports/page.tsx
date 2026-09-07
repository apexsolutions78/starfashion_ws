'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Filter, DollarSign, CreditCard, AlertCircle, Package, Calendar } from 'lucide-react';

export default function SalesReportsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetch('/api/v1/sales/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCustomers(data.data);
          if (data.data.length > 0) {
            setSelectedCustomerId(data.data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) return;
    setFetching(true);

    const params = new URLSearchParams({ customerId: selectedCustomerId });
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    fetch(`/api/v1/sales/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setReportData(data.data);
      })
      .finally(() => setFetching(false));
  }, [selectedCustomerId, dateFrom, dateTo]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Reports</h1>
        <p className="text-slate-500 text-xs mt-1">View sales performance, orders, and payment reports for your customers.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {fetching ? (
        <div className="py-10 text-center text-slate-400 text-sm">Fetching report data...</div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Customer Info */}
          {selectedCustomer && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">Reporting for</div>
              <div className="text-lg font-bold text-slate-900">{selectedCustomer.companyName}</div>
              {selectedCustomer.city && (
                <div className="text-xs text-slate-500 mt-0.5">{selectedCustomer.city}, {selectedCustomer.country}</div>
              )}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Sales</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">Rs.{(reportData.totalSales ?? 0).toFixed(2)}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Payments</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">Rs.{(reportData.totalPayments ?? 0).toFixed(2)}</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Outstanding Balance</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1">Rs.{(reportData.outstandingBalance ?? 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Orders List */}
          {reportData.orders && reportData.orders.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center space-x-2">
                <Package className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-900 text-sm">Orders</h3>
                <span className="text-[11px] text-slate-400 ml-auto">{reportData.orders.length} orders</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="text-left py-3 px-4">Order #</th>
                      <th className="text-center py-3 px-4">Status</th>
                      <th className="text-right py-3 px-4">Total</th>
                      <th className="text-right py-3 px-4">Paid</th>
                      <th className="text-right py-3 px-4">Balance</th>
                      <th className="text-right py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.orders.map((order: any) => {
                      const paid = order.payments?.reduce((s: number, p: any) => s + p.amount, 0) ?? 0;
                      const balance = order.grandTotal - paid;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{order.orderNumber}</td>
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
                          <td className="py-3 px-4 text-right text-emerald-600 font-medium">Rs.{paid.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              Rs.{balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">{new Date(order.submittedAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payments List */}
          {reportData.payments && reportData.payments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-900 text-sm">Payments Received</h3>
                <span className="text-[11px] text-slate-400 ml-auto">{reportData.payments.length} payments</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="text-left py-3 px-4">Payment #</th>
                      <th className="text-left py-3 px-4">Method</th>
                      <th className="text-left py-3 px-4">Reference</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.paymentNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{p.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-500">{p.referenceNumber || '—'}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">Rs.{p.amount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-400">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!reportData.orders || reportData.orders.length === 0) && (!reportData.payments || reportData.payments.length === 0) && (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No data for this period</h3>
              <p className="text-slate-400 text-xs mt-1">Try selecting a different customer or date range.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
