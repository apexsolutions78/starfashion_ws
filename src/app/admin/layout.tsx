'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Sliders,
  CreditCard,
  Users,
  ShieldAlert,
  LogOut,
  ShoppingBag,
  Tags,
  UserCog,
  UserPlus,
  Box,
  Truck,
  Contact,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [counts, setCounts] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session?.userType === 'ADMIN') {
          setSession(data.data.session);
          // Redirect SALES users to their portal
          if (data.data.session.role === 'SALES') {
            router.push('/sales/dashboard');
            return;
          }
          fetch('/api/v1/admin/profile')
            .then((res) => res.json())
            .then((profileData) => {
              if (profileData.success) {
                setUserRole(profileData.data.role);
              }
            });
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [pathname]);

  // Fetch sidebar badge counts
  useEffect(() => {
    const fetchCounts = () => {
      fetch('/api/v1/admin/counts')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setCounts(data.data);
        })
        .catch(() => {});
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);

    // Listen for refresh events from other pages
    const handleRefresh = () => fetchCounts();
    window.addEventListener('refreshcounts', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshcounts', handleRefresh);
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['MASTER_ADMIN', 'ADMIN', 'USER'], dot: null },
    { href: '/admin/products', label: 'Products', icon: Tags, roles: ['MASTER_ADMIN', 'ADMIN', 'USER'], dot: null },
    { href: '/admin/stock', label: 'New Stock', icon: Box, roles: ['MASTER_ADMIN'], dot: counts?.lowStock > 0 ? 'amber' : null, count: counts?.lowStock },
    { href: '/admin/orders', label: 'Order Processing', icon: Package, roles: ['MASTER_ADMIN', 'ADMIN'], dot: counts?.newOrders > 0 ? 'red' : null, count: counts?.newOrders },
    { href: '/admin/dispatch', label: 'Dispatch', icon: Truck, roles: ['MASTER_ADMIN', 'ADMIN'], dot: counts?.processingOrders > 0 ? 'green' : null, count: counts?.processingOrders },
    { href: '/admin/tiers', label: 'Pricing Tiers', icon: Sliders, roles: ['MASTER_ADMIN', 'ADMIN'], dot: null },
    { href: '/admin/payments', label: 'Record Payments', icon: CreditCard, roles: ['MASTER_ADMIN', 'ADMIN'], dot: counts?.pendingPayments > 0 ? 'purple' : null, count: counts?.pendingPayments },
    { href: '/admin/customers', label: 'Customers & Credit', icon: Users, roles: ['MASTER_ADMIN', 'ADMIN'], dot: counts?.pendingApprovals > 0 ? 'blue' : null, count: counts?.pendingApprovals },
    { href: '/admin/audit-logs', label: 'Audit Trail', icon: ShieldAlert, roles: ['MASTER_ADMIN', 'ADMIN'], dot: null },
    { href: '/admin/users', label: 'User Management', icon: UserPlus, roles: ['MASTER_ADMIN'], dot: null },
    { href: '/admin/sales', label: 'Sales Department', icon: Contact, roles: ['MASTER_ADMIN'], dot: null },
    { href: '/admin/profile', label: 'Admin Profile', icon: UserCog, roles: ['MASTER_ADMIN', 'ADMIN', 'USER', 'SALES'], dot: null },
  ];

  const filteredNavItems = navItems.filter(item => !userRole || item.roles.includes(userRole));

  const dotColors: Record<string, string> = {
    red: 'bg-red-500 shadow-red-500/50',
    amber: 'bg-amber-500 shadow-amber-500/50',
    blue: 'bg-blue-500 shadow-blue-500/50',
    purple: 'bg-purple-500 shadow-purple-500/50',
    green: 'bg-emerald-500 shadow-emerald-500/50',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col justify-between">
        <div className="space-y-8">
          <div className="flex items-center space-x-3">
            <img
              src="/logo-small.png"
              alt="StarFashion"
              className="w-10 h-10 rounded-xl object-contain bg-white p-1"
            />
            <div>
              <div className="font-bold text-sm text-white tracking-tight">Master Admin</div>
              <div className="text-[11px] text-emerald-400 font-mono">Control Console</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const dotColor = item.dot ? dotColors[item.dot] : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {dotColor && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${dotColor} shadow-md animate-pulse`} />
                    )}
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      item.dot === 'red' ? 'bg-red-500/20 text-red-400' :
                      item.dot === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                      item.dot === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                      item.dot === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <Link href="/admin/profile" className="text-xs hover:bg-slate-800 p-2 rounded-lg transition-colors flex-1 min-w-0">
            <div className="font-semibold text-slate-300 truncate">{session?.email}</div>
            <div className="text-[10px] text-slate-500">Master Admin</div>
          </Link>

          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 p-2 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Admin View Container */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
