import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  fetchMergedClosures,
  fetchPlanningStaff,
  getDateFromISOWeek,
  getWeekRange,
  toDate,
} from '@/lib/capacityPlanning';
import { calculateWeeklyCapacity, capacityBreakdownToMap } from '@/lib/capacityEngine';
import { chartLabelForISOWeek } from '@/lib/rulesEngine';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = toDate(searchParams.get('startDate')) || new Date();
    const endDate = toDate(searchParams.get('endDate')) || new Date(new Date().setMonth(new Date().getMonth() + 12));

    const jurisdictionParam = searchParams.get('jurisdiction') || 'national';
    const jurisdictions = jurisdictionParam.split(',').map((j) => j.trim()).filter(Boolean);

    const [staff, closures] = await Promise.all([
      fetchPlanningStaff(),
      fetchMergedClosures(jurisdictions),
    ]);

    const weeklyCapacity = calculateWeeklyCapacity(staff, closures, startDate, endDate);
    const planningWeeks = getWeekRange(startDate, endDate);
    const capacityByWeek = capacityBreakdownToMap(weeklyCapacity);

    const weeks = planningWeeks.map((isoWeek) => {
      const weekStart = getDateFromISOWeek(isoWeek);
      return {
        isoWeek,
        label: chartLabelForISOWeek(isoWeek),
        weekStart: weekStart.toISOString().split('T')[0],
      };
    });

    return NextResponse.json({
      weeks,
      capacity: capacityByWeek,
      breakdown: weeklyCapacity,
      meta: {
        staffCount: staff.length,
        closureCount: closures.length,
        jurisdictions,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to calculate capacity', details: message },
      { status: 500 }
    );
  }
}
