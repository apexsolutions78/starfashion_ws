'use client';

import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Submitted</span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Confirmed</span>;
      case 'COMPLETED':
      case 'SHIPPED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading order history...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wholesale Order History</h1>
        <p className="text-slate-500 text-sm mt-1">Track submitted orders, inspect historical pricing snapshots, and access invoices.</p>
      </div>

      {orders.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No orders placed yet</h3>
          <p className="text-slate-400 text-xs mt-1">Your submitted wholesale orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      ORD
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900 text-base">{order.orderNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Submitted on {new Date(order.submittedAt).toLocaleDateString()} | {order.qualifyingQty} physical units
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Net Total</div>
                      <div className="text-lg font-extrabold text-slate-900">€{order.grandTotal.toFixed(2)}</div>
                    </div>

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      <span>Order Items (Immutable Pricing Snapshot)</span>
                      <span>Snapshot Tier Discount: {order.discountPercentSnapshot}%</span>
                    </div>

                    <table className="w-full text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 uppercase font-semibold text-[10px]">
                          <th className="text-left py-2.5 px-3">Article / Variant</th>
                          <th className="text-center py-2.5 px-3">Base Unit Price</th>
                          <th className="text-center py-2.5 px-3">Qty</th>
                          <th className="text-right py-2.5 px-3">Discount</th>
                          <th className="text-right py-2.5 px-3">Line Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{item.productNameSnapshot}</div>
                              <div className="text-[10px] text-slate-400">
                                Art #: {item.articleNumberSnapshot} | SKU: {item.skuSnapshot} | {item.colorSnapshot}/{item.sizeSnapshot}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-600">€{item.baseUnitPriceSnapshot.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">-€{item.lineDiscount.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">€{item.lineNet.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
