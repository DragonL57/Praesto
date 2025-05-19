# SEO Optimization Guide for UniTaskAI

This document provides information on how SEO is implemented in the UniTaskAI project and how to maintain and improve it.

## Key SEO Files

- `/app/sitemap.ts` - Static sitemap generation
- `/app/dynamic-sitemap.ts` - Dynamic sitemap generation based on file structure
- `/app/robots.ts` - Controls crawler behavior
- `/app/layout.tsx` - Contains metadata including Open Graph and Twitter card configurations
- `/components/json-ld.tsx` - Component for adding structured data
- `/components/seo/` directory - Contains reusable SEO components

## Structured Data (JSON-LD)

The application uses JSON-LD structured data to improve search engine understanding of content:

1. **WebApplication schema** - Applied site-wide in layout.tsx
2. **Organization schema** - Available as a component in `/components/seo/organization-schema.tsx`
3. **Breadcrumb schema** - Available as a component in `/components/seo/breadcrumb-schema.tsx`

## Adding New Routes to the Sitemap

The sitemap is automatically generated based on file structure using the dynamic-sitemap.ts file. However, for important static routes, consider adding them manually to the `/app/sitemap.ts` file.

## Robots.txt Configuration

The robots.txt configuration (robots.ts) disallows crawling of:
- API routes
- Admin routes
- Private routes
- Source code directories
- AI crawlers like GPTBot, ChatGPT-User, Anthropic-AI, and CCBot

## Meta Tags

The app uses Next.js metadata API to define:
- Page titles
- Descriptions
- Open Graph images
- Twitter card data
- Canonical URLs
- Language alternates
- Keywords

## Best Practices for SEO

1. **Titles and Descriptions**
   - Keep titles under 60 characters
   - Keep descriptions between 120-160 characters
   - Include relevant keywords naturally

2. **URLs**
   - Use kebab-case for URLs
   - Keep URLs short and descriptive
   - Avoid special characters

3. **Images**
   - Always include alt text
   - Use descriptive filenames
   - Compress images appropriately

4. **Performance**
   - Monitor Core Web Vitals
   - Optimize for mobile
   - Minimize JavaScript that blocks rendering

5. **Content**
   - Create unique, valuable content
   - Use appropriate heading structure (H1, H2, H3)
   - Include internal links where appropriate

## Testing Tools

- [Google Search Console](https://search.google.com/search-console/about)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema Validator](https://validator.schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)
