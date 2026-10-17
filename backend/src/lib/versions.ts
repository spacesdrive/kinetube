// compares calendar versions part by part, so "2026.3.10" is newer than "2026.3.9" and "2026.03.17.1" than "2026.03.17"
export function isNewerVersion(candidate: string | null | undefined, current: string | null | undefined): boolean {
  if (!candidate || !current) return false;

  const candidateParts = candidate.trim().split(/[.-]/).map(Number);
  const currentParts = current.trim().split(/[.-]/).map(Number);
  const partCount = Math.max(candidateParts.length, currentParts.length);

  for (let index = 0; index < partCount; index++) {
    const candidatePart = candidateParts[index] ?? 0;
    const currentPart = currentParts[index] ?? 0;
    if (candidatePart !== currentPart) return candidatePart > currentPart;
  }
  return false;
}
