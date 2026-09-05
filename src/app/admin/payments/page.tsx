'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle2, ArrowDownLeft } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/v1/admin/payments').then((r) => r.json()),
      fetch('/api/v1/admin/customers').then((r) => r.json()),
    ])
      .then(([payRes, custRes]) => {
        if (payRes.success) setPayments(payRes.data);
        if (custRes.success) {
          setCustomers(custRes.data);
          if (custRes.data.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(custRes.data[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: parseFloat(amount),
          paymentMethod,
          referenceNumber,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setMessage(`Payment of €${parseFloat(amount).toFixed(2)} recorded & posted to ledger.`);
      setShowModal(false);
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      fetchData();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading payments ledger...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Record Customer Payments</h1>
          <p className="text-slate-400 text-xs mt-1">Post payment receipts to customer ledgers and settle open invoices.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {message && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl p-4 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-bold text-white">Record Payment Receipt</h3>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Customer Company</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Amount (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bank Ref / Transaction ID</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TR-998822"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Payment to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Records Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-500 uppercase font-semibold text-[10px]">
              <th className="text-left py-3 px-4">Payment #</th>
              <th className="text-left py-3 px-4">Customer Company</th>
              <th className="text-left py-3 px-4">Method & Ref</th>
              <th className="text-right py-3 px-4">Amount</th>
              <th className="text-right py-3 px-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/50">
                <td className="py-3 px-4 font-bold text-white">{p.paymentNumber}</td>
                <td className="py-3 px-4 text-slate-300">{p.customer?.companyName}</td>
                <td className="py-3 px-4 text-slate-400">
                  {p.paymentMethod} {p.referenceNumber && `(${p.referenceNumber})`}
                </td>
                <td className="py-3 px-4 text-right font-bold text-emerald-400">€{p.amount.toFixed(2)}</td>
                <td className="py-3 px-4 text-right text-slate-500">{new Date(p.paymentDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
