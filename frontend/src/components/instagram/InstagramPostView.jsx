import { useState } from 'react';
import { Download, Heart, Eye, Clock, User, Play } from 'lucide-react';

// Instagram hides like counts in most regions since 2021.
// yt-dlp returns -1 as the sentinel for "hidden". We return null so callers
// can decide not to render the stat at all.
function fmtNum(n) {
  if (n == null || n < 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtDuration(s) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Route thumbnail URL through the backend proxy to avoid Instagram CDN blocks
function proxyUrl(url) {
  if (!url) return null;
  return `/api/proxy/img?url=${encodeURIComponent(url)}`;
}

const QUALITIES = [
  { label: 'Best', value: 'best' },
  { label: '1080p', value: '1080p' },
  { label: '720p',  value: '720p'  },
  { label: '480p',  value: '480p'  },
];

// Inline toggle used for the transcription option
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative flex-shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-purple-500' : 'bg-gray-200'}`}
      style={{ minWidth: '2.5rem', height: '1.375rem' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(1.125rem)' : 'translateX(0)' }}
      />
    </button>
  );
}

export default function InstagramPostView({ info, account, onDownload }) {
  const [quality, setQuality]       = useState('best');
  const [thumbError, setThumbError] = useState(false);
  const [transcribe, setTranscribe] = useState(false);

  const isReel = info.type === 'reel';
  const typeLabel = isReel ? 'Reel' : info.type === 'story' ? 'Story' : 'Post';

  const views    = fmtNum(info.viewCount);
  const likes    = fmtNum(info.likeCount);   // null if hidden
  const duration = info.duration ? fmtDuration(info.duration) : null;

  // Compute thumbnail container aspect ratio.
  // Use actual dimensions if yt-dlp returned them; otherwise default by type.
  // We cap portrait aspect ratios so the card doesn't grow taller than ~34rem.
  let thumbAspect;
  if (info.width && info.height && info.width > 0) {
    thumbAspect = info.height / info.width;
  } else {
    thumbAspect = isReel ? 16 / 9 : 1; // 9:16 portrait → 16/9 ratio (h/w)
  }
  // Cap at 1.0 (square) so portrait reels don't dominate the viewport
  const cappedAspect = Math.min(thumbAspect, 1.0);
  const paddingPct   = (cappedAspect * 100).toFixed(2);

  const thumb = !thumbError && info.thumbnail ? proxyUrl(info.thumbnail) : null;

  return (
    <div
      className="w-full max-w-3xl mx-auto mt-6"
      style={{ animation: 'fadeSlideUp 0.35s ease both' }}
    >
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
        {/*
          The padding-bottom trick creates a box whose height is always in the
          correct ratio to its width, so portrait reels display at ~9:16 and
          square posts at 1:1 — without any black bars or cropping.
          We cap aspect ratios above 1.8 so very tall content stays usable.
        */}
        <div
          className="relative bg-gray-900 w-full overflow-hidden"
          style={{ paddingBottom: `${paddingPct}%` }}
        >
          {thumb ? (
            <img
              src={thumb}
              alt={info.title}
              style={{
                position:   'absolute',
                inset:      0,
                width:      '100%',
                height:     '100%',
                objectFit:  'cover',
                objectPosition: 'center',
              }}
              onError={() => setThumbError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play size={48} className="text-white/20" />
            </div>
          )}

          {/* Type badge */}
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
            {isReel ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              </svg>
            )}
            {typeLabel}
          </span>

          {duration && (
            <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg text-xs font-mono font-semibold bg-black/60 text-white">
              {duration}
            </span>
          )}
        </div>

        {/* ── Info ─────────────────────────────────────────────────────────── */}
        <div className="p-5">
          <h2 className="text-lg font-bold text-gray-800 leading-snug mb-1 line-clamp-2">
            {info.title || 'Untitled'}
          </h2>

          {info.uploader && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
              <User size={13} />
              <span>@{info.uploader}</span>
            </div>
          )}

          {/* Stats — only render non-null values */}
          {(views || likes || duration) && (
            <div className="flex items-center gap-4 mb-5 text-sm text-gray-500">
              {views && (
                <span className="flex items-center gap-1">
                  <Eye size={13} />{views}
                </span>
              )}
              {likes && (
                <span className="flex items-center gap-1">
                  <Heart size={13} />{likes}
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock size={13} />{duration}
                </span>
              )}
            </div>
          )}

          {/* Quality + Download */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {QUALITIES.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setQuality(q.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      quality === q.value
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onDownload({ url: info.cleanUrl, quality, title: info.title, account, transcribe })}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200 ml-auto"
              >
                <Download size={15} />
                Download
              </button>
            </div>

            {/* Transcription toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-600">Transcribe after download</p>
                <p className="text-xs text-gray-400">Generate a text transcript using Whisper AI</p>
              </div>
              <Toggle checked={transcribe} onChange={setTranscribe} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
