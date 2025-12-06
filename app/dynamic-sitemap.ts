import type { MetadataRoute } from 'next';
import fs from 'node:fs';
import path from 'node:path';

/**
 * This function dynamically generates a sitemap by scanning the app directory structure
 * It can be used as an alternative to the static sitemap.ts when your site has
 * many dynamically generated routes that should be included in the sitemap.
 */
export default function dynamicSitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.unitaskai.com';
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Start with core static routes
    const sitemap: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/chat`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        // Add other critical routes here
    ];

    // Helper function to scan directory and find page.tsx files
    const scanDirectory = (dirPath: string, baseAppPath: string) => {
        try {
            const files = fs.readdirSync(dirPath);

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Skip certain directories that shouldn't be in the sitemap
                    if (['api', 'components', 'lib', 'hooks', 'types'].some(d => file === d)) {
                        continue;
                    }

                    // Skip directories that start with underscore or parenthesis (Next.js conventions)
                    if (file.startsWith('_') || file.startsWith('(')) {
                        continue;
                    }

                    scanDirectory(filePath, baseAppPath);
                } else if (file === 'page.tsx' || file === 'page.jsx') {
                    // Found a page file, calculate the route
                    const relativePath = dirPath.replace(baseAppPath, '');
                    const routePath = relativePath.split(path.sep).filter(Boolean).join('/');

                    // Skip routes with dynamic parameters ([id], etc) since we can't know the values
                    if (routePath.includes('[') || routePath.includes('(')) {
                        continue;
                    }

                    // Add to sitemap with appropriate priority
                    const fullUrl = `${baseUrl}/${routePath}`;
                    const isFrequentlyUpdated = ['', 'chat', 'docs'].some(r => routePath === r);

                    sitemap.push({
                        url: fullUrl,
                        lastModified: currentDate,
                        changeFrequency: isFrequentlyUpdated ? 'daily' : 'weekly',
                        priority: routePath === '' ? 1 : 0.7,
                    });
                }
            }
        } catch (error) {
            console.error('Error scanning directory for sitemap:', error);
        }
    };

    // Get the app directory path
    const appDirectory = path.join(process.cwd(), 'app');

    // Scan the app directory
    scanDirectory(appDirectory, appDirectory);

    return sitemap;
}
