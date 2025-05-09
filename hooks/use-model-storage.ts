import { useCallback } from 'react';
import { useLocalStorage as useHooksLocalStorage } from 'usehooks-ts';

/**
 * A custom hook for safely storing model IDs in localStorage
 * This wrapper properly handles string values that might not be valid JSON
 */
export function useModelStorage(key: string, initialValue: string) {
    // Use a custom serializer/deserializer to handle string values safely
    const serialize = useCallback((value: string) => {
        // Wrap the value in quotes to make it valid JSON
        return JSON.stringify(value);
    }, []);

    const deserialize = useCallback((value: string) => {
        try {
            // Parse the JSON and return the inner string
            return JSON.parse(value);
        } catch {
            // If parsing fails, return the raw value - this will help migrate existing values
            return value;
        }
    }, []);

    // Use the underlying hook but with our custom handlers
    const [storedValue, setStoredValue] = useHooksLocalStorage(key, initialValue, {
        serializer: serialize,
        deserializer: deserialize,
    });

    return [storedValue, setStoredValue] as const;
}