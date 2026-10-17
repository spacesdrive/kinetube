interface ErrorHint {
  keywords: string[];
  hint: string;
}

// checked in order; the first rule whose keyword appears in yt-dlp's error output wins
const HINTS: ErrorHint[] = [
  { keywords: ['private', 'login required', 'not available'], hint: 'This content is private or needs a login. Add an Instagram account in the Instagram tab.' },
  { keywords: ['429', 'rate', 'too many'], hint: 'Instagram is limiting requests. Wait a few minutes and try again.' },
  { keywords: ['removed', 'deleted', 'no longer available'], hint: 'This post seems to have been deleted.' },
  { keywords: ['geo', 'not available in your country'], hint: "This content isn't available in your region." },
  { keywords: ['age', '18+', 'age-restricted'], hint: 'This content is age-restricted. Log in to an Instagram account to download it.' },
  { keywords: ['captcha', 'challenge'], hint: 'Instagram asked for a bot check. Try again later, or log in to an account.' },
];

const FALLBACK_HINT = 'Instagram may be temporarily unavailable. Try again in a few minutes.';

export function isRateLimited(stderr: string): boolean {
  const text = stderr.toLowerCase();
  return ['429', 'rate', 'too many'].some((keyword) => text.includes(keyword));
}

export function hintForError(stderr: string): string {
  const text = stderr.toLowerCase();
  const match = HINTS.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)));
  return match?.hint ?? FALLBACK_HINT;
}
