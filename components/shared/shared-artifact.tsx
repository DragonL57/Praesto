'use client';

import { AnimatePresence, motion } from 'framer-motion';
import equal from 'fast-deep-equal';
import { formatDistance } from 'date-fns';
import {
  memo,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useDebounceCallback, useWindowSize } from 'usehooks-ts';
import type { UIMessage } from 'ai';

import { ArtifactActions } from '../artifact-actions';
import { ArtifactCloseButton } from '../artifact-close-button';
import { ArtifactMessages } from '../artifact-messages';
import { Toolbar } from '../toolbar';
import { VersionFooter } from '../version-footer';
import { artifactDefinitions } from '../artifact';
import { useArtifact } from '@/hooks/use-artifact';
import { fetcher } from '@/lib/utils';
import type {
  AppendFunction,
  Attachment,
  ChatStatus,
  SetMessagesFunction,
} from '@/lib/ai/types';
import type { Document, Vote } from '@/lib/db/schema';

function PureSharedArtifact({
  chatId,
  _input,
  _setInput,
  _handleSubmit,
  status,
  stop,
  _attachments,
  _setAttachments,
  append,
  messages,
  setMessages,
  reload,
  votes,
  isReadonly,
}: {
  chatId: string;
  _input: string;
  _setInput: (input: string) => void;
  _handleSubmit: (event?: { preventDefault?: () => void }) => void;
  status: ChatStatus;
  stop: () => void;
  _attachments: Array<Attachment>;
  _setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: SetMessagesFunction;
  votes: Array<Vote> | undefined;
  append: AppendFunction;
  reload: () => Promise<string | null | undefined>;
  isReadonly: boolean;
}) {
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const { mutate } = useSWRConfig();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  // Find artifact definition
  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind,
  );

  const [mode, setMode] = useState<'edit' | 'diff'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  // Instead of using useSidebar hook, we'll create a static variable for the sidebar state
  // We don't use this variable so prefixing with _ to indicate it's intentionally unused
  const _isSidebarOpen = false; // Always assume sidebar is closed in shared view

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    artifact.documentId !== 'init' && artifact.status !== 'streaming'
      ? `/api/document?id=${artifact.documentId}`
      : null,
    fetcher,
  );

  // Initialize artifact if needed - all hooks need to be called unconditionally
  useEffect(() => {
    if (artifact.documentId === 'init' || !artifactDefinition?.initialize) {
      return;
    }

    artifactDefinition.initialize({
      documentId: artifact.documentId,
      setMetadata,
    });
  }, [artifact.documentId, artifactDefinition, setMetadata]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setArtifact]);

  useEffect(() => {
    mutateDocuments();
  }, [artifact.status, mutateDocuments]);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!artifact) return;

      mutate<Array<Document>>(
        `/api/document?id=${artifact.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${artifact.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: artifact.title,
                content: updatedContent,
                kind: artifact.kind,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [artifact, mutate],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange],
  );

  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */
  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  // Early return if no artifactDefinition is found
  if (!artifactDefinition) {
    return null; // Don't throw error in shared view
  }

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          data-testid="artifact"
          className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-transparent"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
        >
          {!isMobile && (
            <motion.div
              className="fixed bg-background h-dvh"
              initial={{
                width: windowWidth,
                right: 0,
              }}
              animate={{ width: windowWidth, right: 0 }}
              exit={{
                width: windowWidth,
                right: 0,
              }}
            />
          )}

          {!isMobile && (
            <motion.div
              className="relative w-[400px] bg-muted dark:bg-background h-dvh shrink-0"
              initial={{ opacity: 0, x: 10, scale: 1 }}
              animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 200,
                  damping: 30,
                },
              }}
              exit={{
                opacity: 0,
                x: 0,
                scale: 1,
                transition: { duration: 0 },
              }}
            >
              <AnimatePresence>
                {!isCurrentVersion && (
                  <motion.div
                    className="left-0 absolute h-dvh w-[400px] top-0 bg-zinc-900/50 z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              <div className="flex flex-col h-full justify-between items-center gap-4">
                <ArtifactMessages
                  chatId={chatId}
                  status={status}
                  votes={votes}
                  messages={messages}
                  setMessages={setMessages}
                  reload={reload}
                  append={append}
                  isReadonly={isReadonly}
                  artifactStatus={artifact.status}
                />
              </div>
            </motion.div>
          )}

          <motion.div
            className="fixed dark:bg-muted bg-background h-dvh flex flex-col overflow-hidden md:border-l dark:border-zinc-700 border-zinc-200"
            initial={
              isMobile
                ? {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
                : {
                    opacity: 1,
                    x: artifact.boundingBox.left,
                    y: artifact.boundingBox.top,
                    height: artifact.boundingBox.height,
                    width: artifact.boundingBox.width,
                    borderRadius: 50,
                  }
            }
            animate={
              isMobile
                ? {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth ? windowWidth : 'calc(100dvw)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
                : {
                    opacity: 1,
                    x: 400,
                    y: 0,
                    height: windowHeight,
                    width: windowWidth
                      ? windowWidth - 400
                      : 'calc(100dvw-400px)',
                    borderRadius: 0,
                    transition: {
                      delay: 0,
                      type: 'spring',
                      stiffness: 200,
                      damping: 30,
                      duration: 5000,
                    },
                  }
            }
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: 'spring',
                stiffness: 600,
                damping: 30,
              },
            }}
          >
            <div className="p-2 flex flex-row justify-between items-start">
              <div className="flex flex-row gap-4 items-start">
                <ArtifactCloseButton />

                <div className="flex flex-col">
                  <div className="font-medium">{artifact.title}</div>

                  {isContentDirty ? (
                    <div className="text-sm text-muted-foreground">
                      Saving changes...
                    </div>
                  ) : document ? (
                    <div className="text-sm text-muted-foreground">
                      {`Updated ${formatDistance(
                        new Date(document.createdAt),
                        new Date(),
                        {
                          addSuffix: true,
                        },
                      )}`}
                    </div>
                  ) : (
                    <div className="w-32 h-3 mt-2 bg-muted-foreground/20 rounded-md animate-pulse" />
                  )}
                </div>
              </div>

              <ArtifactActions
                artifact={artifact}
                currentVersionIndex={currentVersionIndex}
                handleVersionChange={handleVersionChange}
                isCurrentVersion={isCurrentVersion}
                mode={mode}
                metadata={metadata}
                setMetadata={setMetadata}
              />
            </div>

            <div className="dark:bg-muted bg-background h-full overflow-y-auto !max-w-full items-center">
              <artifactDefinition.content
                title={artifact.title}
                content={
                  isCurrentVersion
                    ? artifact.content
                    : getDocumentContentById(currentVersionIndex)
                }
                mode={mode}
                status={artifact.status}
                currentVersionIndex={currentVersionIndex}
                suggestions={[]}
                onSaveContent={saveContent}
                isInline={false}
                isCurrentVersion={isCurrentVersion}
                getDocumentContentById={getDocumentContentById}
                isLoading={isDocumentsFetching && !artifact.content}
                metadata={metadata}
                setMetadata={setMetadata}
              />

              <AnimatePresence>
                {isCurrentVersion && (
                  <Toolbar
                    isToolbarVisible={isToolbarVisible}
                    setIsToolbarVisible={setIsToolbarVisible}
                    append={append}
                    status={status}
                    stop={stop}
                    setMessages={setMessages}
                    artifactKind={artifact.kind}
                  />
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {!isCurrentVersion && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const SharedArtifact = memo(
  PureSharedArtifact,
  (
    prevProps: Parameters<typeof PureSharedArtifact>[0],
    nextProps: Parameters<typeof PureSharedArtifact>[0],
  ) => {
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.votes, nextProps.votes)) return false;
    if (prevProps._input !== nextProps._input) return false;
    if (!equal(prevProps.messages, nextProps.messages.length)) return false;

    return true;
  },
);
