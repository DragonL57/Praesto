import Form from 'next/form';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { EyeIcon, CrossSmallIcon } from './icons';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
  isRegistration = false,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  isRegistration?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/chat' });
  };

  return (
    <Form action={action} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Password
        </Label>

        <div className="relative">
          <Input
            id="password"
            name="password"
            className="bg-muted text-md md:text-sm pr-10"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={isRegistration ? 6 : undefined}
            autoComplete={isRegistration ? 'new-password' : 'current-password'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7 p-0"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <div className="size-4 flex items-center justify-center">
                <CrossSmallIcon size={14} />
              </div>
            ) : (
              <div className="size-4 flex items-center justify-center">
                <EyeIcon size={14} />
              </div>
            )}
          </Button>
        </div>
      </div>

      {children}

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-300 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-sm text-zinc-500">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="bg-background"
        onClick={handleGoogleSignIn}
      >
        <svg
          className="mr-2 size-4"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
        Google
      </Button>
    </Form>
  );
}
