import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createHash } from 'crypto';

async function hashIp(ip: string): Promise<string> {
  return createHash('sha256').update(ip).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const hashedIp = await hashIp(ip);
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingVisit } = await supabase
      .from('visitors')
      .select('*')
      .eq('visitor_ip', hashedIp)
      .eq('visit_date', today)
      .maybeSingle();
    
    if (!existingVisit) {
      await supabase
        .from('visitors')
        .insert({ visitor_ip: hashedIp, visit_date: today });
      
      await supabase.rpc('increment_total_visitors');
    }
    
    const { data: totalData } = await supabase
      .from('total_visitors')
      .select('total_count')
      .eq('id', 1)
      .single();
    
    return NextResponse.json({ success: true, total: totalData?.total_count || 0 });
    
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
