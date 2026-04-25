export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db('smartyDB');

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(params.id);
    } catch {
      return NextResponse.json({ error: 'معرف غير صالح' }, { status: 400 });
    }

    // ابحث في reminders أولاً
    let reminder = await db.collection('reminders').findOne({ _id: objectId });
    if (!reminder) {
      // إذا لم تجده، ابحث في shared_reminders
      reminder = await db.collection('shared_reminders').findOne({ _id: objectId });
    }

    if (!reminder) {
      return NextResponse.json({ error: 'التذكير غير موجود' }, { status: 404 });
    }

    // إرجاع التذكير بتنسيق موحد
    return NextResponse.json({
      id: reminder._id.toString(),
      text: reminder.text || reminder.title,
      reminderTime: reminder.reminderTime,
    });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
