'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2, X, CheckCircle, AlertCircle, Shield, Users, DollarSign, Award, Eye, ShoppingCart, CreditCard } from 'lucide-react';

interface SalesUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface Permissions {
  canProcessOrders: boolean;
  canDispatchOrders: boolean;
  canManageTiers: boolean;
  canChangePaymentTerms: boolean;
}

interface Assignment {
  id: string;
  customerId: string;
  companyName: string;
  contactName: string;
  phone: string;
  city: string;
  status: string;
}

interface Commission {
  id: string;
  rate: number;
  bonus: number;
  period: string;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

interface UnassignedCustomer {
  id: string;
  companyName: string;
  contactName: string;
  city: string;
}

interface Reports {
  totalOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  averageOrderValue: number;
}

type Tab = 'overview' | 'permissions' | 'assignments' | 'commissions' | 'reports';

export default function SalesUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User
  const [user, setUser] = useState<SalesUserDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  // Permissions
  const [permissions, setPermissions] = useState<Permissions>({
    canProcessOrders: false,
    canDispatchOrders: false,
    canManageTiers: false,
    canChangePaymentTerms: false,
  });

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<UnassignedCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [addingAssignment, setAddingAssignment] = useState(false);

  // Commissions
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commissionRate, setCommissionRate] = useState('');
  const [commissionBonus, setCommissionBonus] = useState('');
  const [commissionPeriod, setCommissionPeriod] = useState('MONTHLY');
  const [addingCommission, setAddingCommission] = useState(false);

  // Reports
  const [reports, setReports] = useState<Reports | null>(null);

  useEffect(() => {
    fetchUserDetails();
    fetchPermissions();
    fetchAssignments();
    fetchCommissions();
    fetchReports();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      const res = await fetch(`/api/v1/admin/sales/${id}`);
      const data = await res.json();
      if (data.success) {
        const u = data.data.salesUser;
        setUser(u);
        setFormFirstName(u.firstName);
        setFormLastName(u.lastName);
        setFormEmail(u.email);
        setFormPhone(u.phone || '');
        setFormStatus(u.status);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/permissions`);
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data.permissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/assignments`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.data.assignments || []);
      }
      // Also fetch unassigned customers
      const custRes = await fetch('/api/v1/admin/customers');
      const custData = await custRes.json();
      if (custData.success) {
        const assignedIds = (data.data.assignments || []).map((a: any) => a.customerId);
        const allCustomers = Array.isArray(custData.data) ? custData.data : (custData.data.customers || []);
        setUnassignedCustomers(allCustomers.filter((c: any) => !assignedIds.includes(c.id)));
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchCommissions = async () => {
    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/commissions`);
      const data = await res.json();
      if (data.success) {
        setCommissions(data.data.commissions);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/v1/sales/reports`);
      const data = await res.json();
      if (data.success) {
        setReports(data.data.reports || data.data || null);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleUpdateUser = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formFirstName,
          lastName: formLastName,
          email: formEmail,
          phone: formPhone || null,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('User updated successfully');
        setEditMode(false);
        fetchUserDetails();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setErrorMessage('Failed to update user');
    }
  };

  const handleUpdatePermissions = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Permissions updated successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setErrorMessage('Failed to update permissions');
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedCustomerId) return;
    setAddingAssignment(true);

    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomerId }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Customer assigned successfully');
        setSelectedCustomerId('');
        fetchAssignments();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to assign customer');
      }
    } catch (error) {
      console.error('Error adding assignment:', error);
      setErrorMessage('Failed to assign customer');
    } finally {
      setAddingAssignment(false);
    }
  };

  const handleRemoveAssignment = async (customerId: string) => {
    if (!confirm('Remove this customer assignment?')) return;

    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/assignments`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Customer removed from assignments');
        fetchAssignments();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to remove assignment');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      setErrorMessage('Failed to remove assignment');
    }
  };

  const handleAddCommission = async () => {
    if (!commissionRate) return;
    setAddingCommission(true);

    try {
      const res = await fetch(`/api/v1/admin/sales/${id}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rate: parseFloat(commissionRate),
          bonus: parseFloat(commissionBonus) || 0,
          period: commissionPeriod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Commission added successfully');
        setCommissionRate('');
        setCommissionBonus('');
        fetchCommissions();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to add commission');
      }
    } catch (error) {
      console.error('Error adding commission:', error);
      setErrorMessage('Failed to add commission');
    } finally {
      setAddingCommission(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Sales user not found</p>
        <Link href="/admin/sales" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
          Back to sales
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'permissions', label: 'Permissions', icon: Shield },
    { key: 'assignments', label: 'Customer Assignments', icon: Users },
    { key: 'commissions', label: 'Commissions', icon: DollarSign },
    { key: 'reports', label: 'Reports', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/sales" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
            <p className="text-slate-400 text-sm">{user.email}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          user.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
        }`}>
          {user.status}
        </span>
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

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center space-x-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">User Information</h2>
                <button
                  onClick={() => {
                    if (editMode) {
                      setEditMode(false);
                    } else {
                      setEditMode(true);
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleUpdateUser}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                    <p className="text-slate-500 text-xs mb-1">Full Name</p>
                    <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                    <p className="text-slate-500 text-xs mb-1">Email</p>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                    <p className="text-slate-500 text-xs mb-1">Phone</p>
                    <p className="text-white font-medium">{user.phone || '—'}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                    <p className="text-slate-500 text-xs mb-1">Status</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {user.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-500 text-xs">Assigned Customers</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{assignments.length}</p>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-500 text-xs">Total Orders</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{reports?.totalOrders || 0}</p>
                </div>
                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-500 text-xs">Total Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-white">Rs.{reports?.totalRevenue?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Permissions</h2>
                <button
                  onClick={handleUpdatePermissions}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Permissions</span>
                </button>
              </div>

              <div className="space-y-4">
                {([
                  { key: 'canProcessOrders' as const, label: 'Process Orders', desc: 'Can view and process incoming orders' },
                  { key: 'canDispatchOrders' as const, label: 'Dispatch Orders', desc: 'Can mark orders as dispatched and update shipping' },
                  { key: 'canManageTiers' as const, label: 'Manage Tiers', desc: 'Can view and manage customer pricing tiers' },
                  { key: 'canChangePaymentTerms' as const, label: 'Change Payment Terms', desc: 'Can modify customer payment terms and credit limits' },
                ]).map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                    <div>
                      <p className="text-white font-medium text-sm">{perm.label}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{perm.desc}</p>
                    </div>
                    <button
                      onClick={() => setPermissions({ ...permissions, [perm.key]: !permissions[perm.key] })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        permissions[perm.key] ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        permissions[perm.key] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Customer Assignments</h2>

              {/* Assign new customer */}
              <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                <p className="text-sm font-medium text-white mb-3">Assign Customer</p>
                <div className="flex items-center space-x-3">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select a customer...</option>
                    {unassignedCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName} — {c.contactName}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddAssignment}
                    disabled={!selectedCustomerId || addingAssignment}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {addingAssignment ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </div>

              {/* Assigned list */}
              {assignments.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/30 rounded-lg">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No customers assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-white font-medium text-sm">{a.companyName}</p>
                          <p className="text-slate-500 text-xs">{a.contactName} • {a.city} • {a.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {a.status}
                        </span>
                        <button
                          onClick={() => handleRemoveAssignment(a.customerId)}
                          className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commissions Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Commissions</h2>

              {/* Add commission form */}
              <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                <p className="text-sm font-medium text-white mb-3">Add Commission</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(e.target.value)}
                      placeholder="e.g. 5"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Bonus (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={commissionBonus}
                      onChange={(e) => setCommissionBonus(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-2">Period</label>
                    <select
                      value={commissionPeriod}
                      onChange={(e) => setCommissionPeriod(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddCommission}
                      disabled={!commissionRate || addingCommission}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {addingCommission ? 'Adding...' : 'Add Commission'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Commissions list */}
              {commissions.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/30 rounded-lg">
                  <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No commissions configured</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between bg-slate-950/50 rounded-lg p-4 border border-slate-800/50">
                      <div className="flex items-center space-x-4">
                        <div className="bg-emerald-500/10 rounded-lg p-2">
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{c.rate}% Rate</p>
                          <p className="text-slate-500 text-xs">
                            Bonus: Rs.{c.bonus.toFixed(2)} • Period: {c.period}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs">Created</p>
                        <p className="text-slate-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-white">Reports Summary</h2>

              {reports ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800/50">
                    <div className="flex items-center space-x-2 mb-3">
                      <ShoppingCart className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-400 text-sm">Total Orders</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{reports.totalOrders}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800/50">
                    <div className="flex items-center space-x-2 mb-3">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <span className="text-slate-400 text-sm">Total Revenue</span>
                    </div>
                    <p className="text-3xl font-bold text-white">Rs.{reports.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800/50">
                    <div className="flex items-center space-x-2 mb-3">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span className="text-slate-400 text-sm">Pending Payments</span>
                    </div>
                    <p className="text-3xl font-bold text-white">Rs.{reports.pendingPayments.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-950/50 rounded-lg p-5 border border-slate-800/50">
                    <div className="flex items-center space-x-2 mb-3">
                      <Award className="w-5 h-5 text-indigo-400" />
                      <span className="text-slate-400 text-sm">Avg. Order Value</span>
                    </div>
                    <p className="text-3xl font-bold text-white">Rs.{reports.averageOrderValue.toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-950/30 rounded-lg">
                  <Eye className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No report data available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
