'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Settings, Moon, Sun, Laptop, Trash2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface SettingsCardProps {
  onClose?: () => void;
}

export function SettingsCard({ onClose }: SettingsCardProps) {
  const { theme, setTheme } = useTheme();
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
      
      // Close the settings dialog after successful deletion if onClose is provided
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
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
    <Card className="w-full shadow-none border-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="size-5" />
          <CardTitle>Settings</CardTitle>
        </div>
        <CardDescription>
          Customize your experience and manage your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Appearance</h3>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="size-4" />
                  <span>Light</span>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="size-4" />
                  <span>Dark</span>
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Laptop className="size-4" />
                  <span>System</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Data Management</h3>
          <p className="text-xs text-muted-foreground">
            Be careful, these actions cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={isDeleting}
              >
                <Trash2 className="size-4" />
                {isDeleting ? 'Deleting...' : 'Delete All Chats'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  of your chat history and conversation data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllChats}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <span>UniTaskAI Settings</span>
        <span>v1.0</span>
      </CardFooter>
    </Card>
  );
}