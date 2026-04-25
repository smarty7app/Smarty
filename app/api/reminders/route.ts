import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    // 1. التحقق من الجلسة (المستخدم مسجل الدخول ولديه بريد)
    const session = await getServerSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول بحساب Google' },
        { status: 401 }
      );
    }

    // 2. قراءة البيانات والتحقق من الحقول المطلوبة
    const body = await request.json();
    const { title, description, reminderTime } = body;

    if (!title || !reminderTime) {
      return NextResponse.json(
        { error: 'العنوان ووقت التذكير مطلوبان' },
        { status: 400 }
      );
    }

    // 3. حفظ التذكير في قاعدة البيانات مع userId من الجلسة
    const client = await clientPromise;
    const db = client.db('smartyDB');

    const result = await db.collection('reminders').insertOne({
      userId: session.user.id,
      userEmail: session.user.email,
      title,
      description: description || '',
      reminderTime: new Date(reminderTime),
      status: 'pending',
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ التذكير' },
      { status: 500 }
    );
  }
}
