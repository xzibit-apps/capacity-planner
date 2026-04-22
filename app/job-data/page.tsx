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
  FormHelperText,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Visibility as VisibilityIcon, Upload as UploadIcon, Archive as ArchiveIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

// Project status values in the DB are dirty — mixed case ("Quote Sent"
// vs "quote sent"), trailing whitespace, nulls. Normalize here before
// mapping to the standard's .pill variants.
//   confirmed / completed / won / approved  → mint   (good / live)
//   quote sent / quote in progress           → sky    (pencilled)
//   tbq / production quote                   → amber  (at risk / pending)
//   not progressing                          → coral  (blocked)
//   null / unknown                           → muted  (neutral)
// TODO follow-up: data-cleanup pass on cp_projects.status.
function projectStatusPillClass(status: string | null | undefined): string {
  const s = (status || '').trim().toLowerCase();
  if (!s) return 'pill pill--muted';
  if (['confirmed', 'completed', 'won', 'approved'].includes(s)) return 'pill pill--mint';
  if (['quote sent', 'quote in progress'].includes(s)) return 'pill pill--sky';
  if (['tbq', 'production quote'].includes(s)) return 'pill pill--amber';
  if (s === 'not progressing') return 'pill pill--coral';
  return 'pill pill--muted';
}

function probabilityPillClass(percent: number): string {
  if (percent >= 80) return 'pill pill--mint';
  if (percent >= 60) return 'pill pill--amber';
  return 'pill pill--coral';
}

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
      if (project.truckLoadDate && new Date(project.truckLoadDate) < now) {
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
    return project.truckLoadDate && 
           project.weeksToBuild !== undefined && 
           project.weeksToBuild > 0 &&
           (project.build > 0 || project.cnc > 0 || project.paint > 0 || project.av > 0 || project.packAndLoad > 0);
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
      jobNumber: '',
      jobName: '',
      truckLoadDate: dayjs().format('YYYY-MM-DD'),
      weeksToBuild: 4,
      cnc: 0,
      build: 0,
      paint: 0,
      av: 0,
      packAndLoad: 0,
      tradeOnsite: 0,
      onsiteWeeks: 0,
      probability: 0.9,
      status: null
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    const projectToSave = {
      ...editingProject,
      truckLoadDate: editingProject.truckLoadDate || null
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
      field: "jobNumber",
      headerName: "Job#",
      width: 100,
      editable: true,
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 'No Job#'}
        </Typography>
      ),
    },
    {
      field: "jobName",
      headerName: "Job name",
      width: 250,
      editable: true,
      renderCell: (params) => (
        <Box
          sx={{
            cursor: 'pointer',
            color: hasEnoughData(params.row) ? 'primary.main' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400,
            '&:hover': {
              textDecoration: 'underline',
              color: hasEnoughData(params.row) ? 'primary.dark' : 'var(--xz-ink-500)',
            },
          }}
          onClick={() => {
            window.location.href = `/job-data/${params.row._id}`;
          }}
        >
          {params.value || 'Unnamed project'}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 200,
      editable: true,
      type: "singleSelect",
      valueOptions: ["confirmed", "completed", "TBQ", "quote sent", "Quote in progress", "production quote", "won", "Not progressing", "approved"],
      renderCell: (params) => (
        <span className={projectStatusPillClass(params.value)}>
          {params.value || 'None'}
        </span>
      ),
    },

    {
      field: "truckLoadDate",
      headerName: "MUST FILL Truck Load Date",
      width: 180,
      editable: true,
      type: "date",
      sortable: true,
      valueGetter: (params: GridValueGetterParams) => {
        // Return Date object for MUI DataGrid date column type
        return params.row.truckLoadDate ? new Date(params.row.truckLoadDate) : null;
      },
      valueSetter: (params) => {
        return { ...params.row, truckLoadDate: params.value ? new Date(params.value).toISOString().split('T')[0] : null };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.row.truckLoadDate ? dayjs(params.row.truckLoadDate).format('DD/MM/YYYY') : 'Not set'}
        </Typography>
      ),
    },
    {
      field: "weeksToBuild",
      headerName: "Weeks to Build in Wkshop",
      width: 180,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
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
          <span className={probabilityPillClass(value)}>
            {`${value.toFixed(0)}%`}
          </span>
        );
      },
    },
    // Individual skill columns
    {
      field: "cnc",
      headerName: "CNC",
      width: 80,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "build",
      headerName: "Build",
      width: 80,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "paint",
      headerName: "Paint",
      width: 80,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "av",
      headerName: "AV",
      width: 80,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "packAndLoad",
      headerName: "Pack & Load",
      width: 100,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "tradeOnsite",
      headerName: "Trade Onsite",
      width: 120,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "onsiteWeeks",
      headerName: "Onsite Weeks (WHOLE NUMBERS)",
      width: 180,
      editable: true,
      type: "number",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 0}
        </Typography>
      ),
    },
    {
      field: "installDeadline",
      headerName: "Install Deadline",
      width: 150,
      editable: true,
      type: "date",
      valueGetter: (params: GridValueGetterParams) => {
        return params.row.installDeadline ? new Date(params.row.installDeadline) : null;
      },
      valueSetter: (params) => {
        return { ...params.row, installDeadline: params.value ? new Date(params.value).toISOString().split('T')[0] : null };
      },
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.row.installDeadline ? dayjs(params.row.installDeadline).format('DD/MM/YYYY') : 'Not set'}
        </Typography>
      ),
    },
    {
      field: "hrsEstOnly",
      headerName: "Hrs est. only?",
      width: 120,
      editable: true,
      type: "boolean",
      renderCell: (params) => (
        <span className={params.value ? 'pill pill--amber' : 'pill pill--muted'}>
          {params.value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      field: "pm",
      headerName: "PM",
      width: 100,
      editable: true,
      type: "string",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400
          }}
        >
          {params.value || 'No PM'}
        </Typography>
      ),
    },
    {
      field: "notes",
      headerName: "Notes",
      width: 300,
      editable: true,
      type: "string",
      renderCell: (params) => (
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasEnoughData(params.row) ? 'inherit' : 'var(--xz-ink-400)',
            fontWeight: hasEnoughData(params.row) ? 500 : 400,
            maxWidth: '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={params.value || ''}
        >
          {params.value || 'No notes'}
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
        truckLoadDate: newRow.truckLoadDate instanceof Date 
          ? newRow.truckLoadDate.toISOString().split('T')[0] 
          : newRow.truckLoadDate
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
    })) || [];
    
    // Sort by truck load date (most recent first)
    return transformed.sort((a: any, b: any) => {
      if (!a.truckLoadDate && !b.truckLoadDate) return 0;
      if (!a.truckLoadDate) return 1;
      if (!b.truckLoadDate) return -1;
      return new Date(b.truckLoadDate).getTime() - new Date(a.truckLoadDate).getTime();
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
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Project management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setCsvImportOpen(true)}
              >
                Import CSV
              </Button>
              <ToggleButtonGroup
                value={showArchived ? 'archived' : 'active'}
                exclusive
                size="small"
                onChange={(_, value) => {
                  if (value === 'active') setShowArchived(false);
                  if (value === 'archived') setShowArchived(true);
                }}
              >
                <ToggleButton value="active">Active</ToggleButton>
                <ToggleButton value="archived">Archived</ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
              >
                Add new project
              </Button>
            </Box>
          </Box>

          {/* Status Summary */}
          <Box sx={{
            mb: 3,
            p: 2,
            backgroundColor: 'var(--xz-surface-soft)',
            borderRadius: 2,
            border: '1px solid var(--xz-hairline)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'var(--xz-ink)', fontWeight: 600 }}>
                Project status summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <span className="pill pill--sky">Sorted by truck load date (latest first)</span>
                <span className="pill pill--lilac">Curve selection moved to dashboard</span>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'var(--xz-mint-700)', fontWeight: 700 }}>
                  {activeProjects.filter(hasEnoughData).length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                  Active projects (complete data)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'var(--xz-amber-700)', fontWeight: 700 }}>
                  {activeProjects.filter(p => !hasEnoughData(p)).length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                  Active projects (incomplete data)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: 'var(--xz-ink-500)', fontWeight: 700 }}>
                  {archivedProjects.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)' }}>
                  Archived projects
                </Typography>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ height: "calc(100vh - 400px)", minHeight: 400, width: "100%", minWidth: 400 }}>
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
                       field: 'truckLoadDate',
                       sort: 'desc'
                     }
                   ]
                 }
               }}
              sx={{
                '& .MuiDataGrid-row.Mui-selected': {
                  backgroundColor: 'var(--xz-teal-50)',
                },
                '& .MuiDataGrid-row.Mui-selected:hover': {
                  backgroundColor: 'var(--xz-teal-50)',
                },
                '& .incomplete-project': {
                  backgroundColor: 'var(--xz-surface-soft)',
                  color: 'var(--xz-ink-500)',
                },
                '& .incomplete-project .MuiDataGrid-cell': {
                  color: 'var(--xz-ink-500)',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProject?._id ? 'Edit project' : 'Add new project'}
        </DialogTitle>
        <DialogContent>
          {editingProject && (
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
                             <TextField
                 label="Job Number"
                 value={editingProject.jobNumber || ''}
                 onChange={(e) => setEditingProject({ ...editingProject, jobNumber: e.target.value })}
                 fullWidth
                 required
                 helperText="Job number is required"
               />
               <TextField
                 label="Job Name"
                 value={editingProject.jobName || ''}
                 onChange={(e) => setEditingProject({ ...editingProject, jobName: e.target.value })}
                 fullWidth
                 required
                 helperText="Job name is required"
               />
                             <FormControl fullWidth>
                 <InputLabel>Status</InputLabel>
                 <Select
                   value={editingProject.status || ''}
                   onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                   label="Status"
                 >
                   <MenuItem value="">(none)</MenuItem>
                   <MenuItem value="confirmed">confirmed</MenuItem>
                   <MenuItem value="completed">completed</MenuItem>
                   <MenuItem value="TBQ">TBQ</MenuItem>
                   <MenuItem value="quote sent">quote sent</MenuItem>
                   <MenuItem value="Quote in progress">Quote in progress</MenuItem>
                   <MenuItem value="production quote">production quote</MenuItem>
                   <MenuItem value="won">won</MenuItem>
                   <MenuItem value="Not progressing">Not progressing</MenuItem>
                   <MenuItem value="approved">approved</MenuItem>
                 </Select>
               </FormControl>

                             <TextField
                 label="Truck Load Date"
                 type="date"
                 value={editingProject.truckLoadDate || ''}
                 onChange={(e) => setEditingProject({ ...editingProject, truckLoadDate: e.target.value })}
                 fullWidth
                 required
                 InputLabelProps={{ shrink: true }}
                 helperText="Date when project is delivered to site"
               />
                             <TextField
                 label="Weeks to Build in Wkshop"
                 type="number"
                 value={editingProject.weeksToBuild || 0}
                 onChange={(e) => setEditingProject({ ...editingProject, weeksToBuild: Number(e.target.value) })}
                 fullWidth
                 required
                 inputProps={{ min: 0, step: 1 }}
                 helperText="Number of weeks to build in workshop"
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
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField
                    label="CNC Hours"
                    type="number"
                    value={editingProject.cnc || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, cnc: Number(e.target.value) })}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="CNC work hours"
                  />
                  <TextField
                    label="Build Hours"
                    type="number"
                    value={editingProject.build || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, build: Number(e.target.value) })}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="Build work hours"
                  />
                  <TextField
                    label="Paint Hours"
                    type="number"
                    value={editingProject.paint || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, paint: Number(e.target.value) })}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="Paint work hours"
                  />
                  <TextField
                    label="AV Hours"
                    type="number"
                    value={editingProject.av || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, av: Number(e.target.value) })}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="AV work hours"
                  />
                  <TextField
                    label="Pack & Load Hours"
                    type="number"
                    value={editingProject.packAndLoad || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, packAndLoad: Number(e.target.value) })}
                    inputProps={{ min: 0, step: 0.5 }}
                    helperText="Pack & Load work hours"
                  />
                </Box>
              
                             <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Onsite</Typography>
               <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                 <TextField
                   label="Trade Onsite Hours"
                   type="number"
                   value={editingProject.tradeOnsite || 0}
                   onChange={(e) => setEditingProject({
                     ...editingProject,
                     tradeOnsite: Number(e.target.value)
                   })}
                   inputProps={{ min: 0, step: 0.5 }}
                   helperText="Total hours for trade onsite work"
                 />
                 <TextField
                   label="Onsite Weeks"
                   type="number"
                   value={editingProject.onsiteWeeks || 0}
                   onChange={(e) => setEditingProject({
                     ...editingProject,
                     onsiteWeeks: Number(e.target.value)
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
          >
            {isSaving ? <><CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} /> Saving…</> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onClose={() => setCsvImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import projects from CSV</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'var(--xz-ink-500)', mb: 2 }}>
              Upload a CSV file with project data. The file should include columns for:
              Job Number, Job Name, Truck Load Date, Weeks to Build, Probability, CNC, Build, Paint, AV, Pack & Load, Trade Onsite, and Onsite Weeks.
            </Typography>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile((e.target as HTMLInputElement).files?.[0] || null)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--xz-hairline)',
                borderRadius: 'var(--xz-r-sm)',
              }}
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
          >
            {csvImportMutation.isPending ? <><CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} /> Importing…</> : 'Import CSV'}
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
