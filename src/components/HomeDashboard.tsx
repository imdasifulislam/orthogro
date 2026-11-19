import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PieChart,
  PiggyBank,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
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
}> = ({ value, currency, durationMs = 740 }) => {
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
  onOpenBudgetGoalsModal: (goal?: BudgetGoal) => void;
  onOpenSavingGoalsModal: (goal?: SavingGoal) => void;
  onDeleteTx: (id: string) => void;
  onEditTx: (tx: Transaction) => void;
  onResolveDebt: (tx: Transaction) => void;
  onInspectDebt: (tx: Transaction) => void;
  onStartAddingTx: () => void;
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
  onDeleteTx,
  onEditTx,
  onResolveDebt,
  onInspectDebt,
  onStartAddingTx,
}) => {
  const { lang, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openTxId, setOpenTxId] = useState<string | null>(null);
  const [goalView, setGoalView] = useState<'budget' | 'saving'>(() =>
    budgetGoals.length === 0 && savingGoals.length > 0 ? 'saving' : 'budget'
  );
  const hasUserSelectedGoalViewRef = useRef(false);
  const selectGoalView = (view: 'budget' | 'saving') => {
    hasUserSelectedGoalViewRef.current = true;
    setGoalView(view);
  };
  useEffect(() => {
    if (hasUserSelectedGoalViewRef.current) return;
    setGoalView(budgetGoals.length === 0 && savingGoals.length > 0 ? 'saving' : 'budget');
  }, [budgetGoals.length, savingGoals.length]);
  const [goalSwipeX, setGoalSwipeX] = useState(0);
  const [isSwipingGoal, setIsSwipingGoal] = useState(false);
  const [categoryView, setCategoryView] = useState<'expense' | 'income'>('expense');
  const [categoryListExpanded, setCategoryListExpanded] = useState(false);
  const [categoryMonthOffset, setCategoryMonthOffset] = useState(0);
  const [categoryYearOffset, setCategoryYearOffset] = useState(0);
  const [categoryCustomOffset, setCategoryCustomOffset] = useState(0);
  const [categorySwipeX, setCategorySwipeX] = useState(0);
  const [isSwipingCategory, setIsSwipingCategory] = useState(false);
  const [pieView, setPieView] = useState<'expense' | 'income'>('expense');
  const [pieLegendExpanded, setPieLegendExpanded] = useState(false);
  const [pieRevealed, setPieRevealed] = useState(false);
  const [pieMonthOffset, setPieMonthOffset] = useState(0);
  const [pieYearOffset, setPieYearOffset] = useState(0);
  const [pieCustomOffset, setPieCustomOffset] = useState(0);
  const [pieSwipeX, setPieSwipeX] = useState(0);
  const [isSwipingPie, setIsSwipingPie] = useState(false);
  const [txMonthOffset, setTxMonthOffset] = useState(0);
  const [txSwipeX, setTxSwipeX] = useState(0);
  const [isSwipingTx, setIsSwipingTx] = useState(false);
  const [incExpMonthOffset, setIncExpMonthOffset] = useState(0);
  const [incExpYearOffset, setIncExpYearOffset] = useState(0);
  const [incExpCustomOffset, setIncExpCustomOffset] = useState(0);
  const [incExpSwipeX, setIncExpSwipeX] = useState(0);
  const [isSwipingIncExp, setIsSwipingIncExp] = useState(false);
  const [activeExpenseChartCategory, setActiveExpenseChartCategory] = useState<string | null>(null);
  const [activeIncomeChartCategory, setActiveIncomeChartCategory] = useState<string | null>(null);
  const goalSwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const didGoalSwipeRef = useRef(false);
  const categorySwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
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
  const didCategorySwipeRef = useRef(false);
  const didIncExpSwipeRef = useRef(false);
  const didTxSwipeRef = useRef(false);
  const pressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

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
      if (categorySwipeRef.current.dragging) {
        categorySwipeRef.current.dragging = false;
        categorySwipeRef.current.axis = null;
        setIsSwipingCategory(false);
        setCategorySwipeX(0);
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
    setCategoryCustomOffset(0);
    setPieCustomOffset(0);
    setIncExpCustomOffset(0);
  }, [customDateFrom, customDateTo]);

  useEffect(() => {
    setIncExpMonthOffset(0);
    setIncExpYearOffset(0);
    setIncExpCustomOffset(0);
  }, [filters.incExp]);

  useEffect(() => {
    setCategoryMonthOffset(0);
    setCategoryYearOffset(0);
    setCategoryCustomOffset(0);
    setCategoryListExpanded(false);
  }, [filters.categoryReport]);

  useEffect(() => {
    setCategoryListExpanded(false);
  }, [categoryView]);

  useEffect(() => {
    setPieMonthOffset(0);
    setPieYearOffset(0);
    setPieCustomOffset(0);
    setPieLegendExpanded(false);
  }, [filters.categoryPieChart]);

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

  const handleTxSwipeStart = (clientX: number, clientY: number) => {
    didTxSwipeRef.current = false;
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
        setTxMonthOffset((prev) => prev - 1);
      } else if (txSwipeX < -36) {
        setTxMonthOffset((prev) => prev + 1);
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

  const canSwipeCategory =
    filters.categoryReport === 'monthly' ||
    filters.categoryReport === 'yearly' ||
    (filters.categoryReport === 'custom' && Boolean(customDateFrom && customDateTo));

  const handleCategorySwipeStart = (clientX: number, clientY: number) => {
    didCategorySwipeRef.current = false;
    if (!canSwipeCategory) return;
    categorySwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingCategory(true);
  };

  const handleCategorySwipeMove = (clientX: number, clientY: number) => {
    const state = categorySwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 10) {
      didCategorySwipeRef.current = true;
      handlePressEnd();
    }
    setCategorySwipeX(Math.max(-96, Math.min(96, dx * 0.45)));
  };

  const handleCategorySwipeEnd = () => {
    const state = categorySwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingCategory(false);

    if (state.axis === 'x') {
      const step = categorySwipeX > 36 ? -1 : categorySwipeX < -36 ? 1 : 0;
      if (step !== 0) {
        if (filters.categoryReport === 'monthly') {
          setCategoryMonthOffset((prev) => prev + step);
        } else if (filters.categoryReport === 'yearly') {
          setCategoryYearOffset((prev) => prev + step);
        } else if (filters.categoryReport === 'custom') {
          setCategoryCustomOffset((prev) => prev + step);
        }
      }
    }
    state.axis = null;
    setCategorySwipeX(0);
    if (didCategorySwipeRef.current) {
      window.setTimeout(() => {
        didCategorySwipeRef.current = false;
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

  const handleGoalSwipeStart = (clientX: number, clientY: number) => {
    didGoalSwipeRef.current = false;
    goalSwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingGoal(true);
  };

  const handleGoalSwipeMove = (clientX: number, clientY: number) => {
    const state = goalSwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 10) {
      didGoalSwipeRef.current = true;
    }

    if (goalView === 'budget') {
      setGoalSwipeX(dx > 0 ? Math.min(24, dx * 0.25) : Math.max(-160, dx));
    } else {
      setGoalSwipeX(dx < 0 ? Math.max(-24, dx * 0.25) : Math.min(160, dx));
    }
  };

  const handleGoalSwipeEnd = () => {
    const state = goalSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingGoal(false);

    if (state.axis === 'x') {
      if (goalView === 'budget' && goalSwipeX < -42) {
        selectGoalView('saving');
      } else if (goalView === 'saving' && goalSwipeX > 42) {
        selectGoalView('budget');
      }
    }
    state.axis = null;
    setGoalSwipeX(0);
    if (didGoalSwipeRef.current) {
      window.setTimeout(() => {
        didGoalSwipeRef.current = false;
      }, 120);
    }
  };

  const metrics = useMemo(() => {
    let totalLendAll = 0;
    let totalBorrowAll = 0;
    transactions.forEach((t) => {
      const due = t.remainingBalance !== undefined ? t.remainingBalance : t.amount;
      if (t.type === 'lend' && !t.resolved) totalLendAll += due;
      if (t.type === 'borrow' && !t.resolved) totalBorrowAll += due;
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

    return {
      absoluteNetWorth,
      availableCashBalance,
      dispLend: totalLendAll,
      dispBorrow: totalBorrowAll,
    };
  }, [transactions, wallets, savingsList, walletBalances]);

  const incExpSummary = useMemo(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    let filteredTxs: Transaction[] = [];
    let periodTitle = '';
    let headerBadge = '';

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

  const categoryReportData = useMemo(
    () =>
      computeCategoryReport(
        transactions,
        filters.categoryReport,
        categoryMonthOffset,
        categoryYearOffset,
        categoryCustomOffset,
        customDateFrom,
        customDateTo,
        lang
      ),
    [
      transactions,
      filters.categoryReport,
      categoryMonthOffset,
      categoryYearOffset,
      categoryCustomOffset,
      customDateFrom,
      customDateTo,
      lang,
    ]
  );

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

  const openCategoryDrilldown = (
    source: 'report' | 'pie',
    kind: 'expense' | 'income',
    categoryName: string
  ) => {
    const filterMode = source === 'report' ? filters.categoryReport : filters.categoryPieChart;
    const periodTitle =
      source === 'report' ? categoryReportData.periodTitle : pieReportData.periodTitle;
    const monthOffset = source === 'report' ? categoryMonthOffset : pieMonthOffset;
    const yearOffset = source === 'report' ? categoryYearOffset : pieYearOffset;
    const customOffset = source === 'report' ? categoryCustomOffset : pieCustomOffset;

    const periodContext: DrilldownPeriodContext = {
      periodLabel: periodTitle,
      ...(filterMode === 'monthly' ? { monthOffset } : {}),
      ...(filterMode === 'yearly' ? { yearOffset } : {}),
      ...(filterMode === 'custom' ? { customOffset } : {}),
    };

    onOpenDrilldown(
      kind === 'expense' ? 'expense_category' : 'income_category',
      categoryName,
      filterMode,
      periodContext
    );
  };

  const txMonthData = useMemo(() => {
    const now = new Date();
    const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
    const targetDate = new Date(now.getFullYear(), now.getMonth() + txMonthOffset, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const items = transactions.filter((tx) => {
      if (!tx.rawDate) return false;
      const d = parseLocalDate(tx.rawDate);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
    const monthTitle = targetDate.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });

    return { items, monthTitle };
  }, [transactions, txMonthOffset, lang]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return txMonthData.items;
    return txMonthData.items.filter(
      (tx) =>
        tx.title.toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.subCategory || '').toLowerCase().includes(q) ||
        (tx.wallet || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
    );
  }, [txMonthData.items, searchQuery]);

  const renderSection = (key: GridKey) => {
    if (!visibleGrids[key]) return null;

    switch (key) {
      case 'netWorth':
        return (
          <div
            key="netWorth"
            onClick={() => onOpenDrilldown('netWorth', null, 'all')}
            className="cursor-pointer rounded-3xl bg-[#102A43] p-6 text-white shadow-sm transition-transform active:scale-[0.99] dark:border dark:border-slate-700/60 dark:bg-[#0D2238]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-300">
                {t.dashboard.netWorth}
              </div>
              <div className="text-xs font-medium text-slate-400">
                {formatDisplayDate(getTodayISO(), lang)}
              </div>
            </div>
            <div className="font-mono-num mt-2 text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
              <AnimatedMoneyValue
                value={metrics.absoluteNetWorth}
                currency={currency}
                durationMs={760}
              />
            </div>
            <div className="mt-2 text-xs font-medium text-slate-300">
              {t.dashboard.availableCash}:{' '}
              <span className="font-mono-num font-bold tabular-nums text-white">
                {formatMoney(metrics.availableCashBalance, currency)}
              </span>
            </div>
          </div>
        );

      case 'wallets':
        return (
          <SwipeableAccountStrip
            key="wallets"
            title={t.dashboard.wallets}
            icon={<Wallet className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />}
          >
            {(wasDragging) =>
              wallets.map((w) => {
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
              })
            }
          </SwipeableAccountStrip>
        );

      case 'savings':
        return (
          <SwipeableAccountStrip
            key="savings"
            title={t.dashboard.savingsInvestments}
            icon={<PiggyBank className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />}
          >
            {(wasDragging) =>
              savingsList.map((s) => {
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
              })
            }
          </SwipeableAccountStrip>
        );

      case 'incExp': {
        const incExpPeriodContext: DrilldownPeriodContext = {
          periodLabel: incExpSummary.periodTitle,
          ...(filters.incExp === 'monthly' ? { monthOffset: incExpMonthOffset } : {}),
          ...(filters.incExp === 'yearly' ? { yearOffset: incExpYearOffset } : {}),
          ...(filters.incExp === 'custom' ? { customOffset: incExpCustomOffset } : {}),
        };
        const isDeficit = incExpSummary.netSavings < 0;
        const isPositive = incExpSummary.netSavings > 0;

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
            className="select-none overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              style={{
                transform: `translateX(${incExpSwipeX}px)`,
              }}
              className={!isSwipingIncExp ? 'transition-transform duration-200 ease-out' : ''}
            >
              {/* Slim Single Period Filter Bar */}
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
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16845B] sm:px-5 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
              >
                <span className="truncate">{incExpSummary.filterButtonLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              </button>

              {/* Income & Expense Interactive Split */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (!isLongPressRef.current && !didIncExpSwipeRef.current) {
                      onOpenDrilldown('income', null, filters.incExp, incExpPeriodContext);
                    }
                  }}
                  className="flex min-h-[72px] cursor-pointer flex-col justify-between px-4 py-3 text-left transition-colors hover:bg-emerald-50/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16845B] sm:px-5 dark:hover:bg-emerald-950/20"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#16845B] dark:text-emerald-400" />
                    <span className="truncate">{t.common.income}</span>
                  </span>
                  <span className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-[#16845B] sm:text-lg dark:text-emerald-400">
                    {formatMoney(incExpSummary.totalIncome, currency)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLongPressRef.current && !didIncExpSwipeRef.current) {
                      onOpenDrilldown('expense', null, filters.incExp, incExpPeriodContext);
                    }
                  }}
                  className="flex min-h-[72px] cursor-pointer flex-col justify-between px-4 py-3 text-left transition-colors hover:bg-rose-50/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16845B] sm:px-5 dark:hover:bg-rose-950/20"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <TrendingDown className="h-3.5 w-3.5 shrink-0 text-[#D94848] dark:text-rose-400" />
                    <span className="truncate">{t.common.expense}</span>
                  </span>
                  <span className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-[#D94848] sm:text-lg dark:text-rose-400">
                    {formatMoney(incExpSummary.totalExpense, currency)}
                  </span>
                </button>
              </div>

              {/* Net Savings / Overspent Footer */}
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-xs font-bold ${
                      isDeficit
                        ? 'text-[#D94848] dark:text-rose-400'
                        : 'text-[#102A43] dark:text-slate-200'
                    }`}
                  >
                    {isDeficit ? t.dashboard.overspentLabel : t.dashboard.netSavings}
                  </span>
                  <span
                    className={`font-mono-num shrink-0 text-sm font-extrabold sm:text-base ${
                      isDeficit
                        ? 'text-[#D94848] dark:text-rose-400'
                        : isPositive
                        ? 'text-[#16845B] dark:text-emerald-400'
                        : 'text-[#102A43] dark:text-slate-200'
                    }`}
                  >
                    {isDeficit ? '−' : isPositive ? '+' : ''}
                    {formatMoney(Math.abs(incExpSummary.netSavings), currency)}
                  </span>
                </div>

                <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  {incExpSummary.totalIncome > 0 ? (
                    <>
                      <div
                        className="h-full bg-[#D94848]/85 transition-all duration-300"
                        style={{ width: `${incExpSummary.expenseRatioPct}%` }}
                      />
                      {incExpSummary.netSavings > 0 && (
                        <div
                          className="h-full bg-[#16845B] transition-all duration-300"
                          style={{ width: `${Math.max(0, 100 - incExpSummary.expenseRatioPct)}%` }}
                        />
                      )}
                    </>
                  ) : incExpSummary.totalExpense > 0 ? (
                    <div className="h-full w-full bg-[#D94848]/85 transition-all duration-300" />
                  ) : null}
                </div>

                {canSwipeIncExp && (
                  <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                    {t.dashboard.swipePrevNextPeriod}
                  </p>
                )}
              </div>
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
        const isBudgetView = goalView === 'budget';
        const budgetOverTotal = budgetSummary.totalPct > 100;
        const headerPct = isBudgetView
          ? budgetSummary.sortedGoals.length > 0
            ? `${Math.round(budgetSummary.totalPct)}%`
            : null
          : savingSummary.items.length > 0
          ? `${Math.round(savingSummary.totalPct)}%`
          : null;

        return (
          <div
            key="budgetGoals"
            onClick={() => {
              if (didGoalSwipeRef.current) return;
              if (isBudgetView) {
                onOpenBudgetGoalsModal();
              } else {
                onOpenSavingGoalsModal();
              }
            }}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            {/* Minimal Card Header */}
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold leading-snug text-[#102A43] dark:text-slate-100">
                {isBudgetView ? (
                  <Target className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                ) : (
                  <PiggyBank className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                )}
                <span className="truncate">
                  {isBudgetView
                    ? t.dashboard.monthlyBudgetGoals
                    : t.dashboard.savingGoalsTitle}
                </span>
              </h3>

              {headerPct && (
                <span
                  className={`font-mono-num shrink-0 text-xs font-bold tabular-nums ${
                    isBudgetView
                      ? budgetOverTotal
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#16845B] dark:text-emerald-400'
                      : 'text-sky-600 dark:text-sky-400'
                  }`}
                >
                  {headerPct}
                </span>
              )}
            </div>

            {/* Swipeable Single-Pane Carousel (Monthly Budget <-> Saving Goals) */}
            <div
              onTouchStart={(e) =>
                handleGoalSwipeStart(e.touches[0].clientX, e.touches[0].clientY)
              }
              onTouchMove={(e) =>
                handleGoalSwipeMove(e.touches[0].clientX, e.touches[0].clientY)
              }
              onTouchEnd={handleGoalSwipeEnd}
              onMouseDown={(e) => handleGoalSwipeStart(e.clientX, e.clientY)}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleGoalSwipeMove(e.clientX, e.clientY);
              }}
              onMouseUp={handleGoalSwipeEnd}
              onMouseLeave={handleGoalSwipeEnd}
              className="mt-3 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            >
              <div
                style={{
                  transform: `translateX(calc(${
                    isBudgetView ? '0%' : '-50%'
                  } + ${goalSwipeX}px))`,
                }}
                className={`flex w-[200%] items-start ${
                  !isSwipingGoal ? 'transition-transform duration-300 ease-out' : ''
                }`}
              >
                {/* Slide 1: Monthly Budget */}
                <div className="w-1/2 shrink-0 pr-1">
                  {budgetSummary.sortedGoals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.dashboard.emptyBudgetDesc}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!didGoalSwipeRef.current) onOpenBudgetGoalsModal();
                        }}
                        className="mt-3 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                      >
                        {t.dashboard.setFirstBudget}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Clean Unboxed Overall Budget Progress */}
                      <div className="border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
                        <div className="font-mono-num mb-2 flex items-baseline justify-between gap-2 tabular-nums">
                          <span className="text-base font-extrabold text-[#102A43] dark:text-slate-100">
                            {formatMoney(budgetSummary.totalSpent, currency)}
                          </span>
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            / {formatMoney(budgetSummary.totalLimit, currency)}
                          </span>
                        </div>
                        <div
                          className={`h-1.5 overflow-hidden rounded-full ${
                            budgetOverTotal
                              ? 'bg-rose-500/15 dark:bg-rose-400/20'
                              : 'bg-emerald-500/12 dark:bg-emerald-400/15'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              budgetOverTotal
                                ? 'bg-rose-500 dark:bg-rose-400'
                                : 'bg-[#16845B] dark:bg-emerald-400'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, budgetSummary.totalPct))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Minimal Per-Category Rows */}
                      <div className="mt-2.5 space-y-2">
                        {budgetSummary.sortedGoals.map(({ goal, spent, pct }) => {
                          const roundedPct = Math.round(pct);
                          const isOver = pct > 100;
                          const exceeded = Math.max(0, spent - goal.monthlyLimit);

                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!didGoalSwipeRef.current) onOpenBudgetGoalsModal(goal);
                              }}
                              className="block w-full cursor-pointer rounded-xl px-2 py-1.5 -mx-2 text-left transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <CategoryIconBadge
                                    style={getCategoryStyle(categoryStyles, 'exp', goal.category)}
                                    size="xs"
                                  />
                                  <span className="truncate text-[13px] font-semibold text-[#102A43] dark:text-slate-100">
                                    {goal.category}
                                  </span>
                                </div>
                                <span className="font-mono-num shrink-0 text-xs tabular-nums">
                                  <span className="font-bold text-[#102A43] dark:text-slate-100">
                                    {formatMoney(spent, currency)}
                                  </span>
                                  <span className="font-normal text-slate-400 dark:text-slate-500">
                                    {' / '}
                                    {formatMoney(goal.monthlyLimit, currency)}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                                    isOver
                                      ? 'bg-rose-500/15 dark:bg-rose-400/20'
                                      : 'bg-emerald-500/12 dark:bg-emerald-400/15'
                                  }`}
                                >
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isOver
                                        ? 'bg-rose-500 dark:bg-rose-400'
                                        : 'bg-[#16845B] dark:bg-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                  />
                                </div>
                                <span
                                  className={`font-mono-num w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
                                    isOver
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-[#16845B] dark:text-emerald-400'
                                  }`}
                                >
                                  {roundedPct}%
                                </span>
                              </div>

                              {isOver && (
                                <div className="font-mono-num mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                  +{formatMoney(exceeded, currency)} {t.dashboard.overBudget}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide 2: Saving Goals */}
                <div className="w-1/2 shrink-0 pl-1">
                  {savingSummary.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.dashboard.emptySavingDesc}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!didGoalSwipeRef.current) onOpenSavingGoalsModal();
                        }}
                        className="mt-3 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
                      >
                        {t.dashboard.setFirstSaving}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Clean Unboxed Overall Saving Progress */}
                      <div className="border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
                        <div className="font-mono-num mb-2 flex items-baseline justify-between gap-2 tabular-nums">
                          <span className="text-base font-extrabold text-[#102A43] dark:text-slate-100">
                            {formatMoney(savingSummary.totalSaved, currency)}
                          </span>
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            / {formatMoney(savingSummary.totalTarget, currency)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-sky-500/12 dark:bg-sky-400/15">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-all duration-300 dark:bg-sky-400"
                            style={{
                              width: `${Math.min(100, Math.max(0, savingSummary.totalPct))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Minimal Per-Saving-Goal Rows */}
                      <div className="mt-2.5 space-y-2">
                        {savingSummary.items.map(({ goal, progress }) => {
                          const roundedPct = Math.max(0, Math.round(progress.pct));
                          const reached = progress.pct >= 100;
                          const showAccountSuffix = Boolean(
                            goal.account &&
                              goal.account.trim().toLowerCase() !== goal.title.trim().toLowerCase()
                          );
                          const daysText =
                            !reached &&
                            goal.periodType === 'period' &&
                            progress.daysLeft !== null &&
                            progress.daysLeft >= 0
                              ? progress.daysLeft === 0
                                ? t.dashboard.endsTodayLabel
                                : `${progress.daysLeft} ${
                                    progress.daysLeft === 1
                                      ? t.dashboard.dayLeftLabel
                                      : t.dashboard.daysLeftLabel
                                  }`
                              : '';

                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!didGoalSwipeRef.current) onOpenSavingGoalsModal(goal);
                              }}
                              className="block w-full cursor-pointer rounded-xl px-2 py-1.5 -mx-2 text-left transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <CategoryIconBadge
                                    style={getCategoryStyle(
                                      categoryStyles,
                                      'sav',
                                      goal.account || savingsList[0] || 'Savings'
                                    )}
                                    size="xs"
                                  />
                                  <span className="truncate text-[13px] font-semibold text-[#102A43] dark:text-slate-100">
                                    {goal.title}
                                    {showAccountSuffix && (
                                      <span className="font-normal text-slate-400 dark:text-slate-500">
                                        {' · '}
                                        {goal.account}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <span className="font-mono-num shrink-0 text-xs tabular-nums">
                                  <span className="font-bold text-[#102A43] dark:text-slate-100">
                                    {formatMoney(progress.savedAmount, currency)}
                                  </span>
                                  <span className="font-normal text-slate-400 dark:text-slate-500">
                                    {' / '}
                                    {formatMoney(goal.targetAmount, currency)}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-500/12 dark:bg-sky-400/15">
                                  <div
                                    className="h-full rounded-full bg-sky-500 transition-all duration-300 dark:bg-sky-400"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, progress.pct))}%`,
                                    }}
                                  />
                                </div>
                                <span className="font-mono-num w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                                  {roundedPct}%
                                </span>
                              </div>

                              {daysText && (
                                <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                  {daysText}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom slide indicator + subtle hint */}
            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800/80 dark:text-slate-500">
              <span>
                {isBudgetView
                  ? t.dashboard.swipeLeftSaving
                  : t.dashboard.swipeRightBudget}
              </span>
              <div
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5"
              >
                <button
                  type="button"
                  aria-label={t.dashboard.monthlyBudgetGoals}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectGoalView('budget');
                  }}
                  className="flex h-8 cursor-pointer items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      isBudgetView
                        ? 'w-5 bg-[#16845B] dark:bg-emerald-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={t.dashboard.savingGoalsTitle}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectGoalView('saving');
                  }}
                  className="flex h-8 cursor-pointer items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      !isBudgetView
                        ? 'w-5 bg-sky-500 dark:bg-sky-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'categoryReport': {
        const isExpenseView = categoryView === 'expense';
        const activeItems = isExpenseView
          ? categoryReportData.sortedExpenses
          : categoryReportData.sortedIncomes;
        const activeTotal = isExpenseView
          ? categoryReportData.totalExpense
          : categoryReportData.totalIncome;
        const styleKind = isExpenseView ? 'exp' : 'inc';

        return (
          <div
            key="categoryReport"
            onTouchStart={(e) => {
              handlePressStart('categoryReport', e.touches[0].clientX, e.touches[0].clientY);
              handleCategorySwipeStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              handlePressMove(e.touches[0].clientX, e.touches[0].clientY);
              handleCategorySwipeMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={() => {
              handlePressEnd();
              handleCategorySwipeEnd();
            }}
            onTouchCancel={() => {
              handlePressEnd();
              handleCategorySwipeEnd();
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                handlePressStart('categoryReport', e.clientX, e.clientY);
                handleCategorySwipeStart(e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              if (e.buttons === 1) {
                handlePressMove(e.clientX, e.clientY);
                handleCategorySwipeMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={() => {
              handlePressEnd();
              handleCategorySwipeEnd();
            }}
            onMouseLeave={() => {
              handlePressEnd();
              handleCategorySwipeEnd();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              handlePressEnd();
              onOpenFilterCard('categoryReport');
            }}
            className={`select-none overflow-hidden rounded-2xl border shadow-sm transition-colors duration-200 ${
              isExpenseView
                ? 'border-rose-200/75 bg-rose-50/45 dark:border-rose-900/40 dark:bg-rose-950/20'
                : 'border-emerald-200/75 bg-emerald-50/45 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            }`}
          >
            <div
              style={{
                transform: `translateX(${categorySwipeX}px)`,
              }}
              className={!isSwipingCategory ? 'transition-transform duration-200 ease-out' : ''}
            >
              {/* Header: Title + Period Filter & Top-Right Expense/Income Switch Icon */}
              <div
                className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 sm:px-5 ${
                  isExpenseView
                    ? 'border-rose-200/60 dark:border-rose-900/35'
                    : 'border-emerald-200/60 dark:border-emerald-900/35'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <h3 className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[#102A43] sm:text-sm dark:text-slate-100">
                    {isExpenseView ? t.dashboard.expenseByCategory : t.dashboard.incomeByCategory}
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
                      if (isLongPressRef.current || didCategorySwipeRef.current) return;
                      onOpenFilterCard('categoryReport');
                    }}
                    aria-label={t.modals.selectTimePeriod}
                    title={t.modals.selectTimePeriod}
                    className="inline-flex min-h-[30px] min-w-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                  >
                    <span className="truncate">{categoryReportData.filterButtonLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                  </button>
                </div>

                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isLongPressRef.current || didCategorySwipeRef.current) return;
                    setCategoryView((prev) => (prev === 'expense' ? 'income' : 'expense'));
                  }}
                  aria-label={
                    isExpenseView ? t.dashboard.switchToIncome : t.dashboard.switchToExpense
                  }
                  title={isExpenseView ? t.dashboard.switchToIncome : t.dashboard.switchToExpense}
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200/80 bg-white/75 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] active:scale-95 dark:border-slate-700/80 dark:bg-slate-800/70 dark:hover:bg-slate-800"
                >
                  {isExpenseView ? (
                    <TrendingDown className="h-4 w-4 text-[#D94848] dark:text-rose-400" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
                  )}
                </button>
              </div>

              {/* Active Breakdown Summary & Category Rows */}
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-slate-500 dark:text-slate-400">
                    {isExpenseView
                      ? t.dashboard.totalExpenseSuffix
                      : t.dashboard.totalIncomeSuffix}
                  </span>
                  <span className="font-mono-num shrink-0 font-extrabold text-[#102A43] dark:text-slate-100">
                    {formatMoney(activeTotal, currency)}
                  </span>
                </div>

                {activeItems.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    {isExpenseView
                      ? t.dashboard.noExpensesRecorded
                      : t.dashboard.noIncomeRecorded}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {(categoryListExpanded ? activeItems : activeItems.slice(0, 6)).map(
                      ([cat, amount]) => {
                        const pct =
                          activeTotal > 0 ? ((amount / activeTotal) * 100).toFixed(1) : '0';
                        const catStyle = getCategoryStyle(categoryStyles, styleKind, cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              if (isLongPressRef.current || didCategorySwipeRef.current) return;
                              openCategoryDrilldown('report', categoryView, cat);
                            }}
                            className="group w-full min-h-[44px] cursor-pointer rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] active:scale-[0.995] dark:hover:bg-slate-800/60"
                          >
                            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span className="flex min-w-0 items-center gap-1.5 pr-2">
                                <CategoryIconBadge style={catStyle} size="xs" />
                                <span className="truncate group-hover:text-[#102A43] dark:group-hover:text-slate-100">
                                  {cat}
                                </span>
                              </span>
                              <span className="font-mono-num shrink-0">
                                {formatMoney(amount, currency)} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, backgroundColor: catStyle.color }}
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
                          setCategoryListExpanded((prev) => !prev);
                        }}
                        className="mt-1 flex w-full cursor-pointer items-center justify-center rounded-xl py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-white/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
                      >
                        {categoryListExpanded
                          ? t.dashboard.showLessCategories
                          : t.dashboard.showMoreCategories.replace(
                              '{count}',
                              String(activeItems.length - 6)
                            )}
                      </button>
                    )}
                  </div>
                )}

                {canSwipeCategory && (
                  <p className="mt-3 border-t border-slate-200/60 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800/70 dark:text-slate-500">
                    {t.dashboard.swipePrevNextPeriod}
                  </p>
                )}
              </div>
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

        return (
          <div
            key="categoryPieChart"
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
            className={`select-none overflow-hidden rounded-2xl border shadow-sm transition-colors duration-200 ${
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
                                openCategoryDrilldown('pie', pieView, cat);
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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.dashboard.recentTransactions} ({filteredTransactions.length})
                </h3>
                <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {txMonthData.monthTitle}
                </div>
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
                        : `${t.dashboard.noTxInPeriod} ${txMonthData.monthTitle}`}
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

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{t.dashboard.swipePrevNextMonth}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={t.common.previousMonth}
                  onClick={() => {
                    setOpenTxId(null);
                    setTxMonthOffset((prev) => prev - 1);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t.common.nextMonth}
                  onClick={() => {
                    setOpenTxId(null);
                    setTxMonthOffset((prev) => prev + 1);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5">
      {gridOrder.map((key, idx) => {
        const content = renderSection(key);
        if (!content) return null;
        return (
          <ScrollRevealSection key={key} index={idx}>
            {content}
          </ScrollRevealSection>
        );
      })}
    </div>
  );
};
