import { useState, useEffect } from 'react';
import { X, Wand2, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { ValidationFinding, ValidationResult } from '@/types';
import { reportService } from '@/services/api';

interface QuickFixDialogProps {
  reportId: string;
  sessionId?: string;
  finding: ValidationFinding;
  onClose: () => void;
  onFixed: (validation: ValidationResult, newReportId?: string) => void;
}

type FixState = 'idle' | 'applying' | 'success' | 'error';

export default function QuickFixDialog({
  reportId,
  sessionId,
  finding,
  onClose,
  onFixed,
}: QuickFixDialogProps) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<FixState>('idle');
  const [message, setMessage] = useState('');
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);

  const fieldName = finding.field || 'unknown';

  // Fetch current value on mount
  useEffect(() => {
    const fetchCurrentValue = async () => {
      try {
        setLoadingCurrent(true);
        const report = sessionId
          ? await reportService.getPendingReport(sessionId)
          : await reportService.getReport(reportId);

        // Extract current value based on field path
        let current: any = null;
        if (fieldName.includes('[')) {
          // Handle indexed fields like "columns[0].columnName"
          const match = fieldName.match(/^(columns|parameters)\[(\d+)\]\.(\w+)$/);
          if (match) {
            const [, collection, index, subField] = match;
            const items = collection === 'columns' ? report.columns : report.parameters;
            if (items && items[parseInt(index)]) {
              current = items[parseInt(index)][subField as keyof typeof items[number]];
            }
          }
        } else {
          // Top-level field
          current = (report as any)[fieldName];
        }

        setCurrentValue(current || '(blank)');
      } catch (err) {
        console.error('Failed to fetch current value:', err);
        setCurrentValue('(unable to load)');
      } finally {
        setLoadingCurrent(false);
      }
    };

    fetchCurrentValue();
  }, [reportId, sessionId, fieldName]);

  const handleApply = async () => {
    if (!value.trim()) {
      setState('error');
      setMessage('Please enter a value.');
      return;
    }

    setState('applying');
    setMessage('');

    try {
      const response = await reportService.fixField({
        reportId,
        sessionId,
        field: fieldName,
        value: value.trim(),
      });

      if (response.valid && response.validation) {
        setState('success');
        setMessage(response.message);
        // Notify parent with updated validation (and new reportId if it changed)
        setTimeout(() => {
          onFixed(
            response.validation!,
            fieldName === 'reportId' ? response.newValue : undefined,
          );
          onClose();
        }, 1200);
      } else {
        setState('error');
        setMessage(response.message);
      }
    } catch (err: unknown) {
      setState('error');
      const errorMsg =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setMessage(errorMsg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state !== 'applying') {
      handleApply();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-medium">
              Fix: <span className="font-mono text-blue-400">{fieldName}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current value */}
        <div className="text-sm">
          <span className="text-slate-400">Current value: </span>
          {loadingCurrent ? (
            <span className="text-slate-500 italic">Loading...</span>
          ) : (
            <span className="text-white font-mono bg-white/5 px-2 py-1 rounded">
              {currentValue || '(blank)'}
            </span>
          )}
        </div>

        {/* Hint from suggestion */}
        {finding.suggestion && (
          <div className="text-xs text-slate-500 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/5">
            Hint: {finding.suggestion}
          </div>
        )}

        {/* Input */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">New value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (state === 'error') {
                setState('idle');
                setMessage('');
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={finding.suggestion || `Enter ${fieldName}...`}
            disabled={state === 'applying' || state === 'success'}
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/10 text-white text-sm
                       placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20
                       disabled:opacity-50 transition-colors"
          />
        </div>

        {/* Status message */}
        {message && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              state === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {state === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={state === 'applying'}
            className="px-4 py-2 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-white/5
                       disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={state === 'applying' || state === 'success' || !value.trim()}
            className="px-4 py-2 text-sm rounded-lg font-medium
                       bg-blue-600 hover:bg-blue-500 text-white
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2 transition-colors"
          >
            {state === 'applying' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Applying...
              </>
            ) : state === 'success' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Done
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Apply Fix
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
