import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.unitaskai.com';

  // Define the primary static routes
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Add more static routes as needed
  ] as MetadataRoute.Sitemap;

  // In a production environment, you might want to:
  // 1. Fetch dynamic pages like blog posts from your database
  // 2. Add them to the sitemap with appropriate metadata

  return routes;
}
