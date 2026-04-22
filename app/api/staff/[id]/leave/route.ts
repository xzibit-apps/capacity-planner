import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  try {
    const leaveData = await request.json();
    const startDate = leaveData.startDate || leaveData.date;
    const endDate = leaveData.endDate || leaveData.date || leaveData.startDate;
    const absenceType = leaveData.absenceType || leaveData.leaveType;

    if (!startDate || !endDate || !absenceType) {
      return NextResponse.json({ error: 'startDate, endDate, and absenceType are required' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    // Check staff exists
    const { data: staff } = await supabase.from('cp_staff').select('id').eq('mongo_id', id).single();
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

    // Check for duplicate exact range/type entry
    const { data: existing } = await supabase.from('cp_staff_leave')
      .select('id')
      .eq('staff_mongo_id', id)
      .eq('start_date', startDate)
      .eq('end_date', endDate)
      .eq('absence_type', absenceType)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'Availability record already exists for this staff member' }, { status: 409 });

    const { error } = await supabase.from('cp_staff_leave').insert({
      staff_mongo_id: id,
      date: startDate,
      leave_type: absenceType,
      start_date: startDate,
      end_date: endDate,
      absence_type: absenceType,
      notes: leaveData.notes || '',
    });
    if (error) throw error;

    const { data: allLeave } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', id);
    return NextResponse.json({
      message: 'Availability record added successfully',
      leave: (allLeave || []).map((l: Record<string, unknown>) => ({
        _id: l.id,
        date: l.date || l.start_date,
        startDate: l.start_date || l.date,
        endDate: l.end_date || l.date,
        leaveType: l.leave_type || l.absence_type,
        absenceType: l.absence_type || l.leave_type,
        notes: l.notes,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
