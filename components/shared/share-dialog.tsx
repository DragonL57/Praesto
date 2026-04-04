'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CheckIcon, CopyIcon, ShareIcon } from '../icons';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { cn } from '@/lib/utils';
import type { VisibilityType } from '../visibility-selector';

export function ShareDialog({
  chatId,
  className,
  selectedVisibilityType,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { visibilityType, setVisibilityType } = useChatVisibility({
    chatId,
    initialVisibility: selectedVisibilityType,
  });

  // Generate share URL using the new /share route instead of /chat
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${chatId}`
      : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 w-8 md:h-10 md:w-auto p-0 md:px-3 md:gap-2',
            className,
          )}
        >
          <ShareIcon size={18} />
          <span className="hidden md:inline text-sm">Share</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="end">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Share this conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visibility-switch" className="text-base">
                  Make conversation public
                </Label>
                <div className="text-xs text-muted-foreground">
                  {visibilityType === 'public'
                    ? 'Anyone with the link can view this chat'
                    : 'Only you can access this chat'}
                </div>
              </div>
              <Switch
                id="visibility-switch"
                checked={visibilityType === 'public'}
                onCheckedChange={(checked) => {
                  setVisibilityType(checked ? 'public' : 'private');
                }}
                className="scale-110"
              />
            </div>

            {visibilityType === 'public' && (
              <div className="pt-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <div className="flex mt-1">
                  <Input
                    id="link"
                    value={shareUrl}
                    readOnly
                    className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted h-11 text-base"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="rounded-l-none h-11"
                    variant="secondary"
                  >
                    {copied ? <CheckIcon size={20} /> : <CopyIcon size={20} />}
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
