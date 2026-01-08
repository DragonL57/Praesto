'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { SettingsSection, SettingsItem } from './settings-section';

export function DataSettings() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAllChats = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch('/api/chat/delete-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chats');
      }

      toast({
        type: 'success',
        description: 'All chats have been deleted successfully.',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to delete chats. Please try again.',
      });
      console.error('Error deleting chats:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SettingsSection
      title="Data Management"
      description="Manage your application data and privacy"
    >
      <SettingsItem
        label="Delete All Chats"
        description="Permanently delete all your chat history. This action cannot be undone."
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="size-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete All Chats'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all
                of your chat history and remove it from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllChats}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsItem>
    </SettingsSection>
  );
}
