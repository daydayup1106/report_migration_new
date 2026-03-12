import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import type { Column, ValidationResult } from '@/types';
import { reportService } from '@/services/api';

interface DuplicateColumnResolverProps {
  reportId: string;
  sessionId?: string;
  duplicateMessage: string;
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

  const extractDuplicateName = (msg: string): string => {
    const match = msg.match(/['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    const fetchColumns = async () => {
      try {
        setState('loading');
        const report = sessionId
          ? await reportService.getPendingReport(sessionId)
          : await reportService.getReport(reportId);

        const dupName = extractDuplicateName(duplicateMessage).toLowerCase();

        if (!dupName) {
          setState('error');
          setMessage('Could not identify duplicate column name.');
          return;
        }

        if (!report.columns || !Array.isArray(report.columns)) {
          setState('error');
          setMessage('Report columns not found.');
          return;
        }

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
    setSelectedIndices(new Set([index]));
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

      const indicesToRemove = group.columns
        .filter(col => col.index !== selectedIndex)
        .map(col => col.index);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">
              Resolve Duplicate Columns
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={state === 'applying'}
            className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-slate-500">Loading column details...</p>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{message}</p>
            </div>
          )}

          {(state === 'selecting' || state === 'applying' || state === 'success') && duplicateGroups.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Found <span className="text-slate-900 font-medium">{duplicateGroups[0].columns.length}</span> columns
                with the same display name "<span className="text-amber-600 font-mono">{duplicateGroups[0].name}</span>".
                Select which one to keep, and the others will be removed.
              </p>

              {/* Column cards */}
              <div className="space-y-3">
                {duplicateGroups[0].columns.map((col) => (
                  <div
                    key={col.index}
                    onClick={() => state === 'selecting' && handleSelect(col.index)}
                    className={`
                      relative p-4 rounded-xl border-2 transition-all cursor-pointer bg-white
                      ${selectedIndices.has(col.index)
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }
                      ${state !== 'selecting' && 'opacity-50 cursor-not-allowed'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Radio indicator */}
                      <div className={`
                        mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${selectedIndices.has(col.index)
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 bg-white'
                        }
                      `}>
                        {selectedIndices.has(col.index) && (
                          <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                        )}
                      </div>

                      {/* Column details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className={`text-sm font-medium ${selectedIndices.has(col.index) ? 'text-blue-900' : 'text-slate-900'}`}>
                            {col.columnName}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">
                            Index: {col.index}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm">
                          <div className="flex">
                            <span className="text-slate-500 w-32 flex-shrink-0">Database Name:</span>
                            <span className="text-slate-700 font-mono">{col.originalColumnName}</span>
                          </div>
                          <div className="flex">
                            <span className="text-slate-500 w-32 flex-shrink-0">Data Type:</span>
                            <span className="text-slate-700 font-mono">{col.dataType}</span>
                          </div>
                          {col.columnDescription && (
                            <div className="flex">
                              <span className="text-slate-500 w-32 flex-shrink-0">Description:</span>
                              <span className="text-slate-700 leading-relaxed">{col.columnDescription}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected badge */}
                      {selectedIndices.has(col.index) && (
                        <div className="absolute top-4 right-4 text-blue-600">
                          <CheckCircle className="w-6 h-6 shrink-0" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Success/error message */}
              {message && state !== 'error' && (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  state === 'success'
                    ? 'bg-emerald-50 border border-emerald-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  {state === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm ${state === 'success' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(state === 'selecting' || state === 'applying') && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <button
              onClick={onClose}
              disabled={state === 'applying'}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={state === 'applying' || selectedIndices.size === 0}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
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
