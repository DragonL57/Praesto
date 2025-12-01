import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  // Load the logo and font from the public directory
  const logo = await readFile(
    path.join(process.cwd(), 'public', 'UniTaskAI_logo.png'),
  );
  const font = await readFile(
    path.join(
      process.cwd(),
      'public',
      'fonts',
      'Baloo_2',
      'static',
      'Baloo2-Bold.ttf',
    ),
  );

  return new ImageResponse(
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Abstract, interconnected background */}
      <svg
        width="1200"
        height="630"
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
      >
        <defs>
          <radialGradient id="bg1" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.0" />
          </radialGradient>
          <radialGradient id="bg2" cx="70%" cy="70%" r="80%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id="line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.10" />
          </linearGradient>
        </defs>
        {/* Overlapping knowledge circles */}
        <circle cx="350" cy="200" r="180" fill="url(#bg1)" />
        <circle cx="900" cy="400" r="160" fill="url(#bg2)" />
        <circle cx="700" cy="180" r="110" fill="#3b82f6" fillOpacity="0.07" />
        <circle cx="500" cy="500" r="90" fill="#6366f1" fillOpacity="0.09" />
        {/* Interconnecting lines */}
        <line
          x1="350"
          y1="200"
          x2="700"
          y2="180"
          stroke="url(#line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="700"
          y1="180"
          x2="900"
          y2="400"
          stroke="url(#line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="350"
          y1="200"
          x2="500"
          y2="500"
          stroke="url(#line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="500"
          y1="500"
          x2="900"
          y2="400"
          stroke="url(#line)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      {/* Using img in OG image generation as Image component requires React context */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${logo.toString('base64')}`}
        alt="UniTaskAI Logo"
        width={120}
        height={120}
        style={{
          marginBottom: 40,
          borderRadius: '28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          zIndex: 1,
        }}
      />
      <h1
        style={{
          fontFamily: 'Baloo 2',
          fontWeight: 700,
          fontSize: 72,
          color: '#1e293b',
          margin: 0,
          textAlign: 'center',
          letterSpacing: '-2px',
          zIndex: 1,
        }}
      >
        UniTaskAI
      </h1>
      <div
        style={{
          fontFamily: 'Baloo 2',
          fontWeight: 500,
          fontSize: 36,
          color: '#334155',
          margin: '32px 0 0 0',
          textAlign: 'center',
          zIndex: 1,
        }}
      >
        AI workspace for content, code, and data
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Baloo 2',
          data: font,
          style: 'normal',
          weight: 700,
        },
      ],
    },
  );
}
