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

// Extended finding with fixed state
interface ExtendedFinding extends ValidationFinding {
  fixed?: boolean;
}

// ─── Score Ring ──────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke="currentColor" strokeWidth="4" className="text-white/10"
        />
        <circle
          cx="32" cy="32" r={radius} fill="none"
          stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
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
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
  warning: {
    label: 'Warnings',
    sublabel: 'should fix',
    Icon: AlertCircle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  info: {
    label: 'Suggestions',
    sublabel: 'optional',
    Icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400',
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

  // Count active (not fixed) findings
  const activeCount = findings.filter(f => !f.fixed).length;
  const fixedCount = findings.filter(f => f.fixed).length;

  if (findings.length === 0) return null;

  return (
    <div className={`rounded-xl ${config.bg} border ${config.border}`}>
      {/* Section header (clickable) */}
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
        <span className="text-sm font-medium text-white">
          {activeCount} {config.label}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
          {config.sublabel}
        </span>
        {fixedCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 ml-auto">
            {fixedCount} fixed
          </span>
        )}
      </button>

      {/* Findings list */}
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {findings.map((finding, i) => (
            <div
              key={i}
              className={`pl-8 flex items-start gap-2 ${
                finding.fixed ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                {/* Field path */}
                {finding.field && (
                  <p className={`text-xs font-mono ${config.text} mb-0.5 flex items-center gap-2`}>
                    {finding.field}
                    {finding.fixed && (
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Fixed
                      </span>
                    )}
                  </p>
                )}
                {/* Message */}
                <p className={`text-sm ${finding.fixed ? 'text-white/50 line-through' : 'text-white/90'}`}>
                  {finding.message}
                </p>
                {/* Suggestion */}
                {finding.suggestion && !finding.fixed && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    {finding.suggestion}
                  </p>
                )}
              </div>
              {/* Fix button — only if not fixed and field is known and onFixClick is provided */}
              {!finding.fixed && finding.field && onFixClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFixClick(finding);
                  }}
                  className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                             bg-white/[0.06] hover:bg-white/[0.12] text-blue-400 hover:text-blue-300
                             border border-white/5 hover:border-blue-500/30 transition-all"
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

  // Track fixed findings by comparing old vs new validation
  useEffect(() => {
    // Create a map of current findings by field+message
    const currentFindingsMap = new Map(
      validation.findings.map(f => [`${f.field || 'root'}:${f.message}`, f])
    );

    // Mark previous findings as fixed if they're no longer in current findings
    const updated: ExtendedFinding[] = allFindings.map(prevFinding => {
      const key = `${prevFinding.field || 'root'}:${prevFinding.message}`;
      const stillExists = currentFindingsMap.has(key);

      if (!stillExists && !prevFinding.fixed) {
        // This finding was fixed!
        return { ...prevFinding, fixed: true };
      }
      return prevFinding;
    });

    // Add new findings that weren't there before
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

  // Initialize on first render
  useEffect(() => {
    if (allFindings.length === 0 && validation.findings.length > 0) {
      setAllFindings(validation.findings.map(f => ({ ...f, fixed: false })));
    }
  }, []);

  const errors = allFindings.filter((f) => f.severity === 'error');
  const warnings = allFindings.filter((f) => f.severity === 'warning');
  const infos = allFindings.filter((f) => f.severity === 'info');

  // Allow empty-string reportId (e.g. blockrock file has blank reportId but is still in DB)
  const canFix = reportId !== undefined && !!onValidationUpdate;

  const handleFixClick = (finding: ValidationFinding) => {
    // Check if this is a duplicate column finding
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
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6 space-y-5">
      {/* Header: score ring + summary */}
      <div className="flex items-center gap-6">
        <ScoreRing score={validation.score} />
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium mb-1">Validation Score</h4>
          {validation.summary && (
            <p className="text-sm text-slate-400">{validation.summary}</p>
          )}
          {validation.aiValidated && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-3 h-3" />
              AI Validated
            </span>
          )}
        </div>
      </div>

      {/* Severity sections */}
      {validation.findings.length > 0 && (
        <div className="space-y-3">
          <FindingSection
            severity="error"
            findings={errors}
            defaultOpen={true}
            onFixClick={canFix ? handleFixClick : undefined}
          />
          <FindingSection
            severity="warning"
            findings={warnings}
            defaultOpen={errors.length === 0}
            onFixClick={canFix ? handleFixClick : undefined}
          />
          <FindingSection
            severity="info"
            findings={infos}
            defaultOpen={false}
            onFixClick={canFix ? handleFixClick : undefined}
          />
        </div>
      )}

      {/* All clear */}
      {validation.findings.length === 0 && (
        <p className="text-sm text-emerald-400 text-center py-2">
          No issues found — report metadata is complete.
        </p>
      )}

      {/* Quick Fix Dialog */}
      {activeFinding && reportId !== undefined && (
        <QuickFixDialog
          reportId={reportId}
          sessionId={sessionId}
          finding={activeFinding}
          onClose={() => setActiveFinding(null)}
          onFixed={handleFixed}
        />
      )}

      {/* Duplicate Column Resolver */}
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
