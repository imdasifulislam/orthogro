import React from 'react';
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
  didSwipeRef: React.MutableRefObject<boolean>;
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

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  items,
  total,
  palette,
  colorMap,
  currency,
  totalLabel,
  activeCategory,
  onSelectCategory,
  didSwipeRef,
}) => {
  const { t } = useTranslation();
  const nonZeroItems = items.filter(([, amt]) => amt > 0);
  if (nonZeroItems.length === 0 || total <= 0) return null;

  const activeEntry = activeCategory
    ? nonZeroItems.find(([cat]) => cat === activeCategory) || null
    : null;

  const activePct = activeEntry ? ((activeEntry[1] / total) * 100).toFixed(1) : null;

  let currentAngle = 0;

  return (
    <div className="relative mx-auto flex h-44 w-44 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`${totalLabel} ${t.dashboard.pieAriaSuffix}`}
        className="h-full w-full overflow-visible text-white dark:text-slate-900"
      >
        {nonZeroItems.length === 1 ? (
          <circle
            cx={100}
            cy={100}
            r={66}
            fill="none"
            stroke={colorMap?.[nonZeroItems[0][0]] || palette[0]}
            strokeWidth={36}
            onClick={() => {
              if (didSwipeRef.current) return;
              const cat = nonZeroItems[0][0];
              onSelectCategory(activeCategory === cat ? null : cat);
            }}
            className="cursor-pointer transition-transform duration-200"
            style={{
              transform: activeCategory === nonZeroItems[0][0] ? 'scale(1.03)' : 'scale(1)',
              transformOrigin: '100px 100px',
            }}
          />
        ) : (
          nonZeroItems.map(([cat, amount], idx) => {
            const sliceAngle = (amount / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;

            const color = colorMap?.[cat] || palette[idx % palette.length];
            const isActive = activeCategory === cat;
            const isDimmed = activeCategory !== null && !isActive;

            if (sliceAngle >= 359.99) {
              return (
                <circle
                  key={cat}
                  cx={100}
                  cy={100}
                  r={66}
                  fill="none"
                  stroke={color}
                  strokeWidth={36}
                  onClick={() => {
                    if (didSwipeRef.current) return;
                    onSelectCategory(isActive ? null : cat);
                  }}
                  className="cursor-pointer"
                />
              );
            }

            return (
              <path
                key={cat}
                d={describeDonutSlice(100, 100, 84, 48, startAngle, endAngle)}
                fill={color}
                stroke="currentColor"
                strokeWidth={1.75}
                onMouseEnter={() => onSelectCategory(cat)}
                onMouseLeave={() => onSelectCategory(null)}
                onClick={() => {
                  if (didSwipeRef.current) return;
                  onSelectCategory(isActive ? null : cat);
                }}
                style={{
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: '100px 100px',
                  opacity: isDimmed ? 0.55 : 1,
                  transition: 'transform 180ms ease-out, opacity 180ms ease-out',
                }}
                className="cursor-pointer"
              />
            );
          })
        )}
      </svg>

      {/* Center Readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {activeEntry ? (
          <>
            <span className="max-w-[84px] truncate text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {activeEntry[0]}
            </span>
            <span className="font-mono-num mt-0.5 text-xs font-extrabold text-[#102A43] dark:text-slate-100">
              {formatMoney(activeEntry[1], currency)}
            </span>
            <span className="font-mono-num text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {activePct}%
            </span>
          </>
        ) : (
          <>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {totalLabel}
            </span>
            <span className="font-mono-num mt-0.5 text-xs font-extrabold text-[#102A43] dark:text-slate-100">
              {formatMoney(total, currency)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {nonZeroItems.length}{' '}
              {nonZeroItems.length === 1 ? t.common.categorySingular : t.common.categories}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
