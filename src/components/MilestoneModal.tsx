import React, { useEffect, useRef, useState } from 'react';
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

type CardFormat = 'square' | 'story';

interface GeneratedCardAssets {
  pngBlob: Blob;
  pngFile: File;
  jpegFile: File | null;
  filename: string;
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

function getCardSubtitle(
  cardLang: 'en' | 'bn',
  kind: SavingsMilestoneEvent['kind']
): string {
  if (kind === 'borrow_paid') {
    return cardLang === 'bn'
      ? 'আরেকটি দায়মুক্তির জন্য কৃতজ্ঞতা'
      : 'Grateful for another commitment fulfilled';
  }
  return cardLang === 'bn'
    ? 'প্রতিটি ছোট পদক্ষেপের জন্য কৃতজ্ঞতা'
    : 'Grateful for every steady step forward';
}

async function generatePrivacySafeCardAssets(
  cardLang: 'en' | 'bn',
  format: CardFormat,
  kind: SavingsMilestoneEvent['kind']
): Promise<GeneratedCardAssets | null> {
  if (typeof document === 'undefined') return null;

  const width = 1080;
  const height = format === 'story' ? 1920 : 1080;
  const isStory = format === 'story';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep navy-to-emerald backdrop
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0B1D30');
  bg.addColorStop(0.55, '#102A43');
  bg.addColorStop(1, '#0F4D37');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Subtle emerald radial highlight
  const glowY = isStory ? height * 0.44 : height * 0.42;
  const glowRadius = isStory ? 620 : 520;
  const glow = ctx.createRadialGradient(width * 0.5, glowY, 40, width * 0.5, glowY, glowRadius);
  glow.addColorStop(0, 'rgba(22, 132, 91, 0.36)');
  glow.addColorStop(1, 'rgba(22, 132, 91, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Subtle geometric decorative rings
  const ringY = isStory ? height * 0.45 : height * 0.44;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width / 2, ringY, isStory ? 380 : 340, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width / 2, ringY, isStory ? 470 : 420, 0, Math.PI * 2);
  ctx.stroke();

  // Inner subtle frame
  const inset = 56;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 44);
  ctx.stroke();

  // Vertical layout offsets
  const crestY = isStory ? 620 : 265;
  const headlineY = isStory ? 840 : 465;
  const dividerY = isStory ? 945 : 560;
  const subtitleY = isStory ? 1025 : 632;
  const badgeY = isStory ? 1560 : 858;
  const taglineY = isStory ? 1650 : 945;

  // Top crest emblem
  ctx.fillStyle = 'rgba(22, 132, 91, 0.25)';
  ctx.beginPath();
  ctx.arc(width / 2, crestY, isStory ? 68 : 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 4-point star sparkle inside crest
  const cx = width / 2;
  const cy = crestY;
  const starR = isStory ? 33 : 28;
  ctx.fillStyle = '#34D399';
  ctx.beginPath();
  ctx.moveTo(cx, cy - starR);
  ctx.quadraticCurveTo(cx + 4, cy - 4, cx + starR, cy);
  ctx.quadraticCurveTo(cx + 4, cy + 4, cx, cy + starR);
  ctx.quadraticCurveTo(cx - 4, cy + 4, cx - starR, cy);
  ctx.quadraticCurveTo(cx - 4, cy - 4, cx, cy - starR);
  ctx.closePath();
  ctx.fill();

  // Headline: Alhamdulillah!
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.font =
    cardLang === 'bn'
      ? "800 96px 'Noto Sans Bengali', system-ui, -apple-system, sans-serif"
      : '800 100px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(cardLang === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!', width / 2, headlineY);

  // Subtle calm divider
  const lineGrad = ctx.createLinearGradient(width / 2 - 120, 0, width / 2 + 120, 0);
  lineGrad.addColorStop(0, 'rgba(52, 211, 153, 0)');
  lineGrad.addColorStop(0.5, 'rgba(52, 211, 153, 0.85)');
  lineGrad.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 120, dividerY);
  ctx.lineTo(width / 2 + 120, dividerY);
  ctx.stroke();

  // Subtitle (100% privacy-safe, zero numbers or account names)
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.font =
    cardLang === 'bn'
      ? "500 35px 'Noto Sans Bengali', system-ui, -apple-system, sans-serif"
      : '500 35px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(getCardSubtitle(cardLang, kind), width / 2, subtitleY);

  // Bottom OrthoGro branding lockup
  const badgeW = 48;
  const badgeX = width / 2 - 126;
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
  ctx.fillText('TRACK  ·  SAVE  ·  GROW', width / 2, taglineY);

  const [pngBlob, jpegBlob] = await Promise.all([
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 1)),
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.94)),
  ]);

  if (!pngBlob) return null;

  const baseName = isStory ? 'orthogro-alhamdulillah-story' : 'orthogro-alhamdulillah';
  const pngFile = new File([pngBlob], `${baseName}.png`, { type: 'image/png' });
  const jpegFile = jpegBlob
    ? new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' })
    : null;

  return {
    pngBlob,
    pngFile,
    jpegFile,
    filename: `${baseName}.png`,
  };
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so mobile Safari/Chrome finish reading the blob before cleanup
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function copyImageOrCaptionToClipboard(blob: Blob, caption: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      return true;
    } catch {
      // Fall through to text copy
    }
  }
  if (typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(caption);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function getShareableFile(assets: GeneratedCardAssets | null): File | null {
  if (!assets || typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return null;
  }
  if (typeof navigator.canShare !== 'function') {
    return assets.pngFile;
  }
  try {
    if (navigator.canShare({ files: [assets.pngFile] })) {
      return assets.pngFile;
    }
    if (assets.jpegFile && navigator.canShare({ files: [assets.jpegFile] })) {
      return assets.jpegFile;
    }
  } catch {
    return null;
  }
  return null;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  milestone,
  currency,
  onNotify,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const [cardLang, setCardLang] = useState<'en' | 'bn'>(lang === 'bn' ? 'bn' : 'en');
  const [cardFormat, setCardFormat] = useState<CardFormat>('square');
  const [isBusy, setIsBusy] = useState(false);

  // Pre-generate square & story assets so navigator.share() runs synchronously
  // inside the click event without losing mobile user-gesture activation.
  const assetsRef = useRef<Record<CardFormat, GeneratedCardAssets | null>>({
    square: null,
    story: null,
  });
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    if (milestone) {
      setCardLang(lang === 'bn' ? 'bn' : 'en');
    }
  }, [milestone, lang]);

  useEffect(() => {
    if (!milestone) {
      assetsRef.current = { square: null, story: null };
      setAssetsReady(false);
      return;
    }

    let cancelled = false;
    setAssetsReady(false);

    void Promise.all([
      generatePrivacySafeCardAssets(cardLang, 'square', milestone.kind),
      generatePrivacySafeCardAssets(cardLang, 'story', milestone.kind),
    ]).then(([squareAssets, storyAssets]) => {
      if (cancelled) return;
      assetsRef.current = {
        square: squareAssets,
        story: storyAssets,
      };
      setAssetsReady(Boolean(squareAssets || storyAssets));
    });

    return () => {
      cancelled = true;
    };
  }, [milestone, cardLang]);

  if (!milestone) return null;

  const privateHeadline =
    milestone.kind === 'amount' && milestone.threshold !== undefined
      ? `${t.milestone.amountTitlePrefix} ${formatMoney(milestone.threshold, currency)}!`
      : milestone.kind === 'borrow_paid'
      ? `${t.milestone.borrowPaidTitlePrefix} ${
          milestone.borrowAmount !== undefined
            ? formatMoney(milestone.borrowAmount, currency)
            : ''
        }${milestone.borrowTitle ? ` (${milestone.borrowTitle})` : ''}!`
      : `${t.milestone.goalTitlePrefix} ${milestone.goalTitle || ''}`;

  const shareCaption =
    cardLang === 'bn' ? 'আলহামদুলিল্লাহ! — OrthoGro' : 'Alhamdulillah! — OrthoGro';

  const getOrBuildAssets = async (format: CardFormat): Promise<GeneratedCardAssets | null> => {
    const cached = assetsRef.current[format];
    if (cached) return cached;
    const generated = await generatePrivacySafeCardAssets(cardLang, format, milestone.kind);
    if (generated) {
      assetsRef.current[format] = generated;
    }
    return generated;
  };

  const handleDownload = async (format: CardFormat = cardFormat) => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      const assets = await getOrBuildAssets(format);
      if (!assets) return;
      triggerBlobDownload(assets.pngBlob, assets.filename);
      onNotify('success', t.milestone.downloadedToast);
    } finally {
      setIsBusy(false);
    }
  };

  const handleNativeShare = (format: CardFormat = cardFormat) => {
    if (isBusy) return;
    const cached = assetsRef.current[format];
    const readyFile = getShareableFile(cached);

    // Call navigator.share synchronously with ONLY { files: [file] } so Android & iOS
    // show FB Story, Instagram Story, Messenger, WhatsApp, etc. and never lose user gesture.
    if (readyFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setIsBusy(true);
      navigator
        .share({ files: [readyFile] })
        .then(() => {
          onNotify('success', t.milestone.sharedToast);
        })
        .catch(async (err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          // Fallback: download + copy image so the user is never left with a dead tap
          if (cached) {
            triggerBlobDownload(cached.pngBlob, cached.filename);
            await copyImageOrCaptionToClipboard(cached.pngBlob, shareCaption);
            onNotify('info', t.milestone.downloadedToast);
          }
        })
        .finally(() => {
          setIsBusy(false);
        });
      return;
    }

    // Fallback when native file sharing isn't supported (e.g., desktop browsers / iframe)
    setIsBusy(true);
    void (async () => {
      try {
        const assets = await getOrBuildAssets(format);
        if (!assets) return;
        triggerBlobDownload(assets.pngBlob, assets.filename);
        await copyImageOrCaptionToClipboard(assets.pngBlob, shareCaption);
        onNotify('info', t.milestone.downloadedToast);
      } finally {
        setIsBusy(false);
      }
    })();
  };

  // Direct social icon handler:
  // - On mobile where native image file sharing is available, opens the native OS share
  //   sheet synchronously with the image file (works directly with FB Story, FB, Messenger,
  //   WhatsApp, Instagram, Telegram, etc.).
  // - On desktop / browsers without file sharing, downloads + copies the card image and
  //   allows the <a> link to open the chosen platform cleanly without window.open.
  const handleSocialAppClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    platformLabel: string,
    preferFormat: CardFormat = cardFormat,
    customToast?: string
  ) => {
    const cached = assetsRef.current[preferFormat];
    const readyFile = getShareableFile(cached);

    if (readyFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      e.preventDefault();
      if (isBusy) return;
      setIsBusy(true);
      navigator
        .share({ files: [readyFile] })
        .then(() => {
          onNotify('success', t.milestone.sharedToast);
        })
        .catch(async (err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          if (cached) {
            triggerBlobDownload(cached.pngBlob, cached.filename);
            await copyImageOrCaptionToClipboard(cached.pngBlob, shareCaption);
            onNotify(
              'info',
              customToast || `${t.milestone.cardReadyForAppPrefix} ${platformLabel}.`
            );
          }
        })
        .finally(() => {
          setIsBusy(false);
        });
      return;
    }

    // Desktop / non-file-share fallback: save image + copy image while the anchor opens platform
    if (cached) {
      triggerBlobDownload(cached.pngBlob, cached.filename);
      void copyImageOrCaptionToClipboard(cached.pngBlob, shareCaption);
      onNotify('info', customToast || `${t.milestone.cardReadyForAppPrefix} ${platformLabel}.`);
    } else {
      void getOrBuildAssets(preferFormat).then((assets) => {
        if (!assets) return;
        triggerBlobDownload(assets.pngBlob, assets.filename);
        void copyImageOrCaptionToClipboard(assets.pngBlob, shareCaption);
        onNotify('info', customToast || `${t.milestone.cardReadyForAppPrefix} ${platformLabel}.`);
      });
    }
  };

  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const encodedCaption = encodeURIComponent(shareCaption);
  const whatsappWebUrl = `https://wa.me/?text=${encodedCaption}`;
  const whatsappHref = isAndroid
    ? `intent://send?text=${encodedCaption}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(whatsappWebUrl)};end`
    : whatsappWebUrl;
  const sa = t.shareApp;

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

        {/* Format (Post / Story) & Language selector for the share card */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setCardFormat('square')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                cardFormat === 'square'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.milestone.formatSquare}
            </button>
            <button
              type="button"
              onClick={() => setCardFormat('story')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                cardFormat === 'story'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              {t.milestone.formatStory}
            </button>
          </div>

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
        <div
          className={`relative mx-auto mt-2.5 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#0B1D30] via-[#102A43] to-[#0F4D37] px-6 text-center text-white shadow-lg transition-all ${
            cardFormat === 'story' ? 'max-w-[235px] py-12' : 'w-full py-8'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(22,132,91,0.34),transparent_68%)]" />
          <div className="relative mx-auto flex max-w-xs flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>

            <div
              className={`mt-4 font-extrabold tracking-tight text-white ${
                cardFormat === 'story' ? 'text-2xl' : 'text-3xl'
              }`}
            >
              {cardLang === 'bn' ? 'আলহামদুলিল্লাহ!' : 'Alhamdulillah!'}
            </div>

            <div className="my-3 h-0.5 w-20 bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

            <p className="text-xs font-medium text-slate-200/90">
              {getCardSubtitle(cardLang, milestone.kind)}
            </p>

            <div className={`flex flex-col items-center ${cardFormat === 'story' ? 'mt-12' : 'mt-7'}`}>
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

        {/* Primary Share & Save Actions */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isBusy || !assetsReady}
            onClick={() => handleNativeShare(cardFormat)}
            className="flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#16845B] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            <span>{t.milestone.shareBtn}</span>
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleDownload(cardFormat)}
            className="flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            <span>{t.milestone.downloadBtn}</span>
          </button>
        </div>

        {/* Direct Social Media Share Grid */}
        <div className="mt-4 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          <p className="mb-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {t.milestone.shareViaLabel}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {/* FB Story (always shares 9:16 Story card) */}
            <a
              href="https://www.facebook.com/stories/create"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) =>
                handleSocialAppClick(e, t.milestone.fbStory, 'story', t.milestone.storyReadyToast)
              }
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-[#1877F2]/50 hover:bg-[#1877F2]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#1877F2]/50 dark:hover:bg-[#1877F2]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-white ring-2 ring-[#1877F2]/35 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-950">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M13.5 21v-7.5h2.52l.38-2.93H13.5V8.7c0-.85.24-1.43 1.45-1.43h1.55V4.64A20.7 20.7 0 0 0 14.24 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.19H8v2.93h2.47V21h3.03Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {t.milestone.fbStory}
              </span>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSocialAppClick(e, sa.facebook, cardFormat)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-[#1877F2]/40 hover:bg-[#1877F2]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#1877F2]/50 dark:hover:bg-[#1877F2]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M13.5 21v-7.5h2.52l.38-2.93H13.5V8.7c0-.85.24-1.43 1.45-1.43h1.55V4.64A20.7 20.7 0 0 0 14.24 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.19H8v2.93h2.47V21h3.03Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.facebook}
              </span>
            </a>

            {/* Messenger */}
            <a
              href="https://www.messenger.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSocialAppClick(e, sa.messenger, cardFormat)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-[#0084FF]/50 hover:bg-[#0084FF]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#0084FF]/50 dark:hover:bg-[#0084FF]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0099FF] via-[#A033FF] to-[#FF5280] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.9 1.44 5.49 3.7 7.19V22l3.36-1.85c.93.26 1.91.4 2.94.4 5.52 0 10-4.14 10-9.3C22 6.14 17.52 2 12 2Zm1.01 12.5-2.55-2.72-4.97 2.72 5.47-5.8 2.61 2.72 4.91-2.72-5.47 5.8Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.messenger}
              </span>
            </a>

            {/* WhatsApp */}
            <a
              href={whatsappHref}
              target={isAndroid ? undefined : '_blank'}
              rel={isAndroid ? undefined : 'noopener noreferrer'}
              onClick={(e) => handleSocialAppClick(e, sa.whatsapp, cardFormat)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#25D366]/50 dark:hover:bg-[#25D366]/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M12.04 2a9.94 9.94 0 0 0-8.48 15.16L2 22l4.98-1.52A9.95 9.95 0 1 0 12.04 2Zm5.8 14.07c-.24.68-1.42 1.31-1.97 1.39-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07s.76-2.18 1.03-2.48c.27-.3.59-.38.79-.38h.57c.18 0 .43-.07.67.51.25.6.84 2.06.91 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.68-.15.28.1 1.77.84 2.07.99.3.15.51.23.58.35.08.13.08.73-.17 1.4Z" />
                </svg>
              </span>
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.whatsapp}
              </span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSocialAppClick(e, sa.instagram, cardFormat)}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-pink-400/50 hover:bg-pink-500/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
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
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {sa.instagram}
              </span>
            </a>

            {/* Other Apps */}
            <button
              type="button"
              disabled={isBusy || !assetsReady}
              onClick={() => handleNativeShare(cardFormat)}
              className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-2 text-center transition-colors hover:border-[#16845B]/50 hover:bg-emerald-50/70 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-950/30"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#16845B] text-white">
                <Share2 className="h-3.5 w-3.5" />
              </span>
              <span className="w-full truncate text-[10px] font-bold text-[#102A43] dark:text-slate-200">
                {t.milestone.otherApps}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
