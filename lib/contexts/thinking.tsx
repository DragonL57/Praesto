import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface ThinkingItem {
  id: string;
  type: 'reasoning' | 'tool-call' | 'tool-result' | 'council-stage';
  content?: string;
  status?: 'pending' | 'active' | 'complete' | 'error';
  metadata?: Record<string, unknown>;
}

interface ThinkingContextValue {
  isSynthesizing: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setIsSynthesizing: (v: boolean) => void;
  reset: () => void;
}

const ThinkingContext = createContext<ThinkingContextValue | null>(null);

export function ThinkingProvider({ children }: { children: ReactNode }) {
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const reset = useCallback(() => {
    setIsSynthesizing(false);
    setIsOpen(false);
  }, []);

  return (
    <ThinkingContext.Provider
      value={{ isSynthesizing, isOpen, open, close, setIsSynthesizing, reset }}
    >
      {children}
    </ThinkingContext.Provider>
  );
}

export function useThinking() {
  const ctx = useContext(ThinkingContext);
  if (!ctx) throw new Error('useThinking must be used within ThinkingProvider');
  return ctx;
}
