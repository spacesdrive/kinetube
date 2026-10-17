import { MonitorPlay, ShieldCheck, Zap } from 'lucide-react';

export default function FeatureNotes() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-muted-foreground">
      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-green-500" /> Private, on this computer</span>
      <span className="flex items-center gap-1.5"><Zap size={14} className="text-orange-500" /> No account needed</span>
      <span className="flex items-center gap-1.5"><MonitorPlay size={14} className="text-blue-400" /> Up to 4K</span>
    </div>
  );
}
