import { Upload, FileText, CheckCircle2, ChevronRight, Sparkles, Database } from 'lucide-react';
import { useDashboardStats, useRecentReports } from '@/hooks/useDashboard';
import ReportCard from './ReportCard';
import Spinner from './Spinner';
import EmptyState from './EmptyState';

interface Props {
  onNavigate: (tab: string) => void;
  onSelectReport: (reportId: string) => void;
}

export default function DashboardTab({ onNavigate, onSelectReport }: Props) {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recent, isLoading: recentLoading } = useRecentReports(5);

  const statCards = [
    {
      label: stats?.totalReports?.label ?? 'Total Reports',
      value: stats?.totalReports?.value ?? 0,
      change: stats?.totalReports?.change,
      icon: FileText,
    },
    {
      label: stats?.reportsToday?.label ?? 'Processed Today',
      value: stats?.reportsToday?.value ?? 0,
      change: stats?.reportsToday?.change,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          AI-Powered Report Processing
        </div>
        <h2 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Transform Your Reports
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
          Automatically migrate, enrich, and manage your report metadata with Claude AI
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => onNavigate('upload')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Reports
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="px-6 py-3 bg-white text-slate-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            Browse Library
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        {statsLoading
          ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 border border-gray-200 p-6 h-28 animate-pulse" />
            ))
          : statCards.map((stat, idx) => (
              <div
                key={idx}
                className="relative group overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-500 text-sm font-medium">{stat.label}</span>
                    <stat.icon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-slate-900">{stat.value}</span>
                    {stat.change && (
                      <span className="text-emerald-600 text-sm font-medium mb-1">{stat.change}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* ─── Recent Activity ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Recent Activity</h3>
          <button
            onClick={() => onNavigate('reports')}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            View All
          </button>
        </div>

        {recentLoading ? (
          <Spinner />
        ) : !recent?.reports?.length ? (
          <EmptyState
            icon={Database}
            title="No reports yet"
            description="Upload your first Excel file to get started with AI-powered report migration."
            action={{ label: 'Upload Report', onClick: () => onNavigate('upload') }}
          />
        ) : (
          <div className="space-y-3">
            {recent.reports.map((report) => (
              <ReportCard
                key={report.reportId}
                report={report}
                compact
                onClick={() => onSelectReport(report.reportId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
