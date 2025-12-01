import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from "@/components/theme-toggle";
import ResetPasswordForm from './reset-password-form'; // Import the new client component

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
            U
          </div>
          <span>UniTaskAI</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12">
         {/* Background Pattern */}
        <div className="absolute inset-0 -z-10 size-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" style={{ backgroundSize: "4rem 4rem" }} />
        
        {/* Suspense Boundary */}
        <React.Suspense fallback={<div className="text-center">Loading form...</div>}>
          <ResetPasswordForm />
        </React.Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur-sm py-6">
        <div className="container flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} UniTaskAI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 