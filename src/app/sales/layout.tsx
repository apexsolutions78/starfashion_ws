'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, UserCog, LogOut, Menu, X } from 'lucide-react';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session?.userType === 'ADMIN' && data.data?.session?.role === 'SALES') {
          setSession(data.data.session);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [pathname]);

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLinks = [
    { href: '/sales/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sales/customers', label: 'My Customers', icon: Users },
    { href: '/sales/reports', label: 'Reports', icon: BarChart3 },
    { href: '/admin/profile', label: 'Profile', icon: UserCog },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/sales/dashboard" className="flex items-center space-x-3">
            <img src="/logo-small.png" alt="StarFashion" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white p-1" />
            <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight hidden sm:inline">StarFashion Sales</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/sales/dashboard' && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center space-x-3">
            {session && (
              <span className="text-xs text-slate-500 font-medium">{session.email}</span>
            )}
            <button onClick={handleLogout} className="flex items-center space-x-1 text-slate-400 hover:text-red-500 px-2 py-2 text-xs transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile: Hamburger */}
          <div className="md:hidden flex items-center space-x-2">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-500 hover:text-slate-900">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href !== '/sales/dashboard' && pathname.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
              {session && (
                <div className="px-3 py-2 text-xs text-slate-400 border-t border-slate-100 mt-2 pt-3">
                  Signed in as <span className="font-semibold text-slate-600">{session.email}</span>
                </div>
              )}
              <button onClick={handleLogout} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-100 hover:text-red-500 transition-colors w-full">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
