import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let client = null;
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
  }
  return client.db('shareos');
}

/**
 * AI Chat endpoint - interprets natural language queries and returns
 * structured filter commands + relevant results.
 * 
 * Uses pattern matching + MongoDB aggregation to understand intent.
 */
export async function POST(request) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('ui_assets_index');
    const msg = message.toLowerCase().trim();

    // Parse intent
    const intent = parseIntent(msg);
    
    // Build MongoDB filter from intent
    const filter = buildFilter(intent);
    
    // Execute query
    const [assets, total] = await Promise.all([
      col.find(filter).sort({ last_seen: -1 }).limit(intent.limit || 20).toArray(),
      col.countDocuments(filter),
    ]);

    const cleaned = assets.map(a => { const { _id, ...rest } = a; return rest; });

    // Generate response
    const response = generateResponse(intent, total, cleaned);

    return NextResponse.json({
      response: response.text,
      filters: response.filters,
      results: cleaned,
      total,
      suggestions: response.suggestions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseIntent(msg) {
  const intent = { type: null, instance: null, query: null, limit: 20 };

  // Type detection
  const typeMap = {
    'vercel': ['vercel', 'deployed', 'deployment', 'deployments', 'live site', 'live sites', 'website', 'web app', 'web apps'],
    'image': ['image', 'images', 'photo', 'photos', 'screenshot', 'screenshots', 'png', 'jpg', 'picture', 'pictures', 'icon', 'icons', 'logo', 'logos', 'avatar'],
    'dashboard': ['dashboard', 'dashboards', 'pm2', 'running service', 'services', 'app running', 'server'],
    'project': ['project', 'projects', 'repo', 'repos', 'repository', 'folder', 'codebase'],
    'design': ['design', 'designs', 'superdesign', 'ui design', 'mockup', 'wireframe', 'prototype'],
  };

  for (const [type, keywords] of Object.entries(typeMap)) {
    if (keywords.some(k => msg.includes(k))) {
      intent.type = type;
      break;
    }
  }

  // Instance detection
  const instanceMap = {
    'sharehealth': ['sharehealth', 'share health'],
    'feno': ['feno', 'dental', 'dentist'],
    'shareland': ['shareland', 'share land', 'tycoon'],
    'instill': ['instill', 'nike', 'culture'],
    'shareos': ['shareos', 'share os'],
    'shareos_meetings': ['meeting', 'meetings'],
    'hamet_clawos': ['hamet'],
    'trevor_clawos': ['trevor'],
    'dexter_clawos': ['dexter'],
    '1440': ['1440', 'coaching'],
    'celli': ['celli'],
  };

  for (const [instance, keywords] of Object.entries(instanceMap)) {
    if (keywords.some(k => msg.includes(k))) {
      intent.instance = instance;
      break;
    }
  }

  // Custom domain detection
  if (msg.includes('custom domain') || msg.includes('custom domains') || msg.includes('sharelabs') || msg.includes('.ai domain') || msg.includes('live url') || msg.includes('live urls')) {
    intent.hasCustomDomain = true;
    // Don't also search for "custom domains" as a text query
  }

  // Framework detection — if framework is mentioned, default to vercel type
  const frameworks = ['nextjs', 'next.js', 'react', 'vue', 'svelte', 'nuxt', 'astro', 'remix'];
  for (const fw of frameworks) {
    if (msg.includes(fw)) {
      intent.framework = fw.replace('.', '');
      if (!intent.type) intent.type = 'vercel'; // frameworks are stored on vercel assets
      break;
    }
  }

  // Count requests
  if (msg.includes('how many') || msg.includes('count') || msg.includes('total')) {
    intent.countOnly = true;
  }

  // All results
  if (msg.includes('all ') || msg.includes('every ') || msg.includes('list all')) {
    intent.limit = 60;
  }

  // Extract remaining search query - only if there's specific text to search for
  // Remove known command words and filter terms
  const removeWords = /\b(show|me|find|search|list|get|what|are|where|is|look|for|give|need|can|you|all|the|from|on|in|with|that|have|has|do|we|any|our|a|an|vercel|image|images|dashboard|dashboards|project|projects|design|designs|deployed|deployments|custom|domain|domains|running|live|feno|instill|shareland|sharehealth|shareos|hamet|trevor|dexter|meetings|1440|celli|how|many|count|total|sites|apps|services)\b/gi;
  let query = msg.replace(removeWords, '').replace(/\s+/g, ' ').trim();
  
  if (query.length > 2 && !intent.hasCustomDomain) {
    intent.query = query;
  }

  return intent;
}

function buildFilter(intent) {
  const filter = {};
  
  if (intent.type) filter.asset_type = intent.type;
  if (intent.instance) filter.instance = { $regex: intent.instance, $options: 'i' };
  if (intent.hasCustomDomain) filter['metadata.custom_domain'] = { $exists: true, $ne: null };
  if (intent.framework) filter['metadata.framework'] = { $regex: intent.framework, $options: 'i' };
  
  if (intent.query) {
    filter.$or = [
      { name: { $regex: intent.query, $options: 'i' } },
      { path: { $regex: intent.query, $options: 'i' } },
      { url: { $regex: intent.query, $options: 'i' } },
      { project_name: { $regex: intent.query, $options: 'i' } },
      { 'metadata.custom_domain': { $regex: intent.query, $options: 'i' } },
      { tags: { $regex: intent.query, $options: 'i' } },
      { description: { $regex: intent.query, $options: 'i' } },
    ];
  }

  return filter;
}

function generateResponse(intent, total, results) {
  const filters = {};
  if (intent.type) filters.type = intent.type;
  if (intent.instance) filters.instance = intent.instance;
  if (intent.query) filters.query = intent.query;

  let text = '';
  
  if (total === 0) {
    text = `No results found. Try a different search term or broaden your filters.`;
  } else if (intent.countOnly) {
    text = `Found **${total.toLocaleString()}** ${intent.type || 'assets'}${intent.instance ? ` on ${intent.instance}` : ''}.`;
  } else {
    const typeLabel = intent.type || 'assets';
    const instanceLabel = intent.instance ? ` from ${intent.instance}` : '';
    text = `Found **${total.toLocaleString()}** ${typeLabel}${instanceLabel}. Showing top ${Math.min(total, results.length)} results.`;
    
    // Add highlights for notable items
    const withDomains = results.filter(r => r.metadata?.custom_domain);
    if (withDomains.length > 0) {
      text += `\n\n**Live sites:**\n` + withDomains.slice(0, 5).map(r => `• [${r.name}](https://${r.metadata.custom_domain})`).join('\n');
    }
  }

  const suggestions = [];
  if (!intent.type) suggestions.push('Show me all Vercel deployments', 'Find images from Feno', 'List dashboards');
  if (!intent.instance) suggestions.push('Filter by ShareOS', 'Show Instill assets');
  if (intent.type === 'vercel') suggestions.push('Which have custom domains?', 'Show Next.js projects');
  
  return { text, filters, suggestions };
}
