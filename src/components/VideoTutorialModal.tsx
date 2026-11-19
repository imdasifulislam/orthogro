import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ExternalLink,
  ListChecks,
  PieChart,
  Play,
  PlusCircle,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';

/**
 * Paste your YouTube video URL here anytime (e.g. 'https://youtu.be/VIDEO_ID' or 'https://www.youtube.com/watch?v=VIDEO_ID').
 * When set, the in-app modal automatically plays the embedded YouTube walkthrough video.
 */
export const ORTHOGRO_TUTORIAL_VIDEO_URL = '';

function getYouTubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = parsed.pathname.slice(1).split('/')[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      }
    }
    if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) return null;
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1`;
  } catch {
    return null;
  }
}

export type VideoTutorialMode = 'prompt' | 'player';

interface VideoTutorialModalProps {
  open: boolean;
  mode: VideoTutorialMode;
  onWatchVideo: () => void;
  onDismissLater: () => void;
  onClosePlayer: () => void;
}

export const VideoTutorialModal: React.FC<VideoTutorialModalProps> = ({
  open,
  mode,
  onWatchVideo,
  onDismissLater,
  onClosePlayer,
}) => {
  const { t } = useTranslation();
  const vt = t.tutorial;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (mode === 'prompt') {
        onDismissLater();
      } else {
        onClosePlayer();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, mode, onDismissLater, onClosePlayer]);

  if (!open || typeof document === 'undefined') return null;

  const embedUrl = getYouTubeEmbedUrl(ORTHOGRO_TUTORIAL_VIDEO_URL);

  const quickSteps = [
    {
      icon: PlusCircle,
      title: vt.step1Title,
      desc: vt.step1Desc,
    },
    {
      icon: ListChecks,
      title: vt.step2Title,
      desc: vt.step2Desc,
    },
    {
      icon: PieChart,
      title: vt.step3Title,
      desc: vt.step3Desc,
    },
    {
      icon: Users,
      title: vt.step4Title,
      desc: vt.step4Desc,
    },
  ];

  const modalContent =
    mode === 'prompt' ? (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
        onClick={onDismissLater}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-welcome-title"
          onClick={(e) => e.stopPropagation()}
          className="animate-drawer-up relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-6 pt-7 pb-6 text-center shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Close X */}
          <button
            type="button"
            onClick={onDismissLater}
            aria-label={t.common.close}
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Soft Play Badge */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-xs dark:bg-rose-950/50 dark:text-rose-400">
            <Play className="ml-0.5 h-7 w-7 fill-current" />
          </div>

          <h2
            id="tutorial-welcome-title"
            className="mt-4 text-xl font-extrabold tracking-tight text-[#102A43] dark:text-slate-100"
          >
            {vt.welcomeTitle}
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed font-medium text-slate-600 dark:text-slate-300">
            {vt.welcomeBody}
          </p>

          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {vt.settingsHint}
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={onWatchVideo}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>{vt.watchVideoBtn}</span>
            </button>

            <button
              type="button"
              onClick={onDismissLater}
              className="flex min-h-[46px] w-full items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200/80 active:scale-[0.98] dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {vt.laterBtn}
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={onClosePlayer}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-player-title"
          onClick={(e) => e.stopPropagation()}
          className="animate-drawer-up flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
        >
          {/* Mobile Drag Handle */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </span>
              <div className="min-w-0">
                <h3
                  id="tutorial-player-title"
                  className="truncate text-base font-extrabold text-[#102A43] dark:text-slate-100"
                >
                  {vt.playerTitle}
                </h3>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {vt.playerSubtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClosePlayer}
              aria-label={t.common.close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-5">
            {embedUrl ? (
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-sm">
                  <iframe
                    src={embedUrl}
                    title={vt.playerTitle}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {vt.replayHint}
                  </span>
                  <a
                    href={ORTHOGRO_TUTORIAL_VIDEO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                  >
                    <span>{vt.openYoutube}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div>
                {/* Crisp Quick-Start Guide Stage (ready for YouTube URL drop-in) */}
                <div className="rounded-2xl bg-gradient-to-br from-[#083B29] via-[#0E5E42] to-[#16845B] p-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
                      <Play className="ml-0.5 h-5 w-5 fill-current text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold">{vt.quickGuideBannerTitle}</h4>
                      <p className="mt-0.5 text-xs text-emerald-50/85">
                        {vt.quickGuideBannerDesc}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {quickSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-[#102A43] sm:text-sm dark:text-slate-100">
                            {index + 1}. {step.title}
                          </h5>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClosePlayer}
              className="mt-5 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#126B4A] active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{vt.gotItBtn}</span>
            </button>
          </div>
        </div>
      </div>
    );

  return createPortal(modalContent, document.body);
};
