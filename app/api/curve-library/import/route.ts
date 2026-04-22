import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { supabase, toCurveLibrary } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data, error } = await supabase.from('cp_curve_libraries')
      .select('*').order('name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ curves: (data || []).map(toCurveLibrary) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch curve library', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { curveLibrary } = body;

    // Clear existing curve library data
    await supabase.from('cp_curve_libraries').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Import curve library
    if (curveLibrary && typeof curveLibrary === 'object') {
      const curveDocuments = Object.entries(curveLibrary).map(([name, curves]) => ({
        mongo_id: Date.now().toString(16) + Math.random().toString(16).slice(2, 10),
        name,
        curves,
      }));
      const { error } = await supabase.from('cp_curve_libraries').insert(curveDocuments);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Curve library imported successfully',
      curvesCount: Object.keys(curveLibrary || {}).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to import curve library', details: message }, { status: 500 });
  }
}
