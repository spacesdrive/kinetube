// hands the text to the browser as a file download, which Electron shows as a save dialog
export function saveTextFile(text: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

// "clip.mp4" -> "clip.txt"
export function transcriptFileName(mediaName: string): string {
  return `${mediaName.replace(/\.[^.]+$/, '')}.txt`;
}
