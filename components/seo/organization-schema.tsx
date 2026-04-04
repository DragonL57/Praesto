'use client';

import { JsonLd } from '@/components/json-ld';
import { baseUrl } from '@/lib/constants';

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'UniTaskAI',
        url: baseUrl,
        logo: `${baseUrl}/UniTaskAI_logo.png`,
        sameAs: [
          'https://twitter.com/unitaskai',
          'https://github.com/unitaskai',
          'https://www.linkedin.com/company/unitaskai',
        ],
        description:
          'UniTaskAI provides AI-powered productivity tools for content creation, code generation, data analysis, and task automation.',
        foundingDate: '2023',
        email: 'contact@unitaskai.thelong.online',
        knowsAbout: [
          'Artificial Intelligence',
          'Natural Language Processing',
          'Machine Learning',
          'Code Generation',
          'Content Creation',
          'Data Analysis',
        ],
      }}
    />
  );
}
