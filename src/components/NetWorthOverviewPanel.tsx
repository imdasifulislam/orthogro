import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CurrencySymbol, DrilldownType, Transaction } from '../types';
import { formatDisplayDate, formatMoney, getTodayISO, parseLocalDate } from '../utils/format';

export interface NetWorthSummaryData {
  availableCashBalance: number;
  totalSavings: number;
  totalLend: number;
  totalBorrow: number;
  lendCount: number;
  borrowCount: number;
  activeLendItems: Array<{ tx: Transaction; due: number }>;
  activeBorrowItems: Array<{ tx: Transaction; due: number }>;
  totalAssets: number;
  netWorth: number;
  grossMagnitude: number;
}

interface NetWorthOverviewPanelProps {
  summary: NetWorthSummaryData;
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  walletBalances: Record<string, number>;
  currency: CurrencySymbol;
  onSelectDrilldown?: (type: DrilldownType, key?: string | null) => void;
  onInspectDebt: (tx: Transaction) => void;
  onClose: () => void;
}

type HistoryFilter = 'monthly' | 'yearly' | 'all' | 'custom';

interface HistoryPoint {
  date: string;
  label: string;
  netWorth: number;
  assets: number;
  liabilities: number;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMonthEndISO(year: number, monthIndex: number): string {
  return toISODate(new Date(year, monthIndex + 1, 0));
}

function formatShortMonth(dateISO: string, lang: 'en' | 'bn'): string {
  const dt = parseLocalDate(dateISO);
  if (!dt) return dateISO.slice(5, 7);
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
    }).format(dt);
  } catch {
    return dateISO.slice(5, 7);
  }
}

function formatShortMonthYear(dateISO: string, lang: 'en' | 'bn'): string {
  const dt = parseLocalDate(dateISO);
  if (!dt) return dateISO.slice(0, 7);
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      year: '2-digit',
    }).format(dt);
  } catch {
    return dateISO.slice(0, 7);
  }
}

function formatShortDayMonth(dateISO: string, lang: 'en' | 'bn'): string {
  const dt = parseLocalDate(dateISO);
  if (!dt) return dateISO.slice(5);
  try {
    return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
    }).format(dt);
  } catch {
    return dateISO.slice(5);
  }
}

function getSixMonthsAgoISO(todayISO: string): string {
  const dt = parseLocalDate(todayISO) || new Date();
  return toISODate(new Date(dt.getFullYear(), dt.getMonth() - 5, 1));
}

function computeHistoricalSnapshot(
  cutoffISO: string,
  todayISO: string,
  transactions: Transaction[],
  wallets: string[],
  savingsList: string[],
  liveSummary: NetWorthSummaryData
): { netWorth: number; assets: number; liabilities: number } {
  if (cutoffISO >= todayISO) {
    return {
      netWorth: liveSummary.netWorth,
      assets: liveSummary.totalAssets,
      liabilities: liveSummary.totalBorrow,
    };
  }

  const balances: Record<string, number> = {};
  wallets.forEach((w) => {
    balances[w] = 0;
  });
  savingsList.forEach((s) => {
    balances[s] = 0;
  });

  const paidByParent: Record<string, number> = {};
  let unlinkedLendPaid = 0;
  let unlinkedBorrowPaid = 0;

  transactions.forEach((tx) => {
    const d = tx.rawDate || '';
    if (!d || d > cutoffISO) return;

    if (tx.type === 'income' && tx.wallet) {
      balances[tx.wallet] = (balances[tx.wallet] || 0) + tx.amount;
    } else if (tx.type === 'expense' && tx.wallet) {
      balances[tx.wallet] = (balances[tx.wallet] || 0) - tx.amount;
    } else if (tx.type === 'transfer' && tx.fromWallet && tx.toWallet) {
      balances[tx.fromWallet] = (balances[tx.fromWallet] || 0) - (tx.amount + (tx.charge || 0));
      balances[tx.toWallet] = (balances[tx.toWallet] || 0) + tx.amount;
    } else if (tx.type === 'lend' && tx.wallet) {
      balances[tx.wallet] = (balances[tx.wallet] || 0) - tx.amount;
    } else if (tx.type === 'borrow' && tx.wallet) {
      balances[tx.wallet] = (balances[tx.wallet] || 0) + tx.amount;
    } else if (tx.type === 'partial_payment') {
      if (tx.wallet) {
        balances[tx.wallet] =
          (balances[tx.wallet] || 0) + (tx.isLendPay ? tx.amount : -tx.amount);
      }
      if (tx.parentId) {
        paidByParent[tx.parentId] = (paidByParent[tx.parentId] || 0) + tx.amount;
      } else if (tx.isLendPay) {
        unlinkedLendPaid += tx.amount;
      } else {
        unlinkedBorrowPaid += tx.amount;
      }
    } else if ((tx.type === 'correction' || tx.type === 'adjustment') && tx.wallet) {
      balances[tx.wallet] = (balances[tx.wallet] || 0) + tx.amount;
    }
  });

  let cashAndSavings = 0;
  wallets.forEach((w) => {
    cashAndSavings += balances[w] || 0;
  });
  savingsList.forEach((s) => {
    cashAndSavings += balances[s] || 0;
  });

  let totalLend = 0;
  let totalBorrow = 0;

  transactions.forEach((tx) => {
    const d = tx.rawDate || '';
    if (!d || d > cutoffISO) return;
    if (tx.type === 'lend') {
      const paid = paidByParent[tx.id] || 0;
      totalLend += Math.max(0, tx.amount - paid);
    } else if (tx.type === 'borrow') {
      const paid = paidByParent[tx.id] || 0;
      totalBorrow += Math.max(0, tx.amount - paid);
    }
  });

  totalLend = Math.max(0, totalLend - unlinkedLendPaid);
  totalBorrow = Math.max(0, totalBorrow - unlinkedBorrowPaid);

  const assets = cashAndSavings + totalLend;
  const liabilities = totalBorrow;
  return {
    netWorth: assets - liabilities,
    assets,
    liabilities,
  };
}

export const NetWorthOverviewPanel: React.FC<NetWorthOverviewPanelProps> = ({
  summary,
  transactions,
  wallets,
  savingsList,
  walletBalances,
  currency,
  onSelectDrilldown,
  onInspectDebt,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const chartGradId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const todayISO = getTodayISO();

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('monthly');
  const [customStart, setCustomStart] = useState<string>(() => getSixMonthsAgoISO(todayISO));
  const [customEnd, setCustomEnd] = useState<string>(todayISO);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [ratioHoverOpen, setRatioHoverOpen] = useState(false);
  const [ratioPinnedOpen, setRatioPinnedOpen] = useState(false);
  const ratioBadgeRef = useRef<HTMLButtonElement | null>(null);
  const ratioPopoverRef = useRef<HTMLDivElement | null>(null);
  const showRatioPopup = ratioHoverOpen || ratioPinnedOpen;

  useEffect(() => {
    if (!showRatioPopup) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        (ratioBadgeRef.current?.contains(target) || ratioPopoverRef.current?.contains(target))
      ) {
        return;
      }
      setRatioPinnedOpen(false);
      setRatioHoverOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRatioPinnedOpen(false);
        setRatioHoverOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showRatioPopup]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Ratio calculations for hero card
  const positiveAssets = Math.max(0, summary.totalAssets);
  const positiveLiabilities = Math.max(0, summary.totalBorrow);
  const combinedMagnitude = positiveAssets + positiveLiabilities;
  const assetPct =
    combinedMagnitude > 0 ? Math.round((positiveAssets / combinedMagnitude) * 100) : 50;
  const liabilityPct = combinedMagnitude > 0 ? 100 - assetPct : 0;

  // Earliest transaction date for Yearly / All Time ranges
  const earliestTxDate = useMemo(() => {
    let minDate = '';
    transactions.forEach((tx) => {
      const d = tx.rawDate || '';
      if (d && (!minDate || d < minDate)) {
        minDate = d;
      }
    });
    return minDate || todayISO;
  }, [transactions, todayISO]);

  // Historical Net Worth series computed from real transactions
  const { rangeLabel, points } = useMemo((): { rangeLabel: string; points: HistoryPoint[] } => {
    const now = parseLocalDate(todayISO) || new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const makePoint = (dateISO: string, label: string): HistoryPoint => {
      const snap = computeHistoricalSnapshot(
        dateISO,
        todayISO,
        transactions,
        wallets,
        savingsList,
        summary
      );
      return {
        date: dateISO,
        label,
        netWorth: snap.netWorth,
        assets: snap.assets,
        liabilities: snap.liabilities,
      };
    };

    if (historyFilter === 'monthly') {
      const pts: HistoryPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const dateISO =
          i === 0 ? todayISO : getMonthEndISO(d.getFullYear(), d.getMonth());
        pts.push(makePoint(dateISO, formatShortMonth(dateISO, lang)));
      }
      return { rangeLabel: t.modals.lastSixMonths, points: pts };
    }

    if (historyFilter === 'yearly') {
      const earliestYear = Number(earliestTxDate.slice(0, 4)) || currentYear;
      const startYear = Math.max(currentYear - 5, Math.min(earliestYear, currentYear - 3));
      const pts: HistoryPoint[] = [];
      for (let y = startYear; y <= currentYear; y++) {
        const dateISO = y === currentYear ? todayISO : `${y}-12-31`;
        pts.push(makePoint(dateISO, String(y)));
      }
      return { rangeLabel: t.modals.yearlyTrend, points: pts };
    }

    if (historyFilter === 'all') {
      const startDt = parseLocalDate(earliestTxDate) || new Date(currentYear, currentMonth - 5, 1);
      const monthsDiff =
        (currentYear - startDt.getFullYear()) * 12 + (currentMonth - startDt.getMonth());

      if (monthsDiff <= 5) {
        const pts: HistoryPoint[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonth - i, 1);
          const dateISO =
            i === 0 ? todayISO : getMonthEndISO(d.getFullYear(), d.getMonth());
          pts.push(makePoint(dateISO, formatShortMonth(dateISO, lang)));
        }
        return { rangeLabel: t.common.allTime, points: pts };
      }

      const targetCount = Math.min(7, monthsDiff + 1);
      const pts: HistoryPoint[] = [];
      const seenDates = new Set<string>();
      for (let idx = 0; idx < targetCount; idx++) {
        const ratio = targetCount === 1 ? 1 : idx / (targetCount - 1);
        const offsetMonths = Math.round(ratio * monthsDiff);
        const d = new Date(startDt.getFullYear(), startDt.getMonth() + offsetMonths, 1);
        const isLast = idx === targetCount - 1;
        const dateISO = isLast ? todayISO : getMonthEndISO(d.getFullYear(), d.getMonth());
        if (seenDates.has(dateISO)) continue;
        seenDates.add(dateISO);
        const label =
          monthsDiff > 11
            ? formatShortMonthYear(dateISO, lang)
            : formatShortMonth(dateISO, lang);
        pts.push(makePoint(dateISO, label));
      }
      return { rangeLabel: t.common.allTime, points: pts };
    }

    // Custom date range
    const safeStart = customStart && customEnd && customStart <= customEnd ? customStart : customEnd || todayISO;
    const safeEnd = customStart && customEnd && customStart <= customEnd ? customEnd : customStart || todayISO;
    const startDt = parseLocalDate(safeStart) || now;
    const endDt = parseLocalDate(safeEnd) || now;
    const diffDays = Math.max(
      0,
      Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const pts: HistoryPoint[] = [];
    if (diffDays === 0) {
      pts.push(makePoint(safeEnd, formatShortDayMonth(safeEnd, lang)));
    } else {
      const steps = Math.min(6, Math.max(2, Math.min(diffDays + 1, 6)));
      const seen = new Set<string>();
      for (let i = 0; i < steps; i++) {
        const dayOffset = Math.round((i / (steps - 1)) * diffDays);
        const d = new Date(startDt.getFullYear(), startDt.getMonth(), startDt.getDate() + dayOffset);
        const dateISO = i === steps - 1 ? safeEnd : toISODate(d);
        if (seen.has(dateISO)) continue;
        seen.add(dateISO);
        const label =
          diffDays > 180
            ? formatShortMonthYear(dateISO, lang)
            : formatShortDayMonth(dateISO, lang);
        pts.push(makePoint(dateISO, label));
      }
    }

    return {
      rangeLabel: `${formatShortDayMonth(safeStart, lang)} – ${formatShortDayMonth(safeEnd, lang)}`,
      points: pts,
    };
  }, [historyFilter, customStart, customEnd, todayISO, earliestTxDate, transactions, wallets, savingsList, summary, lang, t.modals.lastSixMonths, t.modals.yearlyTrend, t.common.allTime]);

  // Chart coordinates
  const chartGeometry = useMemo(() => {
    const width = 360;
    const height = 142;
    const padX = 16;
    const padY = 18;

    const values = points.map((p) => p.netWorth);
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 0;
    const span = maxVal - minVal;

    const coords = points.map((pt, idx) => {
      const x =
        points.length <= 1
          ? width / 2
          : padX + (idx / (points.length - 1)) * (width - padX * 2);
      const y =
        span === 0
          ? height / 2
          : height - padY - ((pt.netWorth - minVal) / span) * (height - padY * 2);
      return { ...pt, x, y };
    });

    const linePath = coords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const areaPath =
      coords.length > 1
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padY} L ${coords[0].x.toFixed(1)} ${height - padY} Z`
        : '';

    const zeroY =
      span > 0 && minVal < 0 && maxVal > 0
        ? height - padY - ((0 - minVal) / span) * (height - padY * 2)
        : null;

    return { width, height, padX, padY, coords, linePath, areaPath, zeroY };
  }, [points]);

  const activePointIdx =
    selectedPointIdx !== null && selectedPointIdx < chartGeometry.coords.length
      ? selectedPointIdx
      : chartGeometry.coords.length - 1;
  const activePoint = chartGeometry.coords[activePointIdx] || null;

// Asset breakdown items: Wallets & Cash first, then Savings & Investments, then others
  const assetGroups = useMemo(() => {
    return [
      {
        id: 'wallets',
        name: t.modals.walletsAndCash,
        amount: summary.availableCashBalance,
        emptyText: '',
        subHint: t.modals.tapToViewAccounts,
        children: wallets.map((w) => ({
          key: `wal-${w}`,
          label: w,
          value: walletBalances[w] || 0,
          onClick: () => onSelectDrilldown?.('wallet', w),
        })),
      },
      {
        id: 'savings_investments',
        name: t.dashboard.savingsInvestments,
        amount: summary.totalSavings,
        emptyText: t.modals.noSavingsAccounts,
        subHint: t.modals.tapToViewAccounts,
        children: savingsList.map((s) => ({
          key: `sav-${s}`,
          label: s,
          value: walletBalances[s] || 0,
          onClick: () => onSelectDrilldown?.('savings', s),
        })),
      },
      {
        id: 'lent',
        name: t.dashboard.lentReceivable,
        amount: summary.totalLend,
        emptyText: t.modals.noActiveLent,
        subHint: t.modals.tapToViewRecords,
        children: summary.activeLendItems.map(({ tx, due }) => ({
          key: `lend-${tx.id}`,
          label: tx.title || t.dashboard.lentReceivable,
          value: due,
          onClick: () => {
            onClose();
            onInspectDebt(tx);
          },
        })),
      },
    ];
  }, [
    summary.totalSavings,
    summary.availableCashBalance,
    summary.totalLend,
    summary.activeLendItems,
    savingsList,
    wallets,
    walletBalances,
    onSelectDrilldown,
    onInspectDebt,
    onClose,
    t.dashboard.savingsInvestments,
    t.dashboard.lentReceivable,
    t.modals.walletsAndCash,
    t.modals.noSavingsAccounts,
    t.modals.noActiveLent,
    t.modals.tapToViewAccounts,
    t.modals.tapToViewRecords,
  ]);
  const positiveAssetsSum = useMemo(
    () => assetGroups.reduce((sum, g) => sum + Math.max(0, g.amount), 0),
    [assetGroups]
  );

  const filterTabs: Array<{ id: HistoryFilter; label: string }> = [
    { id: 'monthly', label: t.common.monthlyByMonth },
    { id: 'yearly', label: t.common.yearlyByYear },
    { id: 'all', label: t.common.allTime },
    { id: 'custom', label: t.common.custom },
  ];

  const isNegativeNetWorth = summary.netWorth < 0;

  return (
    <div className="no-scrollbar min-h-0 flex-1 space-y-3.5 overflow-y-auto pr-0.5 pb-1">
      {/* 1. Hero Net Worth, Assets & Liabilities Overview */}
      <div className="relative">
        <section className="net-worth-card relative overflow-hidden rounded-[20px] px-4 py-3.5 text-white sm:px-5">
          <div className="relative z-10">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400 sm:text-xs">
                {t.dashboard.netWorth}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-slate-400/80 sm:text-xs">
                {formatDisplayDate(todayISO, lang)}
              </span>
            </div>

            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono-num min-w-0 truncate text-[24px] leading-tight font-bold tracking-tight tabular-nums sm:text-[28px]">
                {formatMoney(summary.netWorth, currency)}
              </div>
              {combinedMagnitude > 0 && (
                <button
                  ref={ratioBadgeRef}
                  type="button"
                  aria-expanded={showRatioPopup}
                  aria-describedby={showRatioPopup ? `nw-ratio-tip-${chartGradId}` : undefined}
                  onMouseEnter={() => setRatioHoverOpen(true)}
                  onMouseLeave={() => setRatioHoverOpen(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setRatioPinnedOpen((prev) => !prev);
                  }}
                  className={`font-mono-num inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                    isNegativeNetWorth
                      ? 'bg-rose-400/20 text-rose-200 hover:bg-rose-400/30'
                      : 'bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30'
                  }`}
                >
                  <span aria-hidden="true">{isNegativeNetWorth ? '▼' : '▲'}</span>
                  <span>
                    {isNegativeNetWorth
                      ? `${t.modals.debtRatioPrefix} ${liabilityPct}%`
                      : `${t.modals.assetsRatioPrefix} ${assetPct}%`}
                  </span>
                </button>
              )}
            </div>

            {/* 2-Color Assets vs Liabilities Ratio Bar */}
            <div
              className="mb-2.5 flex h-[3px] w-full overflow-hidden rounded-full bg-white/14"
              aria-label={`${t.modals.totalAssetsLabel} ${assetPct}%, ${t.modals.totalLiabilitiesLabel} ${liabilityPct}%`}
            >
              {combinedMagnitude > 0 ? (
                <>
                  {positiveAssets > 0 && (
                    <div
                      style={{ width: `${assetPct}%` }}
                      className="h-full bg-[#22C55E] transition-all duration-300"
                    />
                  )}
                  {positiveLiabilities > 0 && (
                    <div
                      style={{ width: `${liabilityPct}%` }}
                      className="h-full bg-[#F87171] transition-all duration-300"
                    />
                  )}
                </>
              ) : (
                <div className="h-full w-full bg-white/15" />
              )}
            </div>

            {/* 2-Column Compact Stat Boxes */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/12 bg-white/[0.08] px-2.5 py-1.5">
                <div className="text-[10px] font-medium leading-tight text-slate-300">
                  {t.modals.totalAssetsLabel}
                </div>
                <div className="font-mono-num mt-0.5 truncate text-[13px] font-bold leading-tight tabular-nums text-white sm:text-sm">
                  {formatMoney(summary.totalAssets, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-white/12 bg-white/[0.08] px-2.5 py-1.5">
                <div className="text-[10px] font-medium leading-tight text-slate-300">
                  {t.modals.totalLiabilitiesLabel}
                </div>
                <div className="font-mono-num mt-0.5 truncate text-[13px] font-bold leading-tight tabular-nums text-white sm:text-sm">
                  {formatMoney(summary.totalBorrow, currency)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ratio Explanation Popover (Hover + Tap) */}
        {showRatioPopup && combinedMagnitude > 0 && (
          <div
            ref={ratioPopoverRef}
            id={`nw-ratio-tip-${chartGradId}`}
            role="tooltip"
            onMouseEnter={() => setRatioHoverOpen(true)}
            onMouseLeave={() => setRatioHoverOpen(false)}
            className="absolute top-[66px] right-4 z-30 w-64 rounded-xl border border-slate-200/95 bg-white/98 p-3 text-left shadow-xl ring-1 ring-black/5 backdrop-blur-md sm:right-5 dark:border-slate-700 dark:bg-slate-900/98 dark:ring-white/10"
          >
            <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
              {t.modals.balanceSheetRatioTitle}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {t.modals.balanceSheetRatioDesc}
            </p>
            <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {t.modals.totalAssetsLabel}
                </span>
                <span className="font-mono-num font-bold tabular-nums text-[#146C43] dark:text-emerald-400">
                  {assetPct}% · {formatMoney(summary.totalAssets, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {t.modals.totalLiabilitiesLabel}
                </span>
                <span className="font-mono-num font-bold tabular-nums text-[#D94848] dark:text-rose-400">
                  {liabilityPct}% · {formatMoney(summary.totalBorrow, currency)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Net Worth History with Interactive Filtering */}
      <section className="rounded-[18px] border border-slate-200/90 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
            {t.modals.netWorthHistoryTitle}
          </h4>
          <span className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {rangeLabel}
          </span>
        </div>

        {/* 4-Option Filter Bar */}
        <div
          role="tablist"
          aria-label={t.modals.selectTimePeriod}
          className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-slate-200/80 bg-[#F7FAF8] p-1 dark:border-slate-800 dark:bg-slate-950/70"
        >
          {filterTabs.map((tab) => {
            const isActive = historyFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setHistoryFilter(tab.id);
                  setSelectedPointIdx(null);
                }}
                className={`min-h-[34px] cursor-pointer whitespace-nowrap rounded-lg px-1.5 py-1 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] ${
                  isActive
                    ? 'bg-white font-bold text-[#146C43] shadow-xs dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="block truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Pickers */}
        {historyFilter === 'custom' && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{t.modals.startDateLabel}</span>
              <input
                type="date"
                value={customStart}
                max={customEnd || todayISO}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setSelectedPointIdx(null);
                }}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-[#F7FAF8] px-2 py-1.5 text-xs font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{t.modals.endDateLabel}</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                max={todayISO}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setSelectedPointIdx(null);
                }}
                className="min-h-[36px] rounded-lg border border-slate-200 bg-[#F7FAF8] px-2 py-1.5 text-xs font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
        )}

        {/* Interactive SVG Area + Line Chart */}
        <div className="rounded-xl border border-slate-200/75 bg-[#F8FAF9] p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-slate-500 dark:text-slate-400">
              {activePoint
                ? `${activePoint.label} · ${formatDisplayDate(activePoint.date, lang)}`
                : t.modals.tapPointToInspect}
            </span>
            {activePoint && (
              <strong
                className={`font-mono-num shrink-0 font-bold tabular-nums ${
                  activePoint.netWorth < 0
                    ? 'text-[#D94848] dark:text-rose-400'
                    : 'text-[#146C43] dark:text-emerald-400'
                }`}
              >
                {formatMoney(activePoint.netWorth, currency)}
              </strong>
            )}
          </div>

          <svg
            viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
            role="img"
            aria-label={t.modals.netWorthHistoryTitle}
            className="block h-[138px] w-full overflow-visible"
          >
            <defs>
              <linearGradient id={`nw-area-${chartGradId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#146c43" stopOpacity="0.26" />
                <stop offset="100%" stopColor="#146c43" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Bottom Baseline */}
            <line
              x1={chartGeometry.padX}
              y1={chartGeometry.height - chartGeometry.padY}
              x2={chartGeometry.width - chartGeometry.padX}
              y2={chartGeometry.height - chartGeometry.padY}
              className="stroke-slate-300/80 dark:stroke-slate-700/80"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Optional Zero Line when Net Worth crosses 0 */}
            {chartGeometry.zeroY !== null && (
              <line
                x1={chartGeometry.padX}
                y1={chartGeometry.zeroY}
                x2={chartGeometry.width - chartGeometry.padX}
                y2={chartGeometry.zeroY}
                className="stroke-slate-400/50 dark:stroke-slate-600/60"
                strokeWidth="1"
                strokeDasharray="2 3"
              />
            )}

            {/* Area Fill */}
            {chartGeometry.areaPath && (
              <path d={chartGeometry.areaPath} fill={`url(#nw-area-${chartGradId})`} />
            )}

            {/* Trend Line */}
            {chartGeometry.linePath && (
              <path
                d={chartGeometry.linePath}
                fill="none"
                stroke="#146C43"
                className="dark:stroke-emerald-400"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Active Vertical Guide */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={activePoint.x}
                y2={chartGeometry.height - chartGeometry.padY}
                stroke="#146C43"
                className="opacity-25 dark:stroke-emerald-400"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* Interactive Data Points */}
            {chartGeometry.coords.map((pt, idx) => {
              const isSelected = idx === activePointIdx;
              return (
                <g
                  key={`${pt.date}-${idx}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${pt.label}: ${formatMoney(pt.netWorth, currency)}`}
                  onClick={() => setSelectedPointIdx(idx)}
                  onMouseEnter={() => setSelectedPointIdx(idx)}
                  onFocus={() => setSelectedPointIdx(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPointIdx(idx);
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  {/* Generous invisible hit area for mobile touch */}
                  <circle cx={pt.x} cy={pt.y} r="15" fill="transparent" />
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="8.5"
                      className="fill-[#146C43]/18 dark:fill-emerald-400/20"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? '5' : '3.8'}
                    className="fill-[#146C43] stroke-white dark:fill-emerald-400 dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>

          {/* X-Axis Labels */}
          <div className="mt-1.5 flex items-center justify-between px-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {chartGeometry.coords.map((pt, idx) => (
              <button
                key={`lbl-${pt.date}-${idx}`}
                type="button"
                onClick={() => setSelectedPointIdx(idx)}
                className={`cursor-pointer truncate px-0.5 transition-colors ${
                  idx === activePointIdx
                    ? 'font-bold text-[#146C43] dark:text-emerald-400'
                    : 'hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Asset Breakdown */}
      <section className="rounded-[18px] border border-slate-200/90 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
            {t.modals.assetBreakdownTitle}
          </h4>
          <span className="font-mono-num shrink-0 text-xs font-bold tabular-nums text-[#146C43] dark:text-emerald-400">
            {formatMoney(summary.totalAssets, currency)}
          </span>
        </div>

        <div className="space-y-2">
          {assetGroups.map((group) => {
            const pctNum =
              positiveAssetsSum > 0 && group.amount > 0
                ? (group.amount / positiveAssetsSum) * 100
                : 0;
            const pctLabel = pctNum.toFixed(1);
            const isExpanded = Boolean(expandedIds[group.id]);

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-[#F8FAF9] transition-colors hover:border-emerald-300/70 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-emerald-500/35"
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleExpand(group.id)}
                  className="w-full cursor-pointer px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#16845B]"
                >
                  <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#102A43] dark:text-slate-100">
                    <span className="truncate">{group.name}</span>
                    <span className="font-mono-num shrink-0 tabular-nums">
                      {formatMoney(group.amount, currency)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span>
                        {group.subHint} ({group.children.length})
                      </span>
                    </span>
                    <span className="font-mono-num font-semibold tabular-nums">
                      {pctLabel}%
                    </span>
                  </div>
                  <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[#146C43] transition-all duration-300 dark:bg-emerald-500"
                      style={{ width: `${Math.min(100, Math.max(0, pctNum))}%` }}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-dashed border-slate-200/90 px-3 py-2 dark:border-slate-800">
                    {group.children.length === 0 ? (
                      <p className="py-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {group.emptyText}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {group.children.map((ch) => (
                          <button
                            key={ch.key}
                            type="button"
                            onClick={ch.onClick}
                            className="flex min-h-[36px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white dark:hover:bg-slate-800/70"
                          >
                            <span className="truncate text-slate-600 dark:text-slate-300">
                              {ch.label}
                            </span>
                            <span className="flex shrink-0 items-center gap-1">
                              <span className="font-mono-num font-semibold tabular-nums text-[#102A43] dark:text-slate-100">
                                {formatMoney(ch.value, currency)}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Liabilities Breakdown */}
      <section className="rounded-[18px] border border-slate-200/90 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
            {t.modals.liabilitiesBreakdownTitle}
          </h4>
          <span className="font-mono-num shrink-0 text-xs font-bold tabular-nums text-[#D94848] dark:text-rose-400">
            {formatMoney(summary.totalBorrow, currency)}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-[#F8FAF9] transition-colors hover:border-rose-300/70 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-rose-500/35">
          <button
            type="button"
            aria-expanded={Boolean(expandedIds.borrowed_main)}
            onClick={() => toggleExpand('borrowed_main')}
            className="w-full cursor-pointer px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500"
          >
            <div className="flex items-center justify-between gap-2 text-[13px] font-bold text-[#102A43] dark:text-slate-100">
              <span className="truncate">{t.modals.borrowedDues}</span>
              <span className="font-mono-num shrink-0 tabular-nums">
                {formatMoney(summary.totalBorrow, currency)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                    expandedIds.borrowed_main ? 'rotate-180' : ''
                  }`}
                />
                <span>
                  {t.modals.tapToViewRecords} ({summary.borrowCount})
                </span>
              </span>
              <span className="font-mono-num font-semibold tabular-nums">
                {summary.totalBorrow > 0 ? '100.0%' : '0.0%'}
              </span>
            </div>
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-[#DC2626] transition-all duration-300 dark:bg-rose-500"
                style={{ width: summary.totalBorrow > 0 ? '100%' : '0%' }}
              />
            </div>
          </button>

          {expandedIds.borrowed_main && (
            <div className="border-t border-dashed border-slate-200/90 px-3 py-2 dark:border-slate-800">
              {summary.activeBorrowItems.length === 0 ? (
                <p className="py-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {t.modals.noActiveBorrowed}
                </p>
              ) : (
                <div className="space-y-1">
                  {summary.activeBorrowItems.map(({ tx, due }) => (
                    <button
                      key={`borrow-${tx.id}`}
                      type="button"
                      onClick={() => {
                        onClose();
                        onInspectDebt(tx);
                      }}
                      className="flex min-h-[36px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-white dark:hover:bg-slate-800/70"
                    >
                      <span className="truncate text-slate-600 dark:text-slate-300">
                        {tx.title || t.dashboard.borrowedPayable}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="font-mono-num font-semibold tabular-nums text-[#D94848] dark:text-rose-400">
                          {formatMoney(due, currency)}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
