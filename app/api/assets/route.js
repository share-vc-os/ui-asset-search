import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MONGO_URI = process.env.MONGODB_URI;

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(MONGO_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  await client.connect();
  cachedClient = client;
  return client;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const assetType = searchParams.get('type');
    const instance = searchParams.get('instance');
    const limit = parseInt(searchParams.get('limit') || '200');

    const client = await getClient();
    const db = client.db('shareos');
    const col = db.collection('ui_assets_index');

    const filter = {};

    if (query) {
      filter['$or'] = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { project_name: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
        { url: { $regex: query, $options: 'i' } },
        { path: { $regex: query, $options: 'i' } },
      ];
    }

    if (assetType) {
      filter.asset_type = assetType;
    }

    if (instance) {
      filter.instance = instance;
    }

    const results = await col.find(filter, { projection: { _id: 0 } })
      .sort({ last_seen: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
