'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div data-print-hide>
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col pl-60 transition-all duration-300">
        <div data-print-hide>
          <Header />
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
