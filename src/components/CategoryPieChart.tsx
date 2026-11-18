import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import type { CurrencySymbol } from '../types';
import { formatMoney } from '../utils/format';

interface CategoryPieChartProps {
  items: Array<[string, number]>;
  total: number;
  palette: string[];
  colorMap?: Record<string, string>;
  currency: CurrencySymbol;
  totalLabel: string;
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  onCategoryClick?: (category: string) => void;
  didSwipeRef: React.MutableRefObject<boolean>;
  hideBalances?: boolean;
  onEnteredView?: () => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number
): string {
  const outerStart = polarToCartesian(cx, cy, rOuter, endAngle);
  const outerEnd = polarToCartesian(cx, cy, rOuter, startAngle);
  const innerStart = polarToCartesian(cx, cy, rInner, endAngle);
  const innerEnd = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  items,
  total,
  palette,
  colorMap,
  currency,
  totalLabel,
  activeCategory,
  onSelectCategory,
  onCategoryClick,
  didSwipeRef,
  hideBalances = false,
  onEnteredView,
}) => {
  const { t } = useTranslation();
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(
    () => typeof window === 'undefined' || !('IntersectionObserver' in window)
  );
  const [animCycle, setAnimCycle] = useState(0);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const onEnteredViewRef = useRef(onEnteredView);
  onEnteredViewRef.current = onEnteredView;

  const nonZeroItems = useMemo(() => items.filter(([, amt]) => amt > 0), [items]);
  const dataSignature = useMemo(
    () =>
      `${totalLabel}|${total}|${nonZeroItems.map(([cat, amt]) => `${cat}:${amt}`).join(',')}`,
    [totalLabel, total, nonZeroItems]
  );
  const prevSigRef = useRef(dataSignature);

  useEffect(() => {
    if (hasEnteredView) {
      onEnteredViewRef.current?.();
      return;
    }
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      onEnteredViewRef.current?.();
      return;
    }

    let dwellTimer: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          if (dwellTimer === null) {
            dwellTimer = window.setTimeout(() => {
              setHasEnteredView(true);
              setAnimCycle((c) => c + 1);
              onEnteredViewRef.current?.();
              observer.disconnect();
            }, 220);
          }
        } else if (dwellTimer !== null) {
          window.clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: 0.45, rootMargin: '0px 0px -72px 0px' }
    );
    observer.observe(node);
    return () => {
      if (dwellTimer !== null) window.clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [hasEnteredView]);

  useEffect(() => {
    if (activeCategory === null) {
      setPinnedCategory(null);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (prevSigRef.current === dataSignature) return;
    prevSigRef.current = dataSignature;
    setPinnedCategory(null);
    if (hasEnteredView) {
      setAnimCycle((c) => c + 1);
    }
  }, [dataSignature, hasEnteredView]);

  if (nonZeroItems.length === 0 || total <= 0) return null;

  const activeIndex = activeCategory
    ? nonZeroItems.findIndex(([cat]) => cat === activeCategory)
    : -1;
  const activeEntry = activeIndex >= 0 ? nonZeroItems[activeIndex] : null;
  const activeColor =
    activeEntry && activeIndex >= 0
      ? colorMap?.[activeEntry[0]] || palette[activeIndex % palette.length]
      : null;
  const activePct = activeEntry ? ((activeEntry[1] / total) * 100).toFixed(1) : null;

  const handleSliceActivate = (cat: string) => {
    if (didSwipeRef.current) return;
    if (onCategoryClick) {
      onCategoryClick(cat);
    } else {
      const next = pinnedCategory === cat ? null : cat;
      setPinnedCategory(next);
      onSelectCategory(next);
    }
  };

  const handleSliceMouseEnter = (cat: string) => {
    onSelectCategory(cat);
  };

  const handleSliceMouseLeave = () => {
    onSelectCategory(pinnedCategory);
  };

  const sheenId = `pie-sheen-${uid}`;
  const shadowId = `pie-active-shadow-${uid}`;
  const maskId = `pie-reveal-mask-${uid}`;
  let currentAngle = 0;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex h-48 w-48 shrink-0 items-center justify-center sm:h-52 sm:w-52"
    >
      <svg
        viewBox="0 0 220 220"
        role="img"
        aria-label={`${totalLabel} ${t.dashboard.pieAriaSuffix}`}
        className="h-full w-full overflow-visible"
      >
        <defs>
          <radialGradient id={sheenId} cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.14" />
          </radialGradient>
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <circle
              key={animCycle}
              cx={110}
              cy={110}
              r={71}
              fill="none"
              stroke="white"
              strokeWidth={56}
              transform="rotate(-90 110 110)"
              strokeDasharray={447}
              strokeDashoffset={hasEnteredView ? undefined : 447}
              className={hasEnteredView ? 'animate-pie-sweep' : undefined}
            />
          </mask>
        </defs>

        {/* Subtle ambient track ring */}
        <circle
          cx={110}
          cy={110}
          r={71}
          fill="none"
          stroke="currentColor"
          strokeWidth={34}
          className="text-slate-200/55 dark:text-slate-800/70"
        />

        <g mask={`url(#${maskId})`}>
          {nonZeroItems.length === 1 ? (
            (() => {
              const singleCat = nonZeroItems[0][0];
              const singleColor = colorMap?.[singleCat] || palette[0];
              const isActive = activeCategory === singleCat;
              return (
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={singleCat}
                  onMouseEnter={() => handleSliceMouseEnter(singleCat)}
                  onMouseLeave={handleSliceMouseLeave}
                  onClick={() => handleSliceActivate(singleCat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSliceActivate(singleCat);
                    }
                  }}
                  style={{
                    transform: isActive ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: '110px 110px',
                    transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {isActive && (
                    <circle
                      cx={110}
                      cy={110}
                      r={94}
                      fill="none"
                      stroke={singleColor}
                      strokeWidth={3}
                      strokeOpacity={0.4}
                    />
                  )}
                  <circle
                    cx={110}
                    cy={110}
                    r={71}
                    fill="none"
                    stroke={singleColor}
                    strokeWidth={34}
                    filter={isActive ? `url(#${shadowId})` : undefined}
                  />
                  <circle
                    cx={110}
                    cy={110}
                    r={71}
                    fill="none"
                    stroke={`url(#${sheenId})`}
                    strokeWidth={34}
                    className="pointer-events-none"
                  />
                </g>
              );
            })()
          ) : (
            nonZeroItems.map(([cat, amount], idx) => {
              const rawAngle = (amount / total) * 360;
              const halfGap = Math.min(1.35, rawAngle * 0.22);
              const startAngle = currentAngle + halfGap;
              const endAngle = currentAngle + rawAngle - halfGap;
              currentAngle += rawAngle;

              const color = colorMap?.[cat] || palette[idx % palette.length];
              const isActive = activeCategory === cat;
              const isDimmed = activeCategory !== null && !isActive;

              if (rawAngle >= 359.99) {
                return (
                  <g
                    key={cat}
                    role="button"
                    tabIndex={0}
                    aria-label={cat}
                    onMouseEnter={() => handleSliceMouseEnter(cat)}
                    onMouseLeave={handleSliceMouseLeave}
                    onClick={() => handleSliceActivate(cat)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSliceActivate(cat);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    <circle cx={110} cy={110} r={71} fill="none" stroke={color} strokeWidth={34} />
                    <circle
                      cx={110}
                      cy={110}
                      r={71}
                      fill="none"
                      stroke={`url(#${sheenId})`}
                      strokeWidth={34}
                      className="pointer-events-none"
                    />
                  </g>
                );
              }

              const slicePath = describeDonutSlice(110, 110, 88, 54, startAngle, endAngle);

              return (
                <g
                  key={cat}
                  role="button"
                  tabIndex={0}
                  aria-label={cat}
                  onMouseEnter={() => handleSliceMouseEnter(cat)}
                  onMouseLeave={handleSliceMouseLeave}
                  onClick={() => handleSliceActivate(cat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSliceActivate(cat);
                    }
                  }}
                  style={{
                    transform: isActive ? 'scale(1.055)' : isDimmed ? 'scale(0.985)' : 'scale(1)',
                    transformOrigin: '110px 110px',
                    opacity: isDimmed ? 0.42 : 1,
                    transition:
                      'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out',
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {isActive && (
                    <path
                      d={describeArc(110, 110, 93.5, startAngle, endAngle)}
                      fill="none"
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeOpacity={0.45}
                    />
                  )}
                  <path
                    d={slicePath}
                    fill={color}
                    filter={isActive ? `url(#${shadowId})` : undefined}
                  />
                  <path d={slicePath} fill={`url(#${sheenId})`} className="pointer-events-none" />
                </g>
              );
            })
          )}
        </g>
      </svg>

      {/* Center Elevated Readout Disc */}
      <div
        key={hasEnteredView ? `center-${animCycle}` : 'center-init'}
        role={activeEntry ? 'button' : undefined}
        tabIndex={activeEntry ? 0 : undefined}
        aria-label={activeEntry ? `${activeEntry[0]} — ${totalLabel}` : undefined}
        onClick={
          activeEntry
            ? (e) => {
                e.stopPropagation();
                if (didSwipeRef.current) return;
                setPinnedCategory(null);
                onSelectCategory(null);
              }
            : undefined
        }
        onKeyDown={
          activeEntry
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setPinnedCategory(null);
                  onSelectCategory(null);
                }
              }
            : undefined
        }
        className={`absolute flex h-[96px] w-[96px] flex-col items-center justify-center rounded-full border border-slate-200/80 bg-white/95 px-2.5 text-center shadow-sm backdrop-blur-xs sm:h-[104px] sm:w-[104px] dark:border-slate-700/80 dark:bg-slate-900/95 ${
          activeEntry ? 'cursor-pointer pointer-events-auto focus:outline-none' : 'pointer-events-none'
        } ${hasEnteredView ? 'animate-pie-center' : 'opacity-0'}`}
      >
        {activeEntry ? (
          <>
            <span className="flex max-w-full items-center justify-center gap-1">
              {activeColor && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: activeColor }}
                />
              )}
              <span className="truncate text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {activeEntry[0]}
              </span>
            </span>
            <span className="font-mono-num mt-0.5 text-xs font-extrabold tabular-nums text-[#102A43] sm:text-[13px] dark:text-slate-100">
              {formatMoney(activeEntry[1], currency, hideBalances)}
            </span>
            <span
              className="font-mono-num mt-0.5 text-[10px] font-extrabold tabular-nums"
              style={{ color: activeColor || undefined }}
            >
              {activePct}%
            </span>
          </>
        ) : (
          <>
            <span className="max-w-full truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {totalLabel}
            </span>
            <span className="font-mono-num mt-0.5 text-xs font-extrabold tabular-nums text-[#102A43] sm:text-[13px] dark:text-slate-100">
              {formatMoney(total, currency, hideBalances)}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {nonZeroItems.length}{' '}
              {nonZeroItems.length === 1 ? t.common.categorySingular : t.common.categories}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
