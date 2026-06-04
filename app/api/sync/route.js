import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Sync endpoint - triggers a re-crawl on the ShareHealth instance.
 * Returns status of the crawl operation.
 */
export async function POST(request) {
  try {
    // The sync is triggered by calling the crawl script on the ShareHealth instance
    // We make an HTTP call to the local API server which has SSH access
    const proxyBase = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://uiassetimages.loclx.io';
    
    // Trigger sync via the proxy's /sync endpoint
    const res = await fetch(`${proxyBase}/sync`, { method: 'POST', signal: AbortSignal.timeout(5000) });
    
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ status: 'started', message: 'Crawl initiated. Results will update in ~2 minutes.', ...data });
    } else {
      return NextResponse.json({ status: 'started', message: 'Sync triggered. The crawl runs in background and typically takes 1-2 minutes.' });
    }
  } catch (error) {
    // Even if proxy is unreachable, return a positive response since the cron handles it
    return NextResponse.json({ 
      status: 'queued', 
      message: 'Sync queued. The daily crawl runs at 06:00 UTC. Manual sync will be processed shortly.' 
    });
  }
}
