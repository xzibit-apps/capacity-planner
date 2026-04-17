'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type CurveStatus = 'Draft' | 'Active' | 'Archived';
type StatusFilter = 'All' | CurveStatus;

interface CurveShape {
  progressValues: number[];
  curveValues: number[];
  normalizationValue: number;
}

interface Curve {
  curveId: string;
  version: string;
  jobType: string;
  taskType: string;
  curveStatus: CurveStatus | string;
  weeklyPercentages: CurveShape | string;
  description?: string | null;
  derivedFrom?: string | null;
  curveFamily?: string | null;
  specSource?: string | null;
  fitQuality?: number | null;
  specValidated?: boolean;
  isRegistryDefault: boolean;
  updatedAt?: string | null;
}

interface CurvesResponse {
  curves: Curve[];
  counts: Record<string, number>;
  total: number;
}

const STATUS_COLOR: Record<string, 'warning' | 'success' | 'default'> = {
  Draft: 'warning',
  Active: 'success',
  Archived: 'default',
};

async function fetchCurves(): Promise<CurvesResponse> {
  const res = await fetch('/api/curves', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load curves');
  return res.json();
}

async function updateCurveStatus(curveId: string, status: CurveStatus) {
  const res = await fetch(`/api/curves/${encodeURIComponent(curveId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Update failed');
  }
  return res.json();
}

export default function CurveReviewPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<CurvesResponse>({
    queryKey: ['curves'],
    queryFn: fetchCurves,
  });

  const [filter, setFilter] = useState<StatusFilter>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ curveId, status }: { curveId: string; status: CurveStatus }) =>
      updateCurveStatus(curveId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['curves'] }),
  });

  const curves = data?.curves ?? [];
  const counts = data?.counts ?? {};

  const filtered = useMemo(() => {
    if (filter === 'All') return curves;
    return curves.filter((c) => c.curveStatus === filter);
  }, [curves, filter]);

  const selected = useMemo(
    () => curves.find((c) => c.curveId === selectedId) ?? null,
    [curves, selectedId]
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{(error as Error).message}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Curve Review</Typography>
        <Typography variant="body2" color="text.secondary">
          {data?.total ?? 0} total · {counts.Draft ?? 0} Draft · {counts.Active ?? 0} Active ·{' '}
          {counts.Archived ?? 0} Archived
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Draft curves are invisible to the planning engine (it falls back to a flat distribution).
        Activate a curve to make it live; archive to retire it.
      </Alert>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_, value: StatusFilter | null) => {
          if (value) setFilter(value);
        }}
        sx={{ mb: 2 }}
      >
        <ToggleButton value="All">All</ToggleButton>
        <ToggleButton value="Draft">Draft</ToggleButton>
        <ToggleButton value="Active">Active</ToggleButton>
        <ToggleButton value="Archived">Archived</ToggleButton>
      </ToggleButtonGroup>

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job Type</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Curve ID</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Registry default</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((curve) => (
              <TableRow hover key={curve.curveId}>
                <TableCell>{curve.jobType}</TableCell>
                <TableCell>{curve.taskType}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {curve.curveId}
                </TableCell>
                <TableCell>{curve.version}</TableCell>
                <TableCell>
                  <Chip
                    label={curve.curveStatus}
                    color={STATUS_COLOR[curve.curveStatus] ?? 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{curve.isRegistryDefault ? 'Yes' : '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setSelectedId(curve.curveId)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No curves match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <CurveDetailDialog
        curve={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={(status) => {
          if (selected) mutation.mutate({ curveId: selected.curveId, status });
        }}
        busy={mutation.isPending}
        errorMessage={mutation.error ? (mutation.error as Error).message : null}
      />
    </Container>
  );
}

function parseShape(weeklyPercentages: CurveShape | string): CurveShape {
  if (typeof weeklyPercentages === 'string') {
    try {
      return JSON.parse(weeklyPercentages);
    } catch {
      return { progressValues: [], curveValues: [], normalizationValue: 1 };
    }
  }
  return weeklyPercentages;
}

function CurveDetailDialog({
  curve,
  onClose,
  onStatusChange,
  busy,
  errorMessage,
}: {
  curve: Curve | null;
  onClose: () => void;
  onStatusChange: (status: CurveStatus) => void;
  busy: boolean;
  errorMessage: string | null;
}) {
  const chartData = useMemo(() => {
    if (!curve) return [];
    const shape = parseShape(curve.weeklyPercentages);
    return (shape.progressValues || []).map((p, i) => ({
      progress: Math.round(p * 100),
      intensity: Number(shape.curveValues?.[i] ?? 0),
    }));
  }, [curve]);

  if (!curve) return null;

  return (
    <Dialog open={!!curve} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" component="span">
            {curve.jobType} · {curve.taskType}
          </Typography>
          <Chip
            label={curve.curveStatus}
            size="small"
            color={STATUS_COLOR[curve.curveStatus] ?? 'default'}
          />
        </Stack>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {curve.curveId} · {curve.version}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: 280, mt: 1, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="progress"
                label={{ value: 'Project progress %', position: 'insideBottom', offset: -8 }}
              />
              <YAxis label={{ value: 'Intensity', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="intensity" stroke="#764ba2" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            <strong>Spec source:</strong> {curve.specSource || '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Curve family:</strong> {curve.curveFamily || '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Fit quality:</strong> {curve.fitQuality ?? '—'}
          </Typography>
          <Typography variant="body2">
            <strong>Registry default:</strong> {curve.isRegistryDefault ? 'Yes' : 'No'}
          </Typography>
          {curve.description && (
            <Typography variant="body2" color="text.secondary">
              {curve.description}
            </Typography>
          )}
        </Stack>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {curve.curveStatus !== 'Archived' && (
          <Button onClick={() => onStatusChange('Archived')} disabled={busy} color="inherit">
            Archive
          </Button>
        )}
        {curve.curveStatus !== 'Draft' && (
          <Button onClick={() => onStatusChange('Draft')} disabled={busy}>
            Mark Draft
          </Button>
        )}
        {curve.curveStatus !== 'Active' && (
          <Button
            onClick={() => onStatusChange('Active')}
            disabled={busy}
            variant="contained"
            color="success"
          >
            Activate
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
