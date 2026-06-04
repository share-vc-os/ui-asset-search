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

export async function GET() {
  try {
    const client = await getClient();
    const db = client.db('shareos');
    const col = db.collection('ui_assets_index');

    const total = await col.countDocuments({});
    
    const byType = await col.aggregate([
      { $group: { _id: '$asset_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const byInstance = await col.aggregate([
      { $group: { _id: '$instance', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    return NextResponse.json({
      total,
      by_type: Object.fromEntries(byType.map(r => [r._id, r.count])),
      by_instance: Object.fromEntries(byInstance.map(r => [r._id, r.count]))
    }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
