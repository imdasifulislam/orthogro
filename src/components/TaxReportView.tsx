import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  Minus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryStyle, CurrencySymbol, Transaction } from '../types';
import {
  CategoryIconBadge,
  getCategoryStyle,
  getExpenseOrSubCategoryStyle,
} from '../utils/categoryVisuals';
import { formatDisplayDate, formatMoney } from '../utils/format';
import {
  computeFinancialReportData,
  computeReportComparison,
  downloadComparisonCsv,
  downloadComparisonPdf,
  downloadTaxYearCsv,
  downloadTaxYearPdf,
  formatCalendarYearOptionLabel,
  formatMonthOptionLabel,
  formatMonthShortLabel,
  formatTaxYearOptionLabel,
  getAvailableCalendarYears,
  getAvailableMonthKeys,
  getAvailableTaxYears,
  type ReportScope,
} from '../utils/taxReport';
import { CategoryPieChart } from './CategoryPieChart';

interface TaxReportViewProps {
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  categoryStyles: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  onBack: () => void;
  backLabel?: string;
}

type ViewTab = ReportScope | 'compare';

const INCOME_PALETTE = [
  '#16845B',
  '#059669',
  '#0284C7',
  '#0D9488',
  '#4F46E5',
  '#D97706',
  '#64748B',
];

const EXPENSE_PALETTE = [
  '#D94848',
  '#EA580C',
  '#D97706',
  '#9333EA',
  '#0284C7',
  '#0D9488',
  '#64748B',
];

export const TaxReportView: React.FC<TaxReportViewProps> = ({
  transactions,
  wallets,
  savingsList,
  categoryStyles,
  currency,
  onBack,
  backLabel,
}) => {
  const { lang, t } = useTranslation();
  const tr = t.taxReport;

  const availableMonths = useMemo(() => getAvailableMonthKeys(transactions), [transactions]);
  const availableCalendarYears = useMemo(
    () => getAvailableCalendarYears(transactions),
    [transactions]
  );
  const availableTaxYears = useMemo(() => getAvailableTaxYears(transactions), [transactions]);

  const [viewTab, setViewTab] = useState<ViewTab>('monthly');
  const [compareScope, setCompareScope] = useState<ReportScope>('monthly');

  // Active period selections per scope
  const [selectedMonth, setSelectedMonth] = useState<string>(() => availableMonths[0] || '');
  const [selectedCalYear, setSelectedCalYear] = useState<number>(
    () => availableCalendarYears[0] ?? new Date().getFullYear()
  );
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(
    () => availableTaxYears[0] ?? new Date().getFullYear()
  );

  // Comparison period selections per scope (A = Target, B = Baseline)
  const [compareMonthA, setCompareMonthA] = useState<string>(() => availableMonths[0] || '');
  const [compareMonthB, setCompareMonthB] = useState<string>(
    () => availableMonths[1] || availableMonths[0] || ''
  );
  const [compareYearA, setCompareYearA] = useState<number>(
    () => availableCalendarYears[0] ?? new Date().getFullYear()
  );
  const [compareYearB, setCompareYearB] = useState<number>(
    () => availableCalendarYears[1] ?? availableCalendarYears[0] ?? new Date().getFullYear()
  );
  const [compareTaxYearA, setCompareTaxYearA] = useState<number>(
    () => availableTaxYears[0] ?? new Date().getFullYear()
  );
  const [compareTaxYearB, setCompareTaxYearB] = useState<number>(
    () => availableTaxYears[1] ?? availableTaxYears[0] ?? new Date().getFullYear()
  );

  const [activeIncomeCat, setActiveIncomeCat] = useState<string | null>(null);
  const [activeExpenseCat, setActiveExpenseCat] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [compareCatType, setCompareCatType] = useState<'expense' | 'income'>('expense');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const noopDidSwipeRef = useRef(false);

  const activeScope: ReportScope = viewTab === 'compare' ? compareScope : viewTab;

  const activePeriodKey = useMemo(() => {
    if (activeScope === 'monthly') return selectedMonth;
    if (activeScope === 'yearly') return String(selectedCalYear);
    return String(selectedTaxYear);
  }, [activeScope, selectedMonth, selectedCalYear, selectedTaxYear]);

  const report = useMemo(
    () =>
      computeFinancialReportData({
        scope: activeScope,
        periodKey: activePeriodKey,
        transactions,
        wallets,
        savingsList,
        categoryStyles,
        lang,
      }),
    [activeScope, activePeriodKey, transactions, wallets, savingsList, categoryStyles, lang]
  );

  const compareKeys = useMemo(() => {
    if (compareScope === 'monthly') return { a: compareMonthA, b: compareMonthB };
    if (compareScope === 'yearly') return { a: String(compareYearA), b: String(compareYearB) };
    return { a: String(compareTaxYearA), b: String(compareTaxYearB) };
  }, [
    compareScope,
    compareMonthA,
    compareMonthB,
    compareYearA,
    compareYearB,
    compareTaxYearA,
    compareTaxYearB,
  ]);

  const comparison = useMemo(() => {
    if (viewTab !== 'compare') return null;
    const primary = computeFinancialReportData({
      scope: compareScope,
      periodKey: compareKeys.a,
      transactions,
      wallets,
      savingsList,
      categoryStyles,
      lang,
    });
    const baseline = computeFinancialReportData({
      scope: compareScope,
      periodKey: compareKeys.b,
      transactions,
      wallets,
      savingsList,
      categoryStyles,
      lang,
    });
    return computeReportComparison(primary, baseline);
  }, [viewTab, compareScope, compareKeys, transactions, wallets, savingsList, categoryStyles, lang]);

  const incomeColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    report.incomeCategories.forEach((c) => {
      map[c.category] = getCategoryStyle(categoryStyles, 'inc', c.category).color;
    });
    return map;
  }, [report.incomeCategories, categoryStyles]);

  const expenseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    report.expenseCategories.forEach((c) => {
      map[c.category] = getCategoryStyle(categoryStyles, 'exp', c.category).color;
    });
    return map;
  }, [report.expenseCategories, categoryStyles]);

  const filteredLedgerRows = useMemo(() => {
    if (ledgerFilter === 'income') return report.incomeTransactions;
    if (ledgerFilter === 'expense') return report.expenseTransactions;
    return [...report.incomeTransactions, ...report.expenseTransactions].sort((a, b) =>
      a.rawDate.localeCompare(b.rawDate)
    );
  }, [ledgerFilter, report.incomeTransactions, report.expenseTransactions]);

  const resetViewTransient = () => {
    setActiveIncomeCat(null);
    setActiveExpenseCat(null);
    setExportStatus(null);
  };

  // Step prev/next inside available list (sorted newest -> oldest)
  const stepPeriod = (direction: 'prev' | 'next') => {
    resetViewTransient();
    if (activeScope === 'monthly') {
      const idx = availableMonths.indexOf(selectedMonth);
      if (idx === -1) return;
      const targetIdx = direction === 'prev' ? idx + 1 : idx - 1;
      if (targetIdx >= 0 && targetIdx < availableMonths.length) {
        setSelectedMonth(availableMonths[targetIdx]);
      }
    } else if (activeScope === 'yearly') {
      const idx = availableCalendarYears.indexOf(selectedCalYear);
      if (idx === -1) return;
      const targetIdx = direction === 'prev' ? idx + 1 : idx - 1;
      if (targetIdx >= 0 && targetIdx < availableCalendarYears.length) {
        setSelectedCalYear(availableCalendarYears[targetIdx]);
      }
    } else {
      const idx = availableTaxYears.indexOf(selectedTaxYear);
      if (idx === -1) return;
      const targetIdx = direction === 'prev' ? idx + 1 : idx - 1;
      if (targetIdx >= 0 && targetIdx < availableTaxYears.length) {
        setSelectedTaxYear(availableTaxYears[targetIdx]);
      }
    }
  };

  const canStepPrev = useMemo(() => {
    if (activeScope === 'monthly') {
      const idx = availableMonths.indexOf(selectedMonth);
      return idx >= 0 && idx < availableMonths.length - 1;
    }
    if (activeScope === 'yearly') {
      const idx = availableCalendarYears.indexOf(selectedCalYear);
      return idx >= 0 && idx < availableCalendarYears.length - 1;
    }
    const idx = availableTaxYears.indexOf(selectedTaxYear);
    return idx >= 0 && idx < availableTaxYears.length - 1;
  }, [
    activeScope,
    availableMonths,
    selectedMonth,
    availableCalendarYears,
    selectedCalYear,
    availableTaxYears,
    selectedTaxYear,
  ]);

  const canStepNext = useMemo(() => {
    if (activeScope === 'monthly') return availableMonths.indexOf(selectedMonth) > 0;
    if (activeScope === 'yearly') return availableCalendarYears.indexOf(selectedCalYear) > 0;
    return availableTaxYears.indexOf(selectedTaxYear) > 0;
  }, [
    activeScope,
    availableMonths,
    selectedMonth,
    availableCalendarYears,
    selectedCalYear,
    availableTaxYears,
    selectedTaxYear,
  ]);

  const handleQuickCompareCurrent = () => {
    if (viewTab === 'compare') return;
    setCompareScope(viewTab);
    if (viewTab === 'monthly') {
      const idx = availableMonths.indexOf(selectedMonth);
      setCompareMonthA(selectedMonth);
      setCompareMonthB(
        idx >= 0 && idx + 1 < availableMonths.length ? availableMonths[idx + 1] : selectedMonth
      );
    } else if (viewTab === 'yearly') {
      const idx = availableCalendarYears.indexOf(selectedCalYear);
      setCompareYearA(selectedCalYear);
      setCompareYearB(
        idx >= 0 && idx + 1 < availableCalendarYears.length
          ? availableCalendarYears[idx + 1]
          : selectedCalYear
      );
    } else {
      const idx = availableTaxYears.indexOf(selectedTaxYear);
      setCompareTaxYearA(selectedTaxYear);
      setCompareTaxYearB(
        idx >= 0 && idx + 1 < availableTaxYears.length
          ? availableTaxYears[idx + 1]
          : selectedTaxYear
      );
    }
    setExportStatus(null);
    setViewTab('compare');
  };

  const handleSwapCompare = () => {
    setExportStatus(null);
    if (compareScope === 'monthly') {
      setCompareMonthA(compareMonthB);
      setCompareMonthB(compareMonthA);
    } else if (compareScope === 'yearly') {
      setCompareYearA(compareYearB);
      setCompareYearB(compareYearA);
    } else {
      setCompareTaxYearA(compareTaxYearB);
      setCompareTaxYearB(compareTaxYearA);
    }
  };

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportStatus(null);
    try {
      if (viewTab === 'compare' && comparison) {
        await downloadComparisonPdf(comparison, currency, lang);
      } else {
        await downloadTaxYearPdf(report, currency, lang);
      }
      setExportStatus({ type: 'success', message: tr.pdfSuccess });
    } catch {
      setExportStatus({ type: 'error', message: tr.pdfError });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    setExportStatus(null);
    if (viewTab === 'compare' && comparison) {
      downloadComparisonCsv(comparison, currency, lang);
    } else {
      downloadTaxYearCsv(report, currency, lang);
    }
    setExportStatus({ type: 'success', message: tr.csvSuccess });
  };

  const endDateDisplay = formatDisplayDate(report.endDate, lang);
  const monthlyTrendMax = useMemo(() => {
    if (!report.monthlyTrend || report.monthlyTrend.length === 0) return 0;
    return report.monthlyTrend.reduce(
      (max, item) => Math.max(max, item.income, item.expense),
      0
    );
  }, [report.monthlyTrend]);

  const formatSignedMoney = (val: number) => `${val > 0 ? '+' : ''}${formatMoney(val, currency)}`;
  const formatPctChange = (pctChange: number | null) => {
    if (pctChange === null) return tr.compareNewLabel;
    if (Math.abs(pctChange) < 0.05) return '0.0%';
    return `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%`;
  };

  const activeSubtitle =
    viewTab === 'compare' && comparison
      ? `${comparison.primary.fyLabel} ${tr.compareVsLabel} ${comparison.baseline.fyLabel}`
      : `${report.fyLabel} · ${report.periodDisplay}`;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header, Mode Switcher & Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel ?? t.settings.backToSettings}
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <FileBarChart2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">{tr.title}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {activeSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] disabled:opacity-60 sm:flex-none"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>{isExportingPdf ? tr.generatingPdf : tr.downloadPdf}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-50 sm:flex-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
              <span>{tr.downloadCsv}</span>
            </button>
          </div>
        </div>

        {/* 4-Mode Segmented Control: Monthly | Yearly | Tax Year | Compare */}
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
          {(
            [
              { key: 'monthly', label: tr.modeMonthly },
              { key: 'yearly', label: tr.modeYearly },
              { key: 'tax_year', label: tr.modeTaxYear },
              { key: 'compare', label: tr.modeCompare },
            ] as const
          ).map((tab) => {
            const active = viewTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  resetViewTransient();
                  setViewTab(tab.key);
                }}
                className={`min-h-[38px] truncate whitespace-nowrap rounded-lg px-1.5 py-1.5 text-xs font-bold transition-colors sm:px-2 ${
                  active
                    ? 'bg-[#16845B] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Period Selector OR Comparison Selector */}
        {viewTab !== 'compare' ? (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <CalendarRange className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                <span>
                  {viewTab === 'monthly'
                    ? tr.selectMonth
                    : viewTab === 'yearly'
                    ? tr.selectYear
                    : tr.selectTaxYear}
                </span>
              </div>

              <div className="flex w-full items-center gap-1.5 sm:w-auto">
                <button
                  type="button"
                  aria-label={tr.prevPeriodAria}
                  disabled={!canStepPrev}
                  onClick={() => stepPeriod('prev')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {viewTab === 'monthly' && (
                  <select
                    aria-label={tr.selectMonth}
                    value={selectedMonth}
                    onChange={(e) => {
                      resetViewTransient();
                      setSelectedMonth(e.target.value);
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none sm:w-52 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableMonths.map((mk) => (
                      <option key={mk} value={mk}>
                        {formatMonthOptionLabel(mk, lang)}
                      </option>
                    ))}
                  </select>
                )}

                {viewTab === 'yearly' && (
                  <select
                    aria-label={tr.selectYear}
                    value={selectedCalYear}
                    onChange={(e) => {
                      resetViewTransient();
                      setSelectedCalYear(Number(e.target.value));
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none sm:w-64 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableCalendarYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {formatCalendarYearOptionLabel(yr, lang)}
                      </option>
                    ))}
                  </select>
                )}

                {viewTab === 'tax_year' && (
                  <select
                    aria-label={tr.selectTaxYear}
                    value={selectedTaxYear}
                    onChange={(e) => {
                      resetViewTransient();
                      setSelectedTaxYear(Number(e.target.value));
                    }}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none sm:w-72 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableTaxYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {formatTaxYearOptionLabel(yr, lang)}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  aria-label={tr.nextPeriodAria}
                  disabled={!canStepNext}
                  onClick={() => stepPeriod('next')}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleQuickCompareCurrent}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>{tr.compareWithPrevBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            {/* Compare Granularity Switch */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {tr.compareGranularity}
              </span>
              <div className="grid w-full grid-cols-3 rounded-lg border border-slate-200 bg-white p-0.5 sm:w-auto sm:min-w-[230px] dark:border-slate-700 dark:bg-slate-900">
                {(
                  [
                    { key: 'monthly', label: tr.compareMonths },
                    { key: 'yearly', label: tr.compareYears },
                    { key: 'tax_year', label: tr.compareTaxYears },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => {
                      setExportStatus(null);
                      setCompareScope(g.key);
                    }}
                    className={`truncate whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                      compareScope === g.key
                        ? 'bg-[#16845B] text-white'
                        : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Period A vs Period B Selectors */}
            <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {tr.periodALabel}
                </label>
                {compareScope === 'monthly' && (
                  <select
                    aria-label={tr.periodALabel}
                    value={compareMonthA}
                    onChange={(e) => setCompareMonthA(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableMonths.map((mk) => (
                      <option key={mk} value={mk}>
                        {formatMonthOptionLabel(mk, lang)}
                      </option>
                    ))}
                  </select>
                )}
                {compareScope === 'yearly' && (
                  <select
                    aria-label={tr.periodALabel}
                    value={compareYearA}
                    onChange={(e) => setCompareYearA(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableCalendarYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                )}
                {compareScope === 'tax_year' && (
                  <select
                    aria-label={tr.periodALabel}
                    value={compareTaxYearA}
                    onChange={(e) => setCompareTaxYearA(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableTaxYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {tr.fyPrefix} {yr}–{yr + 1}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={handleSwapCompare}
                title={tr.swapPeriods}
                aria-label={tr.swapPeriods}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 sm:w-9 sm:px-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">{tr.swapPeriods}</span>
              </button>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {tr.periodBLabel}
                </label>
                {compareScope === 'monthly' && (
                  <select
                    aria-label={tr.periodBLabel}
                    value={compareMonthB}
                    onChange={(e) => setCompareMonthB(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableMonths.map((mk) => (
                      <option key={mk} value={mk}>
                        {formatMonthOptionLabel(mk, lang)}
                      </option>
                    ))}
                  </select>
                )}
                {compareScope === 'yearly' && (
                  <select
                    aria-label={tr.periodBLabel}
                    value={compareYearB}
                    onChange={(e) => setCompareYearB(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableCalendarYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                )}
                {compareScope === 'tax_year' && (
                  <select
                    aria-label={tr.periodBLabel}
                    value={compareTaxYearB}
                    onChange={(e) => setCompareTaxYearB(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {availableTaxYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {tr.fyPrefix} {yr}–{yr + 1}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {exportStatus && (
          <p
            className={`mt-3 text-xs font-semibold ${
              exportStatus.type === 'success'
                ? 'text-[#16845B] dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {exportStatus.message}
          </p>
        )}

        {/* 4-up KPI Strip (Standard vs Comparison) */}
        {viewTab !== 'compare' ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {tr.totalIncome}
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                {formatMoney(report.totalIncome, currency)}
              </div>
            </div>

            <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {tr.totalExpense}
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-[#D94848] dark:text-rose-400">
                {formatMoney(report.totalExpense, currency)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {report.netSurplus >= 0 ? tr.netSurplus : tr.netDeficit}
              </div>
              <div
                className={`font-mono-num mt-1 truncate text-base font-extrabold tabular-nums ${
                  report.netSurplus >= 0
                    ? 'text-[#102A43] dark:text-slate-100'
                    : 'text-[#D94848] dark:text-rose-400'
                }`}
              >
                {formatMoney(report.netSurplus, currency)}
              </div>
              {report.totalIncome > 0 && (
                <div className="font-mono-num mt-0.5 text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                  {tr.savingsRate}: {report.savingsRatePct.toFixed(1)}%
                </div>
              )}
            </div>

            <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {tr.closingAssetsJune30}
              </div>
              <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
                {formatMoney(report.totalClosingAssets, currency)}
              </div>
              <div className="mt-0.5 truncate text-[10px] font-medium text-slate-400 dark:text-slate-500">
                {endDateDisplay}
              </div>
            </div>
          </div>
        ) : (
          comparison && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Income Delta */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {tr.totalIncome}
                </div>
                <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {formatMoney(comparison.income.current, currency)}
                </div>
                <div
                  className={`font-mono-num mt-1 flex items-center gap-1 text-[11px] font-bold tabular-nums ${
                    comparison.income.diff >= 0
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-[#D94848] dark:text-rose-400'
                  }`}
                >
                  {comparison.income.diff > 0 ? (
                    <TrendingUp className="h-3 w-3 shrink-0" />
                  ) : comparison.income.diff < 0 ? (
                    <TrendingDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <Minus className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {formatSignedMoney(comparison.income.diff)} (
                    {formatPctChange(comparison.income.pctChange)})
                  </span>
                </div>
              </div>

              {/* Expense Delta (decrease is favorable emerald) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {tr.totalExpense}
                </div>
                <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-[#D94848] dark:text-rose-400">
                  {formatMoney(comparison.expense.current, currency)}
                </div>
                <div
                  className={`font-mono-num mt-1 flex items-center gap-1 text-[11px] font-bold tabular-nums ${
                    comparison.expense.diff <= 0
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-[#D94848] dark:text-rose-400'
                  }`}
                >
                  {comparison.expense.diff > 0 ? (
                    <TrendingUp className="h-3 w-3 shrink-0" />
                  ) : comparison.expense.diff < 0 ? (
                    <TrendingDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <Minus className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {formatSignedMoney(comparison.expense.diff)} (
                    {formatPctChange(comparison.expense.pctChange)})
                  </span>
                </div>
              </div>

              {/* Net Surplus Delta */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {comparison.netSurplus.current >= 0 ? tr.netSurplus : tr.netDeficit}
                </div>
                <div
                  className={`font-mono-num mt-1 truncate text-base font-extrabold tabular-nums ${
                    comparison.netSurplus.current >= 0
                      ? 'text-[#102A43] dark:text-slate-100'
                      : 'text-[#D94848] dark:text-rose-400'
                  }`}
                >
                  {formatMoney(comparison.netSurplus.current, currency)}
                </div>
                <div
                  className={`font-mono-num mt-1 flex items-center gap-1 text-[11px] font-bold tabular-nums ${
                    comparison.netSurplus.diff >= 0
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-[#D94848] dark:text-rose-400'
                  }`}
                >
                  {comparison.netSurplus.diff > 0 ? (
                    <TrendingUp className="h-3 w-3 shrink-0" />
                  ) : comparison.netSurplus.diff < 0 ? (
                    <TrendingDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <Minus className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">
                    {formatSignedMoney(comparison.netSurplus.diff)}
                  </span>
                </div>
              </div>

              {/* Savings Rate & Tx Count Delta */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {tr.savingsRate}
                </div>
                <div className="font-mono-num mt-1 truncate text-base font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
                  {comparison.savingsRatePct.current.toFixed(1)}%
                </div>
                <div
                  className={`font-mono-num mt-1 truncate text-[11px] font-bold tabular-nums ${
                    comparison.savingsRatePct.diffPts >= 0
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-[#D94848] dark:text-rose-400'
                  }`}
                >
                  {comparison.savingsRatePct.diffPts > 0 ? '+' : ''}
                  {comparison.savingsRatePct.diffPts.toFixed(1)} {tr.comparePtsSuffix} ·{' '}
                  {comparison.txCount.current} {tr.entriesCount}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ================== COMPARISON BODY ================== */}
      {viewTab === 'compare' && comparison ? (
        <>
          {/* Side-by-Side Overview Visual Bars */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                {tr.compareOverviewTitle}
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#16845B]" />
                  {comparison.primary.fyLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" />
                  {comparison.baseline.fyLabel}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: tr.totalIncome,
                  cur: comparison.income.current,
                  prev: comparison.income.previous,
                  diff: comparison.income.diff,
                  pct: comparison.income.pctChange,
                  barColor: 'bg-[#16845B]',
                  favorable: comparison.income.diff >= 0,
                },
                {
                  label: tr.totalExpense,
                  cur: comparison.expense.current,
                  prev: comparison.expense.previous,
                  diff: comparison.expense.diff,
                  pct: comparison.expense.pctChange,
                  barColor: 'bg-[#D94848]',
                  favorable: comparison.expense.diff <= 0,
                },
                {
                  label: comparison.netSurplus.current >= 0 ? tr.netSurplus : tr.netDeficit,
                  cur: Math.max(0, comparison.netSurplus.current),
                  prev: Math.max(0, comparison.netSurplus.previous),
                  rawCur: comparison.netSurplus.current,
                  rawPrev: comparison.netSurplus.previous,
                  diff: comparison.netSurplus.diff,
                  pct: comparison.netSurplus.pctChange,
                  barColor: 'bg-sky-600',
                  favorable: comparison.netSurplus.diff >= 0,
                },
              ].map((item) => {
                const maxVal = Math.max(item.cur, item.prev, 1);
                const curPct = Math.min(100, (item.cur / maxVal) * 100);
                const prevPct = Math.min(100, (item.prev / maxVal) * 100);
                const displayCur = item.rawCur !== undefined ? item.rawCur : item.cur;
                const displayPrev = item.rawPrev !== undefined ? item.rawPrev : item.prev;
                return (
                  <div
                    key={item.label}
                    className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#102A43] dark:text-slate-100">
                        {item.label}
                      </span>
                      <span
                        className={`font-mono-num font-bold tabular-nums ${
                          item.favorable
                            ? 'text-[#16845B] dark:text-emerald-400'
                            : 'text-[#D94848] dark:text-rose-400'
                        }`}
                      >
                        {formatSignedMoney(item.diff)} ({formatPctChange(item.pct)})
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          {comparison.primary.fyLabel}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${item.barColor} transition-all duration-300`}
                            style={{ width: `${curPct}%` }}
                          />
                        </div>
                        <span className="font-mono-num w-24 shrink-0 text-right text-xs font-bold tabular-nums text-[#102A43] dark:text-slate-100">
                          {formatMoney(displayCur, currency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {comparison.baseline.fyLabel}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-slate-300 transition-all duration-300 dark:bg-slate-600"
                            style={{ width: `${prevPct}%` }}
                          />
                        </div>
                        <span className="font-mono-num w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                          {formatMoney(displayPrev, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expense Shift Callouts */}
            {(comparison.topExpenseIncrease || comparison.topExpenseDecrease) && (
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-800">
                {comparison.topExpenseIncrease && (
                  <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {tr.compareHigherSpend}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                        {comparison.topExpenseIncrease.category}
                      </span>
                      <span className="font-mono-num shrink-0 text-xs font-extrabold tabular-nums text-[#D94848] dark:text-rose-400">
                        {formatSignedMoney(comparison.topExpenseIncrease.diff)} (
                        {formatPctChange(comparison.topExpenseIncrease.pctChange)})
                      </span>
                    </div>
                  </div>
                )}

                {comparison.topExpenseDecrease && (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {tr.compareLowerSpend}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                        {comparison.topExpenseDecrease.category}
                      </span>
                      <span className="font-mono-num shrink-0 text-xs font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                        {formatSignedMoney(comparison.topExpenseDecrease.diff)} (
                        {formatPctChange(comparison.topExpenseDecrease.pctChange)})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category-by-Category Comparison */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                {tr.compareCategoryTitle}
              </h3>

              <div className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
                {(
                  [
                    { key: 'expense', label: tr.expenseTab },
                    { key: 'income', label: tr.incomeTab },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCompareCatType(tab.key)}
                    className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                      compareCatType === tab.key
                        ? 'bg-[#16845B] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const rows =
                compareCatType === 'expense'
                  ? comparison.expenseCategories
                  : comparison.incomeCategories;
              if (rows.length === 0) {
                return (
                  <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    {tr.compareNoCategoryData}
                  </p>
                );
              }
              const maxCatAmt = rows.reduce(
                (m, r) => Math.max(m, r.currentAmount, r.previousAmount),
                1
              );

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row) => {
                    const style = getCategoryStyle(
                      categoryStyles,
                      compareCatType === 'expense' ? 'exp' : 'inc',
                      row.category
                    );
                    const favorable =
                      compareCatType === 'expense' ? row.diff <= 0 : row.diff >= 0;
                    const curW = Math.min(100, (row.currentAmount / maxCatAmt) * 100);
                    const prevW = Math.min(100, (row.previousAmount / maxCatAmt) * 100);

                    return (
                      <div key={row.category} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <CategoryIconBadge style={style} size="sm" />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                {row.category}
                              </div>
                              <div className="font-mono-num text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                                {formatMoney(row.currentAmount, currency)} {tr.compareVsLabel}{' '}
                                {formatMoney(row.previousAmount, currency)}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`font-mono-num flex shrink-0 items-center gap-1 text-xs font-extrabold tabular-nums ${
                              row.diff === 0
                                ? 'text-slate-500 dark:text-slate-400'
                                : favorable
                                ? 'text-[#16845B] dark:text-emerald-400'
                                : 'text-[#D94848] dark:text-rose-400'
                            }`}
                          >
                            {row.diff > 0 ? (
                              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                            ) : row.diff < 0 ? (
                              <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>{formatSignedMoney(row.diff)}</span>
                            <span className="text-[10px] font-bold opacity-85">
                              ({formatPctChange(row.pctChange)})
                            </span>
                          </div>
                        </div>

                        {/* Proportional comparison bars */}
                        <div className="mt-2 space-y-1 pl-9">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className={`h-full rounded-full ${
                                compareCatType === 'expense' ? 'bg-[#D94848]' : 'bg-[#16845B]'
                              }`}
                              style={{ width: `${curW}%` }}
                            />
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-slate-300 dark:bg-slate-600"
                              style={{ width: `${prevW}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      ) : (
        /* ================== SINGLE PERIOD REPORT BODY ================== */
        <>
          {/* Monthly Trend Bar Chart (Yearly & Tax Year only) */}
          {report.monthlyTrend && report.monthlyTrend.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {tr.monthlyBreakdownTitle}
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#16845B]" />
                    {tr.incomeTab}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#D94848]" />
                    {tr.expenseTab}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="grid min-w-[540px] grid-cols-12 items-end gap-2 pt-2">
                  {report.monthlyTrend.map((m) => {
                    const incH =
                      monthlyTrendMax > 0
                        ? Math.max(m.income > 0 ? 6 : 0, (m.income / monthlyTrendMax) * 100)
                        : 0;
                    const expH =
                      monthlyTrendMax > 0
                        ? Math.max(m.expense > 0 ? 6 : 0, (m.expense / monthlyTrendMax) * 100)
                        : 0;

                    return (
                      <button
                        key={m.monthKey}
                        type="button"
                        title={`${formatMonthShortLabel(m.monthKey, lang)} · ${tr.incomeTab}: ${formatMoney(m.income, currency)} · ${tr.expenseTab}: ${formatMoney(m.expense, currency)}`}
                        onClick={() => {
                          setSelectedMonth(m.monthKey);
                          setViewTab('monthly');
                          resetViewTransient();
                        }}
                        className="group flex flex-col items-center rounded-lg p-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70"
                      >
                        <div className="flex h-24 w-full items-end justify-center gap-1 border-b border-slate-200 pb-1 dark:border-slate-700">
                          <div
                            className="w-2.5 rounded-t bg-[#16845B] transition-all group-hover:opacity-85"
                            style={{ height: `${incH}%` }}
                          />
                          <div
                            className="w-2.5 rounded-t bg-[#D94848] transition-all group-hover:opacity-85"
                            style={{ height: `${expH}%` }}
                          />
                        </div>
                        <span className="mt-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                          {m.shortLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pie Charts Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Income Pie Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {tr.incomePieTitle}
                </h3>
                <span className="font-mono-num text-sm font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {formatMoney(report.totalIncome, currency)}
                </span>
              </div>

              {report.incomeCategories.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  {tr.noIncomeInYear}
                </p>
              ) : (
                <>
                  <div className="my-2">
                    <CategoryPieChart
                      items={report.incomeCategories.map((c) => [c.category, c.amount])}
                      total={report.totalIncome}
                      palette={INCOME_PALETTE}
                      colorMap={incomeColorMap}
                      currency={currency}
                      totalLabel={tr.totalIncome}
                      activeCategory={activeIncomeCat}
                      onSelectCategory={setActiveIncomeCat}
                      didSwipeRef={noopDidSwipeRef}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {report.incomeCategories.map((c) => {
                      const isActive = activeIncomeCat === c.category;
                      const style = getCategoryStyle(categoryStyles, 'inc', c.category);
                      return (
                        <button
                          key={c.category}
                          type="button"
                          onClick={() =>
                            setActiveIncomeCat((prev) =>
                              prev === c.category ? null : c.category
                            )
                          }
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'border-[#16845B] bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30'
                              : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <CategoryIconBadge style={style} size="sm" />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                {c.category}
                              </div>
                              <div className="font-mono-num text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                                {c.count} {tr.entriesCount} · {c.pct.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-num shrink-0 text-xs font-bold tabular-nums text-[#16845B] dark:text-emerald-400">
                            {formatMoney(c.amount, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Expense Pie Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {tr.expensePieTitle}
                </h3>
                <span className="font-mono-num text-sm font-extrabold tabular-nums text-[#D94848] dark:text-rose-400">
                  {formatMoney(report.totalExpense, currency)}
                </span>
              </div>

              {report.expenseCategories.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  {tr.noExpenseInYear}
                </p>
              ) : (
                <>
                  <div className="my-2">
                    <CategoryPieChart
                      items={report.expenseCategories.map((c) => [c.category, c.amount])}
                      total={report.totalExpense}
                      palette={EXPENSE_PALETTE}
                      colorMap={expenseColorMap}
                      currency={currency}
                      totalLabel={tr.totalExpense}
                      activeCategory={activeExpenseCat}
                      onSelectCategory={setActiveExpenseCat}
                      didSwipeRef={noopDidSwipeRef}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    {report.expenseCategories.map((c) => {
                      const isActive = activeExpenseCat === c.category;
                      const style = getCategoryStyle(categoryStyles, 'exp', c.category);
                      return (
                        <div
                          key={c.category}
                          className={`rounded-xl border transition-colors ${
                            isActive
                              ? 'border-rose-400 bg-rose-50/60 dark:border-rose-600 dark:bg-rose-950/30'
                              : 'border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveExpenseCat((prev) =>
                                prev === c.category ? null : c.category
                              )
                            }
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <CategoryIconBadge style={style} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                  {c.category}
                                </div>
                                <div className="font-mono-num text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                                  {c.count} {tr.entriesCount} · {c.pct.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <span className="font-mono-num shrink-0 text-xs font-bold tabular-nums text-[#D94848] dark:text-rose-400">
                              {formatMoney(c.amount, currency)}
                            </span>
                          </button>

                          {c.subCategories.length > 0 && (
                            <div className="space-y-1 border-t border-slate-200/70 px-3 py-1.5 dark:border-slate-800">
                              {c.subCategories.map((sub) => (
                                <div
                                  key={sub.name}
                                  className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400"
                                >
                                  <span className="truncate pl-2">↳ {sub.name}</span>
                                  <span className="font-mono-num shrink-0 font-semibold tabular-nums">
                                    {formatMoney(sub.amount, currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Detailed Income & Expense Ledger */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                {tr.detailedLedgerTitle}
              </h3>
              <div className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
                {(
                  [
                    {
                      key: 'all',
                      label: `${tr.allEntriesTab} (${
                        report.incomeTransactions.length + report.expenseTransactions.length
                      })`,
                    },
                    {
                      key: 'income',
                      label: `${tr.incomeTab} (${report.incomeTransactions.length})`,
                    },
                    {
                      key: 'expense',
                      label: `${tr.expenseTab} (${report.expenseTransactions.length})`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLedgerFilter(tab.key)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      ledgerFilter === tab.key
                        ? 'bg-[#16845B] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredLedgerRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {tr.noLedgerRows}
              </p>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredLedgerRows.map((row) => {
                  const isInc = row.type === 'income';
                  const style = isInc
                    ? getCategoryStyle(categoryStyles, 'inc', row.category)
                    : getExpenseOrSubCategoryStyle(
                        categoryStyles,
                        row.category,
                        row.subCategory
                      );
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <CategoryIconBadge style={style} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                            {row.title}
                          </div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {row.displayDate} · {row.category}
                            {row.subCategory ? ` (${row.subCategory})` : ''} · {row.account}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-mono-num shrink-0 text-xs font-extrabold tabular-nums ${
                          isInc
                            ? 'text-[#16845B] dark:text-emerald-400'
                            : 'text-[#D94848] dark:text-rose-400'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatMoney(row.amount, currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Closing Wallet & Savings Balances */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {tr.closingBalancesTitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{endDateDisplay}</p>
              </div>
              <span className="font-mono-num rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-extrabold tabular-nums text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                {tr.totalClosingLabel}: {formatMoney(report.totalClosingAssets, currency)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Wallets */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] dark:text-slate-100">
                    <Wallet className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
                    <span>{tr.walletsGroup}</span>
                  </div>
                  <span className="font-mono-num text-xs font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                    {formatMoney(report.totalClosingWallets, currency)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {report.closingWallets.map((w) => (
                    <div
                      key={w.name}
                      className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span className="truncate font-medium">{w.name}</span>
                      <span className="font-mono-num shrink-0 font-bold tabular-nums text-[#102A43] dark:text-slate-100">
                        {formatMoney(w.balance, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Savings & Investments */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#102A43] dark:text-slate-100">
                    <Landmark className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span>{tr.savingsGroup}</span>
                  </div>
                  <span className="font-mono-num text-xs font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
                    {formatMoney(report.totalClosingSavings, currency)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {report.closingSavings.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <span className="truncate font-medium">{s.name}</span>
                      <span className="font-mono-num shrink-0 font-bold tabular-nums text-[#102A43] dark:text-slate-100">
                        {formatMoney(s.balance, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lent & Borrowed Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {tr.lendBorrowTitle}
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {endDateDisplay}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr.lentInYear}
                </div>
                <div className="font-mono-num mt-1 text-sm font-bold tabular-nums text-[#102A43] dark:text-slate-100">
                  {formatMoney(report.lendBorrow.lentInYear, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr.recoveredInYear}
                </div>
                <div className="font-mono-num mt-1 text-sm font-bold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {formatMoney(report.lendBorrow.lentRecoveredInYear, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
                <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                  {tr.receivableJune30}
                </div>
                <div className="font-mono-num mt-1 text-sm font-extrabold tabular-nums text-sky-700 dark:text-sky-400">
                  {formatMoney(report.lendBorrow.outstandingReceivableAsOfJune30, currency)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr.borrowedInYear}
                </div>
                <div className="font-mono-num mt-1 text-sm font-bold tabular-nums text-[#102A43] dark:text-slate-100">
                  {formatMoney(report.lendBorrow.borrowedInYear, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr.repaidInYear}
                </div>
                <div className="font-mono-num mt-1 text-sm font-bold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {formatMoney(report.lendBorrow.repaidInYear, currency)}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {tr.payableJune30}
                </div>
                <div className="font-mono-num mt-1 text-sm font-extrabold tabular-nums text-amber-700 dark:text-amber-400">
                  {formatMoney(report.lendBorrow.outstandingPayableAsOfJune30, currency)}
                </div>
              </div>
            </div>

            {report.lendBorrow.openReceivables.length === 0 &&
            report.lendBorrow.openPayables.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {tr.noOpenLendBorrow}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {report.lendBorrow.openReceivables.length > 0 && (
                  <div className="rounded-xl border border-sky-200/70 bg-sky-50/30 p-3 dark:border-sky-900/40 dark:bg-sky-950/15">
                    <div className="mb-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                      {tr.openReceivables}
                    </div>
                    <div className="space-y-1.5">
                      {report.lendBorrow.openReceivables.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#102A43] dark:text-slate-100">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {item.date} · {item.account}
                            </div>
                          </div>
                          <span className="font-mono-num shrink-0 font-bold tabular-nums text-sky-700 dark:text-sky-400">
                            {formatMoney(item.dueAmount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.lendBorrow.openPayables.length > 0 && (
                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 p-3 dark:border-amber-900/40 dark:bg-amber-950/15">
                    <div className="mb-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                      {tr.openPayables}
                    </div>
                    <div className="space-y-1.5">
                      {report.lendBorrow.openPayables.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#102A43] dark:text-slate-100">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {item.date} · {item.account}
                            </div>
                          </div>
                          <span className="font-mono-num shrink-0 font-bold tabular-nums text-amber-700 dark:text-amber-400">
                            {formatMoney(item.dueAmount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
