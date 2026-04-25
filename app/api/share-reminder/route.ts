import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, text, reminderTime } = body;

    // إذا تم إرسال معرف تذكير موجود، نستخدم بياناته (خاصية إضافية)
    if (id) {
      try {
        const objectId = new ObjectId(id);
        const client = await clientPromise;
        const db = client.db('smartyDB');
        const existing = await db.collection('reminders').findOne({ _id: objectId });
        if (existing) {
          // نعيد استخدام نفس المعرف ونضمن وجود التذكير في shared_reminders
          await db.collection('shared_reminders').updateOne(
            { _id: objectId },
            {
              $setOnInsert: {
                text: existing.title,
                reminderTime: existing.reminderTime.toISOString(),
                createdAt: new Date(),
              }
            },
            { upsert: true }
          );
          return NextResponse.json({
            success: true,
            sharedId: objectId.toString(),
            reminder: {
              text: existing.title,
              reminderTime: existing.reminderTime.toISOString(),
            },
          });
        } else {
          return NextResponse.json({ error: 'التذكير غير موجود' }, { status: 404 });
        }
      } catch {
        return NextResponse.json({ error: 'معرف غير صالح' }, { status: 400 });
      }
    }

    // إنشاء تذكير مشترك جديد (الطريقة الأساسية)
    if (!text || !reminderTime) {
      return NextResponse.json(
        { error: 'يجب توفير النص ووقت التذكير' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('smartyDB');

    const newId = new ObjectId();
    const newReminder = {
      _id: newId,
      text,
      reminderTime,
      createdAt: new Date(),
    };

    await db.collection('shared_reminders').insertOne(newReminder);

    // إرجاع البيانات كاملة مع المعرف
    return NextResponse.json({
      success: true,
      sharedId: newId.toString(),
      reminder: {
        text,
        reminderTime,
      },
    });
  } catch (error) {
    console.error('Error sharing reminder:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ التذكير المشترك' },
      { status: 500 }
    );
  }
}
