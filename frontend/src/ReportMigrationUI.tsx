import { useState, useCallback } from 'react';
import { Database, Search, User } from 'lucide-react';
import DashboardTab from '@/components/DashboardTab';
import UploadTab from '@/components/UploadTab';
import ReportsTab from '@/components/ReportsTab';
import ReportDetailModal from '@/components/ReportDetailModal';

// ─── Types ──────────────────────────────────────────────────
type Tab = 'dashboard' | 'reports' | 'upload' | 'query';

const navTabs: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'reports', label: 'Reports' },
  { key: 'upload', label: 'Upload' },
  { key: 'query', label: 'Query' },
];

// ─── Main Component ─────────────────────────────────────────
export default function ReportMigrationUI() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const handleSelectReport = useCallback((reportId: string) => {
    setSelectedReportId(reportId);
  }, []);

  const handleNavigate = useCallback((tab: string) => {
    setActiveTab(tab as Tab);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="relative">
        {/* ─── Header ──────────────────────────────────────── */}
        <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Logo + Nav */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">ReportFlow</h1>
                    <p className="text-xs text-slate-500">Migration System</p>
                  </div>
                </div>

                <nav className="flex gap-1">
                  {navTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.key
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Right: Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main Content ────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'dashboard' && (
            <DashboardTab onNavigate={handleNavigate} onSelectReport={handleSelectReport} />
          )}

          {activeTab === 'upload' && (
            <UploadTab onNavigate={handleNavigate} onSelectReport={handleSelectReport} />
          )}

          {activeTab === 'reports' && (
            <ReportsTab onNavigate={handleNavigate} onSelectReport={handleSelectReport} />
          )}

          {activeTab === 'query' && (
            <div className="max-w-4xl mx-auto">
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-5">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-3">Query Reports</h2>
                <p className="text-slate-500">
                  Natural language search coming soon. Use the Reports tab to browse and search.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── Report Detail Modal ────────────────────────── */}
      {selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  );
}
