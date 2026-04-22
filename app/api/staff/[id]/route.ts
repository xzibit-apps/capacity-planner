import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toStaff } from '@/lib/supabase';

function normalizeUtilisation(value: unknown) {
  const numeric = Number(value ?? 0.85);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0.85;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  try {
    const { data, error } = await supabase.from('cp_staff')
      .select('*').eq('mongo_id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    const { data: leaveData } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', id);
    return NextResponse.json(toStaff(data as Record<string, unknown>, (leaveData || []) as Record<string, unknown>[]));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch staff', details: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.dailyHours !== undefined) updateData.daily_hours = body.dailyHours;
    if (body.utilisation !== undefined) updateData.utilisation = normalizeUtilisation(body.utilisation);
    if (body.employeeType !== undefined) updateData.employee_type = body.employeeType === 'contractor' ? 'contractor' : 'employee';
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.slug !== undefined) updateData.slug = body.slug;

    const { data, error } = await supabase.from('cp_staff')
      .update(updateData).eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    const { data: leaveData } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', id);
    return NextResponse.json(toStaff(data as Record<string, unknown>, (leaveData || []) as Record<string, unknown>[]));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update staff', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await context.params;
  try {
    // Delete leave records first
    await supabase.from('cp_staff_leave').delete().eq('staff_mongo_id', id);
    const { data, error } = await supabase.from('cp_staff')
      .delete().eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    return NextResponse.json({ message: 'Staff deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete staff', details: message }, { status: 500 });
  }
}
