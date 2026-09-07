'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Shield, X, Save, AlertCircle, CheckCircle, Key, ChevronDown, ChevronRight } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  _count?: { permissions: number };
  permissions?: { permission: { code: string } }[];
}

const PERMISSION_CATEGORIES: Record<string, { code: string; label: string }[]> = {
  Catalog: [
    { code: 'catalog:read', label: 'View catalog' },
    { code: 'catalog:write', label: 'Edit catalog' },
  ],
  Orders: [
    { code: 'orders:read', label: 'View orders' },
    { code: 'orders:process', label: 'Process orders' },
    { code: 'orders:dispatch', label: 'Dispatch orders' },
  ],
  Payments: [
    { code: 'payments:read', label: 'View payments' },
    { code: 'payments:record', label: 'Record payments' },
  ],
  'Pricing Tiers': [
    { code: 'tiers:read', label: 'View tiers' },
    { code: 'tiers:manage', label: 'Manage tiers' },
  ],
  Customers: [
    { code: 'customers:read', label: 'View customers' },
    { code: 'customers:manage', label: 'Manage customers' },
  ],
  Stock: [
    { code: 'stock:read', label: 'View stock' },
    { code: 'stock:manage', label: 'Manage stock' },
  ],
  Reports: [
    { code: 'reports:read', label: 'View reports' },
  ],
  Users: [
    { code: 'users:read', label: 'View users' },
    { code: 'users:manage', label: 'Manage users' },
  ],
  Sales: [
    { code: 'sales:read', label: 'View sales' },
    { code: 'sales:manage', label: 'Manage sales' },
  ],
  Settings: [
    { code: 'settings:read', label: 'View settings' },
    { code: 'settings:manage', label: 'Manage settings' },
  ],
};

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(Object.keys(PERMISSION_CATEGORIES)));
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/v1/admin/roles');
      const data = await res.json();
      if (data.success) {
        setRoles(data.data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
    setShowRoleModal(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    setErrorMessage(null);
    if (!roleName.trim()) {
      setErrorMessage('Role name is required');
      return;
    }

    try {
      const body: Record<string, string> = {
        name: roleName.trim(),
        description: roleDescription.trim(),
      };

      const res = await fetch(
        editingRole ? `/api/v1/admin/roles/${editingRole.id}` : '/api/v1/admin/roles',
        {
          method: editingRole ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (data.success) {
        setSuccessMessage(editingRole ? 'Role updated successfully' : 'Role created successfully');
        setShowRoleModal(false);
        fetchRoles();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to save role');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      setErrorMessage('Failed to save role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const res = await fetch(`/api/v1/admin/roles?id=${roleId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Role deleted successfully');
        fetchRoles();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      setErrorMessage('Failed to delete role');
    }
  };

  const openPermissionsModal = async (role: Role) => {
    setPermissionsRole(role);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/roles/${role.id}/permissions`);
      const data = await res.json();
      if (data.success) {
        const codes = new Set<string>(
          (data.data.permissions || []).map((p: { code: string }) => p.code)
        );
        setSelectedPermissions(codes);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setSelectedPermissions(new Set());
    }

    setShowPermissionsModal(true);
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const perms = PERMISSION_CATEGORIES[category].map((p) => p.code);
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = perms.every((c) => next.has(c));
      perms.forEach((c) => {
        if (allSelected) {
          next.delete(c);
        } else {
          next.add(c);
        }
      });
      return next;
    });
  };

  const toggleCategoryExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!permissionsRole) return;
    setSavingPermissions(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/v1/admin/roles/${permissionsRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionCodes: Array.from(selectedPermissions) }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMessage('Permissions updated successfully');
        setShowPermissionsModal(false);
        fetchRoles();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      setErrorMessage('Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
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
          <h1 className="text-2xl font-bold text-white">Roles & Permissions</h1>
          <p className="text-slate-400 text-sm mt-1">Manage roles and their access permissions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Role</span>
        </button>
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

      {/* Roles Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-xs">
                <th className="text-left py-3 px-4">Role Name</th>
                <th className="text-left py-3 px-4">Description</th>
                <th className="text-center py-3 px-4">Permissions</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-white">{role.name}</p>
                        {role.isSystem && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">SYSTEM</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">
                    {role.description || <span className="italic">No description</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                      {role._count?.permissions ?? role.permissions?.length ?? 0}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => openEditModal(role)}
                        className="text-slate-400 hover:text-indigo-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openPermissionsModal(role)}
                        className="text-slate-400 hover:text-emerald-400 p-1.5 rounded hover:bg-slate-800 transition-colors"
                        title="Manage Permissions"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {!role.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
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
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 text-sm">
                    No roles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Role Name *</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Warehouse Manager"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional description for this role"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRoleModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingRole ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal */}
      {showPermissionsModal && permissionsRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Manage Permissions</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Role: <span className="text-emerald-400 font-semibold">{permissionsRole.name}</span>
                </p>
              </div>
              <button onClick={() => setShowPermissionsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                const selectedCount = perms.filter((p) => selectedPermissions.has(p.code)).length;
                const allSelected = perms.every((p) => selectedPermissions.has(p.code));
                const isExpanded = expandedCategories.has(category);

                return (
                  <div key={category} className="border border-slate-800 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 bg-slate-950/50 cursor-pointer hover:bg-slate-800/50 transition-colors"
                      onClick={() => toggleCategoryExpand(category)}
                    >
                      <div className="flex items-center space-x-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="text-sm font-semibold text-white">{category}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {selectedCount}/{perms.length}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                          allSelected
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 space-y-2 border-t border-slate-800">
                        {perms.map((perm) => (
                          <label
                            key={perm.code}
                            className="flex items-center space-x-3 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm.code)}
                              onChange={() => togglePermission(perm.code)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <div className="flex-1">
                              <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                                {perm.label}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono ml-2">{perm.code}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={savingPermissions}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {savingPermissions ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Permissions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
