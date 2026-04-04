/* eslint-disable import/no-unresolved */
'use server';

import { AuthError } from 'next-auth';
import { z } from 'zod';
import { compare, genSaltSync, hashSync } from 'bcrypt-ts';

import { signIn } from '@/app/auth';
import { createUser, getUser, setVerificationToken } from '@/lib/db/queries';
import { generateToken, sendVerificationEmail } from '@/lib/services/email';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password is too long')
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter',
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number',
  );

const registrationFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: passwordSchema,
});

const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export interface LoginActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'invalid_data'
    | 'account_locked'
    | 'email_not_verified';
  message?: string;
}

function mapAuthError(error: unknown): {
  status: LoginActionState['status'];
  message: string;
} {
  if (error instanceof Error) {
    const msg = error.message || '';
    const causeMsg =
      (error as { cause?: { err?: { message?: string } } }).cause?.err
        ?.message || '';
    const combined = `${msg} ${causeMsg}`;

    if (combined.includes('AccountLocked')) {
      return {
        status: 'account_locked',
        message:
          'Your account is temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
      };
    }

    if (combined.includes('EmailNotVerified')) {
      return {
        status: 'email_not_verified',
        message: 'Please verify your email address before signing in.',
      };
    }

    if (
      combined.includes('CredentialsSignin') ||
      combined.includes('CallbackRouteError')
    ) {
      return {
        status: 'failed',
        message: 'Invalid email or password. Please try again.',
      };
    }
  }

  return {
    status: 'failed',
    message: 'An unexpected error occurred. Please try again.',
  };
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const parsed = loginFormSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      status: 'invalid_data',
      message:
        parsed.error.errors[0]?.message || 'Invalid email or password format',
    };
  }

  const users = await getUser(email);

  if (users.length === 0) {
    const dummySalt = genSaltSync(10);
    const dummyHash = hashSync('dummy-password', dummySalt);
    await compare(password, dummyHash);
    return {
      status: 'failed',
      message: 'Invalid email or password. Please try again.',
    };
  }

  const userFromDb = users[0];

  if (!userFromDb.emailVerified) {
    const verificationToken = generateToken();
    await setVerificationToken(userFromDb.id, verificationToken);
    await sendVerificationEmail(email, verificationToken);
    return {
      status: 'email_not_verified',
      message:
        'Your email is not verified. We sent a new verification email, please check your inbox.',
    };
  }

  if (
    userFromDb.accountLockedUntil &&
    new Date(userFromDb.accountLockedUntil) > new Date()
  ) {
    const unlockTime = new Date(userFromDb.accountLockedUntil);
    const minutesRemaining = Math.ceil(
      (unlockTime.getTime() - Date.now()) / 60000,
    );
    return {
      status: 'account_locked',
      message: `Your account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`,
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/chat',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error;
    }

    if (error instanceof AuthError) {
      return mapAuthError(error);
    }

    console.error('Login action unexpected error:', error);
    return {
      status: 'failed',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  return { status: 'success' };
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data'
    | 'verification_email_sent';
  message?: string;
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const existingUser = await getUser(email);
    if (existingUser.length > 0) {
      return {
        status: 'user_exists',
        message:
          'An account with this email already exists. Please sign in instead.',
      };
    }

    try {
      registrationFormSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          status: 'invalid_data',
          message:
            error.errors[0]?.message ||
            'Please check your email and password requirements',
        };
      }
      throw error;
    }

    await createUser(email, password, false);

    const users = await getUser(email);
    if (users.length === 0) {
      console.error(
        'Failed to retrieve user immediately after creation:',
        email,
      );
      return {
        status: 'failed',
        message: 'Failed to create account. Please try again later.',
      };
    }

    const verificationToken = generateToken();
    await setVerificationToken(users[0].id, verificationToken);

    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      console.error(
        'Failed to send verification email during registration for:',
        email,
      );
      return {
        status: 'verification_email_sent',
        message:
          "Account created, but we couldn't send a verification email. Please contact support.",
      };
    }

    return {
      status: 'verification_email_sent',
      message:
        'Account created! Please check your email to verify your account.',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      status: 'failed',
      message: 'Failed to create account. Please try again later.',
    };
  }
};
