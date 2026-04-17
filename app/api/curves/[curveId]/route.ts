import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const VALID_STATUSES = new Set(['Draft', 'Active', 'Archived']);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ curveId: string }> }
) {
  try {
    const { curveId } = await context.params;
    const body = await request.json();
    const status = body?.status;

    if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('cp_curves')
      .update({ curve_status: status, updated_at: new Date().toISOString() })
      .eq('curve_id', curveId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Curve not found' }, { status: 404 });
    }

    return NextResponse.json({
      curveId: data.curve_id,
      curveStatus: data.curve_status,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update curve', details: message },
      { status: 500 }
    );
  }
}
