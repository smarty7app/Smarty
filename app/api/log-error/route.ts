// app/api/log-error/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const errorData = await request.json();
  // هنا يمكنك حفظ الخطأ في قاعدة بيانات أو إرسال بريد إلكتروني
  console.error('خطأ من العميل:', errorData);
  return NextResponse.json({ success: true });
}