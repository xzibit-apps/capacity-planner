import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toStaff } from '@/lib/supabase';

function normalizeUtilisation(value: unknown) {
  const numeric = Number(value ?? 0.85);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0.85;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data: staffData, error } = await supabase.from('cp_staff')
      .select('*').order('name', { ascending: true });
    if (error) throw error;

    // Fetch all leave records
    const { data: leaveData } = await supabase.from('cp_staff_leave').select('*');
    const leaveByStaff: Record<string, unknown[]> = {};
    (leaveData || []).forEach((l: Record<string, unknown>) => {
      const key = String(l.staff_mongo_id ?? '');
      if (!leaveByStaff[key]) leaveByStaff[key] = [];
      leaveByStaff[key].push(l);
    });

    return NextResponse.json((staffData || []).map((s: Record<string, unknown>) =>
      toStaff(s, (leaveByStaff[String(s.mongo_id ?? '')] || []) as Record<string, unknown>[])
    ));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch staff', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const mongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    const { data, error } = await supabase.from('cp_staff').insert({
      mongo_id: mongoId,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '_'),
      name: body.name,
      daily_hours: body.dailyHours || 8,
      utilisation: normalizeUtilisation(body.utilisation),
      employee_type: body.employeeType === 'contractor' ? 'contractor' : 'employee',
      skills: body.skills || { CNC: false, Build: false, Paint: false, AV: false, 'Pack & Load': false },
    }).select().single();

    if (error) throw error;
    return NextResponse.json(toStaff(data as Record<string, unknown>, []), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create staff', details: message }, { status: 500 });
  }
}
