'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface PermissionsContextType {
  permissions: string[];
  role: string | null;
  department: string | null;
  loading: boolean;
  hasPermission: (code: string) => boolean;
  refresh: () => void;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  role: null,
  department: null,
  loading: true,
  hasPermission: () => false,
  refresh: () => {},
});

export function usePermissions() {
  return useContext(PermissionsContext);
}

/** Render children only if user has the specified permission */
export function HasPermission({ permission, children, fallback }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const { hasPermission, loading } = usePermissions();
  if (loading) return null;
  if (!hasPermission(permission)) return fallback ? <>{fallback}</> : null;
  return <>{children}</>;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/my-permissions');
      const data = await res.json();
      if (data.success) {
        setPermissions(data.data.permissions || []);
        setRole(data.data.role || null);
        setDepartment(data.data.department || null);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((code: string) => {
    if (role === 'MASTER_ADMIN') return true;
    return permissions.includes(code);
  }, [permissions, role]);

  return (
    <PermissionsContext.Provider value={{ permissions, role, department, loading, hasPermission, refresh: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}
