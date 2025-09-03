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

// Calculate realistic demand distribution
function calculateWeeklyDemand(projects: any[], weeks: any[], includeOnsite: boolean = false) {
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
    
    // Distribute hours across build weeks
    const buildWeeks = Math.max(1, processed.weeksToBuild);
    const hoursPerWeek = processed.totalBuildHours / buildWeeks;
    
    for (let i = 0; i < buildWeeks; i++) {
      const weekIndex = projectStartWeek + i;
      if (weekIndex < weeks.length) {
        const weekKey = weeks[weekIndex].weekStart;
        
        // Distribute skill hours proportionally
        const skillRatio = hoursPerWeek / processed.totalBuildHours;
        demand.cnc[weekKey] += processed.cnc * skillRatio;
        demand.build[weekKey] += processed.build * skillRatio;
        demand.paint[weekKey] += processed.paint * skillRatio;
        demand.av[weekKey] += processed.av * skillRatio;
        demand.packAndLoad[weekKey] += processed.packAndLoad * skillRatio;
        demand.total[weekKey] += hoursPerWeek;
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

// Calculate realistic capacity
function calculateWeeklyCapacity(staff: any[], weeks: any[]) {
  const capacity = {
    total: {} as Record<string, number>
  };

  // Initialize all weeks to 0
  weeks.forEach(week => {
    capacity.total[week.weekStart] = 0;
  });

  // Calculate capacity: 40 hours per week per staff member
  staff.forEach(person => {
    const weeklyHours = 40; // 8 hours/day * 5 days/week
    
    weeks.forEach(week => {
      capacity.total[week.weekStart] += weeklyHours;
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

  // Proper project filtering
  const filteredProjects = useMemo(() => {
    return projects.filter((project: any) => {
      // Filter by probability
      if (project.probability !== null && project.probability !== undefined) {
        if (project.probability < probability / 100) return false;
      }
      
      // Include projects with build hours
      const hasBuildHours = (project.build || 0) + (project.cnc || 0) + (project.paint || 0) + 
                           (project.av || 0) + (project.packAndLoad || 0) > 0;
      return hasBuildHours;
    });
  }, [projects, probability]);

  // Generate timeline weeks
  const weeks = useMemo(() => {
    return generateTimelineWeeks(calculatedStartDate.toDate(), calculatedEndDate.toDate());
  }, [calculatedStartDate, calculatedEndDate]);

  // Calculate demand and capacity
  const demand = useMemo(() => {
    return calculateWeeklyDemand(filteredProjects, weeks, includeOnsite);
  }, [filteredProjects, weeks, includeOnsite]);

  const capacity = useMemo(() => {
    return calculateWeeklyCapacity(staff, weeks);
  }, [staff, weeks]);

  // Chart data preparation
  const chartData = useMemo(() => {
    return weeks.map((week, index) => ({
      weekLabel: week.weekLabel,
      weekISO: week.weekStart,
      // Total values
      totalDemand: Number((demand.total[week.weekStart] || 0).toFixed(1)),
      totalCapacity: Number((capacity.total[week.weekStart] || 0).toFixed(1)),
      // Skill-specific demand
      cncDemand: Number((demand.cnc[week.weekStart] || 0).toFixed(1)),
      buildDemand: Number((demand.build[week.weekStart] || 0).toFixed(1)),
      paintDemand: Number((demand.paint[week.weekStart] || 0).toFixed(1)),
      avDemand: Number((demand.av[week.weekStart] || 0).toFixed(1)),
      packLoadDemand: Number((demand.packAndLoad[week.weekStart] || 0).toFixed(1)),
      // Utilization
      utilization: capacity.total[week.weekStart] > 0 
        ? Number(((demand.total[week.weekStart] / capacity.total[week.weekStart]) * 100).toFixed(1))
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
             {dateRangeFilter === 'next' ? 'NEXT 12 MONTHS' : 'PREVIOUS 12 MONTHS'} DASHBOARD - Realistic Workload Distribution
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

            {/* Include Site Install */}
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                Site Install
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeOnsite}
                    onChange={(e) => setIncludeOnsite(e.target.checked)}
                    size="small"
                    sx={{ color: "rgba(255,255,255,0.8)", "&.Mui-checked": { color: "white" } }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "white", fontWeight: 500, fontSize: "0.7rem" }}>
                    Include Onsite
                  </Typography>
                }
                sx={{ margin: 0, minWidth: "auto" }}
              />
            </Box>

            {/* Date Range Filter */}
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500, mb: 1 }}>
                Date Range
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                <Button
                  size="small"
                  variant={dateRangeFilter === 'next' ? "contained" : "outlined"}
                  onClick={() => setDateRangeFilter('next')}
                  sx={{
                    color: dateRangeFilter === 'next' ? "white" : "rgba(255,255,255,0.9)",
                    backgroundColor: dateRangeFilter === 'next' ? "rgba(255,255,255,0.2)" : "transparent",
                    borderColor: "rgba(255,255,255,0.3)",
                    fontSize: "0.7rem",
                    py: 0.5,
                    px: 1,
                    minWidth: "auto",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: dateRangeFilter === 'next' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                    }
                  }}
                >
                  Next 12M
                </Button>
                <Button
                  size="small"
                  variant={dateRangeFilter === 'previous' ? "contained" : "outlined"}
                  onClick={() => setDateRangeFilter('previous')}
                  sx={{
                    color: dateRangeFilter === 'previous' ? "white" : "rgba(255,255,255,0.9)",
                    backgroundColor: dateRangeFilter === 'previous' ? "rgba(255,255,255,0.2)" : "transparent",
                    borderColor: "rgba(255,255,255,0.3)",
                    fontSize: "0.7rem",
                    py: 0.5,
                    px: 1,
                    minWidth: "auto",
                    "&:hover": {
                      borderColor: "white",
                      backgroundColor: dateRangeFilter === 'previous' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                    }
                  }}
                >
                  Previous 12M
                </Button>
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
                <Box sx={{ width: "1px", height: "30px", backgroundColor: "rgba(255,255,255,0.2)" }} />
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ color: "white", fontWeight: 600, mb: 0 }}>
                    {weeks.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Weeks
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
             {dateRangeFilter === 'next' ? 'NEXT 12 MONTHS' : 'PREVIOUS 12 MONTHS'} - Capacity vs Demand Overview
           </Typography>
          
          <Box sx={{ height: 500, width: "100%" }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="weekLabel" 
                  stroke="#666"
                  tickFormatter={(value, index) => {
                    const week = weeks[index];
                    return week?.isCurrentWeek ? `🔥 ${value}` : value;
                  }}
                />
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
             DEBUG INFO - {dateRangeFilter === 'next' ? 'Next' : 'Previous'} 12 Months Logic
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
              <strong>First Week Demand:</strong> {weeks.length > 0 ? (demand.total[weeks[0].weekStart] || 0) : 0} hours
            </Typography>
            <Typography variant="body2">
              <strong>First Week Capacity:</strong> {weeks.length > 0 ? (capacity.total[weeks[0].weekStart] || 0) : 0} hours
            </Typography>
            <Typography variant="body2">
              <strong>Current Week:</strong> {weeks.find(w => w.isCurrentWeek)?.weekLabel || 'Not in range'}
            </Typography>
                         <Typography variant="body2">
               <strong>Timeline:</strong> {calculatedStartDate.format('DD/MM/YYYY')} to {calculatedEndDate.format('DD/MM/YYYY')}
             </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Pressure Weeks Table */}
      <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
                     <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
             Top Pressure Weeks ({dateRangeFilter === 'next' ? 'Next' : 'Previous'} 12 Months)
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
