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

// NEW SIMPLE LOGIC: Direct field mapping
function processProjectSimple(project: any) {
  return {
    // Direct field access - no complex calculations
    cnc: project.cnc || 0,
    build: project.build || 0,
    paint: project.paint || 0,
    av: project.av || 0,
    packAndLoad: project.packAndLoad || 0,
    tradeOnsite: project.tradeOnsite || 0,
    onsiteWeeks: project.onsiteWeeks || 0,
    truckLoadDate: project.truckLoadDate,
    weeksToBuild: project.weeksToBuild || 0,
    probability: project.probability || 0,
    // Calculate total build hours
    totalBuildHours: (project.cnc || 0) + (project.build || 0) + (project.paint || 0) + (project.av || 0) + (project.packAndLoad || 0)
  };
}

// NEW: Simple week generation
function generateSimpleWeeks(startDate: Date, endDate: Date) {
  const weeks = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    weeks.push(current.toISOString().split('T')[0]); // YYYY-MM-DD format
    current.setDate(current.getDate() + 7); // Add 7 days
  }
  
  return weeks;
}

// NEW: Simple demand calculation
function calculateSimpleDemand(projects: any[], weeks: string[]) {
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
    demand.cnc[week] = 0;
    demand.build[week] = 0;
    demand.paint[week] = 0;
    demand.av[week] = 0;
    demand.packAndLoad[week] = 0;
    demand.total[week] = 0;
  });

  // Process each project - SIMPLE APPROACH
  projects.forEach(project => {
    const processed = processProjectSimple(project);
    
    // If project has no build hours, skip
    if (processed.totalBuildHours === 0) return;
    
    // Simple distribution: assign all hours to first week
    const firstWeek = weeks[0];
    if (firstWeek) {
      demand.cnc[firstWeek] += processed.cnc;
      demand.build[firstWeek] += processed.build;
      demand.paint[firstWeek] += processed.paint;
      demand.av[firstWeek] += processed.av;
      demand.packAndLoad[firstWeek] += processed.packAndLoad;
      demand.total[firstWeek] += processed.totalBuildHours;
    }
  });

  return demand;
}

// NEW: Simple capacity calculation
function calculateSimpleCapacity(staff: any[], weeks: string[]) {
  const capacity = {
    total: {} as Record<string, number>
  };

  // Initialize all weeks to 0
  weeks.forEach(week => {
    capacity.total[week] = 0;
  });

  // Simple capacity: 8 hours per day, 5 days per week, per staff member
  staff.forEach(person => {
    const weeklyHours = 8 * 5; // 40 hours per week
    
    weeks.forEach(week => {
      capacity.total[week] += weeklyHours;
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

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const { data: staffData, isLoading: staffLoading, error: staffError } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("Failed to fetch staff");
      return response.json();
    },
  });

  const projects = projectsData || [];
  const staff = staffData || [];

  // NEW: Simple project filtering
  const filteredProjects = useMemo(() => {
    return projects.filter((project: any) => {
      // Filter by probability
      if (project.probability !== null && project.probability !== undefined) {
        if (project.probability < probability / 100) return false;
      }
      
      // Include ALL projects with build hours (no date filtering for now)
      const hasBuildHours = (project.build || 0) + (project.cnc || 0) + (project.paint || 0) + 
                           (project.av || 0) + (project.packAndLoad || 0) > 0;
      return hasBuildHours;
    });
  }, [projects, probability]);

  // NEW: Simple week generation
  const weeks = useMemo(() => {
    return generateSimpleWeeks(startDate.toDate(), endDate.toDate());
  }, [startDate, endDate]);

  // NEW: Simple demand and capacity calculation
  const demand = useMemo(() => {
    return calculateSimpleDemand(filteredProjects, weeks);
  }, [filteredProjects, weeks]);

  const capacity = useMemo(() => {
    return calculateSimpleCapacity(staff, weeks);
  }, [staff, weeks]);

  // NEW: Simple chart data preparation
  const chartData = useMemo(() => {
    return weeks.map((week, index) => ({
      weekLabel: `Week ${index + 1}`,
      weekISO: week,
      // Total values
      totalDemand: Number((demand.total[week] || 0).toFixed(1)),
      totalCapacity: Number((capacity.total[week] || 0).toFixed(1)),
      // Skill-specific demand
      cncDemand: Number((demand.cnc[week] || 0).toFixed(1)),
      buildDemand: Number((demand.build[week] || 0).toFixed(1)),
      paintDemand: Number((demand.paint[week] || 0).toFixed(1)),
      avDemand: Number((demand.av[week] || 0).toFixed(1)),
      packLoadDemand: Number((demand.packAndLoad[week] || 0).toFixed(1)),
      // Utilization
      utilization: capacity.total[week] > 0 
        ? Number(((demand.total[week] / capacity.total[week]) * 100).toFixed(1))
        : 0
    }));
  }, [weeks, demand, capacity]);

  // NEW: Simple pressure weeks calculation
  const pressureWeeks = useMemo(() => {
    return chartData
      .map(week => ({
        ...week,
        gap: week.totalDemand - week.totalCapacity
      }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10);
  }, [chartData]);

  // Loading and error states
  if (projectsLoading || staffLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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
      {/* Control Panel */}
      <Card sx={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3, color: "white" }}>
            NEW SIMPLE DASHBOARD - Direct Field Mapping
          </Typography>
          
          <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 2,
            mt: 2,
            p: 2,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
          }}>
            {/* Probability Slider */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, textAlign: "center" }}>
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
                  "& .MuiSlider-track": { backgroundColor: "rgba(255,255,255,0.9)", height: 4 },
                  "& .MuiSlider-thumb": { backgroundColor: "white", width: 18, height: 18 },
                  "& .MuiSlider-mark": { backgroundColor: "rgba(255,255,255,0.6)" },
                }}
              />
            </Box>

            {/* Skill Visibility */}
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                Skill Lines
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center" }}>
                {Object.entries(skillVisibility).map(([skill, visible]) => (
                  <FormControlLabel
                    key={skill}
                    control={
                      <Checkbox
                        checked={visible}
                        onChange={(e) => setSkillVisibility(prev => ({ ...prev, [skill]: e.target.checked }))}
                        size="small"
                        sx={{ color: "rgba(255,255,255,0.8)", "&.Mui-checked": { color: "white" } }}
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ color: "white", fontWeight: 500, fontSize: "0.7rem" }}>
                        {skill === "Pack & Load" ? "P&L" : skill}
                      </Typography>
                    }
                    sx={{ margin: 0, minWidth: "auto" }}
                  />
                ))}
              </Box>
            </Box>

            {/* Date Range */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, textAlign: "center" }}>
                  Date Range
                </Typography>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                  <DatePicker
                    value={startDate}
                    onChange={(v) => v && setStartDate(v)}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        placeholder: "Start",
                        sx: {
                          border: "1px solid white",
                          "& .MuiInputBase-root": { color: "white", border: "1px solid white" },
                          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        },
                      },
                    }}
                  />
                  <DatePicker
                    value={endDate}
                    onChange={(v) => v && setEndDate(v)}
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        size: "small",
                        placeholder: "End",
                        sx: {
                          border: "1px solid white",
                          "& .MuiInputBase-root": { color: "white", border: "1px solid white" },
                          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            </LocalizationProvider>

            {/* Summary */}
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                Summary
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "white", fontWeight: 600, mb: 0 }}>
                    {filteredProjects.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Projects
                  </Typography>
                </Box>
                <Box sx={{ width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "white", fontWeight: 600, mb: 0 }}>
                    {staff.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Staff
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            NEW SIMPLE LOGIC - Capacity vs Demand Overview
          </Typography>
          
          <Box sx={{ height: 500, width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
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
                
                {/* Total lines */}
                <Line
                  type="monotone"
                  dataKey="totalDemand"
                  name="Total Demand (h)"
                  strokeWidth={3}
                  stroke="#ff6b6b"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#ff6b6b", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="totalCapacity"
                  name="Total Capacity (h)"
                  strokeWidth={3}
                  stroke="#4ecdc4"
                  dot={false}
                  activeDot={{ r: 6, stroke: "#4ecdc4", strokeWidth: 2 }}
                />
                
                {/* Skill demand lines */}
                {skillVisibility.CNC && (
                  <Line
                    type="monotone"
                    dataKey="cncDemand"
                    name="CNC Demand"
                    strokeWidth={2}
                    stroke="#ff9ff3"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#ff9ff3", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Build && (
                  <Line
                    type="monotone"
                    dataKey="buildDemand"
                    name="Build Demand"
                    strokeWidth={2}
                    stroke="#54a0ff"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#54a0ff", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.Paint && (
                  <Line
                    type="monotone"
                    dataKey="paintDemand"
                    name="Paint Demand"
                    strokeWidth={2}
                    stroke="#ff9f43"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#ff9f43", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility.AV && (
                  <Line
                    type="monotone"
                    dataKey="avDemand"
                    name="AV Demand"
                    strokeWidth={2}
                    stroke="#5f27cd"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#5f27cd", strokeWidth: 1 }}
                  />
                )}
                {skillVisibility["Pack & Load"] && (
                  <Line
                    type="monotone"
                    dataKey="packLoadDemand"
                    name="P&L Demand"
                    strokeWidth={2}
                    stroke="#00d2d3"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#00d2d3", strokeWidth: 1 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            DEBUG INFO - New Simple Logic
          </Typography>
          
          <Box sx={{ display: "grid", gap: 2 }}>
            <Typography variant="body2">
              <strong>Total Projects:</strong> {projects.length} | <strong>Filtered Projects:</strong> {filteredProjects.length}
            </Typography>
            <Typography variant="body2">
              <strong>Total Staff:</strong> {staff.length}
            </Typography>
            <Typography variant="body2">
              <strong>Weeks Generated:</strong> {weeks.length}
            </Typography>
            <Typography variant="body2">
              <strong>First Week Demand:</strong> {demand.total[weeks[0]] || 0} hours
            </Typography>
            <Typography variant="body2">
              <strong>First Week Capacity:</strong> {capacity.total[weeks[0]] || 0} hours
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Pressure Weeks Table */}
      <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Top Pressure Weeks (NEW LOGIC)
          </Typography>
          
          <Table sx={{
            "& .MuiTableCell-root": { borderBottom: "1px solid #f0f0f0", padding: "12px 16px" },
            "& .MuiTableHead-root .MuiTableCell-root": { backgroundColor: "#f8f9fa", fontWeight: 600, color: "#495057" },
          }}>
            <TableHead>
              <TableRow>
                <TableCell>Week</TableCell>
                <TableCell>Demand (h)</TableCell>
                <TableCell>Capacity (h)</TableCell>
                <TableCell>Utilization</TableCell>
                <TableCell>Gap (h)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pressureWeeks.map((week, idx) => (
                <TableRow key={idx} sx={{ "&:hover": { backgroundColor: "#f8f9fa" } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{week.weekLabel}</TableCell>
                  <TableCell>{week.totalDemand.toFixed(1)}</TableCell>
                  <TableCell>{week.totalCapacity.toFixed(1)}</TableCell>
                  <TableCell sx={{
                    color: week.utilization > 100 ? "#dc3545" : week.utilization > 80 ? "#ffc107" : "#28a745",
                    fontWeight: 600,
                  }}>
                    {week.utilization}%
                  </TableCell>
                  <TableCell sx={{
                    color: week.gap > 0 ? "#dc3545" : "#28a745",
                    fontWeight: 600,
                  }}>
                    {week.gap.toFixed(1)}
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
