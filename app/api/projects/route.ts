import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toProject, fromProject } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data, error } = await supabase.from('cp_projects')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(toProject));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch projects', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const row = fromProject(body);
    // Generate a mongo_id-style identifier
    row.mongo_id = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    const { data, error } = await supabase.from('cp_projects').insert(row).select().single();
    if (error) throw error;
    return NextResponse.json(toProject(data), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create project', details: message }, { status: 500 });
  }
}
