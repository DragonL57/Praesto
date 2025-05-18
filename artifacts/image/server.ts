import { createDocumentHandler } from '@/lib/artifacts/server';

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

export const imageDocumentHandler = createDocumentHandler<'image'>({
  kind: 'image',
  onCreateDocument: async ({ title, dataStream }) => {
    const { width, height, seed } = extractImageParams(title);
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
  },
  onUpdateDocument: async ({ description, dataStream }) => {
    const { width, height, seed } = extractImageParams(description);
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
  },
});
