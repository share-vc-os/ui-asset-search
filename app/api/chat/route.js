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

RULES:
1. Generate a MongoDB filter object that matches the user's intent
2. Use $regex with $options:"i" for fuzzy text matching
3. For searching across multiple fields, use $or
4. The user might ask about specific ventures/companies — match by instance or name
5. "meetings" relates to instance "shareos_meetings"
6. "custom domain" means metadata.custom_domain exists and is not null
7. Common frameworks: nextjs, vite, flask
8. Return a natural language response explaining what you found

RESPOND WITH JSON:
{
  "filter": { MongoDB filter object },
  "response": "Natural language response",
  "dashboardFilters": { "type": "vercel"|"image"|etc or null, "instance": "instance_name" or null, "query": "search text" or null },
  "limit": number (default 20)
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
