import { useState, useMemo } from 'react';
import {
  Download,
  Music,
  CheckSquare,
  Square,
  Play,
  Eye,
  Calendar,
  Clock,
  Search,
  Users,
  Video,
  Zap,
  ChevronDown,
} from 'lucide-react';

const VIDEO_QUALITIES = ['best', '2160p', '1440p', '1080p', '720p', '480p', '360p'];
const QUALITY_LABELS = {
  best: 'Best Available',
  '2160p': '4K (2160p)',
  '1440p': '2K (1440p)',
  '1080p': '1080p Full HD',
  '720p': '720p HD',
  '480p': '480p SD',
  '360p': '360p',
};

function formatNumber(n) {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(uploadDate) {
  if (!uploadDate) return null;
  const s = uploadDate.toString();
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function VideoCard({ video, selected, onToggle, onDownload, ffmpegAvailable }) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [dlQuality, setDlQuality] = useState('best');

  return (
    <div
      className={`relative flex gap-3 p-3 rounded-2xl border transition-all cursor-pointer group ${
        selected
          ? 'border-blue-300 bg-blue-50/60'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
      }`}
      onClick={() => onToggle(video.id)}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 mt-0.5">
        {selected ? (
          <CheckSquare size={18} className="text-blue-600" />
        ) : (
          <Square size={18} className="text-gray-300 group-hover:text-gray-400" />
        )}
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 relative w-28 h-16 rounded-xl overflow-hidden bg-gray-100">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {video.durationString && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 py-0.5 rounded">
            {video.durationString}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">
          {video.title}
        </p>
        <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
          {formatNumber(video.viewCount) && (
            <span className="flex items-center gap-1">
              <Eye size={11} /> {formatNumber(video.viewCount)}
            </span>
          )}
          {formatDate(video.uploadDate) && (
            <span className="flex items-center gap-1">
              <Calendar size={11} /> {formatDate(video.uploadDate)}
            </span>
          )}
        </div>
      </div>

      {/* Individual download button */}
      <div
        className="flex-shrink-0 self-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu((v) => !v)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
            title="Download this video"
          >
            <Download size={15} />
          </button>

          {showDownloadMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDownloadMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-52">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Quality
                </p>
                <div className="space-y-1 mb-3">
                  {VIDEO_QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => setDlQuality(q)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        dlQuality === q
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownload({ videos: [video], quality: dlQuality, audioOnly: false });
                    }}
                    className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    <Play size={12} /> Download Video
                  </button>
                  <button
                    onClick={() => {
                      setShowDownloadMenu(false);
                      onDownload({ videos: [video], quality: 'best', audioOnly: true });
                    }}
                    className="flex items-center gap-1.5 w-full px-2.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                  >
                    <Music size={12} /> Audio Only (MP3)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChannelView({ info, ffmpegAvailable, onDownload }) {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [bulkQuality, setBulkQuality] = useState('best');
  const [showQualityPicker, setShowQualityPicker] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return info.entries;
    const q = search.toLowerCase();
    return info.entries.filter((v) => v.title?.toLowerCase().includes(q));
  }, [info.entries, search]);

  const allSelected = filtered.length > 0 && filtered.every((v) => selected.has(v.id));
  const someSelected = filtered.some((v) => selected.has(v.id));

  const toggleVideo = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.add(v.id));
        return next;
      });
    }
  };

  const selectedVideos = info.entries.filter((v) => selected.has(v.id));
  const downloadTarget = selectedVideos.length > 0 ? selectedVideos : filtered;
  const downloadCount = downloadTarget.length;

  const handleBulkVideoDownload = () => {
    onDownload({ videos: downloadTarget, quality: bulkQuality, audioOnly: false });
  };

  const handleBulkAudioDownload = () => {
    onDownload({ videos: downloadTarget, quality: 'best', audioOnly: true });
  };

  const isChannelShorts = info.type === 'channel_shorts';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Channel header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
        {info.avatar && (
          <img
            src={info.avatar}
            alt={info.channelName}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0 bg-gray-100"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">{info.channelName}</h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {isChannelShorts ? (
              <span className="flex items-center gap-1">
                <Zap size={14} className="text-amber-500" />
                Shorts channel
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Video size={14} />
                Videos
              </span>
            )}
            <span className="flex items-center gap-1">
              <Play size={14} />
              {info.videoCount} {isChannelShorts ? 'shorts' : 'videos'} found
            </span>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Select all */}
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors px-3 py-2 rounded-xl hover:bg-blue-50"
          >
            {allSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>

          {someSelected && (
            <span className="text-sm text-blue-600 font-medium">
              {selectedVideos.length} selected
            </span>
          )}

          <div className="flex-1" />

          {/* Quality picker */}
          <div className="relative">
            <button
              onClick={() => setShowQualityPicker((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 bg-white"
            >
              {QUALITY_LABELS[bulkQuality]}
              <ChevronDown size={14} />
            </button>
            {showQualityPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowQualityPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 w-44">
                  {VIDEO_QUALITIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => { setBulkQuality(q); setShowQualityPicker(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                        bulkQuality === q ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {QUALITY_LABELS[q]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Download video */}
          <button
            onClick={handleBulkVideoDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Download size={15} />
            Download {downloadCount} Video{downloadCount !== 1 ? 's' : ''}
          </button>

          {/* Download audio */}
          <button
            onClick={handleBulkAudioDownload}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Music size={15} />
            {downloadCount} Audio (MP3)
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${isChannelShorts ? 'shorts' : 'videos'}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />
      </div>

      {/* Video list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search size={32} className="mx-auto mb-3 opacity-40" />
            <p>No results found for "{search}"</p>
          </div>
        ) : (
          filtered.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              selected={selected.has(video.id)}
              onToggle={toggleVideo}
              onDownload={onDownload}
              ffmpegAvailable={ffmpegAvailable}
            />
          ))
        )}
      </div>
    </div>
  );
}
