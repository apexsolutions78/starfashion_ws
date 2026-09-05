'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, User, Phone, MapPin, Globe, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    contactName: '',
    companyName: '',
    phone: '',
    city: '',
    country: 'Pakistan',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.contactName || !form.companyName || !form.phone || !form.city || !form.country) {
      setError('All fields are required');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: form.contactName,
          companyName: form.companyName,
          phone: form.phone,
          city: form.city,
          country: form.country,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Registration Submitted!</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your account has been created and is pending approval from our team. You will be able to login once your account is approved.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all"
          >
            <span>Go to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center">
          <Link href="/" className="inline-block mb-4">
            <img src="/logo-small.png" alt="StarFashion" className="w-12 h-12 rounded-xl object-contain bg-white p-1 mx-auto" />
          </Link>
          <h1 className="text-xl font-bold text-white">Create Wholesale Account</h1>
          <p className="text-slate-400 text-xs mt-1">Register your business to start ordering</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Contact Person */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              <User className="w-3.5 h-3.5 inline mr-1" />
              Contact Person Name *
            </label>
            <input
              type="text"
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Full name"
              required
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />
              Business Name *
            </label>
            <input
              type="text"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Company / Business name"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="+92 300 1234567"
              required
            />
          </div>

          {/* City & Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                City *
              </label>
              <input
                type="text"
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="City"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                Country *
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="Pakistan">Pakistan</option>
                <option value="India">India</option>
                <option value="Bangladesh">Bangladesh</option>
                <option value="UAE">UAE</option>
                <option value="Saudi Arabia">Saudi Arabia</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="you@company.com"
              required
            />
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                <Lock className="w-3.5 h-3.5 inline mr-1" />
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Submitting...</span>
            ) : (
              <>
                <span>Submit Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
