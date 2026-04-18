'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
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
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Build as BuildIcon,
  Event as EventIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';

export default function EmployeeView() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const employeeId = params.id as string;
  
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [newLeaveStartDate, setNewLeaveStartDate] = useState<Dayjs | null>(dayjs());
  const [newLeaveEndDate, setNewLeaveEndDate] = useState<Dayjs | null>(dayjs());
  const [newLeaveType, setNewLeaveType] = useState('Annual');
  const [newLeaveNotes, setNewLeaveNotes] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/staff/${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch employee');
      return response.json();
    },
    enabled: !!employeeId
  });

  // Leave management mutations
  const addLeaveMutation = useMutation({
    mutationFn: async (leaveData: any) => {
      const response = await fetch(`/api/staff/${employeeId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData),
      });
      if (!response.ok) throw new Error('Failed to add leave');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      setSnackbar({ open: true, message: 'Leave added successfully', severity: 'success' });
      setLeaveDialogOpen(false);
      setNewLeaveStartDate(dayjs());
      setNewLeaveEndDate(dayjs());
      setNewLeaveType('Annual');
      setNewLeaveNotes('');
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to add leave', severity: 'error' });
    },
  });

  const removeLeaveMutation = useMutation({
    mutationFn: async (leaveDate: string) => {
      const response = await fetch(`/api/staff/${employeeId}/leave/${encodeURIComponent(leaveDate)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove leave');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      setSnackbar({ open: true, message: 'Leave removed successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to remove leave', severity: 'error' });
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !employee) {
    return (
      <Alert severity="error">
        Failed to load employee. Please try refreshing the page.
      </Alert>
    );
  }

  const handleEdit = () => {
    // For now, just go back to employees list
    // TODO: Implement edit functionality
    router.push('/employees');
  };

  const handleBack = () => {
    router.push('/employees');
  };

  const getSkillLevel = (skill: string) => {
    if (!employee.skills || !employee.skills[skill]) return 'Not Available';
    return 'Available';
  };

  const getSkillColor = (skill: string) => {
    if (!employee.skills || !employee.skills[skill]) return 'default';
    return 'success';
  };

  const handleAddLeave = () => {
    if (!newLeaveStartDate || !newLeaveEndDate) return;
    
    // Validate start date is not in the past
    if (newLeaveStartDate.isBefore(dayjs(), 'day')) {
      setSnackbar({ 
        open: true, 
        message: 'Cannot add leave dates in the past', 
        severity: 'warning' 
      });
      return;
    }
    
    // Validate end date is not before start date
    if (newLeaveEndDate.isBefore(newLeaveStartDate, 'day')) {
      setSnackbar({ 
        open: true, 
        message: 'End date must be after start date', 
        severity: 'warning' 
      });
      return;
    }
    
    // Calculate the number of days in the range
    const daysDiff = newLeaveEndDate.diff(newLeaveStartDate, 'day') + 1;
    
    if (daysDiff > 30) {
      setSnackbar({ 
        open: true, 
        message: 'Cannot add more than 30 days of leave at once', 
        severity: 'warning' 
      });
      return;
    }
    
    // Create leave data for each day in the range
    const leaveDataArray = [];
    let currentDate = newLeaveStartDate;
    
    while (currentDate.isSame(newLeaveEndDate, 'day') || currentDate.isBefore(newLeaveEndDate, 'day')) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.day() !== 0 && currentDate.day() !== 6) {
        leaveDataArray.push({
          date: currentDate.format('YYYY-MM-DD'),
          leaveType: newLeaveType,
          notes: newLeaveNotes
        });
      }
      currentDate = currentDate.add(1, 'day');
    }
    
    if (leaveDataArray.length === 0) {
      setSnackbar({ 
        open: true, 
        message: 'No working days in the selected date range', 
        severity: 'warning' 
      });
      return;
    }
    
    // Add leave for each day in the range
    leaveDataArray.forEach((leaveData, index) => {
      setTimeout(() => {
        addLeaveMutation.mutate(leaveData);
      }, index * 100); // Small delay between requests to avoid overwhelming the API
    });
    
    // Show success message
    setSnackbar({ 
      open: true, 
      message: `Adding ${leaveDataArray.length} days of leave from ${newLeaveStartDate.format('DD/MM/YYYY')} to ${newLeaveEndDate.format('DD/MM/YYYY')}`, 
      severity: 'info' 
    });
  };

  const handleRemoveLeave = (leaveDate: string) => {
    if (window.confirm('Are you sure you want to remove this leave date?')) {
      removeLeaveMutation.mutate(leaveDate);
    }
  };

  const leaveTypes = ["Annual", "Sick", "Personal", "Holiday", "Other"];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Employee details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EventIcon />}
            onClick={() => setLeaveDialogOpen(true)}
          >
            Manage leave
          </Button>
        </Box>
      </Box>

      {/* Leave Management Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Leave management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setLeaveDialogOpen(true)}
            >
              Add leave
            </Button>
          </Box>
           
                       {employee?.leave && employee.leave.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontSize: 12 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontSize: 12 }}>Leave type</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontSize: 12 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontSize: 12 }}>Notes</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontSize: 12, width: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.leave
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((leaveItem: any, index: number) => {
                        const leaveDate = dayjs(leaveItem.date);
                        const isPast = leaveDate.isBefore(dayjs(), 'day');
                        const isToday = leaveDate.isSame(dayjs(), 'day');
                        
                        const temporalPill = isPast
                          ? 'pill pill--muted'
                          : isToday
                            ? 'pill pill--amber'
                            : 'pill pill--sky';
                        return (
                          <TableRow
                            key={index}
                            sx={{
                              backgroundColor: isPast ? 'var(--xz-surface-soft)' : 'inherit',
                              '&:hover': { backgroundColor: 'var(--xz-surface-soft)' },
                            }}
                          >
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 500,
                                  color: isPast ? 'var(--xz-ink-400)' : 'var(--xz-ink)',
                                }}
                              >
                                {leaveDate.format('DD/MM/YYYY')}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'var(--xz-ink-500)' }}>
                                {leaveDate.isBefore(dayjs(), 'day') ? 'Past' : leaveDate.isSame(dayjs(), 'day') ? 'Today' : leaveDate.diff(dayjs(), 'day') + ' days from now'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <span className={temporalPill}>{leaveItem.leaveType}</span>
                            </TableCell>
                            <TableCell>
                              {isPast && <span className="pill pill--muted">Past</span>}
                              {isToday && <span className="pill pill--amber">Today</span>}
                              {!isPast && !isToday && <span className="pill pill--sky">Upcoming</span>}
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'var(--xz-ink-500)',
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={leaveItem.notes || 'No notes'}
                              >
                                {leaveItem.notes || 'No notes'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton
                                onClick={() => handleRemoveLeave(leaveItem.date)}
                                color="error"
                                size="small"
                                disabled={isPast}
                                title={isPast ? "Cannot remove past leave dates" : "Remove leave date"}
                              >
                                <RemoveIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                                     </TableBody>
                 </Table>
                 
                {/* Summary Row */}
                <Box sx={{
                  p: 2,
                  backgroundColor: 'var(--xz-surface-soft)',
                  borderTop: '1px solid var(--xz-hairline)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                      <strong>Total leave days:</strong> {employee.leave.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                      <strong>Past:</strong> {employee.leave.filter((l: any) => dayjs(l.date).isBefore(dayjs(), 'day')).length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                      <strong>Upcoming:</strong> {employee.leave.filter((l: any) => dayjs(l.date).isAfter(dayjs(), 'day')).length}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'var(--xz-ink-500)' }}>
                    Hover over notes to see full text
                  </Typography>
                </Box>
              </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                No leave days scheduled
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                This employee has no leave days scheduled. Click “Add leave” to manage their availability.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setLeaveDialogOpen(true)}
              >
                Add first leave day
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Employee Overview Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, var(--xz-teal) 0%, var(--xz-teal-600) 100%)',
                fontSize: '2rem',
              }}
            >
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                {employee.name || 'Unnamed employee'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
                {employee.role && <span className="pill pill--sky">{employee.role}</span>}
                {employee.department && <span className="pill pill--lilac">{employee.department}</span>}
                <span
                  className={
                    employee.utilisation >= 0.9
                      ? 'pill pill--mint'
                      : employee.utilisation >= 0.8
                        ? 'pill pill--amber'
                        : 'pill pill--sky'
                  }
                >
                  {`${(employee.utilisation || 0.85) * 100}% utilisation`}
                </span>
              </Box>
              <Typography variant="body1" sx={{ color: 'var(--xz-ink-500)' }}>
                {employee.email || 'No email provided'}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  Work schedule
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Daily hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.dailyHours || 8} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Weekly hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {(employee.dailyHours || 8) * 5} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Utilisation:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {((employee.utilisation || 0.85) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon color="primary" />
                  Performance
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Skills count:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.skills ? Object.keys(employee.skills).length : 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Experience level:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.experienceLevel || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>Status:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.status || 'Active'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Skills Breakdown */}
      {employee.skills && Object.keys(employee.skills).length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildIcon color="primary" />
              Skills & proficiency
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(employee.skills).map(([skill]) => (
                <Grid item xs={12} sm={6} md={4} key={skill}>
                  <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ color: 'var(--xz-teal)', fontWeight: 700, mb: 1 }}>
                      {skill}
                    </Typography>
                    <span
                      className={
                        employee.skills?.[skill] ? 'pill pill--mint' : 'pill pill--muted'
                      }
                    >
                      {getSkillLevel(skill)}
                    </span>
                    <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)', mt: 1 }}>
                      Available
                    </Typography>
                  </Paper>
                </Grid>
              ))}
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
            This page is designed to accommodate additional employee data in the future, such as:
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Performance reviews and ratings</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Training and certification history</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Project assignments and workload</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Salary and benefits information</Typography>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>• Attendance and time tracking</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Leave Management Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Manage leave — {employee?.name || 'Employee'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 3, pt: 1 }}>
            {/* Current Leave List */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Current leave days</Typography>
              {employee?.leave && employee.leave.length > 0 ? (
                <List sx={{ bgcolor: 'var(--xz-surface-soft)', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                  {employee.leave
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((leaveItem: any, index: number) => {
                      const leaveDate = dayjs(leaveItem.date);
                      const isPast = leaveDate.isBefore(dayjs(), 'day');
                      const isToday = leaveDate.isSame(dayjs(), 'day');
                      const temporalPill = isPast
                        ? 'pill pill--muted'
                        : isToday
                          ? 'pill pill--amber'
                          : 'pill pill--sky';

                      return (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span className={temporalPill}>{leaveItem.leaveType}</span>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    fontWeight: 500,
                                    color: isPast ? 'text.secondary' : 'text.primary',
                                  }}
                                >
                                  {leaveDate.format('DD/MM/YYYY')}
                                </Typography>
                                {isPast && <span className="pill pill--muted">Past</span>}
                                {isToday && <span className="pill pill--amber">Today</span>}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                {leaveItem.notes && (
                                  <Typography variant="body2" color="text.secondary">
                                    {leaveItem.notes}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  {leaveDate.isBefore(dayjs(), 'day') ? 'Past' : leaveDate.isSame(dayjs(), 'day') ? 'Today' : leaveDate.diff(dayjs(), 'day') + ' days from now'}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton 
                              edge="end" 
                              onClick={() => handleRemoveLeave(leaveItem.date)}
                              color="error"
                              size="small"
                              disabled={isPast}
                              title={isPast ? "Cannot remove past leave dates" : "Remove leave date"}
                            >
                              <RemoveIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      );
                    })}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    No leave days scheduled
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add leave dates below to manage availability
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            {/* Add New Leave */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Add leave range</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Start date"
                      format="DD/MM/YYYY"
                      value={newLeaveStartDate}
                      onChange={(date) => {
                        if (date) {
                          setNewLeaveStartDate(date.startOf("day"));
                        } else {
                          setNewLeaveStartDate(null);
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          helperText: "Select start date"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="End date"
                      format="DD/MM/YYYY"
                      value={newLeaveEndDate}
                      onChange={(date) => {
                        if (date) {
                          setNewLeaveStartDate(date.startOf("day"));
                        } else {
                          setNewLeaveStartDate(null);
                        }
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          helperText: "Select end date"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Leave type</InputLabel>
                    <Select
                      value={newLeaveType}
                      onChange={(e) => setNewLeaveType(e.target.value)}
                      label="Leave type"
                    >
                      {leaveTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Notes (optional)"
                    value={newLeaveNotes}
                    onChange={(e) => setNewLeaveNotes(e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., Annual leave, Personal day"
                  />
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  onClick={handleAddLeave}
                  disabled={!newLeaveStartDate || !newLeaveEndDate}
                >
                  Add leave range
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {newLeaveStartDate && newLeaveEndDate && newLeaveStartDate.isAfter(dayjs(), 'day') 
                    ? `Adding leave from ${newLeaveStartDate.format('DD/MM/YYYY')} to ${newLeaveEndDate.format('DD/MM/YYYY')} (excluding weekends)`
                    : 'Select start and end dates to add leave range'
                  }
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
