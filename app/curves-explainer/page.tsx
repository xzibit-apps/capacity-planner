'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';

// Utility functions for curve calculations
function rampUpWeights(N: number): number[] { 
  const denom = (N * (N + 1)) / 2; 
  if (!denom) return []; 
  return Array.from({ length: N }, (_, i) => (i + 1) / denom); 
}

function triangularWeights(N: number): number[] { 
  return rampUpWeights(N); 
}

function bellCurveWeights(N: number): number[] {
  if (N <= 1) return [1];
  
  const weights = [];
  for (let i = 0; i < N; i++) {
    const progress = i / (N - 1);
    const bell = Math.exp(-Math.pow((progress - 0.5) / 0.2, 2));
    weights.push(bell);
  }
  
  // Normalize to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

function interp1(x: number[], y: number[], xq: number) { 
  if (xq <= x[0]) return y[0]; 
  if (xq >= x[x.length - 1]) return y[y.length - 1]; 
  let i = 1; 
  while (i < x.length && xq > x[i]) i++; 
  const x0 = x[i - 1], x1 = x[i]; 
  const y0 = y[i - 1], y1 = y[i]; 
  const t = (xq - x0) / (x1 - x0); 
  return y0 + (y1 - y0) * t; 
}

function libraryWeights(projectType: string | undefined | null, skill: string, N: number, curveLibrary: any): number[] { 
  const entry = projectType ? curveLibrary?.find((c: any) => c.name === projectType) : undefined; 
  const curve = entry?.curves?.[skill]; 
  if (!curve || !curve.breaks?.length) return bellCurveWeights(N); 
  const xs = curve.breaks.map(Number); 
  const ys = curve.weights.map(Number); 
  const w = Array.from({ length: N }, (_, k) => interp1(xs, ys, (k + 0.5) / N)); 
  const s = w.reduce((a, b) => a + b, 0); 
  return s > 0 ? w.map(v => v / s) : bellCurveWeights(N); 
}

export default function CurvesExplainer() {
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [weeks, setWeeks] = useState<number>(8);

  // Fetch real data from projects, job types, and curve library
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });

  const { data: jobTypesData, isLoading: jobTypesLoading, error: jobTypesError } = useQuery({
    queryKey: ['job-types'],
    queryFn: async () => {
      const response = await fetch('/api/job-types');
      if (!response.ok) throw new Error('Failed to fetch job types');
      return response.json();
    }
  });

  const { data: curveLibraryData, isLoading: curveLibraryLoading, error: curveLibraryError } = useQuery({
    queryKey: ['curve-library'],
    queryFn: async () => {
      const response = await fetch('/api/curve-library/import');
      if (!response.ok) throw new Error('Failed to fetch curve library');
      return response.json();
    }
  });

  // Get unique job types from the JobTypes collection
  const jobTypes = useMemo(() => {
    if (!jobTypesData) return [];
    return jobTypesData.filter((jt: any) => jt.isActive).map((jt: any) => jt.name);
  }, [jobTypesData]);

  // Define skills for the curves (matching new project model)
  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  // Set initial job type when data loads
  useMemo(() => {
    if (jobTypes.length > 0 && !selectedJobType) {
      setSelectedJobType(jobTypes[0]);
    }
  }, [jobTypes, selectedJobType]);

  // Get projects of selected job type with matching build weeks
  const matchingProjects = useMemo(() => {
    if (!projectsData || !selectedJobType) return [];
    
    return projectsData.filter((p: any) => {
      // Check if project has the selected job type
      const hasJobType = p.jobType && typeof p.jobType === 'object' && p.jobType.name === selectedJobType;
      const hasWeeks = p.weeksToBuild === weeks;
      
      return hasJobType && hasWeeks;
    });
  }, [projectsData, selectedJobType, weeks]);

  // Calculate aggregated job type statistics
  const jobTypeStats = useMemo(() => {
    if (!matchingProjects.length) return null;

    // Aggregate data across all matching projects using new model structure
    const totalHours = matchingProjects.reduce((sum: number, project: any) => {
      return sum + (project.cnc || 0) + (project.build || 0) + (project.paint || 0) + 
                    (project.av || 0) + (project.packAndLoad || 0);
    }, 0);

    const avgWeeksToBuild = weeks;
    const avgOnsiteWeeks = matchingProjects.reduce((sum: number, project: any) => 
      sum + (project.onsiteWeeks || 0), 0) / matchingProjects.length;
    const totalWeeks = avgWeeksToBuild + avgOnsiteWeeks;

    // Get most common curve mode
    const curveModes = matchingProjects.map((p: any) => p.curveMode || 'Mathematician');
    const mostCommonCurveMode = curveModes.sort((a: string, b: string) => 
      curveModes.filter((v: string) => v === a).length - curveModes.filter((v: string) => v === b).length
    ).pop() || 'Mathematician';

    // Calculate skill-specific totals
    const skillTotals = {
      cnc: matchingProjects.reduce((sum: number, p: any) => sum + (p.cnc || 0), 0),
      build: matchingProjects.reduce((sum: number, p: any) => sum + (p.build || 0), 0),
      paint: matchingProjects.reduce((sum: number, p: any) => sum + (p.paint || 0), 0),
      av: matchingProjects.reduce((sum: number, p: any) => sum + (p.av || 0), 0),
      packAndLoad: matchingProjects.reduce((sum: number, p: any) => sum + (p.packAndLoad || 0), 0)
    };

    return {
      totalHours,
      weeksToBuild: avgWeeksToBuild,
      onsiteWeeks: avgOnsiteWeeks,
      totalWeeks,
      curveMode: mostCommonCurveMode,
      projectCount: matchingProjects.length,
      skillTotals
    };
  }, [matchingProjects, weeks]);

  // Generate chart datasets with skill-specific curves
  const datasets = useMemo(() => {
    const ws = Array.from({ length: weeks }, (_, i) => i + 1);
    
    // Generate chart data
    return ws.map((weekNum, index) => {
      const weekData: any = { 
        label: `W${weekNum}`,
        week: weekNum
      };
      
      // Add skill-specific curves from curve library or default to bell curve
      skills.forEach(skill => {
        if (curveLibraryData?.curves) {
          const skillCurve = libraryWeights(selectedJobType, skill, weeks, curveLibraryData.curves);
          weekData[skill] = Number((skillCurve[index] || 0).toFixed(4));
        } else {
          // Default to bell curve if no library data
          const bellCurve = bellCurveWeights(weeks);
          weekData[skill] = Number((bellCurve[index] || 0).toFixed(4));
        }
      });
      
      // Add theoretical curves for comparison
      const lin = rampUpWeights(weeks);
      const tri = triangularWeights(weeks);
      const bell = bellCurveWeights(weeks);
      
      weekData["Linear"] = Number((lin[index] || 0).toFixed(4));
      weekData["Triangular"] = Number((tri[index] || 0).toFixed(4));
      weekData["Bell Curve"] = Number((bell[index] || 0).toFixed(4));
      
      return weekData;
    });
  }, [weeks, curveLibraryData, selectedJobType]);

  const isLoading = projectsLoading || jobTypesLoading || curveLibraryLoading;
  const hasError = projectsError || jobTypesError || curveLibraryError;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Alert severity="error">
        Failed to load data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        borderRadius: 3,
        transition: 'transform 0.2s ease-in-out',
        '&:hover': { transform: 'translateY(-2px)' }
      }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Workload Distribution Curves by Job Type
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Job Type Selection Controls */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'end' }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Job Type</InputLabel>
                <Select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  label="Job Type"
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#cbd5e1',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                  }}
                >
                  {jobTypes.map((type: string) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Build Weeks"
                type="number"
                value={weeks}
                inputProps={{ min: 1, max: 52 }}
                onChange={(e) => setWeeks(Math.max(1, Math.min(52, Math.floor(Number(e.target.value) || 1))))}
                sx={{ 
                  width: 150,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e2e8f0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#cbd5e1',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#667eea',
                  },
                }}
              />
            </Box>

            {/* Job Type Statistics */}
            {jobTypeStats && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {jobTypeStats.totalHours.toFixed(1)}h
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Build Weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {jobTypeStats.weeksToBuild} weeks
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Onsite Weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {jobTypeStats.onsiteWeeks.toFixed(1)} weeks
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Curve Mode</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {jobTypeStats.curveMode}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Projects</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {jobTypeStats.projectCount}
                  </Typography>
                </Card>
              </Box>
            )}

            {/* Skill Breakdown */}
            {jobTypeStats && (
              <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#667eea' }}>
                  Skill Breakdown for {selectedJobType}
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">CNC</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff6b6b' }}>
                      {jobTypeStats.skillTotals.cnc.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Build</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#4ecdc4' }}>
                      {jobTypeStats.skillTotals.build.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Paint</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#45b7d1' }}>
                      {jobTypeStats.skillTotals.paint.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">AV</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#96ceb4' }}>
                      {jobTypeStats.skillTotals.av.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Pack & Load</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#feca57' }}>
                      {jobTypeStats.skillTotals.packAndLoad.toFixed(1)}h
                    </Typography>
                  </Box>
                </Box>
              </Card>
            )}
            
            {/* Chart */}
            <Box sx={{ height: 500, width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={datasets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#666"
                    tick={{ fontSize: 12, fill: '#666' }}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fontSize: 12, fill: '#666' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e0e0e0',
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '12px'
                    }}
                  />
                  
                  {/* Skill-specific curves */}
                  {skills.map((skill, index) => (
                    <Line 
                      key={skill} 
                      type="monotone" 
                      dataKey={skill} 
                      name={`${skill} (${curveLibraryData?.curves ? 'Library' : 'Bell Curve'})`}
                      dot={false} 
                      strokeWidth={3}
                      stroke={[
                        '#ff6b6b', // CNC - Red
                        '#4ecdc4', // Build - Teal
                        '#45b7d1', // Paint - Blue
                        '#96ceb4', // AV - Green
                        '#feca57'  // Pack & Load - Yellow
                      ][index]}
                      activeDot={{ 
                        r: 6, 
                        stroke: [
                          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'
                        ][index], 
                        strokeWidth: 2 
                      }}
                    />
                  ))}
                  
                  {/* Theoretical curves */}
                  <Line 
                    type="monotone" 
                    dataKey="Linear" 
                    name="Linear (Uniform)"
                    dot={false} 
                    strokeWidth={2}
                    stroke="#feca57"
                    strokeDasharray="5 5"
                    activeDot={{ r: 6, stroke: '#feca57', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Triangular" 
                    name="Triangular (Peak at End)"
                    dot={false} 
                    strokeWidth={2}
                    stroke="#6c5ce7"
                    strokeDasharray="10 5"
                    activeDot={{ r: 6, stroke: '#6c5ce7', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Bell Curve" 
                    name="Bell Curve (Peak in Middle)"
                    dot={false} 
                    strokeWidth={2}
                    stroke="#00b894"
                    strokeDasharray="15 5"
                    activeDot={{ r: 6, stroke: '#00b894', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Information Card */}
            <Card sx={{ 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong>Workload Distribution Curves</strong> show how project hours are distributed across the build timeline for different job types and skills. 
                  <strong>Library curves</strong> are pulled from your curve library data when available. 
                  <strong>Bell Curve</strong> represents a normal distribution with peak workload in the middle. 
                  <strong>Triangular</strong> shows increasing workload towards the end (truck date). 
                  <strong>Linear</strong> represents uniform distribution across all weeks.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
