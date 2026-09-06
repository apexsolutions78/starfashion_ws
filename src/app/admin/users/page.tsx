'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Users, Shield, ShieldCheck, User, X, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('USER');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setCurrentUserRole(data.data.currentUserRole);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormPassword('');
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormRole('USER');
    setFormStatus('ACTIVE');
    setShowModal(true);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormPassword('');
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormPhone(user.phone || '');
    setFormRole(user.role || 'USER');
    setFormStatus(user.status);
    setShowModal(true);
  };

  const handleSave = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formFirstName || !formLastName || !formEmail) {
      setErrorMessage('First name, last name, and email are required');
      return;
    }

    if (!editingUser && !formPassword) {
      setErrorMessage('Password is required for new users');
      return;
    }

    try {
      const body: any = {
        id: editingUser?.id,
        email: formEmail,
        firstName: formFirstName,
        lastName: formLastName,
        phone: formPhone || null,
        role: formRole,
        status: formStatus,
      };
      if (formPassword) {
        body.password = formPassword;
      }

      const res = await fetch('/api/v1/admin/users', {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(editingUser ? 'User updated successfully' : 'User created successfully');
        setShowModal(false);
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setErrorMessage('Failed to save user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const res = await fetch(`/api/v1/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('User deleted successfully');
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setErrorMessage('Failed to delete user');
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'MASTER_ADMIN':
        return (
          <span className="flex items-center space-x-1 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>MASTER ADMIN</span>
          </span>
        );
      case 'ADMIN':
        return (
          <span className="flex items-center space-x-1 bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <Shield className="w-3 h-3" />
            <span>ADMIN</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <User className="w-3 h-3" />
            <span>USER</span>
          </span>
        );
    }
  };

  const canEditUser = (user: AdminUser) => {
    if (currentUserRole !== 'MASTER_ADMIN') return false;
    if (user.role === 'MASTER_ADMIN' && currentUserRole !== 'MASTER_ADMIN') return false;
    return true;
  };

  const canDeleteUser = (user: AdminUser) => {
    if (currentUserRole !== 'MASTER_ADMIN') return false;
    if (user.role === 'MASTER_ADMIN') return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-1">Manage admin users and their permissions</p>
        </div>
        {currentUserRole === 'MASTER_ADMIN' && (
          <button
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        )}
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

      {/* Role Legend */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Permission Levels</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-amber-400">Master Admin</p>
              <p className="text-slate-400">Full access. Can manage all users and settings.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-indigo-400">Admin</p>
              <p className="text-slate-400">Full access except user management.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <User className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-slate-400">User</p>
              <p className="text-slate-400">Products only (Add, Edit).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-xs">
              <th className="text-left py-3 px-4">User</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Last Login</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-800/50">
                <td className="py-3 px-4">
                  <div>
                    <p className="font-semibold text-white">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </td>
                <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs text-slate-400">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {canEditUser(user) && (
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-slate-400 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteUser(user) && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">First Name *</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
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
                <label className="block text-xs font-medium text-slate-300 mb-2">Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="USER">User - Products only</option>
                  <option value="ADMIN">Admin - Full access</option>
                  <option value="MASTER_ADMIN">Master Admin - Full access + user management</option>
                </select>
              </div>

              {editingUser && (
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
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingUser ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
