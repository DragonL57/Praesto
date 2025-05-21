'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop, Trash2, LucideIcon, CloudIcon, Smartphone, ArrowLeft, User, Plus, MoreHorizontal } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { FaMicrophone } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

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
import type { SpeechRecognitionMode, AvailabilityStatus } from '@/types/speech-recognition';

// Tab types for improved type safety
type SettingTab = 'appearance' | 'speech' | 'data' | 'account';

interface NavItemProps {
  icon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  tab: SettingTab;
  currentTab: SettingTab;
  onClick: (tab: SettingTab) => void;
}

// Language options for speech recognition
const speechLanguages = [
  { value: 'auto', label: 'Auto-detect language' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'vi-VN', label: 'Vietnamese' },
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
      <Icon className="size-4" />
      <span>{title}</span>
    </button>
  );
}

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTab, setCurrentTab] = useState<SettingTab>('appearance');
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage('speech-recognition-language', 'en-US');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionMode, setRecognitionMode] = useLocalStorage<SpeechRecognitionMode>(
    'speech-recognition-mode', 
    'ondevice-preferred'
  );
  const [deviceLanguageStatus, setDeviceLanguageStatus] = useState<AvailabilityStatus | null>(null);
  const [isCheckingDeviceSupport, setIsCheckingDeviceSupport] = useState(false);
  const [username, setUsername] = useState(session?.user?.name || '');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user?.name) {
      setUsername(session.user.name);
    }
  }, [session]);

  // Check if speech recognition is supported and check on-device availability
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionImpl) {
        setSpeechSupported(false);
        return;
      }
      
      if (selectedLanguage !== 'auto') {
        checkOnDeviceSupport(selectedLanguage);
      }
    }
  }, [selectedLanguage]);
  
  // Check if on-device recognition is available for the selected language
  const checkOnDeviceSupport = async (language: string) => {
    try {
      setIsCheckingDeviceSupport(true);
      const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionImpl && typeof SpeechRecognitionImpl.availableOnDevice === 'function') {
        const status = await SpeechRecognitionImpl.availableOnDevice(language);
        setDeviceLanguageStatus(status);
      } else {
        setDeviceLanguageStatus(null);
      }
    } catch (error) {
      console.error('Error checking on-device support:', error);
      setDeviceLanguageStatus(null);
    } finally {
      setIsCheckingDeviceSupport(false);
    }
  };

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

  if (!mounted) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-1 h-full bg-background">
      {/* Sidebar navigation */}
      <div className="w-60 border-r dark:border-zinc-700 py-4 px-2 flex flex-col shrink-0">
        <div className="p-2 mb-4">
          <Link href="/chat" passHref>
            <Button variant="ghost" className="w-full flex items-center justify-center gap-2 text-sm" aria-label="Back to Chat">
              <ArrowLeft className="size-4" />
              <span>Back to Chat</span>
            </Button>
          </Link>
        </div>
        <NavItem
          icon={Sun} 
          title="Appearance" 
          tab="appearance" 
          currentTab={currentTab} 
          onClick={setCurrentTab}
        />
        <NavItem 
          icon={FaMicrophone} 
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
        <NavItem
          icon={User}
          title="Account"
          tab="account"
          currentTab={currentTab}
          onClick={setCurrentTab}
        />
      </div>
      
      {/* Content area */}
      <div className="flex-1 p-6 md:p-8 overflow-auto flex justify-center">
        {/* Appearance settings */}
        {currentTab === 'appearance' && (
          <div className="space-y-6 max-w-2xl w-full border rounded-lg bg-muted/30 dark:bg-zinc-800/30 p-6 shadow-sm">
            <div>
              <h3 className="text-2xl font-semibold mb-1">Appearance</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Customize the look and feel of the application.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-medium">Theme</h4>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-full md:w-1/2">
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
          <div className="space-y-6 max-w-2xl w-full border rounded-lg bg-muted/30 dark:bg-zinc-800/30 p-6 shadow-sm">
            <div>
              <h3 className="text-2xl font-semibold mb-1">Speech Recognition</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Configure speech input settings.
              </p>
            </div>
            {!speechSupported ? (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Speech recognition is not supported in your browser.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-base font-medium">Speech Recognition Language</h4>
                  <p className="text-xs text-muted-foreground">
                    Select the language for speech recognition or use &quot;Auto-detect language&quot;.
                  </p>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="w-full md:w-1/2">
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
                
                <div className="space-y-2">
                  <h4 className="text-base font-medium">Recognition Mode</h4>
                  <p className="text-xs text-muted-foreground">
                    On-device offers better privacy; cloud offers potentially better accuracy.
                  </p>
                  <Select 
                    value={recognitionMode} 
                    onValueChange={(value) => setRecognitionMode(value as SpeechRecognitionMode)}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder="Select recognition mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ondevice-preferred">
                        <div className="flex items-center gap-2">
                          <Smartphone className="size-4" />
                          <span>On-device preferred</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ondevice-only">
                        <div className="flex items-center gap-2">
                          <Smartphone className="size-4" />
                          <span>On-device only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cloud-only">
                        <div className="flex items-center gap-2">
                          <CloudIcon className="size-4" />
                          <span>Cloud only</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedLanguage !== 'auto' && (
                  <div className="mt-4 p-4 rounded-lg border dark:border-zinc-700 bg-muted/50 dark:bg-zinc-800/30">
                    <h4 className="text-sm font-medium mb-2">On-device Recognition Status</h4>
                    {isCheckingDeviceSupport ? (
                      <p className="text-xs text-muted-foreground">Checking on-device support...</p>
                    ) : deviceLanguageStatus === 'available' ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Smartphone className="size-4" />
                        <span className="text-xs font-medium">{speechLanguages.find(l => l.value === selectedLanguage)?.label} is available for on-device recognition.</span>
                      </div>
                    ) : deviceLanguageStatus === 'downloadable' ? (
                      <div>
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                          <CloudIcon className="size-4" />
                          <span className="text-xs font-medium">{speechLanguages.find(l => l.value === selectedLanguage)?.label} can be downloaded for on-device recognition.</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
                            if (SpeechRecognitionImpl && typeof SpeechRecognitionImpl.installOnDevice === 'function') {
                              toast({
                                type: 'success',
                                description: `Downloading ${speechLanguages.find(l => l.value === selectedLanguage)?.label} for on-device recognition...`,
                              });
                              SpeechRecognitionImpl.installOnDevice(selectedLanguage)
                                .then((success: boolean) => {
                                  if (success) {
                                    setDeviceLanguageStatus('available');
                                    toast({
                                      type: 'success',
                                      description: `${speechLanguages.find(l => l.value === selectedLanguage)?.label} installed for on-device recognition.`,
                                    });
                                  } else {
                                    toast({
                                      type: 'error',
                                      description: 'Failed to install language model.',
                                    });
                                  }
                                });
                            }
                          }}
                        >
                          Download Language Model
                        </Button>
                      </div>
                    ) : deviceLanguageStatus === 'downloading' ? (
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="text-xs font-medium">Downloading {speechLanguages.find(l => l.value === selectedLanguage)?.label}...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CloudIcon className="size-4" />
                        <span className="text-xs">{speechLanguages.find(l => l.value === selectedLanguage)?.label} is not available for on-device recognition.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Data Management settings */}
        {currentTab === 'data' && (
          <div className="space-y-6 max-w-2xl w-full border rounded-lg bg-muted/30 dark:bg-zinc-800/30 p-6 shadow-sm">
            <div>
              <h3 className="text-2xl font-semibold mb-1">Data Management</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your application data.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-base font-medium">Delete All Chats</h4>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone and will permanently delete all your chat history.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="w-full md:w-auto"
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
            </div>
          </div>
        )}
        
        {/* Account Settings */}
        {currentTab === 'account' && (
          <div className="space-y-6 max-w-2xl w-full border rounded-lg bg-muted/30 dark:bg-zinc-800/30 p-6 shadow-sm">
            <div>
              <h3 className="text-2xl font-semibold mb-1">Profile details</h3>
            </div>

            {/* Profile Section */}
            <div className="py-4 border-b dark:border-zinc-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground w-1/4">Profile</span>
                <div className="flex items-center gap-3 flex-1">
                  <Image
                    src={session?.user?.image || '/images/default-avatar.png'} 
                    alt={session?.user?.name || 'User Avatar'}
                    width={40} // Adjusted size
                    height={40} // Adjusted size
                    className="rounded-full border"
                  />
                  <span className="text-sm font-semibold">{session?.user?.name || 'User Name'}</span>
                </div>
                <Button variant="outline" size="sm">Update profile</Button>
              </div>
            </div>

            {/* Username Section */}
            <div className="py-4 border-b dark:border-zinc-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground w-1/4">Username</span>
                <div className="flex-1">
                  <span className="text-sm">{username || (session?.user?.email?.split('@')[0] || 'your_username')}</span>
                </div>
                <Button variant="outline" size="sm">Update username</Button>
              </div>
               {/* Input for updating username - can be conditionally rendered */}
               {/* <div className="mt-2 flex items-center gap-2">
                <Input 
                    id="usernameEdit" 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="max-w-xs text-sm"
                    placeholder="Enter new username"
                  />
                  <Button size="sm">Save</Button>
              </div> */}
            </div>

            {/* Email Addresses Section */}
            <div className="py-4 border-b dark:border-zinc-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground w-1/4">Email addresses</span>
                <div className="flex-1">
                  <span className="text-sm">{session?.user?.email || 'No email provided'}</span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">Primary</span>
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreHorizontal className="size-4" />
                </Button>
              </div>
              <div className="mt-3 pl-[calc(25%+0.75rem)]"> {/* Aligns with content area, considering gap */}
                <Button variant="outline" size="sm" className="text-sm">
                  <Plus className="size-4 mr-2" />
                  Add email address
                </Button>
              </div>
            </div>

            {/* Connected Accounts Section */}
            <div className="py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground w-1/4">Connected accounts</span>
                <div className="flex-1 flex items-center gap-2">
                  {/* Example for Google, assuming it's the provider */}
                  {session?.user?.email && (
                    <>
                      {/* Replace with actual Google icon if available or use a generic one */}
                      <svg className="size-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.81C21.54,11.9 21.35,11.1 21.35,11.1Z"/></svg>
                      <span className="text-sm">Google</span>
                      <span className="text-sm text-muted-foreground">• {session.user.email}</span>
                    </>
                  )}
                  {!session?.user?.email && <span className="text-sm text-muted-foreground">No connected accounts</span>}
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <MoreHorizontal className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
