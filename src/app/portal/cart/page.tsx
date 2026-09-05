'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowRight, Tag, ShieldAlert, CheckCircle2, CreditCard, Upload, X } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCart = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/cart').then((res) => res.json()),
      fetch('/api/v1/auth/me').then((res) => res.json()),
    ]).then(([cartData, userData]) => {
      if (cartData.success) {
        setCartData(cartData.data);
      }
      if (userData.success) {
        setCustomerInfo(userData.data.customerCompany);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemoveItem = async (variantId: string) => {
    await fetch('/api/v1/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ variantId, quantity: 0 }] }),
    });
    fetchCart();
  };

  const isDueOnOrder = customerInfo?.paymentTermsId === 'term-due-on-order';
  const requiresFullPayment = isDueOnOrder && customerInfo?.creditLimit === 0;

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setOrderError(null);

    // If customer requires full payment, show payment form first
    if (requiresFullPayment && !showPayment) {
      setSubmitting(false);
      setShowPayment(true);
      return;
    }

    try {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Wholesale portal order' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit order');
      }

      setCreatedOrderId(data.data.id);
      setOrderSuccess(true);
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!createdOrderId || !paymentAmount) return;

    setSubmittingPayment(true);
    setPaymentError(null);

    try {
      const formData = new FormData();
      formData.append('orderId', createdOrderId);
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

      setPaymentSuccess(true);
      setTimeout(() => {
        router.push('/portal/orders');
      }, 2000);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setPaymentError('Screenshot must be less than 5MB');
        return;
      }
      setPaymentScreenshot(file);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Calculating wholesale quote...</div>;
  }

  const quote = cartData?.quote;
  const lineItems = quote?.lineItems || [];
  const totalAmount = quote?.netSubtotal || 0;

  // Payment Success View
  if (paymentSuccess) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Submitted!</h3>
        <p className="text-slate-500 text-sm">Your payment is pending verification. Redirecting to orders...</p>
      </div>
    );
  }

  // Order Success with Payment Option
  if (orderSuccess && createdOrderId) {
    return (
      <div className="space-y-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Order Submitted Successfully!</h3>
          <p className="text-slate-500 text-sm">Your order has been placed and is pending confirmation.</p>
        </div>

        {requiresFullPayment && !paymentSuccess ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h4 className="text-base font-bold text-slate-900 mb-4">Submit Payment</h4>
            <p className="text-slate-500 text-sm mb-4">
              You can submit your payment now. The payment will be verified by our team.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/portal/orders')}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-3 rounded-xl transition-all"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setShowPayment(true)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>Submit Payment</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-slate-900">Payment Details</h4>
              <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
                {paymentError}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500">Order Total:</span>
                  <span className="font-bold text-slate-900">Rs.{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Amount to Pay (Rs.) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-slate-400 mt-1">Balance remaining: Rs.{(totalAmount - parseFloat(paymentAmount || '0')).toFixed(2)}</p>
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
                disabled={submittingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPayment ? 'Submitting Payment...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Wholesale Cart Review</h1>
          <p className="text-slate-500 text-sm mt-1">Review server-calculated volume discounts and submit order.</p>
        </div>
      </div>

      {orderError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{orderError}</span>
        </div>
      )}

      {lineItems.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Your cart is empty</h3>
          <p className="text-slate-400 text-xs mt-1">Browse the catalogue and add items to generate a wholesale quote.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Itemized Order Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-semibold text-[11px]">
                    <th className="text-left py-3 px-4">Article / Variant</th>
                    <th className="text-center py-3 px-4">Base Unit Price</th>
                    <th className="text-center py-3 px-4">Qty</th>
                    <th className="text-right py-3 px-4">Line Gross</th>
                    <th className="text-right py-3 px-4">Discount</th>
                    <th className="text-right py-3 px-4">Line Net</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item: any) => (
                    <tr key={item.variantId} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.productName}</div>
                        <div className="text-[11px] text-slate-400">
                          SKU: {item.sku} | Color: {item.colorName} | Size: {item.sizeName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">Rs.{item.baseUnitPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-500">Rs.{item.lineGross.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                        {item.lineDiscount > 0 ? `-Rs.${item.lineDiscount.toFixed(2)}` : 'Rs.0.00'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">Rs.{item.lineNet.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.variantId)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Quote & Tier Summary Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-5">
              <h3 className="text-base font-bold tracking-tight border-b border-slate-800 pb-3">
                Order Quote Summary
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Qualifying Physical Units:</span>
                  <strong className="text-white font-bold">{quote.qualifyingQty} items</strong>
                </div>

                <div className="flex justify-between text-slate-300">
                  <span>Gross Merchandise Subtotal:</span>
                  <span>Rs.{quote.grossSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>
                    Volume Tier Discount ({quote.discountPercent}%):
                  </span>
                  <span>-Rs.{quote.discountTotal.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between text-base font-bold">
                  <span>Net Merchandise Total:</span>
                  <span className="text-indigo-400">Rs.{quote.netSubtotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Applied Tier Badge */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 font-bold">
                  <Tag className="w-4 h-4" />
                  <span>{quote.appliedTier ? quote.appliedTier.name : 'Standard Base Wholesale Tier'}</span>
                </div>
                {quote.nextTier ? (
                  <p className="text-slate-400 text-[11px]">
                    Add <strong className="text-white font-bold">{quote.unitsToNextTier}</strong> more units to reach{' '}
                    <span className="text-emerald-300 font-semibold">{quote.nextTier.name} ({quote.nextTier.discountPercent}% OFF)</span>!
                  </p>
                ) : (
                  <p className="text-emerald-400 text-[11px]">Maximum wholesale tier discount unlocked!</p>
                )}
              </div>

              {/* Payment Terms Warning */}
              {requiresFullPayment && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>100% Advance Payment Required</span>
                  </div>
                  <p className="text-amber-300/80 text-[11px]">
                    Your account requires full payment before order processing. Please submit payment after placing your order.
                  </p>
                </div>
              )}

              {isDueOnOrder && !requiresFullPayment && (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 text-xs space-y-1">
                  <div className="flex items-center space-x-2 text-slate-300 font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Terms: Due on Order</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className={`w-full font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 ${
                  requiresFullPayment
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                <span>{submitting ? 'Submitting Order...' : requiresFullPayment ? 'Pay & Submit Order' : 'Submit Wholesale Order'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
