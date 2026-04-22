import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toRow } from '@/lib/supabase';
import { z } from 'zod';

const createRowSchema = z.object({ data: z.record(z.any()) });
const updateRowSchema = z.object({ _id: z.string(), changes: z.record(z.any()) });
const deleteRowSchema = z.object({ _id: z.string() });

const VALID_SHEETS = ['capacity', 'demand', 'supply', 'projects', 'staff', 'job-database'];

export async function GET(request: NextRequest, context: { params: Promise<{ sheet: string }> }) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { sheet } = await context.params;
  try {
    if (!VALID_SHEETS.includes(sheet)) {
      return NextResponse.json({ ok: false, error: 'Unknown sheet' }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase.from('cp_rows')
      .select('*', { count: 'exact' })
      .eq('sheet', sheet)
      .order('row_number', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return NextResponse.json({
      ok: true,
      rows: (data || []).map(toRow),
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch rows';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ sheet: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { sheet } = await context.params;
  try {
    if (!VALID_SHEETS.includes(sheet)) {
      return NextResponse.json({ ok: false, error: 'Unknown sheet' }, { status: 404 });
    }
    const body = await request.json();
    const validated = createRowSchema.parse(body);
    const mongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    const { data, error } = await supabase.from('cp_rows').insert({
      mongo_id: mongoId,
      sheet,
      data: validated.data,
      synced: false,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data: toRow(data) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    const message = error instanceof Error ? error.message : 'Failed to create row';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ sheet: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { sheet } = await context.params;
  try {
    if (!VALID_SHEETS.includes(sheet)) {
      return NextResponse.json({ ok: false, error: 'Unknown sheet' }, { status: 404 });
    }
    const body = await request.json();
    const validated = updateRowSchema.parse(body);

    // Fetch current row
    const { data: current } = await supabase.from('cp_rows')
      .select('data').eq('mongo_id', validated._id).single();
    if (!current) return NextResponse.json({ ok: false, error: 'Row not found' }, { status: 404 });

    const currentData = typeof (current as Record<string, unknown>).data === 'object' && (current as Record<string, unknown>).data !== null
      ? (current as Record<string, unknown>).data as Record<string, unknown>
      : {};
    const newData = { ...currentData, ...validated.changes };
    const { data, error } = await supabase.from('cp_rows')
      .update({ data: newData, synced: false, updated_at: new Date().toISOString() })
      .eq('mongo_id', validated._id).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data: toRow(data) });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    const message = error instanceof Error ? error.message : 'Failed to update row';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ sheet: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { sheet } = await context.params;
  try {
    if (!VALID_SHEETS.includes(sheet)) {
      return NextResponse.json({ ok: false, error: 'Unknown sheet' }, { status: 404 });
    }
    const body = await request.json();
    const validated = deleteRowSchema.parse(body);
    const { data, error } = await supabase.from('cp_rows')
      .delete().eq('mongo_id', validated._id).select().single();
    if (error || !data) return NextResponse.json({ ok: false, error: 'Row not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) return NextResponse.json({ ok: false, error: 'Invalid request data', details: error.errors }, { status: 400 });
    const message = error instanceof Error ? error.message : 'Failed to delete row';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
