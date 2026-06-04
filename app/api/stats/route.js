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

export async function GET() {
  try {
    const db = await getDb();
    const col = db.collection('ui_assets_index');

    const [total, typePipeline, instancePipeline] = await Promise.all([
      col.countDocuments({}),
      col.aggregate([{ $group: { _id: '$asset_type', count: { $sum: 1 } } }]).toArray(),
      col.aggregate([{ $group: { _id: '$instance', count: { $sum: 1 } } }]).toArray(),
    ]);

    const by_type = {};
    typePipeline.forEach(t => { by_type[t._id] = t.count; });
    const by_instance = {};
    instancePipeline.forEach(i => { by_instance[i._id] = i.count; });

    return NextResponse.json({ total, by_type, by_instance });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
