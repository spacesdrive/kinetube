import { Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import type { DragEvent } from 'react';
import type { TranscribeQueue } from './useTranscribeQueue';

export interface FileSourcesProps {
  queue: TranscribeQueue;
}

export default function FileSources({ queue }: FileSourcesProps) {
  const [localPath, setLocalPath] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) queue.addFiles(event.dataTransfer.files);
  }

  function handleAddPath() {
    if (!localPath.trim()) return;
    queue.addPath(localPath.trim());
    setLocalPath('');
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-quiet', isDragging ? 'border-spin bg-spin-soft' : 'border-line-strong bg-surface hover:bg-surface-selected')}
      >
        <span className="mb-1 flex size-11 items-center justify-center rounded-pill bg-app text-ink"><Upload size={18} /></span>
        <span className="text-[15px] font-semibold text-ink">Drop files here, or select to browse</span>
        <span className="text-[13px] text-ink-muted">MP3, MP4, WAV, M4A, OGG, FLAC, WEBM and more. Several files at once are fine.</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="audio/*,video/*"
        multiple
        onChange={(event) => {
          if (event.target.files?.length) queue.addFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <div className="flex gap-2">
        <Input aria-label="File path" value={localPath} onChange={(event) => setLocalPath(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAddPath()} placeholder="Or paste the full path of a file on this computer" className="h-10 font-mono text-[13px]" />
        <Button type="button" variant="outline" size="lg" onClick={handleAddPath} disabled={!localPath.trim()}><Plus /> Add</Button>
      </div>
    </section>
  );
}
