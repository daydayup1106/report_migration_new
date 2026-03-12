import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

type Status = 'completed' | 'processing' | 'error';

const config: Record<Status, { icon: typeof CheckCircle2; label: string; classes: string }> = {
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    classes: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    classes: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    classes: 'bg-red-500/10 border-red-500/20 text-red-400',
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { icon: Icon, label, classes } = config[status] ?? config.processing;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${classes}`}>
      <Icon className={`w-4 h-4 ${status === 'processing' ? 'animate-spin' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
