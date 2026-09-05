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
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session?.userType === 'ADMIN') {
          setSession(data.data.session);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Order Processing', icon: Package },
    { href: '/admin/tiers', label: 'Pricing Tiers', icon: Sliders },
    { href: '/admin/payments', label: 'Record Payments', icon: CreditCard },
    { href: '/admin/customers', label: 'Customers & Credit', icon: Users },
    { href: '/admin/audit-logs', label: 'Audit Trail', icon: ShieldAlert },
  ];

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
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
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
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <div className="font-semibold text-slate-300 truncate w-36">{session?.email}</div>
            <div className="text-[10px] text-slate-500">Master Admin</div>
          </div>

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
