import { FolderOpen } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pickFolder } from '@/lib/folderPicker';
import { api } from '@/services/api';
import { ApiError } from '@/services/request';

export interface OutputFolderFieldProps {
  value: string;
  onChange(outputDir: string): void;
}

export default function OutputFolderField({ value, onChange }: OutputFolderFieldProps) {
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [problem, setProblem] = useState('');

  async function handleBrowse() {
    setIsBrowsing(true);
    setProblem('');
    try {
      const chosen = await pickFolder();
      if (chosen) onChange(chosen);
    } catch (error) {
      setProblem(`Couldn't open the folder picker. ${(error as Error).message}`);
    } finally {
      setIsBrowsing(false);
    }
  }

  async function handleBlur() {
    if (!value.trim()) {
      setProblem('');
      return;
    }
    try {
      await api.getFolder(value.trim());
      setProblem('');
    } catch (error) {
      if (error instanceof ApiError) setProblem(`${error.message} Until then, downloads go to the default folder.`);
    }
  }

  return (
    <section>
      <label htmlFor="output-folder" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Download folder
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="output-folder"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setProblem('');
            }}
            onBlur={handleBlur}
            placeholder="The default downloads folder"
            className="pl-9 font-mono text-xs"
          />
        </div>
        <Button type="button" variant="outline" onClick={handleBrowse} disabled={isBrowsing} className="flex-shrink-0">
          {isBrowsing ? 'Opening...' : 'Browse'}
        </Button>
      </div>
      {problem && <p className="mt-1.5 text-xs text-amber-600">{problem}</p>}
    </section>
  );
}
