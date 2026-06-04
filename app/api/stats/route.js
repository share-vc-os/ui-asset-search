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

export async function GET() {
  await getClient();
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
}
