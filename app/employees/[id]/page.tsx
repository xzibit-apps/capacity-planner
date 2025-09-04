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
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load employee. Please try refreshing the page.
        </Alert>
      </Box>
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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ color: '#667eea' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#2c3e50' }}>
            Employee Details
          </Typography>
        </Box>
                 <Box sx={{ display: 'flex', gap: 2 }}>
           <Button
             variant="outlined"
             startIcon={<EventIcon />}
             onClick={() => setLeaveDialogOpen(true)}
             sx={{
               borderColor: '#667eea',
               color: '#667eea',
               '&:hover': {
                 borderColor: '#5a6fd8',
                 backgroundColor: 'rgba(102, 126, 234, 0.08)'
               }
             }}
           >
             Manage Leave
           </Button>
         </Box>
             </Box>

       {/* Leave Management Table */}
       <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
         <CardContent sx={{ p: 3 }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
             <Typography variant="h6" sx={{ fontWeight: 600, color: '#2c3e50' }}>
               Leave Management
             </Typography>
             <Button
               variant="contained"
               startIcon={<AddIcon />}
               onClick={() => setLeaveDialogOpen(true)}
               sx={{
                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                 color: 'white',
                 '&:hover': {
                   background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                 }
               }}
             >
               Add Leave
             </Button>
           </Box>
           
                       {employee?.leave && employee.leave.length > 0 ? (
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>Leave Type</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa' }}>Notes</TableCell>
                      <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8f9fa', width: 80 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employee.leave
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((leaveItem: any, index: number) => {
                        const leaveDate = dayjs(leaveItem.date);
                        const isPast = leaveDate.isBefore(dayjs(), 'day');
                        const isToday = leaveDate.isSame(dayjs(), 'day');
                        
                        return (
                          <TableRow 
                            key={index}
                            sx={{ 
                              backgroundColor: isPast ? '#fafafa' : 'inherit',
                              '&:hover': { backgroundColor: isPast ? '#f5f5f5' : '#f8f9fa' }
                            }}
                          >
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 500,
                                  color: isPast ? '#9e9e9e' : '#2c3e50'
                                }}
                              >
                                {leaveDate.format('DD/MM/YYYY')}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                                {leaveDate.isBefore(dayjs(), 'day') ? 'Past' : leaveDate.isSame(dayjs(), 'day') ? 'Today' : leaveDate.diff(dayjs(), 'day') + ' days from now'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={leaveItem.leaveType} 
                                size="small" 
                                color={isPast ? "default" : isToday ? "warning" : "primary"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {isPast && (
                                <Chip 
                                  label="Past" 
                                  size="small" 
                                  color="default" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {isToday && (
                                <Chip 
                                  label="Today" 
                                  size="small" 
                                  color="warning" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {!isPast && !isToday && (
                                <Chip 
                                  label="Upcoming" 
                                  size="small" 
                                  color="info" 
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: '#7f8c8d',
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
                                sx={{ 
                                  backgroundColor: 'rgba(255,255,255,0.8)',
                                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' }
                                }}
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
                   backgroundColor: '#f8f9fa', 
                   borderTop: '1px solid #e0e0e0',
                   display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center'
                 }}>
                   <Box sx={{ display: 'flex', gap: 3 }}>
                     <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                       <strong>Total Leave Days:</strong> {employee.leave.length}
                     </Typography>
                     <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                       <strong>Past:</strong> {employee.leave.filter((l: any) => dayjs(l.date).isBefore(dayjs(), 'day')).length}
                     </Typography>
                     <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                       <strong>Upcoming:</strong> {employee.leave.filter((l: any) => dayjs(l.date).isAfter(dayjs(), 'day')).length}
                     </Typography>
                   </Box>
                   <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                     Hover over notes to see full text
                   </Typography>
                 </Box>
               </TableContainer>
           ) : (
             <Box sx={{ textAlign: 'center', py: 4 }}>
               <EventIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
               <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                 No Leave Days Scheduled
               </Typography>
               <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                 This employee has no leave days scheduled. Click "Add Leave" to manage their availability.
               </Typography>
               <Button
                 variant="outlined"
                 startIcon={<AddIcon />}
                 onClick={() => setLeaveDialogOpen(true)}
                 sx={{
                   borderColor: '#667eea',
                   color: '#667eea',
                   '&:hover': {
                     borderColor: '#5a6fd8',
                     backgroundColor: 'rgba(102, 126, 234, 0.08)'
                   }
                 }}
               >
                 Add First Leave Day
               </Button>
             </Box>
           )}
         </CardContent>
       </Card>

       {/* Employee Overview Card */}
      <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              sx={{ 
                width: 80, 
                height: 80, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '2rem'
              }}
            >
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 1 }}>
                {employee.name || 'Unnamed Employee'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {employee.role && (
                  <Chip 
                    label={employee.role} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                {employee.department && (
                  <Chip 
                    label={employee.department} 
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                <Chip 
                  label={`${(employee.utilisation || 0.85) * 100}% Utilisation`}
                  color={employee.utilisation >= 0.9 ? "success" : employee.utilisation >= 0.8 ? "warning" : "info"}
                  variant="outlined" 
                  size="small"
                />
              </Box>
              <Typography variant="body1" sx={{ color: '#7f8c8d' }}>
                {employee.email || 'No email provided'}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  Work Schedule
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Daily Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.dailyHours || 8} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Weekly Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {(employee.dailyHours || 8) * 5} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Utilisation:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {((employee.utilisation || 0.85) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon color="primary" />
                  Performance
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Skills Count:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.skills ? Object.keys(employee.skills).length : 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Experience Level:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.experienceLevel || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Status:</Typography>
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
        <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildIcon color="primary" />
              Skills & Proficiency
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(employee.skills).map(([skill, level]) => (
                <Grid item xs={12} sm={6} md={4} key={skill}>
                  <Paper sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    textAlign: 'center',
                    backgroundColor: 'rgba(102, 126, 234, 0.08)',
                    border: '1px solid rgba(102, 126, 234, 0.2)'
                  }}>
                    <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700, mb: 1 }}>
                      {skill}
                    </Typography>
                    <Chip
                      label={getSkillLevel(skill)}
                      color={getSkillColor(skill)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
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
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600 }}>
            Future Data Sections
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 2 }}>
            This page is designed to accommodate additional employee data in the future, such as:
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Performance reviews and ratings</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Training and certification history</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Project assignments and workload</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Salary and benefits information</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Attendance and time tracking</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Leave Management Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Manage Leave - {employee?.name || 'Employee'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 3, pt: 1 }}>
            {/* Current Leave List */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Current Leave Days</Typography>
              {employee?.leave && employee.leave.length > 0 ? (
                <List sx={{ bgcolor: '#f8f9fa', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                  {employee.leave
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((leaveItem: any, index: number) => {
                      const leaveDate = dayjs(leaveItem.date);
                      const isPast = leaveDate.isBefore(dayjs(), 'day');
                      const isToday = leaveDate.isSame(dayjs(), 'day');
                      
                      return (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                  label={leaveItem.leaveType} 
                                  size="small" 
                                  color={isPast ? "default" : isToday ? "warning" : "primary"}
                                  variant="outlined"
                                />
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 500,
                                    color: isPast ? 'text.secondary' : 'text.primary'
                                  }}
                                >
                                  {leaveDate.format('DD/MM/YYYY')}
                                </Typography>
                                {isPast && (
                                  <Chip 
                                    label="Past" 
                                    size="small" 
                                    color="default" 
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
                                {isToday && (
                                  <Chip 
                                    label="Today" 
                                    size="small" 
                                    color="warning" 
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                )}
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
              <Typography variant="h6" sx={{ mb: 2 }}>Add Leave Range</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Start Date"
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
                      label="End Date"
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
                    <InputLabel>Leave Type</InputLabel>
                    <Select
                      value={newLeaveType}
                      onChange={(e) => setNewLeaveType(e.target.value)}
                      label="Leave Type"
                    >
                      {leaveTypes.map(type => (
                        <MenuItem key={type} value={type}>{type}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Notes (Optional)"
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
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }}
                >
                  Add Leave Range
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
