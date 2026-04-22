import { describe, expect, it } from 'vitest';
import { calculateWeeklyCapacity } from '@/lib/capacityEngine';
import {
  getWeekRange,
  normaliseProbability,
  parseTruckLoadDate,
  PlanningCurve,
  PlanningProject,
  PlanningStaffMember,
} from '@/lib/capacityPlanning';
import {
  aggregateDemandForProjects,
  calculateProjectDemand,
  buildCurveCache,
  selectCurve,
} from '@/lib/rulesEngine';

describe('Phase 1 demand engine', () => {
  it('allocates project hours through the selected curve and respects the probability threshold', () => {
    const planningWeeks = getWeekRange(new Date('2026-01-05'), new Date('2026-02-02'));

    const flatCurve: PlanningCurve = {
      curveId: 'custom-build-flat-v1',
      version: 'v1.0.0',
      jobType: 'Custom Build',
      taskType: 'Build',
      weeklyPercentages: JSON.stringify({
        progressValues: Array.from({ length: 100 }, (_, index) => (index + 1) / 100),
        curveValues: Array.from({ length: 100 }, () => 1),
        normalizationValue: 100,
      }),
    };

    const includedProject: PlanningProject = {
      id: 'project-1',
      jobNumber: 'J001',
      jobName: 'Included project',
      jobType: 'Custom Build',
      probability: 80,
      workshopStartDate: new Date('2026-01-05'),
      weeksInWorkshop: 4,
      truckLoadDate: new Date('2026-01-26'),
      onsiteWeeks: 1,
      cnc: 0,
      build: 100,
      paint: 0,
      av: 0,
      packAndLoad: 0,
      tradeOnsite: 0,
    };

    const excludedProject: PlanningProject = {
      ...includedProject,
      id: 'project-2',
      jobNumber: 'J002',
      probability: 40,
      build: 200,
    };

    const result = aggregateDemandForProjects(
      [includedProject, excludedProject],
      [flatCurve],
      [{ jobType: 'Custom Build', taskType: 'Build', defaultCurveId: 'custom-build-flat-v1' }],
      planningWeeks,
      60
    );

    expect(result.projectResults.filter((r) => r.taskDemands.length > 0)).toHaveLength(1);
    expect(Object.values(result.totals.build).reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 5);

    const activeWeeks = planningWeeks.filter((week) => result.totals.build[week] > 0);
    expect(activeWeeks).toHaveLength(4);
    activeWeeks.forEach((week) => {
      expect(result.totals.build[week]).toBeCloseTo(25, 5);
    });
  });
});

describe('Phase 1 capacity engine', () => {
  it('applies utilisation, contractor bookings, leave ranges, and company closures', () => {
    const staff: PlanningStaffMember[] = [
      {
        id: 'employee-1',
        name: 'Internal staff',
        dailyHours: 8,
        utilisation: 0.75,
        employeeType: 'employee',
        skills: { Build: true },
        availability: [
          {
            startDate: '2026-01-05',
            endDate: '2026-01-05',
            absenceType: 'Annual Leave',
          },
        ],
      },
      {
        id: 'contractor-1',
        name: 'Booked contractor',
        dailyHours: 10,
        utilisation: 1,
        employeeType: 'contractor',
        skills: { Build: true },
        availability: [
          {
            startDate: '2026-01-06',
            endDate: '2026-01-09',
            absenceType: 'Available',
          },
        ],
      },
    ];

    const closures = [
      {
        name: 'Public Holiday',
        startDate: '2026-01-07',
        endDate: '2026-01-07',
        closureType: 'Public Holiday',
      },
    ];

    const capacity = calculateWeeklyCapacity(
      staff,
      closures,
      new Date('2026-01-05'),
      new Date('2026-01-11')
    );

    expect(capacity).toHaveLength(1);
    expect(capacity[0].internalCapacity).toBeCloseTo(18, 5);
    expect(capacity[0].contractorCapacity).toBeCloseTo(30, 5);
    expect(capacity[0].totalCapacity).toBeCloseTo(48, 5);
  });
});

// ─── Phase 1b new cases ───────────────────────────────────────────────────────

describe('normaliseProbability', () => {
  it('returns 0 for null', () => {
    expect(normaliseProbability(null).value).toBe(0);
    expect(normaliseProbability(null).wasCoerced).toBe(false);
  });

  it('returns 0 for string "0"', () => {
    const r = normaliseProbability('0');
    expect(r.value).toBe(0);
    expect(r.wasCoerced).toBe(false);
  });

  it('coerces "0.5" → 50', () => {
    const r = normaliseProbability('0.5');
    expect(r.value).toBe(50);
    expect(r.wasCoerced).toBe(true);
    expect(r.wasAmbiguous).toBe(false);
  });

  it('flags "1" as ambiguous (not coerced)', () => {
    const r = normaliseProbability('1');
    expect(r.value).toBe(1);
    expect(r.wasCoerced).toBe(false);
    expect(r.wasAmbiguous).toBe(true);
  });

  it('flags 1 (number) as ambiguous', () => {
    const r = normaliseProbability(1);
    expect(r.wasAmbiguous).toBe(true);
  });

  it('coerces "1.0" — same as 1, ambiguous', () => {
    const r = normaliseProbability('1.0');
    expect(r.wasAmbiguous).toBe(true);
  });

  it('treats "50" as already 0-100 scale', () => {
    const r = normaliseProbability('50');
    expect(r.value).toBe(50);
    expect(r.wasCoerced).toBe(false);
  });

  it('treats "100" as 100%', () => {
    const r = normaliseProbability('100');
    expect(r.value).toBe(100);
    expect(r.wasCoerced).toBe(false);
  });

  it('treats "100.0" as 100%', () => {
    const r = normaliseProbability('100.0');
    expect(r.value).toBe(100);
    expect(r.wasCoerced).toBe(false);
  });
});

describe('parseTruckLoadDate', () => {
  it('prefers the parsed DB column when present', () => {
    const { date, confidence } = parseTruckLoadDate('2026-06-15', null);
    expect(date?.toISOString().startsWith('2026-06-15')).toBe(true);
    expect(confidence).toBeNull();
  });

  it('parses ISO text as iso confidence', () => {
    const { date, confidence } = parseTruckLoadDate(null, '2026-06-15');
    expect(date?.getUTCFullYear()).toBe(2026);
    expect(confidence).toBe('iso');
  });

  it('parses "DD Mon YYYY" as day_mon_year', () => {
    const { date, confidence } = parseTruckLoadDate(null, '3 Apr 2026');
    expect(date?.getUTCDate()).toBe(3);
    expect(date?.getUTCMonth()).toBe(3);
    expect(confidence).toBe('day_mon_year');
  });

  it('parses "Mon YYYY" as mon_year_assumed_mid (day=15)', () => {
    const { date, confidence } = parseTruckLoadDate(null, 'Apr 2026');
    expect(date?.getUTCDate()).toBe(15);
    expect(confidence).toBe('mon_year_assumed_mid');
  });

  it('returns null and unparseable for garbage text', () => {
    const { date, confidence } = parseTruckLoadDate(null, 'not a date');
    expect(date).toBeNull();
    expect(confidence).toBe('unparseable');
  });

  it('returns null confidence for null inputs', () => {
    const { date, confidence } = parseTruckLoadDate(null, null);
    expect(date).toBeNull();
    expect(confidence).toBeNull();
  });
});

describe('calculateProjectDemand — warnings', () => {
  const flatCurve: PlanningCurve = {
    curveId: 'custom-build-flat-v1',
    version: 'v1.0.0',
    jobType: 'Custom Build',
    taskType: 'Build',
    weeklyPercentages: JSON.stringify({
      progressValues: Array.from({ length: 100 }, (_, i) => (i + 1) / 100),
      curveValues: Array.from({ length: 100 }, () => 1),
      normalizationValue: 100,
    }),
  };
  const registry = [{ jobType: 'Custom Build', taskType: 'Build', defaultCurveId: 'custom-build-flat-v1' }];
  const cache = buildCurveCache([flatCurve], registry);
  const weeks = getWeekRange(new Date('2026-01-05'), new Date('2026-04-27'));

  it('emits zero_weeks_to_build and missing_truck_date when weeksInWorkshop=0', () => {
    const project: PlanningProject = {
      id: 'p1',
      jobNumber: 'J001',
      jobName: 'Zero weeks',
      jobType: 'Custom Build',
      probability: 100,
      workshopStartDate: null,
      weeksInWorkshop: 0,
      truckLoadDate: null,
      onsiteWeeks: 1,
      cnc: 0, build: 100, paint: 0, av: 0, packAndLoad: 0, tradeOnsite: 0,
    };
    const result = calculateProjectDemand(project, cache, weeks);
    expect(result.taskDemands).toHaveLength(0);
    expect(result.warnings).toContain('zero_weeks_to_build');
    expect(result.warnings).toContain('missing_truck_date');
  });

  it('emits ambiguous_probability when probabilityWasAmbiguous is true', () => {
    const project: PlanningProject = {
      id: 'p-ambiguous',
      jobNumber: 'J-AMB',
      jobName: 'Ambiguous prob',
      jobType: 'Custom Build',
      probability: 1,
      probabilityWasAmbiguous: true,
      workshopStartDate: new Date('2026-01-05'),
      weeksInWorkshop: 4,
      truckLoadDate: new Date('2026-01-26'),
      onsiteWeeks: 1,
      cnc: 0, build: 100, paint: 0, av: 0, packAndLoad: 0, tradeOnsite: 0,
    };
    const result = calculateProjectDemand(project, cache, weeks);
    expect(result.warnings).toContain('ambiguous_probability');
  });

  it('emits job_type_missing when jobType is null', () => {
    const project: PlanningProject = {
      id: 'p2',
      jobNumber: 'J002',
      jobName: 'No job type',
      jobType: null,
      probability: 100,
      workshopStartDate: new Date('2026-01-05'),
      weeksInWorkshop: 4,
      truckLoadDate: new Date('2026-01-26'),
      onsiteWeeks: 1,
      cnc: 0, build: 100, paint: 0, av: 0, packAndLoad: 0, tradeOnsite: 0,
    };
    const result = calculateProjectDemand(project, cache, weeks);
    expect(result.warnings).toContain('job_type_missing');
    expect(result.taskDemands).toHaveLength(0);
  });
});

describe('selectCurve — flat-fallback-no-curve', () => {
  it('returns reason flat-fallback-no-curve for an unregistered job type', () => {
    const cache = buildCurveCache([], []);
    const selection = selectCurve('Unknown Job Type', 'Build', cache);
    expect(selection.reason).toBe('flat-fallback-no-curve');
    expect(selection.isDefault).toBe(false);
  });

  it('returns no reason for a registered curve', () => {
    const flatCurve: PlanningCurve = {
      curveId: 'c1',
      version: 'v1.0.0',
      jobType: 'Custom Build',
      taskType: 'Build',
      weeklyPercentages: JSON.stringify({ progressValues: [1], curveValues: [1], normalizationValue: 1 }),
    };
    const cache = buildCurveCache([flatCurve], [{ jobType: 'Custom Build', taskType: 'Build', defaultCurveId: 'c1' }]);
    const selection = selectCurve('Custom Build', 'Build', cache);
    expect(selection.reason).toBeUndefined();
    expect(selection.isDefault).toBe(true);
  });
});

describe('calculateWeeklyCapacity — merged closures', () => {
  it('correctly subtracts the union of ranged + per-date closures', () => {
    const staff: PlanningStaffMember[] = [
      {
        id: 'emp-1',
        name: 'Worker',
        dailyHours: 8,
        utilisation: 1,
        employeeType: 'employee',
        skills: {},
        availability: [],
      },
    ];

    // 1 ranged closure (Mon–Wed, 2026-01-05 to 2026-01-07) and per-date closures Thu+Fri of same week
    const closures = [
      { name: 'Workshop shutdown', startDate: '2026-01-05', endDate: '2026-01-07', closureType: 'Shutdown' },
      { name: 'Public Holiday Thu', startDate: '2026-01-08', endDate: '2026-01-08', closureType: 'Public Holiday' },
      { name: 'Public Holiday Fri', startDate: '2026-01-09', endDate: '2026-01-09', closureType: 'Public Holiday' },
    ];

    const capacity = calculateWeeklyCapacity(
      staff,
      closures,
      new Date('2026-01-05'),
      new Date('2026-01-11')
    );

    expect(capacity).toHaveLength(1);
    // All 5 weekdays are closed, so employee contributes 0 hours
    expect(capacity[0].internalCapacity).toBe(0);
    expect(capacity[0].totalCapacity).toBe(0);
  });
});
