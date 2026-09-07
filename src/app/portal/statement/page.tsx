'use client';

import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, FileText, ArrowUpRight, ArrowDownLeft, Download } from 'lucide-react';

export default function CustomerStatementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handlePrint = () => {
    document.body.classList.add('print-mode');
    window.print();
    setTimeout(() => document.body.classList.remove('print-mode'), 500);
  };

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
    <div className="space-y-6 print-statement-root">
      {/* Print-only company header */}
      <div className="print-company-header hidden">
        <div className="print-company-header-inner">
          <img src="/logo-small.png" alt="StarFashion" className="print-logo" />
          <div>
            <h1 className="print-company-name">StarFashion Wholesale</h1>
            <p className="print-company-sub">Account & Customer Statement</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Customer Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">{company?.companyName} — Account Statement</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm no-print"
        >
          <Download className="w-4 h-4" />
          <span>Download PDF</span>
        </button>
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
          <div className="overflow-x-auto">
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
          </div>
        )}
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          /* Hide portal header/navigation */
          body.print-mode header,
          body.print-mode nav,
          body.print-mode .no-print {
            display: none !important;
          }

          body.print-mode main {
            padding: 0 !important;
            max-width: 100% !important;
          }

          body.print-mode {
            background: white !important;
          }

          /* Show print-only company header */
          body.print-mode .print-company-header {
            display: block !important;
          }

          /* Statement root spacing */
          body.print-mode .print-statement-root {
            padding: 20px;
          }

          /* Print company header */
          .print-company-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #1e293b;
          }

          .print-company-header-inner {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .print-logo {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            object-fit: contain;
          }

          .print-company-name {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.02em;
          }

          .print-company-sub {
            font-size: 12px;
            color: #64748b;
            margin: 2px 0 0 0;
          }

          /* Format metric cards for print */
          body.print-mode .grid > div {
            break-inside: avoid;
          }

          /* Format ledger table for print */
          body.print-mode table {
            border-collapse: collapse;
            width: 100%;
            font-size: 10px;
          }

          body.print-mode table thead tr {
            background: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body.print-mode table th {
            border: 1px solid #cbd5e1 !important;
            padding: 8px 12px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.05em;
          }

          body.print-mode table td {
            border: 1px solid #e2e8f0 !important;
            padding: 6px 12px;
            color: #1e293b;
          }

          body.print-mode table tbody tr:nth-child(even) {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Badge colors for print */
          body.print-mode .inline-flex {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Ensure colored cards print */
          body.print-mode .bg-slate-900 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body.print-mode .bg-white {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Page settings */
          @page {
            margin: 15mm;
            size: A4 portrait;
          }

          /* Force color printing for backgrounds */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}
