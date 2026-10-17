// films each Flute scene, then makes it a README WebP; needs `npm run dev` (docs/workflows/DEMOS.md)

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

// WebP keeps full colour at about a fifth of a GIF's size, so the README loads in seconds (issue #13)
const WEBP_FILTER = 'setpts=0.7*PTS,fps=12,scale=800:-1:flags=lanczos';
const WEBP_OPTIONS = ['-c:v', 'libwebp_anim', '-lossless', '0', '-q:v', '75', '-compression_level', '6', '-loop', '0', '-an'];

function allSceneIds(): string[] {
  return fs.readdirSync(SCENES).filter((name) => name.endsWith('.scene.json')).map((name) => name.replace('.scene.json', ''));
}

function makeDemo(sceneId: string): void {
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

  const webp = path.join(MEDIA, `${sceneId}.webp`);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-vf', WEBP_FILTER, ...WEBP_OPTIONS, webp], { stdio: 'inherit' });
  console.log(`${path.relative(ROOT, webp)}: ${(fs.statSync(webp).size / 1024 / 1024).toFixed(1)} MB`);
}

const requested = process.argv.slice(2);
const sceneIds = requested.length > 0 ? requested : allSceneIds();
fs.mkdirSync(EXPORTS, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });

for (const sceneId of sceneIds) {
  try {
    makeDemo(sceneId);
  } catch (error) {
    console.error(`Couldn't make the animation for "${sceneId}": ${(error as Error).message}`);
    console.error('Check that `npm run dev` is running and that FFmpeg (with libwebp) and Playwright\'s Chromium are installed.');
    process.exit(1);
  }
}
