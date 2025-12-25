
import { AppSidebar } from '@/components/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/app/auth';
import Script from 'next/script';
import { Suspense } from 'react';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Explicitly read headers and cookies first
  // await headers(); // Reading headers might not be necessary for settings
  
  // Fetch session first
  const session = await auth();
  
  const isAuthenticated = !!session?.user;
  // const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';
  // For settings, let's keep the sidebar state consistent with chat, or default to collapsed
  const showSidebar = isAuthenticated;

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      {/* Defaulting to false to ensure it's collapsed, matching chat page behavior */}
      <SidebarProvider defaultOpen={false}> 
        {showSidebar && <AppSidebar user={session?.user} />}
        <SidebarInset>
          <Suspense fallback={<div>Loading...</div>}>
            {children}
          </Suspense>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
