import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; date: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, date } = await context.params;
  try {
    const decodedDate = decodeURIComponent(date);
    const { data: staff } = await supabase.from('cp_staff').select('id').eq('mongo_id', id).single();
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

    const { data: leave } = await supabase.from('cp_staff_leave')
      .select('id').eq('staff_mongo_id', id).eq('date', decodedDate).single();
    if (!leave) return NextResponse.json({ error: 'Leave date not found' }, { status: 404 });

    await supabase.from('cp_staff_leave').delete().eq('id', (leave as Record<string, unknown>).id);

    const { data: allLeave } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', id);
    return NextResponse.json({
      message: 'Leave date removed successfully',
      leave: (allLeave || []).map((l: Record<string, unknown>) => ({
        _id: l.id,
        date: l.date,
        leaveType: l.leave_type,
        notes: l.notes,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
