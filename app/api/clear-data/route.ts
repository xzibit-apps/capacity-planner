import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/supabase';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

async function verifyAdmin(
  request: NextRequest,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!process.env.JWT_SECRET) {
    return { ok: false, status: 500, error: 'JWT_SECRET not configured' };
  }
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return { ok: false, status: 401, error: 'Missing auth token' };
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = (payload as Record<string, unknown>).role;
    if (role !== 'admin') return { ok: false, status: 403, error: 'Admin required' };
    return { ok: true };
  } catch {
    return { ok: false, status: 401, error: 'Invalid token' };
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
  }

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
