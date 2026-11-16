import React, { useState } from 'react';
import { Award, Download, Share2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CurrencySymbol, SavingsMilestoneEvent } from '../types';
import { formatMoney } from '../utils/format';

interface MilestoneModalProps {
  milestone: SavingsMilestoneEvent | null;
  currency: CurrencySymbol;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
  onClose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generatePrivacySafeCardBlob(cardLang: 'en' | 'bn'): Promise<Blob | null> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep navy-to-emerald backdrop
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#0B1D30');
  bg.addColorStop(0.55, '#102A43');
  bg.addColorStop(1, '#0F4D37');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle emerald radial highlight
  const glow = ctx.createRadialGradient(size * 0.5, size * 0.42, 40, size * 0.5, size * 0.42, 520);
  glow.addColorStop(0, 'rgba(22, 132, 91, 0.34)');
  glow.addColorStop(1, 'rgba(22, 132, 91, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Subtle geometric decorative rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, 340, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.44, 420, 0, Math.PI * 2);
  ctx.stroke();

  // Inner subtle frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 56, 56, size - 112, size - 112, 44);
  ctx.stroke();

  // Top crest emblem
  ctx.fillStyle = 'rgba(22, 132, 91, 0.25)';
  ctx.beginPath();
  ctx.arc(size / 2, 265, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4-point star sparkle inside crest
  const cx = size / 2;
  const cy = 265;
  ctx.fillStyle = '#34D399';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 28);
  ctx.quadraticCurveTo(cx + 4, cy - 4, cx + 28, cy);
  ctx.quadraticCurveTo(cx + 4, cy + 4, cx, cy + 28);
  ctx.quadraticCurveTo(cx - 4, cy + 4, cx - 28, cy);
  ctx.quadraticCurveTo(cx - 4, cy - 4, cx, cy - 28);
  ctx.closePath();
  ctx.fill();

  // Headline: Alhamdulillah!
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font =
    cardLang === 'bn'
      ? "800 94px 'Noto Sans Bengali', system-ui, -apple-system, sans-serif"
      : '800 96px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(cardLang === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!', size / 2, 465);

  // Subtle calm divider
  const lineGrad = ctx.createLinearGradient(size / 2 - 110, 0, size / 2 + 110, 0);
  lineGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
  lineGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.85)');
  lineGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(size / 2 - 110, 560);
  ctx.lineTo(size / 2 + 110, 560);
  ctx.stroke();

  // Subtitle (100% privacy-safe, zero numbers or account names)
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.font =
    cardLang === 'bn'
      ? "500 34px 'Noto Sans Bengali', system-ui, -apple-system, sans-serif"
      : '500 34px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(
    cardLang === 'bn'
      ? 'প্রতিটি ছোট পদক্ষেপের জন্য কৃতজ্ঞতা'
      : 'Grateful for every steady step forward',
    size / 2,
    632
  );

  // Bottom OrthoGro branding lockup
  const badgeW = 48;
  const badgeX = size / 2 - 126;
  const badgeY = 858;
  ctx.fillStyle = '#16845B';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeW, 13);
  ctx.fill();

  // Rising geometric bar mark inside logo badge
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, badgeX + 11, badgeY + 25, 6, 12, 2);
  ctx.fill();
  drawRoundedRect(ctx, badgeX + 21, badgeY + 18, 6, 19, 2);
  ctx.fill();
  drawRoundedRect(ctx, badgeX + 31, badgeY + 11, 6, 26, 2);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 40px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('OrthoGro', badgeX + 64, badgeY + 26);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
  ctx.font = '600 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('TRACK  ·  SAVE  ·  GROW', size / 2, 945);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1);
  });
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  milestone,
  currency,
  onNotify,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const [cardLang, setCardLang] = useState<'en' | 'bn'>(lang === 'bn' ? 'bn' : 'en');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!milestone) return null;

  const privateHeadline =
    milestone.kind === 'amount' && milestone.threshold !== undefined
      ? `${t.milestone.amountTitlePrefix} ${formatMoney(milestone.threshold, currency)}!`
      : `${t.milestone.goalTitlePrefix} ${milestone.goalTitle || ''}`;

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const blob = await generatePrivacySafeCardBlob(cardLang);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orthogro-alhamdulillah.png';
      a.click();
      URL.revokeObjectURL(url);
      onNotify('success', t.milestone.downloadedToast);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const blob = await generatePrivacySafeCardBlob(cardLang);
      if (!blob) return;
      const file = new File([blob], 'orthogro-alhamdulillah.png', { type: 'image/png' });
      const shareText = cardLang === 'bn' ? 'আলহামদুলিল্লাহ! — OrthoGro' : 'Alhamdulillah! — OrthoGro';

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: 'OrthoGro',
          text: shareText,
        });
        onNotify('success', t.milestone.sharedToast);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orthogro-alhamdulillah.png';
        a.click();
        URL.revokeObjectURL(url);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText).catch(() => {});
        }
        onNotify('info', t.milestone.downloadedToast);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        await handleDownload();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="no-scrollbar max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16845B] dark:text-emerald-400">
            <Award className="h-4 w-4" />
            <span>{t.milestone.privateBadge}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Private celebration message (never included in shared image) */}
        <h3 className="text-base font-extrabold leading-snug text-[#102A43] dark:text-slate-100">
          {privateHeadline}
        </h3>
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16845B] dark:text-emerald-400" />
          <span>{t.milestone.privateHint}</span>
        </p>

        {/* Language selector for the share card */}
        <div className="mt-3.5 flex items-center justify-end">
          <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setCardLang('en')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                cardLang === 'en'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.milestone.cardStyleEn}
            </button>
            <button
              type="button"
              onClick={() => setCardLang('bn')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                cardLang === 'bn'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.milestone.cardStyleBn}
            </button>
          </div>
        </div>

        {/* Visual Preview of the 100% Privacy-Safe Shareable Card */}
        <div className="relative mt-2.5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0B1D30] via-[#102A43] to-[#0F4D37] px-6 py-8 text-center text-white shadow-lg">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(22,132,91,0.34),transparent_68%)]" />
          <div className="relative mx-auto flex max-w-xs flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="mt-4 text-3xl font-extrabold tracking-tight text-white">
              {cardLang === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!'}
            </div>

            <div className="my-3 h-0.5 w-20 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

            <p className="text-xs font-medium text-slate-200/90">
              {cardLang === 'bn'
                ? 'প্রতিটি ছোট পদক্ষেপের জন্য কৃতজ্ঞতা'
                : 'Grateful for every steady step forward'}
            </p>

            <div className="mt-7 flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-end justify-center gap-0.5 rounded-md bg-[#16845B] p-1">
                  <span className="h-2 w-1 rounded-xs bg-white" />
                  <span className="h-3 w-1 rounded-xs bg-white" />
                  <span className="h-4 w-1 rounded-xs bg-white" />
                </span>
                <span className="text-sm font-extrabold tracking-tight text-white">OrthoGro</span>
              </div>
              <span className="mt-1 text-[9px] font-semibold tracking-[0.2em] text-slate-400">
                TRACK · SAVE · GROW
              </span>
            </div>
          </div>
        </div>

        {/* Share & Save Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleShare()}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#16845B] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            <span>{t.milestone.shareBtn}</span>
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleDownload()}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            <span>{t.milestone.downloadBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
