'use client';

import { useState, useEffect } from 'react';
import { Package, CheckCircle, Truck, FileText, Eye, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

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

  const handleViewOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
        setShowOrderDetail(true);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

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
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CONFIRMED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'SHIPPED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'DELIVERED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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
                  <span className={`border text-xs font-bold px-2.5 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Customer: <strong className="text-slate-200">{order.customer?.companyName}</strong> | {order.qualifyingQty} units
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(order.submittedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Grand Total</div>
                  <div className="text-lg font-extrabold text-emerald-400">Rs.{order.grandTotal.toFixed(2)}</div>
                </div>

                <button
                  onClick={() => handleViewOrder(order.id)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </button>

                {order.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                    disabled={processingId === order.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {processingId === order.id ? 'Processing...' : 'Confirm & Invoice'}
                  </button>
                )}

                {order.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                    disabled={processingId === order.id}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {processingId === order.id ? 'Processing...' : 'Cancel'}
                  </button>
                )}

                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                    disabled={processingId === order.id}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {processingId === order.id ? 'Processing...' : 'Mark Shipped'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      {showOrderDetail && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Order {selectedOrder.orderNumber}</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Submitted: {new Date(selectedOrder.submittedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setShowOrderDetail(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Company:</span>
                  <span className="text-white ml-2 font-medium">{selectedOrder.customer?.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className={`ml-2 font-medium ${getStatusColor(selectedOrder.status)} px-2 py-0.5 rounded-full text-xs`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Qualifying Qty:</span>
                  <span className="text-white ml-2 font-medium">{selectedOrder.qualifyingQty} units</span>
                </div>
                <div>
                  <span className="text-slate-400">Tier Discount:</span>
                  <span className="text-emerald-400 ml-2 font-medium">{selectedOrder.tierDiscountPct}%</span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3">Order Items</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Product</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Discount</th>
                    <th className="text-right py-2">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {selectedOrder.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2 text-slate-300 font-mono">{item.variant?.sku}</td>
                      <td className="py-2 text-white">
                        {item.variant?.product?.name}
                        <span className="text-slate-500 ml-1">({item.variant?.color?.name} / {item.variant?.size?.name})</span>
                      </td>
                      <td className="py-2 text-center text-slate-300">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-300">Rs.{(item.baseUnitPriceSnapshot || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-amber-400">-Rs.{(item.lineDiscount || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">Rs.{(item.lineNet || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-5">
              <div className="bg-slate-950/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gross Subtotal</span>
                  <span className="text-white">Rs.{(selectedOrder.grossSubtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tier Discount ({selectedOrder.discountPercentSnapshot || 0}%)</span>
                  <span className="text-amber-400">-Rs.{(selectedOrder.discountTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Subtotal</span>
                  <span className="text-white">Rs.{(selectedOrder.netSubtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800">
                  <span className="text-white font-bold">Grand Total</span>
                  <span className="text-emerald-400 font-bold text-lg">Rs.{(selectedOrder.grandTotal || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {selectedOrder.payments && selectedOrder.payments.length > 0 && (
              <div className="p-5 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-3">Payment History</h3>
                <div className="space-y-3">
                  {selectedOrder.payments.map((payment: any) => (
                    <div key={payment.id} className="bg-slate-950/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-bold text-sm">{payment.paymentNumber}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            payment.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                            payment.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                        <span className="text-emerald-400 font-bold">Rs.{payment.amount.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>Method: <span className="text-slate-300">{payment.paymentMethod}</span></div>
                        {payment.referenceNumber && (
                          <div>Reference: <span className="text-slate-300">{payment.referenceNumber}</span></div>
                        )}
                        <div>Submitted: {new Date(payment.createdAt).toLocaleString()}</div>
                        {payment.screenshotPath && (
                          <div className="mt-2">
                            <a
                              href={payment.screenshotPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 underline"
                            >
                              View Screenshot
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary */}
            {selectedOrder.payments && selectedOrder.payments.length > 0 && (
              <div className="p-5 border-t border-slate-800">
                <div className="bg-slate-950/50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Paid</span>
                    <span className="text-emerald-400 font-bold">
                      Rs.{(selectedOrder.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Outstanding Balance</span>
                    <span className={`font-bold ${
                      (selectedOrder.grandTotal - (selectedOrder.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0)) > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      Rs.{(selectedOrder.grandTotal - (selectedOrder.payments || []).reduce((sum: number, p: any) => sum + p.amount, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setShowOrderDetail(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
              {selectedOrder.status === 'SUBMITTED' && (
                <>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'CANCELLED');
                      setShowOrderDetail(false);
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel Order
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedOrder.id, 'CONFIRMED');
                      setShowOrderDetail(false);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Confirm & Invoice
                  </button>
                </>
              )}
              {selectedOrder.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedOrder.id, 'SHIPPED');
                    setShowOrderDetail(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Mark Shipped
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
