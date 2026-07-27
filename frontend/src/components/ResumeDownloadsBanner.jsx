import { RotateCcw, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Shown when the backend reports downloads that were still in flight the
// last time the app closed (see docs/architecture/backend/MANAGERS.md -
// "Resuming an interrupted download"). yt-dlp resumes the partial file on
// its own as long as it is re-invoked with the identical output path, so
// "Resume" just re-issues the exact request the backend recorded.
export default function ResumeDownloadsBanner({ items, onResume, onDismiss }) {
  if (!items || items.length === 0) return null;

  return (
    <Alert className="border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-500">
      <RotateCcw className="h-4 w-4" />
      <AlertTitle>
        {items.length === 1 ? 'Resume interrupted download?' : `Resume ${items.length} interrupted downloads?`}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>KineTube closed before this finished. yt-dlp can pick up where it left off.</p>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-md bg-white/60 px-2.5 py-1.5">
              <span className="truncate text-sm" title={item.title || item.url}>
                {item.title || item.url}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => onResume(item)}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(item)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
