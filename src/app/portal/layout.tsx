'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, ShoppingCart, Package, FileText, LogOut, User, Tag, CreditCard, Menu, X } from 'lucide-react';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [cartQuote, setCartQuote] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => { fetchSessionAndCart(); }, [pathname]);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navLinks = [
    { href: '/portal/catalog', label: 'Catalogue', icon: ShoppingBag },
    { href: '/portal/cart', label: 'Cart', icon: ShoppingCart, count: cartQuote?.qualifyingQty || 0 },
    { href: '/portal/orders', label: 'Orders', icon: Package },
    { href: '/portal/payments', label: 'Payments', icon: CreditCard },
    { href: '/portal/statement', label: 'Ledger', icon: FileText },
    { href: '/portal/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white sticky top-0 z-50 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/portal/catalog" className="flex items-center space-x-3">
            <img src="/logo-small.png" alt="StarFashion" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white p-1" />
            <span className="font-bold text-base sm:text-lg tracking-tight hidden sm:inline">StarFashion B2B</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors relative ${
                    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {link.count !== undefined && link.count > 0 && (
                    <span className="ml-1 bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">{link.count}</span>
                  )}
                </Link>
              );
            })}
            <button onClick={handleLogout} className="flex items-center space-x-1 text-slate-400 hover:text-red-400 px-2 py-2 text-xs transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile: Hamburger + Cart badge */}
          <div className="md:hidden flex items-center space-x-2">
            <Link href="/portal/cart" className="relative p-2 text-slate-300 hover:text-white">
              <ShoppingCart className="w-5 h-5" />
              {cartQuote?.qualifyingQty > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-emerald-500 text-slate-950 font-bold w-4 h-4 rounded-full text-[9px] flex items-center justify-center">
                  {cartQuote.qualifyingQty > 99 ? '99+' : cartQuote.qualifyingQty}
                </span>
              )}
            </Link>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-800 border-t border-slate-700">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}>
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                    {link.count !== undefined && link.count > 0 && (
                      <span className="ml-auto bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded-full text-[10px]">{link.count}</span>
                    )}
                  </Link>
                );
              })}
              <button onClick={handleLogout} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors w-full">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        )}

        {/* Live Wholesale Tier Banner */}
        {cartQuote && (
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/60 py-1.5 px-4 text-xs overflow-hidden">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="text-slate-300 whitespace-nowrap">
                  Cart: <strong className="text-white font-bold">{cartQuote.qualifyingQty}</strong>
                </span>
                <span className="text-slate-500 hidden sm:inline">|</span>
                {cartQuote.appliedTier ? (
                  <span className="text-emerald-400 font-semibold truncate">
                    {cartQuote.appliedTier.name} ({cartQuote.discountPercent}% OFF)
                  </span>
                ) : (
                  <span className="text-amber-400 whitespace-nowrap">Base Prices</span>
                )}
              </div>
              {cartQuote.nextTier && (
                <div className="text-indigo-300 font-medium hidden sm:block whitespace-nowrap flex-shrink-0">
                  +<strong className="text-white font-bold">{cartQuote.unitsToNextTier}</strong> units for{' '}
                  <strong className="text-amber-300 font-bold">{cartQuote.nextTier.name}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
