import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, Search, X, ArrowLeft, ShieldCheck, Zap, MonitorPlay } from 'lucide-react';
import YtdlpAlert from './components/YtdlpAlert';
import VideoView from './components/VideoView';
import ChannelView from './components/ChannelView';
import ProgressModal from './components/ProgressModal';
import DownloadSettings from './components/DownloadSettings';
import SetupScreen from './components/SetupScreen';

// ── API helpers ──────────────────────────────────────────────────────────────

async function fetchInfo(url) {
  const res = await fetch('/api/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch info');
  return data;
}

async function fetchYtdlpStatus() {
  const res = await fetch('/api/ytdlp-status');
  return res.json();
}

// ── URL cleaner ──────────────────────────────────────────────────────────────
//
// Strips every query param except the essential ones so users see a clean URL
// the instant they paste.  Works for all YouTube URL patterns:
//
//   youtu.be/ID?si=xyz&pp=abc   →  https://youtu.be/ID
//   youtube.com/watch?v=ID&si=  →  https://www.youtube.com/watch?v=ID
//   youtube.com/shorts/ID?si=   →  https://www.youtube.com/shorts/ID
//   youtube.com/@channel?...    →  https://www.youtube.com/@channel
//
// If the URL is not a recognised YouTube URL it is returned unchanged.

function cleanYouTubeUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^(www\.|m\.)/, '');

    if (host !== 'youtube.com' && host !== 'youtu.be') return trimmed;

    const path = u.pathname.replace(/\/$/, '');

    // youtu.be/ID  — drop every query param and fragment
    if (host === 'youtu.be') {
      const id = path.slice(1).split('/')[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return `https://youtu.be/${id}`;
      }
    }

    // /watch?v=ID  — keep only the v param
    if (path === '/watch') {
      const v = u.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
        return `https://www.youtube.com/watch?v=${v}`;
      }
    }

    // /shorts/ID
    const shortsM = path.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsM) return `https://www.youtube.com/shorts/${shortsM[1]}`;

    // channel URLs — keep path, drop all query params
    if (/^\/((?:@[\w.-]+|channel\/UC[\w-]+|c\/[\w-]+|user\/[\w-]+))/.test(path)) {
      return `https://www.youtube.com${path}`;
    }
  } catch {}
  return trimmed;
}

// ── Download via SSE ────────────────────────────────────────────────────────
//
// Key design decisions:
//  1. safeClose() is called IMMEDIATELY inside the 'done' listener — before any
//     React state update — so that the EventSource onerror that fires when the
//     server closes the connection (res.end) sees `closed = true` and is ignored.
//     This prevents the "Connection lost" false error and duplicate downloads.
//
//  2. We do NOT perform any side-effects (like starting the next bulk download)
//     inside React state setter functions.  State setters must be pure functions;
//     React StrictMode invokes them twice in development which would start two
//     yt-dlp processes.

function createDownloadSSE(params, onEvent) {
  const { url, quality, audioOnly, outputDir, prefix, suffix, mainName, useNumbering, sequenceNum } = params;

  const qs = new URLSearchParams({
    url,
    quality,
    audioOnly: audioOnly ? 'true' : 'false',
    useNumbering: useNumbering ? 'true' : 'false',
    sequenceNum: String(sequenceNum ?? 1),
  });
  if (outputDir) qs.set('outputDir', outputDir);
  if (prefix)    qs.set('prefix', prefix);
  if (suffix)    qs.set('suffix', suffix);
  if (mainName)  qs.set('mainName', mainName);

  const es = new EventSource(`/api/download?${qs}`);

  let closed = false;
  function safeClose() {
    if (!closed) { closed = true; es.close(); }
  }

  // 'done' — close immediately so the browser never auto-reconnects
  es.addEventListener('done', (e) => {
    safeClose();
    let data;
    try { data = JSON.parse(e.data); } catch { data = {}; }
    onEvent('done', data);
  });

  // All other named events
  ['start', 'progress', 'info', 'log', 'merge', 'phaseChange', 'warning', 'error_log'].forEach((evt) => {
    es.addEventListener(evt, (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { data = { message: e.data }; }
      onEvent(evt, data);
    });
  });

  // onerror fires when the server closes the connection (normal after 'done').
  // If 'done' was already handled, closed=true and we ignore it.
  es.onerror = () => {
    if (closed) return;
    safeClose();
    onEvent('done', { success: false, message: 'Connection to the server was lost. Check that the backend is running.' });
  };

  return { close: safeClose };
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [ytdlpStatus, setYtdlpStatus]       = useState(null);
  const [needsSetup, setNeedsSetup]         = useState(false);
  const [setupChecked, setSetupChecked]     = useState(false);
  const [url, setUrl]                       = useState('');
  const [urlError, setUrlError]             = useState('');
  const [loading, setLoading]               = useState(false);
  const [result, setResult]                 = useState(null);
  const [activeDownload, setActiveDownload] = useState(null);
  const [downloadSettings, setDownloadSettings] = useState({
    outputDir: '',
    prefix: '',
    suffix: '',
    useNumbering: false,
    startNumber: 1,
    useCustomFilename: false,
    customFilenameTemplate: '%(title)s',
  });
  const esRef = useRef(null);

  // On mount: quick check whether tools need to be installed.
  // If so, show SetupScreen which connects to /api/setup and drives the download.
  useEffect(() => {
    fetch('/api/setup/check')
      .then((r) => r.json())
      .then((data) => {
        setNeedsSetup(!data.allReady);
        setSetupChecked(true);
        if (data.allReady) {
          fetchYtdlpStatus().then(setYtdlpStatus).catch(console.error);
        }
      })
      .catch(() => {
        // Backend not yet ready — show main app; YtdlpAlert will handle warnings
        setSetupChecked(true);
      });
  }, []);

  const handleSetupComplete = useCallback(() => {
    setNeedsSetup(false);
    fetchYtdlpStatus().then(setYtdlpStatus).catch(console.error);
  }, []);

  // ── Handle URL submit ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      setUrlError('');
      if (!url.trim()) {
        setUrlError('Please paste a YouTube URL first.');
        return;
      }
      setLoading(true);
      setResult(null);
      try {
        const info = await fetchInfo(url.trim());
        setResult(info);
        // Reflect the cleaned/normalised URL back into the input so the user
        // can see what was actually used (strips tracking params like ?si=...,
        // normalises youtu.be → youtube.com/watch?v=..., removes fragments, etc.)
        if (info.cleanUrl) setUrl(info.cleanUrl);
      } catch (err) {
        setUrlError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  const handleClear = () => {
    setUrl('');
    setUrlError('');
    setResult(null);
  };

  // ── Progress scaling ──────────────────────────────────────────────────────
  //
  // For split downloads (video track + audio track merged by ffmpeg) we map
  // the two phases so the bar never goes backwards:
  //   video phase  → 0 – 50 %
  //   audio phase  → 50 – 95 %
  //   merging      → 97 %   (set directly in the 'merge' handler)
  //   done         → 100 %
  //
  // The frontend learns whether a download will be split from the 'willMerge'
  // flag in the 'start' event (sent before any progress lines).  This means
  // isMultiFile is TRUE from the very first progress event, so there is no
  // backward jump when the audio phase begins.
  function scaledPercent(rawPct, phase, isMultiFile) {
    if (!isMultiFile) return rawPct;
    if (phase === 'video') return rawPct * 0.5;          // 0 → 50
    if (phase === 'audio') return 50 + rawPct * 0.45;    // 50 → 95
    return 97;
  }

  // ── Single video download ─────────────────────────────────────────────────
  const startSingleDownload = useCallback(
    ({ url: dlUrl, quality, audioOnly, title }) => {
      if (esRef.current) esRef.current.close();

      const settings = downloadSettings;

      setActiveDownload({
        title,
        quality,
        audioOnly,
        percent: 0,
        speed: '',
        eta: '',
        filename: '',
        phase: audioOnly ? 'audio' : 'video',
        phaseLabel: audioOnly ? 'Downloading audio...' : 'Downloading video...',
        isMultiFile: false,
        merging: false,
        done: false,
        success: false,
        message: '',
        warning: null,
      });

      const ctrl = createDownloadSSE(
        {
          url: dlUrl,
          quality,
          audioOnly,
          outputDir: settings.outputDir,
          prefix: settings.prefix,
          suffix: settings.suffix,
          mainName: settings.useCustomFilename ? settings.customFilenameTemplate : '',
          useNumbering: settings.useNumbering,
          sequenceNum: settings.startNumber,
        },
        (event, data) => {
          setActiveDownload((prev) => {
            if (!prev) return prev;
            switch (event) {
              case 'start':
                // willMerge tells us upfront this is a two-file split download.
                // Set isMultiFile now so ALL progress events are correctly scaled
                // from the beginning — no backward jump when audio phase starts.
                if (data.willMerge) {
                  return { ...prev, isMultiFile: true };
                }
                return prev;

              case 'warning':
                return { ...prev, warning: data.message };

              case 'phaseChange':
                // Fallback: server confirmed split after the fact.
                // If we already set isMultiFile from willMerge, nothing changes.
                // If not (willMerge was false but split happened anyway), snap to 50%.
                return {
                  ...prev,
                  isMultiFile: true,
                  percent: prev.isMultiFile ? prev.percent : 50,
                };

              case 'progress': {
                const isMultiFile = data.isMultiFile || prev.isMultiFile;
                const phase = data.phase || prev.phase;
                return {
                  ...prev,
                  percent: scaledPercent(data.percentNum || 0, phase, isMultiFile),
                  speed: data.speed || prev.speed,
                  eta: data.eta || prev.eta,
                  filename: data.filename || prev.filename,
                  phase,
                  phaseLabel: data.phaseLabel || prev.phaseLabel,
                  isMultiFile,
                  merging: false,
                };
              }

              case 'merge':
                return {
                  ...prev,
                  merging: true,
                  phase: 'merging',
                  percent: 97,
                  phaseLabel: data.label || 'Processing...',
                };

              case 'info':
                return { ...prev, filename: data.filename || prev.filename };

              case 'done':
                return {
                  ...prev,
                  done: true,
                  success: data.success,
                  message: data.message,
                  merging: false,
                  percent: data.success ? 100 : prev.percent,
                  phaseLabel: data.success ? 'Complete' : 'Failed',
                };

              default:
                return prev;
            }
          });
        }
      );

      esRef.current = ctrl;
    },
    [downloadSettings]
  );

  // ── Bulk download (sequential queue) ─────────────────────────────────────
  const startBulkDownload = useCallback(
    ({ videos, quality, audioOnly }) => {
      if (esRef.current) esRef.current.close();

      const settings = downloadSettings;

      const items = videos.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.url,
        done: false,
        success: false,
        percent: 0,
        speed: '',
        phase: audioOnly ? 'audio' : 'video',
        phaseLabel: audioOnly ? 'Downloading audio...' : 'Downloading video...',
        isMultiFile: false,
        merging: false,
      }));

      setActiveDownload({ items, quality, audioOnly, isBulk: true });

      const downloadNext = (idx) => {
        if (idx >= videos.length) return;
        const video = videos[idx];
        const sequenceNum = (settings.startNumber || 1) + idx;

        const ctrl = createDownloadSSE(
          {
            url: video.url,
            quality,
            audioOnly,
            outputDir: settings.outputDir,
            prefix: settings.prefix,
            suffix: settings.suffix,
            mainName: settings.useCustomFilename ? settings.customFilenameTemplate : '',
            useNumbering: settings.useNumbering,
            sequenceNum,
          },
          (event, data) => {
            // ── 'done' is handled OUTSIDE the state setter ───────────────────
            // Calling downloadNext() inside a state setter is a side-effect in
            // a pure function.  React StrictMode calls setters twice, which would
            // start two SSE connections for the next video.
            if (event === 'done') {
              setActiveDownload((prev) => {
                if (!prev?.items) return prev;
                const newItems = [...prev.items];
                newItems[idx] = {
                  ...newItems[idx],
                  done: true,
                  success: data.success,
                  percent: data.success ? 100 : newItems[idx].percent,
                  merging: false,
                  phaseLabel: data.success ? 'Complete' : 'Failed',
                };
                return { ...prev, items: newItems };
              });
              // Start the next download only after the state update is queued.
              // Using setTimeout(0) ensures this runs after React has flushed
              // the current batch, preventing any double-invocation issues.
              setTimeout(() => downloadNext(idx + 1), 0);
              return;
            }

            // ── All other events update state normally ───────────────────────
            setActiveDownload((prev) => {
              if (!prev?.items) return prev;
              const newItems = [...prev.items];
              const cur = newItems[idx];

              switch (event) {
                case 'start':
                  if (data.willMerge) {
                    newItems[idx] = { ...cur, isMultiFile: true };
                  }
                  break;

                case 'warning':
                  newItems[idx] = { ...cur, warning: data.message };
                  break;

                case 'phaseChange':
                  newItems[idx] = {
                    ...cur,
                    isMultiFile: true,
                    percent: cur.isMultiFile ? cur.percent : 50,
                  };
                  break;

                case 'progress': {
                  const isMultiFile = data.isMultiFile || cur.isMultiFile;
                  const phase = data.phase || cur.phase;
                  newItems[idx] = {
                    ...cur,
                    percent: scaledPercent(data.percentNum || 0, phase, isMultiFile),
                    speed: data.speed || '',
                    phase,
                    phaseLabel: data.phaseLabel || cur.phaseLabel,
                    isMultiFile,
                    merging: false,
                  };
                  break;
                }

                case 'merge':
                  newItems[idx] = {
                    ...cur,
                    merging: true,
                    phase: 'merging',
                    percent: 97,
                    phaseLabel: data.label || 'Processing...',
                  };
                  break;

                case 'info':
                  newItems[idx] = { ...cur, filename: data.filename || cur.filename };
                  break;

                default:
                  return prev;
              }

              return { ...prev, items: newItems };
            });
          }
        );

        esRef.current = ctrl;
      };

      downloadNext(0);
    },
    [downloadSettings]
  );

  // ── Unified download handler ──────────────────────────────────────────────
  const handleDownload = useCallback(
    ({ videos, url: dlUrl, quality, audioOnly, title }) => {
      if (videos && videos.length > 1) {
        startBulkDownload({ videos, quality, audioOnly });
      } else if (videos && videos.length === 1) {
        startSingleDownload({
          url: videos[0].url,
          quality,
          audioOnly,
          title: videos[0].title,
        });
      } else {
        startSingleDownload({ url: dlUrl, quality, audioOnly, title });
      }
    },
    [startSingleDownload, startBulkDownload]
  );

  const handleCloseDownload = () => {
    if (esRef.current) esRef.current.close();
    esRef.current = null;
    setActiveDownload(null);
  };

  const isChannelType = result && (
    result.type === 'channel_videos' ||
    result.type === 'channel_shorts' ||
    result.type === 'channel'
  );
  const isVideoType = result && (result.type === 'video' || result.type === 'shorts');
  const ffmpegAvailable = ytdlpStatus?.ffmpegAvailable ?? false;

  // Show setup screen while tools are being downloaded (first run)
  if (!setupChecked) return null;
  if (needsSetup) return <SetupScreen onComplete={handleSetupComplete} />;

  return (
    <div className="min-h-screen bg-[#f8fafe] font-sans flex flex-col relative overflow-x-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10">
        <button
          onClick={handleClear}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src="/favicon.png" alt="KineTube Logo" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-bold text-blue-600 tracking-tight">KineTube</span>
        </button>

        {result && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft size={15} /> New search
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-12 relative z-10">

        {/* ── Hero section ── */}
        {!result && (
          <div className="text-center max-w-4xl mx-auto w-full mt-8 mb-8">
            <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1c23] tracking-tight mb-4 leading-tight">
              Download YouTube Videos <br />
              <span className="text-blue-600">in High Definition</span>
            </h1>
            <p className="text-[#6b7280] text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
              Fast, free, and secure. Save videos, channels, and audio from YouTube.
            </p>
          </div>
        )}

        {/* ── yt-dlp alert ── */}
        {ytdlpStatus && !ytdlpStatus.isUpToDate && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <YtdlpAlert status={ytdlpStatus} />
          </div>
        )}

        {/* ── URL input ── */}
        <div className={`w-full max-w-3xl mx-auto ${result ? 'mb-4' : 'mb-0'}`}>
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div
              className={`relative flex items-center bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-2 pr-2 border transition-colors ${urlError ? 'border-red-300' : 'border-gray-100'
                }`}
            >
              <div className="pl-5 text-gray-400 flex-shrink-0">
                <Link2 size={22} />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  const cleaned = cleanYouTubeUrl(pasted);
                  if (cleaned !== pasted) {
                    e.preventDefault();
                    setUrl(cleaned);
                    setUrlError('');
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Paste YouTube URL — video, channel, or shorts..."
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-gray-700 text-lg placeholder-gray-400 min-w-0"
              />
              {url && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex-shrink-0 p-2 mr-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-full transition-colors whitespace-nowrap text-lg shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Fetching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Fetch
                  </>
                )}
              </button>
            </div>
          </form>

          {urlError && (
            <p className="mt-3 text-sm text-red-600 font-medium text-center px-4">{urlError}</p>
          )}
        </div>

        {/* ── Download Settings ── */}
        <div className="w-full max-w-3xl mx-auto mt-3 mb-3 px-1">
          <DownloadSettings
            settings={downloadSettings}
            onChange={setDownloadSettings}
          />
        </div>

        {/* ── Feature badges (landing only) ── */}
        {!result && !loading && (
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm font-medium text-gray-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-green-500" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={18} className="text-orange-500" />
              <span>No Registration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MonitorPlay size={18} className="text-blue-400" />
              <span>4K/HD Quality</span>
            </div>
          </div>
        )}

        {/* ── Video result ── */}
        {isVideoType && (
          <VideoView
            info={result}
            ffmpegAvailable={ffmpegAvailable}
            onDownload={handleDownload}
          />
        )}

        {/* ── Channel result ── */}
        {isChannelType && (
          <ChannelView
            info={result}
            ffmpegAvailable={ffmpegAvailable}
            onDownload={handleDownload}
          />
        )}
      </main>

      {/* ── Download progress modal ── */}
      {activeDownload && (
        <ProgressModal
          download={activeDownload}
          onClose={handleCloseDownload}
          onCancel={handleCloseDownload}
        />
      )}
    </div>
  );
}
