import { Link2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  isCompact: boolean;
  onUrlChange(url: string): void;
  onSubmit(): void;
  onClear(): void;
  // pasting an Instagram link on the YouTube page moves to the Instagram page
  onSwitchToInstagram(): void;
}

const PLACEHOLDERS: Record<DownloadPlatformPage, string> = {
  youtube: 'Paste a YouTube link: a video, Shorts, a channel or a playlist',
  instagram: 'Paste an Instagram link: a reel, a post, a story or a profile',
};

export default function UrlForm({ platform, url, error, isLoading, isCompact, onUrlChange, onSubmit, onClear, onSwitchToInstagram }: UrlFormProps) {
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
    <form onSubmit={handleSubmit} aria-busy={isLoading}>
      <div
        className={cn(
          'flex items-center rounded-pill border bg-surface transition-quiet focus-within:border-focus',
          isCompact ? 'h-11 pr-1' : 'h-14 pr-1.5',
          error ? 'border-error' : 'border-line',
        )}
      >
        <Link2 size={isCompact ? 16 : 18} aria-hidden="true" className={cn('flex-shrink-0 text-ink-faint', isCompact ? 'ml-4' : 'ml-5')} />
        <input
          type="text"
          name="link"
          aria-label="Link"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'link-error' : undefined}
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          onPaste={handlePaste}
          placeholder={PLACEHOLDERS[platform]}
          className={cn('h-full min-w-0 flex-1 bg-transparent px-3 text-ink outline-none placeholder:text-ink-faint', isCompact ? 'text-sm' : 'text-[15px]')}
        />
        {url && !isLoading && (
          <button type="button" aria-label="Clear the link" onClick={onClear} className="mr-1 flex size-8 flex-shrink-0 items-center justify-center rounded-pill text-ink-faint transition-quiet hover:bg-surface-hover hover:text-ink">
            <X size={15} />
          </button>
        )}
        <Button type="submit" size={isCompact ? 'default' : 'lg'} disabled={isLoading} className={cn('flex-shrink-0', !isCompact && 'h-11 px-6')}>
          {isLoading ? <><Spinner className="size-4" /> Fetching</> : 'Fetch'}
        </Button>
      </div>
      {error && <p id="link-error" role="alert" className="mt-2 px-5 text-[13px] text-error">{error}</p>}
    </form>
  );
}
