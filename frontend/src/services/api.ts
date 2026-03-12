import axios from 'axios';
import type {
  Report,
  ReportListResponse,
  Role,
  UploadResponse,
  Statistics,
  DashboardStats,
  FixFieldRequest,
  FixFieldResponse,
  RemoveDuplicateColumnsRequest,
  RemoveDuplicateColumnsResponse,
} from '@/types';

const api = axios.create({
  baseURL: 'http://localhost:9000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const reportService = {
  // Upload
  uploadExcel: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  confirmUpload: async (sessionId: string): Promise<UploadResponse> => {
    const response = await api.post('/upload/confirm', { sessionId });
    return response.data;
  },

  // Reports
  getReports: async (params: {
    page?: number;
    pageSize?: number;
    search?: string;
    reportType?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ReportListResponse> => {
    const response = await api.get('/reports', { params });
    return response.data;
  },

  getReport: async (reportId: string): Promise<Report> => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  getPendingReport: async (sessionId: string): Promise<Report> => {
    const response = await api.get(`/reports/pending/${sessionId}`);
    return response.data;
  },

  updateReport: async (reportId: string, data: Partial<Report>): Promise<Report> => {
    const response = await api.put(`/reports/${reportId}`, data);
    return response.data;
  },

  deleteReport: async (reportId: string): Promise<void> => {
    await api.delete(`/reports/${reportId}`);
  },

  fixField: async (data: FixFieldRequest): Promise<FixFieldResponse> => {
    const response = await api.post('/reports/fix-field', data);
    return response.data;
  },

  removeDuplicateColumns: async (data: RemoveDuplicateColumnsRequest): Promise<RemoveDuplicateColumnsResponse> => {
    const response = await api.post('/reports/remove-duplicate-columns', data);
    return response.data;
  },

  downloadReportJson: async (reportId: string): Promise<void> => {
    const response = await api.get(`/reports/${reportId}/download`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportId}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  downloadReportAllFiles: async (reportId: string): Promise<void> => {
    const response = await api.get(`/reports/${reportId}/download-all`, {
      responseType: 'blob',
    });

    // Create download link for ZIP
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportId}_export.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  getReportTypes: async (): Promise<string[]> => {
    const response = await api.get('/reports/types/list');
    return response.data;
  },

  // Roles
  getAllRoles: async (reportId: string): Promise<Role[]> => {
    const response = await api.get(`/roles/${reportId}`);
    return response.data;
  },

  getRole: async (reportId: string, environment: string): Promise<Role> => {
    const response = await api.get(`/roles/${reportId}/${environment}`);
    return response.data;
  },

  updateRole: async (
    reportId: string,
    environment: string,
    data: Partial<Role>
  ): Promise<Role> => {
    const response = await api.put(`/roles/${reportId}/${environment}`, data);
    return response.data;
  },

  downloadRoleJson: async (reportId: string, environment: string): Promise<void> => {
    const response = await api.get(`/roles/${reportId}/${environment}/download`, {
      responseType: 'blob',
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `roles-${environment}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Statistics
  getStatistics: async (): Promise<Statistics> => {
    const response = await api.get('/stats');
    return response.data.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/stats/dashboard');
    return response.data;
  },
};

export default api;
