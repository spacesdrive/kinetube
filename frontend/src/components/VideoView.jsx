import { useState } from 'react';
import {
  Play,
  Music,
  Download,
  Eye,
  Calendar,
  Clock,
  AlertCircle,
  Zap,
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
const NEEDS_FFMPEG = ['best', '2160p', '1440p', '1080p'];

function formatNumber(n) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(uploadDate) {
  if (!uploadDate) return '—';
  const s = uploadDate.toString();
  if (s.length === 8) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

export default function VideoView({ info, ffmpegAvailable, onDownload }) {
  const [tab, setTab] = useState('video'); // 'video' | 'audio'
  const [videoQuality, setVideoQuality] = useState('best');
  const [audioQuality, setAudioQuality] = useState('best_audio');

  const handleVideoDownload = () => {
    onDownload({
      url: info.cleanUrl,
      quality: videoQuality,
      audioOnly: false,
      title: info.title,
    });
  };

  const handleAudioDownload = () => {
    onDownload({
      url: info.cleanUrl,
      quality: 'best',
      audioOnly: true,
      title: info.title,
    });
  };

  const needsFFmpeg = NEEDS_FFMPEG.includes(videoQuality);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Video preview card */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
        <div className="flex flex-col md:flex-row gap-0">
          {/* Thumbnail */}
          <div className="relative md:w-72 flex-shrink-0">
            <img
              src={info.thumbnail}
              alt={info.title}
              className="w-full h-48 md:h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                <Play size={22} className="text-blue-600 ml-1" fill="currentColor" />
              </div>
            </div>
            {info.durationString && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-0.5 rounded-md">
                {info.durationString}
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
                {info.title}
              </h2>
              {info.uploader && (
                <p className="text-sm text-blue-600 font-medium mb-3">{info.uploader}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                {info.viewCount && (
                  <span className="flex items-center gap-1">
                    <Eye size={13} /> {formatNumber(info.viewCount)} views
                  </span>
                )}
                {info.uploadDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {formatDate(info.uploadDate)}
                  </span>
                )}
                {info.durationString && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {info.durationString}
                  </span>
                )}
              </div>
              {info.description && (
                <p className="text-xs text-gray-400 mt-3 line-clamp-2">{info.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download options */}
      <div className="mt-5 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab switcher */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('video')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              tab === 'video'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Play size={16} />
            Video + Audio
          </button>
          <button
            onClick={() => setTab('audio')}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              tab === 'audio'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Music size={16} />
            Audio Only (MP3)
          </button>
        </div>

        <div className="p-6">
          {tab === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Quality
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {VIDEO_QUALITIES.map((q) => {
                    const needsMerge = NEEDS_FFMPEG.includes(q);
                    const unavailable = needsMerge && !ffmpegAvailable;
                    return (
                      <button
                        key={q}
                        onClick={() => !unavailable && setVideoQuality(q)}
                        disabled={unavailable}
                        className={`relative px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-center ${
                          videoQuality === q
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : unavailable
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        {QUALITY_LABELS[q]}
                        {needsMerge && (
                          <span className="block text-xs mt-0.5 font-normal opacity-70">
                            {unavailable ? 'Needs FFmpeg' : 'FFmpeg req.'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {needsFFmpeg && !ffmpegAvailable && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      FFmpeg is required to merge video+audio for qualities above 720p. Install FFmpeg and
                      restart the server, or choose 720p or below.
                    </span>
                  </div>
                )}

                {needsFFmpeg && ffmpegAvailable && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-green-600 bg-green-50 rounded-xl px-3 py-2.5">
                    <Zap size={14} className="flex-shrink-0 mt-0.5" />
                    <span>FFmpeg detected — video and audio will be merged automatically.</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleVideoDownload}
                disabled={needsFFmpeg && !ffmpegAvailable}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-md hover:shadow-lg"
              >
                <Download size={18} />
                Download Video — {QUALITY_LABELS[videoQuality]}
              </button>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700 font-medium">
                Downloads the best available audio track and converts it to MP3.
              </div>

              {info.audioFormats && info.audioFormats.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Available audio streams</p>
                  <div className="flex flex-wrap gap-2">
                    {info.audioFormats.map((af) => (
                      <span
                        key={af.formatId}
                        className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium"
                      >
                        {af.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleAudioDownload}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors text-base shadow-md hover:shadow-lg"
              >
                <Music size={18} />
                Download Audio (MP3)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
