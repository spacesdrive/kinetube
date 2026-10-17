import { Link2, Search, X } from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';
import { cleanInstagramUrl, cleanYouTubeUrl, isInstagramLink } from '@/lib/urlCleaners';
import { cn } from '@/lib/utils';

import type { ClipboardEvent, FormEvent } from 'react';
import type { DownloadPlatformPage } from '@/lib/pages';

export interface UrlFormProps {
  platform: DownloadPlatformPage;
  url: string;
  error: string;
  isLoading: boolean;
  onUrlChange(url: string): void;
  onSubmit(): void;
  onClear(): void;
  // pasting an Instagram link on the YouTube page moves to the Instagram page
  onSwitchToInstagram(): void;
}

const PLACEHOLDERS: Record<DownloadPlatformPage, string> = {
  youtube: 'Paste a YouTube link: a video, a channel or Shorts...',
  instagram: 'Paste an Instagram link: a reel, a post, a story or a profile...',
};

const SUBMIT_CLASSES: Record<DownloadPlatformPage, string> = {
  youtube: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400',
  instagram: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60',
};

export default function UrlForm({ platform, url, error, isLoading, onUrlChange, onSubmit, onClear, onSwitchToInstagram }: UrlFormProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  // tracking parameters are removed the moment a link is pasted, so the field shows what will be fetched
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    const isInstagram = isInstagramLink(pasted);
    const cleaned = isInstagram ? cleanInstagramUrl(pasted) : cleanYouTubeUrl(pasted);
    // switching pages clears the field, so the link is set again afterwards either way
    const isSwitching = isInstagram && platform !== 'instagram';
    if (isSwitching) onSwitchToInstagram();
    if (!isSwitching && cleaned === pasted) return;
    event.preventDefault();
    onUrlChange(cleaned);
  }

  return (
    <form onSubmit={handleSubmit} className="group relative">
      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-500/5 opacity-50 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
      <div className={cn('relative flex items-center rounded-full border bg-card shadow-md transition-colors dark:shadow-lg', error ? 'border-red-400' : 'border-border')}>
        <div className="flex-shrink-0 pl-5 text-muted-foreground"><Link2 size={20} /></div>
        <input
          type="text"
          aria-label="Link"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          onPaste={handlePaste}
          placeholder={PLACEHOLDERS[platform]}
          className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground/50"
        />
        {url && (
          <button type="button" aria-label="Clear the link" onClick={onClear} className="mr-1 flex-shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted">
            <X size={15} />
          </button>
        )}
        <button type="submit" disabled={isLoading} className={cn('m-1 flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-7 py-3.5 font-semibold text-white transition-colors', SUBMIT_CLASSES[platform])}>
          {isLoading ? <><Spinner className="mr-1 size-4" /> Fetching...</> : <><Search size={16} /> Fetch</>}
        </button>
      </div>
    </form>
  );
}
