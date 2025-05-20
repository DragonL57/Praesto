import { cookies, headers } from 'next/headers';

import { AppSidebar } from '@/components/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/app/auth';
import Script from 'next/script';

// export const experimental_ppr = true; // Temporarily remove PPR flag for testing

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Explicitly read headers and cookies first
  await headers(); // Read headers
  const cookieStore = await cookies(); // Existing cookies call
  
  // Fetch session first
  const session = await auth();
  
  const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="lazyOnload"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={session?.user} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
