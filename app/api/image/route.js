import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Image proxy - serves images from remote instances via a pre-built thumbnail service
// Since we can't SSH from Vercel, we need a different approach:
// Option 1: Pre-generate thumbnails during crawl and upload to S3
// Option 2: Serve via the local server (port 9200) which HAS SSH access
// We'll redirect to the local server proxy for now

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const instance = searchParams.get('instance');
  const path = searchParams.get('path');
  
  if (!instance || !path) {
    return NextResponse.json({ error: 'Missing instance or path' }, { status: 400 });
  }

  // The actual image serving needs to happen from a server with SSH access
  // For Vercel deployment, we'll use placeholder SVGs with the filename
  const filename = path.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  
  // Generate a nice placeholder SVG
  const colors = {
    png: '#A78BFA', jpg: '#F59E0B', jpeg: '#F59E0B', 
    gif: '#EC4899', svg: '#22C55E', webp: '#06B6D4'
  };
  const color = colors[ext] || '#71717A';
  const shortName = filename.length > 20 ? filename.slice(0, 17) + '...' : filename;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
    <rect width="300" height="200" fill="#27272A"/>
    <rect x="110" y="50" width="80" height="60" rx="8" fill="none" stroke="${color}" stroke-width="2"/>
    <circle cx="130" cy="72" r="6" fill="${color}" opacity="0.6"/>
    <path d="M115 100 L140 80 L160 95 L185 70 L185 100 Z" fill="${color}" opacity="0.4"/>
    <text x="150" y="140" text-anchor="middle" fill="#A1A1AA" font-family="monospace" font-size="11">${shortName}</text>
    <text x="150" y="160" text-anchor="middle" fill="#71717A" font-family="monospace" font-size="9">${ext.toUpperCase()} • ${instance}</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' }
  });
}
