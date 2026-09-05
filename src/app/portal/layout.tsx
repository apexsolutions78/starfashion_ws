'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, ShoppingCart, Package, FileText, LogOut, User, Building2, Tag } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [cartQuote, setCartQuote] = useState<any>(null);

  const fetchSessionAndCart = () => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session) {
          setSessionData(data.data);
        } else {
          router.push('/login');
        }
      });

    fetch('/api/v1/cart')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.quote) {
          setCartQuote(data.data.quote);
        }
      });
  };

  useEffect(() => {
    fetchSessionAndCart();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLinks = [
    { href: '/portal/catalog', label: 'Catalogue', icon: ShoppingBag },
    { href: '/portal/cart', label: 'Wholesale Cart', icon: ShoppingCart, count: cartQuote?.qualifyingQty || 0 },
    { href: '/portal/orders', label: 'Orders', icon: Package },
    { href: '/portal/statement', label: 'Account & Ledger', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Wholesale Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/portal/catalog" className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                SF
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:inline">StarFashion B2B</span>
            </Link>

            {/* Customer Company Badge */}
            {sessionData?.customerCompany && (
              <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1 text-xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-200">{sessionData.customerCompany.companyName}</span>
                <span className="text-slate-400">| Limit: €{sessionData.customerCompany.creditLimit?.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{link.label}</span>
                  {link.count !== undefined && link.count > 0 && (
                    <span className="ml-1 bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                      {link.count}
                    </span>
                  )}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-slate-400 hover:text-red-400 px-2 py-2 text-xs transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Live Wholesale Tier Banner */}
        {cartQuote && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/60 py-1.5 px-4 text-xs">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300">
                  Cart Units: <strong className="text-white font-bold">{cartQuote.qualifyingQty}</strong>
                </span>
                <span className="text-slate-500">|</span>
                {cartQuote.appliedTier ? (
                  <span className="text-emerald-400 font-semibold">
                    Current Tier: {cartQuote.appliedTier.name} ({cartQuote.discountPercent}% OFF)
                  </span>
                ) : (
                  <span className="text-amber-400">Standard Base Wholesale Prices</span>
                )}
              </div>

              {cartQuote.nextTier && (
                <div className="text-indigo-300 font-medium hidden sm:block">
                  Add <strong className="text-white font-bold">{cartQuote.unitsToNextTier}</strong> more units to unlock{' '}
                  <strong className="text-amber-300 font-bold">{cartQuote.nextTier.name} ({cartQuote.nextTier.discountPercent}% OFF)</strong>!
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
