import { NotFoundError } from '../lib/errors.ts';
import { TOOL_IDS } from '../services/tools/toolStatus.ts';
import { oneOf, queryValue } from './fields.ts';

import type { ToolId } from '@shared/tools.ts';

export function parseToolId(value: unknown): ToolId {
  const toolId = TOOL_IDS.find((candidate) => candidate === value);
  if (!toolId) throw new NotFoundError(`There's no tool called "${String(value)}". The tools are: ${TOOL_IDS.join(', ')}.`);
  return toolId;
}

// ?ids=ytdlp,ffmpeg narrows the list; without it every tool is checked
export function parseToolIds(query: Record<string, unknown>): ToolId[] | undefined {
  const ids = queryValue(query.ids);
  if (!ids) return undefined;
  return ids.split(',').map((id) => oneOf(id.trim(), 'ids', TOOL_IDS));
}
