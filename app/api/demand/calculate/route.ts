import { NextRequest, NextResponse } from 'next/server';
import {
  fetchCurveRegistry,
  fetchPlanningCurves,
  fetchPlanningProjects,
  getDateFromISOWeek,
  getWeekRange,
  roundTo,
  toDate,
} from '@/lib/capacityPlanning';
import { aggregateDemandForProjects, chartLabelForISOWeek } from '@/lib/rulesEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const startDate = toDate(body.startDate) || new Date();
    const endDate = toDate(body.endDate) || new Date(new Date().setMonth(new Date().getMonth() + 12));
    const probabilityThreshold = typeof body.probabilityThreshold === 'number' ? body.probabilityThreshold : 0;
    const includeOnsite = body.includeOnsite !== false;

    const [projects, curves, registry] = await Promise.all([
      fetchPlanningProjects(),
      fetchPlanningCurves(),
      fetchCurveRegistry(),
    ]);

    const planningWeeks = getWeekRange(startDate, endDate);
    const demandResult = aggregateDemandForProjects(projects, curves, registry, planningWeeks, probabilityThreshold);

    const demand = {
      ...demandResult.totals,
      onsite: includeOnsite
        ? demandResult.totals.onsite
        : Object.keys(demandResult.totals.onsite).reduce<Record<string, number>>((accumulator, week) => {
            accumulator[week] = 0;
            return accumulator;
          }, {}),
      total: Object.keys(demandResult.totals.total).reduce<Record<string, number>>((accumulator, week) => {
        const onsiteHours = includeOnsite ? demandResult.totals.onsite[week] || 0 : 0;
        const workshopHours = (demandResult.totals.cnc[week] || 0)
          + (demandResult.totals.build[week] || 0)
          + (demandResult.totals.paint[week] || 0)
          + (demandResult.totals.av[week] || 0)
          + (demandResult.totals.packAndLoad[week] || 0);
        accumulator[week] = roundTo(workshopHours + onsiteHours);
        return accumulator;
      }, {}),
    };

    const weeks = planningWeeks.map((isoWeek) => {
      const weekStart = getDateFromISOWeek(isoWeek);
      return {
        isoWeek,
        label: chartLabelForISOWeek(isoWeek),
        weekStart: weekStart.toISOString().split('T')[0],
      };
    });

    const projectsWithDemand = demandResult.projectResults.filter((r) => r.taskDemands.length > 0);

    return NextResponse.json({
      weeks,
      demand,
      projectDemands: projectsWithDemand,
      warnings: demandResult.warnings,
      meta: {
        totalProjects: projects.length,
        eligibleProjects: projects.length,
        includedProjects: projectsWithDemand.length,
        curveCount: curves.length,
        registryCount: registry.length,
        warningCount: demandResult.warnings.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to calculate demand', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
