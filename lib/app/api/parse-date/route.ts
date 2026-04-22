// app/api/parse-date/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hybridDateParse } from '@/lib/ai-date-parser';

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'النص مطلوب' },
        { status: 400 }
      );
    }
    
    const result = await hybridDateParse(text, language || 'ar');
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        reminderTime: result.reminderTime,
        parsedText: result.parsedText,
        confidence: result.confidence,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'فشل تحليل النص' },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Parse date API error:', error);
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}
