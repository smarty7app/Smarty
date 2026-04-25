import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. التحقق من صحة المعرف وتحويله إلى ObjectId
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'معرف غير صالح' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('smartyDB');

    // 2. البحث في مجموعة التذكيرات العادية أولاً
    let reminder = await db.collection('reminders').findOne({ _id: objectId });

    // 3. إذا لم يوجد، نبحث في مجموعة التذكيرات المشتركة
    if (!reminder) {
      const shared = await db.collection('shared_reminders').findOne({ _id: objectId });
      if (shared) {
        // تنسيق موحد: نعيد الحقول التي تتوقعها صفحة المشاركة
        reminder = {
          id: shared._id.toString(),
          text: shared.text,
          reminderTime: shared.reminderTime,
        };
      }
    } else {
      // تنسيق التذكير العادي
      reminder = {
        id: reminder._id.toString(),
        text: reminder.title,           // في reminders الحقل اسمه title
        reminderTime: reminder.reminderTime,
      };
    }

    if (!reminder) {
      return NextResponse.json({ error: 'التذكير غير موجود' }, { status: 404 });
    }

    // 4. إرجاع البيانات كاملة
    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
}
