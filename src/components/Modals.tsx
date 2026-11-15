import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  GitMerge,
  GripVertical,
  Info,
  Palette,
  Pencil,
  PiggyBank,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  BudgetGoal,
  CategoryKind,
  CategoryStyle,
  ConfirmDialogState,
  CurrencySymbol,
  DrilldownType,
  FilterCardKey,
  GridKey,
  PeriodFilter,
  SavingGoal,
  SavingGoalPeriodType,
  ToastMessage,
  Transaction,
} from '../types';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIconBadge,
  getCategoryStyle,
} from '../utils/categoryVisuals';
import {
  computeSavingGoalProgress,
  filterTransactionsByPeriod,
  formatMoney,
  getTodayISO,
} from '../utils/format';

/* --- Toast Container --- */
export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[70] flex w-full max-w-xs flex-col gap-2 px-4 sm:px-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-semibold shadow-lg backdrop-blur-md ${
            t.type === 'error'
              ? 'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-900 dark:bg-rose-950/95 dark:text-rose-200'
              : t.type === 'info'
              ? 'border-sky-200 bg-sky-50/95 text-sky-900 dark:border-sky-900 dark:bg-sky-950/95 dark:text-sky-200'
              : 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/95 dark:text-emerald-200'
          }`}
        >
          {t.type === 'error' ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : t.type === 'info' ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="opacity-60 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

/* --- Confirm Modal --- */
export const ConfirmModal: React.FC<{
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}> = ({ dialog, onClose }) => {
  const { t } = useTranslation();
  if (!dialog) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
          {dialog.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {dialog.message}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={async () => {
              await dialog.onConfirm();
              onClose();
            }}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-bold text-white ${
              dialog.destructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-[#16845B] hover:bg-[#126B4A]'
            }`}
          >
            {dialog.confirmLabel || t.common.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Filter Period Modal --- */
export const FilterPeriodModal: React.FC<{
  activeFilterCard: FilterCardKey | null;
  filters: Record<FilterCardKey, PeriodFilter>;
  customDateFrom: string;
  customDateTo: string;
  setCustomDateFrom: (v: string) => void;
  setCustomDateTo: (v: string) => void;
  onSelectPeriod: (card: FilterCardKey, period: PeriodFilter) => void;
  onApplyCustom: (card: FilterCardKey) => void;
  onClose: () => void;
}> = ({
  activeFilterCard,
  filters,
  customDateFrom,
  customDateTo,
  setCustomDateFrom,
  setCustomDateTo,
  onSelectPeriod,
  onApplyCustom,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!activeFilterCard) return null;
  const current = filters[activeFilterCard];

  const isCategoryCard =
    activeFilterCard === 'categoryReport' || activeFilterCard === 'categoryPieChart';

  const presets: Array<{ key: PeriodFilter; label: string }> = isCategoryCard
    ? [
        { key: 'monthly', label: t.common.monthlyByMonth },
        { key: 'yearly', label: t.common.yearlyByYear },
        { key: 'all', label: t.common.allTime },
      ]
    : [
        { key: 'all', label: t.common.allTime },
        { key: 'monthly', label: t.common.thisMonth },
        { key: 'previous_month', label: t.common.previousMonth },
        { key: 'yearly', label: t.common.currentYear },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
            {t.modals.selectTimePeriod}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPeriod(activeFilterCard, p.key)}
              className={`min-h-[42px] w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                current === p.key
                  ? 'bg-[#16845B] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t.modals.customDateRange}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.modals.startDateLabel}
              </label>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {t.modals.endDateLabel}
              </label>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onApplyCustom(activeFilterCard)}
            className="mt-2.5 min-h-[40px] w-full rounded-xl bg-[#102A43] py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            {t.modals.applyCustomRange}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Drilldown Modal --- */
export const DrilldownModal: React.FC<{
  drilldownType: DrilldownType | null;
  drilldownKey: string | null;
  drilldownFilter: PeriodFilter;
  setDrilldownFilter: (f: PeriodFilter) => void;
  transactions: Transaction[];
  currency: CurrencySymbol;
  customDateFrom: string;
  customDateTo: string;
  onStartBalanceCorrection: (accountName: string) => void;
  onInspectDebt: (tx: Transaction) => void;
  onClose: () => void;
}> = ({
  drilldownType,
  drilldownKey,
  drilldownFilter,
  setDrilldownFilter,
  transactions,
  currency,
  customDateFrom,
  customDateTo,
  onStartBalanceCorrection,
  onInspectDebt,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!drilldownType) return null;

  let filtered = transactions.filter((tx) => {
    if (drilldownType === 'wallet' || drilldownType === 'savings') {
      return (
        tx.wallet === drilldownKey ||
        (tx.type === 'transfer' &&
          (tx.fromWallet === drilldownKey || tx.toWallet === drilldownKey))
      );
    }
    if (drilldownType === 'income') {
      return tx.type === 'income' || (tx.type === 'adjustment' && tx.amount > 0);
    }
    if (drilldownType === 'expense') {
      return tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0);
    }
    if (drilldownType === 'lend') return tx.type === 'lend';
    if (drilldownType === 'borrow') return tx.type === 'borrow';
    return true;
  });

  filtered = filterTransactionsByPeriod(filtered, drilldownFilter, customDateFrom, customDateTo);

  const typeTitle =
    drilldownType === 'netWorth'
      ? t.dashboard.netWorth
      : drilldownType === 'income'
      ? t.common.income
      : drilldownType === 'expense'
      ? t.common.expense
      : drilldownType === 'lend'
      ? t.common.lend
      : drilldownType === 'borrow'
      ? t.common.borrow
      : drilldownType.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[82vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="truncate text-base font-bold text-[#16845B] dark:text-emerald-400">
            {drilldownKey || typeTitle}
          </h3>
          <select
            value={drilldownFilter}
            onChange={(e) => setDrilldownFilter(e.target.value as PeriodFilter)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">{t.common.allTime}</option>
            <option value="monthly">{t.common.thisMonth}</option>
            <option value="previous_month">{t.common.prevMonthShort}</option>
            <option value="yearly">{t.common.thisYear}</option>
          </select>
        </div>

        {(drilldownType === 'wallet' || drilldownType === 'savings') && drilldownKey && (
          <button
            type="button"
            onClick={() => onStartBalanceCorrection(drilldownKey)}
            className="mb-3 min-h-[40px] w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-2 text-xs font-bold text-[#102A43] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {t.modals.correctAccountBalance}
          </button>
        )}

        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              {t.modals.noTxForFilter}
            </p>
          ) : (
            filtered.map((tx) => {
              const isDebt = tx.type === 'lend' || tx.type === 'borrow';
              const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;
              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    if (isDebt) {
                      onClose();
                      onInspectDebt(tx);
                    }
                  }}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    isDebt
                      ? 'cursor-pointer rounded-lg px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {tx.title}
                      {isDebt ? ` (${t.txItem.due}: ${formatMoney(due, currency)})` : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {tx.date} · {tx.wallet || tx.fromWallet}
                      {isDebt ? ` · ${t.modals.tapForHistory}` : ''}
                    </div>
                  </div>
                  <div
                    className={`font-mono-num shrink-0 text-sm font-bold ${
                      tx.type === 'expense' || tx.type === 'lend'
                        ? 'text-[#D94848] dark:text-rose-400'
                        : 'text-[#16845B] dark:text-emerald-400'
                    }`}
                  >
                    {tx.type === 'expense' || tx.type === 'lend' ? '-' : '+'}
                    {formatMoney(Math.abs(tx.amount), currency)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
};

/* --- Debt History Modal --- */
export const DebtHistoryModal: React.FC<{
  item: Transaction | null;
  allTransactions: Transaction[];
  currency: CurrencySymbol;
  onStartPayment: (tx: Transaction) => void;
  onClose: () => void;
}> = ({ item, allTransactions, currency, onStartPayment, onClose }) => {
  const { t } = useTranslation();
  if (!item) return null;
  const due = item.remainingBalance !== undefined ? item.remainingBalance : item.amount;
  const payments = allTransactions.filter(
    (tx) => tx.type === 'partial_payment' && tx.parentId === item.id
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#16845B] dark:text-emerald-400">
          {item.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.original}: {formatMoney(item.amount, currency)} · {t.modals.remainingDue}:{' '}
          {formatMoney(due, currency)}
        </p>

        <h4 className="mt-4 mb-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {t.modals.paymentHistory}
        </h4>

        {payments.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {t.modals.noPartialPayments}
          </p>
        ) : (
          <div className="max-h-52 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <div className="font-mono-num font-bold text-[#102A43] dark:text-slate-100">
                    {formatMoney(p.amount, currency)}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {p.date} · {p.wallet}
                  </div>
                </div>
                <span className="font-semibold text-[#16845B] dark:text-emerald-400">
                  {t.modals.paid}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {!item.resolved && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartPayment(item);
              }}
              className="min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
            >
              {t.modals.recordPaymentSettle}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Resolve Debt Modal --- */
export const ResolveDebtModal: React.FC<{
  resolvingTx: Transaction | null;
  partialDate: string;
  setPartialDate: (d: string) => void;
  partialAmount: string;
  setPartialAmount: (a: string) => void;
  resolveWallet: string;
  setResolveWallet: (w: string) => void;
  allAccountOptions: string[];
  currency: CurrencySymbol;
  onConfirm: () => void;
  onClose: () => void;
}> = ({
  resolvingTx,
  partialDate,
  setPartialDate,
  partialAmount,
  setPartialAmount,
  resolveWallet,
  setResolveWallet,
  allAccountOptions,
  currency,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!resolvingTx) return null;
  const due =
    resolvingTx.remainingBalance !== undefined
      ? resolvingTx.remainingBalance
      : resolvingTx.amount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#16845B] dark:text-emerald-400">
          {resolvingTx.type === 'lend'
            ? t.modals.receivePaymentLent
            : t.modals.payDebtBorrowed}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.remainingDueLabel}{' '}
          <strong className="font-mono-num">{formatMoney(due, currency)}</strong>
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.paymentDate}
            </label>
            <input
              type="date"
              value={partialDate}
              onChange={(e) => setPartialDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.paymentAmount} ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.walletAccount}
            </label>
            <select
              value={resolveWallet}
              onChange={(e) => setResolveWallet(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {allAccountOptions.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
          >
            {t.modals.confirmPayment}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Correct Balance Modal --- */
export const CorrectBalanceModal: React.FC<{
  accountName: string | null;
  previousBalance: number;
  inputVal: string;
  setInputVal: (v: string) => void;
  currency: CurrencySymbol;
  onSave: () => void;
  onClose: () => void;
}> = ({ accountName, previousBalance, inputVal, setInputVal, currency, onSave, onClose }) => {
  const { t } = useTranslation();
  if (!accountName) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#16845B] dark:text-emerald-400">
          {t.modals.correctBalanceTitle}: {accountName}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.previousBalance}{' '}
          <strong className="font-mono-num text-[#102A43] dark:text-slate-100">
            {formatMoney(previousBalance, currency)}
          </strong>
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.modals.newCorrectBalance} ({currency})
          </label>
          <input
            type="number"
            step="any"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onSave}
            className="min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
          >
            {t.modals.saveCorrection}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Edit Item Name Modal --- */
export const EditNameModal: React.FC<{
  editingItem: { listType: string; oldName: string; parentCategory?: string } | null;
  val: string;
  setVal: (v: string) => void;
  previewStyle?: CategoryStyle;
  onEditStyle?: () => void;
  onStartMerge?: () => void;
  onSave: () => void;
  onClose: () => void;
}> = ({
  editingItem,
  val,
  setVal,
  previewStyle,
  onEditStyle,
  onStartMerge,
  onSave,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!editingItem) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
          {t.modals.renameTitle} "{editingItem.oldName}"
        </h3>
        <input
          type="text"
          maxLength={100}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />

        {(onEditStyle || onStartMerge) && (
          <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            {previewStyle && onEditStyle && (
              <button
                type="button"
                onClick={onEditStyle}
                className="flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#102A43] hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-2.5">
                  <CategoryIconBadge style={previewStyle} size="sm" />
                  <span>{t.modals.changeIconColor}</span>
                </span>
                <Palette className="h-4 w-4 text-slate-400" />
              </button>
            )}
            {onStartMerge && (
              <button
                type="button"
                onClick={onStartMerge}
                className="flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-sky-400 dark:hover:bg-sky-950/30"
              >
                <span>{t.modals.mergeCategoryOption}</span>
                <GitMerge className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="min-h-[40px] rounded-xl bg-[#16845B] px-5 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
          >
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Merge Category Modal --- */
export const MergeCategoryModal: React.FC<{
  mergeTarget: {
    listType: 'exp_cat' | 'inc_cat';
    categoryName: string;
    txCount: number;
  } | null;
  targetCategory: string;
  setTargetCategory: (cat: string) => void;
  availableCategories: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  onConfirmMerge: () => void;
  onClose: () => void;
}> = ({
  mergeTarget,
  targetCategory,
  setTargetCategory,
  availableCategories,
  categoryStyles,
  onConfirmMerge,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!mergeTarget) return null;

  const kind: CategoryKind = mergeTarget.listType === 'exp_cat' ? 'exp' : 'inc';
  const sourceStyle = getCategoryStyle(categoryStyles, kind, mergeTarget.categoryName);
  const destinationStyle = targetCategory
    ? getCategoryStyle(categoryStyles, kind, targetCategory)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <GitMerge className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.modals.mergeCategoryTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
          <CategoryIconBadge style={sourceStyle} size="sm" />
          <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
            {mergeTarget.categoryName}
          </span>
        </div>

        {mergeTarget.txCount > 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>"{mergeTarget.categoryName}"</strong> {t.modals.mergeInUseWarningPrefix}{' '}
            <strong>{mergeTarget.txCount}</strong> {t.modals.mergeInUseWarningSuffix}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {t.modals.mergeGenericDesc} <strong>"{mergeTarget.categoryName}"</strong>.
          </p>
        )}

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.modals.mergeIntoLabel}
          </label>
          <div className="flex items-center gap-2">
            {destinationStyle && <CategoryIconBadge style={destinationStyle} size="md" />}
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {availableCategories
                .filter((cat) => cat !== mergeTarget.categoryName)
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={!targetCategory || targetCategory === mergeTarget.categoryName}
            onClick={onConfirmMerge}
            className="min-h-[42px] w-full rounded-xl bg-sky-700 py-2 text-xs font-bold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {t.modals.mergeAndDeleteBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Transfer Before Account Delete Modal --- */
export const TransferDeleteModal: React.FC<{
  accountToDelete: { name: string; isSavings: boolean } | null;
  targetAccount: string;
  setTargetAccount: (a: string) => void;
  allAccountOptions: string[];
  onConfirmTransferDelete: () => void;
  onClose: () => void;
}> = ({
  accountToDelete,
  targetAccount,
  setTargetAccount,
  allAccountOptions,
  onConfirmTransferDelete,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!accountToDelete) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
          {t.modals.transferHistoryTitle}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <strong>"{accountToDelete.name}"</strong> {t.modals.transferHistoryMsgPrefix}
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {t.modals.transferHistoryTo}
          </label>
          <select
            value={targetAccount}
            onChange={(e) => setTargetAccount(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {allAccountOptions
              .filter((acc) => acc !== accountToDelete.name)
              .map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
          </select>
        </div>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirmTransferDelete}
            className="min-h-[42px] w-full rounded-xl bg-sky-700 py-2 text-xs font-bold text-white hover:bg-sky-800"
          >
            {t.modals.transferAndDelete}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* --- Customize Home Grids Modal --- */
export const CustomizeGridsModal: React.FC<{
  open: boolean;
  gridOrder: GridKey[];
  visibleGrids: Record<GridKey, boolean>;
  showAssistantButton: boolean;
  onToggleGrid: (key: GridKey) => void;
  onToggleAssistantButton: () => void;
  onReorderGrids: (newOrder: GridKey[]) => void;
  onClose: () => void;
}> = ({
  open,
  gridOrder,
  visibleGrids,
  showAssistantButton,
  onToggleGrid,
  onToggleAssistantButton,
  onReorderGrids,
  onClose,
}) => {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (!open) return null;

  const labels: Record<GridKey, string> = {
    netWorth: t.modals.gridNetWorth,
    wallets: t.modals.gridWallets,
    savings: t.modals.gridSavings,
    incExp: t.modals.gridIncExp,
    lendBorrow: t.modals.gridLendBorrow,
    budgetGoals: t.modals.gridBudgetGoals,
    categoryReport: t.modals.gridCategoryReport,
    categoryPieChart: t.modals.gridCategoryPieChart,
    transactions: t.modals.gridTransactions,
  };

  const commitReorder = (fromIndex: number | null, toIndex: number | null) => {
    if (
      fromIndex === null ||
      toIndex === null ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= gridOrder.length ||
      toIndex >= gridOrder.length
    ) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const copy = [...gridOrder];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    onReorderGrids(copy);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggedIndex === null) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const row = el?.closest('[data-grid-reorder-idx]') as HTMLElement | null;
    if (row) {
      const idxAttr = Number(row.dataset.gridReorderIdx);
      if (Number.isInteger(idxAttr)) {
        setDragOverIndex(idxAttr);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
            {t.modals.organizeSectionsTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.organizeSectionsDesc}
        </p>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-0.5">
          {gridOrder.map((key, idx) => {
            const isDragging = draggedIndex === idx;
            const isDragTarget =
              dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;

            return (
              <div
                key={key}
                data-grid-reorder-idx={idx}
                draggable
                onDragStart={() => {
                  setDraggedIndex(idx);
                  setDragOverIndex(idx);
                }}
                onDragEnter={() => {
                  if (draggedIndex !== null) setDragOverIndex(idx);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  commitReorder(draggedIndex, idx);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all dark:bg-slate-950/60 ${
                  isDragTarget
                    ? 'border-[#16845B] bg-emerald-50/50 ring-2 ring-[#16845B]/30 dark:border-emerald-400 dark:bg-emerald-950/30'
                    : isDragging
                    ? 'border-slate-300 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-900'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`${t.settings.dragToReorderAria}: ${labels[key]}`}
                    title={t.settings.dragToReorderAria}
                    onTouchStart={() => {
                      setDraggedIndex(idx);
                      setDragOverIndex(idx);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={() => commitReorder(draggedIndex, dragOverIndex)}
                    onTouchCancel={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className="flex h-8 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm font-medium text-[#102A43] dark:text-slate-100">
                    <input
                      type="checkbox"
                      checked={visibleGrids[key]}
                      onChange={() => onToggleGrid(key)}
                      className="h-4 w-4 shrink-0 rounded accent-[#16845B]"
                    />
                    <span className="truncate">{labels[key]}</span>
                  </label>
                </div>
              </div>
            );
          })}
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
              <input
                type="checkbox"
                checked={showAssistantButton}
                onChange={onToggleAssistantButton}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#16845B]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#102A43] dark:text-slate-100">
                  {t.modals.floatingAssistantToggle}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {t.modals.floatingAssistantDesc}
                </span>
              </span>
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
        >
          {t.common.done}
        </button>
      </div>
    </div>
  );
};

/* --- Monthly Budget Goals Modal --- */
export const BudgetGoalsModal: React.FC<{
  open: boolean;
  initialGoal: BudgetGoal | null;
  budgetGoals: BudgetGoal[];
  expenseCategories: string[];
  monthlySpentByCategory: Record<string, number>;
  currency: CurrencySymbol;
  onSaveGoal: (category: string, monthlyLimit: number, editId?: string) => Promise<boolean>;
  onDeleteGoal: (id: string) => Promise<void>;
  onClose: () => void;
}> = ({
  open,
  initialGoal,
  budgetGoals,
  expenseCategories,
  monthlySpentByCategory,
  currency,
  onSaveGoal,
  onDeleteGoal,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialGoal) {
      setSelectedCategory(initialGoal.category);
      setLimitInput(String(initialGoal.monthlyLimit));
      setEditingGoalId(initialGoal.id);
    } else {
      const firstUnbudgeted = expenseCategories.find(
        (cat) => !budgetGoals.some((g) => g.category === cat)
      );
      const defaultCat = firstUnbudgeted || expenseCategories[0] || '';
      const existing = budgetGoals.find((g) => g.category === defaultCat);
      setSelectedCategory(defaultCat);
      setLimitInput(existing ? String(existing.monthlyLimit) : '');
      setEditingGoalId(existing ? existing.id : null);
    }
  }, [open, initialGoal, expenseCategories, budgetGoals]);

  if (!open) return null;

  const categoryOptions = Array.from(
    new Set([
      ...expenseCategories,
      ...budgetGoals.map((g) => g.category),
      ...(selectedCategory ? [selectedCategory] : []),
    ])
  ).filter(Boolean);

  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    const existing = budgetGoals.find((g) => g.category === newCat);
    if (existing) {
      setEditingGoalId(existing.id);
      setLimitInput(String(existing.monthlyLimit));
    } else {
      setEditingGoalId(null);
      setLimitInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || isSaving) return;
    const parsedLimit = parseFloat(limitInput);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return;
    }

    const matchedByCategory = budgetGoals.find((g) => g.category === selectedCategory);
    const targetEditId = editingGoalId || matchedByCategory?.id;

    setIsSaving(true);
    try {
      const saved = await onSaveGoal(selectedCategory, parsedLimit, targetEditId);
      if (saved) {
        setLimitInput('');
        setEditingGoalId(null);
        const nextUnbudgeted = expenseCategories.find(
          (cat) =>
            cat !== selectedCategory && !budgetGoals.some((g) => g.category === cat)
        );
        if (nextUnbudgeted) {
          setSelectedCategory(nextUnbudgeted);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const currentMonthSpent = selectedCategory ? monthlySpentByCategory[selectedCategory] || 0 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
            <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.modals.budgetModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.budgetModalDesc}
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.expenseCategory}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.modals.monthlyLimit} ({currency})
              </label>
              <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                {t.modals.spentThisMonth}: {formatMoney(currentMonthSpent, currency)}
              </span>
            </div>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              placeholder={t.modals.limitPlaceholder}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !selectedCategory || !limitInput || parseFloat(limitInput) <= 0}
            className="min-h-[42px] w-full rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-50"
          >
            {isSaving
              ? t.common.saving
              : editingGoalId || budgetGoals.some((g) => g.category === selectedCategory)
              ? t.modals.updateBudgetGoal
              : t.modals.saveBudgetGoal}
          </button>
        </form>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {t.modals.activeGoals} ({budgetGoals.length})
          </div>
          {budgetGoals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t.modals.noBudgetsYet}
            </p>
          ) : (
            <div className="space-y-2">
              {budgetGoals.map((goal) => {
                const spent = monthlySpentByCategory[goal.category] || 0;
                const pct = goal.monthlyLimit > 0 ? Math.round((spent / goal.monthlyLimit) * 100) : 0;
                const statusText =
                  pct > 100
                    ? t.dashboard.overBudget
                    : pct >= 80
                    ? t.dashboard.nearLimit
                    : t.dashboard.onTrack;
                const statusColor =
                  pct > 100
                    ? 'text-rose-600 dark:text-rose-400'
                    : pct >= 80
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-[#16845B] dark:text-emerald-400';

                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                        {goal.category}
                      </div>
                      <div className="font-mono-num mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.modals.limitPrefix}: {formatMoney(goal.monthlyLimit, currency)} ·{' '}
                        <span className={`font-semibold ${statusColor}`}>
                          {pct}% ({statusText})
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${goal.category} budget`}
                        onClick={() => {
                          setSelectedCategory(goal.category);
                          setLimitInput(String(goal.monthlyLimit));
                          setEditingGoalId(goal.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${goal.category} budget`}
                        onClick={() => {
                          void onDeleteGoal(goal.id);
                          if (editingGoalId === goal.id) {
                            setEditingGoalId(null);
                            setLimitInput('');
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
};

/* --- Saving Goals Modal (Monthly or Certain Period) --- */
export const SavingGoalsModal: React.FC<{
  open: boolean;
  initialGoal: SavingGoal | null;
  savingGoals: SavingGoal[];
  savingsList: string[];
  transactions: Transaction[];
  currency: CurrencySymbol;
  onSaveGoal: (
    payload: {
      title: string;
      account?: string;
      periodType: SavingGoalPeriodType;
      targetAmount: number;
      startDate?: string;
      endDate?: string;
    },
    editId?: string
  ) => Promise<boolean>;
  onDeleteGoal: (id: string) => Promise<void>;
  onClose: () => void;
}> = ({
  open,
  initialGoal,
  savingGoals,
  savingsList,
  transactions,
  currency,
  onSaveGoal,
  onDeleteGoal,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const [titleInput, setTitleInput] = useState('');
  const [periodType, setPeriodType] = useState<SavingGoalPeriodType>('monthly');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [startDate, setStartDate] = useState(getTodayISO());
  const [endDate, setEndDate] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getDefaultEndDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (!open) return;
    if (initialGoal) {
      setTitleInput(initialGoal.title);
      setPeriodType(initialGoal.periodType);
      setSelectedAccount(initialGoal.account || '');
      setTargetInput(String(initialGoal.targetAmount));
      setStartDate(initialGoal.startDate || getTodayISO());
      setEndDate(initialGoal.endDate || getDefaultEndDate());
      setEditingGoalId(initialGoal.id);
    } else {
      setTitleInput('');
      setPeriodType('monthly');
      setSelectedAccount(savingsList[0] || '');
      setTargetInput('');
      setStartDate(getTodayISO());
      setEndDate(getDefaultEndDate());
      setEditingGoalId(null);
    }
  }, [open, initialGoal, savingsList]);

  if (!open) return null;

  const accountOptions = Array.from(
    new Set([...savingsList, ...(selectedAccount ? [selectedAccount] : [])])
  ).filter(Boolean);

  const parsedTarget = parseFloat(targetInput);
  const previewProgress = computeSavingGoalProgress(
    {
      account: selectedAccount || undefined,
      periodType,
      targetAmount: Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : 1,
      startDate: periodType === 'period' ? startDate : undefined,
      endDate: periodType === 'period' ? endDate : undefined,
    },
    transactions,
    savingsList,
    lang
  );

  const resetForm = () => {
    setTitleInput('');
    setPeriodType('monthly');
    setSelectedAccount(savingsList[0] || '');
    setTargetInput('');
    setStartDate(getTodayISO());
    setEndDate(getDefaultEndDate());
    setEditingGoalId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    const cleanTitle = titleInput.trim();
    if (!cleanTitle || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return;
    }
    if (periodType === 'period' && (!startDate || !endDate || endDate < startDate)) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await onSaveGoal(
        {
          title: cleanTitle,
          account: selectedAccount || undefined,
          periodType,
          targetAmount: parsedTarget,
          startDate: periodType === 'period' ? startDate : undefined,
          endDate: periodType === 'period' ? endDate : undefined,
        },
        editingGoalId || undefined
      );
      if (saved) {
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hasValidPeriodDates =
    periodType === 'monthly' || (Boolean(startDate) && Boolean(endDate) && endDate >= startDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.modals.savingModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.savingModalDesc}
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.goalTitleLabel}
            </label>
            <input
              type="text"
              maxLength={100}
              required
              placeholder={t.modals.goalTitlePlaceholder}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.modals.savingPeriodType}
              </label>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPeriodType('monthly')}
                  className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                    periodType === 'monthly'
                      ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.modals.monthlyPeriodBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodType('period')}
                  className={`min-h-[34px] rounded-lg px-2 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                    periodType === 'period'
                      ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-800 dark:text-sky-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.modals.customPeriodBtn}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.modals.linkedAccountLabel}
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">{t.modals.allSavingsOption}</option>
                {accountOptions.map((acc) => (
                  <option key={acc} value={acc}>
                    {acc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {periodType === 'period' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.modals.startDateLabel}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.modals.endDateLabel}
                </label>
                <input
                  type="date"
                  required
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.modals.targetAmountLabel} ({currency})
              </label>
              <span className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                {t.modals.savedInPeriod}: {formatMoney(previewProgress.savedAmount, currency)}
              </span>
            </div>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              placeholder={t.modals.targetPlaceholder}
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex gap-2">
            {editingGoalId && (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {t.modals.cancelEditBtn}
              </button>
            )}
            <button
              type="submit"
              disabled={
                isSaving ||
                !titleInput.trim() ||
                !Number.isFinite(parsedTarget) ||
                parsedTarget <= 0 ||
                !hasValidPeriodDates
              }
              className="min-h-[42px] flex-1 rounded-xl bg-sky-600 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {isSaving
                ? t.common.saving
                : editingGoalId
                ? t.modals.updateSavingGoal
                : t.modals.saveSavingGoal}
            </button>
          </div>
        </form>

        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {t.modals.activeSavingGoals} ({savingGoals.length})
          </div>
          {savingGoals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t.modals.noSavingGoalsYet}
            </p>
          ) : (
            <div className="space-y-2">
              {savingGoals.map((goal) => {
                const progress = computeSavingGoalProgress(goal, transactions, savingsList, lang);
                const roundedPct = Math.max(0, Math.round(progress.pct));
                const reached = progress.pct >= 100;
                const statusColor = reached
                  ? 'text-[#16845B] dark:text-emerald-400'
                  : 'text-sky-600 dark:text-sky-400';

                return (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                        {goal.title}
                      </div>
                      <div className="font-mono-num mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {t.modals.targetPrefix}: {formatMoney(goal.targetAmount, currency)} ·{' '}
                        <span className={`font-semibold ${statusColor}`}>{roundedPct}%</span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {goal.periodType === 'monthly'
                          ? t.modals.monthlyPeriodBtn
                          : progress.periodLabel}{' '}
                        · {goal.account || t.dashboard.allSavingsLabel}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${goal.title} saving goal`}
                        onClick={() => {
                          setTitleInput(goal.title);
                          setPeriodType(goal.periodType);
                          setSelectedAccount(goal.account || '');
                          setTargetInput(String(goal.targetAmount));
                          setStartDate(goal.startDate || getTodayISO());
                          setEndDate(goal.endDate || getDefaultEndDate());
                          setEditingGoalId(goal.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${goal.title} saving goal`}
                        onClick={() => {
                          void onDeleteGoal(goal.id);
                          if (editingGoalId === goal.id) {
                            resetForm();
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[40px] w-full rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
};

/* --- Category Icon & Color Style Modal --- */
export const CategoryStyleModal: React.FC<{
  target: { kind: CategoryKind; name: string } | null;
  initialStyle: CategoryStyle;
  onSave: (kind: CategoryKind, name: string, style: CategoryStyle) => void;
  onClose: () => void;
}> = ({ target, initialStyle, onSave, onClose }) => {
  const { t } = useTranslation();
  const [selectedIcon, setSelectedIcon] = useState(initialStyle.icon);
  const [selectedColor, setSelectedColor] = useState(initialStyle.color);

  useEffect(() => {
    if (target) {
      setSelectedIcon(initialStyle.icon);
      setSelectedColor(initialStyle.color);
    }
  }, [target, initialStyle.icon, initialStyle.color]);

  if (!target) return null;

  const draftStyle: CategoryStyle = {
    icon: selectedIcon,
    color: selectedColor,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Palette className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.modals.editStyleTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Preview */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-950/60">
          <CategoryIconBadge style={draftStyle} size="md" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t.modals.previewLabel}
            </div>
            <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
              {target.name}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Icon Picker */}
          <div>
            <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {t.modals.chooseIcon}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {CATEGORY_ICONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedIcon === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-label={opt.label}
                    aria-pressed={isSelected}
                    title={opt.label}
                    onClick={() => setSelectedIcon(opt.key)}
                    className={`flex h-10 items-center justify-center rounded-xl border transition-all ${
                      isSelected
                        ? 'border-[#16845B] bg-emerald-50 text-[#16845B] ring-2 ring-[#16845B]/30 dark:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Swatch Picker */}
          <div>
            <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {t.modals.chooseColor}
            </div>
            <div className="grid grid-cols-6 gap-2.5">
              {CATEGORY_COLORS.map((hex) => {
                const isSelected = selectedColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Color ${hex}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`flex h-10 items-center justify-center rounded-xl transition-transform active:scale-95 ${
                      isSelected
                        ? 'ring-2 ring-[#102A43] ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900'
                        : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => onSave(target.kind, target.name, draftStyle)}
            className="min-h-[40px] rounded-xl bg-[#16845B] px-5 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
          >
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
};
