"use client";

import { useState, useMemo } from "react";
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
  ReferenceLine,
} from "recharts";
import {
  Box,
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
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

// Utility functions from the old React app
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(iso: string): Date {
  if (!iso || typeof iso !== 'string') {
    return new Date();
  }
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfWeekMonday(d: Date): Date {
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = dd.getDay();
  const diff = (dow === 0 ? -6 : 1) - dow;
  dd.setDate(dd.getDate() + diff);
  dd.setHours(0, 0, 0, 0);
  return dd;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function countWeekdaysInRangeInclusive(a: Date, b: Date) {
  let c = 0;
  const s = new Date(Math.min(+a, +b));
  const e = new Date(Math.max(+a, +b));
  for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
    const wd = dt.getDay();
    if (wd >= 1 && wd <= 5) c++;
  }
  return c;
}

function isPastInstall(p: any, todayISO: string) {
  if (!p.truckDate || !todayISO) return false;
  try {
    const truck = parseISODate(p.truckDate);
    const last = p.onsite?.weeks ? addDays(truck, 7 * p.onsite.weeks) : truck;
    return last < parseISODate(todayISO);
  } catch (error) {
    console.warn('Error parsing dates in isPastInstall:', error);
    return false;
  }
}

function computeTimelineWeeks(
  projects: any[],
  startDate: Date,
  endDate: Date,
  padAfterWeeks = 2,
  minWeeks = 16
) {
  // Use the selected date range instead of calculating from project data
  const start = startOfWeekMonday(startDate);
  const end = startOfWeekMonday(endDate);
  
  const weeks: string[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 7)) {
    weeks.push(toISO(d));
  }
  
  // Ensure minimum weeks if the range is too short
  if (weeks.length < minWeeks) {
    const need = minWeeks - weeks.length;
    const last = parseISODate(weeks[weeks.length - 1]);
    for (let i = 1; i <= need; i++) {
      weeks.push(toISO(addDays(last, i * 7)));
    }
  }
  
  return weeks;
}

function computeWeeklyDemand(
  projects: any[],
  weekKeys: string[],
  includeOnsite: boolean
) {
  const perSkill: Record<string, Record<string, number>> = {
    CNC: {},
    Build: {},
    Paint: {},
    AV: {},
    "Pack & Load": {},
  };
  const total: Record<string, number> = {};
  for (const wk of weekKeys) {
    total[wk] = 0;
    for (const s of Object.keys(perSkill)) perSkill[s][wk] = 0;
  }
  for (const p of projects) {
    if (!p.truckDate || !p.truckDate.trim()) continue;
    const N = p.weeksBefore || 0;
    try {
      const truckWeek = startOfWeekMonday(parseISODate(p.truckDate));
      const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

    for (const sk of skills) {
      const hours = p.hoursBySkill?.[sk] || 0;
      if (N > 0 && hours > 0) {
        // Apply different curve profiles based on curveMode
        const curveMode = p.curveMode || 'Mathematician';
        let weeklyDistribution: number[] = [];
        
        switch (curveMode) {
          case 'Linear':
            // Even distribution across weeks
            weeklyDistribution = Array(N).fill(hours / N);
            break;
            
          case 'Triangular':
            // Peak in the middle, tapering at ends
            weeklyDistribution = [];
            for (let i = 0; i < N; i++) {
              const progress = i / (N - 1);
              const triangular = 2 * (1 - Math.abs(2 * progress - 1));
              weeklyDistribution.push((hours * triangular) / N);
            }
            break;
            
          case 'Mathematician':
          default:
            // Bell curve distribution (normal distribution approximation)
            weeklyDistribution = [];
            for (let i = 0; i < N; i++) {
              const progress = i / (N - 1);
              const bell = Math.exp(-Math.pow((progress - 0.5) / 0.2, 2));
              weeklyDistribution.push((hours * bell) / N);
            }
            break;
        }
        
        // Apply the distribution
        for (let k = 0; k < N; k++) {
          const week = toISO(addDays(truckWeek, -7 * (k + 1)));
          if (!(week in total)) continue;
          const weekHours = weeklyDistribution[k] || 0;
          perSkill[sk][week] += weekHours;
          total[week] += weekHours;
        }
      }
    }
    if (
      includeOnsite &&
      p.onsite &&
      (p.onsite.hours || 0) > 0 &&
      (p.onsite.weeks || 0) > 0
    ) {
      const perWeek = p.onsite.hours / p.onsite.weeks;
      for (let k = 1; k <= p.onsite.weeks; k++) {
        const week = toISO(addDays(truckWeek, 7 * k));
        if (!(week in total)) continue;
        total[week] += perWeek;
      }
    }
    } catch (error) {
      console.warn('Error processing project in computeWeeklyDemand:', error, p);
      continue;
    }
  }
  return { perSkill, total };
}

function computeWeeklyCapacity(staff: any[], weekKeys: string[]) {
  const perSkill: Record<string, Record<string, number>> = {
    CNC: {},
    Build: {},
    Paint: {},
    AV: {},
    "Pack & Load": {},
  };
  const unique: Record<string, number> = {};
  for (const wk of weekKeys) {
    unique[wk] = 0;
    for (const s of Object.keys(perSkill)) perSkill[s][wk] = 0;
  }
  for (const person of staff) {
    for (const wk of weekKeys) {
      const weekStart = parseISODate(wk);
      const weekEnd = addDays(weekStart, 6);
      let leaveDays = 0;
      
      // Handle new leave structure (individual dates)
      for (const leaveItem of person.leave || []) {
        const leaveDate = parseISODate(leaveItem.date);
        // Check if this leave date falls within the current week
        if (leaveDate >= weekStart && leaveDate <= weekEnd) {
          // Count weekdays for this specific date
          const dayOfWeek = leaveDate.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            leaveDays += 1;
          }
        }
      }
      
      leaveDays = Math.max(0, Math.min(leaveDays, 5));
      const workingDays = 5 - leaveDays;
      const weeklyHours =
        (person.dailyHours || 8) * (person.utilisation || 0.85) * workingDays;
      unique[wk] += weeklyHours;
      const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];
      for (const sk of skills) {
        if (person.skills?.[sk]) perSkill[sk][wk] += weeklyHours;
      }
    }
  }
  return { perSkill, unique };
}

export default function Dashboard() {
  const [probability, setProbability] = useState(0);
  const [includeOnsite, setIncludeOnsite] = useState(true);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(12, "month"));
  
  // Skill visibility state
  const [skillVisibility, setSkillVisibility] = useState({
    CNC: true,
    Build: true,
    Paint: true,
    AV: true,
    "Pack & Load": true,
  });

  // View dialogs state
  const [viewProjectsOpen, setViewProjectsOpen] = useState(false);
  const [viewEmployeesOpen, setViewEmployeesOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const {
    data: projectsData,
    isLoading: projectsLoading,
    error: projectsError,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const {
    data: staffData,
    isLoading: staffLoading,
    error: staffError,
  } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const todayISO = toISO(new Date());
  const projects = projectsData || [];
  const staff = staffData || [];

  const visible = useMemo(() => {
    const start = startDate.startOf("day").toDate();
    const end = endDate.endOf("day").toDate();
    return projects.filter((p: any) => {
      if (!p.truckDate) return false;
      const d = parseISODate(p.truckDate);
      return d >= start && d <= end;
    });
  }, [projects, startDate, endDate]);

  // Preset active state
  const isNextActive = useMemo(
    () =>
      startDate.isSame(dayjs().subtract(1, "week").startOf("day"), "day") &&
      endDate.isSame(dayjs().add(12, "month").endOf("day"), "day"),
    [startDate, endDate]
  );
  const isPrevActive = useMemo(
    () =>
      startDate.isSame(dayjs().subtract(12, "month").startOf("day"), "day") &&
      endDate.isSame(dayjs().startOf("day"), "day"),
    [startDate, endDate]
  );

  const filtered = useMemo(
    () =>
      visible.filter((p: any) =>
        p.probability == null ? true : p.probability >= probability / 100
      ),
    [visible, probability]
  );

  const weeks = useMemo(
    () => computeTimelineWeeks(filtered, startDate.toDate(), endDate.toDate(), 2, 20),
    [filtered, startDate, endDate]
  );
  const capacity = useMemo(
    () => computeWeeklyCapacity(staff, weeks),
    [staff, weeks]
  );
  const demand = useMemo(
    () => computeWeeklyDemand(filtered, weeks, includeOnsite),
    [filtered, weeks, includeOnsite]
  );

  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const chartData = useMemo(
    () =>
      weeks.map((wk) => ({
        weekLabel: fmt.format(parseISODate(wk)),
        weekISO: wk,
        demand: Number((demand.total[wk] || 0).toFixed(1)),
        capacity: Number((capacity.unique[wk] || 0).toFixed(1)),
        util:
          (capacity.unique[wk] || 0) > 0
            ? Number(
                ((demand.total[wk] / capacity.unique[wk]) * 100).toFixed(1)
              )
            : 0,
        // Skill-specific demand data
        cncDemand: Number((demand.perSkill.CNC[wk] || 0).toFixed(1)),
        buildDemand: Number((demand.perSkill.Build[wk] || 0).toFixed(1)),
        paintDemand: Number((demand.perSkill.Paint[wk] || 0).toFixed(1)),
        avDemand: Number((demand.perSkill.AV[wk] || 0).toFixed(1)),
        packLoadDemand: Number((demand.perSkill["Pack & Load"][wk] || 0).toFixed(1)),

      })),
    [weeks, demand, capacity, fmt]
  );

  // Find current week index for vertical line
  const currentWeekIndex = useMemo(() => {
    const today = new Date();
    const todayWeekStart = startOfWeekMonday(today);
    const todayWeekISO = toISO(todayWeekStart);
    return chartData.findIndex(data => data.weekISO === todayWeekISO);
  }, [chartData]);

  const pressure = useMemo(
    () =>
      chartData
        .map((r) => ({
          ...r,
          over: r.capacity > 0 ? r.demand - r.capacity : r.demand,
        }))
        .sort((a, b) => b.over - a.over)
        .slice(0, 10),
    [chartData]
  );

  if (projectsLoading || staffLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (projectsError || staffError) {
    return (
      <Alert severity="error">
        Failed to load data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, display: "grid", gap: 3 }}>
      <Card
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 600, mb: 3, color: "white" }}
          >
            Capacity Planning Dashboard
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 2,
              mt: 2,
              p: 2,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Probability Slider */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                minHeight: 60,
                justifyContent: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{ 
                  opacity: 0.9, 
                  fontWeight: 500, 
                  fontSize: "0.875rem",
                  mb: 0.5,
                  textAlign: "center"
                }}
              >
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
                sx={{
                  "& .MuiSlider-track": {
                    backgroundColor: "rgba(255,255,255,0.9)",
                    height: 4,
                  },
                  "& .MuiSlider-thumb": {
                    backgroundColor: "white",
                    width: 18,
                    height: 18,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  },
                  "& .MuiSlider-mark": {
                    backgroundColor: "rgba(255,255,255,0.6)",
                    width: 2,
                    height: 2,
                  },
                  "& .MuiSlider-valueLabel": {
                    backgroundColor: "rgba(0,0,0,0.9)",
                    color: "white",
                    fontSize: "0.75rem",
                  },
                }}
              />
            </Box>

            {/* Include Site Install Checkbox */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 60,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeOnsite}
                    onChange={(e) => setIncludeOnsite(e.target.checked)}
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      "&.Mui-checked": {
                        color: "white",
                      },
                      "& .MuiSvgIcon-root": {
                        fontSize: 20,
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ color: "white", fontWeight: 500, fontSize: "0.875rem" }}
                  >
                    Include site install
                  </Typography>
                }
                sx={{ margin: 0 }}
              />
            </Box>

            {/* Skill Visibility Checkboxes */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 60,
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                pl: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  textAlign: "center",
                  mb: 0.5,
                }}
              >
                Skill Lines
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center" }}>
                {Object.entries(skillVisibility).map(([skill, visible]) => (
                  <FormControlLabel
                    key={skill}
                    control={
                      <Checkbox
                        checked={visible}
                        onChange={(e) => setSkillVisibility(prev => ({
                          ...prev,
                          [skill]: e.target.checked
                        }))}
                        size="small"
                        sx={{
                          color: "rgba(255,255,255,0.8)",
                          "&.Mui-checked": {
                            color: "white",
                          },
                          "& .MuiSvgIcon-root": {
                            fontSize: 16,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="caption"
                        sx={{ 
                          color: "white", 
                          fontWeight: 500, 
                          fontSize: "0.7rem",
                          lineHeight: 1
                        }}
                      >
                        {skill === "Pack & Load" ? "P&L" : skill}
                      </Typography>
                    }
                    sx={{ margin: 0, minWidth: "auto" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Date Preset Buttons */}
            <Box 
              sx={{ 
                display: "flex", 
                flexDirection: "column",
                gap: 1,
                justifyContent: "center",
                minHeight: 60,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  textAlign: "center",
                  mb: 0.5,
                }}
              >
                Quick Presets
              </Typography>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setStartDate(dayjs().subtract(1, "week").startOf("day"));
                    setEndDate(dayjs().add(12, "month").endOf("day"));
                  }}
                  sx={{
                    color: "white",
                    borderColor: "white",
                    borderWidth: 1.5,
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    minWidth: 70,
                    ...(isNextActive
                      ? {
                          backgroundColor: "rgba(255,255,255,0.2)",
                          fontWeight: 600,
                        }
                      : {}),
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Next 12m
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setStartDate(dayjs().subtract(12, "month").startOf("day"));
                    setEndDate(dayjs().startOf("day"));
                  }}
                  sx={{
                    color: "white",
                    borderColor: "white",
                    borderWidth: 1.5,
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    minWidth: 70,
                    ...(isPrevActive
                      ? {
                          backgroundColor: "rgba(255,255,255,0.2)",
                          fontWeight: 600,
                        }
                      : {}),
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: "rgba(255,255,255,0.1)",
                    },
                  }}
                >
                  Prev 12m
                </Button>
              </Box>
            </Box>

            {/* Date Pickers */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box 
                sx={{ 
                  display: "flex", 
                  flexDirection: "column",
                  gap: 1,
                  justifyContent: "center",
                  minHeight: 60,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 500,
                    fontSize: "0.875rem",
                    textAlign: "center",
                    mb: 0.5,
                  }}
                >
                  Date Range
                </Typography>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                  <Box sx={{ minWidth: 100 }}>
                    <DatePicker
                      value={startDate}
                      onChange={(v) => v && setStartDate(v)}
                      slotProps={{
                        textField: {
                          size: "small",
                          placeholder: "Start",
                          sx: {
                            border: "1px solid white",
                            "& .MuiInputBase-root": {
                              color: "white",
                              border: "1px solid white",
                              borderRadius: 1,
                              "&:hover": {
                                borderColor: "rgba(255,255,255,0.8)",
                              },
                            },
                            "& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root.MuiPickersInputBase-colorPrimary.MuiPickersInputBase-inputSizeSmall.MuiPickersInputBase-adornedEnd.css-1cgg4mh-MuiPickersInputBase-root-MuiPickersOutlinedInput-root": {
                              color: "white",
                              
                            },
                            "& .MuiSvgIcon-root": {
                              color: "white",
                              fontSize: "1rem",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              border: "none",
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 100 }}>
                    <DatePicker
                      value={endDate}
                      onChange={(v) => v && setEndDate(v)}
                      slotProps={{
                        textField: {
                          size: "small",
                          placeholder: "End",
                          sx: {
                            border: "1px solid white",
                            "& .MuiInputBase-root": {
                              color: "white",
                              border: "1px solid white",
                              borderRadius: 1,
                              "&:hover": {
                                borderColor: "rgba(255,255,255,0.8)",
                              },
                            },
                            "& .MuiPickersInputBase-root.MuiPickersOutlinedInput-root.MuiPickersInputBase-colorPrimary.MuiPickersInputBase-inputSizeSmall.MuiPickersInputBase-adornedEnd.css-1cgg4mh-MuiPickersInputBase-root-MuiPickersOutlinedInput-root": {
                              color: "white",
                              
                            },
                            "& .MuiSvgIcon-root": {
                              color: "white",
                              fontSize: "1rem",
                            },
                            "& .MuiOutlinedInput-notchedOutline": {
                              border: "none",
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </LocalizationProvider>

            {/* Summary Stats */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 60,
                borderLeft: "1px solid rgba(255,255,255,0.2)",
                pl: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontWeight: 500,
                  fontSize: "0.875rem",
                  textAlign: "center",
                  mb: 0.5,
                }}
              >
                Summary
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "white",
                      fontWeight: 600,
                      mb: 0,
                      fontSize: "1.1rem",
                    }}
                  >
                    {filtered.length}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem" }}
                  >
                    Projects
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: "1px",
                    height: "30px",
                    backgroundColor: "rgba(255,255,255,0.2)",
                  }}
                />
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "white",
                      fontWeight: 600,
                      mb: 0,
                      fontSize: "1.1rem",
                    }}
                  >
                    {staff.length}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem" }}
                  >
                    Staff
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderRadius: 3,
          transition: "transform 0.2s ease-in-out",
          "&:hover": { transform: "translateY(-2px)" },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Capacity vs Demand Overview
          </Typography>
          <Box sx={{ height: 400, width: "100%" }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ left: 8, right: 8, top: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="weekLabel" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="demand"
                  name="Total Demand (h)"
                  strokeWidth={3}
                  stroke="#ff6b6b"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#ff6b6b", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="capacity"
                  name="Total Capacity (h)"
                  strokeWidth={3}
                  stroke="#4ecdc4"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#4ecdc4", strokeWidth: 2 }}
                />
                
                {/* Individual Skill Demand Lines */}
                {skillVisibility.CNC && (
                  <Line
                    type="monotone"
                    dataKey="cncDemand"
                    name="CNC"
                    strokeWidth={1}
                    stroke="#ff9ff3"
                    dot={false}
                    activeDot={{ r: 2, stroke: "#ff9ff3", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Build && (
                  <Line
                    type="monotone"
                    dataKey="buildDemand"
                    name="Build"
                    strokeWidth={1}
                    stroke="#54a0ff"
                    dot={false}
                    activeDot={{ r: 2, stroke: "#54a0ff", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Paint && (
                  <Line
                    type="monotone"
                    dataKey="paintDemand"
                    name="Paint"
                    strokeWidth={1}
                    stroke="#ff9f43"
                    dot={false}
                    activeDot={{ r: 2, stroke: "#ff9f43", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.AV && (
                  <Line
                    type="monotone"
                    dataKey="avDemand"
                    name="AV"
                    strokeWidth={1}
                    stroke="#5f27cd"
                    dot={false}
                    activeDot={{ r: 2, stroke: "#5f27cd", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility["Pack & Load"] && (
                  <Line
                    type="monotone"
                    dataKey="packLoadDemand"
                    name="P&L"
                    strokeWidth={1}
                    stroke="#00d2d3"
                    dot={false}
                    activeDot={{ r: 2, stroke: "#00d2d3", strokeWidth: 1 }}
                  />
                )}
                

                
                {/* Current date vertical line */}
                {currentWeekIndex >= 0 && (
                  <ReferenceLine
                    x={currentWeekIndex}
                    stroke="#ffd700"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: "Today",
                      position: "top",
                      fill: "#ffd700",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card
        sx={{
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          borderRadius: 3,
          transition: "transform 0.2s ease-in-out",
          "&:hover": { transform: "translateY(-2px)" },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Top Pressure Weeks
          </Typography>
          <Table
            sx={{
              "& .MuiTableCell-root": {
                borderBottom: "1px solid #f0f0f0",
                padding: "12px 16px",
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                backgroundColor: "#f8f9fa",
                fontWeight: 600,
                color: "#495057",
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
              {pressure.map((r, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    "&:hover": { backgroundColor: "#f8f9fa" },
                    transition: "background-color 0.2s ease",
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{r.weekLabel}</TableCell>
                  <TableCell>{r.demand.toFixed(1)}</TableCell>
                  <TableCell>{r.capacity.toFixed(1)}</TableCell>
                  <TableCell
                    sx={{
                      color:
                        r.util > 100
                          ? "#dc3545"
                          : r.util > 80
                            ? "#ffc107"
                            : "#28a745",
                      fontWeight: 600,
                    }}
                  >
                    {r.util}%
                  </TableCell>
                  <TableCell
                    sx={{
                      color: r.demand > r.capacity ? "#dc3545" : "#28a745",
                      fontWeight: 600,
                    }}
                  >
                    {(r.demand - r.capacity).toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
