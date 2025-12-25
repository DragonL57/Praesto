import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/api/',
          '/admin/',
          '/chat/*/edit',
          '/*.json',
          '/private/',
          '/share/*/edit',
          '/app/',
          '/.next/',
          '/components/',
          '/hooks/',
          '/lib/',
          '/tests/',
          '/types/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'Anthropic-AI',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: 'https://www.unitaskai.com/sitemap.xml',
    host: 'https://www.unitaskai.com',
  };
}
