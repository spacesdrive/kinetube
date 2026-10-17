import { Plus, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSCRIPTION_LANGUAGES } from '@/lib/languages';
import { cn } from '@/lib/utils';

import type { DragEvent } from 'react';
import type { TranscribeQueue } from './useTranscribeQueue';

export interface FileSourcesProps {
  queue: TranscribeQueue;
  language: string;
  onLanguageChange(language: string): void;
}

function languageLabel(value: string): string {
  return TRANSCRIPTION_LANGUAGES.find((language) => language.value === value)?.label ?? value;
}

export default function FileSources({ queue, language, onLanguageChange }: FileSourcesProps) {
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Files</CardTitle>
          {queue.items.length > 0 && !queue.isRunning && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-red-500" onClick={queue.clear}>Clear all</Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-7 transition-all', isDragging ? 'border-purple-400 bg-purple-50' : 'border-border bg-muted/20 hover:border-muted-foreground/40')}
        >
          <Upload size={24} className="text-muted-foreground/40" />
          <span className="text-sm font-medium text-muted-foreground">Drop files here, or select to browse</span>
          <span className="text-xs text-muted-foreground/70">MP3, MP4, WAV, M4A, OGG, FLAC, WEBM and more. Several files at once are fine.</span>
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
          <Input aria-label="File path" value={localPath} onChange={(event) => setLocalPath(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleAddPath()} placeholder="Or paste the full path of a file on this computer" className="font-mono text-sm" />
          <Button type="button" variant="outline" onClick={handleAddPath} disabled={!localPath.trim()}><Plus size={14} className="mr-1" /> Add</Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">Language</span>
          <Select value={language} onValueChange={(value) => { if (value) onLanguageChange(value); }}>
            <SelectTrigger aria-label="Language" className="h-8 w-48 text-sm"><SelectValue>{languageLabel(language)}</SelectValue></SelectTrigger>
            <SelectContent>
              {TRANSCRIPTION_LANGUAGES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
