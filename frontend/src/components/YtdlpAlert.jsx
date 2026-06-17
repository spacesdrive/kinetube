import { AlertTriangle, Download, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function YtdlpAlert({ status }) {
  if (!status || status.isUpToDate) return null;

  const isOutdated = status.exists && status.needsUpdate;
  const isMissing  = !status.exists;

  return (
    <Alert variant={isMissing ? 'destructive' : 'default'} className={isMissing ? '' : 'border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-500'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {isMissing ? 'yt-dlp.exe Not Found' : 'yt-dlp.exe Update Required'}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        {isMissing && (
          <p>
            <code className="bg-destructive/10 px-1.5 py-0.5 rounded text-xs font-mono">yt-dlp.exe</code>{' '}
            was not found in the{' '}
            <code className="bg-destructive/10 px-1.5 py-0.5 rounded text-xs font-mono">backend/downloads/</code>{' '}
            folder. Downloads are disabled until it is installed.
          </p>
        )}
        {isOutdated && (
          <p>
            Installed version{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">{status.currentVersion}</code>{' '}
            is outdated. Required:{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">{status.requiredVersion}</code>
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant={isMissing ? 'destructive' : 'default'} className={isMissing ? '' : 'bg-amber-500 hover:bg-amber-600'}>
            <a href={status.downloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              {isMissing ? 'Download yt-dlp.exe' : 'Download Update'}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
          <span className="text-xs self-center text-muted-foreground">
            Save to{' '}
            <code className="bg-muted px-1 py-0.5 rounded font-mono">backend/downloads/</code>
            {isOutdated && ', then restart the server'}
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
