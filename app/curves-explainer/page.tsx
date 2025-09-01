'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';

// Utility functions from the old React app
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
  const [projectType, setProjectType] = useState<string>('');
  const [weeks, setWeeks] = useState<number>(8);

  const { data: curveLibraryData, isLoading: curveLibraryLoading, error: curveLibraryError } = useQuery({
    queryKey: ['curve-library'],
    queryFn: async () => {
      const response = await fetch('/api/curve-library/import');
      if (!response.ok) throw new Error('Failed to fetch curve library');
      return response.json();
    }
  });

  const projectTypes = useMemo(() => {
    return curveLibraryData?.curves?.map((curve: any) => curve.name) || [];
  }, [curveLibraryData]);

  // Set initial project type when data loads
  useMemo(() => {
    if (projectTypes.length > 0 && !projectType) {
      setProjectType(projectTypes[0]);
    }
  }, [projectTypes, projectType]);

  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  const datasets = useMemo(() => {
    const ws = Array.from({ length: weeks }, (_, i) => i + 1);
    const mats: Record<string, number[]> = {} as any;
    const lin = rampUpWeights(weeks);
    const tri = triangularWeights(weeks);
    
    for (const sk of skills) { 
      mats[sk] = libraryWeights(projectType, sk, weeks, curveLibraryData?.curves); 
    }
    
    return ws.map(k => ({ 
      label: `W${k}`, 
      ...Object.fromEntries(skills.map(sk => [`Mathematician ${sk}`, Number((mats[sk][k - 1] || 0).toFixed(4))])), 
      "Linear": Number((lin[k - 1] || 0).toFixed(4)), 
      "Triangular": Number((tri[k - 1] || 0).toFixed(4)), 
    }));
  }, [projectType, weeks, curveLibraryData, skills]);

  if (curveLibraryLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (curveLibraryError) {
    return (
      <Alert severity="error">
        Failed to load curve library. Please try refreshing the page.
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
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'end' }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
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
                  {projectTypes.map((type: string) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                label="Build Weeks"
                type="number"
                value={weeks}
                inputProps={{ min: 1, max: 26 }}
                onChange={(e) => setWeeks(Math.max(1, Math.min(26, Math.floor(Number(e.target.value) || 1))))}
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
                  {skills.map((sk, index) => (
                    <Line 
                      key={sk} 
                      type="monotone" 
                      dataKey={`Mathematician ${sk}`} 
                      name={`${sk} (Mathematician)`}
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
                  <Line 
                    type="monotone" 
                    dataKey="Linear" 
                    name="Linear"
                    dot={false} 
                    strokeWidth={3}
                    stroke="#a8a8a8"
                    strokeDasharray="5 5"
                    activeDot={{ r: 6, stroke: '#a8a8a8', strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Triangular" 
                    name="Triangular"
                    dot={false} 
                    strokeWidth={3}
                    stroke="#6c5ce7"
                    strokeDasharray="10 5"
                    activeDot={{ r: 6, stroke: '#6c5ce7', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            
            <Card sx={{ 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: 2
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong>Mathematician curves</strong> are pulled per project type & skill from your original workbook (sheet "Stats"). 
                  We resample and normalise to 1. <strong>Triangular</strong> is Option A (peak at truck, pre-truck only). 
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
