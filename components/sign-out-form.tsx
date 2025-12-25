'use client';

import { signOut } from 'next-auth/react';
import { Button } from './ui/button';

export const SignOutForm = () => {
  const handleSignOut = () => {
    // Use the same basePath that we configured in our SessionProvider
    signOut({ 
      callbackUrl: '/',
      redirect: true
    });
  };

  return (
    <Button
      variant="ghost"
      className="w-full text-left px-1 py-0.5 text-red-500 justify-start h-auto"
      onClick={handleSignOut}
      type="button"
    >
      Sign out
    </Button>
  );
};
