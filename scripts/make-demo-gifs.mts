// films each Flute scene to MP4, then FFmpeg makes it a README GIF; needs `npm run dev` running (docs/workflows/DEMOS.md)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const SCENES = path.join(FRONTEND, 'src', 'flute', 'scenes');
const EXPORTS = path.join(FRONTEND, '.flute', 'exports');
const MEDIA = path.join(ROOT, 'docs', 'media');
const FLUTE_CLI = path.join(FRONTEND, 'node_modules', '@webprodigies', 'flute', 'dist', 'cli', 'flute.js');
const DEV_SERVER = 'http://localhost:5173';

// a moving camera changes every pixel, so fewer frames and colours keep each GIF near 5 MB with sharp text
const GIF_FILTER = 'setpts=0.7*PTS,fps=12,scale=800:-1:flags=lanczos,split[a][b];'
  + '[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle';

function allSceneIds(): string[] {
  return fs.readdirSync(SCENES).filter((name) => name.endsWith('.scene.json')).map((name) => name.replace('.scene.json', ''));
}

function makeGif(sceneId: string): void {
  const video = path.join(EXPORTS, `${sceneId}.mp4`);
  // Flute never overwrites an export, so the last one goes first
  fs.rmSync(video, { force: true });

  // node runs the CLI directly: a Windows shell would split the scene URL at its "&"
  execFileSync(process.execPath, [
    FLUTE_CLI, 'export',
    '--url', `${DEV_SERVER}/?flute-preview=1&flute-scene=${sceneId}`,
    '--output', path.relative(FRONTEND, video),
    '--fps', '30',
  ], { cwd: FRONTEND, stdio: 'inherit' });

  const gif = path.join(MEDIA, `${sceneId}.gif`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-vf', GIF_FILTER, gif], { stdio: 'inherit' });
  console.log(`${path.relative(ROOT, gif)}: ${(fs.statSync(gif).size / 1024 / 1024).toFixed(1)} MB`);
}

const requested = process.argv.slice(2);
const sceneIds = requested.length > 0 ? requested : allSceneIds();
fs.mkdirSync(EXPORTS, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });

for (const sceneId of sceneIds) {
  try {
    makeGif(sceneId);
  } catch (error) {
    console.error(`Couldn't make the GIF for "${sceneId}": ${(error as Error).message}`);
    console.error('Check that `npm run dev` is running and that FFmpeg and Playwright\'s Chromium are installed.');
    process.exit(1);
  }
}
