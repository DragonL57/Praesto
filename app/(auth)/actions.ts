/* eslint-disable import/no-unresolved */
'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/lib/db/queries';

import { signIn } from './auth';

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
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_not_found' | 'wrong_password';
  message?: string;
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    // Renamed to _rememberMe to indicate it's collected but unused for now
    // This can be used in future implementations
    const _rememberMe = formData.get('remember_me') === 'true';

    // Basic validation just to ensure email format and password presence
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

    // First check if user exists
    const users = await getUser(email);
    if (users.length === 0) {
      return { 
        status: 'user_not_found',
        message: 'No account found with this email. Please register first.' 
      };
    }

    // Attempt to sign in - this checks password correctness
    try {
      await signIn('credentials', {
        email: email,
        password: password,
        redirect: false,
        callbackUrl: undefined
      });
      return { status: 'success' };
    } catch {
      // If we reach here after verifying the user exists, it's a wrong password
      return { 
        status: 'wrong_password',
        message: 'Incorrect password. Please try again.' 
      };
    }
  } catch {
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
    | 'invalid_data';
  message?: string;
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Check if user already exists first - move this before validation
    const existingUser = await getUser(email);
    if (existingUser.length > 0) {
      return { 
        status: 'user_exists',
        message: 'An account with this email already exists. Please sign in instead.'
      };
    }

    // Validate input data with strict password requirements
    try {
      registrationFormSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          status: 'invalid_data',
          message: error.errors[0]?.message || 'Please check your email and password requirements'
        };
      }
      throw error; // Re-throw the error if it's not a ZodError
    }

    // Create user and sign in
    await createUser(email, password);
    await signIn('credentials', {
      email: email,
      password: password,
      redirect: false,
    });

    return { status: 'success' };
  } catch (error) {
    console.error('Registration error:', error);
    return { 
      status: 'failed',
      message: 'Failed to create account. Please try again later.'
    };
  }
};
