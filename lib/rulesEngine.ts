import {
  addWeeks,
  createEmptyWeeklyDemand,
  getISOWeek,
  getWeekRange,
  PlanningCurve,
  PlanningProject,
  WeeklyDemandBreakdown,
  roundTo,
} from '@/lib/capacityPlanning';

export interface CurveSelection {
  curve: PlanningCurve;
  isDefault: boolean;
  reason?: string;
}

export interface CurveCache {
  curvesById: Map<string, PlanningCurve>;
  registryByJobAndTask: Map<string, string>;
}

export interface TaskDemandResult {
  taskType: string;
  totalHours: number;
  curveId: string;
  curveVersion: string;
  curveReason?: string;
  weeklyDemand: Record<string, number>;
}

export type ProjectWarningTag =
  | 'missing_truck_date'
  | 'zero_weeks_to_build'
  | 'job_type_missing'
  | 'job_type_no_curves'
  | 'ambiguous_probability'
  | 'flat_fallback';

export interface ProjectDemandResult {
  projectId: string;
  jobNumber: string;
  jobName: string;
  probability: number;
  taskDemands: TaskDemandResult[];
  breakdown: WeeklyDemandBreakdown;
  warnings: ProjectWarningTag[];
}

interface ParsedCurveData {
  progressValues: number[];
  curveValues: number[];
  normalizationValue: number;
}

const CORE_TASK_FIELD_MAP: Array<{ taskType: 'CNC' | 'Build' | 'Paint' | 'AV' | 'Pack & Load'; projectField: keyof PlanningProject }> = [
  { taskType: 'CNC', projectField: 'cnc' },
  { taskType: 'Build', projectField: 'build' },
  { taskType: 'Paint', projectField: 'paint' },
  { taskType: 'AV', projectField: 'av' },
  { taskType: 'Pack & Load', projectField: 'packAndLoad' },
];

export function buildCurveCache(curves: PlanningCurve[], registry: Array<{ jobType: string; taskType: string; defaultCurveId: string }>): CurveCache {
  const curvesById = new Map<string, PlanningCurve>();
  curves.forEach((curve) => {
    curvesById.set(curve.curveId, curve);
  });

  const registryByJobAndTask = new Map<string, string>();
  registry.forEach((entry) => {
    registryByJobAndTask.set(`${entry.jobType}|${entry.taskType}`, entry.defaultCurveId);
  });

  return { curvesById, registryByJobAndTask };
}

function createFlatCurve(taskType: string, jobType: string): PlanningCurve {
  return {
    curveId: `flat-${jobType}-${taskType}`,
    version: 'v1.0.0',
    jobType,
    taskType,
    curveType: 'Synthetic',
    curveStatus: 'Active',
    weeklyPercentages: JSON.stringify({
      progressValues: Array.from({ length: 100 }, (_, index) => (index + 1) / 100),
      curveValues: Array.from({ length: 100 }, () => 1),
      normalizationValue: 100,
    }),
    description: `Fallback flat curve for ${jobType} × ${taskType}`,
    derivedFrom: null,
    curveFamily: 'piecewise_empirical',
    curveParameters: null,
    domainMin: '0',
    domainMax: '1',
    normalisationRule: 'integrate_to_one',
    allocationMethod: 'equal_width_bins',
    constraints: null,
    specValidated: false,
    validatedAt: null,
    fitQuality: null,
    specSource: 'defined',
  };
}

function parseCurveData(curve: PlanningCurve): ParsedCurveData {
  try {
    const parsed = JSON.parse(curve.weeklyPercentages);

    if (parsed && Array.isArray(parsed.progressValues) && Array.isArray(parsed.curveValues)) {
      return {
        progressValues: parsed.progressValues.map(Number),
        curveValues: parsed.curveValues.map(Number),
        normalizationValue: Number(parsed.normalizationValue) || parsed.curveValues.reduce((sum: number, value: number) => sum + Number(value || 0), 0) || 100,
      };
    }

    if (Array.isArray(parsed)) {
      const progressValues = parsed.map((item) => Number(item.progress));
      const curveValues = parsed.map((item) => Number(item.intensity));
      const normalizationValue = curveValues.reduce((sum, value) => sum + value, 0) || 100;
      return { progressValues, curveValues, normalizationValue };
    }
  } catch {
    // Fallback below.
  }

  return {
    progressValues: Array.from({ length: 100 }, (_, index) => (index + 1) / 100),
    curveValues: Array.from({ length: 100 }, () => 1),
    normalizationValue: 100,
  };
}

export function selectCurve(
  jobType: string,
  taskType: string,
  cache: CurveCache
): CurveSelection {
  const defaultCurveId = cache.registryByJobAndTask.get(`${jobType}|${taskType}`);
  if (defaultCurveId) {
    const curve = cache.curvesById.get(defaultCurveId);
    if (curve) {
      return { curve, isDefault: true };
    }
  }

  return { curve: createFlatCurve(taskType, jobType), isDefault: false, reason: 'flat-fallback-no-curve' };
}

export function calculateTaskDemand(
  totalHours: number,
  curve: PlanningCurve,
  workshopStartDate: Date,
  durationWeeks: number
): Record<string, number> {
  const weeklyDemand: Record<string, number> = {};

  if (totalHours <= 0 || durationWeeks <= 0) {
    return weeklyDemand;
  }

  const { progressValues, curveValues, normalizationValue } = parseCurveData(curve);
  const weeks = getWeekRange(workshopStartDate, addWeeks(workshopStartDate, durationWeeks - 1));

  weeks.forEach((week, weekIndex) => {
    const progressStart = weekIndex / durationWeeks;
    const progressEnd = (weekIndex + 1) / durationWeeks;

    let weekSum = 0;
    for (let index = 0; index < progressValues.length; index += 1) {
      const progress = progressValues[index];
      if (progress > progressStart && progress <= progressEnd) {
        weekSum += curveValues[index] || 0;
      }
    }

    weeklyDemand[week] = roundTo((weekSum / normalizationValue) * totalHours);
  });

  return weeklyDemand;
}

function addDemandToBreakdown(
  breakdown: WeeklyDemandBreakdown,
  taskType: string,
  weeklyDemand: Record<string, number>
) {
  Object.entries(weeklyDemand).forEach(([week, value]) => {
    const hours = roundTo(value);
    if (taskType === 'CNC') breakdown.cnc[week] = roundTo((breakdown.cnc[week] || 0) + hours);
    if (taskType === 'Build') breakdown.build[week] = roundTo((breakdown.build[week] || 0) + hours);
    if (taskType === 'Paint') breakdown.paint[week] = roundTo((breakdown.paint[week] || 0) + hours);
    if (taskType === 'AV') breakdown.av[week] = roundTo((breakdown.av[week] || 0) + hours);
    if (taskType === 'Pack & Load') breakdown.packAndLoad[week] = roundTo((breakdown.packAndLoad[week] || 0) + hours);
    if (taskType === 'Trades Install') breakdown.onsite[week] = roundTo((breakdown.onsite[week] || 0) + hours);
    breakdown.total[week] = roundTo((breakdown.total[week] || 0) + hours);
  });
}

function calculateOnsiteDemand(project: PlanningProject): Record<string, number> {
  const weeklyDemand: Record<string, number> = {};
  if (project.tradeOnsite <= 0 || !project.truckLoadDate) {
    return weeklyDemand;
  }

  const onsiteWeeks = Math.max(1, project.onsiteWeeks || 1);
  const hoursPerWeek = project.tradeOnsite / onsiteWeeks;
  const weekRange = getWeekRange(project.truckLoadDate, addWeeks(project.truckLoadDate, onsiteWeeks - 1));

  weekRange.forEach((week) => {
    weeklyDemand[week] = roundTo(hoursPerWeek);
  });

  return weeklyDemand;
}

export function calculateProjectDemand(
  project: PlanningProject,
  cache: CurveCache,
  planningWeeks: string[]
): ProjectDemandResult {
  const warnings: ProjectWarningTag[] = [];

  if (!project.truckLoadDate) warnings.push('missing_truck_date');
  if (project.weeksInWorkshop <= 0) warnings.push('zero_weeks_to_build');
  if (!project.jobType) {
    warnings.push('job_type_missing');
  } else {
    // Check if any task has a real curve in the registry for this job type
    const hasAnyCurve = CORE_TASK_FIELD_MAP.some(({ taskType }) =>
      cache.registryByJobAndTask.has(`${project.jobType}|${taskType}`)
    );
    if (!hasAnyCurve) warnings.push('job_type_no_curves');
  }
  if (project.probabilityWasAmbiguous) {
    warnings.push('ambiguous_probability');
  }

  const breakdown = createEmptyWeeklyDemand(planningWeeks);
  const taskDemands: TaskDemandResult[] = [];

  if (project.workshopStartDate && project.weeksInWorkshop > 0 && project.jobType) {
    let anyFlatFallback = false;

    CORE_TASK_FIELD_MAP.forEach(({ taskType, projectField }) => {
      const totalHours = Number(project[projectField] || 0);
      if (totalHours <= 0) return;

      const selection = selectCurve(project.jobType as string, taskType, cache);
      if (selection.reason === 'flat-fallback-no-curve') anyFlatFallback = true;

      const weeklyDemand = calculateTaskDemand(totalHours, selection.curve, project.workshopStartDate as Date, project.weeksInWorkshop);

      taskDemands.push({
        taskType,
        totalHours,
        curveId: selection.curve.curveId,
        curveVersion: selection.curve.version,
        curveReason: selection.reason,
        weeklyDemand,
      });

      addDemandToBreakdown(breakdown, taskType, weeklyDemand);
    });

    if (anyFlatFallback) warnings.push('flat_fallback');
  }

  const onsiteDemand = calculateOnsiteDemand(project);
  if (Object.keys(onsiteDemand).length > 0) {
    taskDemands.push({
      taskType: 'Trades Install',
      totalHours: project.tradeOnsite,
      curveId: 'flat-onsite',
      curveVersion: 'v1.0.0',
      weeklyDemand: onsiteDemand,
    });
    addDemandToBreakdown(breakdown, 'Trades Install', onsiteDemand);
  }

  return {
    projectId: project.id,
    jobNumber: project.jobNumber,
    jobName: project.jobName,
    probability: project.probability,
    taskDemands,
    breakdown,
    warnings,
  };
}

export interface ProjectWarning {
  projectId: string;
  jobNumber: string;
  tags: ProjectWarningTag[];
}

export function aggregateDemandForProjects(
  projects: PlanningProject[],
  curves: PlanningCurve[],
  registry: Array<{ jobType: string; taskType: string; defaultCurveId: string }>,
  planningWeeks: string[],
  probabilityThreshold = 0
): {
  projectResults: ProjectDemandResult[];
  totals: WeeklyDemandBreakdown;
  warnings: ProjectWarning[];
} {
  const cache = buildCurveCache(curves, registry);
  const totals = createEmptyWeeklyDemand(planningWeeks);
  const projectResults: ProjectDemandResult[] = [];
  const warnings: ProjectWarning[] = [];

  projects
    .filter((project) => project.probability >= probabilityThreshold)
    .forEach((project) => {
      const result = calculateProjectDemand(project, cache, planningWeeks);
      projectResults.push(result);

      if (result.warnings.length > 0) {
        warnings.push({ projectId: result.projectId, jobNumber: result.jobNumber, tags: result.warnings });
      }

      if (result.taskDemands.length > 0) {
        addDemandToBreakdown(totals, 'CNC', result.breakdown.cnc);
        addDemandToBreakdown(totals, 'Build', result.breakdown.build);
        addDemandToBreakdown(totals, 'Paint', result.breakdown.paint);
        addDemandToBreakdown(totals, 'AV', result.breakdown.av);
        addDemandToBreakdown(totals, 'Pack & Load', result.breakdown.packAndLoad);
        addDemandToBreakdown(totals, 'Trades Install', result.breakdown.onsite);
      }
    });

  return { projectResults, totals, warnings };
}

export function filterDemandToRange(
  demand: WeeklyDemandBreakdown,
  planningWeeks: string[]
): WeeklyDemandBreakdown {
  const createFiltered = (source: Record<string, number>) => planningWeeks.reduce<Record<string, number>>((accumulator, week) => {
    accumulator[week] = roundTo(source[week] || 0);
    return accumulator;
  }, {});

  return {
    cnc: createFiltered(demand.cnc),
    build: createFiltered(demand.build),
    paint: createFiltered(demand.paint),
    av: createFiltered(demand.av),
    packAndLoad: createFiltered(demand.packAndLoad),
    onsite: createFiltered(demand.onsite),
    total: createFiltered(demand.total),
  };
}

export function chartLabelForISOWeek(isoWeek: string): string {
  const date = new Date(getDateFromISOWeek(isoWeek));
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCFullYear()).slice(-2)} ${isoWeek.split('-')[1]}`;
}

function getDateFromISOWeek(isoWeek: string): Date {
  const [year, week] = isoWeek.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  weekStart.setUTCDate(weekStart.getUTCDate() + (week - 1) * 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}
