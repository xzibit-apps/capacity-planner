import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const [curvesResult, registryResult] = await Promise.all([
      supabase
        .from('cp_curves')
        .select('*')
        .order('job_type', { ascending: true })
        .order('task_type', { ascending: true }),
      supabase.from('cp_curve_registry').select('job_type, task_type, default_curve_id'),
    ]);

    if (curvesResult.error) throw curvesResult.error;
    if (registryResult.error) throw registryResult.error;

    const registryCurveIds = new Set<string>(
      (registryResult.data || []).map((row: Record<string, unknown>) => String(row.default_curve_id))
    );

    const curves = (curvesResult.data || []).map((row: Record<string, unknown>) => {
      const weeklyPercentages =
        typeof row.weekly_percentages === 'string'
          ? JSON.parse(row.weekly_percentages)
          : row.weekly_percentages;
      return {
        curveId: String(row.curve_id),
        version: String(row.version ?? 'v1.0.0'),
        jobType: String(row.job_type ?? ''),
        taskType: String(row.task_type ?? ''),
        curveStatus: String(row.curve_status ?? 'Draft'),
        weeklyPercentages,
        description: (row.description as string | null) ?? null,
        derivedFrom: (row.derived_from as string | null) ?? null,
        curveFamily: (row.curve_family as string | null) ?? null,
        specSource: (row.spec_source as string | null) ?? null,
        fitQuality: (row.fit_quality as number | null) ?? null,
        specValidated: Boolean(row.spec_validated),
        validatedAt: (row.validated_at as string | null) ?? null,
        createdAt: (row.created_at as string | null) ?? null,
        updatedAt: (row.updated_at as string | null) ?? null,
        isRegistryDefault: registryCurveIds.has(String(row.curve_id)),
      };
    });

    const counts = curves.reduce<Record<string, number>>((acc, curve) => {
      acc[curve.curveStatus] = (acc[curve.curveStatus] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ curves, counts, total: curves.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch curves', details: message },
      { status: 500 }
    );
  }
}
