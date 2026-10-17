import { useEffect, useState } from 'react';

// the version of a newer KineTube release once Electron's updater reports one
export function useUpdateNotice() {
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);

  useEffect(() => {
    return window.electronAPI?.onUpdateStatus((status) => {
      if (status.type === 'available') setAvailableVersion(status.version);
    });
  }, []);

  return { availableVersion, dismiss: () => setAvailableVersion(null) };
}
