import { type NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface Metadata {
    title?: string | null;
    siteName?: string | null;
    description?: string | null; // Added description as it's often available
    favicon?: string | null;
    image?: string | null;
    author?: string | null;
    publishedDate?: string | null; // Added publishedDate
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

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; UnitaskAISearchBot/1.0; +https://unitask.ai/bot)', // Be a good citizen
                'Accept': 'text/html',
            },
            redirect: 'follow',
        });

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

        // Published Date - Try various common sources
        let publishedDateStr =
            $('meta[property="article:published_time"]').attr('content') ||
            $('meta[property="og:article:published_time"]').attr('content') ||
            $('meta[name="date"]').attr('content') ||
            $('meta[name="dcterms.created"]').attr('content') ||
            $('meta[name="cXenseParse:recs:publishtime"]').attr('content') ||
            $('time[datetime][pubdate]').attr('datetime') || // Obsolete but might exist
            $('time[datetime]').first().attr('datetime'); // General first time element with datetime

        // Check JSON-LD for datePublished if no meta tags found one
        if (!publishedDateStr) {
            $('script[type="application/ld+json"]').each((_i, el) => {
                try {
                    const jsonLd = JSON.parse($(el).html() || '');
                    // Handle array of JSON-LD objects or single object
                    const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
                    for (const item of items) {
                        if (item.datePublished) {
                            publishedDateStr = item.datePublished;
                            break;
                        } else if (item["@graph"]) { // Check for @graph array
                            const graphItems = Array.isArray(item["@graph"]) ? item["@graph"] : [item["@graph"]];
                            for (const graphItem of graphItems) {
                                if (graphItem.datePublished) {
                                    publishedDateStr = graphItem.datePublished;
                                    break;
                                }
                            }
                        }
                        if (publishedDateStr) break;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (_e) {
                    // console.warn('Error parsing JSON-LD for datePublished:', e);
                }
                if (publishedDateStr) return false; // break out of .each loop
            });
        }

        if (publishedDateStr) {
            // Attempt to parse and re-format to ISO string for consistency, if valid
            try {
                const dateObj = new Date(publishedDateStr);
                if (!Number.isNaN(dateObj.getTime())) {
                    metadata.publishedDate = dateObj.toISOString();
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) {
                // console.warn('Could not parse extracted date string:', publishedDateStr);
            }
        }

        return NextResponse.json(metadata);

    } catch (error) {
        console.error(`Error fetching metadata for ${url}:`, error);
        let errorMessage = 'Internal server error';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ error: `Error processing URL: ${errorMessage}` }, { status: 500 });
    }
}