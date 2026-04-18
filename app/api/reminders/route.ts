import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
// تأكد من أن مسار authOptions صحيح (قد يختلف حسب هيكل مشروعك)
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }
    // استخدم userId من الجلسة
    const userId = session.user.id;
    const { text, reminderTime } = await request.json();
    if (!text || !reminderTime) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }
    const client = await clientPromise;
    const db = client.db('smartyDB');
    const newReminder = {
      userId,
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