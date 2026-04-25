import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // ✅ 1. التحقق من الجلسة - المستخدم يجب أن يكون مسجلاً دخوله
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول لمشاركة التذكيرات' },
        { status: 401 }
      );
    }

    // ✅ 2. قراءة البيانات من الطلب
    const body = await request.json();
    const { id, text, reminderTime } = body;

    // ✅ 3. التحقق من صحة المدخلات
    if (!id || !text || !reminderTime) {
      return NextResponse.json(
        { error: 'جميع الحقول مطلوبة: id, text, reminderTime' },
        { status: 400 }
      );
    }

    // ✅ 4. التحقق من نوع id (يجب أن يكون string صالح لـ ObjectId)
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: 'معرف التذكير غير صالح' },
        { status: 400 }
      );
    }

    // ✅ 5. الاتصال بقاعدة البيانات والحفظ الآمن
    const client = await clientPromise;
    const db = client.db('smartyDB');

    await db.collection('shared_reminders').insertOne({
      _id: objectId,               // ✅ آمن: تم تحويله إلى ObjectId
      text,
      reminderTime,
      userId: session.user.id,     // ✅ ربط التذكير بالمستخدم الحالي
      userEmail: session.user.email,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    // ✅ 6. معالجة الخطأ مع رسالة عامة للمستخدم
    console.error('Error saving shared reminder:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حفظ التذكير' },
      { status: 500 }
    );
  }
}
