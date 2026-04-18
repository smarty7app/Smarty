import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { text, reminderTime } = await request.json();
    if (!text || !reminderTime) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('smartyDB');
    const newReminder = {
      userId: 'shared', // معرف مؤقت
      text,
      reminderTime: new Date(reminderTime),
      isCompleted: false,
      createdAt: new Date(),
    };
    const result = await db.collection('reminders').insertOne(newReminder);
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}