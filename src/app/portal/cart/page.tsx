'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowRight, Tag, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const fetchCart = () => {
    setLoading(true);
    fetch('/api/v1/cart')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCartData(data.data);
        }
      })
      .finally(() => setLoading(false));
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

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setOrderError(null);

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

      router.push(`/portal/orders`);
    } catch (err: any) {
      setOrderError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Calculating wholesale quote...</div>;
  }

  const quote = cartData?.quote;
  const lineItems = quote?.lineItems || [];

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

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{submitting ? 'Submitting Order...' : 'Submit Wholesale Order'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
