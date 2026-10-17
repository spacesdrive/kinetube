// an example in the person's own path style; a Windows path means nothing to someone on a Mac
export function exampleFolderPath(platform: NodeJS.Platform = process.platform): string {
  if (platform === 'win32') return 'C:\\Users\\you\\Videos';
  if (platform === 'darwin') return '/Users/you/Movies';
  return '/home/you/Videos';
}

export function exampleFilePath(platform: NodeJS.Platform = process.platform): string {
  const separator = platform === 'win32' ? '\\' : '/';
  return `${exampleFolderPath(platform)}${separator}clip.mp4`;
}
