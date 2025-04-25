import { z } from 'zod';
import { tool } from 'ai';

// Define interfaces for transcript data
interface TranscriptItem {
  text: string;
  offset: number;
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

// Get transcript using our Python API endpoint
async function fetchTranscriptFromPythonApi(
  videoId: string,
  languages: string[]
): Promise<TranscriptItem[]> {
  // Check cache first
  const cacheKey = `transcript:${videoId}:${languages.join(',')}`;
  const cachedData = transcriptCache.get(cacheKey);
  
  if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
    console.log('Using cached transcript data');
    return cachedData.data;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const baseDomain = isProduction 
    ? process.env.VERCEL_URL || 'your-deployed-vercel-app.vercel.app' 
    : 'localhost:3000';
  
  const protocol = isProduction ? 'https' : 'http';
  const apiUrl = `${protocol}://${baseDomain}/api/get_transcript`;

  const url = new URL(apiUrl);
  url.searchParams.append('videoId', videoId);
  languages.forEach(lang => url.searchParams.append('languages', lang));

  console.log(`Fetching transcript from Python API: ${url.toString()}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Unknown error from transcript API');
    }

    // Convert the transcript data to our format
    const transcriptItems: TranscriptItem[] = data.transcript.map((item: any) => ({
      text: item.text,
      offset: item.start * 1000, // Convert to milliseconds
      duration: item.duration * 1000 // Convert to milliseconds
    }));
    
    // Cache the result
    transcriptCache.set(cacheKey, {
      timestamp: Date.now(),
      data: transcriptItems
    });
    
    return transcriptItems;
  } catch (error) {
    console.error(`Error fetching transcript from Python API: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
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

    // Try to get transcript using our Python API
    const transcriptItems = await fetchTranscriptFromPythonApi(videoId, languages);

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
