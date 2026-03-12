import { useState } from 'react';
import {
  X,
  Download,
  FileText,
  Database,
  Settings,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { useReport, useDownloadReportAllFiles } from '@/hooks/useReports';
import type { Report, Column, Parameter } from '@/types';
import Spinner from './Spinner';

interface Props {
  reportId: string;
  onClose: () => void;
}

// ─── Tabs ───────────────────────────────────────────────────
type DetailTab = 'columns' | 'parameters' | 'meta';

const tabItems: { key: DetailTab; label: string; icon: typeof FileText }[] = [
  { key: 'columns', label: 'Columns', icon: Database },
  { key: 'parameters', label: 'Parameters', icon: Settings },
  { key: 'meta', label: 'Metadata', icon: FileText },
];

// ─── Columns Table ──────────────────────────────────────────
function ColumnsTable({ columns }: { columns: Column[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="divide-y divide-white/5">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div className="col-span-3">Column Name</div>
        <div className="col-span-3">Original Name</div>
        <div className="col-span-2">Data Type</div>
        <div className="col-span-4">Description</div>
      </div>

      {/* Rows */}
      {columns.map((col) => (
        <div key={col.originalColumnName}>
          <div
            onClick={() => setExpanded(expanded === col.originalColumnName ? null : col.originalColumnName)}
            className="grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
          >
            <div className="col-span-3 text-white font-medium truncate">{col.columnName}</div>
            <div className="col-span-3 text-slate-400 font-mono text-xs truncate">{col.originalColumnName}</div>
            <div className="col-span-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                {col.dataType}
              </span>
            </div>
            <div className="col-span-4 flex items-center gap-2 min-w-0">
              <span className="text-slate-400 truncate">{col.columnDescription || '—'}</span>
              {col.columnDescription && (
                expanded === col.originalColumnName
                  ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Expanded description */}
          {expanded === col.originalColumnName && col.columnDescription && (
            <div className="px-4 pb-3">
              <p className="text-sm text-slate-300 bg-white/[0.03] rounded-lg p-3 border border-white/5">
                {col.columnDescription}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Parameters Table ───────────────────────────────────────
function ParametersTable({ parameters }: { parameters: Parameter[] }) {
  if (parameters.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">No parameters defined</div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      <div className="grid grid-cols-4 gap-4 px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div>Parameter</div>
        <div>Original Name</div>
        <div>Type</div>
        <div>Value</div>
      </div>
      {parameters.map((p) => (
        <div key={p.parameterName} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm hover:bg-white/[0.03] transition-colors">
          <div className="text-white font-medium">{p.parameterName}</div>
          <div className="text-slate-400 font-mono text-xs">{p.originalColumnName}</div>
          <div>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
              {p.parameterType}
            </span>
          </div>
          <div className="text-slate-400 font-mono text-xs">{p.parameterValue || '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Metadata Panel ─────────────────────────────────────────
function MetadataPanel({ report }: { report: Report }) {
  const [copied, setCopied] = useState(false);

  const fields = [
    { label: 'Report ID', value: report.reportId },
    { label: 'Report Name', value: report.reportName },
    { label: 'Report Type', value: report.reportType },
    { label: 'Description', value: report.reportDescription },
    { label: 'Format Spec ID', value: report.reportFormatSpecId },
    { label: 'Domain ID', value: report.reportDomainId },
    { label: 'Builder', value: report.reportBuilder },
    { label: 'Created By', value: report.createdBy },
    { label: 'Created At', value: report.createdAt },
    { label: 'Updated By', value: report.updatedBy },
    { label: 'Updated At', value: report.updatedAt },
  ];

  const handleCopyJson = async () => {
    const clean = { ...report };
    delete (clean as Record<string, unknown>)['_id'];
    await navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleCopyJson}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {fields.map(
          (f) =>
            f.value && (
              <div key={f.label} className="flex py-3 px-1">
                <span className="w-40 flex-shrink-0 text-sm text-slate-500">{f.label}</span>
                <span className="text-sm text-white break-all">{f.value}</span>
              </div>
            ),
        )}
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────
export default function ReportDetailModal({ reportId, onClose }: Props) {
  const { data: report, isLoading, error } = useReport(reportId);
  const download = useDownloadReportAllFiles();
  const [activeTab, setActiveTab] = useState<DetailTab>('columns');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="min-w-0">
            {isLoading ? (
              <div className="h-6 w-64 rounded bg-white/10 animate-pulse" />
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white truncate">
                  {report?.reportName}
                </h2>
                <span className="flex-shrink-0 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                  #{reportId}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <button
              onClick={() => download.mutate(reportId)}
              disabled={download.isPending || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-all disabled:opacity-50"
              title="Download all report files as ZIP (report.json, roles.json, config.json, ui_settings.json)"
            >
              <Download className={`w-4 h-4 ${download.isPending ? 'animate-bounce' : ''}`} />
              Download ZIP
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {tabItems.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.key === 'columns' && report && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-xs">{report.columns.length}</span>
              )}
              {t.key === 'parameters' && report && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10 text-xs">{report.parameters.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <Spinner />
          ) : error ? (
            <div className="py-12 text-center text-red-400">Failed to load report details.</div>
          ) : report ? (
            <>
              {activeTab === 'columns' && <ColumnsTable columns={report.columns} />}
              {activeTab === 'parameters' && <ParametersTable parameters={report.parameters} />}
              {activeTab === 'meta' && <MetadataPanel report={report} />}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
