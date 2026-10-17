import type { ToolInstallEvents, ToolPhase } from '@shared/tools.ts';
import type { StreamEvent } from '@/services/eventStream';

export type SetupToolId = 'ytdlp' | 'ffmpeg';

export interface ToolSetupState {
  phase: ToolPhase | 'waiting';
  percent: number;
  bytesPerSecond: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
}

export const WAITING_TOOL: ToolSetupState = { phase: 'waiting', percent: 0, bytesPerSecond: 0, downloadedBytes: 0, totalBytes: 0, message: '' };

export function applyToolEvent(state: ToolSetupState, ...[event, data]: StreamEvent<ToolInstallEvents>): ToolSetupState {
  if (event === 'phase') return { ...state, phase: data.phase, message: data.message, percent: data.phase === 'done' ? 100 : state.percent };
  if (event === 'progress') {
    const { percent, bytesPerSecond, downloadedBytes, totalBytes } = data;
    return { ...state, percent, bytesPerSecond, downloadedBytes, totalBytes };
  }
  if (event !== 'done') return state;
  if (data.success) return { ...state, phase: 'done', percent: 100, message: data.message };
  return { ...state, phase: 'error', message: data.message };
}

export function isActivePhase(phase: ToolSetupState['phase']): boolean {
  return phase !== 'waiting' && phase !== 'done' && phase !== 'error';
}
