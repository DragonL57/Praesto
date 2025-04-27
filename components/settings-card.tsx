'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Settings, Moon, Sun, Laptop, Trash2, LucideIcon } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { FaMicrophone } from 'react-icons/fa';

import {
  Card,
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
import { cn } from '@/lib/utils';

// Tab types for improved type safety
type SettingTab = 'appearance' | 'speech' | 'data';

interface SettingsCardProps {
  onClose?: () => void;
}

interface NavItemProps {
  icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  tab: SettingTab;
  currentTab: SettingTab;
  onClick: (tab: SettingTab) => void;
}

// Language options for speech recognition
const speechLanguages = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'zh-TW', label: 'Chinese (Traditional)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'ar-SA', label: 'Arabic' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'hi-IN', label: 'Hindi' },
];

// Navigation item component
function NavItem({ icon: Icon, title, tab, currentTab, onClick }: NavItemProps) {
  const isActive = tab === currentTab;
  
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm transition-colors",
        isActive 
          ? "bg-accent text-accent-foreground font-medium" 
          : "hover:bg-accent/50 text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </button>
  );
}

export function SettingsCard({ onClose }: SettingsCardProps) {
  const { theme, setTheme } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTab, setCurrentTab] = useState<SettingTab>('appearance');
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage('speech-recognition-language', 'en-US');
  const [speechSupported, setSpeechSupported] = useState(true);

  // Check if speech recognition is supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

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
    <Card className="w-full shadow-none border-0 overflow-hidden" style={{ margin: '0 auto' }}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Settings className="size-5" />
          <CardTitle>Settings</CardTitle>
        </div>
        <CardDescription>
          Customize your experience and manage your account
        </CardDescription>
      </CardHeader>
      
      <div className="flex h-[65vh]">
        {/* Sidebar navigation - keep width the same */}
        <div className="w-52 border-r py-4 px-2 space-y-1 shrink-0">
          <NavItem 
            icon={Sun} 
            title="Appearance" 
            tab="appearance" 
            currentTab={currentTab} 
            onClick={setCurrentTab}
          />
          <NavItem 
            icon={FaMicrophone as any} 
            title="Speech Recognition" 
            tab="speech" 
            currentTab={currentTab} 
            onClick={setCurrentTab}
          />
          <NavItem 
            icon={Trash2} 
            title="Data Management" 
            tab="data" 
            currentTab={currentTab} 
            onClick={setCurrentTab}
          />
        </div>
        
        {/* Content area - remove redundant headers */}
        <div className="flex-1 p-6 overflow-auto" style={{ maxWidth: '500px' }}>
          {/* Appearance settings */}
          {currentTab === 'appearance' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Theme</h4>
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
            </div>
          )}
          
          {/* Speech Recognition settings */}
          {currentTab === 'speech' && (
            <div className="space-y-4">
              {!speechSupported ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    Speech recognition is not supported in your browser.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Speech Recognition Language</h4>
                    <p className="text-xs text-muted-foreground">
                      Select the language you want to use for speech recognition.
                    </p>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {speechLanguages.map((language) => (
                          <SelectItem key={language.value} value={language.value}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Data Management settings */}
          {currentTab === 'data' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Delete All Chats</h4>
                <p className="text-xs text-muted-foreground">
                  Be careful, this action cannot be undone and will permanently delete all your chat history.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      disabled={isDeleting}
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
            </div>
          )}
        </div>
      </div>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground border-t mt-2 py-3">
        <span>UniTaskAI Settings</span>
        <span>v1.0</span>
      </CardFooter>
    </Card>
  );
}