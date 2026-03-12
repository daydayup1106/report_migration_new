import { useState, useMemo } from 'react';
import {
  Upload,
  Search,
  FileText,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useReports, useDownloadReport } from '@/hooks/useReports';
import type { Report } from '@/types';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

interface Props {
  onNavigate: (tab: string) => void;
  onSelectReport: (reportId: string) => void;
}

// ─── Debounce helper ────────────────────────────────────────
function useDebounced(value: string, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useMemo(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

// ─── Single Report Row ──────────────────────────────────────
function ReportRow({
  report,
  onView,
  onDownload,
  isDownloading,
}: {
  report: Report;
  onView: () => void;
  onDownload: () => void;
  isDownloading: boolean;
}) {
  function formatTime(iso: string) {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return iso;
    }
  }

  return (
    <div className="group rounded-xl bg-gray-50 border border-gray-200 p-6 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {report.reportName}
            </h3>
            <span className="flex-shrink-0 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-600 text-xs font-mono">
              #{report.reportId}
            </span>
          </div>

          {/* Description */}
          {report.reportDescription && (
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{report.reportDescription}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            {report.reportType && (
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {report.reportType}
              </span>
            )}
            <span>•</span>
            <span className="font-medium text-slate-700">{report.columns.length} columns</span>
            <span>•</span>
            <span>Updated {formatTime(report.updatedAt)} by {report.updatedBy}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onView}
              className="px-4 py-1.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </button>
            <button
              onClick={onDownload}
              disabled={isDownloading}
              className="px-4 py-1.5 rounded-lg bg-white text-slate-700 text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Reports Tab ───────────────────────────────────────
export default function ReportsTab({ onNavigate, onSelectReport }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const debouncedSearch = useDebounced(search);

  const { data, isLoading } = useReports({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });

  const download = useDownloadReport();

  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Reports Library</h2>
          <p className="text-slate-500">
            {total > 0 ? `${total} report${total !== 1 ? 's' : ''} in database` : 'Browse and manage your migrated reports'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload New
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, ID, type, or description…"
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <Spinner />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Database}
          title={search ? 'No reports found' : 'No reports yet'}
          description={
            search
              ? `No reports match "${search}". Try a different search term.`
              : 'Upload your first Excel file to get started.'
          }
          action={search ? undefined : { label: 'Upload Report', onClick: () => onNavigate('upload') }}
        />
      ) : (
        <>
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportRow
                key={report.reportId}
                report={report}
                onView={() => onSelectReport(report.reportId)}
                onDownload={() => download.mutate(report.reportId)}
                isDownloading={download.isPending && download.variables === report.reportId}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-500">
                Page <span className="text-slate-900 font-medium">{page}</span> of{' '}
                <span className="text-slate-900 font-medium">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
