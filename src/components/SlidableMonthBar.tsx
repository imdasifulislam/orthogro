import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from '../i18n';

interface SlidableMonthBarProps {
  monthOffset: number;
  onSelectMonth: (nextOffset: number) => void;
  tone?: 'neutral' | 'expense' | 'income';
}

export const SlidableMonthBar: React.FC<SlidableMonthBarProps> = ({
  monthOffset,
  onSelectMonth,
  tone = 'neutral',
}) => {
  const { lang, t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const hasMountedRef = useRef(false);
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    didDrag: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, didDrag: false });

  const monthChoices = useMemo(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const minOffset = Math.min(-11, monthOffset - 4);
    const maxOffset = Math.max(5, monthOffset + 4);
    const list: Array<{ offset: number; label: string }> = [];

    // Chronological left-to-right: past months on the left, This Month centered, future months on the right
    for (let off = minOffset; off <= maxOffset; off++) {
      const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
      list.push({
        offset: off,
        label:
          off === 0
            ? t.common.thisMonth
            : d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
      });
    }
    return list;
  }, [monthOffset, lang, t.common.thisMonth]);

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
    centerChip(monthOffset, smooth);
    hasMountedRef.current = true;
  }, [monthOffset]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const state = dragStateRef.current;
      const container = scrollRef.current;
      if (!state.active || !container) return;

      const dx = e.clientX - state.startX;
      if (Math.abs(dx) > 5) {
        state.didDrag = true;
      }
      // Dragging left-to-right (dx > 0) scrolls left to reveal past months;
      // dragging right-to-left (dx < 0) scrolls right to reveal future months.
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
      <div className="relative min-w-0">
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-4 select-none touch-pan-x cursor-grab active:cursor-grabbing"
        >
          {monthChoices.map((m) => {
            const isSelected = m.offset === monthOffset;
            const isCurrentMonth = m.offset === 0;
            return (
              <button
                key={m.offset}
                ref={(el) => {
                  chipRefs.current[m.offset] = el;
                }}
                type="button"
                onClick={() => {
                  if (dragStateRef.current.didDrag) return;
                  onSelectMonth(m.offset);
                }}
                className={`min-h-[34px] shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#102A43] text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : isCurrentMonth
                    ? tone === 'neutral'
                      ? 'border border-slate-300 bg-slate-50 text-[#102A43] hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-800'
                      : 'border border-slate-300/80 bg-white/80 text-[#102A43] hover:bg-white dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800'
                    : tone === 'neutral'
                    ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                    : 'bg-white/65 text-slate-600 hover:bg-white dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {m.label}
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
    </div>
  );
};
