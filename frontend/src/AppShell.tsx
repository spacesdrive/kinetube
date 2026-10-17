import { ArrowLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import CommandPalette from '@/components/shell/CommandPalette';
import AppSidebar from '@/components/shell/AppSidebar';
import TopBar from '@/components/shell/TopBar';
import UpdateDialog from '@/components/UpdateDialog';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import BatchPage from '@/features/batch/BatchPage';
import { useBatch } from '@/features/batch/useBatch';
import DownloadDialog from '@/features/downloads/DownloadDialog';
import { useDownloadSession } from '@/features/downloads/useDownloadSession';
import InstagramLoginModal from '@/features/instagram/InstagramLoginModal';
import SettingsPage from '@/features/settings/SettingsPage';
import TranscribePage from '@/features/transcribe/TranscribePage';
import { useAppCommands } from '@/hooks/useAppCommands';
import { useInstagramAccounts } from '@/hooks/useInstagramAccounts';
import { useMediaLookup } from '@/hooks/useMediaLookup';
import { useUpdateNotice } from '@/hooks/useUpdateNotice';
import { mediaContext } from '@/lib/mediaContext';
import { isDownloadPage, PAGE_LABELS } from '@/lib/pages';
import { loadSettings, toDownloadSettings } from '@/lib/settings';
import { isInstagramLink } from '@/lib/urlCleaners';
import DownloadPage from '@/pages/DownloadPage';

import type { useToolStatus } from '@/hooks/useToolStatus';
import type { DownloadPlatformPage, Page } from '@/lib/pages';
import type { AppSettings, DownloadSettings } from '@/lib/settings';

export interface AppShellProps {
  tools: ReturnType<typeof useToolStatus>;
}

function platformOf(url: string): DownloadPlatformPage {
  return isInstagramLink(url) ? 'instagram' : 'youtube';
}

export default function AppShell({ tools }: AppShellProps) {
  const [page, setPage] = useState<Page>('youtube');
  const [url, setUrl] = useState('');
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
    if (nextPage === 'instagram' || nextPage === 'batch') instagram.refresh();
  }, [lookup, instagram]);

  // a channel tab, a playlist or a pasted link opens on the right page without clearing what it asks for
  const openLink = useCallback(async (link: string) => {
    const platform = platformOf(link);
    // the last result stays up while a channel tab loads, but never on the other platform's page
    if (platform !== page) lookup.clear();
    setPage(platform);
    setUrl(link);
    const found = await lookup.lookUp(platform, link, instagram.activeAccount);
    if (found) setUrl(found.media.url);
  }, [page, lookup, instagram.activeAccount]);

  const commands = useAppCommands({ changePage, openLink: (link) => void openLink(link) });

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


  const context = isDownloadPage(page) && lookup.found ? mediaContext(lookup.found) : null;

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        page={page}
        onPageChange={changePage}
        instagram={{ accounts: instagram.accounts, activeAccount: instagram.activeAccount, onSelect: instagram.setActiveAccount, onRemove: (username) => void instagram.remove(username), onAdd: () => setIsLoginOpen(true) }}
      />
      <SidebarInset className="min-w-0 overflow-hidden">
        <TopBar
          title={PAGE_LABELS[page]}
          context={context}
          onOpenCommands={commands.open}
          actions={lookup.found && isDownloadPage(page) && (
            <Button type="button" variant="ghost" size="sm" onClick={clearSearch}><ArrowLeft /> New search</Button>
          )}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[var(--content-max)] px-5 pt-8 pb-20 md:px-10">
            {page === 'transcribe' && <TranscribePage />}
            {page === 'settings' && <SettingsPage onSave={applySavedSettings} />}
            {page === 'batch' && <BatchPage batch={batch} defaultQuality={settings.defaultQuality} onBulkDownload={session.downloadMany} />}
            {isDownloadPage(page) && (
              <DownloadPage
                platform={page}
                url={url}
                lookup={lookup}
                settings={settings}
                ytdlp={tools.ytdlp}
                isFfmpegInstalled={tools.isFfmpegInstalled}
                resumable={session.resumable.downloads}
                isDownloadActive={Boolean(session.downloads.active)}
                onUrlChange={(nextUrl) => { setUrl(nextUrl); lookup.setError(''); }}
                onSubmit={() => void handleSubmit()}
                onClear={clearSearch}
                onSettingsChange={setSettings}
                onOpenLink={(link) => void openLink(link)}
                onPageChange={changePage}
                onPasteLink={() => void commands.pasteAndFetch()}
                onResume={session.resume}
                onDismissResume={session.resumable.dismiss}
                onDownload={session.download}
                onBulkDownload={session.downloadMany}
              />
            )}
          </div>
        </div>
      </SidebarInset>

      <DownloadDialog session={session} />
      {commands.isOpen && <CommandPalette onRun={commands.run} onClose={commands.close} />}
      {isLoginOpen && (
        <InstagramLoginModal
          onClose={() => setIsLoginOpen(false)}
          onLoggedIn={(username) => {
            setIsLoginOpen(false);
            instagram.addLoggedIn(username);
            toast.success(`Logged in as @${username}`, { description: 'Profiles now load with this account.' });
          }}
        />
      )}
      {update.availableVersion && <UpdateDialog version={update.availableVersion} onDismiss={update.dismiss} />}
    </SidebarProvider>
  );
}
