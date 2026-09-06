'use client';

import { useState, useEffect } from 'react';
import { Package, Eye, X, Check, AlertTriangle, Clock, Edit2, Save } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [holdDays, setHoldDays] = useState('7');
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

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

  const handleReviewOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/review`);
      const data = await res.json();
      if (data.success) {
        setReviewOrder(data.data);
        setReviewItems(data.data.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          availableStock: item.availableStock,
          productName: item.variant?.product?.name || item.productNameSnapshot,
          sku: item.variant?.sku || item.skuSnapshot,
          color: item.variant?.color?.name || item.colorSnapshot,
          size: item.variant?.size?.name || item.sizeSnapshot,
          basePrice: item.baseUnitPriceSnapshot,
          lineNet: item.lineNet,
        })));
        setHoldDays(data.data.holdDays?.toString() || '7');
        setAdminNotes(data.data.adminNotes || '');
        setShowReviewModal(true);
      }
    } catch (error) {
      console.error('Error fetching order for review:', error);
    }
  };

  const handleUpdateReviewItem = (itemId: string, newQty: number) => {
    setReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const discountPerUnit = item.basePrice * (reviewOrder.discountPercentSnapshot / 100);
        const lineNet = (item.basePrice - discountPerUnit) * newQty;
        return { ...item, quantity: newQty, lineNet };
      }
      return item;
    }));
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder) return;
    setReviewing(true);

    try {
      const res = await fetch(`/api/v1/admin/orders/${reviewOrder.id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: reviewItems.map(item => ({ id: item.id, quantity: item.quantity })),
          holdDays: parseInt(holdDays) || 7,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to review order');
      }

      setShowReviewModal(false);
      setReviewOrder(null);
      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReviewing(false);
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

  const handleRunAutoCancel = async () => {
    try {
      const res = await fetch('/api/v1/admin/orders/auto-cancel', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        alert(`Auto-cancel processed: ${data.data.cancelledCount} orders cancelled, ${data.data.expiringSoonCount} expiring soon`);
        fetchOrders();
      }
    } catch (error) {
      console.error('Error running auto-cancel:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ON_HOLD': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'ACCEPTED': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'SHIPPED': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const reviewTotal = reviewItems.reduce((sum, item) => sum + item.lineNet, 0);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading order queue...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Order Processing Queue</h1>
          <p className="text-slate-400 text-xs mt-1">Review orders, adjust quantities, set hold periods, and send to customers.</p>
        </div>
        <button
          onClick={handleRunAutoCancel}
          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-all"
        >
          Run Auto-Cancel Expired
        </button>
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
                  {order.status === 'ON_HOLD' && order.holdExpiresAt && (
                    <span className="text-orange-400 text-[11px] flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {new Date(order.holdExpiresAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Customer: <strong className="text-slate-200">{order.customer?.companyName}</strong> | {order.qualifyingQty} units
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
                    onClick={() => handleReviewOrder(order.id)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Review</span>
                  </button>
                )}

                {order.status === 'SUBMITTED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                    disabled={processingId === order.id}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}

                {order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PROCESSING')}
                    disabled={processingId === order.id}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {processingId === order.id ? '...' : 'Ship'}
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
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Order {selectedOrder.orderNumber}</h2>
                <p className="text-slate-400 text-xs mt-1">Status: <span className={`font-bold ${getStatusColor(selectedOrder.status)} px-2 py-0.5 rounded-full text-[10px]`}>{selectedOrder.status}</span></p>
              </div>
              <button onClick={() => setShowOrderDetail(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-white mb-3">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-400">Company:</span> <span className="text-white ml-2 font-medium">{selectedOrder.customer?.companyName}</span></div>
                <div><span className="text-slate-400">Qualifying Qty:</span> <span className="text-white ml-2 font-medium">{selectedOrder.qualifyingQty} units</span></div>
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Order Items</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2">SKU</th>
                    <th className="text-left py-2">Product</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {selectedOrder.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2 text-slate-300 font-mono">{item.variant?.sku || item.skuSnapshot}</td>
                      <td className="py-2 text-white">{item.variant?.product?.name || item.productNameSnapshot}</td>
                      <td className="py-2 text-center text-slate-300">{item.quantity}</td>
                      <td className="py-2 text-right text-slate-300">Rs.{(item.baseUnitPriceSnapshot || 0).toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">Rs.{(item.lineNet || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
              <button onClick={() => setShowOrderDetail(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Close</button>
              {selectedOrder.status === 'SUBMITTED' && (
                <button onClick={() => { setShowOrderDetail(false); handleReviewOrder(selectedOrder.id); }} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Review & Edit</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">Review Order {reviewOrder.orderNumber}</h2>
                <p className="text-slate-400 text-xs mt-1">Adjust quantities and set hold period before sending to customer</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Editable Items */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2">Product</th>
                    <th className="text-center py-2">Admin Qty</th>
                    <th className="text-center py-2">Stock Available</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {reviewItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 text-white">
                        <div className="font-semibold">{item.productName}</div>
                        <div className="text-[10px] text-slate-400">{item.sku} | {item.color}/{item.size}</div>
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateReviewItem(item.id, parseInt(e.target.value) || 1)}
                          className="w-20 bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${item.availableStock < item.quantity ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.availableStock}
                        </span>
                        {item.availableStock < item.quantity && (
                          <div className="text-[10px] text-red-400">Insufficient</div>
                        )}
                      </td>
                      <td className="py-2 text-right text-slate-300">Rs.{item.basePrice.toFixed(2)}</td>
                      <td className="py-2 text-right text-emerald-400 font-bold">Rs.{item.lineNet.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total */}
              <div className="bg-slate-950/50 rounded-xl p-4 flex justify-between text-sm">
                <span className="text-white font-bold">Order Total</span>
                <span className="text-emerald-400 font-bold text-lg">Rs.{reviewTotal.toFixed(2)}</span>
              </div>

              {/* Hold Days & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Hold Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={holdDays}
                    onChange={(e) => setHoldDays(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-amber-400 mt-1">Customer must pay within {holdDays} days or order auto-cancels</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Admin Notes (to customer)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Optional notes for the customer"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
              <button onClick={() => setShowReviewModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Cancel</button>
              <button
                onClick={handleSubmitReview}
                disabled={reviewing}
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{reviewing ? 'Sending...' : 'Send to Customer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
