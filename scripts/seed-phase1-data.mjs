import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data', 'whiplash');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function normalizeRatio(value, fallback = 1) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function deriveClosures(availabilityRows) {
  const closureMap = new Map();

  for (const row of availabilityRows) {
    if (row.absenceType !== 'Public Holiday') continue;
    const startDate = toIsoDate(row.startDate);
    const endDate = toIsoDate(row.endDate);
    if (!startDate || !endDate) continue;

    const key = `${startDate}:${endDate}:public_holiday`;
    if (!closureMap.has(key)) {
      closureMap.set(key, {
        name: 'Public Holiday',
        start_date: startDate,
        end_date: endDate,
        closure_type: 'public_holiday',
        notes: 'Derived from Whiplash staff availability export',
      });
    }
  }

  return Array.from(closureMap.values());
}

function mapCurves(curves) {
  return curves.map((row) => ({
    curve_id: row.curveId,
    version: row.version || 'v1.0.0',
    job_type: row.jobType,
    task_type: row.taskType,
    curve_type: row.curveType || null,
    curve_status: 'Draft',
    weekly_percentages: row.weeklyPercentages,
    description: row.description || null,
    derived_from: row.derivedFrom || null,
    curve_family: row.curveFamily || null,
    curve_parameters: row.curveParameters || null,
    domain_min: row.domainMin || null,
    domain_max: row.domainMax || null,
    normalisation_rule: row.normalisationRule || null,
    allocation_method: row.allocationMethod || null,
    constraints: row.constraints || null,
    spec_validated: row.specValidated ?? null,
    validated_at: row.validatedAt || null,
    fit_quality: row.fitQuality || null,
    spec_source: row.specSource || null,
    created_at: row.createdAt || new Date().toISOString(),
    updated_at: row.updatedAt || new Date().toISOString(),
  }));
}

function mapRegistry(rows) {
  return rows.map((row) => ({
    job_type: row.jobType,
    task_type: row.taskType,
    default_curve_id: row.defaultCurveId,
    reason: row.reason || 'Imported from Whiplash registry export',
    created_at: row.createdAt || new Date().toISOString(),
    updated_at: row.updatedAt || new Date().toISOString(),
  }));
}

function mapStaff(rows) {
  return rows
    .filter((row) => row.active !== 0)
    .map((row) => {
      const mongoId = String(row.id);
      return {
        mongo_id: mongoId,
        slug: slugify(`${row.name}-${mongoId}`),
        name: row.name,
        daily_hours: Number(row.dailyHours ?? 8),
        utilisation: normalizeRatio(row.utilisation, 1),
        employee_type: row.employeeType === 'contractor' ? 'contractor' : 'employee',
        skills: {
          CNC: false,
          Build: false,
          Paint: false,
          AV: false,
          'Pack & Load': false,
        },
        created_at: row.createdAt || new Date().toISOString(),
        updated_at: row.updatedAt || new Date().toISOString(),
      };
    });
}

function mapAvailability(rows, activeStaffIds) {
  return rows
    .filter((row) => activeStaffIds.has(String(row.staffId)))
    .map((row) => ({
      staff_mongo_id: String(row.staffId),
      date: toIsoDate(row.startDate),
      leave_type: row.absenceType,
      start_date: toIsoDate(row.startDate),
      end_date: toIsoDate(row.endDate),
      absence_type: row.absenceType,
      notes: row.reason || '',
      created_at: row.createdAt || new Date().toISOString(),
      updated_at: row.updatedAt || new Date().toISOString(),
    }))
    .filter((row) => row.date && row.start_date && row.end_date);
}

async function replaceTable(tableName, rows, sentinelColumn = 'id') {
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .not(sentinelColumn, 'is', null);

  if (deleteError && !String(deleteError.message || '').includes('0 rows')) {
    throw deleteError;
  }

  if (!rows.length) return;

  const { error: insertError } = await supabase.from(tableName).insert(rows);
  if (insertError) throw insertError;
}

async function main() {
  const [curves, registry, staff, availability] = await Promise.all([
    readJson('curves-data.json'),
    readJson('curve-registry-data.json'),
    readJson('staff-data.json'),
    readJson('staff-availability-data.json'),
  ]);

  const mappedCurves = mapCurves(curves);
  const mappedRegistry = mapRegistry(registry);
  const mappedStaff = mapStaff(staff);
  const activeStaffIds = new Set(mappedStaff.map((row) => row.mongo_id));
  const mappedAvailability = mapAvailability(availability, activeStaffIds);
  const mappedClosures = deriveClosures(availability);

  await replaceTable('cp_curve_registry', [], 'id');
  await replaceTable('cp_curves', [], 'id');
  await replaceTable('cp_staff_leave', [], 'id');
  await replaceTable('cp_company_closures', [], 'id');
  await replaceTable('cp_staff', [], 'id');

  await replaceTable('cp_curves', mappedCurves, 'id');
  await replaceTable('cp_curve_registry', mappedRegistry, 'id');
  await replaceTable('cp_staff', mappedStaff, 'id');
  await replaceTable('cp_staff_leave', mappedAvailability, 'id');
  await replaceTable('cp_company_closures', mappedClosures, 'id');

  console.log(JSON.stringify({
    success: true,
    curves: mappedCurves.length,
    registry: mappedRegistry.length,
    staff: mappedStaff.length,
    availability: mappedAvailability.length,
    companyClosures: mappedClosures.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('Phase 1 seed failed.');
  console.error(error);
  process.exit(1);
});
