import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface Metadata {
    title?: string | null;
    siteName?: string | null;
    description?: string | null; // Added description as it's often available
    favicon?: string | null;
    image?: string | null;
    author?: string | null;
}

// Helper to resolve relative URLs to absolute
function resolveUrl(baseUrl: string, relativeUrl: string): string {
    if (relativeUrl.startsWith('http') || relativeUrl.startsWith('//')) {
        return relativeUrl.startsWith('//') ? `https:${relativeUrl}` : relativeUrl;
    }
    try {
        return new URL(relativeUrl, baseUrl).toString();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
        return relativeUrl; // Fallback if resolution fails
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; UnitaskAISearchBot/1.0; +https://unitask.ai/bot)', // Be a good citizen
                'Accept': 'text/html',
            },
            redirect: 'follow',
            signal: controller.signal, // Added AbortSignal for timeout
        });
        clearTimeout(timeoutId); // Clear timeout if fetch completes

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const metadata: Metadata = {};

        // Title
        metadata.title = $('meta[property="og:title"]').attr('content') || $('title').first().text() || null;

        // Site Name
        metadata.siteName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname;

        // Description
        metadata.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;

        // Favicon
        const faviconHref = $('link[rel="icon"]').attr('href') ||
            $('link[rel="shortcut icon"]').attr('href');
        if (faviconHref) {
            metadata.favicon = resolveUrl(url, faviconHref);
        } else {
            // Fallback to /favicon.ico at the root of the hostname
            const { origin } = new URL(url);
            metadata.favicon = `${origin}/favicon.ico`;
            // We might want to HEAD check this later to ensure it exists, but for now, assume it might
        }

        // Image (og:image)
        const ogImage = $('meta[property="og:image"]').attr('content');
        if (ogImage) {
            metadata.image = resolveUrl(url, ogImage);
        }

        // Author - this can be tricky and varied
        metadata.author = $('meta[name="author"]').attr('content') ||
            $('meta[property="article:author"]').attr('content') ||
            $('meta[property="og:article:author"]').attr('content') ||
            null;

        return NextResponse.json(metadata);

    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout in case of error too
        console.error(`Error fetching metadata for ${url}:`, error);
        let errorMessage = 'Internal server error';
        if (error instanceof Error) {
            errorMessage = error.message;
            // Check if it's an AbortError (timeout)
            if (error.name === 'AbortError') {
                return NextResponse.json({ error: `Request timed out while trying to reach: ${url}` }, { status: 504 }); // Gateway Timeout
            }
        }
        // More specific error for other fetch issues
        if (errorMessage.includes('fetch failed')) { // This might be redundant if AbortError is caught
            return NextResponse.json({ error: `Could not reach the specified URL: ${url}` }, { status: 504 });
        }
        return NextResponse.json({ error: `Error processing URL: ${errorMessage}` }, { status: 500 });
    }
} 