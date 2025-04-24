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
      videoId = match?.[1] || videoId; // Using optional chaining here
    }
    // Handle youtube.com/embed format
    else if (urlOrId.includes('/embed/')) {
      videoId = urlOrId.split('/embed/')[1].split('?')[0];
    }
  }

  return videoId;
}

// Define the YouTube transcript tool using proper type definition
export const getYoutubeTranscript = tool({
  // Use "parameters" instead of "schema" for the ai package's tool function
  parameters: youtubeTranscriptSchema,
  description: 'Fetch the transcript of a YouTube video',
  async execute({ urlOrId, languages = ['en'], combineAll = true }) {
    console.log(`Fetching YouTube transcript for: ${urlOrId}`);

    try {
      const videoId = extractVideoId(urlOrId);

      // Fetch transcript using the youtube-transcript package directly
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: languages[0],
      });

      if (!transcriptItems || transcriptItems.length === 0) {
        throw new Error(
          `No transcript available for video ${videoId} in languages: ${languages.join(', ')}`,
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
