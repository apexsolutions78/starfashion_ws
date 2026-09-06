'use client';

import { useState, useEffect, useRef } from 'react';
import { Truck, Printer, CheckCircle, Eye, X, MapPin, Phone, User, Package } from 'lucide-react';

export default function AdminDispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchOrders = () => {
    setLoading(true);
    fetch('/api/v1/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.data.filter((o: any) => o.status === 'PROCESSING'));
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
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const handleDispatch = async (orderId: string) => {
    setDispatchingId(orderId);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISPATCHED' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to dispatch');
      fetchOrders();
      setShowDetail(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDispatchingId(null);
    }
  };

  const handlePrint = (order: any) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading dispatch queue...</div>;
  }

  return (
    <>
      {/* Screen view */}
      <div className="space-y-6 print:hidden">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center space-x-3 mb-1">
            <Truck className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Dispatch Queue</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">Orders confirmed and ready for dispatch. Review customer details, print dispatch documents, and mark as dispatched.</p>
        </div>

        {orders.length === 0 ? (
          <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-400">No orders ready for dispatch</h3>
            <p className="text-slate-500 text-xs mt-1">Confirmed orders will appear here when ready to ship.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-white text-base">{order.orderNumber}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">CONFIRMED</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span className="text-slate-300 font-medium">{order.customer?.companyName}</span>
                      <span className="mx-2">|</span>
                      {order.customer?.contactName && <span>{order.customer.contactName}</span>}
                      {order.customer?.phone && <span className="mx-2">|</span>}
                      {order.customer?.phone && <span>{order.customer.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
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

                    <button
                      onClick={() => handlePrint(order)}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => handleDispatch(order.id)}
                      disabled={dispatchingId === order.id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{dispatchingId === order.id ? '...' : 'Dispatch'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        {showDetail && selectedOrder && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white">Order {selectedOrder.orderNumber}</h2>
                  <p className="text-slate-400 text-xs mt-1">Dispatch Details</p>
                </div>
                <button onClick={() => setShowDetail(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Customer Details */}
                <div className="bg-slate-950/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span>Customer Details</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400">Company:</span> <span className="text-white ml-2 font-medium">{selectedOrder.customer?.companyName}</span></div>
                    <div><span className="text-slate-400">Contact:</span> <span className="text-white ml-2">{selectedOrder.customer?.contactName || '—'}</span></div>
                    <div><span className="text-slate-400">Phone:</span> <span className="text-white ml-2">{selectedOrder.customer?.phone || '—'}</span></div>
                    <div><span className="text-slate-400">Email:</span> <span className="text-white ml-2">{selectedOrder.customer?.customerUsers?.[0]?.user?.email || '—'}</span></div>
                  </div>
                </div>

                {/* Shipping Address */}
                {selectedOrder.customer?.addresses?.length > 0 && (
                  <div className="bg-slate-950/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <span>Shipping Address</span>
                    </h3>
                    {selectedOrder.customer.addresses.filter((a: any) => a.type === 'SHIPPING').map((addr: any) => (
                      <div key={addr.id} className="text-sm text-slate-300 space-y-0.5">
                        <div className="font-medium text-white">{addr.contactName}</div>
                        <div>{addr.addressLine1}</div>
                        {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                        <div>{addr.city}, {addr.state || ''} {addr.postalCode}</div>
                        <div>{addr.country}</div>
                        {addr.contactPhone && <div className="text-slate-400">Phone: {addr.contactPhone}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Items */}
                <div className="bg-slate-950/50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Order Items</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="text-left py-2">SKU</th>
                        <th className="text-left py-2">Product</th>
                        <th className="text-left py-2">Color/Size</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {selectedOrder.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-2 text-slate-300 font-mono">{item.skuSnapshot}</td>
                          <td className="py-2 text-white">{item.productNameSnapshot}</td>
                          <td className="py-2 text-slate-300">{item.colorSnapshot}/{item.sizeSnapshot}</td>
                          <td className="py-2 text-center text-white font-bold">{item.quantity}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">Rs.{item.lineNet.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="bg-slate-950/50 rounded-xl p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Qualifying Qty</span><span className="text-white">{selectedOrder.qualifyingQty} units</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Grand Total</span><span className="text-emerald-400 font-bold">Rs.{selectedOrder.grandTotal.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-800 flex justify-end space-x-3">
                <button onClick={() => setShowDetail(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Close</button>
                <button onClick={() => { setShowDetail(false); handlePrint(selectedOrder); }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"><Printer className="w-4 h-4" /><span>Print</span></button>
                <button onClick={() => handleDispatch(selectedOrder.id)} disabled={dispatchingId === selectedOrder.id} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-50"><Truck className="w-4 h-4" /><span>{dispatchingId === selectedOrder.id ? 'Dispatching...' : 'Mark Dispatched'}</span></button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable dispatch document */}
      {selectedOrder && (
        <div ref={printRef} className="hidden print:block">
          <DispatchDocument order={selectedOrder} />
        </div>
      )}
    </>
  );
}

function DispatchDocument({ order }: { order: any }) {
  const shippingAddr = order.customer?.addresses?.find((a: any) => a.type === 'SHIPPING');

  return (
    <div className="p-8 text-black text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <img src="/logo.png" alt="StarFashion" className="h-12 mb-2" style={{ filter: 'grayscale(1)' }} />
          <div className="text-xs text-gray-600">StarFashion Wholesale</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tracking-tight">DISPATCH NOTE</div>
          <div className="text-xs text-gray-600 mt-1">Date: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Order Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="font-bold text-xs text-gray-500 uppercase mb-1">Order Number</div>
          <div className="text-lg font-bold">{order.orderNumber}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-xs text-gray-500 uppercase mb-1">Status</div>
          <div className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded">DISPATCHED</div>
        </div>
      </div>

      {/* Customer & Shipping */}
      <div className="grid grid-cols-2 gap-6 mb-6 border border-gray-300 rounded p-4">
        <div>
          <div className="font-bold text-xs text-gray-500 uppercase mb-2">Bill To</div>
          <div className="font-bold">{order.customer?.companyName}</div>
          <div>{order.customer?.contactName}</div>
          <div>{order.customer?.phone}</div>
          <div>{order.customer?.city}, {order.customer?.country}</div>
        </div>
        <div>
          <div className="font-bold text-xs text-gray-500 uppercase mb-2">Ship To</div>
          {shippingAddr ? (
            <>
              <div className="font-bold">{shippingAddr.contactName}</div>
              <div>{shippingAddr.addressLine1}</div>
              {shippingAddr.addressLine2 && <div>{shippingAddr.addressLine2}</div>}
              <div>{shippingAddr.city}, {shippingAddr.state || ''} {shippingAddr.postalCode}</div>
              <div>{shippingAddr.country}</div>
              {shippingAddr.contactPhone && <div>Phone: {shippingAddr.contactPhone}</div>}
            </>
          ) : (
            <div className="text-gray-400 italic">No shipping address on file</div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">#</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">SKU</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Product</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold">Color / Size</th>
            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-bold">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={item.id}>
              <td className="border border-gray-300 px-3 py-2 text-center">{idx + 1}</td>
              <td className="border border-gray-300 px-3 py-2 font-mono text-xs">{item.skuSnapshot}</td>
              <td className="border border-gray-300 px-3 py-2">{item.productNameSnapshot}</td>
              <td className="border border-gray-300 px-3 py-2">{item.colorSnapshot} / {item.sizeSnapshot}</td>
              <td className="border border-gray-300 px-3 py-2 text-center font-bold">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={4} className="border border-gray-300 px-3 py-2 text-right font-bold text-xs">Total Units</td>
            <td className="border border-gray-300 px-3 py-2 text-center font-bold">{order.qualifyingQty}</td>
          </tr>
        </tfoot>
      </table>

      {/* Notes */}
      {order.adminNotes && (
        <div className="border border-gray-300 rounded p-3 mb-6">
          <div className="font-bold text-xs text-gray-500 uppercase mb-1">Admin Notes</div>
          <div className="text-xs">{order.adminNotes}</div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-black pt-4 mt-8 text-xs text-gray-500 flex justify-between">
        <div>StarFashion Wholesale — Dispatch Document</div>
        <div>Generated: {new Date().toLocaleString()}</div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 mt-10">
        <div>
          <div className="border-t border-black mt-12 pt-2 text-xs text-center text-gray-500">Packed By</div>
        </div>
        <div>
          <div className="border-t border-black mt-12 pt-2 text-xs text-center text-gray-500">Received By</div>
        </div>
      </div>
    </div>
  );
}
