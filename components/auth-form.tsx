import Form from 'next/form';
import { useState } from 'react';

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
            type={showPassword ? "text" : "password"}
            required
            minLength={isRegistration ? 6 : undefined}
            autoComplete={isRegistration ? "new-password" : "current-password"}
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
    </Form>
  );
}
