'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, ShoppingBag, ArrowRight, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.data.user.userType === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/portal/catalog');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl z-10">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img
              src="/logo.png"
              alt="StarFashion Wholesale"
              className="h-16 mx-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">StarFashion Wholesale</h1>
          <p className="text-slate-400 text-sm mt-1">B2B Wholesale Ordering & Account Portal</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Register Link */}
        <div className="mt-4 text-center">
          <a
            href="/register"
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center justify-center space-x-1"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Wholesale Account</span>
          </a>
        </div>

        {/* Quick Fill Demo Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-medium text-slate-400 mb-3 flex items-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
            Instant Demo Account Sign-In:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillDemoAccount('buyer@fashionretail.com', 'Password123!')}
              className="text-left bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs p-2.5 rounded-lg transition-colors"
            >
              <div className="font-semibold text-indigo-300">Wholesale Buyer</div>
              <div className="text-slate-500 truncate text-[11px]">buyer@fashionretail.com</div>
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('admin@starfashion.com', 'Password123!')}
              className="text-left bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs p-2.5 rounded-lg transition-colors"
            >
              <div className="font-semibold text-emerald-300">Master Admin</div>
              <div className="text-slate-500 truncate text-[11px]">admin@starfashion.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
