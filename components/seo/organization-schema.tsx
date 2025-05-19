'use client';

import { JsonLd } from '@/components/json-ld';

export function OrganizationSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'UniTaskAI',
        'url': 'https://www.unitaskai.com',
        'logo': 'https://www.unitaskai.com/UniTaskAI_logo.png',
        'sameAs': [
          'https://twitter.com/unitaskai',
          'https://github.com/unitaskai',
          'https://www.linkedin.com/company/unitaskai'
        ],
        'description': 'UniTaskAI provides AI-powered productivity tools for content creation, code generation, data analysis, and task automation.',
        'foundingDate': '2023',
        'email': 'contact@unitaskai.com',
        'knowsAbout': [
          'Artificial Intelligence',
          'Natural Language Processing',
          'Machine Learning',
          'Code Generation',
          'Content Creation',
          'Data Analysis'
        ]
      }}
    />
  );
}
