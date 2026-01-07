'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { changeUserPassword } from '@/lib/actions/admin';

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    const result = await changeUserPassword(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      // Clear form
      const form = document.getElementById(
        `password-form-${userId}`,
      ) as HTMLFormElement;
      if (form) form.reset();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  }

  return (
    <form
      id={`password-form-${userId}`}
      action={handleSubmit}
      className="space-y-4"
    >
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Change Password</h3>
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <Input
              type="password"
              name="newPassword"
              placeholder="New password"
              required
              minLength={6}
              className="flex-1"
            />
            <SubmitButton />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Changing...' : 'Change'}
    </Button>
  );
}
