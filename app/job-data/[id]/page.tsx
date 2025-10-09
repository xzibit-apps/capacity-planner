'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert,
  Chip,
  Paper,
  Divider,
  Grid,
  IconButton
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Build as BuildIcon
} from '@mui/icons-material';

export default function ProjectView() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
    enabled: !!projectId
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load project. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  const handleEdit = () => {
    router.push(`/job-data/edit/${projectId}`);
  };

  const handleBack = () => {
    router.push('/job-data');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ color: '#667eea' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#2c3e50' }}>
            Project Details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd8',
                backgroundColor: 'rgba(102, 126, 234, 0.08)'
              }
            }}
          >
            Edit Project
          </Button>
          <Button
            variant="contained"
            startIcon={<WorkIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            View Timeline
          </Button>
        </Box>
      </Box>

      {/* Project Overview Card */}
      <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <WorkIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 1 }}>
                {project.name || 'Unnamed Project'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {project.projectType && (
                  <Chip 
                    label={project.projectType} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                {project.curveMode && (
                  <Chip 
                    label={project.curveMode} 
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                {project.probability !== null && (
                  <Chip 
                    label={`${(project.probability * 100).toFixed(0)}% Probability`}
                    color={project.probability >= 0.8 ? "success" : project.probability >= 0.5 ? "warning" : "error"}
                    variant="outlined" 
                    size="small"
                  />
                )}
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="primary" />
                  Project Timeline
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Truck Date:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.truckDate ? new Date(project.truckDate).toLocaleDateString() : 'Not set'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Lead Time:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.weeksBefore || 0} weeks
                    </Typography>
                  </Box>
                  {project.onsite?.weeks && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Onsite Duration:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {project.onsite.weeks} weeks
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" />
                  Project Stats
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Total Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.hoursBySkill ? 
                        Object.values(project.hoursBySkill).reduce((sum: number, hours: any) => sum + (hours || 0), 0) : 0
                      }h
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Onsite Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.onsite?.hours || 0}h
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Skills Required:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.hoursBySkill ? 
                        Object.entries(project.hoursBySkill).filter(([_, hours]) => (hours as number) > 0).length : 0
                      }
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Skills Breakdown */}
      {project.hoursBySkill && (
        <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildIcon color="primary" />
              Skills & Hours Breakdown
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(project.hoursBySkill).map(([skill, hours]: [string, any]) => (
                hours > 0 && (
                  <Grid item xs={12} sm={6} md={4} key={skill}>
                    <Paper sx={{ 
                      p: 2.5, 
                      borderRadius: 2, 
                      textAlign: 'center',
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700, mb: 1 }}>
                        {hours}h
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500 }}>
                        {skill}
                      </Typography>
                    </Paper>
                  </Grid>
                )
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Onsite Details */}
      {project.onsite && (project.onsite.hours > 0 || project.onsite.weeks > 0) && (
        <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Onsite Requirements
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#667eea', fontWeight: 600 }}>
                    {project.onsite.hours}h
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                    Total Onsite Hours
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#667eea', fontWeight: 600 }}>
                    {project.onsite.weeks} weeks
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                    Onsite Duration
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Future Sections Placeholder */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600 }}>
            Future Data Sections
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 2 }}>
            This page is designed to accommodate additional project data in the future, such as:
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Resource allocation and team assignments</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Progress tracking and milestones</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Budget and cost analysis</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Risk assessment and mitigation</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Client communication history</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
