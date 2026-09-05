import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StarFashion Wholesale Portal',
  description: 'B2B Wholesale Ordering & Account Management System',
  icons: {
    icon: '/logo-small.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
