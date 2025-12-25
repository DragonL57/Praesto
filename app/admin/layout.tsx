'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/theme-provider';

import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopNav } from '@/components/admin/top-nav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <AdminSidebar 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          pathname={pathname}
        />
        <div className="flex flex-col md:pl-64">
          <AdminTopNav setSidebarOpen={setSidebarOpen} />
          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
