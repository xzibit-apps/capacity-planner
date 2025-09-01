import { RowDoc } from "@/models/Row";
import { SheetSlug } from "@/configs/sheets";

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
  id: string;
  changes: Record<string, any>;
}

export interface DeleteRowRequest {
  id: string;
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
export interface DataGridRow extends ApiRow {
  id: string;
}

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
