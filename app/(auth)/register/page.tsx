'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ 
        type: 'error', 
        description: state.message || 'Account already exists!' 
      });
    } else if (state.status === 'failed') {
      toast({ 
        type: 'error', 
        description: state.message || 'Failed to create account!' 
      });
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: state.message || 'Please check your email and password requirements.',
      });
    } else if (state.status === 'success') {
      toast({ type: 'success', description: 'Account created successfully!' });
      setIsSuccessful(true);
      router.refresh();
    }
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h2 className="text-2xl font-bold dark:text-zinc-50 mb-2">UniTaskAI</h2>
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email} isRegistration={true}>
          <div className="mt-3 px-1">
            <h4 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Password must:</h4>
            <ul className="text-xs text-gray-500 dark:text-zinc-400 space-y-1 list-disc pl-4">
              <li>Be at least 6 characters long</li>
              <li>Contain at least one lowercase letter (a-z)</li>
              <li>Contain at least one number (0-9)</li>
            </ul>
          </div>
          <SubmitButton isSuccessful={isSuccessful}>Sign Up</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Already have an account? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {' instead.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
