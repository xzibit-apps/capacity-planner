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
  GridRowId,
  GridRowParams
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
  Chip,
  FormHelperText
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Visibility as VisibilityIcon, Upload as UploadIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

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
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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

  // Separate active and archived projects
  const { activeProjects, archivedProjects } = useMemo(() => {
    if (!projectsData) return { activeProjects: [], archivedProjects: [] };
    
    const now = new Date();
    const active: any[] = [];
    const archived: any[] = [];
    
    projectsData.forEach((project: any) => {
      if (project.truckDate && new Date(project.truckDate) < now) {
        archived.push(project);
      } else {
        active.push(project);
      }
    });
    
    return { activeProjects: active, archivedProjects: archived };
  }, [projectsData]);

  // Use active or archived projects based on toggle
  const currentProjects = showArchived ? archivedProjects : activeProjects;

  // Check if project has enough data for capacity planning
  const hasEnoughData = (project: any) => {
    return project.truckDate && 
           project.weeksBefore !== undefined && 
           project.weeksBefore > 0 &&
           project.hoursBySkill && 
           Object.values(project.hoursBySkill).some((hours: any) => hours > 0);
  };

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

  const isSaving = (updateProjectMutation as any)?.isPending || (createProjectMutation as any)?.isPending;

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

  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to import CSV');
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Show detailed import results
      let message = 'CSV processed successfully';
      if (data.created > 0 || data.updated > 0) {
        message = `CSV processed: ${data.created} created, ${data.updated} updated`;
      }
      
      setSnackbar({ 
        open: true, 
        message: message, 
        severity: 'success' 
      });
      setCsvImportOpen(false);
      setCsvFile(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to import CSV', severity: 'error' });
    },
  });

  const projectTypes = useMemo(() => {
    return curveLibraryData?.curves?.map((curve: any) => curve.name) || [];
  }, [curveLibraryData]);

  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  // Probability options for dropdown (0% to 100% in 10% increments)
  const probabilityOptions = Array.from({ length: 11 }, (_, i) => i * 10);

  const handleEdit = useCallback((id: GridRowId) => {
    const project = currentProjects?.find((p: any) => p._id === id);
    setEditingProject(project);
    setEditDialogOpen(true);
  }, [currentProjects]);

  const handleDelete = useCallback((id: GridRowId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProjectMutation.mutate(id as string);
    }
  }, [deleteProjectMutation]);

  const handleAddNew = () => {
    setEditingProject({
      name: '',
      truckDate: dayjs().format('YYYY-MM-DD'),
      weeksBefore: 4,
      hoursBySkill: { CNC: 0, Build: 0, Paint: 0, AV: 0, "Pack & Load": 0 },
      probability: 0.9,
      onsite: { hours: 0, weeks: 0 },
      projectType: null,
      curveMode: 'Mathematician'
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    const projectToSave = {
      ...editingProject,
      truckDate: editingProject.truckDate || null
    };
    
    if (editingProject._id) {
      updateProjectMutation.mutate(projectToSave);
    } else {
      const { _id, ...newProject } = projectToSave;
      createProjectMutation.mutate(newProject);
    }
  };

  const handleCsvImport = () => {
    if (csvFile) {
      csvImportMutation.mutate(csvFile);
    }
  };

  // Generate columns with better editing
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Project Name",
      width: 250,
      editable: true,
      renderCell: (params) => (
        <Box
          sx={{
            cursor: 'pointer',
            color: hasEnoughData(params.row) ? '#667eea' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400,
            '&:hover': {
              textDecoration: 'underline',
              color: hasEnoughData(params.row) ? '#5a6fd8' : '#6b7280'
            }
          }}
          onClick={() => {
            window.location.href = `/job-data/${params.row._id}`;
          }}
        >
          {params.value || 'Unnamed Project'}
        </Box>
      ),
    },
    {
      field: "projectType",
      headerName: "Project Type",
      width: 200,
      editable: true,
      type: "singleSelect",
      valueOptions: projectTypes,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'None'} 
          size="small" 
          variant="outlined"
          color={params.value ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: "curveMode",
      headerName: "Curve Mode",
      width: 150,
      editable: true,
      type: "singleSelect",
      valueOptions: ["Mathematician", "Linear", "Triangular"],
      renderCell: (params) => (
        <Chip 
          label={params.value || 'Mathematician'} 
          size="small" 
          variant="outlined"
          color="secondary"
        />
      ),
    },
    {
      field: "truckDate",
      headerName: "Truck Date ⬇",
      width: 140,
      editable: true,
      type: "date",
      sortable: true,
      valueGetter: (params: GridValueGetterParams) => {
        // Return Date object for MUI DataGrid date column type
        return params.row.truckDate ? new Date(params.row.truckDate) : null;
      },
      valueSetter: (params) => {
        return { ...params.row, truckDate: params.value ? new Date(params.value).toISOString().split('T')[0] : null };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.row.truckDate ? dayjs(params.row.truckDate).format('DD/MM/YYYY') : 'Not set'}
        </Typography>
      ),
    },
    {
      field: "weeksBefore",
      headerName: "Lead (wks)",
      width: 120,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "probability",
      headerName: "Probability",
      width: 120,
      editable: true,
      type: "singleSelect",
      valueOptions: probabilityOptions.map(p => ({ value: p / 100, label: `${p}%` })),
      valueGetter: (params: GridValueGetterParams) => {
        return params.value ? params.value * 100 : 0;
      },
      valueSetter: (params) => {
        return { ...params.row, probability: (params.value || 0) / 100 };
      },
      renderCell: (params) => {
        const value = params.value || 0;
        return (
          <Chip 
            label={`${value.toFixed(0)}%`} 
            size="small" 
            color={value >= 80 ? 'success' : value >= 60 ? 'warning' : 'error'}
            variant="outlined"
          />
        );
      },
    },
    // Skill columns with better validation
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
        const newHoursBySkill = { ...params.row.hoursBySkill, CNC: Math.max(0, params.value || 0) };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newHoursBySkill = { ...params.row.hoursBySkill, Build: Math.max(0, params.value || 0) };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newHoursBySkill = { ...params.row.hoursBySkill, Paint: Math.max(0, params.value || 0) };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newHoursBySkill = { ...params.row.hoursBySkill, AV: Math.max(0, params.value || 0) };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newHoursBySkill = { ...params.row.hoursBySkill, "Pack & Load": Math.max(0, params.value || 0) };
        return { ...params.row, hoursBySkill: newHoursBySkill };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newOnsite = { ...params.row.onsite, hours: Math.max(0, params.value || 0) };
        return { ...params.row, onsite: newOnsite };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
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
        const newOnsite = { ...params.row.onsite, weeks: Math.max(0, params.value || 0) };
        return { ...params.row, onsite: newOnsite };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : '#9ca3af',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => {
            window.location.href = `/job-data/${params.row._id}`;
          }}
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

  // Transform data for DataGrid with default sorting
  const rows = useMemo(() => {
    const transformed = currentProjects?.map((project: any) => ({
      ...project,
      hoursBySkill: project.hoursBySkill || {},
      onsite: project.onsite || { hours: 0, weeks: 0 },
    })) || [];
    
    // Sort by truck date (most recent first)
    return transformed.sort((a: any, b: any) => {
      if (!a.truckDate && !b.truckDate) return 0;
      if (!a.truckDate) return 1;
      if (!b.truckDate) return -1;
      return new Date(b.truckDate).getTime() - new Date(a.truckDate).getTime();
    });
  }, [currentProjects]);

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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setCsvImportOpen(true)}
                sx={{
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5a6fd8',
                    backgroundColor: 'rgba(102, 126, 234, 0.08)'
                  }
                }}
              >
                Import CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<ArchiveIcon />}
                onClick={() => setShowArchived(!showArchived)}
                sx={{
                  borderColor: showArchived ? '#dc3545' : '#667eea',
                  color: showArchived ? '#dc3545' : '#667eea',
                  '&:hover': {
                    borderColor: showArchived ? '#c82333' : '#5a6fd8',
                    backgroundColor: showArchived ? 'rgba(220, 53, 69, 0.08)' : 'rgba(102, 126, 234, 0.08)'
                  }
                }}
              >
                {showArchived ? 'Show Active' : 'Show Archived'}
              </Button>
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
          </Box>
          
          {/* Status Summary */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#495057', fontWeight: 600 }}>
                Project Status Summary
              </Typography>
              <Chip 
                label="Sorted by Truck Date (Latest First)" 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#28a745', fontWeight: 700 }}>
                  {activeProjects.filter(hasEnoughData).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Active Projects (Complete Data)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#ffc107', fontWeight: 700 }}>
                  {activeProjects.filter(p => !hasEnoughData(p)).length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Active Projects (Incomplete Data)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#6c757d', fontWeight: 700 }}>
                  {archivedProjects.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6c757d' }}>
                  Archived Projects
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ height: "calc(100vh - 400px)", width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
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
              getRowClassName={(params: GridRowParams) => {
                return hasEnoughData(params.row) ? '' : 'incomplete-project';
              }}
              initialState={{
                sorting: {
                  sortModel: [
                    {
                      field: 'truckDate',
                      sort: 'desc'
                    }
                  ]
                }
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
                "& .incomplete-project": {
                  backgroundColor: "#f8f9fa",
                  color: "#6c757d",
                  "&:hover": {
                    backgroundColor: "#e9ecef",
                  },
                },
                "& .incomplete-project .MuiDataGrid-cell": {
                  color: "#6c757d",
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
                required
                helperText="Project name is required"
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
                  <MenuItem value="Mathematician">Mathematician (Bell Curve)</MenuItem>
                  <MenuItem value="Linear">Linear (Even Distribution)</MenuItem>
                  <MenuItem value="Triangular">Triangular (Peak in Middle)</MenuItem>
                </Select>
                <FormHelperText>
                  Mathematician: Bell curve distribution, Linear: Even distribution, Triangular: Peak in middle
                </FormHelperText>
              </FormControl>
              <TextField
                label="Truck Date"
                type="date"
                value={editingProject.truckDate || ''}
                onChange={(e) => setEditingProject({ ...editingProject, truckDate: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                helperText="Date when project is delivered to site"
              />
              <TextField
                label="Lead Weeks"
                type="number"
                value={editingProject.weeksBefore || 0}
                onChange={(e) => setEditingProject({ ...editingProject, weeksBefore: Number(e.target.value) })}
                fullWidth
                required
                inputProps={{ min: 0, step: 1 }}
                helperText="Number of weeks before truck date to start work"
              />
              <FormControl fullWidth>
                <InputLabel>Probability</InputLabel>
                <Select
                  value={editingProject.probability ? editingProject.probability * 100 : 90}
                  onChange={(e) => setEditingProject({ ...editingProject, probability: Number(e.target.value) / 100 })}
                  label="Probability"
                >
                  {probabilityOptions.map((p) => (
                    <MenuItem key={p} value={p}>{p}%</MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Probability of project proceeding (0-100%)
                </FormHelperText>
              </FormControl>
              
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
                  inputProps={{ min: 0, step: 0.5 }}
                  helperText={`Total hours required for ${skill} work`}
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
                  inputProps={{ min: 0, step: 0.5 }}
                  helperText="Total hours for onsite work"
                />
                <TextField
                  label="Onsite Weeks"
                  type="number"
                  value={editingProject.onsite?.weeks || 0}
                  onChange={(e) => setEditingProject({
                    ...editingProject,
                    onsite: { ...editingProject.onsite, weeks: Number(e.target.value) }
                  })}
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Number of weeks for onsite work"
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

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onClose={() => setCsvImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Projects from CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: '#6c757d', mb: 2 }}>
              Upload a CSV file with project data. The file should include columns for:
              Project Name, Truck Date, Lead Weeks, Probability, and hours for each skill.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile((e.target as HTMLInputElement).files?.[0] || null)}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <FormHelperText>
              Supported format: CSV with headers matching the project fields
            </FormHelperText>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCsvImportOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCsvImport} 
            variant="contained"
            disabled={!csvFile || csvImportMutation.isPending}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            {csvImportMutation.isPending ? <><CircularProgress size={18} sx={{ mr: 1, color: 'white' }} /> Importing...</> : 'Import CSV'}
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
