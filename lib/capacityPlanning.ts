import localCurves from '@/data/whiplash/curves-data.json';
import localCurveRegistry from '@/data/whiplash/curve-registry-data.json';
import { supabase } from '@/lib/supabase';

export type PlanningTaskType =
  | 'CNC'
  | 'Build'
  | 'Paint'
  | 'AV'
  | 'Pack & Load'
  | 'Trades Install';

export interface PlanningCurve {
  id?: number;
  curveId: string;
  version: string;
  jobType: string;
  taskType: string;
  curveType?: string | null;
  curveStatus?: string | null;
  weeklyPercentages: string;
  description?: string | null;
  derivedFrom?: string | null;
  curveFamily?: string | null;
  curveParameters?: string | null;
  domainMin?: string | number | null;
  domainMax?: string | number | null;
  normalisationRule?: string | null;
  allocationMethod?: string | null;
  constraints?: string | null;
  specValidated?: boolean | number | null;
  validatedAt?: string | null;
  fitQuality?: string | number | null;
  specSource?: string | null;
}

export interface CurveRegistryEntry {
  id?: number;
  jobType: string;
  taskType: string;
  defaultCurveId: string;
  reason?: string | null;
}

export interface PlanningProject {
  id: string;
  jobNumber: string;
  jobName: string;
  jobType: string;
  probability: number;
  workshopStartDate: Date | null;
  weeksInWorkshop: number;
  truckLoadDate: Date | null;
  onsiteWeeks: number;
  cnc: number;
  build: number;
  paint: number;
  av: number;
  packAndLoad: number;
  tradeOnsite: number;
  curveMode?: string | null;
  raw?: Record<string, unknown>;
}

export interface AvailabilityRecord {
  id?: string | number;
  startDate: string;
  endDate: string;
  absenceType: string;
  notes?: string | null;
}

export interface PlanningStaffMember {
  id: string;
  name: string;
  dailyHours: number;
  utilisation: number;
  employeeType: 'employee' | 'contractor';
  skills: Record<string, boolean>;
  availability: AvailabilityRecord[];
  raw?: Record<string, unknown>;
}

export interface CompanyClosure {
  id?: string | number;
  name: string;
  startDate: string;
  endDate: string;
  closureType: string;
  notes?: string | null;
}

export interface WeeklyDemandBreakdown {
  cnc: Record<string, number>;
  build: Record<string, number>;
  paint: Record<string, number>;
  av: Record<string, number>;
  packAndLoad: Record<string, number>;
  onsite: Record<string, number>;
  total: Record<string, number>;
}

export function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeUtilisation(value: unknown): number {
  const numeric = asNumber(value);
  if (numeric <= 0) return 0;
  return numeric > 1 ? clamp(numeric / 100, 0, 1) : clamp(numeric, 0, 1);
}

export function normalizeEmployeeType(value: unknown): 'employee' | 'contractor' {
  return value === 'contractor' ? 'contractor' : 'employee';
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function toDateString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().split('T')[0];
}

export function startOfIsoWeek(value: Date): Date {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function addWeeks(value: Date, weeks: number): Date {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date;
}

export function getISOWeek(value: Date): string {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getDateFromISOWeek(isoWeek: string): Date {
  const [year, week] = isoWeek.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const weekStart = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  weekStart.setUTCDate(weekStart.getUTCDate() + (week - 1) * 7);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart;
}

export function getWeekRange(startDate: Date, endDate: Date): string[] {
  const weeks: string[] = [];
  let cursor = startOfIsoWeek(startDate);
  const end = startOfIsoWeek(endDate);

  while (cursor <= end) {
    weeks.push(getISOWeek(cursor));
    cursor = addWeeks(cursor, 1);
  }

  return weeks;
}

export function deriveWorkshopStartDate(projectRow: Record<string, unknown>): Date | null {
  const explicitWorkshopStart =
    toDate(projectRow.workshop_start_date) ||
    toDate(projectRow.workshopStartDate);

  if (explicitWorkshopStart) {
    return startOfIsoWeek(explicitWorkshopStart);
  }

  const truckLoadDate = toDate(projectRow.truck_load_date) || toDate(projectRow.truckLoadDate);
  const weeksInWorkshop = Math.max(
    1,
    asNumber(projectRow.weeks_in_workshop ?? projectRow.weeksToBuild ?? projectRow.weeks_to_build)
  );

  if (!truckLoadDate) return null;

  return addWeeks(startOfIsoWeek(truckLoadDate), -(weeksInWorkshop - 1));
}

export function normalizeProjectRow(
  row: Record<string, unknown>,
  jobTypeNameById: Record<string, string>
): PlanningProject {
  const jobTypeId = String(row.job_type_mongo_id ?? row.jobType ?? row.job_type ?? '');
  const jobTypeName =
    jobTypeNameById[jobTypeId] ||
    String(row.job_type_name ?? row.jobTypeName ?? row.job_type ?? jobTypeId ?? '').trim();

  const weeksInWorkshop = Math.max(
    1,
    Math.round(asNumber(row.weeks_in_workshop ?? row.weeks_to_build ?? row.weeksInWorkshop ?? row.weeksToBuild ?? 1))
  );

  return {
    id: String(row.mongo_id ?? row.id ?? row.job_number ?? row.jobNumber ?? crypto.randomUUID()),
    jobNumber: String(row.job_number ?? row.jobNumber ?? ''),
    jobName: String(row.job_name ?? row.jobName ?? ''),
    jobType: jobTypeName,
    probability: normalizeUtilisation(asNumber(row.probability ?? 0)) * 100,
    workshopStartDate: deriveWorkshopStartDate(row),
    weeksInWorkshop,
    truckLoadDate: toDate(row.truck_load_date ?? row.truckLoadDate),
    onsiteWeeks: Math.max(1, Math.round(asNumber(row.onsite_weeks ?? row.onsiteWeeks ?? 1))),
    cnc: asNumber(row.cnc),
    build: asNumber(row.build),
    paint: asNumber(row.paint),
    av: asNumber(row.av),
    packAndLoad: asNumber(row.pack_and_load ?? row.packAndLoad ?? row.packLoad),
    tradeOnsite: asNumber(row.trade_onsite ?? row.tradeOnsite),
    curveMode: row.curve_mode ? String(row.curve_mode) : row.curveMode ? String(row.curveMode) : null,
    raw: row,
  };
}

export function normalizeAvailabilityRecord(row: Record<string, unknown>): AvailabilityRecord {
  const startDate = String(row.start_date ?? row.startDate ?? row.date ?? '');
  const endDate = String(row.end_date ?? row.endDate ?? row.date ?? startDate);
  const absenceType = String(row.absence_type ?? row.absenceType ?? row.leave_type ?? row.leaveType ?? 'Other Leave');

  return {
    id: row.id ? String(row.id) : undefined,
    startDate,
    endDate,
    absenceType,
    notes: row.notes ? String(row.notes) : null,
  };
}

export function normalizeStaffRow(
  row: Record<string, unknown>,
  availabilityRows: Record<string, unknown>[]
): PlanningStaffMember {
  return {
    id: String(row.mongo_id ?? row.id ?? row.slug ?? crypto.randomUUID()),
    name: String(row.name ?? ''),
    dailyHours: asNumber(row.daily_hours ?? row.dailyHours ?? 8) || 8,
    utilisation: normalizeUtilisation(row.utilisation ?? 0.85),
    employeeType: normalizeEmployeeType(row.employee_type ?? row.employeeType),
    skills: (row.skills as Record<string, boolean>) || {},
    availability: availabilityRows.map(normalizeAvailabilityRecord),
    raw: row,
  };
}

function scalarOrNull(value: unknown): string | number | boolean | null {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return null;
}

function stringOrNumberOrNull(value: unknown): string | number | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
}

function normalizeCurveRow(row: Record<string, unknown>): PlanningCurve {
  return {
    id: row.id ? asNumber(row.id) : undefined,
    curveId: String(row.curveId ?? row.curve_id ?? ''),
    version: String(row.version ?? 'v1.0.0'),
    jobType: String(row.jobType ?? row.job_type ?? ''),
    taskType: String(row.taskType ?? row.task_type ?? ''),
    curveType: row.curveType ? String(row.curveType) : row.curve_type ? String(row.curve_type) : null,
    curveStatus: row.curveStatus ? String(row.curveStatus) : row.curve_status ? String(row.curve_status) : null,
    weeklyPercentages:
      typeof row.weeklyPercentages === 'string'
        ? row.weeklyPercentages
        : JSON.stringify(row.weeklyPercentages ?? []),
    description: row.description ? String(row.description) : null,
    derivedFrom: row.derivedFrom ? String(row.derivedFrom) : row.derived_from ? String(row.derived_from) : null,
    curveFamily: row.curveFamily ? String(row.curveFamily) : row.curve_family ? String(row.curve_family) : null,
    curveParameters:
      typeof row.curveParameters === 'string'
        ? row.curveParameters
        : row.curve_parameters
          ? String(row.curve_parameters)
          : null,
    domainMin: stringOrNumberOrNull(row.domainMin ?? row.domain_min),
    domainMax: stringOrNumberOrNull(row.domainMax ?? row.domain_max),
    normalisationRule: row.normalisationRule ? String(row.normalisationRule) : row.normalisation_rule ? String(row.normalisation_rule) : null,
    allocationMethod: row.allocationMethod ? String(row.allocationMethod) : row.allocation_method ? String(row.allocation_method) : null,
    constraints: typeof row.constraints === 'string' ? row.constraints : row.constraints ? JSON.stringify(row.constraints) : null,
    specValidated: scalarOrNull(row.specValidated ?? row.spec_validated) as boolean | number | null,
    validatedAt: row.validatedAt ? String(row.validatedAt) : row.validated_at ? String(row.validated_at) : null,
    fitQuality: scalarOrNull(row.fitQuality ?? row.fit_quality) as string | number | null,
    specSource: row.specSource ? String(row.specSource) : row.spec_source ? String(row.spec_source) : null,
  };
}

function normalizeCurveRegistryRow(row: Record<string, unknown>): CurveRegistryEntry {
  return {
    id: row.id ? asNumber(row.id) : undefined,
    jobType: String(row.jobType ?? row.job_type ?? ''),
    taskType: String(row.taskType ?? row.task_type ?? ''),
    defaultCurveId: String(row.defaultCurveId ?? row.default_curve_id ?? ''),
    reason: row.reason ? String(row.reason) : null,
  };
}

export async function fetchJobTypeNameById(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('cp_job_types').select('mongo_id, id, name');
  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, string>>((accumulator, row: Record<string, unknown>) => {
    const keys = [row.mongo_id, row.id].filter(Boolean).map(String);
    keys.forEach((key) => {
      accumulator[key] = String(row.name ?? '');
    });
    return accumulator;
  }, {});
}

export async function fetchPlanningProjects(): Promise<PlanningProject[]> {
  const jobTypeNameById = await fetchJobTypeNameById();
  const { data, error } = await supabase.from('cp_projects').select('*').order('created_at', { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to fetch planning projects');
  }

  return data.map((row: Record<string, unknown>) => normalizeProjectRow(row, jobTypeNameById));
}

export async function fetchPlanningCurves(): Promise<PlanningCurve[]> {
  try {
    const { data, error } = await supabase.from('cp_curves').select('*');
    if (!error && data && data.length > 0) {
      return data.map((row: Record<string, unknown>) => normalizeCurveRow(row));
    }
  } catch {
    // Fallback handled below.
  }

  return (localCurves as Record<string, unknown>[]).map(normalizeCurveRow);
}

export async function fetchCurveRegistry(): Promise<CurveRegistryEntry[]> {
  try {
    const { data: registryData, error: registryError } = await supabase.from('cp_curve_registry').select('*');
    if (registryError) throw registryError;

    if (registryData && registryData.length > 0) {
      const { data: activeCurves } = await supabase
        .from('cp_curves')
        .select('curve_id')
        .eq('curve_status', 'Active');
      const activeCurveIds = new Set(
        (activeCurves || []).map((row: Record<string, unknown>) => String(row.curve_id))
      );
      return registryData
        .map((row: Record<string, unknown>) => normalizeCurveRegistryRow(row))
        .filter((row) => activeCurveIds.has(row.defaultCurveId));
    }
  } catch {
    // Fallback handled below.
  }

  return (localCurveRegistry as Record<string, unknown>[]).map(normalizeCurveRegistryRow);
}

export async function fetchPlanningStaff(): Promise<PlanningStaffMember[]> {
  const { data: staffRows, error: staffError } = await supabase.from('cp_staff').select('*').order('name', { ascending: true });
  if (staffError || !staffRows) {
    throw new Error(staffError?.message || 'Failed to fetch staff');
  }

  const { data: availabilityRows } = await supabase.from('cp_staff_leave').select('*');
  const availabilityByStaffId = (availabilityRows || []).reduce<Record<string, Record<string, unknown>[]>>((accumulator, row: Record<string, unknown>) => {
    const staffId = String(row.staff_mongo_id ?? row.staffId ?? '');
    if (!staffId) return accumulator;
    accumulator[staffId] = accumulator[staffId] || [];
    accumulator[staffId].push(row);
    return accumulator;
  }, {});

  return staffRows.map((row: Record<string, unknown>) => {
    const staffId = String(row.mongo_id ?? row.id ?? '');
    return normalizeStaffRow(row, availabilityByStaffId[staffId] || []);
  });
}

export async function fetchCompanyClosures(): Promise<CompanyClosure[]> {
  try {
    const { data, error } = await supabase.from('cp_company_closures').select('*').order('start_date', { ascending: true });
    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => ({
      id: row.id ? String(row.id) : undefined,
      name: String(row.name ?? 'Closure'),
      startDate: String(row.start_date ?? row.startDate ?? ''),
      endDate: String(row.end_date ?? row.endDate ?? row.start_date ?? row.startDate ?? ''),
      closureType: String(row.closure_type ?? row.closureType ?? 'Public Holiday'),
      notes: row.notes ? String(row.notes) : null,
    }));
  } catch {
    return [];
  }
}

export function createEmptyWeeklyDemand(weeks: string[]): WeeklyDemandBreakdown {
  const emptyRecord = () => weeks.reduce<Record<string, number>>((accumulator, week) => {
    accumulator[week] = 0;
    return accumulator;
  }, {});

  return {
    cnc: emptyRecord(),
    build: emptyRecord(),
    paint: emptyRecord(),
    av: emptyRecord(),
    packAndLoad: emptyRecord(),
    onsite: emptyRecord(),
    total: emptyRecord(),
  };
}
