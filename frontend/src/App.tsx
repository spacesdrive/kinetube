import AppShell from '@/AppShell';
import SetupScreen from '@/features/setup/SetupScreen';
import { useToolStatus } from '@/hooks/useToolStatus';

// the first run shows the setup screen until yt-dlp and FFmpeg are installed
export default function App() {
  const tools = useToolStatus();

  if (tools.startupCheck === 'checking') return null;
  if (tools.startupCheck === 'needsSetup') return <SetupScreen onComplete={() => void tools.refresh()} />;
  return <AppShell tools={tools} />;
}
