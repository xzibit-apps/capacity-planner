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
  if (!curve || !curve.breaks?.length) return rampUpWeights(N); 
  const xs = curve.breaks.map(Number); 
  const ys = curve.weights.map(Number); 
  const w = Array.from({ length: N }, (_, k) => interp1(xs, ys, (k + 0.5) / N)); 
  const s = w.reduce((a, b) => a + b, 0); 
  return s > 0 ? w.map(v => v / s) : rampUpWeights(N); 
}

export default function CurvesExplainer() {
  const [selectedProjectType, setSelectedProjectType] = useState<string>('');
  const [weeks, setWeeks] = useState<number>(8);

  // Fetch real data from projects and curve library
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
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

  // Get unique project types
  const projectTypes = useMemo(() => {
    if (!projectsData) return [];
    const types = projectsData.map((p: any) => p.projectType || 'Default').filter(Boolean);
    const uniqueTypes = Array.from(new Set(types)) as string[];
    return uniqueTypes;
  }, [projectsData]);

  // Define skills for the curves
  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  // Set initial project type when data loads
  useMemo(() => {
    if (projectTypes.length > 0 && !selectedProjectType) {
      const firstType = projectTypes[0];
      if (firstType && typeof firstType === 'string') {
        setSelectedProjectType(firstType);
      }
    }
  }, [projectTypes, selectedProjectType]);

  // Get projects of selected type with matching build weeks
  const matchingProjects = useMemo(() => {
    if (!projectsData || !selectedProjectType) return [];
    return projectsData.filter((p: any) => 
      (p.projectType || 'Default') === selectedProjectType && 
      p.weeksBefore === weeks
    );
  }, [projectsData, selectedProjectType, weeks]);

  // Calculate aggregated project type statistics
  const projectTypeStats = useMemo(() => {
    if (!matchingProjects.length) return null;

    // Aggregate data across all matching projects
    const totalHours = matchingProjects.reduce((sum: number, project: any) => {
      return sum + Object.values(project.hoursBySkill || {}).reduce((pSum: number, hours: any) => pSum + (hours || 0), 0);
    }, 0);

    const avgWeeksBefore = weeks; // Use the selected weeks
    const avgOnsiteWeeks = matchingProjects.reduce((sum: number, project: any) => sum + (project.onsite?.weeks || 0), 0) / matchingProjects.length;
    const totalWeeks = avgWeeksBefore + avgOnsiteWeeks;

    // Get most common curve mode
    const curveModes = matchingProjects.map((p: any) => p.curveMode || 'Mathematician');
    const mostCommonCurveMode = curveModes.sort((a: string, b: string) => 
      curveModes.filter((v: string) => v === a).length - curveModes.filter((v: string) => v === b).length
    ).pop() || 'Mathematician';

    return {
      totalHours,
      weeksBefore: avgWeeksBefore,
      onsiteWeeks: avgOnsiteWeeks,
      totalWeeks,
      curveMode: mostCommonCurveMode,
      projectCount: matchingProjects.length
    };
  }, [matchingProjects, weeks]);

  // Generate chart datasets with skill-specific Mathematician curves
  const datasets = useMemo(() => {
    if (!curveLibraryData) return [];

    const ws = Array.from({ length: weeks }, (_, i) => i + 1);
    
    // Generate chart data
    return ws.map((weekNum, index) => {
      const weekData: any = { 
        label: `W${weekNum}`,
        week: weekNum
      };
      
      // Add skill-specific Mathematician curves from curve library
      skills.forEach(skill => {
        if (curveLibraryData?.curves) {
          const skillCurve = libraryWeights(selectedProjectType, skill, weeks, curveLibraryData.curves);
          weekData[skill] = Number((skillCurve[index] || 0).toFixed(4));
        } else {
          weekData[skill] = 0;
        }
      });
      
      // Add theoretical curves for comparison
      const lin = rampUpWeights(weeks);
      const tri = triangularWeights(weeks);
      
      weekData["Linear"] = Number((lin[index] || 0).toFixed(4));
      weekData["Triangular"] = Number((tri[index] || 0).toFixed(4));
      
      return weekData;
    });
  }, [weeks, curveLibraryData, selectedProjectType]);

  const isLoading = projectsLoading || curveLibraryLoading;
  const hasError = projectsError || curveLibraryError;

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
            Workload Distribution Curves
          </Typography>
          
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Project Type Selection Controls */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'end' }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={selectedProjectType}
                  onChange={(e) => setSelectedProjectType(e.target.value)}
                  label="Project Type"
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
                  {projectTypes.map((type) => (
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

            {/* Project Type Statistics */}
            {projectTypeStats && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {projectTypeStats.totalHours.toFixed(1)}h
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Build Weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {projectTypeStats.weeksBefore} weeks
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Onsite Weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {projectTypeStats.onsiteWeeks.toFixed(1)} weeks
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Curve Mode</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {projectTypeStats.curveMode}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                  <Typography variant="body2" color="text.secondary">Projects</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
                    {projectTypeStats.projectCount}
                  </Typography>
                </Card>
              </Box>
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
                  
                  {/* Skill-specific Mathematician curves */}
                  {skills.map((skill, index) => (
                    <Line 
                      key={skill} 
                      type="monotone" 
                      dataKey={skill} 
                      name={`${skill} (Mathematician)`}
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
                    name="Linear"
                    dot={false} 
                    strokeWidth={2}
                    stroke="#feca57"
                    activeDot={{ r: 6, stroke: '#feca57', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Triangular" 
                    name="Triangular"
                    dot={false} 
                    strokeWidth={2}
                    stroke="#6c5ce7"
                    strokeDasharray="10 5"
                    activeDot={{ r: 6, stroke: '#6c5ce7', strokeWidth: 2 }}
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
                  <strong>Mathematician curves</strong> are pulled per project type & skill from your original workbook (sheet "Stats"). We resample and normalise to 1. 
                  <strong>Triangular</strong> is Option A (peak at truck, pre-truck only). 
                  <strong>Linear</strong> represents a uniform distribution of workload across the build period.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
