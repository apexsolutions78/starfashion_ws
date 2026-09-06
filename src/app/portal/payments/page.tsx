'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Upload, CheckCircle2, X, DollarSign, FileText, Clock } from 'lucide-react';

interface OrderWithPayments {
  id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  submittedAt: string;
  payments: { amount: number; status: string }[];
}

export default function CustomerPaymentsPage() {
  const [orders, setOrders] = useState<OrderWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithPayments | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/v1/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (order: OrderWithPayments) => {
    const totalPaid = (order.payments || [])
      .filter(p => p.status !== 'VOID')
      .reduce((sum, p) => sum + p.amount, 0);
    return order.grandTotal - totalPaid;
  };

  const handleSelectOrder = (order: OrderWithPayments) => {
    const balance = getBalance(order);
    if (balance > 0) {
      setSelectedOrder(order);
      setPaymentAmount(balance.toFixed(2));
      setShowPaymentForm(true);
      setSuccess(false);
      setError(null);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Screenshot must be less than 5MB');
        return;
      }
      setPaymentScreenshot(file);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedOrder || !paymentAmount) return;

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('orderId', selectedOrder.id);
      formData.append('amount', paymentAmount);
      formData.append('paymentMethod', paymentMethod);
      formData.append('referenceNumber', referenceNumber);
      formData.append('notes', paymentNotes);
      if (paymentScreenshot) {
        formData.append('screenshot', paymentScreenshot);
      }

      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit payment');
      }

      setSuccess(true);
      fetchOrders();
      setTimeout(() => {
        setShowPaymentForm(false);
        setSelectedOrder(null);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading orders...</div>;
  }

  const ordersWithBalance = orders.filter(o => getBalance(o) > 0);
  const totalOutstanding = ordersWithBalance.reduce((sum, o) => sum + getBalance(o), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Portal</h1>
            <p className="text-slate-500 text-sm mt-0.5">Submit payments for your outstanding orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium">Total Orders</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-medium">Orders with Balance</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{ordersWithBalance.length}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <div className="text-xs text-red-600 font-medium">Total Outstanding</div>
            <div className="text-2xl font-bold text-red-600 mt-1">Rs.{totalOutstanding.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {ordersWithBalance.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">All Paid Up!</h3>
          <p className="text-slate-400 text-xs mt-1">You have no outstanding balances.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ordersWithBalance.map(order => {
            const balance = getBalance(order);
            const totalPaid = order.grandTotal - balance;
            const paidPercentage = (totalPaid / order.grandTotal) * 100;

            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-colors cursor-pointer"
                onClick={() => handleSelectOrder(order)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900">{order.orderNumber}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(order.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Outstanding</div>
                    <div className="text-lg font-bold text-red-600">Rs.{balance.toFixed(2)}</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order Total</span>
                    <span className="text-slate-900">Rs.{order.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Already Paid</span>
                    <span className="text-emerald-600">Rs.{totalPaid.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>Payment Progress</span>
                    <span>{paidPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${paidPercentage}%` }}
                    />
                  </div>
                </div>

                <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-2.5 rounded-xl transition-all">
                  Make Payment
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Payment</h3>
                <p className="text-xs text-slate-500">Order {selectedOrder.orderNumber}</p>
              </div>
              <button
                onClick={() => { setShowPaymentForm(false); setSelectedOrder(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-slate-900 mb-2">Payment Submitted!</h4>
                <p className="text-slate-500 text-sm">Your payment is pending verification.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                    {error}
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Order Total:</span>
                    <span className="font-bold text-slate-900">Rs.{selectedOrder.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <span className="font-bold text-red-600">Rs.{getBalance(selectedOrder).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Amount to Pay (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={getBalance(selectedOrder)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Transaction/Cheque reference"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Payment Screenshot</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-lg p-4 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    {paymentScreenshot ? (
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm text-slate-700">{paymentScreenshot.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">Click to upload payment screenshot</p>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="Additional payment notes"
                  />
                </div>

                <button
                  onClick={handleSubmitPayment}
                  disabled={submitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting Payment...' : 'Submit Payment'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
