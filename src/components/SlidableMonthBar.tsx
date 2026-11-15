import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { CalendarRange } from 'lucide-react';
import { useTranslation } from '../i18n';
import { formatShortRangeLabel, getShiftedCustomRange } from '../utils/format';

type BarTone = 'neutral' | 'expense' | 'income';

interface SlidableChipItem {
  offset: number;
  label: string;
  isCurrent?: boolean;
}

interface SlidableChipBarProps {
  items: SlidableChipItem[];
  selectedOffset: number;
  onSelectOffset: (nextOffset: number) => void;
  tone?: BarTone;
  scrollKey?: string;
  trailingAction?: React.ReactNode;
}

const SlidableChipBar: React.FC<SlidableChipBarProps> = ({
  items,
  selectedOffset,
  onSelectOffset,
  tone = 'neutral',
  scrollKey = '',
  trailingAction,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const hasMountedRef = useRef(false);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    didDrag: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, didDrag: false });

  const centerChip = (offset: number, smooth: boolean) => {
    const container = scrollRef.current;
    const chip = chipRefs.current[offset];
    if (!container || !chip) return;

    const targetLeft = chip.offsetLeft - (container.clientWidth - chip.offsetWidth) / 2;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const clampedLeft = Math.max(0, Math.min(targetLeft, maxScroll));

    if (smooth) {
      container.scrollTo({ left: clampedLeft, behavior: 'smooth' });
    } else {
      container.scrollLeft = clampedLeft;
    }
  };

  useLayoutEffect(() => {
    const smooth = hasMountedRef.current;
    centerChip(selectedOffset, smooth);
    hasMountedRef.current = true;
  }, [selectedOffset, scrollKey]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      const container = scrollRef.current;
      if (!state.active || !container) return;

      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 5) {
        state.didDrag = true;
      }
      container.scrollLeft = state.startScrollLeft - dx;
    };

    const handleMouseUp = () => {
      const state = dragStateRef.current;
      if (!state.active) return;
      state.active = false;
      if (state.didDrag) {
        window.setTimeout(() => {
          dragStateRef.current.didDrag = false;
        }, 0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !scrollRef.current) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: scrollRef.current.scrollLeft,
      didDrag: false,
    };
  };

  const borderToneClass =
    tone === 'expense'
      ? 'border-rose-200/60 dark:border-rose-900/35'
      : tone === 'income'
      ? 'border-emerald-200/60 dark:border-emerald-900/35'
      : 'border-slate-100 dark:border-slate-800';

  const fadeLeftClass =
    tone === 'expense'
      ? 'from-[#fff8f8] dark:from-[#1f1318]'
      : tone === 'income'
      ? 'from-[#f5fcf8] dark:from-[#0f1d19]'
      : 'from-white dark:from-slate-900';

  const fadeRightClass =
    tone === 'expense'
      ? 'from-[#fff8f8] dark:from-[#1f1318]'
      : tone === 'income'
      ? 'from-[#f5fcf8] dark:from-[#0f1d19]'
      : 'from-white dark:from-slate-900';

  return (
    <div className={`mt-3 border-b pb-3 ${borderToneClass}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 select-none touch-pan-x cursor-grab active:cursor-grabbing"
          >
            {items.map((item) => {
              const isSelected = item.offset === selectedOffset;
              const isCurrent = Boolean(item.isCurrent);
              return (
                <button
                  key={item.offset}
                  ref={(el) => {
                    chipRefs.current[item.offset] = el;
                  }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dragStateRef.current.didDrag) return;
                    onSelectOffset(item.offset);
                  }}
                  className={`min-h-[34px] shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#102A43] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                      : isCurrent
                      ? tone === 'neutral'
                        ? 'border border-slate-300 bg-slate-50 text-[#102A43] hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-800'
                        : 'border border-slate-300/80 bg-white/80 text-[#102A43] hover:bg-white dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800'
                      : tone === 'neutral'
                      ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                      : 'bg-white/65 text-slate-600 hover:bg-white dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r to-transparent ${fadeLeftClass}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l to-transparent ${fadeRightClass}`}
          />
        </div>
        {trailingAction}
      </div>
    </div>
  );
};

interface SlidableMonthBarProps {
  monthOffset: number;
  onSelectMonth: (nextOffset: number) => void;
  tone?: BarTone;
}

export const SlidableMonthBar: React.FC<SlidableMonthBarProps> = ({
  monthOffset,
  onSelectMonth,
  tone = 'neutral',
}) => {
  const { lang, t } = useTranslation();

  const monthChoices = useMemo<SlidableChipItem[]>(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const minOffset = Math.min(-11, monthOffset - 4);
    const maxOffset = Math.max(5, monthOffset + 4);
    const list: SlidableChipItem[] = [];

    for (let off = minOffset; off <= maxOffset; off++) {
      const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
      list.push({
        offset: off,
        isCurrent: off === 0,
        label:
          off === 0
            ? t.common.thisMonth
            : d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
      });
    }
    return list;
  }, [monthOffset, lang, t.common.thisMonth]);

  return (
    <SlidableChipBar
      items={monthChoices}
      selectedOffset={monthOffset}
      onSelectOffset={onSelectMonth}
      tone={tone}
    />
  );
};

interface SlidableYearBarProps {
  yearOffset: number;
  onSelectYear: (nextOffset: number) => void;
  minYearOffset?: number;
  tone?: BarTone;
}

export const SlidableYearBar: React.FC<SlidableYearBarProps> = ({
  yearOffset,
  onSelectYear,
  minYearOffset = -6,
  tone = 'neutral',
}) => {
  const { lang, t } = useTranslation();

  const yearChoices = useMemo<SlidableChipItem[]>(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const minOff = Math.min(-6, minYearOffset, yearOffset - 3);
    const maxOff = Math.max(2, yearOffset + 2);
    const list: SlidableChipItem[] = [];

    for (let off = minOff; off <= maxOff; off++) {
      const d = new Date(now.getFullYear() + off, 0, 1);
      list.push({
        offset: off,
        isCurrent: off === 0,
        label:
          off === 0
            ? t.common.thisYear
            : d.toLocaleDateString(locale, { year: 'numeric' }),
      });
    }
    return list;
  }, [yearOffset, minYearOffset, lang, t.common.thisYear]);

  return (
    <SlidableChipBar
      items={yearChoices}
      selectedOffset={yearOffset}
      onSelectOffset={onSelectYear}
      tone={tone}
    />
  );
};

interface SlidableCustomBarProps {
  customFrom: string;
  customTo: string;
  customOffset: number;
  onSelectOffset: (nextOffset: number) => void;
  onEditRange?: () => void;
  tone?: BarTone;
}

export const SlidableCustomBar: React.FC<SlidableCustomBarProps> = ({
  customFrom,
  customTo,
  customOffset,
  onSelectOffset,
  onEditRange,
  tone = 'neutral',
}) => {
  const { lang, t } = useTranslation();

  const rangeChoices = useMemo<SlidableChipItem[]>(() => {
    if (!customFrom || !customTo) return [];
    const minOff = Math.min(-6, customOffset - 3);
    const maxOff = Math.max(4, customOffset + 3);
    const list: SlidableChipItem[] = [];

    for (let off = minOff; off <= maxOff; off++) {
      const { from, to } = getShiftedCustomRange(customFrom, customTo, off);
      list.push({
        offset: off,
        isCurrent: off === 0,
        label: formatShortRangeLabel(from, to, lang),
      });
    }
    return list;
  }, [customFrom, customTo, customOffset, lang]);

  if (rangeChoices.length === 0) return null;

  return (
    <SlidableChipBar
      items={rangeChoices}
      selectedOffset={customOffset}
      onSelectOffset={onSelectOffset}
      tone={tone}
      scrollKey={`${customFrom}_${customTo}`}
      trailingAction={
        onEditRange ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditRange();
            }}
            aria-label={t.modals.customDateRange}
            title={t.modals.customDateRange}
            className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] ${
              tone === 'neutral'
                ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                : 'border-slate-200/80 bg-white/80 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
    />
  );
};
