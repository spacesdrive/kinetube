export type LogFields = Record<string, unknown>;

export interface Logger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

type LogLevel = 'info' | 'warn' | 'error';

// errors do not serialize to JSON on their own, so keep the parts worth reading in backend.log
function toLoggable(value: unknown): unknown {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
}

// one JSON line per entry; Electron copies the backend's stdout into backend.log
export function createLogger(write: (line: string) => void = (line) => process.stdout.write(line)): Logger {
  function log(level: LogLevel, message: string, fields: LogFields = {}): void {
    const entry: LogFields = { level, time: new Date().toISOString(), message };
    for (const [key, value] of Object.entries(fields)) {
      entry[key] = toLoggable(value);
    }
    write(`${JSON.stringify(entry)}\n`);
  }

  return {
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
  };
}
