import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. التحقق من صحة المعرف
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json({ error: 'معرف غير صالح' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('smartyDB');

    // 2. البحث في مجموعة التذكيرات العادية
    const dbReminder = await db.collection('reminders').findOne({ _id: objectId });

    if (dbReminder) {
      return NextResponse.json({
        id: dbReminder._id.toString(),
        text: dbReminder.title || dbReminder.text,
        reminderTime: dbReminder.reminderTime,
      });
    }

    // 3. إذا لم يوجد، نبحث في مجموعة التذكيرات المشتركة
    const sharedReminder = await db.collection('shared_reminders').findOne({ _id: objectId });

    if (sharedReminder) {
      return NextResponse.json({
        id: sharedReminder._id.toString(),
        text: sharedReminder.text,
        reminderTime: sharedReminder.reminderTime,
      });
    }

    // 4. غير موجود في أي منهما
    return NextResponse.json({ error: 'التذكير غير موجود' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching reminder:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
}
