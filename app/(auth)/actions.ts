/* eslint-disable import/no-unresolved */
'use server';

import { z } from 'zod';

import { signIn } from '@/app/auth';
import { createUser, getUser, setVerificationToken } from '@/lib/db/queries';
import { generateToken, sendVerificationEmail } from '@/lib/email';

// Enhanced password validation schema - only for registration
const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters long")
  .max(100, "Password is too long")
  .refine(password => /[a-z]/.test(password), "Password must contain at least one lowercase letter")
  .refine(password => /[0-9]/.test(password), "Password must contain at least one number");

// Registration form schema with strict password validation
const registrationFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
});

// Login form schema with simple validation
const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_not_found' | 'wrong_password' | 'account_locked';
  message?: string;
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const _rememberMe = formData.get('remember_me') === 'true';

    try {
      loginFormSchema.parse({ email, password });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return {
          status: 'invalid_data',
          message: validationError.errors[0]?.message || 'Invalid email or password format'
        };
      }
    }

    const users = await getUser(email);
    if (users.length === 0) {
      return {
        status: 'user_not_found',
        message: 'No account found with this email. Please register first.'
      };
    }

    const userFromDbAction = users[0];

    // Check if the user's email has been verified
    if (!userFromDbAction.emailVerified) {
      const verificationToken = generateToken();
      await setVerificationToken(userFromDbAction.id, verificationToken);
      await sendVerificationEmail(email, verificationToken);

      return {
        status: 'failed',
        message: 'Your email is not verified. We sent a new verification email, please check your inbox.'
      };
    }

    // Check if account is locked
    if (userFromDbAction.accountLockedUntil && new Date(userFromDbAction.accountLockedUntil) > new Date()) {
      const unlockTime = new Date(userFromDbAction.accountLockedUntil);
      const minutesRemaining = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);

      return {
        status: 'account_locked',
        message: `Your account is temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`
      };
    }

    try {
      await signIn('credentials', {
        email: email,
        password: password,
        redirect: false,
        callbackUrl: undefined
      });
      return { status: 'success' };
    } catch (signInError) {
      // This catch block might be triggered if signIn itself throws an error
      console.error(`Login action signIn error for ${email}:`, signInError);

      // Check if account is now locked after this failed attempt
      const updatedUser = await getUser(email);
      if (updatedUser.length > 0 &&
        updatedUser[0].accountLockedUntil &&
        new Date(updatedUser[0].accountLockedUntil) > new Date()) {

        const unlockTime = new Date(updatedUser[0].accountLockedUntil);
        const minutesRemaining = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);

        return {
          status: 'account_locked',
          message: `Your account has been temporarily locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}.`
        };
      }

      return {
        status: 'wrong_password',
        message: 'Incorrect password. Please try again.'
      };
    }
  } catch (outerError) {
    console.error('Login action outer error:', outerError);
    return {
      status: 'failed',
      message: 'An unexpected error occurred. Please try again later.'
    };
  }
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
        message: 'An account with this email already exists. Please sign in instead.'
      };
    }

    try {
      registrationFormSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          status: 'invalid_data',
          message: error.errors[0]?.message || 'Please check your email and password requirements'
        };
      }
      throw error;
    }

    await createUser(email, password, false);

    const users = await getUser(email);
    if (users.length === 0) {
      // This should ideally not happen if createUser succeeded
      console.error('Failed to retrieve user immediately after creation:', email);
      return {
        status: 'failed',
        message: 'Failed to create account. Please try again later.'
      };
    }

    const verificationToken = generateToken();
    await setVerificationToken(users[0].id, verificationToken);

    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      // Log this failure, but still tell user account was created
      console.error('Failed to send verification email during registration for:', email);
      return {
        status: 'verification_email_sent', // Still treat as success for user creation
        message: 'Account created, but we couldn\'t send a verification email. Please contact support.'
      };
    }

    // Sign in the user automatically (Optional)
    // Consider if you *want* to sign them in before they verify.
    // If so, they might hit protected routes that require verification.
    // await signIn('credentials', {
    //   email: email,
    //   password: password, // Note: sending plain password here might be needed by authorize
    //   redirect: false,
    // });

    return {
      status: 'verification_email_sent',
      message: 'Account created! Please check your email to verify your account.'
    };
  } catch (error) {
    console.error('Registration error:', error); // Keep this error log
    return {
      status: 'failed',
      message: 'Failed to create account. Please try again later.'
    };
  }
};
