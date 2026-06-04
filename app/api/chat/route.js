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
 * Agentic AI Chat — uses GPT-4o with tool calls to search the database.
 * The agent can run multiple queries, refine searches, and provide intelligent answers.
 */
export async function POST(request) {
  try {
    const { message, history = [] } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const db = await getDb();
    const col = db.collection('ui_assets_index');

    // Get quick stats for context
    const total = await col.countDocuments({});
    const typeStats = await col.aggregate([{ $group: { _id: '$asset_type', count: { $sum: 1 } } }]).toArray();
    const instanceStats = await col.aggregate([{ $group: { _id: '$instance', count: { $sum: 1 } } }]).toArray();

    const systemPrompt = `You are an AI agent for the Share Ventures Asset Explorer. You have access to a MongoDB collection with ${total} UI assets (Vercel deployments, images, dashboards, projects, designs) across ${instanceStats.length} instances.

DATABASE STATS:
Types: ${typeStats.map(t => `${t._id}(${t.count})`).join(', ')}
Instances: ${instanceStats.map(i => `${i._id}(${i.count})`).join(', ')}

SCHEMA: { name, path, url, instance, asset_type, tags[], metadata: {custom_domain, framework, all_aliases[], projectId}, project_name, description, last_seen }

You have a tool called "search_assets" to query the database. Use it to find what the user is looking for.

GUIDELINES:
- Search broadly first, then narrow down
- Use regex patterns to find partial matches
- If one search returns 0 results, try alternative terms
- For "deals" → search for "deal", for "dashboard" → also check "crm", "portal"
- Vercel projects are web apps/sites — if user asks "do we have X", check vercel deployments
- Always provide the URL/custom_domain if available
- Be specific and helpful — show the user exactly what they need
- If you can't find something, say so clearly and suggest alternatives`;

    const tools = [{
      type: 'function',
      function: {
        name: 'search_assets',
        description: 'Search the UI assets database with a MongoDB filter. Returns matching assets with name, type, instance, url, and custom domain.',
        parameters: {
          type: 'object',
          properties: {
            filter: {
              type: 'object',
              description: 'MongoDB filter object. Use $regex with $options:"i" for text search, $or for multi-field search. Example: {"$or":[{"name":{"$regex":"deal","$options":"i"}},{"tags":{"$regex":"deal","$options":"i"}}]}'
            },
            limit: { type: 'number', description: 'Max results to return (default 15)' },
            sort: { type: 'object', description: 'Sort order, e.g. {"last_seen":-1}' }
          },
          required: ['filter']
        }
      }
    }];

    // Build conversation messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.text })),
      { role: 'user', content: message }
    ];

    // Agent loop — allow up to 3 tool calls
    let finalResponse = '';
    let allResults = [];
    let dashboardFilters = {};

    for (let i = 0; i < 3; i++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          temperature: 0,
          tools,
          messages,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('OpenAI error:', errText);
        return fallbackSearch(col, message);
      }

      const data = await res.json();
      const choice = data.choices[0];

      if (choice.finish_reason === 'tool_calls') {
        const toolCalls = choice.message.tool_calls;
        messages.push(choice.message);

        for (const tc of toolCalls) {
          if (tc.function.name === 'search_assets') {
            let args;
            try {
              args = JSON.parse(tc.function.arguments);
            } catch (e) {
              messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify({ error: 'Invalid JSON arguments' }) });
              continue;
            }

            const filter = args.filter || {};
            const limit = Math.min(args.limit || 15, 30);
            const sort = args.sort || { last_seen: -1 };

            try {
              const [results, count] = await Promise.all([
                col.find(filter).sort(sort).limit(limit).toArray(),
                col.countDocuments(filter),
              ]);

              const cleaned = results.map(a => ({
                name: a.name,
                asset_type: a.asset_type,
                instance: a.instance,
                url: a.url,
                custom_domain: a.metadata?.custom_domain || null,
                framework: a.metadata?.framework || null,
                path: a.path ? a.path.replace(/^\/home\/[^/]+\//, '~/') : null,
                tags: a.tags?.slice(0, 5),
              }));

              allResults = [...allResults, ...cleaned];
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ total: count, results: cleaned, showing: cleaned.length })
              });
            } catch (dbErr) {
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: JSON.stringify({ error: dbErr.message, hint: 'Check filter syntax' })
              });
            }
          }
        }
      } else {
        // Final response
        finalResponse = choice.message.content || '';
        break;
      }
    }

    // If no final response after loops
    if (!finalResponse && allResults.length > 0) {
      finalResponse = `Found ${allResults.length} relevant assets.`;
    } else if (!finalResponse) {
      finalResponse = 'Could not find what you\'re looking for. Try being more specific.';
    }

    // Parse dashboard filters from the response if possible
    if (allResults.length > 0) {
      const types = [...new Set(allResults.map(r => r.asset_type))];
      if (types.length === 1) dashboardFilters.type = types[0];
    }

    // Deduplicate results
    const seen = new Set();
    const uniqueResults = allResults.filter(r => {
      const key = `${r.name}-${r.instance}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      response: finalResponse,
      filters: dashboardFilters,
      results: uniqueResults.slice(0, 10),
      total: uniqueResults.length,
      suggestions: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    try {
      const db = await getDb();
      const col = db.collection('ui_assets_index');
      return fallbackSearch(col, message || '');
    } catch (e) {
      return NextResponse.json({ error: error.message, response: 'Something went wrong.', results: [], total: 0 }, { status: 500 });
    }
  }
}

async function fallbackSearch(col, message) {
  const terms = message.replace(/[^\w\s-]/g, '').trim().split(/\s+/).filter(w => w.length > 2);
  if (!terms.length) {
    return NextResponse.json({ response: 'Please provide a search query.', results: [], total: 0, filters: {} });
  }

  // Search each word with OR across fields
  const orConditions = terms.flatMap(term => [
    { name: { $regex: term, $options: 'i' } },
    { project_name: { $regex: term, $options: 'i' } },
    { 'metadata.custom_domain': { $regex: term, $options: 'i' } },
    { tags: { $regex: term, $options: 'i' } },
  ]);

  const filter = { $or: orConditions };
  const [assets, total] = await Promise.all([
    col.find(filter).sort({ last_seen: -1 }).limit(15).toArray(),
    col.countDocuments(filter),
  ]);

  const cleaned = assets.map(a => ({
    name: a.name, asset_type: a.asset_type, instance: a.instance,
    url: a.url, custom_domain: a.metadata?.custom_domain || null,
    framework: a.metadata?.framework || null, tags: a.tags?.slice(0, 5),
  }));

  return NextResponse.json({
    response: total > 0 ? `Found **${total}** assets matching your query.` : `No results found. Try different keywords.`,
    filters: {},
    results: cleaned,
    total,
    suggestions: ['Show all Vercel projects', 'Find images', 'List custom domains'],
  });
}
