import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const { data } = await supabase
      .from('total_visitors')
      .select('total_count')
      .eq('id', 1)
      .single();

    return NextResponse.json({ success: true, total: data?.total_count || 0 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}      .single();
    
    return NextResponse.json({ success: true, total: totalData?.total_count || 0 });
    
  } catch (error) {
    console.error('Error tracking visitor:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
