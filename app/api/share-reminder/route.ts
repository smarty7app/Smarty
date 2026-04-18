import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { id, text, reminderTime } = await request.json();
    const client = await clientPromise;
    const db = client.db('smartyDB');
    
    // حفظ التذكير في مجموعة منفصلة للمشاركات المؤقتة
    await db.collection('shared_reminders').insertOne({
      _id: id,
      text,
      reminderTime,
      createdAt: new Date(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving shared reminder:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}