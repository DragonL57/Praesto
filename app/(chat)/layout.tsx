import { cookies } from 'next/headers';

import { AppSidebar } from '../../components/sidebar';
import { SidebarInset, SidebarProvider } from '../../components/ui/sidebar';
import { auth } from '../../app/auth';
import Script from 'next/script';
import { Suspense } from 'react';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore] = await Promise.all([auth(), await cookies()]);
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';
  const isAuthenticated = !!session?.user;
  
  // Only show the sidebar if the user is authenticated
  const showSidebar = isAuthenticated;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      <SidebarProvider defaultOpen={showSidebar && !isCollapsed}>
        {showSidebar && <AppSidebar user={session?.user} />}
        <SidebarInset>
          <Suspense fallback={<div></div>}>
            {children}
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}