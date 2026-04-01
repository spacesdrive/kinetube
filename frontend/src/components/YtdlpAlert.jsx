import { AlertTriangle, Download, RefreshCw, ExternalLink } from 'lucide-react';

export default function YtdlpAlert({ status }) {
  if (!status || status.isUpToDate) return null;

  const isOutdated = status.exists && status.needsUpdate;
  const isMissing = !status.exists;

  return (
    <div className={`w-full max-w-3xl mx-auto mb-6 rounded-2xl border p-5 ${
      isMissing
        ? 'bg-red-50 border-red-200'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={22}
          className={`flex-shrink-0 mt-0.5 ${isMissing ? 'text-red-500' : 'text-amber-500'}`}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isMissing ? 'text-red-700' : 'text-amber-700'}`}>
            {isMissing ? 'yt-dlp.exe Not Found' : 'yt-dlp.exe Update Required'}
          </p>

          {isMissing && (
            <p className="text-sm text-red-600 mt-1">
              <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs font-mono">yt-dlp.exe</code> was not
              found in the{' '}
              <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs font-mono">backend/downloads/</code>{' '}
              folder. Downloads are disabled until it is installed.
            </p>
          )}

          {isOutdated && (
            <p className="text-sm text-amber-600 mt-1">
              Installed version{' '}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">
                {status.currentVersion}
              </code>{' '}
              is outdated. Required:{' '}
              <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">
                {status.requiredVersion}
              </code>
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={status.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                isMissing
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <Download size={13} />
              {isMissing ? 'Download yt-dlp.exe' : 'Download Update'}
              <ExternalLink size={11} />
            </a>
            <span className="text-xs text-gray-500 self-center">
              Save to <code className="bg-gray-100 px-1 py-0.5 rounded font-mono">backend/downloads/</code>
              {isOutdated && ', then restart the server'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
