import { NextResponse } from 'next/server';

export async function GET() {
  // التحقق من وجود المتغير فقط عند تشغيل الدالة (وليس أثناء البناء)
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({ error: 'MONGODB_URI not configured' }, { status: 500 });
  }

  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('smartyDB');
    const result = await db.command({ ping: 1 });
    await client.close();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
