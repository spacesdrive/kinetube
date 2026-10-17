import { useCallback, useState } from 'react';

import AppHeader from '@/components/AppHeader';
import AppSidebar from '@/components/AppSidebar';
import UpdateDialog from '@/components/UpdateDialog';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useBatch } from '@/features/batch/useBatch';
import DownloadDialog from '@/features/downloads/DownloadDialog';
import { useDownloadSession } from '@/features/downloads/useDownloadSession';
import InstagramLoginModal from '@/features/instagram/InstagramLoginModal';
import SettingsPage from '@/features/settings/SettingsPage';
import TranscribePage from '@/features/transcribe/TranscribePage';
import { useInstagramAccounts } from '@/hooks/useInstagramAccounts';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { useUpdateNotice } from '@/hooks/useUpdateNotice';
import { isDownloadPage } from '@/lib/pages';
import { loadSettings, toDownloadSettings } from '@/lib/settings';
import DownloadPage from '@/pages/DownloadPage';

import type { useToolStatus } from '@/hooks/useToolStatus';
import type { Page } from '@/lib/pages';
import type { AppSettings, DownloadSettings } from '@/lib/settings';

export interface AppShellProps {
  tools: ReturnType<typeof useToolStatus>;
}

export default function AppShell({ tools }: AppShellProps) {
  const [page, setPage] = useState<Page>('youtube');
  const [url, setUrl] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [settings, setSettings] = useState<DownloadSettings>(() => toDownloadSettings(loadSettings().downloads));
  const instagram = useInstagramAccounts();
  const lookup = useMediaLookup();
  const batch = useBatch(instagram.activeAccount);
  const session = useDownloadSession(settings, instagram.activeAccount);
  const update = useUpdateNotice();

  const changePage = useCallback((nextPage: Page) => {
    setPage(nextPage);
    setUrl('');
    lookup.clear();
    if (!isDownloadPage(nextPage)) setIsBatchMode(false);
    if (nextPage === 'instagram') instagram.refresh();
  }, [lookup, instagram]);

  // saved defaults replace this session's overrides, keeping the numbering start the person typed
  const applySavedSettings = useCallback((saved: AppSettings) => {
    setSettings((current) => ({ ...toDownloadSettings(saved.downloads), startNumber: current.startNumber }));
  }, []);

  async function handleSubmit() {
    if (!isDownloadPage(page)) return;
    if (!url.trim()) {
      lookup.setError(page === 'instagram' ? 'Paste an Instagram link first.' : 'Paste a YouTube link first.');
      return;
    }
    const found = await lookup.lookUp(page, url.trim(), instagram.activeAccount);
    if (found) setUrl(found.media.url);
  }

  function clearSearch() {
    setUrl('');
    lookup.clear();
  }

  function toggleBatch() {
    if (isBatchMode) batch.reset();
    setIsBatchMode(!isBatchMode);
  }

  return (
    <SidebarProvider>
      <AppSidebar
        page={page}
        onPageChange={changePage}
        instagram={{ accounts: instagram.accounts, activeAccount: instagram.activeAccount, onSelect: instagram.setActiveAccount, onRemove: (username) => void instagram.remove(username), onAdd: () => setIsLoginOpen(true) }}
      />
      <SidebarInset>
        <AppHeader page={page} hasResult={Boolean(lookup.found)} isBatchMode={isBatchMode} canUseBatch={isDownloadPage(page)} onNewSearch={clearSearch} onToggleBatch={toggleBatch} />
        <div className="flex flex-1 flex-col overflow-auto">
          <div className="flex w-full flex-col items-center px-4 pb-12 pt-2">
            {page === 'transcribe' && <TranscribePage />}
            {page === 'settings' && <SettingsPage onSave={applySavedSettings} />}
            {isDownloadPage(page) && (
              <DownloadPage
                platform={page}
                url={url}
                lookup={lookup}
                batch={batch}
                isBatchMode={isBatchMode}
                settings={settings}
                ytdlp={tools.ytdlp}
                isFfmpegInstalled={tools.isFfmpegInstalled}
                resumable={session.resumable.downloads}
                isDownloadActive={Boolean(session.downloads.active)}
                onUrlChange={(nextUrl) => { setUrl(nextUrl); lookup.setError(''); }}
                onSubmit={() => void handleSubmit()}
                onClear={clearSearch}
                onSettingsChange={setSettings}
                onSwitchToInstagram={() => changePage('instagram')}
                onOpenSettings={() => changePage('settings')}
                onResume={session.resume}
                onDismissResume={(download) => session.resumable.dismiss(download.id)}
                onDownload={session.download}
                onBulkDownload={session.downloadMany}
              />
            )}
          </div>
        </div>
      </SidebarInset>

      <DownloadDialog session={session} />
      {isLoginOpen && (
        <InstagramLoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoggedIn={(username) => { setIsLoginOpen(false); instagram.addLoggedIn(username); }}
        />
      )}
      {update.availableVersion && <UpdateDialog version={update.availableVersion} onDismiss={update.dismiss} />}
    </SidebarProvider>
  );
}
