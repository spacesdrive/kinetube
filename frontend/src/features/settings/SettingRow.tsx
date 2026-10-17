import type { ReactNode } from 'react';

export interface SettingRowProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export default function SettingRow({ label, hint, htmlFor, children }: SettingRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-divider py-4 last:border-b-0">
      <div className="min-w-[200px] flex-1">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">{label}</label>
        {hint && <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
