/**
 * pendingDownloads.js
 *
 * Tracks in-flight single-video downloads in a small JSON file so that if the
 * app itself is closed or crashes mid-download, the next launch can offer to
 * resume it. yt-dlp resumes a partial download on its own (its default
 * --continue behavior) as long as it is re-invoked with the exact same output
 * path - this registry just remembers which requests were in flight and their
 * original parameters, so the frontend can re-issue the identical request.
 *
 * A record is added when a download starts and removed the moment the SSE
 * request ends for ANY reason handled in-process (success, failure, or the
 * user cancelling). A record is only ever left behind when the whole process
 * was killed before that could happen - which is exactly the case this exists
 * to detect. See DECISIONS.md ADR-017.
 */

'use strict';

const fs = require('fs');
const crypto = require('crypto');

const { PENDING_DOWNLOADS_FILE } = require('./paths');

function readAll() {
  try {
    const raw = fs.readFileSync(PENDING_DOWNLOADS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  fs.writeFileSync(PENDING_DOWNLOADS_FILE, JSON.stringify(records, null, 2));
}

// Derive a stable id from the request parameters that determine yt-dlp's
// output path, so re-issuing the identical request reuses the same record.
function makeDownloadId(params) {
  const key = JSON.stringify({
    url: params.url,
    quality: params.quality,
    audioOnly: params.audioOnly,
    outputDir: params.outputDir,
    prefix: params.prefix,
    suffix: params.suffix,
    mainName: params.mainName,
    useNumbering: params.useNumbering,
    sequenceNum: params.sequenceNum,
  });
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

function addPendingDownload(params) {
  const id = makeDownloadId(params);
  const records = readAll().filter((r) => r.id !== id);
  records.push({ id, ...params, title: '', startedAt: new Date().toISOString() });
  writeAll(records);
  return id;
}

// Best-effort: update the display title once yt-dlp reports it, so the
// resume prompt can show something more useful than a bare URL.
function updatePendingDownloadTitle(id, title) {
  const records = readAll();
  const record = records.find((r) => r.id === id);
  if (!record || record.title === title) return;
  record.title = title;
  writeAll(records);
}

function removePendingDownload(id) {
  const records = readAll();
  const next = records.filter((r) => r.id !== id);
  if (next.length !== records.length) writeAll(next);
}

function getPendingDownloads() {
  return readAll();
}

module.exports = {
  makeDownloadId,
  addPendingDownload,
  updatePendingDownloadTitle,
  removePendingDownload,
  getPendingDownloads,
};
