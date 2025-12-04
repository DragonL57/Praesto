import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from './ui/tooltip';
import { artifactDefinitions } from './artifact';
import type { UIArtifact } from './artifact';
import { memo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Define a generic interface for artifact actions
interface ArtifactActionsProps<T = unknown> {
  artifact: UIArtifact;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: T;
  setMetadata: Dispatch<SetStateAction<T>>;
}

function PureArtifactActions<T = unknown>({
  artifact,
  handleVersionChange,
  currentVersionIndex,
  isCurrentVersion,
  mode,
  metadata,
  setMetadata,
}: ArtifactActionsProps<T>) {
  const [isLoading, setIsLoading] = useState(false);

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  if (!artifactDefinition) {
    throw new Error('Artifact definition not found!');
  }

  // Convert the current context to the appropriate type based on the artifact kind
  const actionContext = {
    content: artifact.content,
    handleVersionChange,
    currentVersionIndex,
    isCurrentVersion,
    mode,
    metadata,
    setMetadata,
  };

  return (
    <div className="flex flex-row gap-1">
      <TooltipProvider>
        {artifactDefinition.actions.map((action) => (
          <Tooltip key={action.description}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn('h-fit dark:hover:bg-zinc-700', {
                  'p-2': !action.label,
                  'py-1.5 px-2': action.label,
                })}
                onClick={async () => {
                  setIsLoading(true);

                  try {
                    // The artifact system uses dynamic typing that TypeScript can't fully infer
                    // so we use @ts-expect-error to suppress the type checking here
                    // @ts-expect-error The action.onClick expects a specific type, but we're passing a generic type
                    await Promise.resolve(action.onClick(actionContext));
                  } catch {
                    toast.error('Failed to execute action');
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={
                  isLoading || artifact.status === 'streaming'
                    ? true
                    : action.isDisabled
                      ? // @ts-expect-error The action.isDisabled expects a specific type
                        action.isDisabled(actionContext)
                      : false
                }
              >
                {action.icon}
                {action.label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{action.description}</TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}

export const ArtifactActions = memo(
  PureArtifactActions,
  (prevProps, nextProps) => {
    if (prevProps.artifact.status !== nextProps.artifact.status) return false;
    if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
      return false;
    if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
    if (prevProps.artifact.content !== nextProps.artifact.content) return false;

    return true;
  },
);
