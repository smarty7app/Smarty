import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ success: true, total: 42 });
}
