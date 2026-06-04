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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const instance = searchParams.get('instance');
    const query = searchParams.get('query');
    const limit = Math.min(parseInt(searchParams.get('limit') || '60'), 200);
    const skip = parseInt(searchParams.get('skip') || '0');

    const db = await getDb();
    const col = db.collection('ui_assets_index');

    const filter = {};
    if (type && type !== 'all') filter.asset_type = type;
    if (instance && instance !== 'all') filter.instance = { $regex: instance, $options: 'i' };
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { path: { $regex: query, $options: 'i' } },
        { url: { $regex: query, $options: 'i' } },
        { project_name: { $regex: query, $options: 'i' } },
        { 'metadata.custom_domain': { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ];
    }

    const [assets, total] = await Promise.all([
      col.find(filter).sort({ last_seen: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);

    // Clean _id for JSON serialization
    const cleaned = assets.map(a => {
      const { _id, ...rest } = a;
      return rest;
    });

    return NextResponse.json({ assets: cleaned, total, page: Math.floor(skip / limit) + 1, pages: Math.ceil(total / limit) });
  } catch (error) {
    return NextResponse.json({ error: error.message, assets: [], total: 0 }, { status: 500 });
  }
}
