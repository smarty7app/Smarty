import { NextResponse } from 'next/server';

export async function GET() {
  // بيانات تجريبية للاختبار
  return NextResponse.json({ success: true, total: 42 });
}
