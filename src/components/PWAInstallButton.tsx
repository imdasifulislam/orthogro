import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../i18n';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { t } = useTranslation();

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16845B] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#126B4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2 whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-4 w-4" />
        <span>{compact ? t.pwa.installCompact : t.pwa.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#102A43] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Share className="h-4 w-4 text-[#16845B]" />
          <span>{compact ? t.pwa.installCompact : t.pwa.installIOS}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                  {t.pwa.iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={t.common.close}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>{t.pwa.iosStep1}</li>
                <li>{t.pwa.iosStep2}</li>
                <li>{t.pwa.iosStep3}</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#16845B] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A]"
              >
                {t.pwa.gotIt}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
