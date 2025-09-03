import { RowDoc } from "@/models/Row";

// Sheet types
export type SheetSlug = 'capacity' | 'demand' | 'supply' | 'projects' | 'staff';

// API Response types
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Row types
export interface ApiRow extends Omit<RowDoc, '_id'> {
  _id: string;
}

export interface CreateRowRequest {
  data: Record<string, any>;
}

export interface UpdateRowRequest {
  _id: string;
  changes: Record<string, any>;
}

export interface DeleteRowRequest {
  _id: string;
}

// Sync types
export interface SyncRequest {
  sheets?: string[];
}

export interface SyncResponse {
  success: boolean;
  message: string;
  details?: any;
}

// DataGrid types
export interface DataGridRow extends ApiRow {}

// Sheet configuration types
export interface SheetConfig {
  name: string;
  slug: SheetSlug;
}

// Column configuration types
export interface ColumnConfig {
  field: string;
  headerName: string;
  type?: 'string' | 'number' | 'date';
  editable?: boolean;
  width?: number;
  flex?: number;
}

// Environment variables
export interface EnvVars {
  MONGODB_URI: string;
  GOOGLE_SHEET_ID: string;
  GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
}

// Google Sheets types
export interface GoogleSheetRow {
  rowNumber: number;
  data: Record<string, any>;
}

export interface GoogleSheetData {
  columns: string[];
  rows: GoogleSheetRow[];
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// Snackbar types
export type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
}

// JobType types
export interface JobType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobTypeRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateJobTypeRequest {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

// Project types
export interface Project {
  _id: string;
  jobNumber: string;
  jobName: string;
  jobType?: string; // Reference to JobType _id
  truckLoadDate?: string;
  weeksToBuild: number;
  status?: string;
  probability?: number;
  // Individual skill columns from the sheet
  cnc: number;
  build: number;
  paint: number;
  av: number;
  packAndLoad: number;
  tradeOnsite: number;
  onsiteWeeks: number;
  installDeadline?: string;
  hrsEstOnly?: boolean;
  pm?: string;
  notes?: string;
  curveMode?: 'Mathematician' | 'Linear' | 'Triangular';
  createdAt: Date;
  updatedAt: Date;
}
