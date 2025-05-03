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
        // Determine if the file needs conversion to PDF
        const needsPdfConversion = (file: File) => {
            const documentTypes = [
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
                'application/msword', // doc
                'application/vnd.ms-word',
                'text/plain',
                'text/csv',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
                'application/vnd.ms-excel', // xls
                'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
                'application/vnd.ms-powerpoint' // ppt
            ];

            // Check by file extension too
            const ext = file.name.split('.').pop()?.toLowerCase();
            const documentExtensions = ['docx', 'doc', 'txt', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'];

            return documentTypes.includes(file.type) ||
                (ext && documentExtensions.includes(ext));
        };

        // Check if we need to convert this file to PDF (not an image or already PDF)
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && needsPdfConversion(file)) {
            // Send to our PDF conversion endpoint silently without toast notifications
            const pdfResponse = await fetch('/api/files/convert-to-pdf', {
                method: 'POST',
                body: formData,
            });

            if (pdfResponse.ok) {
                const data = await pdfResponse.json();

                return {
                    url: data.url,
                    name: data.pathname,
                    contentType: data.contentType,
                    originalFile: {
                        name: file.name,
                        type: file.type
                    }
                };
            } else {
                const error = await pdfResponse.json();
                console.error('Failed to convert document:', error);
                return undefined;
            }
        }

        // For images and PDFs, use the standard upload endpoint
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const data = await response.json();
            const { url, pathname, contentType } = data;

            return {
                url,
                name: pathname,
                contentType: contentType,
            };
        }
        const { error } = await response.json();
        console.error(error);
        return undefined;
    } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return undefined;
    }
};