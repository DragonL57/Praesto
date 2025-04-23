import { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  
  // Read admin emails from environment variable
  // Format: comma-separated list of emails, e.g., "admin1@example.com,admin2@example.com"
  const adminEmailsStr = process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsStr.split(',').map(email => email.trim()).filter(Boolean);
  
  if (adminEmails.length === 0) {
    console.warn('No admin emails configured. Set ADMIN_EMAILS environment variable.');
  }
  
  // Check if user is authenticated and is an admin
  if (!session || !session.user || !adminEmails.includes(session.user.email as string)) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">
        <div className="bg-gray-100 dark:bg-gray-900 p-4">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}