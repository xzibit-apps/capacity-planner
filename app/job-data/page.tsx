'use client';

import { useState, useMemo, useCallback } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

export default function JobData() {
  const queryClient = useQueryClient();
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });

  const { data: curveLibraryData, isLoading: curveLibraryLoading } = useQuery({
    queryKey: ['curve-library'],
    queryFn: async () => {
      const response = await fetch('/api/curve-library/import');
      if (!response.ok) throw new Error('Failed to fetch curve library');
      return response.json();
    }
  });

  // Mutations
  const updateProjectMutation = useMutation({
    mutationFn: async (updatedProject: any) => {
      const response = await fetch(`/api/projects/${updatedProject._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSnackbar({ open: true, message: 'Project updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingProject(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to update project', severity: 'error' });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (newProject: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSnackbar({ open: true, message: 'Project created successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingProject(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to create project', severity: 'error' });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSnackbar({ open: true, message: 'Project deleted successfully', severity: 'success' });
      setSelectionModel([]);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to delete project', severity: 'error' });
    },
  });

  const projectTypes = useMemo(() => {
    return curveLibraryData?.curves?.map((curve: any) => curve.name) || [];
  }, [curveLibraryData]);

  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  const handleEdit = useCallback((id: GridRowId) => {
    const project = projectsData?.find((p: any) => p._id === id);
    setEditingProject(project);
    setEditDialogOpen(true);
  }, [projectsData]);

  const handleDelete = useCallback((id: GridRowId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProjectMutation.mutate(id as string);
    }
  }, [deleteProjectMutation]);

  const handleAddNew = () => {
    setEditingProject({
      name: '',
      truckDate: null,
      weeksBefore: 0,
      hoursBySkill: { CNC: 0, Build: 0, Paint: 0, AV: 0, "Pack & Load": 0 },
      probability: null,
      onsite: { hours: 0, weeks: 0 },
      projectType: null,
      curveMode: 'Mathematician'
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    // Ensure truckDate is properly formatted and remove _id for new projects
    const projectToSave = {
      ...editingProject,
      truckDate: editingProject.truckDate || null
    };
    
    if (editingProject._id) {
      updateProjectMutation.mutate(projectToSave);
    } else {
      // Remove _id for new projects
      const { _id, ...newProject } = projectToSave;
      createProjectMutation.mutate(newProject);
    }
  };

  // Generate columns
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Project Name",
      width: 250,
      editable: true,
    },
    {
      field: "projectType",
      headerName: "Project Type",
      width: 200,
      editable: true,
      type: "singleSelect",
      valueOptions: projectTypes,
    },
    {
      field: "curveMode",
      headerName: "Curve Mode",
      width: 150,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Mathematician", "Linear", "Triangular"],
    },
    {
      field: "truckDate",
      headerName: "Truck Date",
      width: 140,
      editable: true,
      type: "date",
      valueGetter: (params: GridValueGetterParams) => {
        return params.value ? new Date(params.value) : null;
      },
      valueSetter: (params) => {
        return { ...params.row, truckDate: params.value ? params.value.toISOString().split('T')[0] : null };
      },
    },
    {
      field: "weeksBefore",
      headerName: "Lead (wks)",
      width: 120,
      editable: true,
      type: "number",
    },
    {
      field: "probability",
      headerName: "Probability",
      width: 120,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.value ? params.value * 100 : 0;
      },
      valueSetter: (params) => {
        return { ...params.row, probability: (params.value || 0) / 100 };
      },
      renderCell: (params) => {
        return params.value ? `${params.value.toFixed(0)}%` : '';
      },
    },
    // Skill columns
    {
      field: "hoursBySkill.CNC",
      headerName: "CNC (h)",
      width: 100,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.hoursBySkill?.CNC || 0;
      },
      valueSetter: (params) => {
        const newHoursBySkill = { ...params.row.hoursBySkill, CNC: params.value || 0 };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
    },
    {
      field: "hoursBySkill.Build",
      headerName: "Build (h)",
      width: 100,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.hoursBySkill?.Build || 0;
      },
      valueSetter: (params) => {
        const newHoursBySkill = { ...params.row.hoursBySkill, Build: params.value || 0 };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
    },
    {
      field: "hoursBySkill.Paint",
      headerName: "Paint (h)",
      width: 100,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.hoursBySkill?.Paint || 0;
      },
      valueSetter: (params) => {
        const newHoursBySkill = { ...params.row.hoursBySkill, Paint: params.value || 0 };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
    },
    {
      field: "hoursBySkill.AV",
      headerName: "AV (h)",
      width: 100,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.hoursBySkill?.AV || 0;
      },
      valueSetter: (params) => {
        const newHoursBySkill = { ...params.row.hoursBySkill, AV: params.value || 0 };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
    },
    {
      field: "hoursBySkill.Pack & Load",
      headerName: "Pack & Load (h)",
      width: 140,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.hoursBySkill?.["Pack & Load"] || 0;
      },
      valueSetter: (params) => {
        const newHoursBySkill = { ...params.row.hoursBySkill, "Pack & Load": params.value || 0 };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
    },
    {
      field: "onsite.hours",
      headerName: "Onsite (h)",
      width: 120,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.onsite?.hours || 0;
      },
      valueSetter: (params) => {
        const newOnsite = { ...params.row.onsite, hours: params.value || 0 };
        return { ...params.row, onsite: newOnsite };
      },
    },
    {
      field: "onsite.weeks",
      headerName: "Onsite (wks)",
      width: 130,
      editable: true,
      type: "number",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.onsite?.weeks || 0;
      },
      valueSetter: (params) => {
        const newOnsite = { ...params.row.onsite, weeks: params.value || 0 };
        return { ...params.row, onsite: newOnsite };
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => [
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
      // Ensure truckDate is properly formatted for the API
      const updatedRow = {
        ...newRow,
        truckDate: newRow.truckDate instanceof Date 
          ? newRow.truckDate.toISOString().split('T')[0] 
          : newRow.truckDate
      };
      
      updateProjectMutation.mutate(updatedRow);
      return newRow;
    },
    [updateProjectMutation]
  );

  // Transform data for DataGrid
  const rows = projectsData?.map((project: any) => ({
    ...project,
    hoursBySkill: project.hoursBySkill || {},
    onsite: project.onsite || { hours: 0, weeks: 0 },
  })) || [];

  if (projectsLoading || curveLibraryLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (projectsError) {
    return (
      <Alert severity="error">
        Failed to load projects. Please try refreshing the page.
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
              Project Management
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
              Add New Project
            </Button>
          </Box>
          
          <Box sx={{ height: "calc(100vh - 300px)", width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={projectsLoading}
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
          {editingProject?._id ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          {editingProject && (
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <TextField
                label="Project Name"
                value={editingProject.name || ''}
                onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Project Type</InputLabel>
                <Select
                  value={editingProject.projectType || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, projectType: e.target.value })}
                  label="Project Type"
                >
                  <MenuItem value="">(none)</MenuItem>
                  {projectTypes.map((type: string) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Curve Mode</InputLabel>
                <Select
                  value={editingProject.curveMode || 'Mathematician'}
                  onChange={(e) => setEditingProject({ ...editingProject, curveMode: e.target.value })}
                  label="Curve Mode"
                >
                  <MenuItem value="Mathematician">Mathematician</MenuItem>
                  <MenuItem value="Linear">Linear</MenuItem>
                  <MenuItem value="Triangular">Triangular</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Truck Date"
                type="date"
                value={editingProject.truckDate || ''}
                onChange={(e) => setEditingProject({ ...editingProject, truckDate: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
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
              />
              <TextField
                label="Lead Weeks"
                type="number"
                value={editingProject.weeksBefore || 0}
                onChange={(e) => setEditingProject({ ...editingProject, weeksBefore: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Probability (%)"
                type="number"
                value={editingProject.probability ? editingProject.probability * 100 : ''}
                onChange={(e) => setEditingProject({ ...editingProject, probability: Number(e.target.value) / 100 })}
                fullWidth
              />
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Hours by Skill</Typography>
              {skills.map(skill => (
                <TextField
                  key={skill}
                  label={`${skill} Hours`}
                  type="number"
                  value={editingProject.hoursBySkill?.[skill] || 0}
                  onChange={(e) => setEditingProject({
                    ...editingProject,
                    hoursBySkill: {
                      ...editingProject.hoursBySkill,
                      [skill]: Number(e.target.value)
                    }
                  })}
                  fullWidth
                />
              ))}
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Onsite</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Onsite Hours"
                  type="number"
                  value={editingProject.onsite?.hours || 0}
                  onChange={(e) => setEditingProject({
                    ...editingProject,
                    onsite: { ...editingProject.onsite, hours: Number(e.target.value) }
                  })}
                />
                <TextField
                  label="Onsite Weeks"
                  type="number"
                  value={editingProject.onsite?.weeks || 0}
                  onChange={(e) => setEditingProject({
                    ...editingProject,
                    onsite: { ...editingProject.onsite, weeks: Number(e.target.value) }
                  })}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            Save
          </Button>
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
