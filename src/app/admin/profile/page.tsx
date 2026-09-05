'use client';

import { useState, useEffect } from 'react';
import { Save, User, Mail, Phone, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/v1/admin/profile');
      const data = await res.json();

      if (data.success) {
        setProfile(data.data);
        setFirstName(data.data.firstName);
        setLastName(data.data.lastName);
        setEmail(data.data.email);
        setPhone(data.data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName || !lastName || !email) {
      setErrorMessage('First name, last name, and email are required');
      return;
    }

    if (isChangingPassword) {
      if (!currentPassword) {
        setErrorMessage('Current password is required to set a new password');
        return;
      }
      if (!newPassword) {
        setErrorMessage('New password is required');
        return;
      }
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New passwords do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone || null,
          currentPassword: isChangingPassword ? currentPassword : undefined,
          newPassword: isChangingPassword ? newPassword : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProfile(data.data);
        setSuccessMessage('Profile updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrorMessage('Failed to update profile');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/dashboard"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Profile</h1>
            <p className="text-slate-400 text-sm">Manage your account settings</p>
          </div>
        </div>
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

      {/* Profile Information */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <User className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Personal Information</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Lock className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Account Details</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Account Type</span>
            <span className="text-white font-medium">{profile?.userType}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Status</span>
            <span className={`font-medium ${profile?.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {profile?.status}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Last Login</span>
            <span className="text-slate-300">
              {profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/50">
            <span className="text-slate-400">Member Since</span>
            <span className="text-slate-300">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-400">Last Updated</span>
            <span className="text-slate-300">
              {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Change Password</h2>
          </div>
          <button
            onClick={() => {
              setIsChangingPassword(!isChangingPassword);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {isChangingPassword ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Current Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-10 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-10 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Enter new password (min 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Confirm New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="Confirm new password"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Click "Change Password" to update your password</p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  );
}
