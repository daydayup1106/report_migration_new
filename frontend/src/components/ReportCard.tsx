import { FileText, Calendar, User, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Report } from '@/types';
import StatusBadge from './StatusBadge';

interface Props {
  report: Report;
  compact?: boolean;
  onClick?: () => void;
}

function formatTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export default function ReportCard({ report, compact = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl bg-gray-50 border border-gray-200 p-5 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-slate-900 font-medium truncate group-hover:text-blue-600 transition-colors">
              {report.reportName}
            </h4>
            <span className="flex-shrink-0 text-xs text-slate-400 font-mono">#{report.reportId}</span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {report.reportType && (
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {report.reportType}
              </span>
            )}
            {!compact && (
              <>
                <span>•</span>
                <span>{report.columns.length} columns</span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatTime(report.updatedAt)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {report.updatedBy}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <StatusBadge status="completed" />
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}
