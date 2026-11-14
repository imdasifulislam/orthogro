import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarRange,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Landmark,
  Wallet,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryStyle, CurrencySymbol, Transaction } from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';
import { formatDisplayDate, formatMoney } from '../utils/format';
import {
  computeTaxYearReportData,
  downloadTaxYearCsv,
  downloadTaxYearPdf,
  formatTaxYearOptionLabel,
  getAvailableTaxYears,
} from '../utils/taxReport';
import { CategoryPieChart } from './CategoryPieChart';

interface TaxReportViewProps {
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  categoryStyles: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  onBack: () => void;
}

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
}) => {
  const { lang, t } = useTranslation();
  const tr = t.taxReport;

  const availableYears = useMemo(() => getAvailableTaxYears(transactions), [transactions]);
  const [selectedStartYear, setSelectedStartYear] = useState<number>(
    () => availableYears[0] ?? new Date().getFullYear()
  );

  const [activeIncomeCat, setActiveIncomeCat] = useState<string | null>(null);
  const [activeExpenseCat, setActiveExpenseCat] = useState<string | null>(null);
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const noopDidSwipeRef = useRef(false);

  const report = useMemo(
    () =>
      computeTaxYearReportData({
        startYear: selectedStartYear,
        transactions,
        wallets,
        savingsList,
        categoryStyles,
        lang,
      }),
    [selectedStartYear, transactions, wallets, savingsList, categoryStyles, lang]
  );

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

  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportStatus(null);
    try {
      await downloadTaxYearPdf(report, currency, lang);
      setExportStatus({ type: 'success', message: tr.pdfSuccess });
    } catch {
      setExportStatus({ type: 'error', message: tr.pdfError });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    setExportStatus(null);
    downloadTaxYearCsv(report, currency, lang);
    setExportStatus({ type: 'success', message: tr.csvSuccess });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.settings.backToSettings}
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <FileBarChart2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">{tr.title}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] disabled:opacity-60 sm:flex-none whitespace-nowrap"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span>{isExportingPdf ? tr.generatingPdf : tr.downloadPdf}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-50 sm:flex-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
              <span>{tr.downloadCsv}</span>
            </button>
          </div>
        </div>

        {/* Fiscal Year Picker */}
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <CalendarRange className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
            <span>{tr.selectTaxYear}</span>
          </div>
          <select
            aria-label={tr.selectTaxYear}
            value={selectedStartYear}
            onChange={(e) => {
              setSelectedStartYear(Number(e.target.value));
              setActiveIncomeCat(null);
              setActiveExpenseCat(null);
              setExportStatus(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {formatTaxYearOptionLabel(yr, lang)}
              </option>
            ))}
          </select>
        </div>

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

        {/* 4-up KPI Summary Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {tr.totalIncome}
            </div>
            <div className="font-mono-num mt-1 truncate text-base font-extrabold text-[#16845B] dark:text-emerald-400">
              {formatMoney(report.totalIncome, currency)}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200/80 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {tr.totalExpense}
            </div>
            <div className="font-mono-num mt-1 truncate text-base font-extrabold text-[#D94848] dark:text-rose-400">
              {formatMoney(report.totalExpense, currency)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {report.netSurplus >= 0 ? tr.netSurplus : tr.netDeficit}
            </div>
            <div
              className={`font-mono-num mt-1 truncate text-base font-extrabold ${
                report.netSurplus >= 0
                  ? 'text-[#102A43] dark:text-slate-100'
                  : 'text-[#D94848] dark:text-rose-400'
              }`}
            >
              {formatMoney(report.netSurplus, currency)}
            </div>
            {report.totalIncome > 0 && (
              <div className="font-mono-num mt-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {tr.savingsRate}: {report.savingsRatePct.toFixed(1)}%
              </div>
            )}
          </div>

          <div className="rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {tr.closingAssetsJune30}
            </div>
            <div className="font-mono-num mt-1 truncate text-base font-extrabold text-sky-700 dark:text-sky-400">
              {formatMoney(report.totalClosingAssets, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Pie Charts Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Income Pie Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
              {tr.incomePieTitle}
            </h3>
            <span className="font-mono-num text-sm font-extrabold text-[#16845B] dark:text-emerald-400">
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
                        setActiveIncomeCat((prev) => (prev === c.category ? null : c.category))
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
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {c.count} {tr.entriesCount} · {c.pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <span className="font-mono-num shrink-0 text-xs font-bold text-[#16845B] dark:text-emerald-400">
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
            <span className="font-mono-num text-sm font-extrabold text-[#D94848] dark:text-rose-400">
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
                          setActiveExpenseCat((prev) => (prev === c.category ? null : c.category))
                        }
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <CategoryIconBadge style={style} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                              {c.category}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {c.count} {tr.entriesCount} · {c.pct.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-num shrink-0 text-xs font-bold text-[#D94848] dark:text-rose-400">
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
                              <span className="font-mono-num shrink-0 font-semibold">
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
                { key: 'income', label: `${tr.incomeTab} (${report.incomeTransactions.length})` },
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
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
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
              const style = getCategoryStyle(
                categoryStyles,
                isInc ? 'inc' : 'exp',
                row.category
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
                    className={`font-mono-num shrink-0 text-xs font-extrabold ${
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

      {/* Closing Wallet & Savings Balances as of June 30 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
              {tr.closingBalancesTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {formatDisplayDate(report.endDate, lang)}
            </p>
          </div>
          <span className="font-mono-num rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-extrabold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
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
              <span className="font-mono-num text-xs font-extrabold text-[#16845B] dark:text-emerald-400">
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
                  <span className="font-mono-num shrink-0 font-bold text-[#102A43] dark:text-slate-100">
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
              <span className="font-mono-num text-xs font-extrabold text-sky-700 dark:text-sky-400">
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
                  <span className="font-mono-num shrink-0 font-bold text-[#102A43] dark:text-slate-100">
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
        <div className="mb-4 flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
            {tr.lendBorrowTitle}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr.lentInYear}</div>
            <div className="font-mono-num mt-1 text-sm font-bold text-[#102A43] dark:text-slate-100">
              {formatMoney(report.lendBorrow.lentInYear, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr.recoveredInYear}
            </div>
            <div className="font-mono-num mt-1 text-sm font-bold text-[#16845B] dark:text-emerald-400">
              {formatMoney(report.lendBorrow.lentRecoveredInYear, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
              {tr.receivableJune30}
            </div>
            <div className="font-mono-num mt-1 text-sm font-extrabold text-sky-700 dark:text-sky-400">
              {formatMoney(report.lendBorrow.outstandingReceivableAsOfJune30, currency)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr.borrowedInYear}
            </div>
            <div className="font-mono-num mt-1 text-sm font-bold text-[#102A43] dark:text-slate-100">
              {formatMoney(report.lendBorrow.borrowedInYear, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{tr.repaidInYear}</div>
            <div className="font-mono-num mt-1 text-sm font-bold text-[#16845B] dark:text-emerald-400">
              {formatMoney(report.lendBorrow.repaidInYear, currency)}
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              {tr.payableJune30}
            </div>
            <div className="font-mono-num mt-1 text-sm font-extrabold text-amber-700 dark:text-amber-400">
              {formatMoney(report.lendBorrow.outstandingPayableAsOfJune30, currency)}
            </div>
          </div>
        </div>

        {report.lendBorrow.openReceivables.length === 0 &&
        report.lendBorrow.openPayables.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{tr.noOpenLendBorrow}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.lendBorrow.openReceivables.length > 0 && (
              <div className="rounded-xl border border-sky-200/70 bg-sky-50/30 p-3 dark:border-sky-900/40 dark:bg-sky-950/15">
                <div className="mb-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                  {tr.openReceivables}
                </div>
                <div className="space-y-1.5">
                  {report.lendBorrow.openReceivables.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#102A43] dark:text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.date} · {item.account}
                        </div>
                      </div>
                      <span className="font-mono-num shrink-0 font-bold text-sky-700 dark:text-sky-400">
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
                    <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#102A43] dark:text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.date} · {item.account}
                        </div>
                      </div>
                      <span className="font-mono-num shrink-0 font-bold text-amber-700 dark:text-amber-400">
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
    </div>
  );
};
