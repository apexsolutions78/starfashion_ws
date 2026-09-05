'use client';

import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, FileText, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function CustomerStatementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/account/statement')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading account statement...</div>;
  }

  const company = data?.company;
  const statement = data?.statement;
  const currentBalance = statement?.currentBalance || 0;
  const creditLimit = company?.creditLimit || 0;
  const availableCredit = Math.max(0, creditLimit - currentBalance);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Customer Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">{company?.companyName} — Account Statement</p>
        </div>
      </div>

      {/* Account Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Current Outstanding Balance
          </div>
          <div className="text-3xl font-extrabold text-indigo-400">Rs.{currentBalance.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2">Derived from posted ledger debits & credits</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Approved Credit Limit
          </div>
          <div className="text-3xl font-extrabold text-slate-900">Rs.{creditLimit.toFixed(2)}</div>
          <div className="text-xs text-emerald-600 font-semibold mt-2">
            Payment Terms: {company?.paymentTerms?.name || 'Net 30'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
            Available Credit Line
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">Rs.{availableCredit.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-2">Available for new wholesale orders</div>
        </div>
      </div>

      {/* Chronological Customer Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-sm">Customer Ledger Transactions</h2>
          <span className="text-xs text-slate-400">Double-Entry Immutability</span>
        </div>

        {statement?.transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No account transactions posted yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 uppercase font-semibold text-[11px]">
                <th className="text-left py-3 px-4">Posted Date</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Description / Reference</th>
                <th className="text-right py-3 px-4">Debit (+)</th>
                <th className="text-right py-3 px-4">Credit (-)</th>
                <th className="text-right py-3 px-4">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statement?.transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(tx.postedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    {tx.transactionType === 'INVOICE' ? (
                      <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> INVOICE
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        <ArrowDownLeft className="w-3 h-3 mr-1" /> {tx.transactionType}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{tx.notes || tx.referenceType}</td>
                  <td className="py-3 px-4 text-right font-semibold text-amber-700">
                    {tx.debit > 0 ? `Rs.${tx.debit.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                    {tx.credit > 0 ? `Rs.${tx.credit.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    Rs.{tx.runningBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
