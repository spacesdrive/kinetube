import type { ReactNode } from 'react';

export interface SettingRowProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

export default function SettingRow({ label, hint, htmlFor, children }: SettingRowProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
