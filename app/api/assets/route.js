import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://shareOS:JVq0EKBopGmMfUx3@shareos.mongocluster.cosmos.azure.com/?tls=true&authMechanism=SCRAM-SHA-256&retrywrites=false&maxIdleTimeMS=120000&appName=mongosh+2.3.8";

let client;
let clientPromise;

function getClient() {
  if (!clientPromise) {
    client = new MongoClient(MONGO_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const assetType = searchParams.get('type');
  const instance = searchParams.get('instance');
  const limit = parseInt(searchParams.get('limit') || '200');

  await getClient();
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
}
