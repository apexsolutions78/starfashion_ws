'use client';

import { useState, useEffect } from 'react';
import { Package, CheckCircle, Truck, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrders = () => {
    fetch('/api/v1/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading order queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">Admin Order Processing Queue</h1>
        <p className="text-slate-400 text-xs mt-1">Review orders, confirm for fulfilment, and generate customer invoices.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
            <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white text-base">{order.orderNumber}</span>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Customer: <strong className="text-slate-200">{order.customer?.companyName}</strong> | {order.qualifyingQty} units
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Grand Total</div>
                  <div className="text-lg font-extrabold text-emerald-400">Rs.{order.grandTotal.toFixed(2)}</div>
                </div>

                {order.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                    disabled={processingId === order.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    Confirm & Invoiced
                  </button>
                )}

                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                    disabled={processingId === order.id}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    Mark Shipped
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
