import { createDocumentHandler } from '@/lib/artifacts/server';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

function extractImageParams(promptOrDescription: string) {
  // Simple extraction for width, height, and seed from the prompt (AI can format as: width=..., height=..., seed=...)
  const widthMatch = promptOrDescription.match(/width=(\d{2,4})/);
  const heightMatch = promptOrDescription.match(/height=(\d{2,4})/);
  const seedMatch = promptOrDescription.match(/seed=(\d+)/);
  const width = widthMatch ? widthMatch[1] : '1024';
  const height = heightMatch ? heightMatch[1] : '1024';
  const seed = seedMatch ? seedMatch[1] : undefined;
  return { width, height, seed };
}

const IMAGE_MODEL: string = 'gpt-image  '; // or 'gemini'

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    const { width, height, seed } = extractImageParams(title);
    if (IMAGE_MODEL === 'gemini') {
      // Gemini image generation (returns base64 data URL)
      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt: title,
        providerOptions: {
          google: { responseModalities: ['TEXT', 'IMAGE'] },
        },
      });
      const imageFile = result.files?.find(file => file.mimeType?.startsWith('image/'));
      if (!imageFile) throw new Error('No image generated.');
      const base64Image = imageFile.base64;
      const dataUrl = `data:image/png;base64,${base64Image}`;
      dataStream.writeData({
        type: 'image-delta',
        content: dataUrl,
      });
      return dataUrl;
    } else {
      // Pollinations (gptimage) image generation (returns direct image URL)
      const encodedPrompt = encodeURIComponent(title);
      const params = new URLSearchParams({
        model: 'gptimage',
        width,
        height,
        nologo: 'true',
        private: 'true',
        enhance: 'true',
        safe: 'false',
      });
      if (seed) params.set('seed', seed);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
      dataStream.writeData({
        type: 'image-delta',
        content: imageUrl,
      });
      return imageUrl;
    }
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const { width, height, seed } = extractImageParams(description);
    if (IMAGE_MODEL === 'gemini') {
      // Gemini image generation (returns base64 data URL)
      const result = await generateText({
        model: google('gemini-2.0-flash-exp'),
        prompt: description,
        providerOptions: {
          google: { responseModalities: ['TEXT', 'IMAGE'] },
        },
      });
      const imageFile = result.files?.find(file => file.mimeType?.startsWith('image/'));
      if (!imageFile) throw new Error('No image generated.');
      const base64Image = imageFile.base64;
      const dataUrl = `data:image/png;base64,${base64Image}`;
      dataStream.writeData({
        type: 'image-delta',
        content: dataUrl,
      });
      return dataUrl;
    } else {
      // Pollinations (gptimage) image generation (returns direct image URL)
      const encodedPrompt = encodeURIComponent(description);
      const params = new URLSearchParams({
        model: 'gptimage',
        width,
        height,
        nologo: 'true',
        private: 'true',
        enhance: 'true',
        safe: 'false',
      });
      if (seed) params.set('seed', seed);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
      dataStream.writeData({
        type: 'image-delta',
        content: imageUrl,
      });
      return imageUrl;
    }
  },
});
