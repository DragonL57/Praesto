import { z } from 'zod';
import { tool } from 'ai';
import { YoutubeTranscript } from 'youtube-transcript';

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

// Alternative approach using innertube API
async function fetchTranscriptWithFallback(
  videoId: string,
  language = 'en',
): Promise<any[]> {
  try {
    // First attempt with youtube-transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: language,
    });

    if (transcriptItems && transcriptItems.length > 0) {
      return transcriptItems;
    }

    throw new Error('No transcript items returned');
  } catch (error) {
    console.log(
      `Primary method failed: ${error instanceof Error ? error.message : String(error)}`,
    );

    // Fallback method: use our own fetch implementation
    try {
      // We'll use a public transcript API service as fallback
      const response = await fetch(
        `https://yt-transcript-api.vercel.app/api/transcript?id=${videoId}&lang=${language}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Fallback API returned status ${response.status}`);
      }

      const data = await response.json();

      if (!data.transcript || data.transcript.length === 0) {
        throw new Error('No transcript data returned from fallback API');
      }

      // Convert the format to match what our code expects
      return data.transcript.map((item: any) => ({
        text: item.text,
        offset: item.start * 1000,
        duration: item.duration * 1000,
      }));
    } catch (fallbackError) {
      console.log(
        `Fallback method failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
      );

      // Both methods failed
      throw new Error(
        `[YoutubeTranscript] Failed to retrieve transcript for ${videoId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Define the YouTube transcript tool using proper type definition
export const getYoutubeTranscript = tool({
  parameters: youtubeTranscriptSchema,
  description: 'Fetch the transcript of a YouTube video',
  async execute({ urlOrId, languages = ['en'], combineAll = true }) {
    console.log(`Fetching YouTube transcript for: ${urlOrId}`);

    try {
      const videoId = extractVideoId(urlOrId);

      // Try all languages in order of preference
      let transcriptItems = [];
      let lastError = null;

      for (const language of languages) {
        try {
          transcriptItems = await fetchTranscriptWithFallback(
            videoId,
            language,
          );
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
    } catch (error) {
      console.error('Error fetching YouTube transcript:', error);
      return `Error: Failed to fetch YouTube transcript: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
});
