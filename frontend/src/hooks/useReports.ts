import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '@/services/api';
import type { Report } from '@/types';

// ─── Query Keys ──────────────────────────────────────────────
const keys = {
  all: ['reports'] as const,
  list: (params: Record<string, unknown>) => [...keys.all, 'list', params] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
  types: () => [...keys.all, 'types'] as const,
};

// ─── List Reports ────────────────────────────────────────────
export function useReports(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  reportType?: string;
  sortBy?: string;
  sortOrder?: string;
} = {}) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => reportService.getReports(params),
  });
}

// ─── Single Report ───────────────────────────────────────────
export function useReport(reportId: string | null) {
  return useQuery({
    queryKey: keys.detail(reportId!),
    queryFn: () => reportService.getReport(reportId!),
    enabled: !!reportId,
  });
}

// ─── Report Types ────────────────────────────────────────────
export function useReportTypes() {
  return useQuery({
    queryKey: keys.types(),
    queryFn: () => reportService.getReportTypes(),
  });
}

// ─── Update Report ───────────────────────────────────────────
export function useUpdateReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, data }: { reportId: string; data: Partial<Report> }) =>
      reportService.updateReport(reportId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.detail(variables.reportId) });
    },
  });
}

// ─── Delete Report ───────────────────────────────────────────
export function useDeleteReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportService.deleteReport(reportId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

// ─── Download Report JSON ────────────────────────────────────
export function useDownloadReport() {
  return useMutation({
    mutationFn: (reportId: string) => reportService.downloadReportJson(reportId),
  });
}

// ─── Download All Report Files as ZIP ───────────────────────
export function useDownloadReportAllFiles() {
  return useMutation({
    mutationFn: (reportId: string) => reportService.downloadReportAllFiles(reportId),
  });
}
