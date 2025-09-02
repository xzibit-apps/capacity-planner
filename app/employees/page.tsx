'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DataGrid, 
  GridColDef, 
  GridValueGetterParams, 
  GridRowSelectionModel,
  GridToolbar,
  GridActionsCellItem,
  GridRowId
} from '@mui/x-data-grid';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  CircularProgress, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Checkbox,
  FormControlLabel,
  Chip,
  Paper,
  Divider,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon, 
  Visibility as VisibilityIcon, 
  Person as PersonIcon, 
  Close as CloseIcon,
  Event as EventIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

export default function Employees() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaffForLeave, setSelectedStaffForLeave] = useState<any>(null);
  const [newLeaveDate, setNewLeaveDate] = useState<Dayjs | null>(dayjs());
  const [newLeaveType, setNewLeaveType] = useState('Annual');
  const [newLeaveNotes, setNewLeaveNotes] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const { data: staffData, isLoading: staffLoading, error: staffError } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await fetch('/api/staff');
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    }
  });

  // Mutations
  const updateStaffMutation = useMutation({
    mutationFn: async (updatedStaff: any) => {
      const response = await fetch(`/api/staff/${updatedStaff._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedStaff),
      });
      if (!response.ok) throw new Error('Failed to update staff');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSnackbar({ open: true, message: 'Staff updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingStaff(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to update staff', severity: 'error' });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (newStaff: any) => {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff),
      });
      if (!response.ok) throw new Error('Failed to create staff');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSnackbar({ open: true, message: 'Staff created successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingStaff(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to create staff', severity: 'error' });
    },
  });

  const addLeaveMutation = useMutation({
    mutationFn: async ({ staffId, leaveData }: { staffId: string, leaveData: any }) => {
      const response = await fetch(`/api/staff/${staffId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData),
      });
      if (!response.ok) throw new Error('Failed to add leave');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSnackbar({ open: true, message: 'Leave added successfully', severity: 'success' });
      setLeaveDialogOpen(false);
      setSelectedStaffForLeave(null);
      setNewLeaveDate(dayjs());
      setNewLeaveType('Annual');
      setNewLeaveNotes('');
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to add leave', severity: 'error' });
    },
  });

  const removeLeaveMutation = useMutation({
    mutationFn: async ({ staffId, leaveDate }: { staffId: string, leaveDate: string }) => {
      const response = await fetch(`/api/staff/${staffId}/leave/${encodeURIComponent(leaveDate)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove leave');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSnackbar({ open: true, message: 'Leave removed successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to remove leave', severity: 'error' });
    },
  });

  const isSaving = (updateStaffMutation as any)?.isPending || (createStaffMutation as any)?.isPending;

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete staff');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSnackbar({ open: true, message: 'Staff deleted successfully', severity: 'success' });
      setSelectionModel([]);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to delete staff', severity: 'error' });
    },
  });

  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];
  const leaveTypes = ["Annual", "Sick", "Personal", "Holiday", "Other"];

  const handleEdit = useCallback((id: GridRowId) => {
    const staff = staffData?.find((s: any) => s._id === id);
    setEditingStaff(staff);
    setEditDialogOpen(true);
  }, [staffData]);

  const handleDelete = useCallback((id: GridRowId) => {
    if (window.confirm('Are you sure you want to delete this staff member?')) {
      deleteStaffMutation.mutate(id as string);
    }
  }, [deleteStaffMutation]);

  const handleViewEmployee = useCallback((id: GridRowId) => {
    router.push(`/employees/${id}`);
  }, [router]);

  const handleManageLeave = useCallback((id: GridRowId) => {
    const staff = staffData?.find((s: any) => s._id === id);
    setSelectedStaffForLeave(staff);
    setLeaveDialogOpen(true);
  }, [staffData]);

  const handleAddNew = () => {
    setEditingStaff({
      name: '',
      dailyHours: 8,
      utilisation: 0.85,
      skills: { CNC: false, Build: false, Paint: false, AV: false, "Pack & Load": false },
      leave: []
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (editingStaff._id) {
      updateStaffMutation.mutate(editingStaff);
    } else {
      // Remove _id for new staff
      const { _id, ...newStaff } = editingStaff;
      createStaffMutation.mutate(newStaff);
    }
  };

  const handleAddLeave = () => {
    if (!newLeaveDate || !selectedStaffForLeave) return;
    
    // Validate date is not in the past
    if (newLeaveDate.isBefore(dayjs(), 'day')) {
      setSnackbar({ 
        open: true, 
        message: 'Cannot add leave dates in the past', 
        severity: 'warning' 
      });
      return;
    }
    
    const leaveData = {
      date: newLeaveDate.format('YYYY-MM-DD'),
      leaveType: newLeaveType,
      notes: newLeaveNotes
    };

    addLeaveMutation.mutate({
      staffId: selectedStaffForLeave._id,
      leaveData
    });
  };

  const handleRemoveLeave = (leaveDate: string) => {
    if (!selectedStaffForLeave) return;
    
    if (window.confirm('Are you sure you want to remove this leave date?')) {
      removeLeaveMutation.mutate({
        staffId: selectedStaffForLeave._id,
        leaveDate
      });
    }
  };

  // Generate columns
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      width: 200,
      editable: true,
      renderCell: (params) => (
        <Button
          onClick={() => handleViewEmployee(params.id)}
          sx={{
            textTransform: 'none',
            color: '#667eea',
            fontWeight: 500,
            '&:hover': {
              textDecoration: 'underline',
              backgroundColor: 'transparent'
            }
          }}
        >
          {params.value}
        </Button>
      ),
    },
    {
      field: "dailyHours",
      headerName: "Daily Hours",
      width: 120,
      editable: true,
      type: "number",
    },
    {
      field: "utilisation",
      headerName: "Utilisation",
      width: 120,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.value ? params.value * 100 : 0;
      },
      valueSetter: (params) => {
        return { ...params.row, utilisation: (params.value || 0) / 100 };
      },
      renderCell: (params) => {
        return `${(params.value || 0).toFixed(0)}%`;
      },
    },
    // Skill columns
    {
      field: "skills.CNC",
      headerName: "CNC",
      width: 80,
      editable: true,
      type: "boolean",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.skills?.CNC || false;
      },
      valueSetter: (params) => {
        const newSkills = { ...params.row.skills, CNC: params.value || false };
        return { ...params.row, skills: newSkills };
      },
      renderCell: (params) => {
        return params.value ? "✔" : "";
      },
    },
    {
      field: "skills.Build",
      headerName: "Build",
      width: 80,
      editable: true,
      type: "boolean",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.skills?.Build || false;
      },
      valueSetter: (params) => {
        const newSkills = { ...params.row.skills, Build: params.value || false };
        return { ...params.row, skills: newSkills };
      },
      renderCell: (params) => {
        return params.value ? "✔" : "";
      },
    },
    {
      field: "skills.Paint",
      headerName: "Paint",
      width: 80,
      editable: true,
      type: "boolean",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.skills?.Paint || false;
      },
      valueSetter: (params) => {
        const newSkills = { ...params.row.skills, Paint: params.value || false };
        return { ...params.row, skills: newSkills };
      },
      renderCell: (params) => {
        return params.value ? "✔" : "";
      },
    },
    {
      field: "skills.AV",
      headerName: "AV",
      width: 80,
      editable: true,
      type: "boolean",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.skills?.AV || false;
      },
      valueSetter: (params) => {
        const newSkills = { ...params.row.skills, AV: params.value || false };
        return { ...params.row, skills: newSkills };
      },
      renderCell: (params) => {
        return params.value ? "✔" : "";
      },
    },
    {
      field: "skills.Pack & Load",
      headerName: "Pack & Load",
      width: 120,
      editable: true,
      type: "boolean",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.skills?.["Pack & Load"] || false;
      },
      valueSetter: (params) => {
        const newSkills = { ...params.row.skills, "Pack & Load": params.value || false };
        return { ...params.row, skills: newSkills };
      },
      renderCell: (params) => {
        return params.value ? "✔" : "";
      },
    },
    {
      field: "leave",
      headerName: "Leave Days",
      width: 150,
      editable: false,
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.leave?.length || 0;
      },
      renderCell: (params) => {
        const leaveCount = params.row.leave?.length || 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`${leaveCount} days`} 
              size="small" 
              color={leaveCount > 0 ? "primary" : "default"}
              variant="outlined"
            />
          </Box>
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View Employee"
          onClick={() => handleViewEmployee(params.id)}
        />,
        <GridActionsCellItem
          icon={<EventIcon />}
          label="Manage Leave"
          onClick={() => handleManageLeave(params.id)}
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.id)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.id)}
        />,
      ],
    },
  ];

  // Process row update
  const processRowUpdate = useCallback(
    (newRow: any, oldRow: any) => {
      updateStaffMutation.mutate(newRow);
      return newRow;
    },
    [updateStaffMutation]
  );

  // Transform data for DataGrid
  const rows = staffData?.map((staff: any) => ({
    ...staff,
    skills: staff.skills || {},
    leave: staff.leave || [],
  })) || [];

  if (staffLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (staffError) {
    return (
      <Alert severity="error">
        Failed to load staff data. Please try refreshing the page.
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Staff Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                }
              }}
            >
              Add New Staff
            </Button>
          </Box>
          
          <Box sx={{ height: "calc(100vh - 300px)", width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
              loading={staffLoading}
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={setSelectionModel}
              processRowUpdate={processRowUpdate}
              onProcessRowUpdateError={(error) => {
                console.error("Failed to update row:", error);
              }}
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              sx={{
                border: "none",
                "& .MuiDataGrid-cell": {
                  borderBottom: "1px solid #e2e8f0",
                },
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0",
                  color: "#374151",
                  fontWeight: 600,
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#f1f5f9",
                },
                "& .MuiDataGrid-row.Mui-selected": {
                  backgroundColor: "#dbeafe",
                },
                "& .MuiDataGrid-row.Mui-selected:hover": {
                  backgroundColor: "#bfdbfe",
                },
                "& .MuiDataGrid-toolbarContainer": {
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  padding: "8px 16px",
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingStaff?._id ? 'Edit Staff Member' : 'Add New Staff Member'}
        </DialogTitle>
        <DialogContent>
          {editingStaff && (
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <TextField
                label="Name"
                value={editingStaff.name || ''}
                onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Daily Hours"
                type="number"
                value={editingStaff.dailyHours || 8}
                onChange={(e) => setEditingStaff({ ...editingStaff, dailyHours: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Utilisation (%)"
                type="number"
                value={editingStaff.utilisation ? editingStaff.utilisation * 100 : 85}
                onChange={(e) => setEditingStaff({ ...editingStaff, utilisation: Number(e.target.value) / 100 })}
                fullWidth
              />
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Skills</Typography>
              {skills.map(skill => (
                <FormControlLabel
                  key={skill}
                  control={
                    <Checkbox
                      checked={editingStaff.skills?.[skill] || false}
                      onChange={(e) => setEditingStaff({
                        ...editingStaff,
                        skills: {
                          ...editingStaff.skills,
                          [skill]: e.target.checked
                        }
                      })}
                    />
                  }
                  label={skill}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={isSaving}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            {isSaving ? <><CircularProgress size={18} sx={{ mr: 1, color: 'white' }} /> Saving...</> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Management Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Manage Leave - {selectedStaffForLeave?.name || 'Staff Member'}
            </Typography>
            <IconButton onClick={() => setLeaveDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedStaffForLeave && (
            <Box sx={{ display: 'grid', gap: 3, pt: 1 }}>
              {/* Current Leave List */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Current Leave Days</Typography>
                {selectedStaffForLeave.leave && selectedStaffForLeave.leave.length > 0 ? (
                  <List sx={{ bgcolor: '#f8f9fa', borderRadius: 1, maxHeight: 200, overflow: 'auto' }}>
                    {selectedStaffForLeave.leave
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
                      Add leave dates above to manage staff availability
                    </Typography>
                  </Box>
                )}
              </Box>

              <Divider />

              {/* Add New Leave */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>Add New Leave Day</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Leave Date"
                        value={newLeaveDate}
                        onChange={(date) => setNewLeaveDate(date)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            helperText: "Select a future date"
                          }
                        }}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} md={4}>
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
                  <Grid item xs={12} md={4}>
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
                    disabled={!newLeaveDate}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      }
                    }}
                  >
                    Add Leave Day
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {newLeaveDate && newLeaveDate.isAfter(dayjs(), 'day') 
                      ? `Adding leave for ${newLeaveDate.format('DD/MM/YYYY')}`
                      : 'Select a future date to add leave'
                    }
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
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
