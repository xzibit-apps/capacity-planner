'use client';

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
  Paper,
  Grid,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

function probabilityPillClass(fraction: number): string {
  if (fraction >= 0.8) return 'pill pill--mint';
  if (fraction >= 0.5) return 'pill pill--amber';
  return 'pill pill--coral';
}

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
    enabled: !!projectId,
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
      <Alert severity="error">
        Failed to load project. Please try refreshing the page.
      </Alert>
    );
  }

  const handleEdit = () => {
    router.push(`/job-data/edit/${projectId}`);
  };

  const handleBack = () => {
    router.push('/job-data');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Project details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Edit project
          </Button>
          <Button variant="contained" startIcon={<WorkIcon />}>
            View timeline
          </Button>
        </Box>
      </Box>

      {/* Project Overview Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{
              p: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, var(--xz-teal) 0%, var(--xz-teal-600) 100%)',
              color: '#fff',
            }}>
              <WorkIcon sx={{ fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {project.name || 'Unnamed project'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {project.projectType && (
                  <span className="pill pill--sky">{project.projectType}</span>
                )}
                {project.curveMode && (
                  <span className="pill pill--lilac">{project.curveMode}</span>
                )}
                {project.probability !== null && project.probability !== undefined && (
                  <span className={probabilityPillClass(project.probability)}>
                    {`${(project.probability * 100).toFixed(0)}% probability`}
                  </span>
                )}
              </Box>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarIcon color="primary" />
                  Project timeline
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Truck date:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.truckDate ? new Date(project.truckDate).toLocaleDateString() : 'Not set'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Lead time:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.weeksBefore || 0} weeks
                    </Typography>
                  </Box>
                  {project.onsite?.weeks && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Onsite duration:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {project.onsite.weeks} weeks
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" />
                  Project stats
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Total hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.hoursBySkill
                        ? Object.values(project.hoursBySkill).reduce((sum: number, hours: any) => sum + (hours || 0), 0)
                        : 0}h
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Onsite hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.onsite?.hours || 0}h
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Skills required:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {project.hoursBySkill
                        ? Object.entries(project.hoursBySkill).filter(([, hours]) => (hours as number) > 0).length
                        : 0}
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
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildIcon color="primary" />
              Skills & hours breakdown
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(project.hoursBySkill).map(([skill, hours]: [string, any]) => (
                hours > 0 && (
                  <Grid item xs={12} sm={6} md={4} key={skill}>
                    <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: 'var(--xz-teal)', fontWeight: 700, mb: 1 }}>
                        {hours}h
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
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
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Onsite requirements
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'var(--xz-teal)', fontWeight: 600 }}>
                    {project.onsite.hours}h
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                    Total onsite hours
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'var(--xz-teal)', fontWeight: 600 }}>
                    {project.onsite.weeks} weeks
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                    Onsite duration
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Future Sections Placeholder */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Future data sections
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)', mb: 2 }}>
            This page is designed to accommodate additional project data in the future, such as:
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Resource allocation and team assignments</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Progress tracking and milestones</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Budget and cost analysis</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Risk assessment and mitigation</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Client communication history</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
