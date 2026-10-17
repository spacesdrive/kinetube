import fs from 'node:fs';
import path from 'node:path';

export const WHISPER_VERSION = '1.8.4';
export const WHISPER_REPO_URL = 'https://github.com/ggml-org/whisper.cpp.git';

// ggml-org publishes prebuilt binaries for Windows only (ADR-012)
export const WHISPER_WINDOWS_ZIP_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/v${WHISPER_VERSION}/whisper-blas-bin-x64.zip`;

export function whisperBinaryName(platform: NodeJS.Platform): string {
  return platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
}

// whisper.cpp renamed main to whisper-cli in 1.7, so an older install is still found
function binaryCandidates(downloadsDir: string, platform: NodeJS.Platform): string[] {
  const extension = platform === 'win32' ? '.exe' : '';
  return [path.join(downloadsDir, `whisper-cli${extension}`), path.join(downloadsDir, `main${extension}`)];
}

export function findWhisperBinary(downloadsDir: string, platform: NodeJS.Platform): string | null {
  return binaryCandidates(downloadsDir, platform).find((candidate) => fs.existsSync(candidate)) ?? null;
}
