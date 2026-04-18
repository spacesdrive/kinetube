import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, Search, X, ArrowLeft, ShieldCheck, Zap, MonitorPlay } from 'lucide-react';
import YtdlpAlert from './components/YtdlpAlert';
import VideoView from './components/VideoView';
import ChannelView from './components/ChannelView';
import ProgressModal from './components/ProgressModal';
import DownloadSettings from './components/DownloadSettings';
import SetupScreen from './components/SetupScreen';
import Navbar from './components/Navbar';
import InstagramLoginModal from './components/instagram/InstagramLoginModal';
import InstagramPostView from './components/instagram/InstagramPostView';
import InstagramProfileView from './components/instagram/InstagramProfileView';
import BatchResultsView from './components/BatchResultsView';
import TranscribePage from './components/TranscribePage';
import SettingsPage from './components/SettingsPage';
import { loadSettings } from './components/SettingsPage';

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

// ── Instagram URL cleaner ────────────────────────────────────────────────────
// Strips tracking params (utm_*, igsh, igshid) from Instagram URLs on paste.

function cleanInstagramUrl(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    const host = u.hostname.replace(/^(www\.|m\.)/, '');
    if (host !== 'instagram.com') return trimmed;

    const path = u.pathname.replace(/\/+$/, '');

    // /p/SHORTCODE — post
    const postM = path.match(/^\/p\/([a-zA-Z0-9_-]+)/);
    if (postM) return `https://www.instagram.com/p/${postM[1]}/`;

    // /reel/SHORTCODE or /reels/SHORTCODE
    const reelM = path.match(/^\/reels?\/([a-zA-Z0-9_-]+)/);
    if (reelM) return `https://www.instagram.com/reel/${reelM[1]}/`;

    // /stories/USERNAME — keep path, drop all params
    if (path.startsWith('/stories/')) return `https://www.instagram.com${path}/`;

    // /USERNAME — profile, drop all params
    const profileM = path.match(/^\/([\w.]+)/);
    if (profileM) return `https://www.instagram.com${path}/`;
  } catch {}
  return trimmed;
}

// ── Instagram SSE helpers ────────────────────────────────────────────────────

// Used by batch processing — regular POST, no streaming
async function fetchInstagramInfo(url, account) {
  const res = await fetch('/api/instagram/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, account }),
  });
  const data = await res.json();
  if (!res.ok) {
    const parts = [data.error, data.hint, data.detail].filter(Boolean);
    throw new Error(parts.join(' — ') || 'Failed to fetch Instagram info');
  }
  return data;
}

// Used by single-URL submit — SSE stream with live progress callbacks
function fetchInstagramInfoSSE(url, account, { onProfile, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ url });
    if (account) qs.set('account', account);
    const es = new EventSource(`/api/instagram/info-stream?${qs}`);

    es.addEventListener('profile', (e) => {
      try { onProfile?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('progress', (e) => {
      try { onProgress?.(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('done', (e) => {
      es.close();
      let msg;
      try { msg = JSON.parse(e.data); } catch { return reject(new Error('Invalid response from server.')); }
      if (msg.ok) resolve(msg.data);
      else {
        const parts = [msg.error, msg.hint, msg.detail].filter(Boolean);
        reject(new Error(parts.join(' — ') || 'Failed to fetch Instagram info'));
      }
    });
    es.onerror = () => { es.close(); reject(new Error('Connection lost while fetching. Try again.')); };
  });
}

function createInstagramDownloadSSE(params, onEvent) {
  const { url, quality, account, outputDir, prefix, suffix, mainName, useNumbering, sequenceNum } = params;
  const qs = new URLSearchParams({ url, quality: quality || 'best', useNumbering: useNumbering ? 'true' : 'false', sequenceNum: String(sequenceNum ?? 1) });
  if (account)   qs.set('account', account);
  if (outputDir) qs.set('outputDir', outputDir);
  if (prefix)    qs.set('prefix', prefix);
  if (suffix)    qs.set('suffix', suffix);
  if (mainName)  qs.set('mainName', mainName);

  const es = new EventSource(`/api/instagram/download?${qs}`);
  let closed = false;
  const safeClose = () => { if (!closed) { closed = true; es.close(); } };

  es.addEventListener('done', (e) => {
    safeClose();
    let data; try { data = JSON.parse(e.data); } catch { data = {}; }
    onEvent('done', data);
  });
  ['start', 'progress', 'info', 'merge', 'warning'].forEach((evt) => {
    es.addEventListener(evt, (e) => {
      let data; try { data = JSON.parse(e.data); } catch { data = { message: e.data }; }
      onEvent(evt, data);
    });
  });
  es.onerror = () => { if (closed) return; safeClose(); onEvent('done', { success: false, message: 'Connection lost.' }); };
  return { close: safeClose };
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
  // ── Platform ──────────────────────────────────────────────────────────────
  const [platform, setPlatform]             = useState('youtube'); // 'youtube' | 'instagram'
  // ── Instagram ─────────────────────────────────────────────────────────────
  const [igAccounts, setIgAccounts]         = useState([]);
  const [activeIgAccount, setActiveIgAccount] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [igSetupReady, setIgSetupReady]     = useState(false);
  const [igSetupLoading, setIgSetupLoading] = useState(false);
  const [igFetchProgress, setIgFetchProgress] = useState(null); // { fetched, total, channelName }
  // ── Shared ────────────────────────────────────────────────────────────────
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
  // ── Persisted settings ────────────────────────────────────────────────────
  const appSettings = loadSettings();

  // ── Transcription state ───────────────────────────────────────────────────
  const [transcribing, setTranscribing]         = useState(false);
  const [transcribeResult, setTranscribeResult] = useState(null); // { text, outputTxt } | null

  // ── Batch mode ────────────────────────────────────────────────────────────
  const [batchMode, setBatchMode]           = useState(false);
  const [batchText, setBatchText]           = useState('');
  const [batchResults, setBatchResults]     = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const esRef = useRef(null);
  // Per-download transcribe flag set when a single download starts
  const shouldTranscribeRef    = useRef(false);
  const triggerTranscriptionRef = useRef(null);

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

  // ── Instagram account loading ──────────────────────────────────────────────
  // instaloader.exe is no longer required — Python + instaloader library handles
  // everything. Just fetch saved accounts whenever the Instagram tab is opened.
  const handlePlatformChange = useCallback((newPlatform) => {
    setPlatform(newPlatform);
    if (newPlatform === 'transcribe' || newPlatform === 'settings') {
      setResult(null);
      setUrl('');
      setUrlError('');
      setBatchMode(false);
      return;
    }
    setResult(null);
    setUrl('');
    setUrlError('');
    if (newPlatform === 'instagram') {
      setIgSetupReady(true);
      setIgSetupLoading(false);
      fetch('/api/instagram/accounts').then((r) => r.json()).then(setIgAccounts).catch(() => {});
    }
  }, []);

  const handleIgLoginSuccess = useCallback((username) => {
    setShowLoginModal(false);
    setActiveIgAccount(username);
    fetch('/api/instagram/accounts').then((r) => r.json()).then(setIgAccounts).catch(() => {});
  }, []);

  const handleIgAccountRemove = useCallback((username) => {
    fetch(`/api/instagram/accounts/${username}`, { method: 'DELETE' })
      .then(() => {
        setIgAccounts((prev) => prev.filter((a) => a.username !== username));
        if (activeIgAccount === username) setActiveIgAccount(null);
      })
      .catch(console.error);
  }, [activeIgAccount]);

  // ── Handle URL submit ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      setUrlError('');
      if (!url.trim()) {
        setUrlError(platform === 'instagram' ? 'Please paste an Instagram URL first.' : 'Please paste a YouTube URL first.');
        return;
      }
      setLoading(true);
      setResult(null);
      setIgFetchProgress(null);
      try {
        if (platform === 'instagram') {
          const info = await fetchInstagramInfoSSE(url.trim(), activeIgAccount, {
            onProfile:  (p) => setIgFetchProgress({ fetched: 0, total: p.mediacount, channelName: p.channelName }),
            onProgress: (p) => setIgFetchProgress((prev) => ({ ...prev, fetched: p.fetched, total: p.total ?? prev?.total })),
          });
          setResult(info);
          if (info.cleanUrl) setUrl(info.cleanUrl);
        } else {
          const info = await fetchInfo(url.trim());
          setResult(info);
          if (info.cleanUrl) setUrl(info.cleanUrl);
        }
      } catch (err) {
        setUrlError(err.message);
      } finally {
        setLoading(false);
        setIgFetchProgress(null);
      }
    },
    [url, platform, activeIgAccount]
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
    ({ url: dlUrl, quality, audioOnly, title, transcribe = false }) => {
      if (esRef.current) esRef.current.close();
      const settings = downloadSettings;
      // Transcribe if the per-download flag or the global setting is on
      shouldTranscribeRef.current = transcribe;

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
          // Auto-transcribe: fire outside setActiveDownload to avoid stale closure issues
          if (event === 'done' && data.success && data.filePath) {
            if (shouldTranscribeRef.current) {
              triggerTranscriptionRef.current?.(data.filePath);
            }
          }
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
                  filePath: data.filePath || '',
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
              if (data.success && data.filePath && videos[idx].transcribe) {
                triggerTranscriptionSilentRef.current?.(data.filePath);
              }
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
    setTranscribeResult(null);
    setTranscribing(false);
  };

  // Trigger transcription of the last downloaded file by path
  const triggerTranscription = useCallback((filePath) => {
    if (!filePath) return;
    const settings = loadSettings();
    setTranscribing(true);
    setTranscribeResult(null);

    fetch('/api/transcribe/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        model:    settings.transcription.defaultModel,
        language: settings.transcription.defaultLanguage,
      }),
    }).then(async (resp) => {
      if (!resp.ok) {
        let errMsg = 'Transcription failed.';
        try { const d = await resp.json(); errMsg = d.error || errMsg; } catch {}
        setTranscribing(false);
        setTranscribeResult({ error: errMsg });
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) return;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const d = JSON.parse(line.slice(6));
            if (d.success !== undefined) {
              setTranscribing(false);
              if (d.success) setTranscribeResult({ text: d.text, outputTxt: d.outputTxt });
            }
          } catch {}
        }
        pump();
      }).catch(() => setTranscribing(false));
      pump();
    }).catch(() => setTranscribing(false));
  }, []);
  // Keep ref in sync so SSE callbacks can call triggerTranscription without stale closure
  useEffect(() => { triggerTranscriptionRef.current = triggerTranscription; }, [triggerTranscription]);

  // Silent transcription for bulk downloads — saves the .txt file but shows no UI result
  const triggerTranscriptionSilent = useCallback((filePath) => {
    if (!filePath) return;
    const settings = loadSettings();
    fetch('/api/transcribe/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        model:    settings.transcription.defaultModel,
        language: settings.transcription.defaultLanguage,
      }),
    }).catch(() => {});
  }, []);
  const triggerTranscriptionSilentRef = useRef(null);
  useEffect(() => { triggerTranscriptionSilentRef.current = triggerTranscriptionSilent; }, [triggerTranscriptionSilent]);

  // ── Unified bulk download (mixed YouTube + Instagram) ───────────────────
  // Each item: { url, title, platform: 'youtube'|'instagram', quality, account? }
  const startUnifiedBulkDownload = useCallback(({ items, transcribe = false }) => {
    if (esRef.current) esRef.current.close();
    shouldTranscribeRef.current = false; // bulk downloads handle transcription per-item
    const settings = downloadSettings;

    const dlItems = items.map((v) => ({
      id: v.url,
      title: v.title,
      url: v.url,
      platform: v.platform,
      done: false, success: false, percent: 0, speed: '',
      phase: 'video', phaseLabel: 'Pending…', isMultiFile: false, merging: false,
    }));

    setActiveDownload({ items: dlItems, isBulk: true });

    const downloadNext = (idx) => {
      if (idx >= items.length) return;
      const item = items[idx];
      const sequenceNum = (settings.startNumber || 1) + idx;
      const ssePath = item.platform === 'instagram' ? '/api/instagram/download' : '/api/download';

      const qs = new URLSearchParams({
        url: item.url,
        quality: item.quality || 'best',
        useNumbering: settings.useNumbering ? 'true' : 'false',
        sequenceNum: String(sequenceNum),
      });
      if (item.platform !== 'instagram') qs.set('audioOnly', 'false');
      if (item.account)     qs.set('account', item.account);
      if (settings.outputDir) qs.set('outputDir', settings.outputDir);
      if (settings.prefix)    qs.set('prefix', settings.prefix);
      if (settings.suffix)    qs.set('suffix', settings.suffix);
      if (settings.useCustomFilename && settings.customFilenameTemplate) {
        qs.set('mainName', settings.customFilenameTemplate);
      }

      const es = new EventSource(`${ssePath}?${qs}`);
      let closed = false;
      const safeClose = () => { if (!closed) { closed = true; es.close(); } };

      es.addEventListener('done', (e) => {
        safeClose();
        let data; try { data = JSON.parse(e.data); } catch { data = {}; }
        // Trigger per-item transcription silently if the flag was set
        if (data.success && data.filePath && transcribe) {
          triggerTranscriptionSilentRef.current?.(data.filePath);
        }
        setActiveDownload((prev) => {
          if (!prev?.items) return prev;
          const ni = [...prev.items];
          ni[idx] = { ...ni[idx], done: true, success: data.success, percent: data.success ? 100 : ni[idx].percent, merging: false, phaseLabel: data.success ? 'Complete' : 'Failed' };
          return { ...prev, items: ni };
        });
        setTimeout(() => downloadNext(idx + 1), 0);
      });

      ['start', 'progress', 'phaseChange', 'merge', 'warning'].forEach((evt) => {
        es.addEventListener(evt, (e) => {
          let data; try { data = JSON.parse(e.data); } catch { data = {}; }
          setActiveDownload((prev) => {
            if (!prev?.items) return prev;
            const ni = [...prev.items];
            const cur = ni[idx];
            switch (evt) {
              case 'start':
                if (data.willMerge) ni[idx] = { ...cur, isMultiFile: true };
                break;
              case 'progress': {
                const isMultiFile = data.isMultiFile || cur.isMultiFile;
                const phase = data.phase || cur.phase;
                ni[idx] = { ...cur, percent: scaledPercent(data.percentNum || 0, phase, isMultiFile), speed: data.speed || '', phase, phaseLabel: data.phaseLabel || cur.phaseLabel, isMultiFile };
                break;
              }
              case 'phaseChange':
                ni[idx] = { ...cur, isMultiFile: true, percent: cur.isMultiFile ? cur.percent : 50 };
                break;
              case 'merge':
                ni[idx] = { ...cur, merging: true, phase: 'merging', percent: 97, phaseLabel: data.label || 'Processing…' };
                break;
              default: break;
            }
            return { ...prev, items: ni };
          });
        });
      });

      es.onerror = () => { if (closed) return; safeClose(); };
      esRef.current = { close: safeClose };
    };

    downloadNext(0);
  }, [downloadSettings]);

  // ── Batch processing ───────────────────────────────────────────────────────

  const parseBatchUrls = (text) =>
    text.split(/[\n,]/)
      .map((l) => l.trim())
      .filter((l) => /^https?:\/\//i.test(l));

  // De-duplicate while preserving order
  const dedupeUrls = (urls) => [...new Set(urls)];

  const handleBatchProcess = useCallback(async (rawText) => {
    const urls = dedupeUrls(parseBatchUrls(rawText));
    if (urls.length === 0) return;

    setBatchProcessing(true);
    setBatchResults(urls.map((url) => ({ url, status: 'pending', selectedIds: new Set() })));

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      setBatchResults((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: 'loading' };
        return next;
      });

      try {
        const isIg = /instagram\.com/i.test(url);
        const cleaned = isIg ? cleanInstagramUrl(url) : cleanYouTubeUrl(url);
        const info = isIg
          ? await fetchInstagramInfo(cleaned, activeIgAccount)
          : await fetchInfo(cleaned);

        const MULTI_TYPES = new Set(['channel', 'channel_videos', 'channel_shorts', 'profile', 'profile_reels', 'profile_tagged']);
        const isSingle = !MULTI_TYPES.has(info.type);
        // Single items: pre-select by default. Multi-items: nothing selected (user picks).
        const defaultSelected = isSingle ? new Set([info.id || url]) : new Set();

        setBatchResults((prev) => {
          const next = [...prev];
          next[i] = { url, status: 'ready', platform: isIg ? 'instagram' : 'youtube', info, selectedIds: defaultSelected };
          return next;
        });
      } catch (err) {
        setBatchResults((prev) => {
          const next = [...prev];
          next[i] = { url, status: 'error', error: err.message };
          return next;
        });
      }
    }

    setBatchProcessing(false);
  }, [activeIgAccount]);

  const handleBatchSelectionChange = useCallback((index, newSelectedIds) => {
    setBatchResults((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selectedIds: newSelectedIds };
      return next;
    });
  }, []);

  const handleBatchDownload = useCallback((quality, transcribe = false) => {
    const MULTI_TYPES = new Set(['channel', 'channel_videos', 'channel_shorts', 'profile', 'profile_reels', 'profile_tagged']);
    const items = [];

    for (const r of batchResults) {
      if (r.status !== 'ready' || r.selectedIds.size === 0) continue;

      if (!MULTI_TYPES.has(r.info?.type)) {
        // Single item
        items.push({ url: r.info.cleanUrl || r.url, title: r.info.title || 'Untitled', platform: r.platform, quality, account: r.platform === 'instagram' ? activeIgAccount : undefined });
      } else {
        // Multi item — add selected entries
        const entries = r.info.entries || [];
        for (const e of entries) {
          if (r.selectedIds.has(e.id)) {
            items.push({ url: e.url, title: e.title || 'Untitled', platform: r.platform, quality, account: r.platform === 'instagram' ? activeIgAccount : undefined });
          }
        }
      }
    }

    if (items.length > 0) startUnifiedBulkDownload({ items, transcribe });
  }, [batchResults, activeIgAccount, startUnifiedBulkDownload]);

  // ── Instagram single download ─────────────────────────────────────────────
  const handleInstagramDownload = useCallback(({ url: dlUrl, quality, title, account: acct, transcribe: dlTranscribe = false }) => {
    if (esRef.current) esRef.current.close();
    const settings = downloadSettings;
    shouldTranscribeRef.current = dlTranscribe;
    setActiveDownload({
      title: title || 'Instagram media',
      quality,
      audioOnly: false,
      percent: 0,
      speed: '',
      eta: '',
      filename: '',
      phase: 'downloading',
      phaseLabel: 'Downloading...',
      isMultiFile: false,
      merging: false,
      done: false,
      success: false,
      message: '',
      warning: null,
    });
    const ctrl = createInstagramDownloadSSE(
      { url: dlUrl, quality, account: acct || activeIgAccount, outputDir: settings.outputDir, prefix: settings.prefix, suffix: settings.suffix, mainName: settings.useCustomFilename ? settings.customFilenameTemplate : '', useNumbering: settings.useNumbering, sequenceNum: settings.startNumber },
      (event, data) => {
        if (event === 'done' && data.success && data.filePath && shouldTranscribeRef.current) {
          triggerTranscriptionRef.current?.(data.filePath);
        }
        setActiveDownload((prev) => {
          if (!prev) return prev;
          switch (event) {
            case 'warning': return { ...prev, warning: data.message };
            case 'progress': return { ...prev, percent: data.percentNum || 0, speed: data.speed || prev.speed, eta: data.eta || prev.eta, filename: data.filename || prev.filename };
            case 'merge': return { ...prev, merging: true, phase: 'merging', percent: 97, phaseLabel: data.label || 'Processing...' };
            case 'info': return { ...prev, filename: data.filename || prev.filename };
            case 'done': return { ...prev, done: true, success: data.success, message: data.message, merging: false, percent: data.success ? 100 : prev.percent, phaseLabel: data.success ? 'Complete' : 'Failed' };
            default: return prev;
          }
        });
      }
    );
    esRef.current = ctrl;
  }, [downloadSettings, activeIgAccount]);

  // ── Instagram bulk download ───────────────────────────────────────────────
  const handleInstagramBulkDownload = useCallback(({ videos, quality, account: acct }) => {
    if (esRef.current) esRef.current.close();
    const settings = downloadSettings;
    const items = videos.map((v) => ({ id: v.id, title: v.title, url: v.url, done: false, success: false, percent: 0, speed: '', phase: 'downloading', phaseLabel: 'Downloading...', isMultiFile: false, merging: false }));
    setActiveDownload({ items, quality, audioOnly: false, isBulk: true });

    const qs = new URLSearchParams({ urls: JSON.stringify(videos.map((v) => ({ url: v.url, title: v.title }))), quality, useNumbering: settings.useNumbering ? 'true' : 'false', startNumber: String(settings.startNumber) });
    if (acct || activeIgAccount) qs.set('account', acct || activeIgAccount);
    if (settings.outputDir)  qs.set('outputDir', settings.outputDir);
    if (settings.prefix)     qs.set('prefix', settings.prefix);
    if (settings.suffix)     qs.set('suffix', settings.suffix);
    if (settings.useCustomFilename && settings.customFilenameTemplate) {
      qs.set('mainName', settings.customFilenameTemplate);
    }

    const es = new EventSource(`/api/instagram/bulk-download?${qs}`);
    let closed = false;
    const safeClose = () => { if (!closed) { closed = true; es.close(); } };

    ['item_start', 'item_progress', 'item_done', 'done'].forEach((evt) => {
      es.addEventListener(evt, (e) => {
        let data; try { data = JSON.parse(e.data); } catch { data = {}; }
        if (evt === 'done') { safeClose(); setActiveDownload((prev) => { if (!prev?.items) return prev; return { ...prev, items: prev.items.map((it) => it.done ? it : { ...it, done: true, success: data.success, phaseLabel: data.success ? 'Complete' : 'Done' }) }; }); return; }
        if (evt === 'item_done') {
          if (data.success && data.filePath && videos[data.index]?.transcribe) {
            triggerTranscriptionSilentRef.current?.(data.filePath);
          }
          setActiveDownload((prev) => { if (!prev?.items) return prev; const ni = [...prev.items]; ni[data.index] = { ...ni[data.index], done: true, success: data.success, percent: data.success ? 100 : ni[data.index].percent, phaseLabel: data.success ? 'Complete' : 'Failed' }; return { ...prev, items: ni }; }); return;
        }
        if (evt === 'item_progress') { setActiveDownload((prev) => { if (!prev?.items) return prev; const ni = [...prev.items]; ni[data.index] = { ...ni[data.index], percent: data.percent || 0 }; return { ...prev, items: ni }; }); return; }
        if (evt === 'item_start') { setActiveDownload((prev) => { if (!prev?.items) return prev; const ni = [...prev.items]; ni[data.index] = { ...ni[data.index], phaseLabel: 'Downloading...' }; return { ...prev, items: ni }; }); }
      });
    });
    es.onerror = () => { if (closed) return; safeClose(); };
    esRef.current = { close: safeClose };
  }, [downloadSettings, activeIgAccount]);

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

        <Navbar
          platform={platform}
          onPlatformChange={handlePlatformChange}
          onSettingsClick={() => handlePlatformChange('settings')}
        />

        {result ? (
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft size={15} /> New search
          </button>
        ) : (
          <div className="w-24" />
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 pb-12 relative z-10">

        {/* ── Full-page routes ── */}
        {platform === 'transcribe' && <TranscribePage />}
        {platform === 'settings'   && <SettingsPage   />}

        {/* ── Download pages (YouTube / Instagram) ── */}
        {(platform === 'youtube' || platform === 'instagram') && <>

        {/* ── Batch mode ── */}
        {batchMode && (
          <div className="w-full max-w-3xl mx-auto mt-6 mb-2 animate-fade-slide-up" style={{ animationFillMode: 'both' }}>
            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-800">Batch Download</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Paste multiple YouTube or Instagram URLs, one per line</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setBatchMode(false); setBatchResults([]); setBatchText(''); }}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/...\nhttps://www.youtube.com/@channel/videos`}
                rows={5}
                className="w-full text-sm bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400 focus:bg-white transition-colors resize-none font-mono placeholder-gray-300"
              />

              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">
                  {(() => {
                    const n = dedupeUrls(parseBatchUrls(batchText)).length;
                    return n > 0 ? `${n} URL${n !== 1 ? 's' : ''} detected` : 'No valid URLs yet';
                  })()}
                </span>
                <button
                  type="button"
                  onClick={() => handleBatchProcess(batchText)}
                  disabled={batchProcessing || parseBatchUrls(batchText).length === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:pointer-events-none text-white font-semibold text-sm shadow-sm transition-colors"
                >
                  {batchProcessing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    'Process All'
                  )}
                </button>
              </div>
            </div>

            {batchResults.length > 0 && (
              <BatchResultsView
                results={batchResults}
                onSelectionChange={handleBatchSelectionChange}
                onDownload={handleBatchDownload}
                onReset={() => { setBatchResults([]); setBatchText(''); }}
              />
            )}
          </div>
        )}

        {/* ── Hero section ── */}
        {!result && !batchMode && (
          <div className="text-center max-w-4xl mx-auto w-full mt-8 mb-8">
            {platform === 'instagram' ? (
              <>
                <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1c23] tracking-tight mb-4 leading-tight">
                  Download Instagram <br />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">Reels &amp; Posts</span>
                </h1>
                <p className="text-[#6b7280] text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
                  Save reels, posts, and stories. Log in to access private content.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl font-extrabold text-[#1a1c23] tracking-tight mb-4 leading-tight">
                  Download YouTube Videos <br />
                  <span className="text-blue-600">in High Definition</span>
                </h1>
                <p className="text-[#6b7280] text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium">
                  Fast, free, and secure. Save videos, channels, and audio from YouTube.
                </p>
              </>
            )}
          </div>
        )}

        {/* ── yt-dlp alert ── */}
        {ytdlpStatus && !ytdlpStatus.isUpToDate && (
          <div className="w-full max-w-3xl mx-auto mb-6">
            <YtdlpAlert status={ytdlpStatus} />
          </div>
        )}

        {/* ── URL input ── */}
        <div className={`w-full max-w-3xl mx-auto ${result ? 'mb-4' : 'mb-0'} ${batchMode ? 'hidden' : ''}`}>
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
                  const isIg = /instagram\.com/i.test(pasted);
                  if (isIg && platform !== 'instagram') {
                    // Auto-switch to Instagram tab and set cleaned URL
                    handlePlatformChange('instagram');
                    e.preventDefault();
                    setUrl(cleanInstagramUrl(pasted));
                    setUrlError('');
                    return;
                  }
                  const cleaner = isIg ? cleanInstagramUrl : cleanYouTubeUrl;
                  const cleaned = cleaner(pasted);
                  if (cleaned !== pasted) {
                    e.preventDefault();
                    setUrl(cleaned);
                    setUrlError('');
                  }
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={platform === 'instagram'
                  ? 'Paste Instagram URL — reel, post, story, or profile...'
                  : 'Paste YouTube URL — video, channel, or shorts...'}
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

          {/* ── Instagram profile fetch progress ── */}
          {loading && platform === 'instagram' && igFetchProgress && (
            <div className="mt-4 mx-2 bg-white border border-purple-100 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">
                    {igFetchProgress.channelName ? `@${igFetchProgress.channelName}` : 'Fetching profile…'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-purple-600 tabular-nums">
                  {igFetchProgress.fetched}
                  {igFetchProgress.total ? ` / ${igFetchProgress.total}` : ''} posts
                </span>
              </div>
              {igFetchProgress.total ? (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (igFetchProgress.fetched / igFetchProgress.total) * 100).toFixed(1)}%` }}
                  />
                </div>
              ) : (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse" style={{ width: '40%' }} />
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                {igFetchProgress.total
                  ? `${Math.min(100, Math.round((igFetchProgress.fetched / igFetchProgress.total) * 100))}% complete`
                  : 'Fetching post list…'}
              </p>
            </div>
          )}

          {/* Batch mode entry point */}
          {!result && !batchMode && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setBatchMode(true)}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors underline underline-offset-2 decoration-dotted"
              >
                Batch download multiple URLs at once
              </button>
            </div>
          )}
        </div>

        {/* ── Instagram account bar ── */}
        {platform === 'instagram' && !batchMode && (
          <div className="w-full max-w-3xl mx-auto mt-3 min-h-[32px]">
            {igSetupLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 px-2">
                <svg className="animate-spin w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Setting up Instagram downloader…
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap px-1">
                {igAccounts.map((a) => (
                  <div
                    key={a.username}
                    onClick={() => setActiveIgAccount(a.username)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                      activeIgAccount === a.username
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    @{a.username}
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); handleIgAccountRemove(a.username); }}
                      className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors"
                >
                  + Add account
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Download Settings ── */}
        <div className="w-full max-w-3xl mx-auto mt-3 mb-3 px-1">
          <DownloadSettings
            settings={downloadSettings}
            onChange={setDownloadSettings}
          />
        </div>

        {/* ── Feature badges (landing only) ── */}
        {!result && !loading && !batchMode && (
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

        {/* ── Instagram single post / reel / story result ── */}
        {platform === 'instagram' && result && (result.type === 'post' || result.type === 'reel' || result.type === 'story') && (
          <InstagramPostView
            info={result}
            account={activeIgAccount}
            onDownload={handleInstagramDownload}
          />
        )}

        {/* ── Instagram profile result ── */}
        {platform === 'instagram' && result && (result.type === 'profile' || result.type === 'profile_reels' || result.type === 'profile_tagged') && (
          <InstagramProfileView
            info={result}
            account={activeIgAccount}
            onDownload={handleInstagramDownload}
            onBulkDownload={handleInstagramBulkDownload}
          />
        )}

        </> /* end YouTube/Instagram pages */}
      </main>

      {/* ── Download progress modal ── */}
      {activeDownload && (
        <ProgressModal
          download={activeDownload}
          onClose={handleCloseDownload}
          onCancel={handleCloseDownload}
          onTranscribe={triggerTranscription}
          transcribing={transcribing}
          transcribeResult={transcribeResult}
        />
      )}

      {/* ── Instagram login modal ── */}
      {showLoginModal && (
        <InstagramLoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleIgLoginSuccess}
        />
      )}
    </div>
  );
}
