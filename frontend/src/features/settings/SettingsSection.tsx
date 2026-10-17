import SectionHeader from '@/components/patterns/SectionHeader';

import type { ReactNode } from 'react';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export default function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} description={description} />
      <div className="rounded-card bg-surface px-5">{children}</div>
    </section>
  );
}
