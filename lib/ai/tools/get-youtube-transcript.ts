import { z } from 'zod';
import { tool } from 'ai';
import { YoutubeTranscript } from 'youtube-transcript';

// Define interfaces for transcript data
interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

interface FallbackTranscriptItem {
  text: string;
  start: number;
  duration: number;
}

// Add a simple in-memory cache for transcripts
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const transcriptCache = new Map<string, {
  timestamp: number;
  data: any;
}>();

// Simple delay function to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define the schema for the YouTube transcript tool
const youtubeTranscriptSchema = z.object({
  urlOrId: z.string().describe('YouTube URL or video ID'),
  languages: z
    .array(z.string())
    .default(['en'])
    .describe('List of language codes to try, in order of preference'),
  combineAll: z
    .boolean()
    .default(true)
    .describe(
      'If true, combine all transcript parts into a single text. If false, keep timestamp information',
    ),
});

// Helper function to extract video ID from URL
function extractVideoId(urlOrId: string): string {
  let videoId = urlOrId;

  if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
    // Handle youtu.be format
    if (urlOrId.includes('youtu.be/')) {
      videoId = urlOrId.split('youtu.be/')[1].split('?')[0];
    }
    // Handle regular youtube.com format with v parameter
    else if (urlOrId.includes('v=')) {
      const match = urlOrId.match(/v=([^&]+)/);
      videoId = match?.[1] || videoId;
    }
    // Handle youtube.com/embed format
    else if (urlOrId.includes('/embed/')) {
      videoId = urlOrId.split('/embed/')[1].split('?')[0];
    }
  }

  return videoId;
}

// Try to get video info (title, channel) from YouTube with enhanced fetch options
async function getVideoInfo(
  videoId: string,
): Promise<{ title?: string; channel?: string }> {
  // Check cache first
  const cacheKey = `video_info:${videoId}`;
  const cachedData = transcriptCache.get(cacheKey);
  
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('Using cached video info');
    return cachedData.data;
  }

  try {
    // Add small delay to avoid rate limiting
    await delay(100);
    
    // This uses public API endpoints with enhanced fetch options
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
      {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: controller.signal,
        cache: 'no-store'
      },
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`Failed to get video info: ${response.status} ${response.statusText}`);
      return {};
    }

    const data = await response.json();
    const result = {
      title: data.title,
      channel: data.author_name,
    };
    
    // Cache the result
    transcriptCache.set(cacheKey, {
      timestamp: Date.now(),
      data: result
    });
    
    return result;
  } catch (error) {
    console.log(
      `Failed to get video info: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
  }
}

// Alternative methods to fetch transcript
async function fetchTranscriptWithFallback(
  videoId: string,
  language = 'en',
): Promise<TranscriptItem[]> {
  // Check cache first
  const cacheKey = `transcript:${videoId}:${language}`;
  const cachedData = transcriptCache.get(cacheKey);
  
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('Using cached transcript data');
    return cachedData.data;
  }

  try {
    // Add small delay before making the request
    await delay(200);

    // First attempt with youtube-transcript with timeout
    const transcriptItems = await Promise.race([
      YoutubeTranscript.fetchTranscript(videoId, {
        lang: language,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("YoutubeTranscript timed out after 5 seconds")), 5000);
      })
    ]);

    if (transcriptItems && transcriptItems.length > 0) {
      // Cache successful result
      transcriptCache.set(cacheKey, {
        timestamp: Date.now(),
        data: transcriptItems
      });
      return transcriptItems;
    }

    throw new Error('No transcript items returned');
  } catch (primaryError) {
    console.log(
      `Primary method failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}`,
    );

    // Second attempt: external API fallback
    try {
      // Add small delay before trying alternative method
      await delay(300);
      
      // Use a public transcript API service as fallback with enhanced fetch options
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `https://yt-transcript-api.vercel.app/api/transcript?id=${videoId}&lang=${language}`,
        {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15'
          },
          signal: controller.signal,
          cache: 'no-store'
        },
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Fallback API returned status ${response.status}`);
      }

      const data = await response.json();

      if (!data.transcript || data.transcript.length === 0) {
        throw new Error('No transcript data returned from fallback API');
      }

      // Convert the format to match what our code expects
      const results = data.transcript.map((item: FallbackTranscriptItem) => ({
        text: item.text,
        offset: item.start * 1000,
        duration: item.duration * 1000,
      }));
      
      // Cache successful result
      transcriptCache.set(cacheKey, {
        timestamp: Date.now(),
        data: results
      });
      
      return results;
    } catch (fallbackError) {
      console.log(
        `Fallback method failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );

      // Third attempt: YouTube subtitles API endpoint
      try {
        // Add small delay before trying final method
        await delay(300);
        
        // Try to access YouTube's subtitle API directly with improved fetch options
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const subtitleUrl = `https://youtube.com/api/timedtext?lang=${language}&v=${videoId}`;
        const response = await fetch(subtitleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
          cache: 'no-store'
        });
        
        clearTimeout(timeoutId);

        if (!response.ok || response.headers.get('content-length') === '0') {
          throw new Error('No subtitles available from YouTube API');
        }

        const text = await response.text();

        // Simple XML parsing to extract transcript
        if (text?.includes('<text ')) {
          const items: TranscriptItem[] = [];
          const regex =
            /<text start="([\d\.]+)" dur="([\d\.]+)"[^>]*>(.*?)<\/text>/g;
          let match: RegExpExecArray | null = regex.exec(text);

          while (match !== null) {
            const start = Number.parseFloat(match[1]);
            const duration = Number.parseFloat(match[2]);
            const content = match[3]
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/<[^>]*>/g, ''); // Remove any HTML tags

            items.push({
              text: content,
              offset: start * 1000,
              duration: duration * 1000,
            });

            // Get next match
            match = regex.exec(text);
          }

          if (items.length > 0) {
            // Cache successful result
            transcriptCache.set(cacheKey, {
              timestamp: Date.now(),
              data: items
            });
            return items;
          }
        }
        throw new Error('Failed to parse subtitles from YouTube API');
      } catch (thirdError) {
        console.log(
          `Third method failed: ${thirdError instanceof Error ? thirdError.message : String(thirdError)}`,
        );

        // All methods failed
        throw new Error(`No transcript available for video ${videoId}`);
      }
    }
  }
}

// Process transcript data for different return formats
function processTranscript(transcriptItems: TranscriptItem[], combineAll = true) {
  // Format the transcript based on user preference
  if (combineAll) {
    // Combine all parts into a single text
    return transcriptItems.map((item) => item.text).join(' ');
  } else {
    // Format with timestamps
    return transcriptItems
      .map((item) => {
        const timestamp = Math.floor(item.offset / 1000);
        const minutes = Math.floor(timestamp / 60);
        const seconds = timestamp % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        return `[${timeStr}] ${item.text}`;
      })
      .join('\n');
  }
}

// Core implementation for YouTube transcript retrieval
async function getTranscriptCore(
  urlOrId: string,
  languages = ['en'],
  combineAll = true,
) {
  console.log(`Fetching YouTube transcript for: ${urlOrId}`);
  const videoId = extractVideoId(urlOrId);

  try {
    // Get video info first to provide better context in responses
    const videoInfo = await getVideoInfo(videoId);

    // Try all languages in order of preference
    let transcriptItems: TranscriptItem[] = [];
    let lastError = null;

    for (const language of languages) {
      try {
        transcriptItems = await fetchTranscriptWithFallback(videoId, language);
        if (transcriptItems.length > 0) {
          break; // Successfully found transcript in this language
        }
      } catch (error) {
        lastError = error;
        console.log(
          `Failed for language ${language}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Continue to next language
      }
    }

    if (transcriptItems.length === 0) {
      throw (
        lastError ||
        new Error(
          `No transcript available for video ${videoId} in languages: ${languages.join(', ')}`,
        )
      );
    }

    return {
      result: processTranscript(transcriptItems, combineAll),
      videoInfo,
      transcriptItems,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching YouTube transcript:', error);

    // Try to get video info to provide a more helpful response
    try {
      const videoInfo = await getVideoInfo(videoId);
      const videoTitle = videoInfo.title || `video ${videoId}`;
      const channelName = videoInfo.channel ? ` from ${videoInfo.channel}` : '';

      // Return a more helpful error message using template literals
      const message = `The transcript for "${videoTitle}"${channelName} is not available. This could be because:

1. The creator has not uploaded captions/subtitles
2. Automatic captions are disabled for this video
3. The video might be private, age-restricted, or requires a subscription

I'd be happy to try finding alternative information sources about this topic.`;

      return {
        result: message,
        videoInfo,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      };
    } catch {
      // Fallback to basic error message if even video info can't be retrieved
      const message = `Error: Failed to fetch YouTube transcript: ${error instanceof Error ? error.message : String(error)}

The transcript for this video appears to be unavailable. I'd be happy to help find alternative information sources on this topic.`;

      return {
        result: message,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      };
    }
  }
}

// Define the YouTube transcript tool
export const getYoutubeTranscript = tool({
  description: 'Fetch the transcript of a YouTube video',
  parameters: youtubeTranscriptSchema,
  async execute({ urlOrId, languages = ['en'], combineAll = true }) {
    const result = await getTranscriptCore(urlOrId, languages, combineAll);
    return result.result;
  },
});

// Legacy compatibility function (for direct imports)
export async function fetchYouTubeTranscript(
  videoId: string,
  opts = { languages: ['en'], combineAll: true },
) {
  const result = await getTranscriptCore(
    videoId,
    opts.languages,
    opts.combineAll,
  );

  // Return in the format expected by the old API
  return {
    cache: result.success,
    transcript: result.result,
    cacheControl: { type: 'ephemeral' },
  };
}
