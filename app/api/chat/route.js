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
 * AI Chat endpoint — uses OpenAI to understand natural language,
 * generates MongoDB queries, and returns intelligent results.
 */
export async function POST(request) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('ui_assets_index');

    // Get collection stats for context
    const stats = await col.aggregate([
      { $group: { _id: '$asset_type', count: { $sum: 1 } } }
    ]).toArray();
    const instanceStats = await col.aggregate([
      { $group: { _id: '$instance', count: { $sum: 1 } } }
    ]).toArray();

    const statsContext = stats.map(s => `${s._id}: ${s.count}`).join(', ');
    const instanceContext = instanceStats.map(s => `${s._id}: ${s.count}`).join(', ');

    // Call OpenAI to understand the intent and generate a MongoDB filter
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant for the Share Ventures Asset Explorer. You help users find UI assets (images, Vercel deployments, dashboards, projects, designs) across multiple OpenClaw instances.

DATABASE CONTEXT:
- Collection: ui_assets_index
- Asset types: ${statsContext}
- Instances: ${instanceContext}
- Fields: name, path, url, instance, asset_type, tags[], metadata.custom_domain, metadata.framework, metadata.all_aliases[], project_name, description

IMPORTANT RULES:
1. Generate a MongoDB filter object that will ACTUALLY FIND results
2. Use $regex with $options:"i" for fuzzy text matching
3. PREFER searching by name/url/tags over filtering by instance — most Vercel projects are under "shareos" instance regardless of which venture they belong to
4. For "meetings related" or "feno related" queries — search the NAME field with $regex, don't just filter by instance
5. Use $or to search across multiple fields: name, url, project_name, metadata.custom_domain, tags
6. "custom domain" means metadata.custom_domain: {$exists: true, $ne: null}
7. Only filter by instance when user explicitly says "from sharehealth instance" or "on the feno server"
8. Common frameworks stored: nextjs, vite, flask
9. For broad queries, prefer simple $or regex searches that will return results
10. NEVER generate filters that would return 0 results when a simpler regex would work

EXAMPLES:
- "meetings related vercel project" → {asset_type:"vercel", $or:[{name:{$regex:"meeting",$options:"i"}},{project_name:{$regex:"meeting",$options:"i"}}]}
- "feno landing pages" → {$or:[{name:{$regex:"feno.*land",$options:"i"}},{name:{$regex:"land.*feno",$options:"i"}},{project_name:{$regex:"feno",$options:"i"}}]}  
- "all projects with custom domains" → {asset_type:"vercel","metadata.custom_domain":{$exists:true,$ne:null}}
- "brand images" → {asset_type:"image",name:{$regex:"brand",$options:"i"}}

RESPOND WITH JSON:
{
  "filter": { MongoDB filter object },
  "response": "Natural language response explaining results",
  "dashboardFilters": { "type": "vercel"|"image"|"dashboard"|"project"|"design" or null, "instance": null, "query": "the key search term" or null },
  "limit": number (default 20, max 60)
}`
          },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!openaiRes.ok) {
      // Fallback to basic search if OpenAI fails
      return fallbackSearch(col, message);
    }

    const aiData = await openaiRes.json();
    const aiResponse = JSON.parse(aiData.choices[0].message.content);

    // Execute the AI-generated filter
    const filter = aiResponse.filter || {};
    const limit = aiResponse.limit || 20;

    const [assets, total] = await Promise.all([
      col.find(filter).sort({ last_seen: -1 }).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    const cleaned = assets.map(a => { const { _id, ...rest } = a; return rest; });

    return NextResponse.json({
      response: aiResponse.response || `Found ${total} results.`,
      filters: aiResponse.dashboardFilters || {},
      results: cleaned,
      total,
      suggestions: generateSuggestions(message, total),
    });
  } catch (error) {
    // Fallback to basic search
    try {
      const db = await getDb();
      const col = db.collection('ui_assets_index');
      return fallbackSearch(col, (await request.clone().json()).message || '');
    } catch (e) {
      return NextResponse.json({ error: error.message, response: 'Something went wrong.', results: [], total: 0 }, { status: 500 });
    }
  }
}

async function fallbackSearch(col, message) {
  // Simple regex search across all text fields
  const searchTerms = message.replace(/[^\w\s-]/g, '').trim();
  if (!searchTerms) {
    return NextResponse.json({ response: 'Please provide a search query.', results: [], total: 0, filters: {} });
  }

  const filter = {
    $or: [
      { name: { $regex: searchTerms, $options: 'i' } },
      { path: { $regex: searchTerms, $options: 'i' } },
      { url: { $regex: searchTerms, $options: 'i' } },
      { project_name: { $regex: searchTerms, $options: 'i' } },
      { 'metadata.custom_domain': { $regex: searchTerms, $options: 'i' } },
      { tags: { $regex: searchTerms, $options: 'i' } },
      { instance: { $regex: searchTerms, $options: 'i' } },
    ],
  };

  const [assets, total] = await Promise.all([
    col.find(filter).sort({ last_seen: -1 }).limit(20).toArray(),
    col.countDocuments(filter),
  ]);

  const cleaned = assets.map(a => { const { _id, ...rest } = a; return rest; });

  return NextResponse.json({
    response: total > 0 ? `Found **${total}** results matching "${searchTerms}".` : `No results found for "${searchTerms}". Try different keywords.`,
    filters: {},
    results: cleaned,
    total,
    suggestions: ['Show all Vercel projects', 'Find images', 'List dashboards'],
  });
}

function generateSuggestions(message, total) {
  const suggestions = [];
  if (total === 0) {
    suggestions.push('Show all Vercel deployments', 'Find images from Feno', 'List all custom domains');
  } else {
    suggestions.push('Which have custom domains?', 'Show more from this instance', 'Find related designs');
  }
  return suggestions;
}
