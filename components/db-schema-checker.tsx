'use client';

import { useEffect } from 'react';
import { ensureUserTableSchema } from "@/lib/db/queries";

export function DbSchemaChecker() {
  useEffect(() => {
    // Only run in browser environment, not during SSR or build
    ensureUserTableSchema()
      .then((result) => {
        if (result) {
          console.log('[App] Database schema check completed successfully');
        } else {
          console.warn('[App] Database schema check failed, some features may not work correctly');
        }
      })
      .catch((error) => {
        console.error('[App] Error during database schema check:', error);
      });
  }, []);

  // This component doesn't render anything
  return null;
} 