'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className="overflow-hidden w-full h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ 
          type: "spring",
          stiffness: 260, 
          damping: 25,
          duration: 0.25
        }}
        className={cn("w-full h-full", className)}
      >
        {children}
      </motion.div>
    </div>
  );
}