import { isRecord } from '../../lib/lineSplitter.ts';
import { YTDLP_REPO } from './ytdlpBinary.ts';

const LATEST_RELEASE_API = `https://api.github.com/repos/${YTDLP_REPO}/releases/latest`;

// GitHub answers in well under a second; after 8 seconds the check counts as unreachable
const RELEASE_CHECK_TIMEOUT_MS = 8_000;

// the newest published tag, or null when GitHub is unreachable, rate limited or answers something unexpected
export async function fetchLatestYtdlpTag(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetchImpl(LATEST_RELEASE_API, {
      headers: { 'User-Agent': 'KineTube', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(RELEASE_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.tag_name !== 'string') return null;
    return body.tag_name;
  } catch {
    // offline or timed out: the caller tells the person GitHub could not be reached
    return null;
  }
}
