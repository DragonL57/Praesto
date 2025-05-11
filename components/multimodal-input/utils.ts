// Utility functions for multimodal input components

/**
 * Detects the user's browser language and maps it to a supported language code
 * @returns A supported language code string or 'auto' if detection fails
 */
export const detectUserLanguage = (): string => {
    // Default to auto-detect if we can't determine
    const userLang = 'auto';

    try {
        // Check if running in browser environment
        if (typeof navigator === 'undefined') {
            return userLang;
        }

        // Get browser language(s)
        const browserLang = navigator.language ||
            (Array.isArray(navigator.languages) && navigator.languages[0]);

        if (browserLang) {
            // Extract base language code (e.g., 'en', 'fr', 'de')
            const baseLang = browserLang.split('-')[0].toLowerCase();

            // Map base language to supported language codes
            const langMapping: Record<string, string> = {
                'en': 'en-US', // Default English to US
                'es': 'es-ES',
                'fr': 'fr-FR',
                'de': 'de-DE',
                'it': 'it-IT',
                'pt': 'pt-BR', // Default Portuguese to Brazil
                'vi': 'vi-VN',
                'zh': 'zh-CN', // Default Chinese to Simplified
                'ja': 'ja-JP',
                'ko': 'ko-KR',
                'ar': 'ar-SA',
                'ru': 'ru-RU',
                'hi': 'hi-IN'
            };

            // Check for specific language+region combinations
            if (browserLang === 'en-GB') return 'en-GB';
            if (browserLang === 'pt-PT') return 'pt-PT';
            if (browserLang === 'zh-TW') return 'zh-TW';

            // Return mapped language or auto if not supported
            return langMapping[baseLang] || 'auto';
        }
    } catch (error) {
        console.warn('Error detecting browser language:', error);
    }

    return userLang;
};

/**
 * Uploads a file to the server
 * @param file The file to upload
 * @returns The uploaded attachment or undefined if upload failed
 */
export const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        // All files now go to the main upload endpoint
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            // The /api/files/upload endpoint now returns a richer object
            // including url, pathname, contentType, size, and originalFilename.
            // We'll map this to the Attachment-like structure the rest of the client expects.
            // The 'name' property in Attachment is often used for the blob's pathname.
            return {
                url: data.url,
                name: data.pathname, // Or data.originalFilename if preferred for display name logic elsewhere
                contentType: data.contentType,
                size: data.size,
                originalFilename: data.originalFilename,
            };
        }

        const errorData = await response.json().catch(() => ({ error: 'Upload failed with no specific error message.' }));
        console.error('File upload failed:', errorData.error || response.statusText);
        return undefined;

    } catch (uploadError) {
        console.error('Error during file upload process:', uploadError);
        return undefined;
    }
};