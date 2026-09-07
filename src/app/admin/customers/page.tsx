'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Building2, CreditCard, Edit2, Save, X, FileText, Download, CheckCircle, AlertCircle, Check, Clock, UserCheck, MapPin, Phone, Mail } from 'lucide-react';
import { usePermissions, HasPermission } from '@/lib/permissions-context';

export default function AdminCustomersPage() {
  const { hasPermission } = usePermissions();
  const [customers, setCustomers] = useState<any[]>([]);
  const [pendingCustomers, setPendingCustomers] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editPaymentTermsId, setEditPaymentTermsId] = useState('');
  const [editMinOrderQty, setEditMinOrderQty] = useState('30');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<any>(null);
  const [approveCreditLimit, setApproveCreditLimit] = useState('0');
  const [approvePaymentTermsId, setApprovePaymentTermsId] = useState('term-due-on-order');
  const [approveMinOrderQty, setApproveMinOrderQty] = useState('30');

  // Statement state
  const [showStatement, setShowStatement] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<any>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchPendingCustomers();
    fetchPaymentTerms();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/v1/admin/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data.filter((c: any) => c.onboardingStatus === 'APPROVED'));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCustomers = async () => {
    try {
      const res = await fetch('/api/v1/admin/customers');
      const data = await res.json();
      if (data.success) {
        setPendingCustomers(data.data.filter((c: any) => c.onboardingStatus === 'PENDING_APPROVAL'));
      }
    } catch (error) {
      console.error('Error fetching pending customers:', error);
    }
  };

  const fetchPaymentTerms = async () => {
    setPaymentTerms([
      { id: 'term-due-on-order', name: 'Due on Order', days: 0 },
      { id: 'term-net-15', name: 'Net 15', days: 15 },
      { id: 'term-net-30', name: 'Net 30', days: 30 },
      { id: 'term-net-45', name: 'Net 45', days: 45 },
      { id: 'term-net-60', name: 'Net 60', days: 60 },
      { id: 'term-net-90', name: 'Net 90', days: 90 },
      { id: 'term-immediate', name: 'Cash on Delivery', days: 0 },
    ]);
  };

  const handleApprove = async (customerId: string) => {
    setApprovingId(customerId);
    try {
      const res = await fetch(`/api/v1/admin/customers/${customerId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditLimit: parseFloat(approveCreditLimit) || 0,
          paymentTermsId: approvePaymentTermsId,
          minOrderQty: parseInt(approveMinOrderQty) || 30,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Customer approved successfully');
        fetchCustomers();
        fetchPendingCustomers();
        setShowApproveModal(null);
        window.dispatchEvent(new Event('refreshcounts'));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to approve customer');
      }
    } catch (error) {
      console.error('Error approving customer:', error);
      setErrorMessage('Failed to approve customer');
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (customerId: string) => {
    setRejectingId(customerId);
    try {
      const res = await fetch(`/api/v1/admin/customers/${customerId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectReason || 'Registration rejected' }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Customer rejected');
        fetchPendingCustomers();
        setShowRejectModal(null);
        setRejectReason('');
        window.dispatchEvent(new Event('refreshcounts'));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to reject customer');
      }
    } catch (error) {
      console.error('Error rejecting customer:', error);
      setErrorMessage('Failed to reject customer');
    } finally {
      setRejectingId(null);
    }
  };

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer);
    setEditCreditLimit(customer.creditLimit?.toString() || '0');
    setEditPaymentTermsId(customer.paymentTermsId || 'term-net-30');
    setEditMinOrderQty(customer.minOrderQty?.toString() || '30');
    setEditStatus(customer.status || 'ACTIVE');
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/customers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCustomer.id,
          creditLimit: parseFloat(editCreditLimit) || 0,
          paymentTermsId: editPaymentTermsId,
          minOrderQty: parseInt(editMinOrderQty) || 30,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Customer updated successfully');
        setEditingCustomer(null);
        fetchCustomers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update customer');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setErrorMessage('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleViewStatement = async (customer: any) => {
    setStatementCustomer(customer);
    setShowStatement(true);
    setLoadingStatement(true);

    try {
      const res = await fetch(`/api/v1/account/statement?companyId=${customer.id}`);
      const data = await res.json();
      if (data.success) {
        setStatementData(data.data);
      }
    } catch (error) {
      console.error('Error fetching statement:', error);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleDownloadStatement = () => {
    if (!statementData || !statementCustomer) return;

    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const rows = statementData.transactions.map((tx: any) => [
      new Date(tx.createdAt).toLocaleDateString(),
      tx.description,
      tx.debit > 0 ? tx.debit.toFixed(2) : '',
      tx.credit > 0 ? tx.credit.toFixed(2) : '',
      tx.runningBalance.toFixed(2),
    ]);

    const csvContent = [
      `Statement for: ${statementCustomer.companyName}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      headers.join(','),
      ...rows.map((r: string[]) => r.join(',')),
      '',
      `Opening Balance: Rs.${statementData.openingBalance.toFixed(2)}`,
      `Closing Balance: Rs.${statementData.closingBalance.toFixed(2)}`,
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${statementCustomer.companyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading customer accounts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h1 className="text-2xl font-bold text-white tracking-tight">Wholesale Customer Accounts</h1>
        <p className="text-slate-400 text-xs mt-1">Manage customer company accounts, payment terms, and approved credit limits.</p>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-emerald-300 text-sm">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Pending Approvals Section */}
      {pendingCustomers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-amber-300">Pending Approvals ({pendingCustomers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCustomers.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-white">{c.companyName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PENDING
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{c.contactName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{c.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{c.city}, {c.country}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <HasPermission permission="customers:manage">
                    <button
                      onClick={() => {
                        setShowApproveModal(c);
                        setApproveCreditLimit('0');
                        setApprovePaymentTermsId('term-due-on-order');
                      }}
                      disabled={approvingId === c.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{approvingId === c.id ? 'Approving...' : 'Approve'}</span>
                    </button>
                  </HasPermission>
                  <HasPermission permission="customers:manage">
                    <button
                      onClick={() => setShowRejectModal(c.id)}
                      disabled={rejectingId === c.id}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center space-x-1 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </HasPermission>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Customers */}
      <div className="flex items-center space-x-2">
        <UserCheck className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white">Approved Customers ({customers.length})</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">{c.companyName}</h3>
                  <div className="text-[11px] text-slate-400">{c.contactName} | {c.city}, {c.country}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}>
                  {c.status}
                </span>
                <HasPermission permission="customers:manage">
                  <button
                    onClick={() => handleEditCustomer(c)}
                    className="text-slate-400 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </HasPermission>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 font-semibold mb-0.5">Credit Limit</div>
                <div className="font-extrabold text-white text-sm">Rs.{c.creditLimit?.toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 font-semibold mb-0.5">Payment Terms</div>
                <div className="font-extrabold text-indigo-400 text-sm">{c.paymentTerms?.name || 'Net 30'}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-500 font-semibold mb-0.5">Min Order Qty</div>
                <div className="font-extrabold text-amber-400 text-sm">{c.minOrderQty || 30} units</div>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleViewStatement(c)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Statement</span>
              </button>
              <button
                onClick={() => handleViewStatement(c)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ledger</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit {editingCustomer.companyName}</h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Payment Terms</label>
                <select
                  value={editPaymentTermsId}
                  onChange={(e) => setEditPaymentTermsId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {paymentTerms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Minimum Order Quantity (units)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={editMinOrderQty}
                  onChange={(e) => setEditMinOrderQty(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-slate-400 text-[11px] mt-1">Customer cannot place orders below this quantity.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingCustomer(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <HasPermission permission="customers:manage">
                <button
                  onClick={handleSaveCustomer}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </HasPermission>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Approve {showApproveModal.companyName}</h3>
              <button onClick={() => setShowApproveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 rounded-lg p-3 text-xs text-slate-400">
                <div>Contact: <span className="text-white">{showApproveModal.contactName}</span></div>
                <div>Phone: <span className="text-white">{showApproveModal.phone}</span></div>
                <div>Location: <span className="text-white">{showApproveModal.city}, {showApproveModal.country}</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Payment Terms</label>
                <select
                  value={approvePaymentTermsId}
                  onChange={(e) => setApprovePaymentTermsId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {paymentTerms.map((term) => (
                    <option key={term.id} value={term.id}>{term.name}</option>
                  ))}
                </select>
                {approvePaymentTermsId === 'term-due-on-order' && (
                  <p className="text-amber-400 text-[11px] mt-1">Customer must pay 100% advance before order processing</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Credit Limit (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={approveCreditLimit}
                  onChange={(e) => setApproveCreditLimit(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                {parseFloat(approveCreditLimit) === 0 && approvePaymentTermsId === 'term-due-on-order' && (
                  <p className="text-amber-400 text-[11px] mt-1">No credit - full payment required on every order</p>
                )}
                {parseFloat(approveCreditLimit) > 0 && (
                  <p className="text-emerald-400 text-[11px] mt-1">Customer can order up to Rs.{parseFloat(approveCreditLimit).toFixed(2)} on credit</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Minimum Order Quantity (units)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={approveMinOrderQty}
                  onChange={(e) => setApproveMinOrderQty(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
                <p className="text-slate-400 text-[11px] mt-1">Default: 30 units (Tier 1 minimum). Customer cannot place orders below this quantity.</p>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowApproveModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <HasPermission permission="customers:manage">
                <button
                  onClick={() => handleApprove(showApproveModal.id)}
                  disabled={approvingId === showApproveModal.id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{approvingId === showApproveModal.id ? 'Approving...' : 'Approve Customer'}</span>
                </button>
              </HasPermission>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Reject Customer</h3>
              <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-300 mb-2">Reason for Rejection</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-red-500"
                placeholder="Optional: Enter reason for rejection"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <HasPermission permission="customers:manage">
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={rejectingId === showRejectModal}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>{rejectingId === showRejectModal ? 'Rejecting...' : 'Reject'}</span>
                </button>
              </HasPermission>
            </div>
          </div>
        </div>
      )}

      {/* Statement Modal */}
      {showStatement && statementCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Account Statement</h3>
                <p className="text-slate-400 text-xs">{statementCustomer.companyName}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleDownloadStatement}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button onClick={() => setShowStatement(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loadingStatement ? (
                <div className="text-center py-10">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-slate-400 text-sm mt-3">Loading statement...</p>
                </div>
              ) : statementData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-950/50 rounded-lg p-3 text-center">
                      <div className="text-slate-500 text-xs">Opening Balance</div>
                      <div className="font-bold text-white">Rs.{statementData.openingBalance.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-3 text-center">
                      <div className="text-slate-500 text-xs">Total Debit</div>
                      <div className="font-bold text-amber-400">Rs.{statementData.totalDebit.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-950/50 rounded-lg p-3 text-center">
                      <div className="text-slate-500 text-xs">Closing Balance</div>
                      <div className="font-bold text-emerald-400">Rs.{statementData.closingBalance.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-right py-2">Debit</th>
                          <th className="text-right py-2">Credit</th>
                          <th className="text-right py-2">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {statementData.transactions.map((tx: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 text-slate-300">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-2 text-white">{tx.description}</td>
                            <td className="py-2 text-right text-amber-400">{tx.debit > 0 ? `Rs.${tx.debit.toFixed(2)}` : '-'}</td>
                            <td className="py-2 text-right text-emerald-400">{tx.credit > 0 ? `Rs.${tx.credit.toFixed(2)}` : '-'}</td>
                            <td className="py-2 text-right text-slate-300 font-medium">Rs.{tx.runningBalance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-10">No statement data available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
