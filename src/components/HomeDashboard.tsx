import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
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
  formatMoney,
  getFilterName,
  getPeriodLabel,
  parseLocalDate,
} from '../utils/format';
import { CategoryPieChart } from './CategoryPieChart';
import { SlidableMonthBar } from './SlidableMonthBar';
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

function computeMonthlyCategoryReport(
  transactions: Transaction[],
  monthOffset: number,
  lang: AppLanguage
) {
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  const expenseByCategory: Record<string, number> = {};
  const incomeByCategory: Record<string, number> = {};
  let totalExpense = 0;
  let totalIncome = 0;

  transactions.forEach((t) => {
    if (!t.rawDate) return;
    const d = parseLocalDate(t.rawDate);
    if (d.getMonth() !== targetMonth || d.getFullYear() !== targetYear) return;

    if (t.type === 'expense') {
      const cat = t.category || 'Others';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
      totalExpense += t.amount;
    } else if (t.type === 'income') {
      const cat = t.category || 'Others';
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
      totalIncome += t.amount;
    }
  });

  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  const sortedIncomes = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
  const monthTitle = targetDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return {
    monthTitle,
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
  onOpenDrilldown: (type: DrilldownType, key: string | null, defaultFilter: PeriodFilter) => void;
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
  const [goalView, setGoalView] = useState<'budget' | 'saving'>('budget');
  const [goalSwipeX, setGoalSwipeX] = useState(0);
  const [isSwipingGoal, setIsSwipingGoal] = useState(false);
  const [categoryView, setCategoryView] = useState<'expense' | 'income'>('expense');
  const [categoryMonthOffset, setCategoryMonthOffset] = useState(0);
  const [categorySwipeX, setCategorySwipeX] = useState(0);
  const [isSwipingCategory, setIsSwipingCategory] = useState(false);
  const [pieView, setPieView] = useState<'expense' | 'income'>('expense');
  const [pieMonthOffset, setPieMonthOffset] = useState(0);
  const [pieSwipeX, setPieSwipeX] = useState(0);
  const [isSwipingPie, setIsSwipingPie] = useState(false);
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
  const didPieSwipeRef = useRef(false);
  const pressTimerRef = useRef<number | null>(null);
  const isLongPressRef = useRef(false);

  const handlePressStart = (card: FilterCardKey) => {
    isLongPressRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      isLongPressRef.current = true;
      onOpenFilterCard(card);
    }, 480);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleCategorySwipeStart = (clientX: number, clientY: number) => {
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

    if (categoryView === 'expense') {
      // Swipe left reveals Income; gentle rubber-band if pulling right past left edge
      setCategorySwipeX(dx > 0 ? Math.min(24, dx * 0.25) : Math.max(-160, dx));
    } else {
      // Swipe right returns to Expense; gentle rubber-band if pulling left past right edge
      setCategorySwipeX(dx < 0 ? Math.max(-24, dx * 0.25) : Math.min(160, dx));
    }
  };

  const handleCategorySwipeEnd = () => {
    const state = categorySwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingCategory(false);

    if (state.axis === 'x') {
      if (categoryView === 'expense' && categorySwipeX < -42) {
        setCategoryView('income');
      } else if (categoryView === 'income' && categorySwipeX > 42) {
        setCategoryView('expense');
      }
    }
    state.axis = null;
    setCategorySwipeX(0);
  };

  const handlePieSwipeStart = (clientX: number, clientY: number) => {
    didPieSwipeRef.current = false;
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
    }

    if (pieView === 'expense') {
      setPieSwipeX(dx > 0 ? Math.min(24, dx * 0.25) : Math.max(-160, dx));
    } else {
      setPieSwipeX(dx < 0 ? Math.max(-24, dx * 0.25) : Math.min(160, dx));
    }
  };

  const handlePieSwipeEnd = () => {
    const state = pieSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingPie(false);

    if (state.axis === 'x') {
      if (pieView === 'expense' && pieSwipeX < -42) {
        setPieView('income');
        setActiveExpenseChartCategory(null);
      } else if (pieView === 'income' && pieSwipeX > 42) {
        setPieView('expense');
        setActiveIncomeChartCategory(null);
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
        setGoalView('saving');
      } else if (goalView === 'saving' && goalSwipeX > 42) {
        setGoalView('budget');
      }
    }
    state.axis = null;
    setGoalSwipeX(0);
    if (didGoalSwipeRef.current) {
      window.setTimeout(() => {
        didGoalSwipeRef.current = false;
      }, 0);
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

    const incExpTxs = filterTransactionsByPeriod(
      transactions,
      filters.incExp,
      customDateFrom,
      customDateTo
    );

    let totalIncome = 0;
    let totalExpense = 0;

    incExpTxs.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
      } else if (t.type === 'adjustment') {
        if (t.amount > 0) totalIncome += t.amount;
        else totalExpense += Math.abs(t.amount);
      }
    });

    const lbTxs = filterTransactionsByPeriod(
      transactions,
      filters.lendBorrow,
      customDateFrom,
      customDateTo
    );
    let dispLend = 0;
    let dispBorrow = 0;
    lbTxs.forEach((t) => {
      const due = t.remainingBalance !== undefined ? t.remainingBalance : t.amount;
      if (t.type === 'lend' && !t.resolved) dispLend += due;
      if (t.type === 'borrow' && !t.resolved) dispBorrow += due;
    });

    return {
      absoluteNetWorth,
      availableCashBalance,
      totalIncome,
      totalExpense,
      dispLend,
      dispBorrow,
    };
  }, [transactions, wallets, savingsList, walletBalances, filters, customDateFrom, customDateTo]);

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
    () => computeMonthlyCategoryReport(transactions, categoryMonthOffset, lang),
    [transactions, categoryMonthOffset, lang]
  );

  const pieReportData = useMemo(
    () => computeMonthlyCategoryReport(transactions, pieMonthOffset, lang),
    [transactions, pieMonthOffset, lang]
  );

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.title.toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.subCategory || '').toLowerCase().includes(q) ||
        (tx.wallet || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  const renderSection = (key: GridKey) => {
    if (!visibleGrids[key]) return null;

    switch (key) {
      case 'netWorth':
        return (
          <div
            key="netWorth"
            onClick={() => {
              if (!isLongPressRef.current) {
                onOpenDrilldown('netWorth', null, filters.netWorth);
              }
            }}
            onTouchStart={() => handlePressStart('netWorth')}
            onTouchEnd={handlePressEnd}
            onMouseDown={() => handlePressStart('netWorth')}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenFilterCard('netWorth');
            }}
            className="cursor-pointer rounded-3xl bg-[#102A43] p-6 text-white shadow-sm transition-transform active:scale-[0.99] dark:border dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>{t.dashboard.netWorth}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFilterCard('netWorth');
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-200 hover:bg-white/10"
              >
                <span>{getFilterName(filters.netWorth, lang)}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="font-mono-num mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {formatMoney(metrics.absoluteNetWorth, currency)}
            </div>
            <div className="mt-2 text-xs font-medium text-slate-300">
              {t.dashboard.availableCash}:{' '}
              <span className="font-mono-num font-bold text-white">
                {formatMoney(metrics.availableCashBalance, currency)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-300">
              <span>{getPeriodLabel(filters.netWorth, customDateFrom, customDateTo, lang)}</span>
              <span>{t.dashboard.tapInspectLedger}</span>
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

      case 'incExp':
        return (
          <div key="incExp" className="grid grid-cols-2 gap-3">
            <div
              onClick={() => {
                if (!isLongPressRef.current) {
                  onOpenDrilldown('expense', null, filters.incExp);
                }
              }}
              onTouchStart={() => handlePressStart('incExp')}
              onTouchEnd={handlePressEnd}
              onMouseDown={() => handlePressStart('incExp')}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenFilterCard('incExp');
              }}
              className="flex h-full min-h-[82px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <TrendingDown className="h-3.5 w-3.5 shrink-0 text-[#D94848]" />
                  <span className="truncate">{t.common.expense}</span>
                </span>
                <button
                  type="button"
                  aria-label={t.common.expense}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFilterCard('incExp');
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-[#D94848] sm:text-lg dark:text-rose-400">
                {formatMoney(metrics.totalExpense, currency)}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                {getFilterName(filters.incExp, lang)}
              </div>
            </div>

            <div
              onClick={() => {
                if (!isLongPressRef.current) {
                  onOpenDrilldown('income', null, filters.incExp);
                }
              }}
              onTouchStart={() => handlePressStart('incExp')}
              onTouchEnd={handlePressEnd}
              onMouseDown={() => handlePressStart('incExp')}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenFilterCard('incExp');
              }}
              className="flex h-full min-h-[82px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#16845B]" />
                  <span className="truncate">{t.common.income}</span>
                </span>
                <button
                  type="button"
                  aria-label={t.common.income}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFilterCard('incExp');
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-[#16845B] sm:text-lg dark:text-emerald-400">
                {formatMoney(metrics.totalIncome, currency)}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                {getFilterName(filters.incExp, lang)}
              </div>
            </div>
          </div>
        );

      case 'lendBorrow':
        return (
          <div key="lendBorrow" className="grid grid-cols-2 gap-3">
            <div
              onClick={() => {
                if (!isLongPressRef.current) {
                  onOpenDrilldown('lend', null, filters.lendBorrow);
                }
              }}
              onTouchStart={() => handlePressStart('lendBorrow')}
              onTouchEnd={handlePressEnd}
              onMouseDown={() => handlePressStart('lendBorrow')}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenFilterCard('lendBorrow');
              }}
              className="flex h-full min-h-[82px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-bold text-blue-700 dark:text-blue-400">
                  {t.dashboard.lentReceivable}
                </span>
                <button
                  type="button"
                  aria-label={t.dashboard.lentReceivable}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFilterCard('lendBorrow');
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-blue-700 sm:text-lg dark:text-blue-400">
                {formatMoney(metrics.dispLend, currency)}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                {getFilterName(filters.lendBorrow, lang)}
              </div>
            </div>

            <div
              onClick={() => {
                if (!isLongPressRef.current) {
                  onOpenDrilldown('borrow', null, filters.lendBorrow);
                }
              }}
              onTouchStart={() => handlePressStart('lendBorrow')}
              onTouchEnd={handlePressEnd}
              onMouseDown={() => handlePressStart('lendBorrow')}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenFilterCard('lendBorrow');
              }}
              className="flex h-full min-h-[82px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-bold text-purple-700 dark:text-purple-400">
                  {t.dashboard.borrowedPayable}
                </span>
                <button
                  type="button"
                  aria-label={t.dashboard.borrowedPayable}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFilterCard('lendBorrow');
                  }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold leading-tight text-purple-700 sm:text-lg dark:text-purple-400">
                {formatMoney(metrics.dispBorrow, currency)}
              </div>
              <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                {getFilterName(filters.lendBorrow, lang)}
              </div>
            </div>
          </div>
        );

      case 'budgetGoals':
        return (
          <div
            key="budgetGoals"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Card Header with active view title + Budget/Saving segmented switch */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-1.5 text-[13px] font-bold leading-snug text-[#102A43] sm:text-sm dark:text-slate-100">
                  {goalView === 'budget' ? (
                    <Target className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                  ) : (
                    <PiggyBank className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  )}
                  <span>
                    {goalView === 'budget'
                      ? t.dashboard.monthlyBudgetGoals
                      : t.dashboard.savingGoalsTitle}
                  </span>
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-slate-100 p-1 sm:gap-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setGoalView('budget')}
                  className={`min-h-[32px] rounded-lg px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:px-2.5 sm:text-xs ${
                    goalView === 'budget'
                      ? 'bg-white text-[#16845B] shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.dashboard.budgetTabShort}
                </button>
                <button
                  type="button"
                  onClick={() => setGoalView('saving')}
                  className={`min-h-[32px] rounded-lg px-2 py-1 text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 sm:px-2.5 sm:text-xs ${
                    goalView === 'saving'
                      ? 'bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.dashboard.savingTabShort}
                </button>
              </div>
            </div>

            {/* Swipeable Single-Pane Carousel (Budget Goals <-> Saving Goals) */}
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
              className="mt-3.5 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            >
              <div
                style={{
                  transform: `translateX(calc(${
                    goalView === 'budget' ? '0%' : '-50%'
                  } + ${goalSwipeX}px))`,
                }}
                className={`flex w-[200%] items-start ${
                  !isSwipingGoal ? 'transition-transform duration-300 ease-out' : ''
                }`}
              >
                {/* Slide 1: Monthly Budget Goals */}
                <div className="w-1/2 shrink-0 pr-1">
                  {budgetSummary.sortedGoals.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.dashboard.emptyBudgetDesc}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!didGoalSwipeRef.current) onOpenBudgetGoalsModal();
                        }}
                        className="mt-3 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                      >
                        {t.dashboard.setFirstBudget}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Overall Monthly Budget Progress + Manage Action */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#102A43] dark:text-slate-200">
                            {t.dashboard.totalBudgetedSpend}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!didGoalSwipeRef.current) onOpenBudgetGoalsModal();
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#102A43] transition-colors hover:border-[#16845B]/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            {t.dashboard.manageGoals}
                          </button>
                        </div>
                        <div className="font-mono-num mb-1.5 text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {formatMoney(budgetSummary.totalSpent, currency)} /{' '}
                          {formatMoney(budgetSummary.totalLimit, currency)} (
                          {Math.round(budgetSummary.totalPct)}%)
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              budgetSummary.totalPct > 100
                                ? 'bg-rose-600 dark:bg-rose-500'
                                : budgetSummary.totalPct >= 80
                                ? 'bg-amber-500 dark:bg-amber-400'
                                : 'bg-[#16845B] dark:bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, budgetSummary.totalPct))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Per-Category Budget Goals */}
                      <div className="space-y-3">
                        {budgetSummary.sortedGoals.map(({ goal, spent, pct }) => {
                          const roundedPct = Math.round(pct);
                          const remaining = goal.monthlyLimit - spent;
                          const isOver = pct > 100;
                          const isNear = !isOver && pct >= 80;

                          const statusLabel = isOver
                            ? t.dashboard.overBudget
                            : isNear
                            ? t.dashboard.nearLimit
                            : t.dashboard.onTrack;
                          const statusTextClass = isOver
                            ? 'text-rose-600 dark:text-rose-400'
                            : isNear
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#16845B] dark:text-emerald-400';
                          const barColorClass = isOver
                            ? 'bg-rose-600 dark:bg-rose-500'
                            : isNear
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : 'bg-[#16845B] dark:bg-emerald-500';

                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={() => {
                                if (!didGoalSwipeRef.current) onOpenBudgetGoalsModal(goal);
                              }}
                              className="block w-full rounded-xl p-2 -mx-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <CategoryIconBadge
                                    style={getCategoryStyle(categoryStyles, 'exp', goal.category)}
                                    size="xs"
                                  />
                                  <span className="truncate font-bold text-[#102A43] dark:text-slate-100">
                                    {goal.category}
                                  </span>
                                  <span className={`font-semibold ${statusTextClass}`}>
                                    · {statusLabel}
                                  </span>
                                </div>
                                <span className="font-mono-num shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                                  {formatMoney(spent, currency)} /{' '}
                                  {formatMoney(goal.monthlyLimit, currency)}{' '}
                                  <span className={`font-bold ${statusTextClass}`}>
                                    ({roundedPct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                              <div className="font-mono-num mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {remaining >= 0
                                  ? `${formatMoney(remaining, currency)} ${t.dashboard.remainingMonth}`
                                  : `${t.dashboard.exceededLimitBy} ${formatMoney(
                                      Math.abs(remaining),
                                      currency
                                    )}`}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide 2: Saving Goals (Monthly or Certain Period) */}
                <div className="w-1/2 shrink-0 pl-1">
                  {savingSummary.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center dark:border-slate-800 dark:bg-slate-950/40">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.dashboard.emptySavingDesc}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (!didGoalSwipeRef.current) onOpenSavingGoalsModal();
                        }}
                        className="mt-3 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
                      >
                        {t.dashboard.setFirstSaving}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Overall Saving Goals Progress + Manage Action */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#102A43] dark:text-slate-200">
                            {t.dashboard.totalSavedTowardGoals}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!didGoalSwipeRef.current) onOpenSavingGoalsModal();
                            }}
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#102A43] transition-colors hover:border-sky-500/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            {t.dashboard.manageGoals}
                          </button>
                        </div>
                        <div className="font-mono-num mb-1.5 text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {formatMoney(savingSummary.totalSaved, currency)} /{' '}
                          {formatMoney(savingSummary.totalTarget, currency)} (
                          {Math.round(savingSummary.totalPct)}%)
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              savingSummary.totalPct >= 100
                                ? 'bg-[#16845B] dark:bg-emerald-500'
                                : 'bg-sky-600 dark:bg-sky-400'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, savingSummary.totalPct))}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Per-Saving-Goal Rows */}
                      <div className="space-y-3">
                        {savingSummary.items.map(({ goal, progress }) => {
                          const roundedPct = Math.max(0, Math.round(progress.pct));
                          const reached = progress.pct >= 100;
                          const ended =
                            !reached &&
                            goal.periodType === 'period' &&
                            progress.daysLeft !== null &&
                            progress.daysLeft < 0;

                          const statusLabel = reached
                            ? t.dashboard.goalReached
                            : ended
                            ? t.dashboard.goalEnded
                            : t.dashboard.inProgress;
                          const statusTextClass = reached
                            ? 'text-[#16845B] dark:text-emerald-400'
                            : ended
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-sky-600 dark:text-sky-400';
                          const barColorClass = reached
                            ? 'bg-[#16845B] dark:bg-emerald-500'
                            : ended
                            ? 'bg-amber-500 dark:bg-amber-400'
                            : 'bg-sky-600 dark:bg-sky-400';

                          const daysText =
                            progress.daysLeft === null
                              ? ''
                              : progress.daysLeft < 0
                              ? ''
                              : progress.daysLeft === 0
                              ? t.dashboard.endsTodayLabel
                              : `${progress.daysLeft} ${
                                  progress.daysLeft === 1
                                    ? t.dashboard.dayLeftLabel
                                    : t.dashboard.daysLeftLabel
                                }`;

                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={() => {
                                if (!didGoalSwipeRef.current) onOpenSavingGoalsModal(goal);
                              }}
                              className="block w-full rounded-xl p-2 -mx-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <CategoryIconBadge
                                    style={getCategoryStyle(
                                      categoryStyles,
                                      'sav',
                                      goal.account || savingsList[0] || 'Savings'
                                    )}
                                    size="xs"
                                  />
                                  <span className="truncate font-bold text-[#102A43] dark:text-slate-100">
                                    {goal.title}
                                  </span>
                                  <span className={`font-semibold ${statusTextClass}`}>
                                    · {statusLabel}
                                  </span>
                                </div>
                                <span className="font-mono-num shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                                  {formatMoney(progress.savedAmount, currency)} /{' '}
                                  {formatMoney(goal.targetAmount, currency)}{' '}
                                  <span className={`font-bold ${statusTextClass}`}>
                                    ({roundedPct}%)
                                  </span>
                                </span>
                              </div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, progress.pct))}%`,
                                  }}
                                />
                              </div>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="truncate">
                                  {goal.periodType === 'monthly'
                                    ? `${t.dashboard.monthlyLabel} · ${progress.periodLabel}`
                                    : progress.periodLabel}{' '}
                                  · {goal.account || t.dashboard.allSavingsLabel}
                                </span>
                                <span className="font-mono-num shrink-0">
                                  {reached
                                    ? t.dashboard.goalReached
                                    : `${formatMoney(progress.remaining, currency)} ${t.dashboard.remainingToGoal}${
                                        daysText ? ` · ${daysText}` : ''
                                      }`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom slide indicator + hint */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
              <span>
                {goalView === 'budget'
                  ? t.dashboard.swipeLeftSaving
                  : t.dashboard.swipeRightBudget}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={t.dashboard.monthlyBudgetGoals}
                  onClick={() => setGoalView('budget')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      goalView === 'budget'
                        ? 'w-5 bg-[#16845B] dark:bg-emerald-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={t.dashboard.savingGoalsTitle}
                  onClick={() => setGoalView('saving')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      goalView === 'saving'
                        ? 'w-5 bg-sky-600 dark:bg-sky-400'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        );

      case 'categoryReport': {
        const activeMonthBadge = getMonthBadgeLabel(
          categoryMonthOffset,
          categoryReportData.monthTitle,
          t
        );

        return (
          <div
            key="categoryReport"
            className={`rounded-2xl border p-5 shadow-sm transition-colors duration-200 ${
              categoryView === 'expense'
                ? 'border-rose-200/75 bg-rose-50/45 dark:border-rose-900/40 dark:bg-rose-950/20'
                : 'border-emerald-200/75 bg-emerald-50/45 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            }`}
          >
            {/* Card Header with active view title + compact right-aligned icon switch */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#102A43] dark:text-slate-100">
                {categoryView === 'expense' ? (
                  <TrendingDown className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                ) : (
                  <TrendingUp className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                )}
                <span className="truncate">
                  {categoryView === 'expense'
                    ? t.dashboard.expenseByCategory
                    : t.dashboard.incomeByCategory}
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {activeMonthBadge}
                  </span>
                </span>
              </h3>

              <button
                type="button"
                onClick={() =>
                  setCategoryView((prev) => (prev === 'expense' ? 'income' : 'expense'))
                }
                aria-label={
                  categoryView === 'expense'
                    ? t.dashboard.switchToIncome
                    : t.dashboard.switchToExpense
                }
                title={
                  categoryView === 'expense'
                    ? t.dashboard.switchToIncome
                    : t.dashboard.switchToExpense
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </div>

            {/* Slidable Chronological Month Bar */}
            <SlidableMonthBar
              monthOffset={categoryMonthOffset}
              onSelectMonth={setCategoryMonthOffset}
              tone={categoryView}
            />

            {/* Swipeable Single-Pane Carousel (Expense <-> Income) */}
            <div
              onTouchStart={(e) =>
                handleCategorySwipeStart(e.touches[0].clientX, e.touches[0].clientY)
              }
              onTouchMove={(e) =>
                handleCategorySwipeMove(e.touches[0].clientX, e.touches[0].clientY)
              }
              onTouchEnd={handleCategorySwipeEnd}
              onMouseDown={(e) => handleCategorySwipeStart(e.clientX, e.clientY)}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleCategorySwipeMove(e.clientX, e.clientY);
              }}
              onMouseUp={handleCategorySwipeEnd}
              onMouseLeave={handleCategorySwipeEnd}
              className="mt-3.5 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            >
              <div
                style={{
                  transform: `translateX(calc(${
                    categoryView === 'expense' ? '0%' : '-50%'
                  } + ${categorySwipeX}px))`,
                }}
                className={`flex w-[200%] items-start ${
                  !isSwipingCategory ? 'transition-transform duration-300 ease-out' : ''
                }`}
              >
                {/* Slide 1: Expense Breakdown */}
                <div className="w-1/2 shrink-0 pr-1">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {categoryReportData.monthTitle} · {t.dashboard.totalExpenseSuffix}
                    </span>
                    <span className="font-mono-num font-extrabold text-[#102A43] dark:text-slate-100">
                      {formatMoney(categoryReportData.totalExpense, currency)}
                    </span>
                  </div>

                  {categoryReportData.sortedExpenses.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t.dashboard.noExpensesRecorded} {categoryReportData.monthTitle}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {categoryReportData.sortedExpenses.map(([cat, amount]) => {
                        const pct =
                          categoryReportData.totalExpense > 0
                            ? ((amount / categoryReportData.totalExpense) * 100).toFixed(1)
                            : '0';
                        const catStyle = getCategoryStyle(categoryStyles, 'exp', cat);
                        return (
                          <div key={cat}>
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span className="flex min-w-0 items-center gap-1.5 pr-2">
                                <CategoryIconBadge style={catStyle} size="xs" />
                                <span className="truncate">{cat}</span>
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Slide 2: Income Breakdown */}
                <div className="w-1/2 shrink-0 pl-1">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {categoryReportData.monthTitle} · {t.dashboard.totalIncomeSuffix}
                    </span>
                    <span className="font-mono-num font-extrabold text-[#102A43] dark:text-slate-100">
                      {formatMoney(categoryReportData.totalIncome, currency)}
                    </span>
                  </div>

                  {categoryReportData.sortedIncomes.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t.dashboard.noIncomeRecorded} {categoryReportData.monthTitle}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {categoryReportData.sortedIncomes.map(([cat, amount]) => {
                        const pct =
                          categoryReportData.totalIncome > 0
                            ? ((amount / categoryReportData.totalIncome) * 100).toFixed(1)
                            : '0';
                        const catStyle = getCategoryStyle(categoryStyles, 'inc', cat);
                        return (
                          <div key={cat}>
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span className="flex min-w-0 items-center gap-1.5 pr-2">
                                <CategoryIconBadge style={catStyle} size="xs" />
                                <span className="truncate">{cat}</span>
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom slide indicator + hint */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                {categoryView === 'expense'
                  ? t.dashboard.swipeLeftIncome
                  : t.dashboard.swipeRightExpense}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={t.dashboard.expenseByCategory}
                  onClick={() => setCategoryView('expense')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      categoryView === 'expense'
                        ? 'w-5 bg-[#102A43] dark:bg-slate-200'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={t.dashboard.incomeByCategory}
                  onClick={() => setCategoryView('income')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      categoryView === 'income'
                        ? 'w-5 bg-[#102A43] dark:bg-slate-200'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'categoryPieChart': {
        const activeMonthBadge = getMonthBadgeLabel(pieMonthOffset, pieReportData.monthTitle, t);

        const selectPieView = (nextView: 'expense' | 'income') => {
          setPieView(nextView);
          setActiveExpenseChartCategory(null);
          setActiveIncomeChartCategory(null);
        };

        const selectPieMonth = (nextOffset: number) => {
          setPieMonthOffset(nextOffset);
          setActiveExpenseChartCategory(null);
          setActiveIncomeChartCategory(null);
        };

        return (
          <div
            key="categoryPieChart"
            className={`rounded-2xl border p-5 shadow-sm transition-colors duration-200 ${
              pieView === 'expense'
                ? 'border-rose-200/75 bg-rose-50/45 dark:border-rose-900/40 dark:bg-rose-950/20'
                : 'border-emerald-200/75 bg-emerald-50/45 dark:border-emerald-900/40 dark:bg-emerald-950/20'
            }`}
          >
            {/* Card Header with active view title + compact right-aligned icon switch */}
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-[#102A43] dark:text-slate-100">
                <PieChart className="h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
                <span className="truncate">
                  {pieView === 'expense'
                    ? t.dashboard.expensePieChart
                    : t.dashboard.incomePieChart}
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {activeMonthBadge}
                  </span>
                </span>
              </h3>

              <button
                type="button"
                onClick={() => selectPieView(pieView === 'expense' ? 'income' : 'expense')}
                aria-label={
                  pieView === 'expense'
                    ? t.dashboard.switchToIncome
                    : t.dashboard.switchToExpense
                }
                title={
                  pieView === 'expense'
                    ? t.dashboard.switchToIncome
                    : t.dashboard.switchToExpense
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </button>
            </div>

            {/* Slidable Chronological Month Bar */}
            <SlidableMonthBar
              monthOffset={pieMonthOffset}
              onSelectMonth={selectPieMonth}
              tone={pieView}
            />

            {/* Swipeable Single-Pane Pie Chart Carousel (Expense <-> Income) */}
            <div
              onTouchStart={(e) => handlePieSwipeStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handlePieSwipeMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handlePieSwipeEnd}
              onMouseDown={(e) => handlePieSwipeStart(e.clientX, e.clientY)}
              onMouseMove={(e) => {
                if (e.buttons === 1) handlePieSwipeMove(e.clientX, e.clientY);
              }}
              onMouseUp={handlePieSwipeEnd}
              onMouseLeave={handlePieSwipeEnd}
              className="mt-3.5 overflow-hidden select-none cursor-grab active:cursor-grabbing"
            >
              <div
                style={{
                  transform: `translateX(calc(${
                    pieView === 'expense' ? '0%' : '-50%'
                  } + ${pieSwipeX}px))`,
                }}
                className={`flex w-[200%] items-start ${
                  !isSwipingPie ? 'transition-transform duration-300 ease-out' : ''
                }`}
              >
                {/* Slide 1: Expense Pie Chart */}
                <div className="w-1/2 shrink-0 pr-1">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                      <TrendingDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      {pieReportData.monthTitle} · {t.dashboard.totalExpenseSuffix}
                    </span>
                    <span className="font-mono-num font-extrabold text-[#102A43] dark:text-slate-100">
                      {formatMoney(pieReportData.totalExpense, currency)}
                    </span>
                  </div>

                  {pieReportData.sortedExpenses.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t.dashboard.noExpensesRecorded} {pieReportData.monthTitle}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                      <CategoryPieChart
                        items={pieReportData.sortedExpenses}
                        total={pieReportData.totalExpense}
                        palette={EXPENSE_CHART_COLORS}
                        colorMap={Object.fromEntries(
                          pieReportData.sortedExpenses.map(([cat]) => [
                            cat,
                            getCategoryStyle(categoryStyles, 'exp', cat).color,
                          ])
                        )}
                        currency={currency}
                        totalLabel={t.dashboard.totalExpenseLabel}
                        activeCategory={activeExpenseChartCategory}
                        onSelectCategory={setActiveExpenseChartCategory}
                        didSwipeRef={didPieSwipeRef}
                      />

                      <div className="w-full min-w-0 flex-1 space-y-1.5">
                        {pieReportData.sortedExpenses.map(([cat, amount]) => {
                          const catStyle = getCategoryStyle(categoryStyles, 'exp', cat);
                          const pct =
                            pieReportData.totalExpense > 0
                              ? ((amount / pieReportData.totalExpense) * 100).toFixed(1)
                              : '0';
                          const isHighlighted = activeExpenseChartCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onMouseEnter={() => setActiveExpenseChartCategory(cat)}
                              onMouseLeave={() => setActiveExpenseChartCategory(null)}
                              onClick={() => {
                                if (didPieSwipeRef.current) return;
                                setActiveExpenseChartCategory((prev) => (prev === cat ? null : cat));
                              }}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                                isHighlighted
                                  ? 'bg-white/85 dark:bg-slate-800'
                                  : 'hover:bg-white/60 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CategoryIconBadge style={catStyle} size="xs" />
                                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                  {cat}
                                </span>
                              </span>
                              <span className="font-mono-num shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                                {pct}% · {formatMoney(amount, currency)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slide 2: Income Pie Chart */}
                <div className="w-1/2 shrink-0 pl-1">
                  <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                      <TrendingUp className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      {pieReportData.monthTitle} · {t.dashboard.totalIncomeSuffix}
                    </span>
                    <span className="font-mono-num font-extrabold text-[#102A43] dark:text-slate-100">
                      {formatMoney(pieReportData.totalIncome, currency)}
                    </span>
                  </div>

                  {pieReportData.sortedIncomes.length === 0 ? (
                    <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      {t.dashboard.noIncomeRecorded} {pieReportData.monthTitle}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                      <CategoryPieChart
                        items={pieReportData.sortedIncomes}
                        total={pieReportData.totalIncome}
                        palette={INCOME_CHART_COLORS}
                        colorMap={Object.fromEntries(
                          pieReportData.sortedIncomes.map(([cat]) => [
                            cat,
                            getCategoryStyle(categoryStyles, 'inc', cat).color,
                          ])
                        )}
                        currency={currency}
                        totalLabel={t.dashboard.totalIncomeLabel}
                        activeCategory={activeIncomeChartCategory}
                        onSelectCategory={setActiveIncomeChartCategory}
                        didSwipeRef={didPieSwipeRef}
                      />

                      <div className="w-full min-w-0 flex-1 space-y-1.5">
                        {pieReportData.sortedIncomes.map(([cat, amount]) => {
                          const catStyle = getCategoryStyle(categoryStyles, 'inc', cat);
                          const pct =
                            pieReportData.totalIncome > 0
                              ? ((amount / pieReportData.totalIncome) * 100).toFixed(1)
                              : '0';
                          const isHighlighted = activeIncomeChartCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onMouseEnter={() => setActiveIncomeChartCategory(cat)}
                              onMouseLeave={() => setActiveIncomeChartCategory(null)}
                              onClick={() => {
                                if (didPieSwipeRef.current) return;
                                setActiveIncomeChartCategory((prev) => (prev === cat ? null : cat));
                              }}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                                isHighlighted
                                  ? 'bg-white/85 dark:bg-slate-800'
                                  : 'hover:bg-white/60 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CategoryIconBadge style={catStyle} size="xs" />
                                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">
                                  {cat}
                                </span>
                              </span>
                              <span className="font-mono-num shrink-0 font-semibold text-slate-600 dark:text-slate-300">
                                {pct}% · {formatMoney(amount, currency)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom slide indicator + hint */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>
                {pieView === 'expense'
                  ? t.dashboard.swipeLeftIncomePie
                  : t.dashboard.swipeRightExpensePie}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={t.dashboard.expensePieChart}
                  onClick={() => selectPieView('expense')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      pieView === 'expense'
                        ? 'w-5 bg-[#102A43] dark:bg-slate-200'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  aria-label={t.dashboard.incomePieChart}
                  onClick={() => selectPieView('income')}
                  className="flex h-8 items-center px-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${
                      pieView === 'income'
                        ? 'w-5 bg-[#102A43] dark:bg-slate-200'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                </button>
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
            className="space-y-3 scroll-mt-20"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                {t.dashboard.recentTransactions} ({filteredTransactions.length})
              </h3>
              <div className="relative w-full sm:w-64">
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

            {filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {transactions.length === 0
                    ? t.dashboard.noTransactionsYet
                    : t.dashboard.noTransactionsMatch}
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
                    onDelete={onDeleteTx}
                    onEdit={onEditTx}
                    onResolveDebt={onResolveDebt}
                    onInspectDebt={onInspectDebt}
                  />
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-5">
      {gridOrder.map((key) => renderSection(key))}
    </div>
  );
};
