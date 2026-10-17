import { readJsonArray, writeJsonAtomic } from './jsonFile.ts';
import { readDownloadRecord } from './downloadRecord.ts';

import type { DownloadRecord } from './downloadRecord.ts';

// single downloads that have started and not finished: running, paused, or cut off when the app closed (ADR-017)
export interface PendingDownloadStore {
  list(): DownloadRecord[];
  find(downloadId: string): DownloadRecord | null;
  save(record: DownloadRecord): void;
  remove(downloadId: string): boolean;
}

export function createPendingDownloadStore(filePath: string): PendingDownloadStore {
  function readAll(): DownloadRecord[] {
    const records: DownloadRecord[] = [];
    for (const raw of readJsonArray(filePath)) {
      const record = readDownloadRecord(raw);
      if (record) records.push(record);
    }
    return records;
  }

  return {
    list: readAll,

    find(downloadId) {
      return readAll().find((record) => record.id === downloadId) ?? null;
    },

    save(record) {
      const others = readAll().filter((existing) => existing.id !== record.id);
      writeJsonAtomic(filePath, [...others, record]);
    },

    remove(downloadId) {
      const records = readAll();
      const remaining = records.filter((record) => record.id !== downloadId);
      if (remaining.length === records.length) return false;

      writeJsonAtomic(filePath, remaining);
      return true;
    },
  };
}
