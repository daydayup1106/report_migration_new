import { X, Sparkles, Database, Type, FileCode } from 'lucide-react';
import type { Parameter } from '@/types';

interface ParametersDetailModalProps {
  parameters: Parameter[];
  onClose: () => void;
}

export default function ParametersDetailModal({ parameters, onClose }: ParametersDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Parameter Details ({parameters.length} parameters)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    #
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Parameter Name
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Database Column
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Parameter Type
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                    Default Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parameters.map((param, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-sm text-slate-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <span className="text-sm text-slate-900 font-medium">
                          {param.parameterName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-sm text-slate-600 font-mono">
                          {param.originalColumnName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100 font-mono">
                          {param.parameterType}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      {param.parameterValue ? (
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span className="text-sm text-slate-600 font-mono">
                            {param.parameterValue}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm italic text-slate-400">No default value</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
