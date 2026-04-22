import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toJobType } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data, error } = await supabase
      .from('cp_job_types').select('*').order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json((data || []).map(toJobType));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch job types', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const { data, error } = await supabase.from('cp_job_types')
      .insert({ name: body.name, description: body.description || null, is_active: body.isActive !== undefined ? body.isActive : true })
      .select().single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Job type with this name already exists' }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ message: 'Job type created successfully', jobType: toJobType(data) }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
