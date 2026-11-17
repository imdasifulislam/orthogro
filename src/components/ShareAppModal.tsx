import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Share2, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ToastMessage } from '../types';

interface ShareAppModalProps {
  open: boolean;
  onNotify: (type: ToastMessage['type'], message: string) => void;
  onClose: () => void;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall back to execCommand below
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ open, onNotify, onClose }) => {
  const { t } = useTranslation();
  const sa = t.shareApp;

  const appUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const defaultMessage = useMemo(
    () => sa.defaultMessage.replace('{url}', appUrl),
    [sa.defaultMessage, appUrl]
  );

  const [message, setMessage] = useState(defaultMessage);
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage(defaultMessage);
    setCopiedJustNow(false);
  }, [open, defaultMessage]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!copiedJustNow) return;
    const timer = window.setTimeout(() => setCopiedJustNow(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedJustNow]);

  if (!open) return null;

  const trimmed = message.trim();
  const isEmpty = trimmed.length === 0;
  const isModified = message !== defaultMessage;
  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    if (isEmpty) {
      onNotify('info', sa.emptyWarning);
      return;
    }
    const ok = await copyTextToClipboard(trimmed);
    if (ok) {
      setCopiedJustNow(true);
      onNotify('success', sa.copiedToast);
    }
  };

  const handleNativeShare = async () => {
    if (isEmpty) {
      onNotify('info', sa.emptyWarning);
      return;
    }
    if (!supportsNativeShare) return;
    try {
      await navigator.share({
        title: 'OrthoGro',
        text: trimmed,
        url: appUrl || undefined,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const ok = await copyTextToClipboard(trimmed);
      if (ok) {
        setCopiedJustNow(true);
        onNotify('success', sa.copiedToast);
      }
    }
  };

  const handleInstagramShare = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isEmpty) {
      e.preventDefault();
      onNotify('info', sa.emptyWarning);
      return;
    }
    const ok = await copyTextToClipboard(trimmed);
    if (ok) {
      setCopiedJustNow(true);
      onNotify('info', sa.instagramCopiedToast);
    }
  };

  const handleExternalShareClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isEmpty) {
      e.preventDefault();
      onNotify('info', sa.emptyWarning);
    }
  };

  const encodedMessage = encodeURIComponent(trimmed);
  const encodedUrl = encodeURIComponent(appUrl);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-app-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="share-app-modal-title"
                className="text-base font-extrabold text-[#102A43] dark:text-slate-100"
              >
                {sa.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sa.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={sa.closeAria}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Editable Invite Message */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label
              htmlFor="share-app-message-input"
              className="text-xs font-bold text-[#102A43] dark:text-slate-200"
            >
              {sa.messageLabel}
            </label>
            {isModified && (
              <button
                type="button"
                onClick={() => {
                  setMessage(defaultMessage);
                  setCopiedJustNow(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#16845B] hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              >
                <RotateCcw className="h-3 w-3" />
                {sa.resetBtn}
              </button>
            )}
          </div>
          <textarea
            id="share-app-message-input"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={sa.placeholder}
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-[#102A43] outline-none transition-colors focus:border-[#16845B] focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-950"
          />
        </div>

        {/* Copy & Native Share Actions */}
        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors whitespace-nowrap ${
              copiedJustNow
                ? 'bg-emerald-600 dark:bg-emerald-600'
                : 'bg-[#16845B] hover:bg-[#126B4A]'
            }`}
          >
            {copiedJustNow ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedJustNow ? sa.copiedBtn : sa.copyBtn}
          </button>

          {supportsNativeShare && (
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Share2 className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
              {sa.nativeShareBtn}
            </button>
          )}
        </div>

        {/* Direct Social Media Share Grid */}
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            {sa.shareViaLabel}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodedMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalShareClick}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#25D366]/50 dark:hover:bg-[#25D366]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12.04 2a9.94 9.94 0 0 0-8.48 15.16L2 22l4.98-1.52A9.95 9.95 0 1 0 12.04 2Zm5.8 14.07c-.24.68-1.42 1.31-1.97 1.39-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07s.76-2.18 1.03-2.48c.27-.3.59-.38.79-.38h.57c.18 0 .43-.07.67.51.25.6.84 2.06.91 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.68-.15.28.1 1.77.84 2.07.99.3.15.51.23.58.35.08.13.08.73-.17 1.4Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.whatsapp}
              </span>
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalShareClick}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#1877F2]/40 hover:bg-[#1877F2]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#1877F2]/50 dark:hover:bg-[#1877F2]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M13.5 21v-7.5h2.52l.38-2.93H13.5V8.7c0-.85.24-1.43 1.45-1.43h1.55V4.64A20.7 20.7 0 0 0 14.24 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.19H8v2.93h2.47V21h3.03Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.facebook}
              </span>
            </a>

            {/* Instagram (Copy + Open) */}
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => void handleInstagramShare(e)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-pink-400/50 hover:bg-pink-500/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="18" height="18" x="3" y="3" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.instagram}
              </span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalShareClick}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#229ED9]/50 hover:bg-[#229ED9]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#229ED9]/50 dark:hover:bg-[#229ED9]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#229ED9] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M21.2 4.6 2.9 11.7c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 10.9-6.9c.5-.3 1-.1.6.2l-8.8 8-.3 4.8c.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.5-1.6Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.telegram}
              </span>
            </a>

            {/* X (Twitter) */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleExternalShareClick}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.xTwitter}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
