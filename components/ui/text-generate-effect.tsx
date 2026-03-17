"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Text generate effect component
 * 
 * Provides a cinematic "blur-to-focus" reveal animation for text.
 * Optimized for both static (historical) messages and real-time streaming tokens.
 * 
 * @param words - The full string content to animate
 * @param filter - Whether to use the blur filter effect (default: true)
 * @param duration - Animation duration for each individual word (default: 0.5s)
 * @param staggerDelay - The delay between sequential words on initial mount (default: 0.05s)
 * @param as - The HTML element to render as (default: "div")
 */
export interface TextGenerateEffectProps extends Omit<React.ComponentProps<"div">, "children"> {
  words: string;
  filter?: boolean;
  duration?: number;
  staggerDelay?: number;
  as?: React.ElementType;
}

export function TextGenerateEffect({
  words,
  className,
  filter = true,
  duration = 0.5,
  staggerDelay = 0.05,
  as: Component = "div",
  ...props
}: TextGenerateEffectProps) {
  // Split the string into individual words while preserving whitespace logic.
  // We use useMemo to avoid re-splitting on every minor render unless the content actually changes.
  const wordsArray = React.useMemo(() => words.split(" "), [words]);
  
  // Track if the component has finished its initial mount.
  // This allows us to apply a stagger delay only to the content present on first load (like historical messages).
  // For words that arrive later via streaming updates, we reveal them immediately (delay: 0)
  // to prevent the animation from lagging behind the actual token stream.
  const [isInitiallyLoaded, setIsInitiallyLoaded] = React.useState(false);
  
  React.useEffect(() => {
    setIsInitiallyLoaded(true);
  }, []);

  return (
    <Component
      className={cn("font-normal inline", className)}
      data-slot="text-generate-effect"
      {...props}
    >
      {wordsArray.map((word, idx) => (
        <React.Fragment
          // biome-ignore lint/suspicious/noArrayIndexKey: Index is stable as tokens are only appended during streaming
          key={`${word}-${idx}`}
        >
          <motion.span
            className="text-generate-word inline-block"
            initial={{ 
              opacity: 0, 
              filter: filter ? "blur(8px)" : "none",
              y: 2 // Slight upward movement for a "materializing" feel
            }}
            animate={{ 
              opacity: 1, 
              filter: filter ? "blur(0px)" : "none",
              y: 0 
            }}
            transition={{
              duration: duration,
              // Logic: Stagger on initial mount (for historical context), 
              // but reveal new streaming words instantly.
              delay: !isInitiallyLoaded ? idx * staggerDelay : 0
            }}
          >
            {word}
          </motion.span>
          {/* Re-insert the space after each word, except the very last one. */}
          {idx < wordsArray.length - 1 && <span className="inline">{" "}</span>}
        </React.Fragment>
      ))}
    </Component>
  );
}

export default TextGenerateEffect;
