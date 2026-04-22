import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { sheetSlug } = body;

    let query = supabase.from('cp_rows').delete();
    if (sheetSlug) {
      query = query.eq('sheet', sheetSlug);
    } else {
      // Delete all rows - use a condition that matches everything
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully cleared rows${sheetSlug ? ` for sheet: ${sheetSlug}` : ' for all sheets'}`,
      sheetSlug: sheetSlug || 'all',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Clear data failed:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
