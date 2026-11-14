import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useTranslation } from '../i18n';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-40 flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-md dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-200 lg:bottom-5"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>{t.pwa.offlineBanner}</span>
    </div>
  );
};
