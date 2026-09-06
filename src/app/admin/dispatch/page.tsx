'use client';

import { useState, useEffect } from 'react';
import { Truck, Printer, CheckCircle, Eye, X, MapPin, Phone, User, Package } from 'lucide-react';

export default function AdminDispatchPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

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
    const shippingAddr = order.customer?.addresses?.find((a: any) => a.type === 'SHIPPING');
    const itemsHtml = order.items?.map((item: any, idx: number) => `
      <tr>
        <td style="border:1px solid #ccc;padding:8px 12px;text-align:center">${idx + 1}</td>
        <td style="border:1px solid #ccc;padding:8px 12px;font-family:monospace;font-size:12px">${item.skuSnapshot}</td>
        <td style="border:1px solid #ccc;padding:8px 12px">${item.productNameSnapshot}</td>
        <td style="border:1px solid #ccc;padding:8px 12px">${item.colorSnapshot} / ${item.sizeSnapshot}</td>
        <td style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-weight:bold">${item.quantity}</td>
      </tr>
    `).join('') || '';

    const shipToHtml = shippingAddr ? `
      <div style="font-weight:bold">${shippingAddr.contactName}</div>
      <div>${shippingAddr.addressLine1}</div>
      ${shippingAddr.addressLine2 ? `<div>${shippingAddr.addressLine2}</div>` : ''}
      <div>${shippingAddr.city}, ${shippingAddr.state || ''} ${shippingAddr.postalCode}</div>
      <div>${shippingAddr.country}</div>
      ${shippingAddr.contactPhone ? `<div>Phone: ${shippingAddr.contactPhone}</div>` : ''}
    ` : '<div style="color:#999;font-style:italic">No shipping address on file</div>';

    const html = `<!DOCTYPE html>
<html><head><title>Dispatch Note - ${order.orderNumber}</title></head>
<body style="margin:0;padding:32px;color:#000;font-size:14px;font-family:Arial,sans-serif;background:#fff">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px">
    <div>
      <img src="${window.location.origin}/logo.png" style="height:48px;margin-bottom:8px;filter:grayscale(1)" />
      <div style="font-size:12px;color:#666">StarFashion Wholesale</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:24px;font-weight:bold">DISPATCH NOTE</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Date: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
    <div>
      <div style="font-weight:bold;font-size:12px;color:#666;text-transform:uppercase;margin-bottom:4px">Order Number</div>
      <div style="font-size:18px;font-weight:bold">${order.orderNumber}</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:bold;font-size:12px;color:#666;text-transform:uppercase;margin-bottom:4px">Status</div>
      <div style="display:inline-block;background:#000;color:#fff;font-size:12px;font-weight:bold;padding:4px 12px;border-radius:4px">DISPATCHED</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;border:1px solid #ccc;border-radius:8px;padding:16px">
    <div>
      <div style="font-weight:bold;font-size:12px;color:#666;text-transform:uppercase;margin-bottom:8px">Bill To</div>
      <div style="font-weight:bold">${order.customer?.companyName}</div>
      <div>${order.customer?.contactName || ''}</div>
      <div>${order.customer?.phone || ''}</div>
      <div>${order.customer?.city || ''}, ${order.customer?.country || ''}</div>
    </div>
    <div>
      <div style="font-weight:bold;font-size:12px;color:#666;text-transform:uppercase;margin-bottom:8px">Ship To</div>
      ${shipToHtml}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:12px;font-weight:bold">#</th>
        <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:12px;font-weight:bold">SKU</th>
        <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:12px;font-weight:bold">Product</th>
        <th style="border:1px solid #ccc;padding:8px 12px;text-align:left;font-size:12px;font-weight:bold">Color / Size</th>
        <th style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-size:12px;font-weight:bold">Qty</th>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
    <tfoot>
      <tr style="background:#f9fafb">
        <td colspan="4" style="border:1px solid #ccc;padding:8px 12px;text-align:right;font-weight:bold;font-size:12px">Total Units</td>
        <td style="border:1px solid #ccc;padding:8px 12px;text-align:center;font-weight:bold">${order.qualifyingQty}</td>
      </tr>
    </tfoot>
  </table>

  <div style="border-top:2px solid #000;padding-top:16px;margin-top:32px;font-size:12px;color:#666;display:flex;justify-content:space-between">
    <div>StarFashion Wholesale — Dispatch Document</div>
    <div>Generated: ${new Date().toLocaleString()}</div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:40px">
    <div><div style="border-top:1px solid #000;margin-top:48px;padding-top:8px;font-size:12px;text-align:center;color:#666">Packed By</div></div>
    <div><div style="border-top:1px solid #000;margin-top:48px;padding-top:8px;font-size:12px;text-align:center;color:#666">Received By</div></div>
  </div>
</body></html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
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

    </>
  );
}
