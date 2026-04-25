import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, reminderTime } = body;

    if (!text || !reminderTime) {
      return NextResponse.json(
        { error: 'يجب توفير النص ووقت التذكير' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('smartyDB');

    const newId = new ObjectId();
    await db.collection('shared_reminders').insertOne({
      _id: newId,
      text,
      reminderTime,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      sharedId: newId.toString(),
    });
  } catch (error) {
    console.error('Error saving shared reminder:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ التذكير المشترك' },
      { status: 500 }
    );
  }
}
