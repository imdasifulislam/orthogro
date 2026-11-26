import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PieChart,
  PiggyBank,
  Plus,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation, type Translations } from '../i18n';
import type {
  AppLanguage,
  BudgetGoal,
  CategoryStyle,
  CurrencySymbol,
  DrilldownPeriodContext,
  DrilldownType,
  FilterCardKey,
  GridKey,
  PeriodFilter,
  SavingGoal,
  Transaction,
} from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';
import {
  computeSavingGoalProgress,
  filterTransactionsByPeriod,
  formatDisplayDate,
  formatMoney,
  formatShortRangeLabel,
  getFilterName,
  getPeriodLabel,
  getShiftedCustomRange,
  getTodayISO,
  parseLocalDate,
} from '../utils/format';
import { CategoryPieChart } from './CategoryPieChart';
import { SwipeableTransaction } from './SwipeableTransaction';

const EXPENSE_CHART_COLORS = [
  '#D94848',
  '#EA580C',
  '#D97706',
  '#9333EA',
  '#0284C7',
  '#0D9488',
  '#64748B',
];

const INCOME_CHART_COLORS = [
  '#16845B',
  '#059669',
  '#0284C7',
  '#0D9488',
  '#4F46E5',
  '#D97706',
  '#64748B',
];

const ScrollRevealSection: React.FC<{
  index: number;
  children: React.ReactNode;
}> = ({ index, children }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [visible, setVisible] = useState(
    () =>
      reducedMotion ||
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window)
  );
  const [settled, setSettled] = useState(visible);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      setSettled(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestAnimationFrame(() => setVisible(true));
          observer.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -16px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || settled) return;
    const delayMs = Math.min(index, 3) * 55;
    const timer = window.setTimeout(() => setSettled(true), 460 + delayMs);
    return () => window.clearTimeout(timer);
  }, [visible, settled, index]);

  const delayMs = Math.min(index, 3) * 55;

  return (
    <div
      ref={ref}
      style={
        settled
          ? undefined
          : {
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0px)' : 'translateY(14px)',
              transition: `opacity 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 420ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
            }
      }
    >
      {children}
    </div>
  );
};

const AnimatedMoneyValue: React.FC<{
  value: number;
  currency: CurrencySymbol;
  durationMs?: number;
  variant?: 'default' | 'netWorth';
}> = ({ value, currency, durationMs = 740, variant = 'default' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [inView, setInView] = useState(
    () =>
      reducedMotion ||
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window)
  );
  const [displayValue, setDisplayValue] = useState(() => (reducedMotion ? value : 0));
  const currentValRef = useRef(reducedMotion ? value : 0);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion || typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      currentValRef.current = value;
      setDisplayValue(value);
      return;
    }

    const startValue = currentValRef.current;
    if (Math.abs(value - startValue) < 0.005) {
      currentValRef.current = value;
      setDisplayValue(value);
      return;
    }

    const hasDecimals = Math.abs(value - Math.round(value)) > 0.001;
    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 4);
      const nextRaw = startValue + (value - startValue) * eased;
      const nextVal =
        progress >= 1
          ? value
          : hasDecimals
          ? Math.round(nextRaw * 100) / 100
          : Math.round(nextRaw);

      currentValRef.current = nextVal;
      setDisplayValue(nextVal);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, inView, reducedMotion, durationMs]);

  if (variant === 'netWorth') {
    const targetHasDecimals = Math.abs(value - Math.round(value)) > 0.001;
    const formatOpts: Intl.NumberFormatOptions = targetHasDecimals
      ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      : { maximumFractionDigits: 0 };
    const isNegative = displayValue < 0 || (displayValue === 0 && value < 0);
    const absFormatted = Math.abs(displayValue).toLocaleString(undefined, formatOpts);
    const finalFormatted = Math.abs(value).toLocaleString(undefined, formatOpts);
    return (
      <span ref={ref} className="inline-grid items-baseline tabular-nums">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 inline-flex items-baseline whitespace-nowrap"
        >
          {value < 0 && <span className="mr-0.5">-</span>}
          <span className="mr-1 text-[17px] font-semibold sm:text-[20px]">{currency}</span>
          <span>{finalFormatted}</span>
        </span>
        <span className="col-start-1 row-start-1 inline-flex items-baseline whitespace-nowrap">
          {isNegative && <span className="mr-0.5 text-[#ff6b6b]">-</span>}
          <span className="mr-1 text-[17px] font-semibold text-white/95 sm:text-[20px]">
            {currency}
          </span>
          <span>{absFormatted}</span>
        </span>
      </span>
    );
  }

  return (
    <span ref={ref} className="tabular-nums">
      {formatMoney(displayValue, currency)}
    </span>
  );
};

function computeCategoryReport(
  transactions: Transaction[],
  filterMode: PeriodFilter,
  monthOffset: number,
  yearOffset: number,
  customOffset: number,
  customFrom: string,
  customTo: string,
  lang: AppLanguage
) {
  const now = new Date();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
  const expenseByCategory: Record<string, number> = {};
  const incomeByCategory: Record<string, number> = {};
  let totalExpense = 0;
  let totalIncome = 0;

  let periodTitle = '';
  let filterButtonLabel = '';

  let filteredTxs: Transaction[] = [];

  if (filterMode === 'monthly') {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    filteredTxs = transactions.filter((tx) => {
      if (!tx.rawDate) return false;
      const d = parseLocalDate(tx.rawDate);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    periodTitle = targetDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
    filterButtonLabel = periodTitle;
  } else if (filterMode === 'yearly') {
    const targetYear = now.getFullYear() + yearOffset;

    filteredTxs = transactions.filter((tx) => {
      if (!tx.rawDate) return false;
      return parseLocalDate(tx.rawDate).getFullYear() === targetYear;
    });

    const yearDisplay = new Date(targetYear, 0, 1).toLocaleDateString(locale, {
      year: 'numeric',
    });
    periodTitle =
      lang === 'bn' ? `জানুয়ারি – ডিসেম্বর ${yearDisplay}` : `Jan – Dec ${yearDisplay}`;
    filterButtonLabel = yearDisplay;
  } else if (filterMode === 'custom' && customFrom && customTo) {
    const { from, to } = getShiftedCustomRange(customFrom, customTo, customOffset);

    filteredTxs = transactions.filter(
      (tx) => !tx.rawDate || (tx.rawDate >= from && tx.rawDate <= to)
    );

    periodTitle =
      from === to
        ? formatDisplayDate(from, lang)
        : `${formatDisplayDate(from, lang)} – ${formatDisplayDate(to, lang)}`;
    filterButtonLabel = formatShortRangeLabel(from, to, lang);
  } else {
    filteredTxs = filterTransactionsByPeriod(transactions, filterMode, customFrom, customTo);
    filterButtonLabel = getFilterName(filterMode, lang);
    periodTitle = getPeriodLabel(filterMode, customFrom, customTo, lang);
    if (filterMode === 'previous_month') {
      periodTitle = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
        locale,
        {
          month: 'long',
          year: 'numeric',
        }
      );
      filterButtonLabel = periodTitle;
    }
  }

  filteredTxs.forEach((tx) => {
    if (tx.type === 'expense') {
      const cat = tx.category || 'Others';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + tx.amount;
      totalExpense += tx.amount;
    } else if (tx.type === 'income') {
      const cat = tx.category || 'Others';
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + tx.amount;
      totalIncome += tx.amount;
    }
  });

  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const sortedIncomes = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);

  return {
    periodTitle,
    filterButtonLabel,
    sortedExpenses,
    sortedIncomes,
    totalExpense,
    totalIncome,
  };
}

function getMonthBadgeLabel(
  monthOffset: number,
  monthTitle: string,
  t: Translations
): string {
  if (monthOffset === 0) return t.common.thisMonth;
  if (monthOffset === -1) return t.common.previousMonth;
  if (monthOffset === 1) return t.common.nextMonth;
  return monthTitle;
}

interface SwipeableAccountStripProps {
  title: string;
  icon: React.ReactNode;
  children: (wasDragging: () => boolean) => React.ReactNode;
}

const SwipeableAccountStrip: React.FC<SwipeableAccountStripProps> = ({
  title,
  icon,
  children,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocityX: 0,
    moved: false,
  });
  const wasDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    const now = performance.now();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      lastX: e.clientX,
      lastTime: now,
      velocityX: 0,
      moved: false,
    };
    wasDraggingRef.current = false;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 5) {
      dragRef.current.moved = true;
      wasDraggingRef.current = true;
    }
    if (dragRef.current.moved) {
      const now = performance.now();
      const dt = Math.max(1, now - dragRef.current.lastTime);
      const instantVelocity = (e.clientX - dragRef.current.lastX) / dt;
      dragRef.current.velocityX = dragRef.current.velocityX * 0.6 + instantVelocity * 0.4;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastTime = now;
      el.scrollLeft = dragRef.current.startScrollLeft - dx;
    }
  };

  const handleMouseEnd = () => {
    if (!dragRef.current.active) return;
    const el = scrollRef.current;
    const { moved, velocityX } = dragRef.current;
    dragRef.current.active = false;
    dragRef.current.moved = false;
    setIsDragging(false);

    if (moved && el) {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      const projected = Math.min(maxScroll, Math.max(0, el.scrollLeft - velocityX * 150));
      const firstCard = el.firstElementChild as HTMLElement | null;
      const gapStr = window.getComputedStyle(el).columnGap || window.getComputedStyle(el).gap;
      const gapPx = Number.parseFloat(gapStr) || 8;
      const step = firstCard ? firstCard.offsetWidth + gapPx : 120;
      const snappedTarget =
        step > 0
          ? Math.min(maxScroll, Math.max(0, Math.round(projected / step) * step))
          : projected;

      el.scrollTo({ left: snappedTarget, behavior: 'smooth' });
      window.setTimeout(() => {
        wasDraggingRef.current = false;
      }, 0);
    }
  };

  return (
    <div className="w-full min-w-0">
      <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-[#102A43] dark:text-slate-100">
        {icon}
        <span className="truncate">{title}</span>
      </div>

      <div
        ref={scrollRef}
        onDragStart={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
        className={`no-scrollbar flex w-full min-w-0 overscroll-x-contain cursor-grab select-none gap-2 overflow-x-auto pb-1 active:cursor-grabbing sm:gap-3 ${
          isDragging ? 'scroll-auto snap-none' : 'scroll-smooth snap-x snap-mandatory'
        }`}
      >
        {children(() => wasDraggingRef.current)}
      </div>
    </div>
  );
};

interface HomeDashboardProps {
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  walletBalances: Record<string, number>;
  budgetGoals: BudgetGoal[];
  savingGoals: SavingGoal[];
  monthlySpentByCategory: Record<string, number>;
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  gridOrder: GridKey[];
  visibleGrids: Record<GridKey, boolean>;
  filters: Record<FilterCardKey, PeriodFilter>;
  customDateFrom: string;
  customDateTo: string;
  onOpenFilterCard: (card: FilterCardKey) => void;
  onOpenDrilldown: (
    type: DrilldownType,
    key: string | null,
    defaultFilter: PeriodFilter,
    periodContext?: DrilldownPeriodContext
  ) => void;
  onOpenBudgetGoalsModal: (goal?: BudgetGoal, prefillLimit?: number) => void;
  onOpenSavingGoalsModal: (
    goal?: SavingGoal,
    prefill?: { title?: string; account?: string }
  ) => void;
  onQuickAddSaving?: (account?: string, goalTitle?: string) => void;
  onOpenGoalsOverview?: (tab: 'budget' | 'saving') => void;
  onDeleteTx: (id: string) => void;
  onEditTx: (tx: Transaction) => void;
  onResolveDebt: (tx: Transaction) => void;
  onInspectDebt: (tx: Transaction) => void;
  onStartAddingTx: () => void;
  onStartAddingIncome?: () => void;
  onAddAccount?: (type: 'wallet' | 'savings') => void;
  isReadOnly?: boolean;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  transactions,
  wallets,
  savingsList,
  walletBalances,
  budgetGoals,
  savingGoals,
  monthlySpentByCategory,
  categoryStyles,
  currency,
  gridOrder,
  visibleGrids,
  filters,
  customDateFrom,
  customDateTo,
  onOpenFilterCard,
  onOpenDrilldown,
  onOpenBudgetGoalsModal,
  onOpenSavingGoalsModal,
  onQuickAddSaving,
  onOpenGoalsOverview,
  onDeleteTx,
  onEditTx,
  onResolveDebt,
  onInspectDebt,
  onStartAddingTx,
  onStartAddingIncome,
  onAddAccount,
  isReadOnly = false,
}) => {
  const { lang, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openTxId, setOpenTxId] = useState<string | null>(null);
  const [pieView, setPieView] = useState<'expense' | 'income'>('expense');
  const [pieLegendExpanded, setPieLegendExpanded] = useState(false);
  const [pieRevealed, setPieRevealed] = useState(false);
  const [budgetBarRevealed, setBudgetBarRevealed] = useState(false);
  const [savingBarRevealed, setSavingBarRevealed] = useState(false);
  const [goalsCardsEntered, setGoalsCardsEntered] = useState(
    () =>
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const [goalsCardsSettled, setGoalsCardsSettled] = useState(goalsCardsEntered);
  const [pieCardEntered, setPieCardEntered] = useState(
    () =>
      typeof window === 'undefined' ||
      !('IntersectionObserver' in window) ||
      (typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
  const [pieCardSettled, setPieCardSettled] = useState(pieCardEntered);
  const [showNetWorthTrendNote, setShowNetWorthTrendNote] = useState(false);
  const goalsCardRef = useRef<HTMLDivElement | null>(null);
  const pieCardRef = useRef<HTMLDivElement | null>(null);
  const netWorthCardRef = useRef<HTMLDivElement | null>(null);
  const [pieMonthOffset, setPieMonthOffset] = useState(0);
  const [pieYearOffset, setPieYearOffset] = useState(0);
  const [pieCustomOffset, setPieCustomOffset] = useState(0);
  const [pieSwipeX, setPieSwipeX] = useState(0);
  const [isSwipingPie, setIsSwipingPie] = useState(false);
  const [txMonthOffset, setTxMonthOffset] = useState(0);
  const [txYearOffset, setTxYearOffset] = useState(0);
  const [txCustomOffset, setTxCustomOffset] = useState(0);
  const [txSwipeX, setTxSwipeX] = useState(0);
  const [isSwipingTx, setIsSwipingTx] = useState(false);
  const [incExpMonthOffset, setIncExpMonthOffset] = useState(0);
  const [incExpYearOffset, setIncExpYearOffset] = useState(0);
  const [incExpCustomOffset, setIncExpCustomOffset] = useState(0);
  const [incExpSwipeX, setIncExpSwipeX] = useState(0);
  const [isSwipingIncExp, setIsSwipingIncExp] = useState(false);
  const [activeExpenseChartCategory, setActiveExpenseChartCategory] = useState<string | null>(null);
  const [activeIncomeChartCategory, setActiveIncomeChartCategory] = useState<string | null>(null);
  const pieSwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const txSwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const incExpSwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const didPieSwipeRef = useRef(false);
  const didIncExpSwipeRef = useRef(false);
  const didTxSwipeRef = useRef(false);
  const pressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    if (budgetGoals.length === 0) {
      setBudgetBarRevealed(false);
      return;
    }
    if (budgetBarRevealed || !visibleGrids.budgetGoals) return;
    const el = goalsCardRef.current;
    if (!el) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setBudgetBarRevealed(true);
      return;
    }

    let revealTimer: number | null = null;
    let revealRaf1: number | null = null;
    let revealRaf2: number | null = null;

    const clearPendingReveal = () => {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
        revealTimer = null;
      }
      if (revealRaf1 !== null) {
        cancelAnimationFrame(revealRaf1);
        revealRaf1 = null;
      }
      if (revealRaf2 !== null) {
        cancelAnimationFrame(revealRaf2);
        revealRaf2 = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          if (revealTimer === null) {
            revealTimer = window.setTimeout(() => {
              revealTimer = null;
              revealRaf1 = requestAnimationFrame(() => {
                revealRaf1 = null;
                revealRaf2 = requestAnimationFrame(() => {
                  revealRaf2 = null;
                  setBudgetBarRevealed(true);
                  observer.disconnect();
                });
              });
            }, 160);
          }
        } else {
          clearPendingReveal();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => {
      clearPendingReveal();
      observer.disconnect();
    };
  }, [budgetBarRevealed, visibleGrids.budgetGoals, budgetGoals.length]);

  useEffect(() => {
    if (savingGoals.length === 0) {
      setSavingBarRevealed(false);
      return;
    }
    if (savingBarRevealed || !visibleGrids.budgetGoals) return;
    const el = goalsCardRef.current;
    if (!el) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      setSavingBarRevealed(true);
      return;
    }

    let revealTimer: number | null = null;
    let revealRaf1: number | null = null;
    let revealRaf2: number | null = null;

    const clearPendingReveal = () => {
      if (revealTimer !== null) {
        window.clearTimeout(revealTimer);
        revealTimer = null;
      }
      if (revealRaf1 !== null) {
        cancelAnimationFrame(revealRaf1);
        revealRaf1 = null;
      }
      if (revealRaf2 !== null) {
        cancelAnimationFrame(revealRaf2);
        revealRaf2 = null;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          if (revealTimer === null) {
            revealTimer = window.setTimeout(() => {
              revealTimer = null;
              revealRaf1 = requestAnimationFrame(() => {
                revealRaf1 = null;
                revealRaf2 = requestAnimationFrame(() => {
                  revealRaf2 = null;
                  setSavingBarRevealed(true);
                  observer.disconnect();
                });
              });
            }, 160);
          }
        } else {
          clearPendingReveal();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => {
      clearPendingReveal();
      observer.disconnect();
    };
  }, [savingBarRevealed, visibleGrids.budgetGoals, savingGoals.length]);

  useEffect(() => {
    if (goalsCardsEntered || !visibleGrids.budgetGoals) return;
    const el = goalsCardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setGoalsCardsEntered(true);
      setGoalsCardsSettled(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestAnimationFrame(() => setGoalsCardsEntered(true));
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -12px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [goalsCardsEntered, visibleGrids.budgetGoals]);

  useEffect(() => {
    if (!goalsCardsEntered || goalsCardsSettled) return;
    const timer = window.setTimeout(() => setGoalsCardsSettled(true), 660);
    return () => window.clearTimeout(timer);
  }, [goalsCardsEntered, goalsCardsSettled]);

  useEffect(() => {
    if (pieCardEntered || !visibleGrids.categoryPieChart) return;
    const el = pieCardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setPieCardEntered(true);
      setPieCardSettled(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          requestAnimationFrame(() => setPieCardEntered(true));
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -12px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pieCardEntered, visibleGrids.categoryPieChart]);

  useEffect(() => {
    if (!pieCardEntered || pieCardSettled) return;
    const timer = window.setTimeout(() => setPieCardSettled(true), 560);
    return () => window.clearTimeout(timer);
  }, [pieCardEntered, pieCardSettled]);

  const handlePressEnd = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressOriginRef.current = null;
  };

  const handlePressStart = (card: FilterCardKey, clientX?: number, clientY?: number) => {
    handlePressEnd();
    isLongPressRef.current = false;
    pressOriginRef.current =
      clientX !== undefined && clientY !== undefined ? { x: clientX, y: clientY } : null;
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      pressOriginRef.current = null;
      isLongPressRef.current = true;
      if (incExpSwipeRef.current.dragging) {
        incExpSwipeRef.current.dragging = false;
        incExpSwipeRef.current.axis = null;
        setIsSwipingIncExp(false);
        setIncExpSwipeX(0);
      }
      if (pieSwipeRef.current.dragging) {
        pieSwipeRef.current.dragging = false;
        pieSwipeRef.current.axis = null;
        setIsSwipingPie(false);
        setPieSwipeX(0);
      }
      if (txSwipeRef.current.dragging) {
        txSwipeRef.current.dragging = false;
        txSwipeRef.current.axis = null;
        setIsSwipingTx(false);
        setTxSwipeX(0);
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      onOpenFilterCard(card);
    }, 480);
  };

  const handlePressMove = (clientX: number, clientY: number) => {
    if (pressTimerRef.current === null || !pressOriginRef.current) return;
    const dx = clientX - pressOriginRef.current.x;
    const dy = clientY - pressOriginRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      handlePressEnd();
    }
  };

  useEffect(() => {
    setPieCustomOffset(0);
    setIncExpCustomOffset(0);
    setTxCustomOffset(0);
  }, [customDateFrom, customDateTo]);

  useEffect(() => {
    setIncExpMonthOffset(0);
    setIncExpYearOffset(0);
    setIncExpCustomOffset(0);
  }, [filters.incExp]);

  useEffect(() => {
    setPieMonthOffset(0);
    setPieYearOffset(0);
    setPieCustomOffset(0);
    setPieLegendExpanded(false);
  }, [filters.categoryPieChart]);

  useEffect(() => {
    setTxMonthOffset(0);
    setTxYearOffset(0);
    setTxCustomOffset(0);
    setOpenTxId(null);
  }, [filters.transactions]);

  useEffect(() => {
    setPieLegendExpanded(false);
  }, [pieView]);

  useEffect(() => {
    setActiveExpenseChartCategory(null);
    setActiveIncomeChartCategory(null);
  }, [
    filters.categoryPieChart,
    pieMonthOffset,
    pieYearOffset,
    pieCustomOffset,
    customDateFrom,
    customDateTo,
  ]);

  const canSwipeTx =
    filters.transactions === 'monthly' ||
    filters.transactions === 'yearly' ||
    (filters.transactions === 'custom' && Boolean(customDateFrom && customDateTo));

  const stepTxPeriod = (step: -1 | 1) => {
    setOpenTxId(null);
    if (filters.transactions === 'monthly') {
      setTxMonthOffset((prev) => prev + step);
    } else if (filters.transactions === 'yearly') {
      setTxYearOffset((prev) => prev + step);
    } else if (filters.transactions === 'custom') {
      setTxCustomOffset((prev) => prev + step);
    }
  };

  const handleTxSwipeStart = (clientX: number, clientY: number) => {
    didTxSwipeRef.current = false;
    if (!canSwipeTx) return;
    txSwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingTx(true);
  };

  const handleTxSwipeMove = (clientX: number, clientY: number) => {
    const state = txSwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 10) {
      didTxSwipeRef.current = true;
      setOpenTxId(null);
    }
    setTxSwipeX(Math.max(-96, Math.min(96, dx * 0.45)));
  };

  const handleTxSwipeEnd = () => {
    const state = txSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingTx(false);

    if (state.axis === 'x') {
      if (txSwipeX > 36) {
        stepTxPeriod(-1);
      } else if (txSwipeX < -36) {
        stepTxPeriod(1);
      }
    }
    state.axis = null;
    setTxSwipeX(0);
    if (didTxSwipeRef.current) {
      window.setTimeout(() => {
        didTxSwipeRef.current = false;
      }, 120);
    }
  };

  const canSwipeIncExp =
    filters.incExp === 'monthly' ||
    filters.incExp === 'yearly' ||
    (filters.incExp === 'custom' && Boolean(customDateFrom && customDateTo));

  const handleIncExpSwipeStart = (clientX: number, clientY: number) => {
    didIncExpSwipeRef.current = false;
    if (!canSwipeIncExp) return;
    incExpSwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingIncExp(true);
  };

  const handleIncExpSwipeMove = (clientX: number, clientY: number) => {
    const state = incExpSwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 10) {
      didIncExpSwipeRef.current = true;
      handlePressEnd();
    }
    setIncExpSwipeX(Math.max(-96, Math.min(96, dx * 0.45)));
  };

  const handleIncExpSwipeEnd = () => {
    const state = incExpSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingIncExp(false);

    if (state.axis === 'x') {
      const step = incExpSwipeX > 36 ? -1 : incExpSwipeX < -36 ? 1 : 0;
      if (step !== 0) {
        if (filters.incExp === 'monthly') {
          setIncExpMonthOffset((prev) => prev + step);
        } else if (filters.incExp === 'yearly') {
          setIncExpYearOffset((prev) => prev + step);
        } else if (filters.incExp === 'custom') {
          setIncExpCustomOffset((prev) => prev + step);
        }
      }
    }
    state.axis = null;
    setIncExpSwipeX(0);
    if (didIncExpSwipeRef.current) {
      window.setTimeout(() => {
        didIncExpSwipeRef.current = false;
      }, 0);
    }
  };

  const canSwipePie =
    filters.categoryPieChart === 'monthly' ||
    filters.categoryPieChart === 'yearly' ||
    (filters.categoryPieChart === 'custom' && Boolean(customDateFrom && customDateTo));

  const handlePieSwipeStart = (clientX: number, clientY: number) => {
    didPieSwipeRef.current = false;
    if (!canSwipePie) return;
    pieSwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingPie(true);
  };

  const handlePieSwipeMove = (clientX: number, clientY: number) => {
    const state = pieSwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 10) {
      didPieSwipeRef.current = true;
      handlePressEnd();
    }
    setPieSwipeX(Math.max(-96, Math.min(96, dx * 0.45)));
  };

  const handlePieSwipeEnd = () => {
    const state = pieSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingPie(false);

    if (state.axis === 'x') {
      const step = pieSwipeX > 36 ? -1 : pieSwipeX < -36 ? 1 : 0;
      if (step !== 0) {
        setActiveExpenseChartCategory(null);
        setActiveIncomeChartCategory(null);
        if (filters.categoryPieChart === 'monthly') {
          setPieMonthOffset((prev) => prev + step);
        } else if (filters.categoryPieChart === 'yearly') {
          setPieYearOffset((prev) => prev + step);
        } else if (filters.categoryPieChart === 'custom') {
          setPieCustomOffset((prev) => prev + step);
        }
      }
    }
    state.axis = null;
    setPieSwipeX(0);
    if (didPieSwipeRef.current) {
      window.setTimeout(() => {
        didPieSwipeRef.current = false;
      }, 0);
    }
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let totalLendAll = 0;
    let totalBorrowAll = 0;
    let monthlyNetWorthDelta = 0;

    transactions.forEach((tx) => {
      const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;
      if (tx.type === 'lend' && !tx.resolved) totalLendAll += due;
      if (tx.type === 'borrow' && !tx.resolved) totalBorrowAll += due;

      if (tx.rawDate) {
        const d = parseLocalDate(tx.rawDate);
        if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
          if (tx.type === 'income') {
            monthlyNetWorthDelta += tx.amount;
          } else if (tx.type === 'expense') {
            monthlyNetWorthDelta -= tx.amount;
          } else if (tx.type === 'transfer' && tx.charge) {
            monthlyNetWorthDelta -= tx.charge;
          } else if (tx.type === 'adjustment' || tx.type === 'correction') {
            monthlyNetWorthDelta += tx.amount;
          }
        }
      }
    });

    let availableCashBalance = 0;
    wallets.forEach((w) => {
      availableCashBalance += walletBalances[w] || 0;
    });

    let totalSavings = 0;
    savingsList.forEach((s) => {
      totalSavings += walletBalances[s] || 0;
    });

    const absoluteNetWorth = availableCashBalance + totalSavings + totalLendAll - totalBorrowAll;
    const prevMonthNetWorth = absoluteNetWorth - monthlyNetWorthDelta;

    let netWorthTrendPct: number | null = null;
    if (Math.abs(prevMonthNetWorth) >= 0.01 && Math.abs(monthlyNetWorthDelta) >= 0.01) {
      const rawPct = (monthlyNetWorthDelta / Math.abs(prevMonthNetWorth)) * 100;
      if (Number.isFinite(rawPct) && Math.abs(rawPct) >= 0.1) {
        netWorthTrendPct = rawPct;
      }
    }

    return {
      absoluteNetWorth,
      availableCashBalance,
      totalSavings,
      dispLend: totalLendAll,
      dispBorrow: totalBorrowAll,
      netWorthTrendPct,
      monthlyNetWorthDelta,
      prevMonthNetWorth,
    };
  }, [transactions, wallets, savingsList, walletBalances]);

  useEffect(() => {
    if (!showNetWorthTrendNote) return;
    const autoHideTimer = window.setTimeout(() => {
      setShowNetWorthTrendNote(false);
    }, 5000);
    const handlePointerDown = (e: PointerEvent) => {
      if (netWorthCardRef.current && !netWorthCardRef.current.contains(e.target as Node)) {
        setShowNetWorthTrendNote(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNetWorthTrendNote(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(autoHideTimer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNetWorthTrendNote]);

  const incExpSummary = useMemo(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    let filteredTxs: Transaction[] = [];
    let periodTitle = '';
    let headerBadge = '';
    let todayPct: number | null = null;
    let isCurrentMonthView = false;

    if (filters.incExp === 'monthly') {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + incExpMonthOffset, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      filteredTxs = transactions.filter((tx) => {
        if (!tx.rawDate) return false;
        const d = parseLocalDate(tx.rawDate);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });

      periodTitle = targetDate.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
      headerBadge = getMonthBadgeLabel(incExpMonthOffset, periodTitle, t);
      if (incExpMonthOffset === 0) {
        isCurrentMonthView = true;
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        todayPct = Math.min(100, Math.max(0, (now.getDate() / daysInMonth) * 100));
      }
    } else if (filters.incExp === 'yearly') {
      const targetYear = now.getFullYear() + incExpYearOffset;
      filteredTxs = transactions.filter((tx) => {
        if (!tx.rawDate) return false;
        return parseLocalDate(tx.rawDate).getFullYear() === targetYear;
      });

      const yearDisplay = new Date(targetYear, 0, 1).toLocaleDateString(locale, {
        year: 'numeric',
      });
      periodTitle =
        lang === 'bn' ? `জানুয়ারি – ডিসেম্বর ${yearDisplay}` : `Jan – Dec ${yearDisplay}`;
      headerBadge = incExpYearOffset === 0 ? t.common.thisYear : yearDisplay;
      if (incExpYearOffset === 0) {
        const startOfYear = new Date(targetYear, 0, 1);
        const endOfYear = new Date(targetYear + 1, 0, 1);
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
        const daysInYear = Math.max(1, Math.round((endOfYear.getTime() - startOfYear.getTime()) / 86400000));
        todayPct = Math.min(100, Math.max(0, (dayOfYear / daysInYear) * 100));
      }
    } else if (filters.incExp === 'custom' && customDateFrom && customDateTo) {
      const { from, to } = getShiftedCustomRange(customDateFrom, customDateTo, incExpCustomOffset);
      filteredTxs = transactions.filter(
        (tx) => !tx.rawDate || (tx.rawDate >= from && tx.rawDate <= to)
      );
      periodTitle =
        from === to
          ? formatDisplayDate(from, lang)
          : `${formatDisplayDate(from, lang)} – ${formatDisplayDate(to, lang)}`;
      headerBadge = formatShortRangeLabel(from, to, lang);
      const todayISO = getTodayISO();
      if (todayISO >= from && todayISO <= to) {
        const fromDate = parseLocalDate(from);
        const toDate = parseLocalDate(to);
        const todayDate = parseLocalDate(todayISO);
        const totalDays = Math.max(
          1,
          Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
        );
        const elapsedDays = Math.max(
          1,
          Math.round((todayDate.getTime() - fromDate.getTime()) / 86400000) + 1
        );
        todayPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      }
    } else {
      filteredTxs = filterTransactionsByPeriod(
        transactions,
        filters.incExp,
        customDateFrom,
        customDateTo
      );
      headerBadge = getFilterName(filters.incExp, lang);
      periodTitle = getPeriodLabel(filters.incExp, customDateFrom, customDateTo, lang);
      if (filters.incExp === 'previous_month') {
        periodTitle = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
          locale,
          {
            month: 'long',
            year: 'numeric',
          }
        );
      }
    }

    let totalIncome = 0;
    let totalExpense = 0;

    filteredTxs.forEach((tx) => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpense += tx.amount;
      } else if (tx.type === 'adjustment') {
        if (tx.amount > 0) totalIncome += tx.amount;
        else totalExpense += Math.abs(tx.amount);
      }
    });

    let filterButtonLabel = headerBadge;
    if (filters.incExp === 'monthly' || filters.incExp === 'previous_month') {
      filterButtonLabel = periodTitle;
    } else if (filters.incExp === 'yearly') {
      const targetYear = now.getFullYear() + incExpYearOffset;
      filterButtonLabel = new Date(targetYear, 0, 1).toLocaleDateString(locale, {
        year: 'numeric',
      });
    }

    const netSavings = totalIncome - totalExpense;
    const expenseRatioPct =
      totalIncome > 0
        ? Math.min(100, Math.max(0, (totalExpense / totalIncome) * 100))
        : totalExpense > 0
        ? 100
        : 0;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      expenseRatioPct,
      periodTitle,
      headerBadge,
      filterButtonLabel,
      todayPct,
      isCurrentMonthView,
    };
  }, [
    transactions,
    filters.incExp,
    incExpMonthOffset,
    incExpYearOffset,
    incExpCustomOffset,
    customDateFrom,
    customDateTo,
    lang,
    t,
  ]);

  const budgetSummary = useMemo(() => {
    const sortedGoals = [...budgetGoals]
      .map((goal) => {
        const spent = monthlySpentByCategory[goal.category] || 0;
        const pct = goal.monthlyLimit > 0 ? (spent / goal.monthlyLimit) * 100 : 0;
        return { goal, spent, pct };
      })
      .sort((a, b) => b.pct - a.pct);

    const totalLimit = budgetGoals.reduce((sum, g) => sum + g.monthlyLimit, 0);
    const totalSpent = budgetGoals.reduce(
      (sum, g) => sum + (monthlySpentByCategory[g.category] || 0),
      0
    );
    const totalPct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    return { sortedGoals, totalLimit, totalSpent, totalPct };
  }, [budgetGoals, monthlySpentByCategory]);

  const savingSummary = useMemo(() => {
    const items = savingGoals
      .map((goal) => ({
        goal,
        progress: computeSavingGoalProgress(goal, transactions, savingsList, lang),
      }))
      .sort((a, b) => b.progress.pct - a.progress.pct);

    const totalTarget = savingGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = items.reduce((sum, item) => sum + Math.max(0, item.progress.savedAmount), 0);
    const totalPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return { items, totalTarget, totalSaved, totalPct };
  }, [savingGoals, transactions, savingsList, lang]);

  const pieReportData = useMemo(
    () =>
      computeCategoryReport(
        transactions,
        filters.categoryPieChart,
        pieMonthOffset,
        pieYearOffset,
        pieCustomOffset,
        customDateFrom,
        customDateTo,
        lang
      ),
    [
      transactions,
      filters.categoryPieChart,
      pieMonthOffset,
      pieYearOffset,
      pieCustomOffset,
      customDateFrom,
      customDateTo,
      lang,
    ]
  );

  const openCategoryDrilldown = (kind: 'expense' | 'income', categoryName: string) => {
    const filterMode = filters.categoryPieChart;
    const periodContext: DrilldownPeriodContext = {
      periodLabel: pieReportData.periodTitle,
      ...(filterMode === 'monthly' ? { monthOffset: pieMonthOffset } : {}),
      ...(filterMode === 'yearly' ? { yearOffset: pieYearOffset } : {}),
      ...(filterMode === 'custom' ? { customOffset: pieCustomOffset } : {}),
    };

    onOpenDrilldown(
      kind === 'expense' ? 'expense_category' : 'income_category',
      categoryName,
      filterMode,
      periodContext
    );
  };

  const txPeriodData = useMemo(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const filterMode = filters.transactions;

    let items: Transaction[] = [];
    let periodTitle = '';
    let filterButtonLabel = '';

    if (filterMode === 'monthly') {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + txMonthOffset, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      items = transactions.filter((tx) => {
        if (!tx.rawDate) return false;
        const d = parseLocalDate(tx.rawDate);
        return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
      });
      periodTitle = targetDate.toLocaleDateString(locale, {
        month: 'long',
        year: 'numeric',
      });
      filterButtonLabel = periodTitle;
    } else if (filterMode === 'yearly') {
      const targetYear = now.getFullYear() + txYearOffset;

      items = transactions.filter((tx) => {
        if (!tx.rawDate) return false;
        return parseLocalDate(tx.rawDate).getFullYear() === targetYear;
      });
      const yearDisplay = new Date(targetYear, 0, 1).toLocaleDateString(locale, {
        year: 'numeric',
      });
      periodTitle =
        lang === 'bn' ? `জানুয়ারি – ডিসেম্বর ${yearDisplay}` : `Jan – Dec ${yearDisplay}`;
      filterButtonLabel = yearDisplay;
    } else if (filterMode === 'custom' && customDateFrom && customDateTo) {
      const { from, to } = getShiftedCustomRange(customDateFrom, customDateTo, txCustomOffset);

      items = transactions.filter(
        (tx) => !tx.rawDate || (tx.rawDate >= from && tx.rawDate <= to)
      );
      periodTitle =
        from === to
          ? formatDisplayDate(from, lang)
          : `${formatDisplayDate(from, lang)} – ${formatDisplayDate(to, lang)}`;
      filterButtonLabel = formatShortRangeLabel(from, to, lang);
    } else {
      items = filterTransactionsByPeriod(transactions, filterMode, customDateFrom, customDateTo);
      filterButtonLabel = getFilterName(filterMode, lang);
      periodTitle = getPeriodLabel(filterMode, customDateFrom, customDateTo, lang);
      if (filterMode === 'previous_month') {
        periodTitle = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
          locale,
          {
            month: 'long',
            year: 'numeric',
          }
        );
        filterButtonLabel = periodTitle;
      }
    }

    return { items, periodTitle, filterButtonLabel };
  }, [
    transactions,
    filters.transactions,
    txMonthOffset,
    txYearOffset,
    txCustomOffset,
    customDateFrom,
    customDateTo,
    lang,
  ]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return txPeriodData.items;
    return txPeriodData.items.filter(
      (tx) =>
        tx.title.toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.subCategory || '').toLowerCase().includes(q) ||
        (tx.wallet || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
    );
  }, [txPeriodData.items, searchQuery]);

  const renderSection = (key: GridKey) => {
    if (!visibleGrids[key]) return null;

    switch (key) {
      case 'netWorth': {
        const isNegativeNetWorth = metrics.absoluteNetWorth < 0;
        const trendPct = metrics.netWorthTrendPct;
        const isTrendPositive = trendPct !== null && trendPct > 0;
        const formattedTrendPct =
          trendPct !== null
            ? `${trendPct > 0 ? '+' : '-'}${Math.abs(trendPct).toFixed(1)}%`
            : '';
        const formattedTrendDelta = `${metrics.monthlyNetWorthDelta >= 0 ? '+' : '-'}${formatMoney(
          Math.abs(metrics.monthlyNetWorthDelta),
          currency
        )}`;

        const totalAssets =
          metrics.availableCashBalance + metrics.totalSavings + metrics.dispLend;
        const totalLiabilities = metrics.dispBorrow;

        return (
          <div key="netWorth" ref={netWorthCardRef} className="relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenDrilldown('netWorth', null, 'all')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenDrilldown('netWorth', null, 'all');
                }
              }}
              className="net-worth-card group relative cursor-pointer overflow-hidden rounded-3xl border border-white/[0.06] px-5 py-4 text-white transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 sm:px-6 sm:py-4.5 dark:border-white/10"
            >
              {/* Ambient decorative radial orbs */}
              <span
                aria-hidden="true"
                className="net-worth-orb-top pointer-events-none absolute -top-20 -right-[60px] z-0 h-[200px] w-[200px] rounded-full"
              />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -bottom-[50px] -left-[30px] z-0 h-[140px] w-[140px] rounded-full ${
                  isNegativeNetWorth ? 'net-worth-orb-bottom-neg' : 'net-worth-orb-bottom-pos'
                }`}
              />

              <div className="relative z-10">
                {/* Top Header: Title & Date */}
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 sm:text-xs">
                    {t.dashboard.netWorth}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400/80 sm:text-xs">
                    {formatDisplayDate(getTodayISO(), lang)}
                  </span>
                </div>

                {/* Main Amount + Interactive Trend Indicator */}
                <div className="mb-2.5 flex flex-nowrap items-center gap-2">
                  <div className="font-mono-num min-w-0 truncate text-[24px] leading-tight font-bold tracking-tight tabular-nums sm:text-[28px]">
                    <AnimatedMoneyValue
                      value={metrics.absoluteNetWorth}
                      currency={currency}
                      durationMs={800}
                      variant="netWorth"
                    />
                  </div>
                  {trendPct !== null && (
                    <button
                      type="button"
                      aria-label={t.dashboard.netWorthTrendAria}
                      aria-expanded={showNetWorthTrendNote}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNetWorthTrendNote((prev) => !prev);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                      }}
                      className="-m-1.5 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] leading-none transition-colors ${
                          isTrendPositive
                            ? showNetWorthTrendNote
                              ? 'bg-emerald-400/30 text-emerald-200 ring-1 ring-emerald-300/50'
                              : 'bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/25'
                            : showNetWorthTrendNote
                            ? 'bg-[#ff6b6b]/30 text-rose-200 ring-1 ring-[#ff6b6b]/50'
                            : 'bg-[#ff6b6b]/15 text-[#ff6b6b] hover:bg-[#ff6b6b]/25'
                        }`}
                      >
                        {isTrendPositive ? '▲' : '▼'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Available Balance Glass Pill */}
                <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] text-slate-300 sm:text-xs">
                  <span className="truncate">{t.dashboard.availableCash}:</span>
                  <strong className="font-mono-num shrink-0 font-bold tabular-nums text-white">
                    {formatMoney(metrics.availableCashBalance, currency)}
                  </strong>
                </div>

                {/* Card Footer: View Breakdown */}
                <div className="flex items-center justify-between border-t border-white/[0.08] pt-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 transition-[gap] duration-200 group-hover:gap-2">
                    <span>{t.dashboard.viewBreakdown}</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-Dismissing Floating Formula Popup (5s) */}
            {trendPct !== null && showNetWorthTrendNote && (
              <div
                role="status"
                aria-live="polite"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNetWorthTrendNote(false);
                }}
                className="absolute top-[78px] right-3 left-3 z-30 cursor-pointer rounded-2xl border border-white/15 bg-slate-900/95 px-3.5 py-3 text-left text-white shadow-2xl shadow-slate-950/60 backdrop-blur-md sm:right-auto sm:left-5 sm:w-[310px]"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold tracking-tight text-white">
                    {t.dashboard.netWorthFormulaTitle}
                  </span>
                  <button
                    type="button"
                    aria-label={t.common.close}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNetWorthTrendNote(false);
                    }}
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Assets */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-emerald-300">
                    <span>{t.dashboard.netWorthAssetsLabel}</span>
                    <span className="font-mono-num tabular-nums">
                      +{formatMoney(totalAssets, currency)}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-2.5 text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.dashboard.netWorthWalletsRow}</span>
                      <span className="font-mono-num shrink-0 tabular-nums text-slate-200">
                        {formatMoney(metrics.availableCashBalance, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.dashboard.netWorthSavingsRow}</span>
                      <span className="font-mono-num shrink-0 tabular-nums text-slate-200">
                        {formatMoney(metrics.totalSavings, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.dashboard.netWorthLentRow}</span>
                      <span className="font-mono-num shrink-0 tabular-nums text-slate-200">
                        {formatMoney(metrics.dispLend, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Liabilities */}
                <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-[#ff6b6b]">
                    <span>{t.dashboard.netWorthLiabilitiesLabel}</span>
                    <span className="font-mono-num tabular-nums">
                      -{formatMoney(totalLiabilities, currency)}
                    </span>
                  </div>
                  <div className="pl-2.5 text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.dashboard.netWorthBorrowedRow}</span>
                      <span className="font-mono-num shrink-0 tabular-nums text-slate-200">
                        {formatMoney(totalLiabilities, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend Summary */}
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px]">
                  <span className="text-slate-300">
                    {t.dashboard.netWorthThisMonthPrefix}:{' '}
                    <span
                      className={`font-mono-num font-bold tabular-nums ${
                        isTrendPositive ? 'text-emerald-300' : 'text-[#ff6b6b]'
                      }`}
                    >
                      {isTrendPositive ? '▲' : '▼'} {formattedTrendPct} ({formattedTrendDelta})
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'wallets':
        return (
          <SwipeableAccountStrip
            key="wallets"
            title={t.dashboard.wallets}
            icon={<Wallet className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />}
          >
            {(wasDragging) => (
              <>
                {wallets.map((w) => {
                  const style = getCategoryStyle(categoryStyles, 'wal', w);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        if (!wasDragging()) onOpenDrilldown('wallet', w, 'all');
                      }}
                      className="w-[calc((100%-16px)/3)] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-[#16845B]/50 sm:w-[calc((100%-24px)/3)] sm:p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CategoryIconBadge style={style} size="xs" />
                        <span className="truncate text-[11px] font-bold text-slate-700 sm:text-xs dark:text-slate-200">
                          {w}
                        </span>
                      </div>
                      <div className="font-mono-num mt-1.5 truncate text-sm font-extrabold text-[#16845B] sm:mt-2 sm:text-base dark:text-emerald-400">
                        {formatMoney(walletBalances[w] || 0, currency)}
                      </div>
                    </button>
                  );
                })}
                {onAddAccount && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!wasDragging()) onAddAccount('wallet');
                    }}
                    aria-label={t.dashboard.addWallet}
                    className="flex w-[calc((100%-16px)/3)] shrink-0 snap-start cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#16845B]/45 bg-emerald-50/40 p-2.5 text-center transition-colors hover:border-[#16845B] hover:bg-emerald-50 sm:w-[calc((100%-24px)/3)] sm:gap-1.5 sm:p-4 dark:border-emerald-700/60 dark:bg-emerald-950/20 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[#16845B] sm:h-7 sm:w-7 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="max-w-full truncate text-[11px] font-bold text-[#16845B] sm:text-xs dark:text-emerald-300">
                      {t.dashboard.addWallet}
                    </span>
                  </button>
                )}
              </>
            )}
          </SwipeableAccountStrip>
        );

      case 'savings':
        return (
          <SwipeableAccountStrip
            key="savings"
            title={t.dashboard.savingsInvestments}
            icon={<PiggyBank className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />}
          >
            {(wasDragging) => (
              <>
                {savingsList.map((s) => {
                  const style = getCategoryStyle(categoryStyles, 'sav', s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        if (!wasDragging()) onOpenDrilldown('savings', s, 'all');
                      }}
                      className="w-[calc((100%-16px)/3)] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white p-2.5 text-left shadow-sm transition-colors hover:border-sky-500/50 sm:w-[calc((100%-24px)/3)] sm:p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <CategoryIconBadge style={style} size="xs" />
                        <span className="truncate text-[11px] font-bold text-slate-700 sm:text-xs dark:text-slate-200">
                          {s}
                        </span>
                      </div>
                      <div className="font-mono-num mt-1.5 truncate text-sm font-extrabold text-sky-700 sm:mt-2 sm:text-base dark:text-sky-400">
                        {formatMoney(walletBalances[s] || 0, currency)}
                      </div>
                    </button>
                  );
                })}
                {onAddAccount && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!wasDragging()) onAddAccount('savings');
                    }}
                    aria-label={t.dashboard.addSavingsAccount}
                    className="flex w-[calc((100%-16px)/3)] shrink-0 snap-start cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-sky-500/45 bg-sky-50/40 p-2.5 text-center transition-colors hover:border-sky-500 hover:bg-sky-50 sm:w-[calc((100%-24px)/3)] sm:gap-1.5 sm:p-4 dark:border-sky-700/60 dark:bg-sky-950/20 dark:hover:border-sky-500 dark:hover:bg-sky-950/40"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 sm:h-7 sm:w-7 dark:bg-sky-900/60 dark:text-sky-300">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                    <span className="max-w-full truncate text-[11px] font-bold text-sky-700 sm:text-xs dark:text-sky-300">
                      {t.dashboard.addSavingsAccount}
                    </span>
                  </button>
                )}
              </>
            )}
          </SwipeableAccountStrip>
        );

      case 'incExp': {
        const incExpPeriodContext: DrilldownPeriodContext = {
          periodLabel: incExpSummary.periodTitle,
          ...(filters.incExp === 'monthly' ? { monthOffset: incExpMonthOffset } : {}),
          ...(filters.incExp === 'yearly' ? { yearOffset: incExpYearOffset } : {}),
          ...(filters.incExp === 'custom' ? { customOffset: incExpCustomOffset } : {}),
        };
        const hasIncome = incExpSummary.totalIncome > 0;
        const usedPct = hasIncome
          ? Math.round((incExpSummary.totalExpense / incExpSummary.totalIncome) * 100)
          : 0;
        const leftAmount = incExpSummary.totalIncome - incExpSummary.totalExpense;
        const cardState: 'none' | 'ok' | 'near' | 'over' = !hasIncome
          ? 'none'
          : usedPct > 100
          ? 'over'
          : usedPct >= 80
          ? 'near'
          : 'ok';

        const statusText =
          cardState === 'over'
            ? t.dashboard.overspentLabel
            : cardState === 'near'
            ? t.dashboard.runningHighLabel
            : t.dashboard.onTrackLabel;
        const leftTileLabel =
          cardState === 'over' ? t.dashboard.overByLabel : t.dashboard.leftLabel;

        const fmtTileVal = (n: number) =>
          Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

        const leftTileTheme =
          cardState === 'ok'
            ? 'bg-[#E4F3EA] text-[#0F6B45] dark:bg-emerald-950/55 dark:text-emerald-300'
            : cardState === 'near'
            ? 'bg-[#FFF1D6] text-[#8A5300] dark:bg-amber-950/55 dark:text-amber-300'
            : cardState === 'over'
            ? 'bg-[#FDEBEA] text-[#B42318] dark:bg-rose-950/55 dark:text-rose-300'
            : 'bg-[#F4F7F6] text-[#5B6B7F] dark:bg-slate-800/70 dark:text-slate-400';

        const expenseBarPct = Math.min(100, Math.max(0, incExpSummary.expenseRatioPct));
        const hasExpenseOnly = !hasIncome && incExpSummary.totalExpense > 0;

        const clampedTodayLabelPct =
          incExpSummary.todayPct !== null
            ? Math.min(92, Math.max(8, incExpSummary.todayPct))
            : null;

        return (
          <div
            key="incExp"
            onTouchStart={(e) => {
              handlePressStart('incExp', e.touches[0].clientX, e.touches[0].clientY);
              handleIncExpSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              handlePressMove(e.touches[0].clientX, e.touches[0].clientY);
              handleIncExpSwipeMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={() => {
              handlePressEnd();
              handleIncExpSwipeEnd();
            }}
            onTouchCancel={() => {
              handlePressEnd();
              handleIncExpSwipeEnd();
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                handlePressStart('incExp', e.clientX, e.clientY);
                handleIncExpSwipeStart(e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                handlePressMove(e.clientX, e.clientY);
                handleIncExpSwipeMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={() => {
              handlePressEnd();
              handleIncExpSwipeEnd();
            }}
            onMouseLeave={() => {
              handlePressEnd();
              handleIncExpSwipeEnd();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handlePressEnd();
              onOpenFilterCard('incExp');
            }}
            className="select-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              style={{
                transform: `translateX(${incExpSwipeX}px)`,
              }}
              className={!isSwipingIncExp ? 'transition-transform duration-200 ease-out' : ''}
            >
              {/* Header: Month / Period Dropdown */}
              <div className="mb-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLongPressRef.current || didIncExpSwipeRef.current) return;
                    onOpenFilterCard('incExp');
                  }}
                  aria-label={t.modals.selectTimePeriod}
                  title={t.modals.selectTimePeriod}
                  className="inline-flex min-h-[28px] min-w-0 cursor-pointer items-center gap-1 rounded-lg px-1 text-xs font-semibold text-[#112A46] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] sm:text-[13px] dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{incExpSummary.filterButtonLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#5B6B7F] dark:text-slate-400" />
                </button>
              </div>

              {/* 3-Column Tiles: Income | Expense | Left / Over by */}
              <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-1.5 sm:gap-2">
                {/* Tile 1: Income (Value or Dashed + Add CTA) */}
                {hasIncome ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLongPressRef.current && !didIncExpSwipeRef.current) {
                        onOpenDrilldown('income', null, filters.incExp, incExpPeriodContext);
                      }
                    }}
                    className="min-w-0 cursor-pointer rounded-[14px] bg-[#F4F7F6] p-2.5 text-left transition-colors hover:bg-[#E9F2EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E9E6A] dark:bg-slate-800/70 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-1 text-[11px] text-[#5B6B7F] sm:text-xs dark:text-slate-400">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#1E9E6A] dark:text-emerald-400" />
                      <span className="truncate">{t.common.income}</span>
                    </div>
                    <div className="font-mono-num mt-1 flex items-baseline gap-0.5 text-[15px] font-bold leading-tight tabular-nums text-[#112A46] sm:text-base dark:text-slate-100">
                      <span className="shrink-0 text-[11px] font-medium text-[#5B6B7F] sm:text-xs dark:text-slate-400">
                        {currency}
                      </span>
                      <span className="truncate">{fmtTileVal(incExpSummary.totalIncome)}</span>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isLongPressRef.current || didIncExpSwipeRef.current) return;
                      if (onStartAddingIncome) onStartAddingIncome();
                      else onStartAddingTx();
                    }}
                    aria-label={`${t.common.add} ${t.common.income}`}
                    className="min-w-0 cursor-pointer rounded-[14px] border-[1.5px] border-dashed border-[#1E9E6A] bg-white p-2.5 text-left transition-colors hover:bg-[#E4F3EA]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E9E6A] dark:border-emerald-500/70 dark:bg-slate-900 dark:hover:bg-emerald-950/30"
                  >
                    <div className="flex items-center gap-1 text-[11px] text-[#5B6B7F] sm:text-xs dark:text-slate-400">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#1E9E6A] dark:text-emerald-400" />
                      <span className="truncate">{t.common.income}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[13px] font-semibold leading-tight text-[#0F6B45] sm:text-sm dark:text-emerald-400">
                      <Plus className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
                      <span className="truncate">{t.common.add}</span>
                    </div>
                  </button>
                )}

                {/* Tile 2: Expense */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isLongPressRef.current && !didIncExpSwipeRef.current) {
                      onOpenDrilldown('expense', null, filters.incExp, incExpPeriodContext);
                    }
                  }}
                  className="min-w-0 cursor-pointer rounded-[14px] bg-[#F4F7F6] p-2.5 text-left transition-colors hover:bg-[#F5EBEB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D64545] dark:bg-slate-800/70 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-1 text-[11px] text-[#5B6B7F] sm:text-xs dark:text-slate-400">
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-[#D64545] dark:text-rose-400" />
                    <span className="truncate">{t.common.expense}</span>
                  </div>
                  <div className="font-mono-num mt-1 flex items-baseline gap-0.5 text-[15px] font-bold leading-tight tabular-nums text-[#112A46] sm:text-base dark:text-slate-100">
                    <span className="shrink-0 text-[11px] font-medium text-[#5B6B7F] sm:text-xs dark:text-slate-400">
                      {currency}
                    </span>
                    <span className="truncate">{fmtTileVal(incExpSummary.totalExpense)}</span>
                  </div>
                </button>

                {/* Tile 3: Left / Over by (Semantic emphasis tile) */}
                <div className={`min-w-0 rounded-[14px] p-2.5 text-left ${leftTileTheme}`}>
                  <div className="flex items-center gap-1 text-[11px] font-medium sm:text-xs">
                    {cardState === 'ok' && (
                      <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
                    )}
                    {cardState === 'near' && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {cardState === 'over' && (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate">{leftTileLabel}</span>
                  </div>
                  {hasIncome ? (
                    <div className="font-mono-num mt-1 flex items-baseline gap-0.5 text-[17px] font-bold leading-tight tabular-nums sm:text-[19px]">
                      <span className="shrink-0 text-xs font-medium sm:text-[13px]">
                        {leftAmount < 0 ? `−${currency}` : currency}
                      </span>
                      <span className="truncate">{fmtTileVal(leftAmount)}</span>
                    </div>
                  ) : (
                    <div className="font-mono-num mt-1 text-[17px] font-bold leading-tight text-[#5B6B7F] sm:text-[19px] dark:text-slate-500">
                      —
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar (Red = Expense, Green = Remaining Income) with Today Pace Marker */}
              {hasIncome ? (
                <div className="pt-3">
                  <div className="relative h-2.5 w-full rounded-[5px]">
                    <div
                      role="img"
                      aria-label={`${usedPct}% ${t.dashboard.ofIncomeUsed}`}
                      className="flex h-2.5 w-full overflow-hidden rounded-[5px] bg-[#E8EDF0] dark:bg-slate-800"
                    >
                      {expenseBarPct > 0 && (
                        <div
                          className={`h-full bg-[#D64545] transition-all duration-300 dark:bg-rose-500 ${
                            expenseBarPct < 100
                              ? 'border-r border-white/80 dark:border-slate-900/80'
                              : ''
                          }`}
                          style={{ width: `${expenseBarPct}%` }}
                        />
                      )}
                      {expenseBarPct < 100 && (
                        <div className="h-full flex-1 bg-[#1E9E6A] transition-all duration-300 dark:bg-emerald-500" />
                      )}
                    </div>
                    {incExpSummary.todayPct !== null && (
                      <div
                        aria-hidden="true"
                        className="absolute -top-[3px] h-4 w-[2px] rounded-[1px] bg-[#112A46] ring-1 ring-white/80 dark:bg-slate-100 dark:ring-slate-900/80"
                        style={{ left: `${incExpSummary.todayPct}%` }}
                      />
                    )}
                  </div>
                  <div className="relative mt-1.5 min-h-[16px] text-[11px] text-[#5B6B7F] dark:text-slate-400">
                    <span className="block truncate pr-10">
                      {statusText} · {usedPct}% {t.dashboard.ofIncomeUsed}
                    </span>
                    {clampedTodayLabelPct !== null && (
                      <span
                        className="absolute top-0 -translate-x-1/2 rounded bg-white px-1 font-medium text-[#112A46] dark:bg-slate-900 dark:text-slate-200"
                        style={{ left: `${clampedTodayLabelPct}%` }}
                      >
                        {t.dashboard.todayLabel}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-2.5">
                  {hasExpenseOnly && (
                    <div className="mb-2 h-2.5 w-full overflow-hidden rounded-[5px] bg-[#D64545] dark:bg-rose-500" />
                  )}
                  <p className="text-xs text-[#5B6B7F] dark:text-slate-400">
                    {incExpSummary.isCurrentMonthView
                      ? t.dashboard.addIncomeHint
                      : t.dashboard.addPeriodIncomeHint}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'lendBorrow':
        return (
          <div key="lendBorrow" className="grid grid-cols-2 gap-3">
            <div
              onClick={() => onOpenDrilldown('lend', null, 'all')}
              className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="truncate text-xs font-bold text-blue-700 dark:text-blue-400">
                {t.dashboard.lentReceivable}
              </span>
              <div className="font-mono-num mt-1.5 truncate text-base font-extrabold leading-tight text-blue-700 sm:text-lg dark:text-blue-400">
                {formatMoney(metrics.dispLend, currency)}
              </div>
            </div>

            <div
              onClick={() => onOpenDrilldown('borrow', null, 'all')}
              className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="truncate text-xs font-bold text-purple-700 dark:text-purple-400">
                {t.dashboard.borrowedPayable}
              </span>
              <div className="font-mono-num mt-1.5 truncate text-base font-extrabold leading-tight text-purple-700 sm:text-lg dark:text-purple-400">
                {formatMoney(metrics.dispBorrow, currency)}
              </div>
            </div>
          </div>
        );

      case 'budgetGoals': {
        const hasBudgets = budgetSummary.sortedGoals.length > 0;
        const hasSavings = savingSummary.items.length > 0;

        const budgetOverCount = budgetSummary.sortedGoals.filter((g) => g.pct > 100).length;
        const totalOverAmount = Math.max(0, budgetSummary.totalSpent - budgetSummary.totalLimit);
        const totalLeftAmount = Math.max(0, budgetSummary.totalLimit - budgetSummary.totalSpent);
        const isTotalOver = budgetSummary.totalSpent > budgetSummary.totalLimit;
        const budgetIsOver = isTotalOver || budgetOverCount > 0;
        const budgetIsNear = !budgetIsOver && budgetSummary.totalPct >= 80;
        const budgetRoundedPct = Math.round(budgetSummary.totalPct);

        const primarySavingItem = savingSummary.items[0] || null;
        const savingRemaining = Math.max(0, savingSummary.totalTarget - savingSummary.totalSaved);
        const savingRoundedPct = Math.round(savingSummary.totalPct);
        const suggestedSavingName = savingsList[0] || 'Emergency Fund';

        const budgetBarColor = budgetIsOver
          ? 'bg-[#e11d48] dark:bg-rose-500'
          : budgetIsNear
          ? 'bg-amber-500 dark:bg-amber-400'
          : 'bg-[#15803d] dark:bg-emerald-500';

        const savingBarColor = 'bg-[#15803d] dark:bg-emerald-500';

        const openOverview = (tab: 'budget' | 'saving') => {
          if (onOpenGoalsOverview) {
            onOpenGoalsOverview(tab);
          } else if (tab === 'budget') {
            onOpenBudgetGoalsModal();
          } else {
            onOpenSavingGoalsModal();
          }
        };

        const budgetBarWidth = budgetBarRevealed
          ? Math.min(100, Math.max(0, budgetSummary.totalPct))
          : 0;
        const savingBarWidth = savingBarRevealed
          ? Math.min(100, Math.max(0, savingSummary.totalPct))
          : 0;

        const savingRemainingText =
          savingRemaining > 0
            ? [
                t.dashboard.goalRemainingPrefix,
                formatMoney(savingRemaining, currency),
                t.dashboard.goalRemainingSuffix,
              ]
                .filter(Boolean)
                .join(' ')
            : t.dashboard.goalReachedFootnote;

        const savingCardEntryClass = goalsCardsSettled
          ? ''
          : goalsCardsEntered
          ? 'animate-goal-card-1'
          : 'opacity-0 translate-y-[18px]';
        const budgetCardEntryClass = goalsCardsSettled
          ? ''
          : goalsCardsEntered
          ? 'animate-goal-card-2'
          : 'opacity-0 translate-y-[18px]';

        return (
          <div key="budgetGoals" ref={goalsCardRef}>
            {/* Side-by-Side 2-Column Overview: Savings Goal | Monthly Budget */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Savings Goal */}
              {hasSavings ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openOverview('saving')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openOverview('saving');
                    }
                  }}
                  className={`${savingCardEntryClass} flex min-w-0 cursor-pointer flex-col justify-between rounded-[18px] border border-slate-200 bg-white p-3.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-all duration-150 hover:border-slate-300 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700`}
                >
                  <div>
                    {/* Header: Icon + Goal Title + Quick + Add */}
                    <div className="mb-2.5 flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950/75 dark:text-emerald-400">
                          <PiggyBank className="h-[15px] w-[15px]" strokeWidth={2.2} />
                        </span>
                        <h3 className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                          {savingSummary.items.length === 1 && primarySavingItem
                            ? primarySavingItem.goal.title
                            : t.dashboard.savingsShort}
                        </h3>
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onQuickAddSaving) {
                              onQuickAddSaving(
                                primarySavingItem?.goal.account || savingsList[0],
                                primarySavingItem?.goal.title
                              );
                            } else {
                              onOpenSavingGoalsModal();
                            }
                          }}
                          className="shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-[#15803d] transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] dark:border-emerald-800/70 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-950"
                        >
                          + {t.dashboard.quickAddShort}
                        </button>
                      )}
                    </div>

                    {/* Amount + Percentage */}
                    <div className="mt-0.5 flex items-baseline justify-between gap-1">
                      <span className="font-mono-num truncate text-[16px] font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                        {formatMoney(savingSummary.totalSaved, currency)}
                      </span>
                      <span className="font-mono-num shrink-0 text-[11px] font-bold text-[#15803d] tabular-nums dark:text-emerald-400">
                        {savingRoundedPct}%
                      </span>
                    </div>

                    <div className="font-mono-num mt-0.5 truncate text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                      {t.dashboard.goalTargetPrefix} {formatMoney(savingSummary.totalTarget, currency)}
                    </div>
                  </div>

                  {/* Progress Track + Footnote */}
                  <div className="mt-3">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`${
                          savingBarRevealed ? 'goal-bar-fill' : 'transition-none'
                        } h-full rounded-full ${savingBarColor}`}
                        style={{ width: `${savingBarWidth}%` }}
                      />
                    </div>
                    <div
                      className={`mt-1.5 truncate text-[10.5px] ${
                        savingRemaining <= 0
                          ? 'font-semibold text-[#15803d] dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {savingRemainingText}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`${savingCardEntryClass} flex min-w-0 flex-col justify-between rounded-[18px] border border-[#bbf7d0] bg-gradient-to-b from-[#f0fdf4] via-white to-white p-3.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-emerald-800/70 dark:from-emerald-950/35 dark:via-slate-900 dark:to-slate-900`}
                >
                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#dcfce7] text-[#15803d] dark:bg-emerald-950/75 dark:text-emerald-400">
                        <PiggyBank className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <h3 className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {t.dashboard.savingsShort}
                      </h3>
                    </div>
                    <p className="mb-3 text-[11.5px] leading-[1.45] text-slate-500 dark:text-slate-400">
                      {t.dashboard.setSavingTargetsHint}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenSavingGoalsModal(undefined, {
                            title: suggestedSavingName,
                            account: suggestedSavingName,
                          })
                        }
                        className="flex w-full cursor-pointer items-center justify-between gap-1 rounded-[9px] border border-[#bbf7d0] bg-white px-2 py-1.5 text-left text-[11px] font-bold text-[#166534] transition-colors hover:border-[#15803d] hover:text-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] dark:border-emerald-800/70 dark:bg-slate-950/60 dark:text-emerald-300 dark:hover:border-emerald-500"
                      >
                        <span className="truncate">{suggestedSavingName}</span>
                        <span aria-hidden="true" className="shrink-0">
                          →
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isReadOnly) openOverview('saving');
                        else onOpenSavingGoalsModal();
                      }}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-[10px] bg-[#15803d] px-2.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#166534] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
                      <span className="truncate">{t.dashboard.addGoalShort}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Card 2: Monthly Budget */}
              {hasBudgets ? (
                <button
                  type="button"
                  onClick={() => openOverview('budget')}
                  className={`${budgetCardEntryClass} flex min-w-0 cursor-pointer flex-col justify-between rounded-[18px] border p-3.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] ${
                    budgetIsOver
                      ? 'border-[#fecdd3] bg-gradient-to-b from-[#fff1f2] via-white to-white hover:border-rose-300 dark:border-rose-800/70 dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 dark:hover:border-rose-700'
                      : budgetIsNear
                      ? 'border-amber-200 bg-gradient-to-b from-amber-50/75 via-white to-white hover:border-amber-300 dark:border-amber-800/70 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 dark:hover:border-amber-700'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="w-full">
                    {/* Header: Icon + Budget Title + Status Badge */}
                    <div className="mb-2.5 flex items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${
                            budgetIsOver
                              ? 'bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-950/80 dark:text-rose-400'
                              : budgetIsNear
                              ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
                              : 'bg-sky-50 text-sky-600 dark:bg-sky-950/75 dark:text-sky-400'
                          }`}
                        >
                          <Target className="h-[15px] w-[15px]" strokeWidth={2.2} />
                        </span>
                        <h3 className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                          {t.dashboard.budgetCompactTitle}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          budgetIsOver
                            ? 'bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-950/80 dark:text-rose-400'
                            : budgetIsNear
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400'
                            : 'bg-[#dcfce7] text-[#166534] dark:bg-emerald-950/80 dark:text-emerald-400'
                        }`}
                      >
                        {budgetIsOver
                          ? t.dashboard.budgetOverBadge
                          : budgetIsNear
                          ? t.dashboard.budgetNearBadge
                          : t.dashboard.budgetSafeBadge}
                      </span>
                    </div>

                    {/* Primary Amount + Sub-label */}
                    <div className="mt-0.5 flex items-baseline justify-between gap-1">
                      <span
                        className={`font-mono-num truncate text-[16px] font-bold tracking-tight tabular-nums ${
                          isTotalOver
                            ? 'text-[#e11d48] dark:text-rose-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatMoney(isTotalOver ? totalOverAmount : totalLeftAmount, currency)}
                      </span>
                      <span className="shrink-0 whitespace-nowrap text-[10.5px] text-slate-500 dark:text-slate-400">
                        {isTotalOver ? t.dashboard.budgetOverSub : t.dashboard.budgetLeftSub}
                      </span>
                    </div>

                    <div className="font-mono-num mt-0.5 truncate text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                      {formatMoney(budgetSummary.totalSpent, currency)} /{' '}
                      {formatMoney(budgetSummary.totalLimit, currency)}
                    </div>
                  </div>

                  {/* Progress Track + Footnote */}
                  <div className="mt-3 w-full">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`${
                          budgetBarRevealed ? 'goal-bar-fill' : 'transition-none'
                        } h-full rounded-full ${budgetBarColor}`}
                        style={{ width: `${budgetBarWidth}%` }}
                      />
                    </div>
                    <div className="mt-1.5 truncate text-[10.5px] text-slate-500 dark:text-slate-400">
                      {isTotalOver
                        ? t.dashboard.budgetExceededFootnote
                        : budgetOverCount > 0
                        ? `${budgetOverCount} ${t.dashboard.overLimitCount}`
                        : `${budgetRoundedPct}% ${t.dashboard.budgetUsedLabel}`}
                    </div>
                  </div>
                </button>
              ) : (
                <div
                  className={`${budgetCardEntryClass} flex min-w-0 flex-col justify-between rounded-[18px] border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-white p-3.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:from-slate-800/50 dark:via-slate-900 dark:to-slate-900`}
                >
                  <div>
                    <div className="mb-2.5 flex items-center gap-1.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#ffe4e6] text-[#e11d48] dark:bg-rose-950/75 dark:text-rose-400">
                        <Target className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <h3 className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">
                        {t.dashboard.budgetShort}
                      </h3>
                    </div>
                    <p className="mb-3 text-[11.5px] leading-[1.45] text-slate-500 dark:text-slate-400">
                      {t.dashboard.trackMonthlyLimitsHint}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {!isReadOnly && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {[20000, 30000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => onOpenBudgetGoalsModal(undefined, preset)}
                            className="font-mono-num cursor-pointer rounded-[9px] border border-slate-200 bg-white px-2 py-1.5 text-center text-[11px] font-bold text-slate-900 transition-colors hover:border-[#15803d] hover:text-[#15803d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d] dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                          >
                            {currency}
                            {preset / 1000}k
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (isReadOnly) openOverview('budget');
                        else onOpenBudgetGoalsModal();
                      }}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-[10px] bg-slate-800 px-2.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-900 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0 stroke-[2.6]" />
                      <span className="truncate">{t.dashboard.setBudgetShort}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'categoryPieChart': {
        const isExpensePie = pieView === 'expense';
        const activeItems = isExpensePie
          ? pieReportData.sortedExpenses
          : pieReportData.sortedIncomes;
        const activeTotal = isExpensePie ? pieReportData.totalExpense : pieReportData.totalIncome;
        const styleKind = isExpensePie ? 'exp' : 'inc';
        const activeChartCategory = isExpensePie
          ? activeExpenseChartCategory
          : activeIncomeChartCategory;
        const setActiveChartCategory = isExpensePie
          ? setActiveExpenseChartCategory
          : setActiveIncomeChartCategory;

        const pieCardEntryClass = pieCardSettled
          ? ''
          : pieCardEntered
          ? 'animate-pie-card-entry'
          : 'opacity-0 translate-y-[18px]';

        return (
          <div
            key="categoryPieChart"
            ref={pieCardRef}
            onTouchStart={(e) => {
              handlePressStart('categoryPieChart', e.touches[0].clientX, e.touches[0].clientY);
              handlePieSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              handlePressMove(e.touches[0].clientX, e.touches[0].clientY);
              handlePieSwipeMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={() => {
              handlePressEnd();
              handlePieSwipeEnd();
            }}
            onTouchCancel={() => {
              handlePressEnd();
              handlePieSwipeEnd();
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                handlePressStart('categoryPieChart', e.clientX, e.clientY);
                handlePieSwipeStart(e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                handlePressMove(e.clientX, e.clientY);
                handlePieSwipeMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={() => {
              handlePressEnd();
              handlePieSwipeEnd();
            }}
            onMouseLeave={() => {
              handlePressEnd();
              handlePieSwipeEnd();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handlePressEnd();
              onOpenFilterCard('categoryPieChart');
            }}
            className={`select-none overflow-hidden rounded-2xl border shadow-sm transition-colors duration-200 ${pieCardEntryClass} ${
              isExpensePie
                ? 'border-rose-200/75 bg-rose-50/45 dark:border-rose-900/40 dark:bg-rose-950/20'
                : 'border-emerald-200/75 bg-emerald-50/45 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            }`}
          >
            <div
              style={{
                transform: `translateX(${pieSwipeX}px)`,
              }}
              className={!isSwipingPie ? 'transition-transform duration-200 ease-out' : ''}
            >
              {/* Header: Title + Period Filter & Top-Right Expense/Income Switch Icon */}
              <div
                className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-5 ${
                  isExpensePie
                    ? 'border-rose-200/60 dark:border-rose-900/35'
                    : 'border-emerald-200/60 dark:border-emerald-900/35'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <h3 className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[#102A43] sm:text-sm dark:text-slate-100">
                    {isExpensePie ? t.dashboard.expenseByCategory : t.dashboard.incomeByCategory}
                  </h3>
                  <span aria-hidden="true" className="shrink-0 text-xs text-slate-300 dark:text-slate-600">
                    ·
                  </span>
                  <button
                    type="button"
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isLongPressRef.current || didPieSwipeRef.current) return;
                      onOpenFilterCard('categoryPieChart');
                    }}
                    aria-label={t.modals.selectTimePeriod}
                    title={t.modals.selectTimePeriod}
                    className="inline-flex min-h-[30px] min-w-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  >
                    <span className="truncate">{pieReportData.filterButtonLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>

                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLongPressRef.current || didPieSwipeRef.current) return;
                    setPieView((prev) => (prev === 'expense' ? 'income' : 'expense'));
                    setActiveExpenseChartCategory(null);
                    setActiveIncomeChartCategory(null);
                  }}
                  aria-label={
                    isExpensePie ? t.dashboard.switchToIncome : t.dashboard.switchToExpense
                  }
                  title={isExpensePie ? t.dashboard.switchToIncome : t.dashboard.switchToExpense}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200/80 bg-white/75 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] active:scale-95 dark:border-slate-700/80 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                >
                  {isExpensePie ? (
                    <TrendingDown className="h-4 w-4 text-[#D94848] dark:text-rose-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
                  )}
                </button>
              </div>

              {/* Active Pie Chart + Dual-Click Legend */}
              <div className="p-4 sm:p-5">
                {activeItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div
                      className={`mb-2.5 flex h-11 w-11 items-center justify-center rounded-full ${
                        isExpensePie
                          ? 'bg-rose-100/75 text-rose-400 dark:bg-rose-950/50 dark:text-rose-400/70'
                          : 'bg-emerald-100/75 text-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-400/70'
                      }`}
                    >
                      <PieChart className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isExpensePie
                        ? t.dashboard.noExpensesRecorded
                        : t.dashboard.noIncomeRecorded}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                    <CategoryPieChart
                      items={activeItems}
                      total={activeTotal}
                      palette={isExpensePie ? EXPENSE_CHART_COLORS : INCOME_CHART_COLORS}
                      colorMap={Object.fromEntries(
                        activeItems.map(([cat]) => [
                          cat,
                          getCategoryStyle(categoryStyles, styleKind, cat).color,
                        ])
                      )}
                      currency={currency}
                      totalLabel={
                        isExpensePie
                          ? t.dashboard.totalExpenseLabel
                          : t.dashboard.totalIncomeLabel
                      }
                      activeCategory={activeChartCategory}
                      onSelectCategory={(cat) => {
                        if (!isLongPressRef.current) setActiveChartCategory(cat);
                      }}
                      didSwipeRef={didPieSwipeRef}
                      onEnteredView={() => setPieRevealed(true)}
                    />

                    <div className="w-full min-w-0 flex-1 space-y-1.5">
                      {(pieLegendExpanded ? activeItems : activeItems.slice(0, 6)).map(
                        ([cat, amount], idx) => {
                          const catStyle = getCategoryStyle(categoryStyles, styleKind, cat);
                          const pctNum = activeTotal > 0 ? (amount / activeTotal) * 100 : 0;
                          const pct = pctNum.toFixed(1);
                          const isHighlighted = activeChartCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onMouseEnter={() => setActiveChartCategory(cat)}
                              onMouseLeave={() => setActiveChartCategory(null)}
                              onClick={() => {
                                if (didPieSwipeRef.current || isLongPressRef.current) return;
                                openCategoryDrilldown(pieView, cat);
                              }}
                              className={`group flex min-h-[44px] w-full cursor-pointer flex-col justify-center gap-1 rounded-xl px-2.5 py-1.5 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] ${
                                isHighlighted
                                  ? 'bg-white/95 shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-800/95 dark:ring-slate-700'
                                  : 'hover:bg-white/65 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-2">
                                  <CategoryIconBadge style={catStyle} size="xs" />
                                  <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                    {cat}
                                  </span>
                                </span>
                                <span className="font-mono-num shrink-0 font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                                  {formatMoney(amount, currency)}{' '}
                                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400">
                                    ({pct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/80">
                                <div
                                  key={`${pieView}-${pieMonthOffset}-${pieYearOffset}-${pieCustomOffset}-${cat}-${pieRevealed ? '1' : '0'}`}
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pieRevealed ? 'animate-share-bar' : 'origin-left scale-x-0'
                                  }`}
                                  style={{
                                    width: `${Math.max(3, Math.min(100, pctNum))}%`,
                                    backgroundColor: catStyle.color,
                                    animationDelay: pieRevealed
                                      ? `${Math.min(idx, 5) * 55}ms`
                                      : undefined,
                                  }}
                                />
                              </div>
                            </button>
                          );
                        }
                      )}

                      {activeItems.length > 6 && (
                        <button
                          type="button"
                          onTouchStart={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPieLegendExpanded((prev) => !prev);
                          }}
                          className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-lg py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                        >
                          {pieLegendExpanded
                            ? t.dashboard.showLessCategories
                            : t.dashboard.showMoreCategories.replace(
                                '{count}',
                                String(activeItems.length - 6)
                              )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {canSwipePie && (
                  <p className="mt-3 border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
                    {t.dashboard.swipePrevNextPeriod}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'transactions':
        return (
          <div
            key="transactions"
            id="recent-transactions-section"
            onTouchStart={(e) => handleTxSwipeStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleTxSwipeMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleTxSwipeEnd}
            onTouchCancel={handleTxSwipeEnd}
            onMouseDown={(e) => {
              if (e.button === 0) handleTxSwipeStart(e.clientX, e.clientY);
            }}
            onMouseMove={(e) => {
              if (e.buttons === 1) handleTxSwipeMove(e.clientX, e.clientY);
            }}
            onMouseUp={handleTxSwipeEnd}
            onMouseLeave={handleTxSwipeEnd}
            className="scroll-mt-20 space-y-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-1.5">
                <h3 className="shrink-0 whitespace-nowrap text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.dashboard.recentTransactions} ({filteredTransactions.length})
                </h3>
                <span aria-hidden="true" className="shrink-0 text-xs text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (didTxSwipeRef.current) return;
                    onOpenFilterCard('transactions');
                  }}
                  aria-label={t.modals.selectTimePeriod}
                  title={t.modals.selectTimePeriod}
                  className="inline-flex min-h-[30px] min-w-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <span className="truncate">{txPeriodData.filterButtonLabel}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <div
                className="relative w-full sm:w-64"
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder={t.dashboard.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="overflow-hidden">
              <div
                style={{
                  transform: `translateX(${txSwipeX}px)`,
                }}
                className={!isSwipingTx ? 'transition-transform duration-200 ease-out' : ''}
              >
                {filteredTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center select-none dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {transactions.length === 0
                        ? t.dashboard.noTransactionsYet
                        : searchQuery.trim()
                        ? t.dashboard.noTransactionsMatch
                        : `${t.dashboard.noTxInPeriod} ${txPeriodData.periodTitle}`}
                    </p>
                    {transactions.length === 0 && (
                      <button
                        type="button"
                        onClick={onStartAddingTx}
                        className="mt-3 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                      >
                        {t.dashboard.addFirstTransaction}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTransactions.map((tx) => (
                      <SwipeableTransaction
                        key={tx.id}
                        tx={tx}
                        currency={currency}
                        categoryStyles={categoryStyles}
                        isOpen={openTxId === tx.id}
                        onToggleOpen={setOpenTxId}
                        onDelete={onDeleteTx}
                        onEdit={onEditTx}
                        onResolveDebt={onResolveDebt}
                        onInspectDebt={onInspectDebt}
                        isSwipeBlocked={() => didTxSwipeRef.current}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {canSwipeTx && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t.dashboard.swipePrevNextPeriod}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t.common.previousMonth}
                    onClick={() => stepTxPeriod(-1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.common.nextMonth}
                    onClick={() => stepTxPeriod(1)}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5">
      {gridOrder.map((key, idx) => {
        const content = renderSection(key);
        if (!content) return null;
        if (key === 'netWorth' || key === 'budgetGoals' || key === 'categoryPieChart') {
          return <React.Fragment key={key}>{content}</React.Fragment>;
        }
        return (
          <ScrollRevealSection key={key} index={idx}>
            {content}
          </ScrollRevealSection>
        );
      })}
    </div>
  );
};
