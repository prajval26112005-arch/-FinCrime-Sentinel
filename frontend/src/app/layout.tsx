import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinCrime Sentinel | Federal AML & Graph Fraud Analytics Workstation',
  description: 'Enterprise Graph-Based Anti-Money Laundering & Mule Ring Interception Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
