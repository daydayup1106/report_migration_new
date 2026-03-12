import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Column, ValidationResult } from '@/types';
import { reportService } from '@/services/api';

interface DuplicateColumnResolverProps {
  reportId: string;
  sessionId?: string;
  duplicateMessage: string; // e.g., "Duplicate column display name: 'customer_id' appears 2 times."
  onClose: () => void;
  onResolved: (validation: ValidationResult) => void;
}

type ResolverState = 'loading' | 'selecting' | 'applying' | 'success' | 'error';

interface DuplicateGroup {
  name: string;
  columns: Array<Column & { index: number }>;
}

export default function DuplicateColumnResolver({
  reportId,
  sessionId,
  duplicateMessage,
  onClose,
  onResolved,
}: DuplicateColumnResolverProps) {
  const [state, setState] = useState<ResolverState>('loading');
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState('');

  // Extract duplicate name from message
  const extractDuplicateName = (msg: string): string => {
    const match = msg.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  };

  // Fetch report columns to show duplicate details
  useEffect(() => {
    const fetchColumns = async () => {
      try {
        setState('loading');

        // Fetch from pending or saved report
        const report = sessionId
          ? await reportService.getPendingReport(sessionId)
          : await reportService.getReport(reportId);

        // Extract the duplicate name from the validation message
        const dupName = extractDuplicateName(duplicateMessage).toLowerCase();

        if (!dupName) {
          setState('error');
          setMessage('Could not identify duplicate column name.');
          return;
        }

        // Check if report has columns
        if (!report.columns || !Array.isArray(report.columns)) {
          setState('error');
          setMessage('Report columns not found.');
          return;
        }

        // Find all columns with this name
        const duplicates: Array<Column & { index: number }> = [];
        report.columns.forEach((col, idx) => {
          if (col.columnName.toLowerCase().trim() === dupName) {
            duplicates.push({ ...col, index: idx });
          }
        });

        if (duplicates.length < 2) {
          setState('error');
          setMessage('Duplicate columns not found. They may have been fixed already.');
          return;
        }

        setDuplicateGroups([{ name: dupName, columns: duplicates }]);
        setState('selecting');
      } catch (err: any) {
        setState('error');
        setMessage(err.message || 'Failed to load column details.');
      }
    };

    fetchColumns();
  }, [reportId, sessionId, duplicateMessage]);

  const handleSelect = (index: number) => {
    setSelectedIndices(new Set([index])); // Only allow one selection
  };

  const handleApply = async () => {
    if (selectedIndices.size === 0) {
      setMessage('Please select which column to keep.');
      return;
    }

    setState('applying');
    setMessage('');

    try {
      const selectedIndex = Array.from(selectedIndices)[0];
      const group = duplicateGroups[0];

      // Get indices of columns to remove (all except selected)
      const indicesToRemove = group.columns
        .filter(col => col.index !== selectedIndex)
        .map(col => col.index);

      // Call backend to remove duplicate columns
      const response = await reportService.removeDuplicateColumns({
        reportId,
        sessionId,
        indicesToRemove,
      });

      if (response.validation) {
        setState('success');
        setMessage('Duplicate columns removed successfully.');
        setTimeout(() => {
          onResolved(response.validation!);
        }, 800);
      } else {
        setState('error');
        setMessage('Failed to update validation.');
      }
    } catch (err: any) {
      setState('error');
      setMessage(err.message || 'Failed to remove duplicates.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              Resolve Duplicate Columns
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={state === 'applying'}
            className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
              <p className="text-sm text-slate-400">Loading column details...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{message}</p>
            </div>
          )}

          {(state === 'selecting' || state === 'applying' || state === 'success') && duplicateGroups.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Found <span className="text-white font-medium">{duplicateGroups[0].columns.length}</span> columns
                with the same display name "<span className="text-amber-400 font-mono">{duplicateGroups[0].name}</span>".
                Select which one to keep, and the others will be removed.
              </p>

              {/* Column cards */}
              <div className="space-y-3">
                {duplicateGroups[0].columns.map((col) => (
                  <div
                    key={col.index}
                    onClick={() => state === 'selecting' && handleSelect(col.index)}
                    className={`
                      p-4 rounded-xl border-2 transition-all cursor-pointer
                      ${selectedIndices.has(col.index)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                      }
                      ${state !== 'selecting' && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div className={`
                        mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${selectedIndices.has(col.index)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-white/30'
                        }
                      `}>
                        {selectedIndices.has(col.index) && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Column details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium text-white">
                            {col.columnName}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                            Index: {col.index}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm">
                          <div className="flex">
                            <span className="text-slate-500 w-32 flex-shrink-0">Database Name:</span>
                            <span className="text-slate-300 font-mono">{col.originalColumnName}</span>
                          </div>
                          <div className="flex">
                            <span className="text-slate-500 w-32 flex-shrink-0">Data Type:</span>
                            <span className="text-slate-300 font-mono">{col.dataType}</span>
                          </div>
                          {col.columnDescription && (
                            <div className="flex">
                              <span className="text-slate-500 w-32 flex-shrink-0">Description:</span>
                              <span className="text-slate-300">{col.columnDescription}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected badge */}
                      {selectedIndices.has(col.index) && (
                        <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Success/error message */}
              {message && state !== 'error' && (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  state === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  {state === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${state === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(state === 'selecting' || state === 'applying') && (
          <div className="flex gap-3 px-6 py-4 border-t border-white/10">
            <button
              onClick={onClose}
              disabled={state === 'applying'}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={state === 'applying' || selectedIndices.size === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {state === 'applying' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Keep Selected & Remove Others
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
