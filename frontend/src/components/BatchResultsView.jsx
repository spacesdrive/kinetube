/**
 * BatchResultsView
 *
 * Displays the results of batch URL processing.
 * Each URL becomes a card showing:
 *   - loading / error state
 *   - single item (video, reel, post, shorts, story) with checkbox
 *   - multi-item (channel, profile) with expand/collapse and per-item checkboxes
 *
 * Props:
 *   results        — array of result objects (see App.jsx for shape)
 *   onSelectionChange(index, newSelectedIds) — called when selection changes
 *   onDownload(quality) — called when user clicks "Download Selected"
 *   onReset()      — clears results and goes back to batch input
 */

import { useState, useMemo } from 'react';
import { Download, ChevronDown, Play, X, AlertTriangle, Eye, Clock } from 'lucide-react';

// Route Instagram CDN URLs through the backend proxy (direct browser requests are blocked)
function thumb(url, platform) {
  if (!url) return null;
  if (platform === 'instagram') return `/api/proxy/img?url=${encodeURIComponent(url)}`;
  return url;
}

function fmtNum(n) {
  if (!n || n < 0) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin flex-shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Platform badge ────────────────────────────────────────────────────────────
function PlatformBadge({ platform }) {
  return platform === 'instagram' ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-pink-600">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
      Instagram
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600">
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
      YouTube
    </span>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, partial = false, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150"
      style={{
        borderColor: checked || partial ? '#8b5cf6' : '#d1d5db',
        background: checked ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : partial ? '#ede9fe' : 'white',
      }}
    >
      {checked && (
        <svg viewBox="0 0 12 12" fill="white" className="w-3 h-3">
          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
      {partial && !checked && (
        <div className="w-2 h-0.5 bg-purple-500 rounded" />
      )}
    </button>
  );
}

// ── Loading card ──────────────────────────────────────────────────────────────
function LoadingCard({ url, status }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm">
      {status === 'loading' ? (
        <Spinner size={16} />
      ) : (
        <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0" />
      )}
      <span className="text-sm text-gray-500 truncate flex-1">{url}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">{status === 'loading' ? 'Fetching…' : 'Pending'}</span>
    </div>
  );
}

// ── Error card ────────────────────────────────────────────────────────────────
function ErrorCard({ url, error }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-red-600 font-medium mb-0.5 truncate">{url}</p>
          <p className="text-xs text-red-500">{error}</p>
        </div>
      </div>
    </div>
  );
}

// ── Single item card (video / reel / post / story / shorts) ───────────────────
function SingleCard({ result, onSelectionChange }) {
  const { url, platform, info, selectedIds } = result;
  const itemId   = info.id || url;
  const selected = selectedIds.has(itemId);
  const isIg     = platform === 'instagram';

  const toggle = () => {
    const next = new Set(selectedIds);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    onSelectionChange(next);
  };

  const [imgErr, setImgErr] = useState(false);
  const thumbSrc = !imgErr ? thumb(info.thumbnail, platform) : null;

  // Instagram thumbnails are portrait (9:16); YouTube are landscape (16:9)
  const thumbClass = isIg
    ? 'w-14 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden' // portrait
    : 'w-24 h-14 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden'; // landscape

  return (
    <div
      onClick={toggle}
      className={`flex items-start gap-3 bg-white border rounded-2xl p-3 mb-3 cursor-pointer transition-all duration-150 ${
        selected ? 'border-purple-300 shadow-sm shadow-purple-50' : 'border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="pt-0.5">
        <Checkbox checked={selected} onChange={toggle} />
      </div>

      {/* Thumbnail */}
      <div className={thumbClass} style={isIg ? { aspectRatio: '9/16' } : {}}>
        {thumbSrc ? (
          <img
            src={thumbSrc}
            alt={info.title}
            className="w-full h-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={16} className="text-gray-300" />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
          {info.title || 'Untitled'}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <PlatformBadge platform={platform} />
          {(info.uploader || info.channelName) && (
            <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
              {info.uploader || info.channelName}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {info.durationString && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Clock size={10} />{info.durationString}
            </span>
          )}
          {fmtNum(info.viewCount) && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Eye size={10} />{fmtNum(info.viewCount)} views
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Multi-item card (channel / profile) ───────────────────────────────────────
function MultiCard({ result, expanded, onToggleExpand, onSelectionChange }) {
  const { platform, info, selectedIds } = result;
  const entries  = info.entries || [];
  const allSel   = entries.length > 0 && selectedIds.size === entries.length;
  const partSel  = selectedIds.size > 0 && selectedIds.size < entries.length;

  const toggleAll = (e) => {
    e.stopPropagation();
    onSelectionChange(allSel ? new Set() : new Set(entries.map((e) => e.id)));
  };

  const toggleEntry = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const [avatarErr, setAvatarErr] = useState(false);

  const name = info.channelName || info.username || (platform === 'instagram' ? 'Profile' : 'Channel');

  return (
    <div className={`bg-white border rounded-2xl mb-3 overflow-hidden transition-all duration-150 ${
      selectedIds.size > 0 ? 'border-purple-200 shadow-sm' : 'border-gray-100'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-3 cursor-pointer select-none" onClick={onToggleExpand}>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={allSel} partial={partSel} onChange={toggleAll} />
        </div>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {!avatarErr && info.avatar ? (
            <img src={thumb(info.avatar, platform)} alt={name} className="w-full h-full object-cover" onError={() => setAvatarErr(true)} />
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-gray-300">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <PlatformBadge platform={platform} />
            <span className="text-[10px] text-gray-400">
              {entries.length} items
              {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
            </span>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Expanded grid */}
      {expanded && (
        <div className="border-t border-gray-50 p-3">
          {entries.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No items found.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
              {entries.map((entry) => {
                const isSel = selectedIds.has(entry.id);
                return (
                  <EntryThumb
                    key={entry.id}
                    entry={entry}
                    selected={isSel}
                    onToggle={() => toggleEntry(entry.id)}
                    platform={platform}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryThumb({ entry, selected, onToggle, platform }) {
  const [err, setErr] = useState(false);
  return (
    <div
      onClick={onToggle}
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-100 ${
        selected ? 'ring-2 ring-purple-400 ring-offset-1' : 'hover:opacity-80'
      }`}
    >
      {!err && entry.thumbnail ? (
        <img
          src={thumb(entry.thumbnail, platform)}
          alt={entry.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Play size={14} className="text-gray-300" />
        </div>
      )}
      {selected && (
        <div className="absolute inset-0 bg-purple-500/20 flex items-end justify-end p-1">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow">
            <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
      {entry.duration && !selected && (
        <span className="absolute bottom-0.5 right-0.5 px-1 text-[9px] font-mono font-semibold bg-black/60 text-white rounded">
          {Math.floor(entry.duration / 60)}:{String(Math.floor(entry.duration % 60)).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

// ── Inline toggle ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-500' : 'bg-gray-200'}`}
      style={{ minWidth: '2.5rem', height: '1.375rem' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(1.125rem)' : 'translateX(0)' }}
      />
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

const QUALITIES = [
  { label: 'Best', value: 'best' },
  { label: '1080p', value: '1080p' },
  { label: '720p',  value: '720p'  },
  { label: '480p',  value: '480p'  },
];

export default function BatchResultsView({ results, onSelectionChange, onDownload, onReset }) {
  const [quality, setQuality]       = useState('best');
  const [transcribe, setTranscribe] = useState(false);
  const [expanded, setExpanded]     = useState(new Set());

  const toggleExpand = (url) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  };

  const totalSelected = useMemo(() => {
    return results.reduce((acc, r) => {
      if (r.status !== 'ready') return acc;
      return acc + r.selectedIds.size;
    }, 0);
  }, [results]);

  const readyCount  = results.filter((r) => r.status === 'ready').length;
  const errorCount  = results.filter((r) => r.status === 'error').length;
  const loadingCount = results.filter((r) => r.status === 'loading' || r.status === 'pending').length;

  const MULTI_TYPES = new Set(['channel', 'channel_videos', 'channel_shorts', 'profile', 'profile_reels', 'profile_tagged']);

  return (
    <div className="w-full max-w-3xl mx-auto mt-4">
      {/* ── Summary bar ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
          {loadingCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Spinner size={12} />
              {loadingCount} fetching…
            </span>
          )}
          {readyCount > 0 && (
            <span className="text-green-600 font-medium">{readyCount} ready</span>
          )}
          {errorCount > 0 && (
            <span className="text-red-500">{errorCount} failed</span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
        >
          <X size={12} />
          Clear
        </button>
      </div>

      {/* ── Result cards ── */}
      <div>
        {results.map((r, i) => {
          if (r.status === 'pending' || r.status === 'loading') {
            return <LoadingCard key={r.url} url={r.url} status={r.status} />;
          }
          if (r.status === 'error') {
            return <ErrorCard key={r.url} url={r.url} error={r.error} />;
          }
          const isMulti = MULTI_TYPES.has(r.info?.type);
          if (isMulti) {
            return (
              <MultiCard
                key={r.url}
                result={r}
                expanded={expanded.has(r.url)}
                onToggleExpand={() => toggleExpand(r.url)}
                onSelectionChange={(ids) => onSelectionChange(i, ids)}
              />
            );
          }
          return (
            <SingleCard
              key={r.url}
              result={r}
              onSelectionChange={(ids) => onSelectionChange(i, ids)}
            />
          );
        })}
      </div>

      {/* ── Sticky download bar ── */}
      {totalSelected > 0 && (
        <div className="sticky bottom-6 z-20 bg-white border border-gray-100 rounded-2xl shadow-xl px-4 py-3 mt-4 space-y-2.5">
          {/* Top row: count + quality + download button */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-700">
              {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
            </span>

            <div className="flex items-center gap-2">
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 transition-colors"
              >
                {QUALITIES.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onDownload(quality, transcribe)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Download size={14} />
                Download
              </button>
            </div>
          </div>

          {/* Transcription toggle row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs font-medium text-gray-600">Transcribe after download</p>
              <p className="text-[10px] text-gray-400">Generate text transcripts using Whisper AI</p>
            </div>
            <Toggle checked={transcribe} onChange={setTranscribe} />
          </div>
        </div>
      )}
    </div>
  );
}
