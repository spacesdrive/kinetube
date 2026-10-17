import { api } from '@/services/api';

// Electron's native dialog when the app runs packaged; the backend's Windows picker in a plain browser
export async function pickFolder(): Promise<string | null> {
  if (window.electronAPI) return window.electronAPI.openFolderDialog();
  const { data } = await api.pickFolder();
  return data.path;
}
