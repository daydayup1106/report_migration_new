import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );
}
