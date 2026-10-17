// turns stdout chunks into whole trimmed lines: "a\nb" + "c\n" -> "a", "bc"
export function createLineSplitter(onLine: (line: string) => void): (chunk: Buffer | string) => void {
  let buffered = '';

  return (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) onLine(trimmed);
    }
  };
}

export function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
