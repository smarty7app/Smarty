import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createHash } from 'crypto';

// دالة لتشفير عنوان IP (لحماية الخصوصية)
async function hashIp(ip: string): Promise<string> {
  return createHash('sha256').update(ip).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    // 1. الحصول على عنوان IP الزائر من الطلب
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // 2. تشفير IP (لا نريد تخزينه كما هو)
    const hashedIp = await hashIp(ip);
    
    // 3. تاريخ اليوم بصيغة YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // 4. التحقق مما إذا كان هذا الزائر قد سجل زيارة اليوم
    const { data: existingVisit } = await supabase
      .from('visitors')
      .select('*')
      .eq('visitor_ip', hashedIp)
      .eq('visit_date', today)
      .maybeSingle();
    
    // 5. إذا لم يزر اليوم، نسجله في قاعدة البيانات
    if (!existingVisit) {
      // إدخال الزيارة الجديدة في جدول visitors
      await supabase
        .from('visitors')
        .insert({ visitor_ip: hashedIp, visit_date: today });
      
      // زيادة العداد الإجمالي في جدول total_visitors
      await supabase.rpc('increment_total_visitors');
    }
    
    // 6. جلب العدد الإجمالي الحالي من قاعدة البيانات
    const { data: totalData } = await supabase
      .from('total_visitors')
      .select('total_count')
      .eq('id', 1)
      .single();
    
    // 7. إرجاع النتيجة
    return NextResponse.json({ success: true, total: totalData?.total_count || 0 });
    
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
