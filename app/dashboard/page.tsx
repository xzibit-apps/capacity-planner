"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Slider,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_LEGEND_STYLE,
  CHART_PALETTE,
} from "@/lib/chartTokens";

// Thresholds mirror the pressure-table traffic-light semantics:
// >100% over-capacity (coral), >80% at-risk (amber), otherwise
// on-track (mint). Same breakpoints the old inline-coloured cells
// used — only the presentation changes.
function utilisationPillClass(utilisation: number): string {
  if (utilisation > 100) return 'pill pill--coral';
  if (utilisation > 80) return 'pill pill--amber';
  return 'pill pill--mint';
}

// PROPER LOGIC: Realistic workload distribution
function processProjectForDashboard(project: any) {
  return {
    // Skill hours
    cnc: project.cnc || 0,
    build: project.build || 0,
    paint: project.paint || 0,
    av: project.av || 0,
    packAndLoad: project.packAndLoad || 0,
    tradeOnsite: project.tradeOnsite || 0,
    onsiteWeeks: project.onsiteWeeks || 0,
    
    // Project timing
    truckLoadDate: project.truckLoadDate,
    weeksToBuild: project.weeksToBuild || 1,
    installDeadline: project.installDeadline,
    
    // Project details
    probability: project.probability || 0,
    status: project.status,
    
    // Calculate total build hours
    totalBuildHours: (project.cnc || 0) + (project.build || 0) + (project.paint || 0) + (project.av || 0) + (project.packAndLoad || 0)
  };
}

// Check if project has complete data for capacity planning
function hasCompleteData(project: any) {
  return project.truckLoadDate && 
         project.weeksToBuild !== undefined && 
         project.weeksToBuild > 0 &&
         (project.build > 0 || project.cnc > 0 || project.paint > 0 || project.av > 0 || project.packAndLoad > 0);
}

// Generate weeks with proper labels
function generateTimelineWeeks(startDate: Date, endDate: Date) {
  const weeks = [];
  const current = new Date(startDate);
  let weekNumber = 1;
  
  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Format date as DD/MM/YYYY
    const day = weekStart.getDate().toString().padStart(2, '0');
    const month = (weekStart.getMonth() + 1).toString().padStart(2, '0');
    const year = weekStart.getFullYear();
    const dateLabel = `${day}/${month}/${year}`;
    
    weeks.push({
      weekLabel: dateLabel,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      weekNumber: weekNumber,
      month: month,
      year: year,
      isCurrentWeek: weekStart <= new Date() && weekEnd >= new Date()
    });
    
    current.setDate(current.getDate() + 7);
    weekNumber++;
  }
  
  return weeks;
}

// Calculate realistic demand distribution (same data for all modes)
function calculateWeeklyDemand(projects: any[], weeks: any[], includeOnsite: boolean = false, curveMode: string = 'adrian') {
  const demand = {
    cnc: {} as Record<string, number>,
    build: {} as Record<string, number>,
    paint: {} as Record<string, number>,
    av: {} as Record<string, number>,
    packAndLoad: {} as Record<string, number>,
    total: {} as Record<string, number>
  };

  // Initialize all weeks to 0
  weeks.forEach(week => {
    demand.cnc[week.weekStart] = 0;
    demand.build[week.weekStart] = 0;
    demand.paint[week.weekStart] = 0;
    demand.av[week.weekStart] = 0;
    demand.packAndLoad[week.weekStart] = 0;
    demand.total[week.weekStart] = 0;
  });

  // Process each project with realistic distribution
  projects.forEach(project => {
    const processed = processProjectForDashboard(project);
    // Skip projects with no build hours
    if (processed.totalBuildHours === 0) return;
    
    // Determine project start week
    let projectStartWeek = 0; // Default to first week
    
    if (processed.truckLoadDate) {
      try {
        const truckDate = new Date(processed.truckLoadDate);
        const startDate = new Date(weeks[0].weekStart);
        const diffTime = truckDate.getTime() - startDate.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        projectStartWeek = Math.max(0, diffWeeks);
      } catch (error) {
        console.log('Error parsing truck date:', processed.truckLoadDate);
        projectStartWeek = 0;
      }
    }
    
    // Use EVEN distribution for all modes - same data, different visual representation
    const buildWeeks = Math.max(1, processed.weeksToBuild);
    const weeklyDistribution = new Array(buildWeeks).fill(1 / buildWeeks);
    
    for (let i = 0; i < buildWeeks; i++) {
      const weekIndex = projectStartWeek + i;
      if (weekIndex < weeks.length) {
        const weekKey = weeks[weekIndex].weekStart;
        const hoursThisWeek = processed.totalBuildHours * weeklyDistribution[i];
        
        // Distribute skill hours proportionally
        const skillRatio = hoursThisWeek / processed.totalBuildHours;
        demand.cnc[weekKey] += processed.cnc * skillRatio;
        demand.build[weekKey] += processed.build * skillRatio;
        demand.paint[weekKey] += processed.paint * skillRatio;
        demand.av[weekKey] += processed.av * skillRatio;
        demand.packAndLoad[weekKey] += processed.packAndLoad * skillRatio;
        demand.total[weekKey] += hoursThisWeek;
      }
    }

    // Add onsite hours if enabled
    if (includeOnsite && processed.tradeOnsite > 0) {
      const onsiteWeeks = Math.max(1, processed.onsiteWeeks);
      const onsiteHoursPerWeek = processed.tradeOnsite / onsiteWeeks;
      
      // Onsite work typically starts after workshop build is complete
      const onsiteStartWeek = projectStartWeek + buildWeeks;
      
      for (let i = 0; i < onsiteWeeks; i++) {
        const weekIndex = onsiteStartWeek + i;
        if (weekIndex < weeks.length) {
          const weekKey = weeks[weekIndex].weekStart;
          demand.total[weekKey] += onsiteHoursPerWeek;
        }
      }
    }
  });

  return demand;
}

function calculateWeeklyCapacity(staff: any[], weeks: any[]) {
  const capacity = {
    total: {} as Record<string, number>
  };

  // Initialize all weeks to 0
  weeks.forEach(week => {
    capacity.total[week.weekStart] = 0;
  });

  staff.forEach(person => {
    const weeklyHours = 40;
    const dailyHours = person.dailyHours || 8;

    weeks.forEach(week => {
      let availableHours = weeklyHours;

      if (person.leave && Array.isArray(person.leave)) {
        const weekStart = new Date(week.weekStart);
        const weekEnd = new Date(week.weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Filter leaves that fall within this week
        const leavesThisWeek = person.leave.filter((leave: any) => {
          try {
            const leaveDate = new Date(leave.date);
            return leaveDate >= weekStart && leaveDate <= weekEnd;
          } catch {
            return false;
          }
        });

        // Minus daily hours for each leave day
        if (leavesThisWeek.length > 0) {
          availableHours -= leavesThisWeek.length * dailyHours;
          if (availableHours < 0) availableHours = 0; // precaution
        }
      }

      capacity.total[week.weekStart] += availableHours;
    });
  });

  return capacity;
}

export default function Dashboard() {
  const [probability, setProbability] = useState(60);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, "week"));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(12, "month"));
  
  // Skill visibility state
  const [skillVisibility, setSkillVisibility] = useState({
    CNC: true,
    Build: true,
    Paint: true,
    AV: true,
    "Pack & Load": true,
  });

  // Include site install state
  const [includeOnsite, setIncludeOnsite] = useState(true);

  // Date range filter state
  const [dateRangeFilter, setDateRangeFilter] = useState<'next' | 'previous'>('next');

  // Curve selection state
  const [curveMode, setCurveMode] = useState<'adrian' | 'flat' | 'linear'>('adrian');

  // Calculate date range based on filter
  const calculatedStartDate = useMemo(() => {
    if (dateRangeFilter === 'next') {
      return dayjs().subtract(1, "week");
    } else {
      return dayjs().subtract(12, "month");
    }
  }, [dateRangeFilter]);

  const calculatedEndDate = useMemo(() => {
    if (dateRangeFilter === 'next') {
      return dayjs().add(12, "month");
    } else {
      return dayjs().subtract(1, "week");
    }
  }, [dateRangeFilter]);

  // Update startDate and endDate when filter changes
  useEffect(() => {
    setStartDate(calculatedStartDate);
    setEndDate(calculatedEndDate);
  }, [calculatedStartDate, calculatedEndDate]);

  // Update calculated dates when manual date picker changes
  useEffect(() => {
    // Only update if dates are manually changed (not from filter)
    if (startDate && endDate) {
      // Check if dates match the calculated filter dates
      const isNextFilter = startDate.isSame(dayjs().subtract(1, "week"), 'day') && 
                          endDate.isSame(dayjs().add(12, "month"), 'day');
      const isPreviousFilter = startDate.isSame(dayjs().subtract(12, "month"), 'day') && 
                              endDate.isSame(dayjs().subtract(1, "week"), 'day');
      
      if (isNextFilter && dateRangeFilter !== 'next') {
        setDateRangeFilter('next');
      } else if (isPreviousFilter && dateRangeFilter !== 'previous') {
        setDateRangeFilter('previous');
      }
    }
  }, [startDate, endDate]);

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
  });

  const { data: planningDemandData, isLoading: demandLoading, error: demandError } = useQuery({
    queryKey: ["planning-demand", startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'), probability, includeOnsite],
    queryFn: async () => {
      const response = await fetch("/api/demand/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          probabilityThreshold: probability,
          includeOnsite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to calculate demand");
      }

      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
  });

  const { data: planningCapacityData, isLoading: capacityLoading, error: capacityError } = useQuery({
    queryKey: ["planning-capacity", startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
    queryFn: async () => {
      const response = await fetch(`/api/capacity/weekly?startDate=${startDate.format('YYYY-MM-DD')}&endDate=${endDate.format('YYYY-MM-DD')}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to calculate capacity");
      }
      return response.json();
    },
    retry: 2,
    retryDelay: 1000,
  });

  const projects = projectsData || [];
  const staffCount = planningCapacityData?.meta?.staffCount || 0;
  const apiWarnings: Array<{ projectId: string; jobNumber: string; tags: string[] }> =
    planningDemandData?.warnings || [];

  const completeProjects = useMemo(() => {
    return projects.filter((project: any) => hasCompleteData(project));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return completeProjects.filter((project: any) => {
      if (project.probability !== null && project.probability !== undefined) {
        const projectProbability = project.probability > 1 ? project.probability : project.probability * 100;
        if (projectProbability < probability) return false;
      }
      return true;
    });
  }, [completeProjects, probability]);

  const weeks = useMemo(() => {
    return (planningDemandData?.weeks || planningCapacityData?.weeks || []).map((week: any) => {
      const weekDate = dayjs(week.weekStart);
      const weekEnd = weekDate.add(6, 'day');
      return {
        weekLabel: week.label,
        weekStart: week.isoWeek,
        weekStartDate: week.weekStart,
        weekEnd: weekEnd.format('YYYY-MM-DD'),
        weekNumber: week.isoWeek,
        month: weekDate.format('MM'),
        year: Number(weekDate.format('YYYY')),
        isCurrentWeek: dayjs().isSame(weekDate, 'week'),
      };
    });
  }, [planningDemandData, planningCapacityData]);

  const demand = planningDemandData?.demand || {
    cnc: {},
    build: {},
    paint: {},
    av: {},
    packAndLoad: {},
    onsite: {},
    total: {},
  };

  const capacity = useMemo(() => ({
    total: planningCapacityData?.capacity || {},
  }), [planningCapacityData]);

  const chartData = useMemo(() => {
    return weeks.map((week: any) => ({
      weekLabel: week.weekLabel,
      weekISO: week.weekStart,
      totalDemand: Number((demand.total[week.weekStart] || 0).toFixed(1)),
      totalCapacity: Number((capacity.total[week.weekStart] || 0).toFixed(1)),
      cncDemand: Number((demand.cnc[week.weekStart] || 0).toFixed(1)),
      buildDemand: Number((demand.build[week.weekStart] || 0).toFixed(1)),
      paintDemand: Number((demand.paint[week.weekStart] || 0).toFixed(1)),
      avDemand: Number((demand.av[week.weekStart] || 0).toFixed(1)),
      packLoadDemand: Number((demand.packAndLoad[week.weekStart] || 0).toFixed(1)),
      utilization: capacity.total[week.weekStart] > 0
        ? Number(((demand.total[week.weekStart] / capacity.total[week.weekStart]) * 100).toFixed(1))
        : 0,
    }));
  }, [weeks, demand, capacity]);

  const warningCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    apiWarnings.forEach(({ tags }) => {
      tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [apiWarnings]);

  const WARNING_DISPLAY: Array<{ tag: string; label: string; pillClass: string }> = [
    { tag: 'zero_weeks_to_build', label: 'Zero build weeks', pillClass: 'pill pill--coral' },
    { tag: 'missing_truck_date', label: 'Missing truck date', pillClass: 'pill pill--amber' },
    { tag: 'flat_fallback', label: 'Flat-curve fallback', pillClass: 'pill pill--lilac' },
    { tag: 'job_type_missing', label: 'No job type', pillClass: 'pill pill--coral' },
    { tag: 'job_type_no_curves', label: 'Job type has no curves', pillClass: 'pill pill--amber' },
    { tag: 'ambiguous_probability', label: 'Ambiguous probability', pillClass: 'pill pill--sun' },
  ];

  const pressureWeeks = useMemo(() => {
    return chartData
      .map((week: any) => ({
        ...week,
        gap: week.totalDemand - week.totalCapacity
      }))
      .sort((a: any, b: any) => b.gap - a.gap)
      .slice(0, 10);
  }, [chartData]);

  if (projectsLoading || demandLoading || capacityLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (projectsError || demandError || capacityError) {
    const errorMessage = projectsError
      ? (projectsError as Error).message || "Failed to load projects"
      : demandError
        ? (demandError as Error).message || "Failed to calculate demand"
        : (capacityError as Error).message || "Failed to calculate capacity";

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
        <Button
          variant="contained"
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh Page
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      {/* Stat row */}
      <div className="stat-row">
        <div className="stat mint">
          <span className="stripe" />
          <div className="label">Total projects</div>
          <div className="value">{filteredProjects.length}</div>
        </div>
        <div className="stat sky">
          <span className="stripe" />
          <div className="label">Total staff</div>
          <div className="value">{staffCount}</div>
        </div>
        <div className="stat lilac">
          <span className="stripe" />
          <div className="label">Weeks in range</div>
          <div className="value">{weeks.length}</div>
        </div>
        <div className="stat amber">
          <span className="stripe" />
          <div className="label">Current week</div>
          <div className="value">
            {weeks.find((w: any) => w.isCurrentWeek)?.weekLabel || '—'}
          </div>
        </div>
      </div>

      {/* Filter card */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
            <Box sx={{ minWidth: 220, flex: "1 1 220px" }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Probability ≥ {probability}%
              </Typography>
              <Slider
                value={probability}
                onChange={(_, value) => setProbability(value as number)}
                min={0}
                max={100}
                step={10}
                marks
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Skill lines
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, rowGap: 0 }}>
                {Object.entries(skillVisibility).map(([skill, visible]) => (
                  <FormControlLabel
                    key={skill}
                    control={
                      <Checkbox
                        checked={visible}
                        onChange={(e) =>
                          setSkillVisibility(prev => ({ ...prev, [skill]: e.target.checked }))
                        }
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {skill === "Pack & Load" ? "P&L" : skill}
                      </Typography>
                    }
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Site install
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeOnsite}
                    onChange={(e) => setIncludeOnsite(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include onsite</Typography>}
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Quick range
              </Typography>
              <ToggleButtonGroup
                value={dateRangeFilter}
                exclusive
                onChange={(_, value) => value && setDateRangeFilter(value)}
                size="small"
              >
                <ToggleButton value="next">Next 12M</ToggleButton>
                <ToggleButton value="previous">Previous 12M</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Custom range
              </Typography>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <DatePicker
                    value={startDate}
                    onChange={(v) => v && setStartDate(v)}
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { size: "small", placeholder: "Start" } }}
                  />
                  <DatePicker
                    value={endDate}
                    onChange={(v) => v && setEndDate(v)}
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { size: "small", placeholder: "End" } }}
                  />
                </Box>
              </LocalizationProvider>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent>
          <div className="card-head">
            <div>
              <div className="card-title">Capacity vs demand</div>
              <div className="card-sub">
                {dateRangeFilter === 'next' ? 'Next 12 months' : 'Previous 12 months'}
              </div>
            </div>
          </div>

          <Box sx={{ height: 500, width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis
                  dataKey="weekLabel"
                  stroke={CHART_AXIS_TEXT}
                  tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                  tickFormatter={(value, index) => {
                    const week = weeks[index];
                    return week?.isCurrentWeek ? `🔥 ${value}` : value;
                  }}
                />
                <YAxis
                  stroke={CHART_AXIS_TEXT}
                  tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  cursor={{ stroke: CHART_GRID }}
                />
                <Legend wrapperStyle={CHART_LEGEND_STYLE} />

                {/* Total lines */}
                <Line
                  type={curveMode === 'adrian' ? "monotone" : "linear"}
                  dataKey="totalDemand"
                  name="Total demand (h)"
                  strokeWidth={3}
                  stroke={CHART_PALETTE.demand}
                  dot={false}
                  activeDot={{ r: 6, stroke: CHART_PALETTE.demand, strokeWidth: 2 }}
                />
                <Line
                  type={curveMode === 'adrian' ? "monotone" : "linear"}
                  dataKey="totalCapacity"
                  name="Total capacity (h)"
                  strokeWidth={3}
                  stroke={CHART_PALETTE.capacity}
                  dot={false}
                  activeDot={{ r: 6, stroke: CHART_PALETTE.capacity, strokeWidth: 2 }}
                />

                {/* Skill demand lines */}
                {skillVisibility.CNC && (
                  <Line
                    type={curveMode === 'adrian' ? "monotone" : "linear"}
                    dataKey="cncDemand"
                    name="CNC demand"
                    strokeWidth={2}
                    stroke={CHART_PALETTE.cnc}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHART_PALETTE.cnc, strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Build && (
                  <Line
                    type={curveMode === 'adrian' ? "monotone" : "linear"}
                    dataKey="buildDemand"
                    name="Build demand"
                    strokeWidth={2}
                    stroke={CHART_PALETTE.build}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHART_PALETTE.build, strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Paint && (
                  <Line
                    type={curveMode === 'linear' ? "linear" : "monotone"}
                    dataKey="paintDemand"
                    name="Paint demand"
                    strokeWidth={2}
                    stroke={CHART_PALETTE.paint}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHART_PALETTE.paint, strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.AV && (
                  <Line
                    type={curveMode === 'adrian' ? "monotone" : "linear"}
                    dataKey="avDemand"
                    name="AV demand"
                    strokeWidth={2}
                    stroke={CHART_PALETTE.av}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHART_PALETTE.av, strokeWidth: 1 }}
                  />
                )}
                {skillVisibility["Pack & Load"] && (
                  <Line
                    type={curveMode === 'adrian' ? "monotone" : "linear"}
                    dataKey="packLoadDemand"
                    name="P&L demand"
                    strokeWidth={2}
                    stroke={CHART_PALETTE.packLoad}
                    dot={false}
                    activeDot={{ r: 4, stroke: CHART_PALETTE.packLoad, strokeWidth: 1 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Data quality warnings */}
      {Object.keys(warningCounts).length > 0 && (
        <div className="card" style={{ padding: 'var(--xz-s-4)' }}>
          <div className="card-head" style={{ marginBottom: 'var(--xz-s-3)' }}>
            <div className="h3">Data quality warnings</div>
            <div className="card-sub">Projects excluded from or degraded in the demand chart</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--xz-s-2)' }}>
            {WARNING_DISPLAY.filter(({ tag }) => warningCounts[tag] > 0).map(({ tag, label, pillClass }) => (
              <span
                key={tag}
                className={pillClass}
                title={`${warningCounts[tag]} project${warningCounts[tag] === 1 ? '' : 's'} with ${tag}`}
                style={{ cursor: 'default' }}
              >
                {label} ({warningCounts[tag]})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Debug info */}
      <Card>
        <CardContent>
          <div className="card-head">
            <div>
              <div className="h3">Debug info</div>
              <div className="card-sub">
                {dateRangeFilter === 'next' ? 'Next' : 'Previous'} 12 months logic
              </div>
            </div>
          </div>
          <Box sx={{ display: "grid", gap: 1 }}>
            <div className="meta">
              <strong>Total Projects:</strong> {projects.length} | <strong>Filtered Projects (Complete Data Only):</strong> {filteredProjects.length}
            </div>
            <div className="meta">
              <strong>Total Staff:</strong> {staffCount}
            </div>
            <div className="meta">
              <strong>Weeks Generated:</strong> {weeks.length}
            </div>
            <div className="meta">
              <strong>First Week Demand:</strong> {weeks.length > 0 ? (demand.total[weeks[0].weekStart] || 0) : 0} hours
            </div>
            <div className="meta">
              <strong>First Week Capacity:</strong> {weeks.length > 0 ? (capacity.total[weeks[0].weekStart] || 0) : 0} hours
            </div>
            <div className="meta">
              <strong>Current Week:</strong> {weeks.find((w: any) => w.isCurrentWeek)?.weekLabel || 'Not in range'}
            </div>
            <div className="meta">
              <strong>Timeline:</strong> {startDate.format('DD/MM/YYYY')} to {endDate.format('DD/MM/YYYY')}
            </div>
            <div className="meta">
              <strong>Demand Engine:</strong> Whiplash curve-based distribution
            </div>
            <div className="meta">
              <strong>Projects Excluded (Incomplete Data):</strong> {projects.length - completeProjects.length}
            </div>
            <div className="meta" style={{ fontStyle: 'italic' }}>
              Note: Only projects with complete data (truck load date, weeks to build, and skill hours) are included in the planning engine
            </div>
            <div className="meta" style={{ fontStyle: 'italic' }}>
              Note: Capacity line now applies utilisation, date-range leave, contractor bookings, and company closures where data exists
            </div>
          </Box>
        </CardContent>
      </Card>

      {/* Pressure weeks panel */}
      <div className="panel">
        <div className="group-head" style={{ cursor: 'default' }}>
          <span className="title-text">Pressure weeks</span>
          <span className="card-sub">Top 10 weeks by demand/capacity delta</span>
        </div>
        <Table
          sx={{
            '& .MuiTableHead-root .MuiTableCell-root': {
              backgroundColor: 'var(--xz-surface-soft)',
              color: 'var(--xz-ink-500)',
              fontWeight: 600,
              fontSize: 12,
              borderBottom: '1px solid var(--xz-hairline)',
            },
            '& .MuiTableCell-root': {
              borderBottom: '1px solid var(--xz-hairline-soft)',
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Week</TableCell>
              <TableCell>Demand (h)</TableCell>
              <TableCell>Capacity (h)</TableCell>
              <TableCell>Utilisation</TableCell>
              <TableCell>Gap (h)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pressureWeeks.map((week: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell sx={{ fontWeight: 500 }}>{week.weekLabel}</TableCell>
                <TableCell>{week.totalDemand.toFixed(1)}</TableCell>
                <TableCell>{week.totalCapacity.toFixed(1)}</TableCell>
                <TableCell>
                  <span className={utilisationPillClass(week.utilization)}>
                    {week.utilization}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`pill ${week.gap > 0 ? 'pill--coral' : 'pill--mint'}`}>
                    {week.gap.toFixed(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Box>
  );
}
