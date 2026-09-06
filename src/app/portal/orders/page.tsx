'use client';

import { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, Bell, CreditCard, Upload, Truck } from 'lucide-react';

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [confirmAcceptId, setConfirmAcceptId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  // Payment modal state
  const [payOrder, setPayOrder] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payScreenshot, setPayScreenshot] = useState<File | null>(null);
  const [paying, setPaying] = useState(false);

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
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/orders/${orderId}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      setMessage({ type: 'success', text: 'Order cancelled successfully' });
      setConfirmCancelId(null);
      fetchOrders();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setCancellingId(null);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    setAcceptingId(orderId);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/orders/${orderId}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCEPT' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to accept order');
      }

      setMessage({ type: 'success', text: 'Order accepted! Please proceed with payment.' });
      setConfirmAcceptId(null);
      fetchOrders();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setAcceptingId(null);
    }
  };

  const handlePayOrder = async () => {
    if (!payOrder || !payAmount) return;
    setPaying(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('orderId', payOrder.id);
      formData.append('amount', payAmount);
      formData.append('paymentMethod', payMethod);
      if (payRef) formData.append('referenceNumber', payRef);
      if (payScreenshot) formData.append('screenshot', payScreenshot);

      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit payment');
      }

      setMessage({ type: 'success', text: 'Payment submitted! Order confirmed.' });
      setPayOrder(null);
      setPayAmount('');
      setPayRef('');
      setPayScreenshot(null);
      fetchOrders();
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setPaying(false);
    }
  };

  const getTimeRemaining = (holdExpiresAt: string) => {
    const diff = new Date(holdExpiresAt).getTime() - now;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Submitted</span>;
      case 'ON_HOLD':
        return <span className="bg-orange-100 text-orange-800 border border-orange-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1"><Clock className="w-3 h-3" /><span>On Hold</span></span>;
      case 'ACCEPTED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1"><Clock className="w-3 h-3" /><span>Awaiting Payment</span></span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Confirmed</span>;
      case 'PROCESSING':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Processing</span>;
      case 'DISPATCHED':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1"><Truck className="w-3 h-3" /><span>Dispatched</span></span>;
      case 'SHIPPED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Shipped</span>;
      case 'CANCELLED':
        return <span className="bg-red-100 text-red-800 border border-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">Cancelled</span>;
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
        <p className="text-slate-500 text-sm mt-1">Track submitted orders, review admin adjustments, and manage payments.</p>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

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
            const canCancel = order.status === 'SUBMITTED' || order.status === 'ON_HOLD';
            const isOnHold = order.status === 'ON_HOLD';
            const isAccepted = order.status === 'ACCEPTED';
            const timeLeft = isOnHold && order.holdExpiresAt ? getTimeRemaining(order.holdExpiresAt) : null;

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="flex items-center space-x-4 cursor-pointer flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      ORD
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900 text-base">{order.orderNumber}</span>
                        {getStatusBadge(order.status)}
                        {isOnHold && timeLeft && (
                          <span className="text-orange-600 text-[11px] font-semibold flex items-center space-x-1 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            <span>Pay in {timeLeft}</span>
                          </span>
                        )}
                        {isOnHold && !timeLeft && (
                          <span className="text-red-600 text-[11px] font-semibold bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Submitted on {new Date(order.submittedAt).toLocaleDateString()} | {order.qualifyingQty} physical units
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Grand Total</div>
                      <div className="text-lg font-extrabold text-slate-900">Rs.{order.grandTotal.toFixed(2)}</div>
                    </div>

                    {isOnHold && (
                      <div>
                        {confirmAcceptId === order.id ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-emerald-600 font-semibold mr-1">Accept?</span>
                            <button
                              onClick={() => handleAcceptOrder(order.id)}
                              disabled={acceptingId === order.id}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {acceptingId === order.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmAcceptId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmAcceptId(order.id); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Accept</span>
                          </button>
                        )}
                      </div>
                    )}

                    {canCancel && (
                      <div>
                        {confirmCancelId === order.id ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-red-600 font-semibold mr-1">Cancel?</span>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingId === order.id}
                              className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {cancellingId === order.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmCancelId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmCancelId(order.id); }}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}

                    {isAccepted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPayOrder(order); setPayAmount(order.grandTotal.toFixed(2)); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Now</span>
                      </button>
                    )}

                    <button onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                    {/* Admin Notes */}
                    {order.adminNotes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Bell className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold text-amber-800">Admin Notes</span>
                        </div>
                        <p className="text-sm text-amber-900">{order.adminNotes}</p>
                      </div>
                    )}

                    {/* Hold Timer */}
                    {isOnHold && order.holdExpiresAt && (
                      <div className={`rounded-xl p-4 ${timeLeft ? 'bg-orange-50 border border-orange-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center space-x-2">
                          <Clock className={`w-4 h-4 ${timeLeft ? 'text-orange-600' : 'text-red-600'}`} />
                          <span className={`text-xs font-semibold ${timeLeft ? 'text-orange-800' : 'text-red-800'}`}>
                            {timeLeft ? `Payment due in ${timeLeft} — order will auto-cancel if unpaid` : 'Hold period expired — order has been auto-cancelled'}
                          </span>
                        </div>
                      </div>
                    )}

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
                            <td className="py-2.5 px-3 text-center text-slate-600">Rs.{item.baseUnitPriceSnapshot.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">-Rs.{item.lineDiscount.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">Rs.{item.lineNet.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Payment Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal</span>
                        <span>Rs.{(order.grossSubtotal || 0).toFixed(2)}</span>
                      </div>
                      {(order.discountTotal || 0) > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600">
                          <span>Tier Discount ({order.discountPercentSnapshot}%)</span>
                          <span>-Rs.{order.discountTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-2">
                        <span>Grand Total</span>
                        <span>Rs.{order.grandTotal.toFixed(2)}</span>
                      </div>
                      {order.payments && order.payments.length > 0 && (
                        <div className="flex justify-between text-xs text-blue-600 border-t border-slate-100 pt-2">
                          <span>Paid</span>
                          <span>-Rs.{order.payments.reduce((s: number, p: any) => s + p.amount, 0).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {payOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Make Payment</h2>
                <p className="text-slate-500 text-xs mt-1">Order {payOrder.orderNumber}</p>
              </div>
              <button onClick={() => setPayOrder(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Grand Total</span>
                  <span className="font-bold text-slate-900">Rs.{payOrder.grandTotal.toFixed(2)}</span>
                </div>
                {payOrder.payments && payOrder.payments.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-500">Already Paid</span>
                      <span className="text-blue-600">-Rs.{payOrder.payments.reduce((s: number, p: any) => s + p.amount, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1 pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Balance Due</span>
                      <span className="font-bold text-red-600">Rs.{(payOrder.grandTotal - payOrder.payments.reduce((s: number, p: any) => s + p.amount, 0)).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Amount (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Transaction ID / Cheque #"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deposit Screenshot</label>
                <label className="flex items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPayScreenshot(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-500">{payScreenshot ? payScreenshot.name : 'Choose file'}</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setPayOrder(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePayOrder}
                disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>{paying ? 'Processing...' : 'Submit Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
