import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-side client with service role key (bypasses RLS)
// Env vars are validated at runtime (not build time) to avoid Vercel build failures
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_KEY || 'placeholder',
  { auth: { persistSession: false } }
);

function normalizeRatio(value: any) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

// Helper to convert Supabase row to API-compatible format
// Maps Supabase snake_case fields to camelCase for backward compatibility
export function toProject(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    jobNumber: row.job_number,
    jobName: row.job_name,
    // job_type: prefer denormalised text column, fall back to mongo_id for downstream normalizeProjectRow lookup
    jobType: row.job_type || row.job_type_mongo_id,
    job_type: row.job_type || null,
    job_type_mongo_id: row.job_type_mongo_id || null,
    truckLoadDate: row.truck_load_date,
    truck_load_date: row.truck_load_date,
    truck_load_date_parsed: row.truck_load_date_parsed || null,
    truck_load_date_confidence: row.truck_load_date_confidence || null,
    weeksToBuild: row.weeks_to_build,
    weeksInWorkshop: row.weeks_to_build,
    status: row.status,
    probability: row.probability,
    cnc: row.cnc,
    build: row.build,
    paint: row.paint,
    av: row.av,
    packAndLoad: row.pack_and_load,
    tradeOnsite: row.trade_onsite,
    onsiteWeeks: row.onsite_weeks,
    installDeadline: row.install_deadline,
    hrsEstOnly: row.hrs_est_only,
    pm: row.pm,
    notes: row.notes,
    curveMode: row.curve_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromProject(body: any) {
  const mapped: any = {};
  if (body.jobNumber !== undefined) mapped.job_number = body.jobNumber;
  if (body.jobName !== undefined) mapped.job_name = body.jobName;
  if (body.jobType !== undefined) mapped.job_type_mongo_id = body.jobType;
  if (body.truckLoadDate !== undefined) mapped.truck_load_date = body.truckLoadDate;
  if (body.weeksToBuild !== undefined) mapped.weeks_to_build = body.weeksToBuild;
  if (body.status !== undefined) mapped.status = body.status;
  if (body.probability !== undefined) mapped.probability = body.probability;
  if (body.cnc !== undefined) mapped.cnc = body.cnc;
  if (body.build !== undefined) mapped.build = body.build;
  if (body.paint !== undefined) mapped.paint = body.paint;
  if (body.av !== undefined) mapped.av = body.av;
  if (body.packAndLoad !== undefined) mapped.pack_and_load = body.packAndLoad;
  if (body.tradeOnsite !== undefined) mapped.trade_onsite = body.tradeOnsite;
  if (body.onsiteWeeks !== undefined) mapped.onsite_weeks = body.onsiteWeeks;
  if (body.installDeadline !== undefined) mapped.install_deadline = body.installDeadline;
  if (body.hrsEstOnly !== undefined) mapped.hrs_est_only = body.hrsEstOnly;
  if (body.pm !== undefined) mapped.pm = body.pm;
  if (body.notes !== undefined) mapped.notes = body.notes;
  if (body.curveMode !== undefined) mapped.curve_mode = body.curveMode;
  return mapped;
}

export function toJobType(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStaff(row: any, leaveRows: any[] = []) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    slug: row.slug,
    name: row.name,
    dailyHours: row.daily_hours,
    utilisation: normalizeRatio(row.utilisation),
    employeeType: row.employee_type || row.employeeType || 'employee',
    skills: row.skills,
    leave: leaveRows.map(l => ({
      _id: l.id,
      date: l.date || l.start_date,
      startDate: l.start_date || l.date,
      endDate: l.end_date || l.date,
      leaveType: l.leave_type || l.absence_type,
      absenceType: l.absence_type || l.leave_type,
      notes: l.notes,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCurveLibrary(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    name: row.name,
    curves: row.curves,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRow(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    sheet: row.sheet,
    rowNumber: row.row_number,
    excelRowIndex: row.excel_row_index,
    data: row.data,
    synced: row.synced,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
