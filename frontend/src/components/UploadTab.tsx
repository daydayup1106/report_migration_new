import { useState, useEffect } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  RotateCcw,
  ArrowRight,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import ValidationFindings from '@/components/ValidationFindings';
import ColumnsDetailModal from '@/components/ColumnsDetailModal';
import ParametersDetailModal from '@/components/ParametersDetailModal';
import type { UploadResponse, ValidationResult } from '@/types';
import { reportService } from '@/services/api';

interface Props {
  onNavigate: (tab: string) => void;
  onSelectReport: (reportId: string) => void;
}

// ─── Pending Confirmation Card ─────────────────────────────
function PendingConfirmation({
  result,
  onConfirm,
  onCancel,
  isConfirming,
}: {
  result: UploadResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showParametersModal, setShowParametersModal] = useState(false);
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    if (result.validation) setValidation(result.validation);

    const fetchReport = async () => {
      try {
        const reportData = result.sessionId
          ? await reportService.getPendingReport(result.sessionId)
          : await reportService.getReport(result.reportId);
        setReport(reportData);
      } catch (err) {
        console.error('Failed to fetch report details:', err);
      }
    };

    if (result.reportId || result.sessionId) {
      fetchReport();
    }
  }, [result]);

  const hasErrors = validation && validation.errorCount > 0;
  const hasWarnings = validation && validation.warningCount > 0;

  return (
    <div className="space-y-6">
      {/* Warning header */}
      <div
        className={`flex items-center gap-4 p-5 rounded-xl border ${
          hasErrors
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        {hasErrors ? (
          <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-900 font-semibold">Validation Issues Found</h3>
          <p className="text-sm text-slate-500 mt-0.5">{result.message}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: hasErrors ? 'Errors' : 'Warnings',
            value: hasErrors ? validation?.errorCount : validation?.warningCount,
            icon: hasErrors ? XCircle : AlertTriangle,
            color: hasErrors ? 'text-red-500' : 'text-amber-500',
            clickable: false,
          },
          {
            label: 'Columns',
            value: result.columnsCount,
            icon: FileText,
            color: 'text-blue-600',
            clickable: true,
            onClick: () => setShowColumnsModal(true),
          },
          {
            label: 'Parameters',
            value: result.parametersCount,
            icon: Sparkles,
            color: 'text-purple-600',
            clickable: true,
            onClick: () => setShowParametersModal(true),
          },
        ].map((s) => (
          <div
            key={s.label}
            onClick={s.clickable ? s.onClick : undefined}
            className={`rounded-xl bg-gray-50 border border-gray-200 p-4 text-center transition-all ${
              s.clickable
                ? 'cursor-pointer hover:bg-white hover:border-gray-300 hover:shadow-sm hover:scale-105'
                : ''
            }`}
          >
            <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            {s.clickable && (
              <p className="text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100">
                Click to view
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Validation findings */}
      {validation && (
        <ValidationFindings
          validation={validation}
          reportId={result.reportId}
          sessionId={result.sessionId}
          onValidationUpdate={setValidation}
        />
      )}

      {/* Confirmation message */}
      <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-slate-900 font-medium mb-1">Review Required</h4>
            <p className="text-sm text-slate-500">
              {hasErrors
                ? 'Critical errors were found. Please review the issues above. You can fix them using Quick Fix or choose to save anyway.'
                : 'Warnings were found. Please review the suggestions above. You can address them or continue with saving.'}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isConfirming || hasErrors}
          className="flex-1 px-5 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isConfirming}
          className="px-5 py-3 bg-white text-slate-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {/* Modals */}
      {showColumnsModal && report && (
        <ColumnsDetailModal
          columns={report.columns}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {showParametersModal && report && (
        <ParametersDetailModal
          parameters={report.parameters}
          onClose={() => setShowParametersModal(false)}
        />
      )}
    </div>
  );
}

// ─── Result Card ────────────────────────────────────────────
function UploadResult({
  result,
  onViewReport,
  onReset,
}: {
  result: UploadResponse;
  onViewReport: (reportId: string) => void;
  onReset: () => void;
}) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [currentReportId, setCurrentReportId] = useState(result.reportId);

  useEffect(() => {
    if (result.validation) setValidation(result.validation);
    setCurrentReportId(result.reportId);
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-center gap-4 p-5 rounded-xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-900 font-semibold">{result.message}</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Report{' '}
            <span className={`font-mono ${currentReportId.startsWith('temp-') ? 'text-amber-600' : 'text-blue-600'}`}>
              #{currentReportId || '(pending)'}
            </span>
            {currentReportId.startsWith('temp-') && (
              <span className="text-xs text-amber-500 ml-1.5">(temporary — use Fix to set a proper ID)</span>
            )}
            {' '}saved to database
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Columns', value: result.columnsCount, icon: FileText },
          { label: 'Parameters', value: result.parametersCount, icon: Sparkles },
          { label: 'Environments', value: result.rolesCount, icon: CheckCircle2 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-center"
          >
            <s.icon className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Validation findings */}
      {validation && (
        <ValidationFindings
          validation={validation}
          reportId={currentReportId}
          onValidationUpdate={setValidation}
          onReportIdChange={setCurrentReportId}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onViewReport(currentReportId)}
          className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
        >
          View Report
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onReset}
          className="px-5 py-3 bg-white text-slate-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Upload Another
        </button>
      </div>
    </div>
  );
}

// ─── Drag Zone ──────────────────────────────────────────────
function DragZone({
  isUploading,
  fileName,
  onDragOver,
  onDrop,
  onClick,
}: {
  isUploading: boolean;
  fileName: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const [isDragActive, setDragActive] = useState(false);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
      <div
        onDragOver={(e) => {
          onDragOver(e);
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          setDragActive(false);
          onDrop(e);
        }}
        onClick={isUploading ? undefined : onClick}
        className={`
          relative rounded-2xl border-2 border-dashed p-16 text-center transition-all
          ${isUploading ? 'cursor-wait' : 'cursor-pointer'}
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
          }
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Processing...</h3>
            <p className="text-slate-500 text-sm">
              Parsing Excel, enhancing with AI, validating metadata
            </p>
            {fileName && (
              <p className="mt-3 text-sm font-mono text-blue-600">{fileName}</p>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Drop Excel files here</h3>
            <p className="text-slate-500 mb-6">or click to browse</p>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
              <span>Supported: .xlsx, .xls</span>
              <span>-</span>
              <span>Max size: 10MB</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Generate Example Dialog ────────────────────────────────
function GenerateExampleDialog({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (reportName: string, reportId: string) => void;
}) {
  const getRandomExample = () => {
    const reportNames = [
      'Sales Metrics Report',
      'Customer Analytics Dashboard',
      'Financial Summary Report',
      'Marketing Performance Report',
      'Operational Metrics Report',
      'Revenue Analysis Report',
      'User Engagement Report',
      'Product Performance Report',
    ];
    const randomName = reportNames[Math.floor(Math.random() * reportNames.length)];
    const randomId = String(Math.floor(100000 + Math.random() * 900000));
    return { name: randomName, id: randomId };
  };

  const [example] = useState(() => getRandomExample());
  const [reportName, setReportName] = useState('');
  const [reportId, setReportId] = useState('');
  const [error, setError] = useState('');

  const handleReportIdChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    const limited = digitsOnly.slice(0, 6);
    setReportId(limited);
    if (limited.length > 0 && limited.length !== 6) {
      setError('Report ID must be exactly 6 digits');
    } else {
      setError('');
    }
  };

  const handleGenerate = () => {
    if (reportName.trim() && reportId.trim() && reportId.length === 6) {
      onGenerate(reportName.trim(), reportId.trim());
    }
  };

  const isValid = reportName.trim() && reportId.length === 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Generate Example Excel</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Name
            </label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder={`e.g., ${example.name}`}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report ID <span className="text-slate-400 text-xs">(6 digits)</span>
            </label>
            <input
              type="text"
              value={reportId}
              onChange={(e) => handleReportIdChange(e.target.value)}
              placeholder={`e.g., ${example.id}`}
              maxLength={6}
              className={`w-full px-4 py-2 bg-white border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                error ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500 focus:border-blue-300'
              }`}
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={!isValid}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Generate
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-slate-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Upload Tab ────────────────────────────────────────
export default function UploadTab({ onSelectReport }: Props) {
  const {
    stage,
    file,
    result,
    error,
    fileInputRef,
    reset,
    confirm,
    onDragOver,
    onDrop,
    onFileSelect,
    openFilePicker,
    isUploading,
    isPending,
    isConfirming,
  } = useUpload();

  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  const handleGenerateExample = async (reportName: string, reportId: string) => {
    try {
      const response = await fetch('/api/upload/generate-example', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportName, reportId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate example');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `example_${reportId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowGenerateDialog(false);
    } catch (err) {
      console.error('Failed to generate example:', err);
      alert('Failed to generate example Excel file');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1" />
          <h2 className="text-3xl font-bold text-slate-900 flex-1">Upload Reports</h2>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setShowGenerateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Generate Example
            </button>
          </div>
        </div>
        <p className="text-slate-500">Drop your Excel files here for AI-powered processing</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={onFileSelect}
        className="hidden"
      />

      {/* Conditional content */}
      {stage === 'pending' && result ? (
        <PendingConfirmation
          result={result}
          onConfirm={confirm}
          onCancel={reset}
          isConfirming={isConfirming}
        />
      ) : stage === 'success' && result ? (
        <UploadResult
          result={result}
          onViewReport={(reportId) => onSelectReport(reportId)}
          onReset={reset}
        />
      ) : (
        <>
          <DragZone
            isUploading={isUploading || isConfirming}
            fileName={file?.name ?? null}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={openFilePicker}
          />

          {/* Error */}
          {stage === 'error' && error && (
            <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={reset}
                className="ml-auto text-sm text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* AI hint */}
          {!isUploading && !isConfirming && stage !== 'error' && (
            <div className="mt-8 p-6 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex gap-4">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-slate-900 font-medium mb-1">AI-Powered Validation</h4>
                  <p className="text-sm text-slate-500">
                    Claude will automatically validate metadata, detect issues,
                    generate descriptions, and provide actionable suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Generate Example Dialog */}
      {showGenerateDialog && (
        <GenerateExampleDialog
          onClose={() => setShowGenerateDialog(false)}
          onGenerate={handleGenerateExample}
        />
      )}
    </div>
  );
}
