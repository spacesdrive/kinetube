import type { DownloadSettings } from '@/lib/settings';

export interface TemplateField {
  label: string;
  value: string;
  description: string;
  example: string;
}

export const TEMPLATE_FIELDS: readonly TemplateField[] = [
  { label: 'Title', value: '%(title)s', description: 'Video title', example: 'My Video Title' },
  { label: 'Uploader', value: '%(uploader)s', description: 'Channel name', example: 'Channel Name' },
  { label: 'Date', value: '%(upload_date)s', description: 'Upload date as YYYYMMDD', example: '20240315' },
  { label: 'ID', value: '%(id)s', description: 'Video ID', example: 'dQw4w9WgXcQ' },
  { label: 'Duration', value: '%(duration)s', description: 'Length in seconds', example: '213' },
  { label: 'Views', value: '%(view_count)s', description: 'View count', example: '1234567' },
];

function fillTemplate(template: string): string {
  let filled = template;
  for (const field of TEMPLATE_FIELDS) filled = filled.replaceAll(field.value, field.example);
  // fields this preview does not know are shown by name: "%(album)s" -> "(album)"
  return filled.replace(/%\((\w+)\)s/g, '($1)');
}

// roughly what the file will be called: numbering 3 with prefix "Clip" -> "03 - Clip Video Title.mp4"
export function previewFileName(settings: DownloadSettings): string {
  const { useNumbering, startNumber, prefix, suffix, useCustomFilename, customFilenameTemplate } = settings;
  const parts: string[] = [];

  if (useNumbering) parts.push(`${String(startNumber).padStart(2, '0')} -`);
  if (prefix.trim()) parts.push(prefix.trim());
  parts.push(useCustomFilename && customFilenameTemplate.trim() ? fillTemplate(customFilenameTemplate) : 'Video Title');
  if (suffix.trim()) parts.push(suffix.trim());
  return `${parts.join(' ')}.mp4`;
}

export function hasCustomNaming(settings: DownloadSettings): boolean {
  const { outputDir, prefix, suffix, useNumbering, useCustomFilename } = settings;
  return Boolean(outputDir.trim() || prefix.trim() || suffix.trim() || useNumbering || useCustomFilename);
}
