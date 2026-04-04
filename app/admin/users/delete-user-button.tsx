'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash } from 'lucide-react';

import { deleteUser } from '@/lib/actions/admin';

interface DeleteUserButtonProps {
  userId: string;
  email: string;
  variant?: 'button' | 'menuItem';
  onOpenChange?: (open: boolean) => void;
}

export function DeleteUserButton({
  userId,
  email,
  variant = 'button',
  onOpenChange,
}: DeleteUserButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Call the parent's onOpenChange handler if provided
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleDelete = async () => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      await deleteUser(formData);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    // Stop event propagation to prevent dropdown from closing
    e.stopPropagation();
    handleOpenChange(true);
  };

  if (variant === 'menuItem') {
    return (
      <>
        <button
          type="button"
          className="flex items-center w-full text-destructive text-left"
          onClick={handleButtonClick}
        >
          <Trash className="mr-2 size-4" />
          Delete User
        </button>
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the user account for {email} and
                remove all their associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenChange(true);
        }}
        type="button"
      >
        Delete User
      </Button>
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for {email} and
              remove all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
