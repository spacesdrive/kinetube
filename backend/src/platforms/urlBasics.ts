// "m.youtube.com/watch?v=x#t=10" -> a URL with https, no fragment; null when it cannot be read as a URL
export function readUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  let text = rawUrl.trim().split('#')[0] ?? '';
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;

  try {
    return new URL(text);
  } catch {
    return null;
  }
}

// "www.youtube.com" and "m.youtube.com" -> "youtube.com"
export function bareHostname(url: URL): string {
  return url.hostname.replace(/^(www\.|m\.)/, '');
}
