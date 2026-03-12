// Type definitions for the application

export interface Column {
  columnName: string;
  columnDescription: string;
  originalColumnName: string;
  dataType: string;
}

export interface Parameter {
  parameterName: string;
  originalColumnName: string;
  parameterType: string;
  parameterValue?: string;
}

export interface TabContent {
  contentName: string;
  contentDescription: string;
}

export interface Tab {
  tabName: string;
  tabDescription: string;
  tabType: string;
  tabContent: TabContent[];
}

export interface Report {
  _id?: string;
  reportId: string;
  reportName: string;
  reportDescription?: string;
  reportType?: string;
  reportFormatSpecId?: string;
  reportDomainId?: string;
  reportBuilder?: string;
  columns: Column[];
  parameters: Parameter[];
  tabs?: Tab[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface RoleAvailability {
  user: string;
  SystemAdminOnly: string;
  tester: string;
}

export interface Role {
  _id?: string;
  reportId: string;
  reportName: string;
  environment: 'dev' | 'sit' | 'uat' | 'prod';
  reportRoleId: number;
  reportAvailable: RoleAvailability;
  createdAt: string;
  updatedAt: string;
}

export interface ReportListResponse {
  reports: Report[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Validation Types ────────────────────────────────────────

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ValidationCategory =
  | 'structure'
  | 'duplicates'
  | 'data_types'
  | 'descriptions'
  | 'naming'
  | 'completeness'
  | 'semantic';

export interface ValidationFinding {
  severity: ValidationSeverity;
  category: ValidationCategory;
  field: string | null;
  message: string;
  suggestion: string | null;
}

export interface ValidationResult {
  score: number;
  findings: ValidationFinding[];
  summary: string;
  isComplete: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  aiValidated: boolean;
}

// ─── Quick Fix Types ─────────────────────────────────────────

export interface FixFieldRequest {
  reportId: string;
  field: string;
  value: string;
}

export interface FixFieldResponse {
  valid: boolean;
  field: string;
  currentValue: string | null;
  newValue: string;
  message: string;
  validation: ValidationResult | null;
}

export interface RemoveDuplicateColumnsRequest {
  reportId: string;
  sessionId?: string;
  indicesToRemove: number[];
}

export interface RemoveDuplicateColumnsResponse {
  success: boolean;
  message: string;
  validation: ValidationResult | null;
}

export interface UploadResponse {
  success: boolean;
  pending?: boolean;
  sessionId?: string;
  reportId: string;
  reportName: string;
  reportType?: string;
  columnsCount: number;
  parametersCount: number;
  rolesCount: number;
  validation: ValidationResult;
  message: string;
}

export interface Statistics {
  totalReports: number;
  reportsToday: number;
  typeDistribution: Array<{
    _id: string;
    count: number;
  }>;
}

export interface DashboardStats {
  totalReports: {
    value: number;
    label: string;
    change: string | null;
  };
  reportsToday: {
    value: number;
    label: string;
    change: string;
  };
  topTypes: Array<{
    type: string;
    count: number;
  }>;
}
