import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import type { ValidationResult, ValidationFinding, ValidationSeverity } from '@/types';
import QuickFixDialog from './QuickFixDialog';
import DuplicateColumnResolver from './DuplicateColumnResolver';

interface ExtendedFinding extends ValidationFinding {
  fixed?: boolean;
}

// ─── Score Ring ──────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke="#e5e7eb" strokeWidth="4"
        />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900">
        {score}
      </span>
    </div>
  );
}

// ─── Severity configuration ──────────────────────────────────
const SEVERITY_CONFIG: Record<
  ValidationSeverity,
  {
    label: string;
    sublabel: string;
    Icon: typeof AlertTriangle;
    bg: string;
    border: string;
    text: string;
    badge: string;
  }
> = {
  error: {
    label: 'Errors',
    sublabel: 'must fix',
    Icon: AlertTriangle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    badge: 'bg-red-100 text-red-600',
  },
  warning: {
    label: 'Warnings',
    sublabel: 'should fix',
    Icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-600',
  },
  info: {
    label: 'Suggestions',
    sublabel: 'optional',
    Icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-600',
  },
};

// ─── Severity Section ────────────────────────────────────────
function FindingSection({
  severity,
  findings,
  defaultOpen,
  onFixClick,
}: {
  severity: ValidationSeverity;
  findings: ExtendedFinding[];
  defaultOpen: boolean;
  onFixClick?: (finding: ValidationFinding) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const config = SEVERITY_CONFIG[severity];
  const { Icon } = config;

  const activeCount = findings.filter(f => !f.fixed).length;
  const fixedCount = findings.filter(f => f.fixed).length;

  if (findings.length === 0) return null;

  return (
    <div className={`rounded-xl ${config.bg} border ${config.border}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {open ? (
          <ChevronDown className={`w-4 h-4 ${config.text}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 ${config.text}`} />
        )}
        <Icon className={`w-4 h-4 ${config.text}`} />
        <span className="text-sm font-medium text-slate-900">
          {activeCount} {config.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.sublabel}
        </span>
        {fixedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 ml-auto">
            {fixedCount} fixed
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {findings.map((finding, i) => (
            <div
              key={i}
              className={`pl-8 flex items-start gap-2 ${finding.fixed ? 'opacity-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                {finding.field && (
                  <p className={`text-xs font-mono ${config.text} mb-0.5 flex items-center gap-2`}>
                    {finding.field}
                    {finding.fixed && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        Fixed
                      </span>
                    )}
                  </p>
                )}
                <p className={`text-sm ${finding.fixed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                  {finding.message}
                </p>
                {finding.suggestion && !finding.fixed && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    {finding.suggestion}
                  </p>
                )}
              </div>
              {!finding.fixed && finding.field && onFixClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFixClick(finding);
                  }}
                  className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                             bg-white hover:bg-gray-50 text-blue-600 hover:text-blue-700
                             border border-gray-200 hover:border-blue-300 transition-all"
                  title={`Fix ${finding.field}`}
                >
                  <Wand2 className="w-3 h-3" />
                  Fix
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
export default function ValidationFindings({
  validation,
  reportId,
  sessionId,
  onValidationUpdate,
  onReportIdChange,
}: {
  validation: ValidationResult;
  reportId?: string;
  sessionId?: string;
  onValidationUpdate?: (v: ValidationResult) => void;
  onReportIdChange?: (newId: string) => void;
}) {
  const [activeFinding, setActiveFinding] = useState<ValidationFinding | null>(null);
  const [duplicateFinding, setDuplicateFinding] = useState<ValidationFinding | null>(null);
  const [allFindings, setAllFindings] = useState<ExtendedFinding[]>([]);

  useEffect(() => {
    const currentFindingsMap = new Map(
      validation.findings.map(f => [`${f.field || 'root'}:${f.message}`, f])
    );

    const updated: ExtendedFinding[] = allFindings.map(prevFinding => {
      const key = `${prevFinding.field || 'root'}:${prevFinding.message}`;
      const stillExists = currentFindingsMap.has(key);
      if (!stillExists && !prevFinding.fixed) {
        return { ...prevFinding, fixed: true };
      }
      return prevFinding;
    });

    validation.findings.forEach(finding => {
      const key = `${finding.field || 'root'}:${finding.message}`;
      const existed = allFindings.some(
        f => `${f.field || 'root'}:${f.message}` === key
      );
      if (!existed) {
        updated.push({ ...finding, fixed: false });
      }
    });

    setAllFindings(updated);
  }, [validation.findings]);

  useEffect(() => {
    if (allFindings.length === 0 && validation.findings.length > 0) {
      setAllFindings(validation.findings.map(f => ({ ...f, fixed: false })));
    }
  }, []);

  const errors = allFindings.filter((f) => f.severity === 'error');
  const warnings = allFindings.filter((f) => f.severity === 'warning');
  const infos = allFindings.filter((f) => f.severity === 'info');

  const canFix = reportId !== undefined && !!onValidationUpdate;

  const handleFixClick = (finding: ValidationFinding) => {
    const isDuplicateColumn =
      finding.field === 'columns' &&
      (finding.message.toLowerCase().includes('duplicate column display name') ||
       finding.message.toLowerCase().includes('duplicate database column name'));

    if (isDuplicateColumn) {
      setDuplicateFinding(finding);
    } else {
      setActiveFinding(finding);
    }
  };

  const handleFixed = (newValidation: ValidationResult, newReportId?: string) => {
    onValidationUpdate?.(newValidation);
    if (newReportId && onReportIdChange) {
      onReportIdChange(newReportId);
    }
    setActiveFinding(null);
  };

  return (
    <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 space-y-5">
      {/* Header: score ring + summary */}
      <div className="flex items-center gap-6">
        <ScoreRing score={validation.score} />
        <div className="flex-1 min-w-0">
          <h4 className="text-slate-900 font-medium mb-1">Validation Score</h4>
          {validation.summary && (
            <p className="text-sm text-slate-500">{validation.summary}</p>
          )}
          {validation.aiValidated && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              <Sparkles className="w-3 h-3" />
              AI Validated
            </span>
          )}
        </div>
      </div>

      {/* Severity sections */}
      {validation.findings.length > 0 && (
        <div className="space-y-3">
          <FindingSection severity="error" findings={errors} defaultOpen={true} onFixClick={canFix ? handleFixClick : undefined} />
          <FindingSection severity="warning" findings={warnings} defaultOpen={errors.length === 0} onFixClick={canFix ? handleFixClick : undefined} />
          <FindingSection severity="info" findings={infos} defaultOpen={false} onFixClick={canFix ? handleFixClick : undefined} />
        </div>
      )}

      {validation.findings.length === 0 && (
        <p className="text-sm text-emerald-600 text-center py-2">
          No issues found — report metadata is complete.
        </p>
      )}

      {activeFinding && reportId !== undefined && (
        <QuickFixDialog
          reportId={reportId}
          sessionId={sessionId}
          finding={activeFinding}
          onClose={() => setActiveFinding(null)}
          onFixed={handleFixed}
        />
      )}

      {duplicateFinding && reportId !== undefined && (
        <DuplicateColumnResolver
          reportId={reportId}
          sessionId={sessionId}
          duplicateMessage={duplicateFinding.message}
          onClose={() => setDuplicateFinding(null)}
          onResolved={(newValidation) => {
            onValidationUpdate?.(newValidation);
            setDuplicateFinding(null);
          }}
        />
      )}
    </div>
  );
}

export { ScoreRing };
