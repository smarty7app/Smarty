import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // 1. التحقق من الجلسة مع اشتراط البريد الإلكتروني (حساب Google)
    const session = await getServerSession();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول بحساب Google لمشاركة التذكيرات' },
        { status: 401 }
      );
    }

    // 2. قراءة المعرف فقط من الطلب (سيتم تجاهل text و reminderTime)
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف التذكير مطلوب' },
        { status: 400 }
      );
    }

    // 3. التحقق من صلاحية ObjectId
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return NextResponse.json(
        { error: 'معرف التذكير غير صالح' },
        { status: 400 }
      );
    }

    // 4. الاتصال بقاعدة البيانات والتحقق من ملكية التذكير
    const client = await clientPromise;
    const db = client.db('smartyDB');

    const originalReminder = await db.collection('reminders').findOne({
      _id: objectId,
      userId: session.user.id,   // الأهم: يمنع مشاركة تذكيرات الغير
    });

    if (!originalReminder) {
      return NextResponse.json(
        { error: 'التذكير غير موجود أو لا تملكه' },
        { status: 404 }
      );
    }

    // 5. إنشاء أو ضمان وجود تذكير مشترك (باستخدام نفس المعرف)
    //    نستخدم $setOnInsert لكتابة البيانات فقط عند الإنشاء، وعدم الكتابة فوق الموجود
    await db.collection('shared_reminders').updateOne(
      { _id: objectId },
      {
        $setOnInsert: {
          text: originalReminder.title,                // موثوق من قاعدة البيانات
          reminderTime: originalReminder.reminderTime.toISOString(),
          userId: session.user.id,
          userEmail: session.user.email,
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    // 6. إعادة معرف المشاركة (يمكن للواجهة نسخ الرابط)
    return NextResponse.json({
      success: true,
      sharedId: objectId.toString(),
    });

  } catch (error) {
    console.error('Error sharing reminder:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء مشاركة التذكير' },
      { status: 500 }
    );
  }
}
