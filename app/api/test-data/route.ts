import { NextResponse } from 'next/server';
import { supabase, toRow } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: allRows, error } = await supabase.from('cp_rows').select('*').limit(5);
    if (error) throw error;

    let sheetCounts: any = null;
    try { const r = await supabase.rpc('get_cp_rows_sheet_counts'); sheetCounts = r.data; } catch (_) {}

    // Fallback: manual count per sheet
    const sheets = ['capacity', 'demand', 'supply', 'projects', 'staff', 'job-database'];
    const counts: any[] = [];
    for (const sheet of sheets) {
      const { count } = await supabase.from('cp_rows').select('*', { count: 'exact', head: true }).eq('sheet', sheet);
      if (count) counts.push({ _id: sheet, count });
    }

    return NextResponse.json({
      success: true,
      totalRows: counts.reduce((sum, c) => sum + c.count, 0),
      sheetCounts: counts,
      sampleRows: (allRows || []).map(toRow)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
