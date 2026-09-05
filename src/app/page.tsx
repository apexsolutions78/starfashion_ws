'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.session) {
          const userType = data.data.session.userType;
          if (userType === 'ADMIN') {
            router.push('/admin/dashboard');
          } else {
            router.push('/portal/catalog');
          }
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Loading StarFashion Wholesale Portal...</p>
      </div>
    </div>
  );
}
