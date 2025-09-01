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
  if (!p.truckDate) return false;
  const truck = parseISODate(p.truckDate);
  const last = p.onsite?.weeks ? addDays(truck, 7 * p.onsite.weeks) : truck;
  return last < parseISODate(todayISO);
}

function computeTimelineWeeks(
  projects: any[],
  padAfterWeeks = 2,
  minWeeks = 16
) {
  const valid = projects.filter(
    (p) => p.truckDate && (p.weeksBefore || 0) >= 0
  );
  if (!valid.length) {
    const start = startOfWeekMonday(new Date());
    return Array.from({ length: minWeeks }, (_, i) =>
      toISO(addDays(start, i * 7))
    );
  }
  let minStart: Date | null = null,
    maxEnd: Date | null = null;
  for (const p of valid) {
    const truck = startOfWeekMonday(parseISODate(p.truckDate!));
    const start = addDays(truck, -7 * (p.weeksBefore || 0));
    const end = addDays(truck, 7 * padAfterWeeks + 7 * (p.onsite?.weeks || 0));
    if (!minStart || start < minStart) minStart = start;
    if (!maxEnd || end > maxEnd) maxEnd = end;
  }
  const weeks: string[] = [];
  const s = startOfWeekMonday(minStart!);
  for (let d = new Date(s); d <= maxEnd!; d = addDays(d, 7))
    weeks.push(toISO(d));
  if (weeks.length < minWeeks) {
    const need = minWeeks - weeks.length;
    const last = parseISODate(weeks[weeks.length - 1]);
    for (let i = 1; i <= need; i++) weeks.push(toISO(addDays(last, i * 7)));
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
    if (!p.truckDate) continue;
    const N = p.weeksBefore || 0;
    const truckWeek = startOfWeekMonday(parseISODate(p.truckDate));
    const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

    for (const sk of skills) {
      const hours = p.hoursBySkill?.[sk] || 0;
      if (N > 0 && hours > 0) {
        // Simple linear distribution for now
        const hoursPerWeek = hours / N;
        for (let k = 1; k <= N; k++) {
          const week = toISO(addDays(truckWeek, -7 * k));
          if (!(week in total)) continue;
          perSkill[sk][week] += hoursPerWeek;
          total[week] += hoursPerWeek;
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
      for (const rng of person.leave || []) {
        const ls = new Date(rng.start);
        const le = new Date(rng.end);
        const segStart = new Date(Math.max(ls.getTime(), weekStart.getTime()));
        const segEnd = new Date(Math.min(le.getTime(), weekEnd.getTime()));
        if (segStart <= segEnd)
          leaveDays += countWeekdaysInRangeInclusive(segStart, segEnd);
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
      startDate.isSame(dayjs().startOf("day"), "day") &&
      endDate.isSame(dayjs().add(12, "month").endOf("day"), "day"),
    [startDate, endDate]
  );
  const isPrevActive = useMemo(
    () =>
      startDate.isSame(dayjs().subtract(12, "month").startOf("day"), "day") &&
      endDate.isSame(dayjs().endOf("day"), "day"),
    [startDate, endDate]
  );

  const filtered = useMemo(
    () =>
      visible.filter((p: any) =>
        p.probability == null ? true : p.probability >= probability
      ),
    [visible, probability]
  );

  const weeks = useMemo(
    () => computeTimelineWeeks(filtered, 2, 20),
    [filtered]
  );
  const capacity = useMemo(
    () => computeWeeklyCapacity(staff, weeks),
    [staff, weeks]
  );
  const demand = useMemo(
    () => computeWeeklyDemand(filtered, weeks, includeOnsite),
    [filtered, weeks, includeOnsite]
  );

  const fmt = new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
  });
  const chartData = useMemo(
    () =>
      weeks.map((wk) => ({
        weekLabel: fmt.format(parseISODate(wk)),
        demand: Number((demand.total[wk] || 0).toFixed(1)),
        capacity: Number((capacity.unique[wk] || 0).toFixed(1)),
        util:
          (capacity.unique[wk] || 0) > 0
            ? Number(
                ((demand.total[wk] / capacity.unique[wk]) * 100).toFixed(1)
              )
            : 0,
      })),
    [weeks, demand, capacity]
  );

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
                Probability ≥ {probability.toFixed(1)}
              </Typography>
              <Slider
                value={probability}
                onChange={(_, value) => setProbability(value as number)}
                min={0}
                max={1}
                step={0.1}
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
                    setStartDate(dayjs().startOf("day"));
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
                    setEndDate(dayjs().endOf("day"));
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
                  name="Demand (h)"
                  strokeWidth={3}
                  stroke="#ff6b6b"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#ff6b6b", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="capacity"
                  name="Capacity (h)"
                  strokeWidth={3}
                  stroke="#4ecdc4"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#4ecdc4", strokeWidth: 2 }}
                />
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
