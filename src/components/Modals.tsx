import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  GitMerge,
  GripVertical,
  History,
  Info,
  Palette,
  Pencil,
  PiggyBank,
  Plus,
  Repeat,
  Search,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  BudgetGoal,
  CategoryKind,
  CategoryStyle,
  ConfirmDialogState,
  CurrencySymbol,
  DrilldownPeriodContext,
  DrilldownType,
  FilterCardKey,
  GridKey,
  PeriodFilter,
  RecurringBill,
  RecurringBillType,
  SavingGoal,
  SavingGoalPeriodType,
  ToastMessage,
  Transaction,
} from '../types';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIconBadge,
  formatCategoryStyleTargetLabel,
  getCategoryStyle,
  getSubCategoryTargetName,
} from '../utils/categoryVisuals';
import {
  computeSavingGoalProgress,
  filterTransactionsByPeriod,
  formatDisplayDate,
  formatMoney,
  getPeriodLabel,
  getShiftedCustomRange,
  getTodayISO,
  parseLocalDate,
} from '../utils/format';
import { RecurringBillsPanel, type RecurringBillSavePayload } from './RecurringBillsPanel';
import { type AddableItemKind, TransactionPickerDrawer } from './TransactionPickerDrawer';
import { getTransactionHierarchy } from '../utils/transactionDisplay';

/* --- Toast Container --- */
export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-[max(1rem,env(safe-area-inset-top))] left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-stretch gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-semibold ring-1 ring-black/5 shadow-[0_16px_36px_-6px_rgba(15,23,42,0.28),0_8px_16px_-4px_rgba(15,23,42,0.14)] backdrop-blur-md dark:ring-white/10 dark:shadow-[0_18px_42px_-6px_rgba(0,0,0,0.7),0_8px_18px_-4px_rgba(0,0,0,0.45)] ${
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
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTypedConfirmation('');
    setIsSubmitting(false);
  }, [dialog]);

  if (!dialog) return null;

  const expectedText = dialog.requireConfirmationText?.trim();
  const isConfirmationMatched = expectedText
    ? typedConfirmation.trim().toUpperCase() === expectedText.toUpperCase()
    : true;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
            {dialog.title}
          </h3>
          {dialog.showCloseButton && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              aria-label={t.common.close}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {dialog.message}
        </p>

        {expectedText && (
          <div className="mt-4">
            {dialog.confirmationHint && (
              <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {dialog.confirmationHint}
              </label>
            )}
            <input
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              placeholder={expectedText}
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold tracking-wider text-[#102A43] placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-rose-400"
            />
          </div>
        )}

        <div
          className={`mt-5 ${
            dialog.onCancelAction ? 'grid grid-cols-2 gap-2.5' : 'flex justify-end gap-2'
          }`}
        >
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              if (isSubmitting) return;
              if (!dialog.onCancelAction) {
                onClose();
                return;
              }
              setIsSubmitting(true);
              try {
                await dialog.onCancelAction();
                onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
            className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
              dialog.cancelDestructive
                ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70'
                : 'border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {dialog.cancelLabel || t.common.cancel}
          </button>
          <button
            type="button"
            disabled={!isConfirmationMatched || isSubmitting}
            onClick={async () => {
              if (!isConfirmationMatched || isSubmitting) return;
              setIsSubmitting(true);
              const shouldKeepOpen = Boolean(dialog.keepOpenOnConfirm);
              try {
                await dialog.onConfirm();
                if (!shouldKeepOpen) {
                  onClose();
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            className={`min-h-[42px] rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-45 ${
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

  const isLendBorrow = activeFilterCard === 'lendBorrow';
  const usesPeriodicPresets =
    activeFilterCard === 'categoryPieChart' ||
    activeFilterCard === 'incExp';

  const presets: Array<{ key: PeriodFilter; label: string }> = isLendBorrow
    ? [
        { key: 'all', label: t.common.allTime },
        { key: 'monthly', label: t.common.thisMonth },
        { key: 'yearly', label: t.common.thisYear },
      ]
    : usesPeriodicPresets
    ? [
        { key: 'monthly', label: t.common.monthlyByMonth },
        { key: 'yearly', label: t.common.yearlyByYear },
        { key: 'all', label: t.common.allTime },
      ]
    : [
        { key: 'all', label: t.common.allTime },
        { key: 'monthly', label: t.common.thisMonth },
        { key: 'previous_month', label: t.common.previousMonth },
        { key: 'yearly', label: t.common.thisYear },
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

        {!isLendBorrow && (
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
        )}
      </div>
    </div>
  );
};

/* --- Transaction Row for Drilldown Modal (Tap / Long-Press Slide Tray) --- */
const DrilldownTxRow: React.FC<{
  tx: Transaction;
  currency: CurrencySymbol;
  isReadOnly: boolean;
  isOpen: boolean;
  onToggleOpen: (id: string | null) => void;
  onInspectDebt: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}> = ({
  tx,
  currency,
  isReadOnly,
  isOpen,
  onToggleOpen,
  onInspectDebt,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const pressTimerRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const didLongPressRef = useRef(false);

  const isDebt = tx.type === 'lend' || tx.type === 'borrow';
  const isSystemTx =
    tx.type === 'partial_payment' ||
    tx.type === 'correction' ||
    tx.type === 'adjustment';
  const canEdit = !isReadOnly && !isSystemTx;
  const hasInspectDebt = isDebt && !isReadOnly;
  const revealWidth = isReadOnly ? 0 : hasInspectDebt && canEdit ? 144 : canEdit ? 112 : 56;
  const trayWidthClass = hasInspectDebt && canEdit ? 'w-36' : canEdit ? 'w-28' : 'w-14';
  const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressOriginRef.current = null;
  };

  useEffect(() => clearPressTimer, []);

  const triggerRowPressAction = () => {
    if (isReadOnly) {
      if (isDebt) onInspectDebt(tx);
      return;
    }
    onToggleOpen(isOpen ? null : tx.id);
  };

  const startLongPress = (clientX: number, clientY: number) => {
    if (isReadOnly && !isDebt) return;
    clearPressTimer();
    didLongPressRef.current = false;
    pressOriginRef.current = { x: clientX, y: clientY };
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      pressOriginRef.current = null;
      didLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      triggerRowPressAction();
    }, 420);
  };

  const moveLongPress = (clientX: number, clientY: number) => {
    if (pressTimerRef.current === null || !pressOriginRef.current) return;
    const dx = clientX - pressOriginRef.current.x;
    const dy = clientY - pressOriginRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      clearPressTimer();
    }
  };

  const endLongPress = () => {
    clearPressTimer();
    if (didLongPressRef.current) {
      window.setTimeout(() => {
        didLongPressRef.current = false;
      }, 120);
    }
  };

  const hierarchy = getTransactionHierarchy(tx, {
    expense: t.common.expense,
    income: t.common.income,
    transfer: t.common.transfer,
    lend: t.common.lend,
    borrow: t.common.borrow,
    general: t.common.general,
  });

  const metaParts = (
    tx.type === 'transfer'
      ? [`${tx.fromWallet} → ${tx.toWallet}`, tx.date]
      : isDebt
      ? isReadOnly
        ? [tx.wallet, tx.date, t.modals.tapForHistory]
        : [tx.wallet, tx.date]
      : hierarchy.titleSource === 'custom'
      ? [
          hierarchy.subCategoryLabel
            ? `${hierarchy.categoryLabel} › ${hierarchy.subCategoryLabel}`
            : hierarchy.categoryLabel,
          tx.wallet,
          tx.date,
        ]
      : hierarchy.titleSource === 'subCategory'
      ? [hierarchy.categoryLabel, tx.wallet, tx.date]
      : [tx.wallet, tx.date]
  ).filter((part): part is string => Boolean(part && part.trim()));

  const isInteractive = !isReadOnly || isDebt;

  return (
    <div className="relative overflow-hidden">
      {!isReadOnly && (
        <div
          className={`absolute inset-y-0 right-0 flex ${trayWidthClass} bg-slate-100 dark:bg-slate-800`}
        >
          {hasInspectDebt && (
            <button
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleOpen(null);
                onInspectDebt(tx);
              }}
              aria-label={t.txItem.viewHistoryAction}
              className="flex flex-1 items-center justify-center text-sky-600 transition-colors hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleOpen(null);
              onDelete(tx.id);
            }}
            aria-label={t.txItem.deleteAria}
            className="flex flex-1 items-center justify-center text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {canEdit && (
            <button
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleOpen(null);
                onEdit(tx);
              }}
              aria-label={t.txItem.editAria}
              className="flex flex-1 items-center justify-center text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onTouchStart={(e) => startLongPress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => moveLongPress(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={endLongPress}
        onTouchCancel={endLongPress}
        onMouseDown={(e) => {
          if (e.button === 0) startLongPress(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) moveLongPress(e.clientX, e.clientY);
        }}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (didLongPressRef.current) return;
          triggerRowPressAction();
        }}
        onKeyDown={(e) => {
          if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            triggerRowPressAction();
          }
        }}
        style={{
          transform: `translateX(${isOpen && !isReadOnly ? -revealWidth : 0}px)`,
        }}
        className={`relative z-10 flex min-h-[54px] touch-pan-y items-center justify-between gap-3 bg-white px-1.5 py-3 transition-transform duration-200 ease-out select-none dark:bg-slate-900 ${
          isInteractive ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
            {hierarchy.mainTitle}
            {isDebt ? ` (${t.txItem.due}: ${formatMoney(due, currency)})` : ''}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {metaParts.map((part, idx) => (
              <React.Fragment key={`${idx}-${part}`}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>{part}</span>
              </React.Fragment>
            ))}
          </div>
          {hierarchy.extraNote && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {hierarchy.extraNote}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={`font-mono-num text-sm font-bold ${
              tx.type === 'expense' || tx.type === 'lend'
                ? 'text-[#D94848] dark:text-rose-400'
                : 'text-[#16845B] dark:text-emerald-400'
            }`}
          >
            {tx.type === 'expense' || tx.type === 'lend' ? '-' : '+'}
            {formatMoney(Math.abs(tx.amount), currency)}
          </div>

          {!isReadOnly && (
            <div
              className={`hidden items-center gap-0.5 transition-opacity sm:flex ${
                isOpen ? 'pointer-events-none opacity-0' : ''
              }`}
            >
              {canEdit && (
                <button
                  type="button"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(tx);
                  }}
                  aria-label={t.txItem.editAria}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tx.id);
                }}
                aria-label={t.txItem.deleteAria}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* --- Horizontal Swipeable Strip for Net Worth Breakdown Rows --- */
const SwipeableBreakdownStrip: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const mouseDragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const touchDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startScrollLeft: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    axis: 'x' | 'y' | null;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
    axis: null,
    moved: false,
  });
  const suppressClickRef = useRef(false);
  const momentumRafRef = useRef<number | null>(null);

  const stopMomentum = () => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  };

  const updateScrollFades = () => {
    const el = stripRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  };

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    updateScrollFades();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      stopMomentum();
      const touch = e.touches[0];
      touchDragRef.current = {
        active: true,
        startX: touch.clientX,
        startY: touch.clientY,
        startScrollLeft: el.scrollLeft,
        lastX: touch.clientX,
        lastTime: performance.now(),
        velocity: 0,
        axis: null,
        moved: false,
      };
      suppressClickRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchDragRef.current;
      if (!state.active || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      if (!state.axis && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        state.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }

      if (state.axis !== 'x') return;

      const hasOverflow = el.scrollWidth > el.clientWidth + 1;
      if (!hasOverflow) return;

      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();

      if (Math.abs(dx) > 6) {
        state.moved = true;
        suppressClickRef.current = true;
      }

      const now = performance.now();
      const dt = Math.max(1, now - state.lastTime);
      const stepDx = touch.clientX - state.lastX;
      state.velocity = stepDx / dt;
      state.lastX = touch.clientX;
      state.lastTime = now;

      el.scrollLeft = state.startScrollLeft - dx;
      updateScrollFades();
    };

    const handleTouchEnd = () => {
      const state = touchDragRef.current;
      if (!state.active) return;
      state.active = false;
      const wasHorizontal = state.axis === 'x';
      const moved = state.moved;
      const isRecentMove = performance.now() - state.lastTime < 90;
      let velocity = isRecentMove ? state.velocity : 0;
      state.axis = null;
      state.moved = false;

      if (wasHorizontal && Math.abs(velocity) > 0.12) {
        let lastFrame = performance.now();
        const step = (now: number) => {
          const dt = Math.min(32, now - lastFrame);
          lastFrame = now;
          el.scrollLeft -= velocity * dt;
          updateScrollFades();
          velocity *= Math.pow(0.92, dt / 16);
          const maxScroll = el.scrollWidth - el.clientWidth;
          if (
            Math.abs(velocity) > 0.03 &&
            el.scrollLeft > 0 &&
            el.scrollLeft < maxScroll
          ) {
            momentumRafRef.current = requestAnimationFrame(step);
          } else {
            momentumRafRef.current = null;
          }
        };
        momentumRafRef.current = requestAnimationFrame(step);
      }

      if (moved) {
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 80);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScrollFades);
      resizeObserver.observe(el);
    }

    return () => {
      stopMomentum();
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
      resizeObserver?.disconnect();
    };
  }, [children]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stripRef.current;
    if (!el || e.button !== 0) return;
    stopMomentum();
    mouseDragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    suppressClickRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = stripRef.current;
    if (!el || !mouseDragRef.current.active) return;
    const dx = e.clientX - mouseDragRef.current.startX;
    if (Math.abs(dx) > 6) {
      mouseDragRef.current.moved = true;
      suppressClickRef.current = true;
    }
    if (mouseDragRef.current.moved) {
      el.scrollLeft = mouseDragRef.current.startScrollLeft - dx;
      updateScrollFades();
    }
  };

  const handleMouseEnd = () => {
    if (!mouseDragRef.current.active) return;
    const moved = mouseDragRef.current.moved;
    mouseDragRef.current.active = false;
    mouseDragRef.current.moved = false;
    if (moved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 60);
    }
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="relative">
      <div
        ref={stripRef}
        onDragStart={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
        onScroll={updateScrollFades}
        onClickCapture={handleClickCapture}
        className="no-scrollbar flex cursor-grab touch-pan-y select-none gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 active:cursor-grabbing"
      >
        {children}
      </div>
      {canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-white to-transparent dark:from-slate-900"
        />
      )}
      {canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-white to-transparent dark:from-slate-900"
        />
      )}
    </div>
  );
};

/* --- Drilldown Modal --- */
export const DrilldownModal: React.FC<{
  drilldownType: DrilldownType | null;
  drilldownKey: string | null;
  drilldownFilter: PeriodFilter;
  drilldownPeriodContext?: DrilldownPeriodContext | null;
  setDrilldownFilter: (f: PeriodFilter) => void;
  transactions: Transaction[];
  wallets?: string[];
  savingsList?: string[];
  walletBalances?: Record<string, number>;
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  customDateFrom: string;
  customDateTo: string;
  onStartBalanceCorrection: (accountName: string) => void;
  onEditAccount?: (type: 'wallet' | 'savings', accountName: string) => void;
  onInspectDebt: (tx: Transaction) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectDrilldown?: (type: DrilldownType, key?: string | null) => void;
  onEditBudgetGoal?: (goalId: string) => void;
  onEditSavingGoal?: (goalId: string) => void;
  isReadOnly?: boolean;
  onClose: () => void;
}> = ({
  drilldownType,
  drilldownKey,
  drilldownFilter,
  drilldownPeriodContext,
  setDrilldownFilter,
  transactions,
  wallets = [],
  savingsList = [],
  walletBalances = {},
  categoryStyles = {},
  currency,
  customDateFrom,
  customDateTo,
  onStartBalanceCorrection,
  onEditAccount,
  onInspectDebt,
  onEditTransaction,
  onDeleteTransaction,
  onSelectDrilldown,
  onEditBudgetGoal,
  onEditSavingGoal,
  isReadOnly = false,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [openTxId, setOpenTxId] = useState<string | null>(null);
  const [netWorthView, setNetWorthView] = useState<'summary' | 'transactions'>('summary');
  const subStripRef = useRef<HTMLDivElement>(null);
  const subStripDragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const wasSubStripDraggingRef = useRef(false);

  useEffect(() => {
    setSelectedSubCategory(null);
    setOpenTxId(null);
    setNetWorthView('summary');
    if (subStripRef.current) {
      subStripRef.current.scrollLeft = 0;
    }
  }, [drilldownType, drilldownKey, drilldownFilter, drilldownPeriodContext]);

  if (!drilldownType) return null;

  const handleSubStripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = subStripRef.current;
    if (!el || e.button !== 0) return;
    subStripDragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
    wasSubStripDraggingRef.current = false;
  };

  const handleSubStripMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = subStripRef.current;
    if (!el || !subStripDragRef.current.active) return;
    const dx = e.clientX - subStripDragRef.current.startX;
    if (Math.abs(dx) > 5) {
      subStripDragRef.current.moved = true;
      wasSubStripDraggingRef.current = true;
    }
    if (subStripDragRef.current.moved) {
      el.scrollLeft = subStripDragRef.current.startScrollLeft - dx;
    }
  };

  const handleSubStripMouseEnd = () => {
    if (!subStripDragRef.current.active) return;
    const moved = subStripDragRef.current.moved;
    subStripDragRef.current.active = false;
    subStripDragRef.current.moved = false;
    if (moved) {
      window.setTimeout(() => {
        wasSubStripDraggingRef.current = false;
      }, 0);
    }
  };

  const UNSPECIFIED_SUB_KEY = '__general__';
  const isCategoryDrilldown =
    drilldownType === 'expense_category' || drilldownType === 'income_category';
  const isSavingGoalDrilldown = drilldownType === 'saving_goal';
  const savingTargetAccounts = isSavingGoalDrilldown
    ? drilldownPeriodContext?.savingGoalAccount
      ? new Set([drilldownPeriodContext.savingGoalAccount])
      : new Set(savingsList)
    : null;

  let periodFiltered = transactions.filter((tx) => {
    if (drilldownType === 'wallet' || drilldownType === 'savings') {
      return (
        tx.wallet === drilldownKey ||
        (tx.type === 'transfer' &&
          (tx.fromWallet === drilldownKey || tx.toWallet === drilldownKey))
      );
    }
    if (drilldownType === 'saving_goal' && savingTargetAccounts) {
      if (tx.type === 'transfer') {
        const toTarget = Boolean(tx.toWallet && savingTargetAccounts.has(tx.toWallet));
        const fromTarget = Boolean(tx.fromWallet && savingTargetAccounts.has(tx.fromWallet));
        return toTarget !== fromTarget;
      }
      if (tx.type === 'income' || tx.type === 'expense') {
        return Boolean(tx.wallet && savingTargetAccounts.has(tx.wallet));
      }
      return false;
    }
    if (drilldownType === 'income') {
      return tx.type === 'income' || (tx.type === 'adjustment' && tx.amount > 0);
    }
    if (drilldownType === 'expense') {
      return tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0);
    }
    if (drilldownType === 'expense_category') {
      return tx.type === 'expense' && (tx.category || 'Others') === drilldownKey;
    }
    if (drilldownType === 'income_category') {
      return tx.type === 'income' && (tx.category || 'Others') === drilldownKey;
    }
    if (drilldownType === 'lend') return tx.type === 'lend';
    if (drilldownType === 'borrow') return tx.type === 'borrow';
    return true;
  });

  const now = new Date();
  const hasExplicitGoalRange = Boolean(
    drilldownPeriodContext?.startDate || drilldownPeriodContext?.endDate
  );
  if (drilldownFilter === 'monthly' && drilldownPeriodContext?.monthOffset !== undefined) {
    const target = new Date(
      now.getFullYear(),
      now.getMonth() + drilldownPeriodContext.monthOffset,
      1
    );
    const targetMonth = target.getMonth();
    const targetYear = target.getFullYear();
    periodFiltered = periodFiltered.filter((tx) => {
      if (!tx.rawDate) return false;
      const d = parseLocalDate(tx.rawDate);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
  } else if (drilldownFilter === 'yearly' && drilldownPeriodContext?.yearOffset !== undefined) {
    const targetYear = now.getFullYear() + drilldownPeriodContext.yearOffset;
    periodFiltered = periodFiltered.filter((tx) => {
      if (!tx.rawDate) return false;
      return parseLocalDate(tx.rawDate).getFullYear() === targetYear;
    });
  } else if (drilldownFilter === 'custom' && hasExplicitGoalRange) {
    const start = drilldownPeriodContext?.startDate;
    const end = drilldownPeriodContext?.endDate;
    periodFiltered = periodFiltered.filter((tx) => {
      if (!tx.rawDate) return false;
      if (start && tx.rawDate < start) return false;
      if (end && tx.rawDate > end) return false;
      return true;
    });
  } else if (
    drilldownFilter === 'custom' &&
    customDateFrom &&
    customDateTo &&
    drilldownPeriodContext?.customOffset !== undefined
  ) {
    const { from, to } = getShiftedCustomRange(
      customDateFrom,
      customDateTo,
      drilldownPeriodContext.customOffset
    );
    periodFiltered = periodFiltered.filter(
      (tx) => !tx.rawDate || (tx.rawDate >= from && tx.rawDate <= to)
    );
  } else {
    periodFiltered = filterTransactionsByPeriod(
      periodFiltered,
      drilldownFilter,
      customDateFrom,
      customDateTo
    );
  }

  const getSavingGoalTxDelta = (tx: Transaction, accountSet: Set<string>): number => {
    if (tx.type === 'transfer') {
      const toTarget = Boolean(tx.toWallet && accountSet.has(tx.toWallet));
      const fromTarget = Boolean(tx.fromWallet && accountSet.has(tx.fromWallet));
      if (toTarget && !fromTarget) return tx.amount;
      if (fromTarget && !toTarget) return -(tx.amount + (tx.charge || 0));
      return 0;
    }
    if (tx.type === 'income' && tx.wallet && accountSet.has(tx.wallet)) return tx.amount;
    if (tx.type === 'expense' && tx.wallet && accountSet.has(tx.wallet)) return -tx.amount;
    return 0;
  };

  const getSavingGoalTxAccount = (tx: Transaction, accountSet: Set<string>): string | null => {
    if (tx.type === 'transfer') {
      if (tx.toWallet && accountSet.has(tx.toWallet)) return tx.toWallet;
      if (tx.fromWallet && accountSet.has(tx.fromWallet)) return tx.fromWallet;
      return null;
    }
    if (tx.wallet && accountSet.has(tx.wallet)) return tx.wallet;
    return null;
  };

  const isMultiAccountSavingGoal =
    isSavingGoalDrilldown && !drilldownPeriodContext?.savingGoalAccount && Boolean(savingTargetAccounts);

  const subCategoryBuckets = isCategoryDrilldown
    ? (() => {
        const map = new Map<string, { key: string; label: string; total: number; isGeneral: boolean }>();
        for (const tx of periodFiltered) {
          const rawSub = (tx.subCategory || '').trim();
          const isGeneral = rawSub.length === 0;
          const bucketKey = isGeneral ? UNSPECIFIED_SUB_KEY : rawSub;
          const bucketLabel = isGeneral ? t.common.general : rawSub;
          const existing = map.get(bucketKey);
          const amt = Math.abs(tx.amount);
          if (existing) {
            existing.total += amt;
          } else {
            map.set(bucketKey, {
              key: bucketKey,
              label: bucketLabel,
              total: amt,
              isGeneral,
            });
          }
        }
        return Array.from(map.values()).sort((a, b) => {
          if (a.isGeneral !== b.isGeneral) return a.isGeneral ? 1 : -1;
          return b.total - a.total;
        });
      })()
    : isMultiAccountSavingGoal && savingTargetAccounts
    ? (() => {
        const map = new Map<string, { key: string; label: string; total: number; isGeneral: boolean }>();
        for (const tx of periodFiltered) {
          const acc = getSavingGoalTxAccount(tx, savingTargetAccounts);
          if (!acc) continue;
          const delta = getSavingGoalTxDelta(tx, new Set([acc]));
          const existing = map.get(acc);
          if (existing) {
            existing.total += delta;
          } else {
            map.set(acc, { key: acc, label: acc, total: delta, isGeneral: false });
          }
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
      })()
    : [];

  const hasSubCategoryStrip = isCategoryDrilldown
    ? subCategoryBuckets.some((bucket) => !bucket.isGeneral)
    : isMultiAccountSavingGoal && subCategoryBuckets.length > 1;

  const activeSubKey =
    hasSubCategoryStrip &&
    selectedSubCategory !== null &&
    subCategoryBuckets.some((bucket) => bucket.key === selectedSubCategory)
      ? selectedSubCategory
      : null;

  const filtered =
    isCategoryDrilldown && activeSubKey !== null
      ? periodFiltered.filter((tx) => {
          const rawSub = (tx.subCategory || '').trim();
          return activeSubKey === UNSPECIFIED_SUB_KEY
            ? rawSub.length === 0
            : rawSub === activeSubKey;
        })
      : isMultiAccountSavingGoal && activeSubKey !== null && savingTargetAccounts
      ? periodFiltered.filter((tx) => getSavingGoalTxAccount(tx, savingTargetAccounts) === activeSubKey)
      : periodFiltered;

  const typeTitle =
    drilldownType === 'netWorth'
      ? t.dashboard.netWorth
      : drilldownType === 'income' || drilldownType === 'income_category'
      ? t.common.income
      : drilldownType === 'expense' || drilldownType === 'expense_category'
      ? t.common.expense
      : drilldownType === 'saving_goal'
      ? drilldownPeriodContext?.savingGoalAccount || t.dashboard.allSavingsLabel
      : drilldownType === 'lend'
      ? t.common.lend
      : drilldownType === 'borrow'
      ? t.common.borrow
      : drilldownType.toUpperCase();

  const activePeriodLabel =
    drilldownPeriodContext?.periodLabel ||
    getPeriodLabel(drilldownFilter, customDateFrom, customDateTo, lang);
  const categoryTotal =
    isSavingGoalDrilldown && savingTargetAccounts
      ? periodFiltered.reduce((sum, tx) => sum + getSavingGoalTxDelta(tx, savingTargetAccounts), 0)
      : periodFiltered.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const displayedTotal =
    isSavingGoalDrilldown && savingTargetAccounts
      ? filtered.reduce(
          (sum, tx) =>
            sum +
            getSavingGoalTxDelta(
              tx,
              activeSubKey ? new Set([activeSubKey]) : savingTargetAccounts
            ),
          0
        )
      : filtered.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const activeSubLabel =
    activeSubKey === null
      ? null
      : activeSubKey === UNSPECIFIED_SUB_KEY
      ? t.common.general
      : activeSubKey;
  const headerTitle =
    (isCategoryDrilldown || isMultiAccountSavingGoal) && drilldownKey
      ? activeSubLabel
        ? `${drilldownKey} › ${activeSubLabel}`
        : drilldownKey
      : drilldownKey || typeTitle;
  const isExpenseStyle =
    drilldownType === 'expense_category' || drilldownType === 'expense';
  const showGoalTargetInSubtitle =
    Boolean(drilldownPeriodContext?.goalTargetAmount) &&
    activeSubKey === null &&
    ((isSavingGoalDrilldown &&
      (drilldownFilter === 'monthly' || (drilldownFilter === 'custom' && hasExplicitGoalRange))) ||
      (drilldownType === 'expense_category' &&
        Boolean(drilldownPeriodContext?.budgetGoalId) &&
        drilldownFilter === 'monthly'));

  const monthlyOptionLabel =
    drilldownFilter === 'monthly' &&
    drilldownPeriodContext?.monthOffset !== undefined &&
    drilldownPeriodContext.monthOffset !== 0 &&
    drilldownPeriodContext.periodLabel
      ? drilldownPeriodContext.periodLabel
      : t.common.thisMonth;
  const yearlyOptionLabel =
    drilldownFilter === 'yearly' &&
    drilldownPeriodContext?.yearOffset !== undefined &&
    drilldownPeriodContext.yearOffset !== 0 &&
    drilldownPeriodContext.periodLabel
      ? String(now.getFullYear() + drilldownPeriodContext.yearOffset)
      : t.common.thisYear;
  const customOptionLabel =
    hasExplicitGoalRange && drilldownPeriodContext?.periodLabel
      ? drilldownPeriodContext.periodLabel
      : hasExplicitGoalRange
      ? t.modals.savingGoalPeriodOption
      : t.common.custom;

  const isNetWorthDrilldown = drilldownType === 'netWorth';
  const showNetWorthSummary = isNetWorthDrilldown && netWorthView === 'summary';

  const netWorthSummary = isNetWorthDrilldown
    ? (() => {
        let availableCashBalance = 0;
        wallets.forEach((w) => {
          availableCashBalance += walletBalances[w] || 0;
        });

        let totalSavings = 0;
        savingsList.forEach((s) => {
          totalSavings += walletBalances[s] || 0;
        });

        let totalLend = 0;
        let totalBorrow = 0;
        const activeLendItems: Array<{ tx: Transaction; due: number }> = [];
        const activeBorrowItems: Array<{ tx: Transaction; due: number }> = [];

        transactions.forEach((tx) => {
          const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;
          if (tx.type === 'lend' && !tx.resolved && due > 0) {
            totalLend += due;
            activeLendItems.push({ tx, due });
          }
          if (tx.type === 'borrow' && !tx.resolved && due > 0) {
            totalBorrow += due;
            activeBorrowItems.push({ tx, due });
          }
        });

        activeLendItems.sort((a, b) => b.due - a.due);
        activeBorrowItems.sort((a, b) => b.due - a.due);

        const totalAssets = availableCashBalance + totalSavings + totalLend;
        const netWorth = totalAssets - totalBorrow;

        const grossMagnitude =
          Math.max(0, availableCashBalance) +
          Math.max(0, totalSavings) +
          Math.max(0, totalLend) +
          Math.max(0, totalBorrow);

        return {
          availableCashBalance,
          totalSavings,
          totalLend,
          totalBorrow,
          lendCount: activeLendItems.length,
          borrowCount: activeBorrowItems.length,
          activeLendItems,
          activeBorrowItems,
          totalAssets,
          netWorth,
          grossMagnitude,
        };
      })()
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`flex w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 ${
          showNetWorthSummary ? 'h-[min(88vh,700px)]' : 'h-[min(84vh,640px)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mb-3 flex shrink-0 justify-between gap-2 ${
            isNetWorthDrilldown ? 'items-center' : 'items-start'
          }`}
        >
          <div className="min-w-0">
            <h3
              className={`truncate text-base font-bold ${
                isNetWorthDrilldown
                  ? 'text-[#102A43] dark:text-slate-100'
                  : isExpenseStyle
                  ? 'text-[#D94848] dark:text-rose-400'
                  : isSavingGoalDrilldown
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-[#16845B] dark:text-emerald-400'
              }`}
            >
              {isNetWorthDrilldown ? t.modals.financialSummaryTitle : headerTitle}
            </h3>
            {!isNetWorthDrilldown &&
              (isCategoryDrilldown ||
                isSavingGoalDrilldown ||
                drilldownType === 'income' ||
                drilldownType === 'expense') && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {isCategoryDrilldown || isSavingGoalDrilldown ? `${typeTitle} · ` : ''}
                  {activePeriodLabel} ·{' '}
                  <span className="font-mono-num font-semibold text-[#102A43] dark:text-slate-200">
                    {formatMoney(displayedTotal, currency)}
                  </span>
                  {showGoalTargetInSubtitle && drilldownPeriodContext?.goalTargetAmount && (
                    <span className="font-mono-num text-slate-400 dark:text-slate-500">
                      {' / '}
                      {formatMoney(drilldownPeriodContext.goalTargetAmount, currency)}
                    </span>
                  )}
                </p>
              )}
          </div>
          {!showNetWorthSummary ? (
            <select
              value={drilldownFilter}
              onChange={(e) => setDrilldownFilter(e.target.value as PeriodFilter)}
              className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">{t.common.allTime}</option>
              <option value="monthly">{monthlyOptionLabel}</option>
              <option value="previous_month">{t.common.prevMonthShort}</option>
              <option value="yearly">{yearlyOptionLabel}</option>
              {(drilldownFilter === 'custom' ||
                hasExplicitGoalRange ||
                (Boolean(customDateFrom) && Boolean(customDateTo))) && (
                <option value="custom">{customOptionLabel}</option>
              )}
            </select>
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {isNetWorthDrilldown && (
          <div className="mb-3 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setNetWorthView('summary')}
              className={`min-h-[34px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                netWorthView === 'summary'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.modals.summaryTab}
            </button>
            <button
              type="button"
              onClick={() => setNetWorthView('transactions')}
              className={`min-h-[34px] cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                netWorthView === 'transactions'
                  ? 'bg-white text-[#102A43] shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.modals.transactionsTab}
            </button>
          </div>
        )}

        {showNetWorthSummary && netWorthSummary ? (
          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
            {/* Compact Hero Net Worth & Green/Red Composition Bar */}
            <div className="net-worth-card relative overflow-hidden rounded-2xl p-3 text-white">
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-300">
                  <span>{t.dashboard.netWorth}</span>
                  <span>{formatDisplayDate(getTodayISO(), lang)}</span>
                </div>
                <div className="font-mono-num mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
                  {formatMoney(netWorthSummary.netWorth, currency)}
                </div>

                {/* 2-Color Green (Assets) vs Red (Borrowed) Bar */}
                {(() => {
                  const positiveAssets = Math.max(0, netWorthSummary.totalAssets);
                  const positiveBorrowed = Math.max(0, netWorthSummary.totalBorrow);
                  const barTotal = positiveAssets + positiveBorrowed;
                  if (barTotal <= 0) return null;
                  return (
                    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      {positiveAssets > 0 && (
                        <div
                          style={{ width: `${(positiveAssets / barTotal) * 100}%` }}
                          className="h-full bg-emerald-400"
                        />
                      )}
                      {positiveBorrowed > 0 && (
                        <div
                          style={{ width: `${(positiveBorrowed / barTotal) * 100}%` }}
                          className="h-full bg-rose-400"
                        />
                      )}
                    </div>
                  );
                })()}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-t border-white/10 pt-1.5 text-[11px] text-slate-300">
                  <span>
                    {t.modals.totalAssetsLabel}:{' '}
                    <strong className="font-mono-num font-semibold text-emerald-300">
                      +{formatMoney(netWorthSummary.totalAssets, currency)}
                    </strong>
                  </span>
                  <span>
                    {t.modals.lessBorrowedLabel}:{' '}
                    <strong className="font-mono-num font-semibold text-rose-300">
                      −{formatMoney(netWorthSummary.totalBorrow, currency)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Row 1: Wallets (Compact 3-up Swipeable Cards) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Wallet className="h-3 w-3" />
                  </span>
                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {t.dashboard.wallets}{' '}
                    <span className="font-medium text-slate-400 dark:text-slate-500">
                      ({wallets.length})
                    </span>
                  </span>
                </div>
                <span className="font-mono-num shrink-0 text-xs font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {netWorthSummary.availableCashBalance >= 0 ? '+' : ''}
                  {formatMoney(netWorthSummary.availableCashBalance, currency)}
                </span>
              </div>

              <SwipeableBreakdownStrip>
                {wallets.map((w) => {
                  const bal = walletBalances[w] || 0;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onSelectDrilldown?.('wallet', w)}
                      className="flex w-[calc((100%-12px)/3)] min-w-[92px] shrink-0 snap-start cursor-pointer flex-col rounded-lg border border-slate-200/80 bg-[#F7F9F8] px-2 py-1.5 text-left transition-colors hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-emerald-500/40"
                    >
                      <span className="truncate text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">
                        {w}
                      </span>
                      <span className="font-mono-num mt-0.5 truncate text-xs font-bold leading-tight tabular-nums text-[#102A43] dark:text-slate-100">
                        {formatMoney(bal, currency)}
                      </span>
                    </button>
                  );
                })}
              </SwipeableBreakdownStrip>
            </div>

            {/* Row 2: Savings & Investments (Compact 3-up Swipeable Cards) */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <PiggyBank className="h-3 w-3" />
                  </span>
                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {t.dashboard.savingsInvestments}{' '}
                    <span className="font-medium text-slate-400 dark:text-slate-500">
                      ({savingsList.length})
                    </span>
                  </span>
                </div>
                <span className="font-mono-num shrink-0 text-xs font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                  +{formatMoney(netWorthSummary.totalSavings, currency)}
                </span>
              </div>

              {savingsList.length === 0 ? (
                <p className="py-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t.modals.noSavingsAccounts}
                </p>
              ) : (
                <SwipeableBreakdownStrip>
                  {savingsList.map((s) => {
                    const bal = walletBalances[s] || 0;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onSelectDrilldown?.('savings', s)}
                        className="flex w-[calc((100%-12px)/3)] min-w-[92px] shrink-0 snap-start cursor-pointer flex-col rounded-lg border border-slate-200/80 bg-[#F7F9F8] px-2 py-1.5 text-left transition-colors hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-emerald-500/40"
                      >
                        <span className="truncate text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">
                          {s}
                        </span>
                        <span className="font-mono-num mt-0.5 truncate text-xs font-bold leading-tight tabular-nums text-[#102A43] dark:text-slate-100">
                          {formatMoney(bal, currency)}
                        </span>
                      </button>
                    );
                  })}
                </SwipeableBreakdownStrip>
              )}
            </div>

            {/* Row 3: Lent / Receivable (Compact 3-up Swipeable Cards) */}
            <div>
              <button
                type="button"
                onClick={() => onSelectDrilldown?.('lend', null)}
                className="mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {t.dashboard.lentReceivable}{' '}
                    <span className="font-medium text-slate-400 dark:text-slate-500">
                      ({netWorthSummary.lendCount})
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <span className="font-mono-num text-xs font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                    +{formatMoney(netWorthSummary.totalLend, currency)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </button>

              {netWorthSummary.activeLendItems.length === 0 ? (
                <p className="py-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t.modals.noActiveLent}
                </p>
              ) : (
                <SwipeableBreakdownStrip>
                  {netWorthSummary.activeLendItems.map(({ tx, due }) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onInspectDebt(tx);
                      }}
                      className="flex w-[calc((100%-12px)/3)] min-w-[92px] shrink-0 snap-start cursor-pointer flex-col rounded-lg border border-slate-200/80 bg-[#F7F9F8] px-2 py-1.5 text-left transition-colors hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-emerald-500/40"
                    >
                      <span className="truncate text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">
                        {tx.title || t.dashboard.lentReceivable}
                      </span>
                      <span className="font-mono-num mt-0.5 truncate text-xs font-bold leading-tight tabular-nums text-[#102A43] dark:text-slate-100">
                        {formatMoney(due, currency)}
                      </span>
                    </button>
                  ))}
                </SwipeableBreakdownStrip>
              )}
            </div>

            {/* Row 4: Borrowed / Payable (Compact 3-up Swipeable Cards) */}
            <div>
              <button
                type="button"
                onClick={() => onSelectDrilldown?.('borrow', null)}
                className="mb-1.5 flex w-full cursor-pointer items-center justify-between gap-2 text-left"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-50 text-[#D94848] dark:bg-rose-950/60 dark:text-rose-400">
                    <ArrowDownLeft className="h-3 w-3" />
                  </span>
                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {t.dashboard.borrowedPayable}{' '}
                    <span className="font-medium text-slate-400 dark:text-slate-500">
                      ({netWorthSummary.borrowCount})
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <span className="font-mono-num text-xs font-extrabold tabular-nums text-[#D94848] dark:text-rose-400">
                    −{formatMoney(netWorthSummary.totalBorrow, currency)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </span>
              </button>

              {netWorthSummary.activeBorrowItems.length === 0 ? (
                <p className="py-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {t.modals.noActiveBorrowed}
                </p>
              ) : (
                <SwipeableBreakdownStrip>
                  {netWorthSummary.activeBorrowItems.map(({ tx, due }) => (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => {
                        onClose();
                        onInspectDebt(tx);
                      }}
                      className="flex w-[calc((100%-12px)/3)] min-w-[92px] shrink-0 snap-start cursor-pointer flex-col rounded-lg border border-slate-200/80 bg-[#F7F9F8] px-2 py-1.5 text-left transition-colors hover:border-rose-300 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-rose-500/40"
                    >
                      <span className="truncate text-[11px] font-medium leading-tight text-slate-600 dark:text-slate-300">
                        {tx.title || t.dashboard.borrowedPayable}
                      </span>
                      <span className="font-mono-num mt-0.5 truncate text-xs font-bold leading-tight tabular-nums text-[#102A43] dark:text-slate-100">
                        {formatMoney(due, currency)}
                      </span>
                    </button>
                  ))}
                </SwipeableBreakdownStrip>
              )}
            </div>
          </div>
        ) : (
          <>
            {hasSubCategoryStrip && (
              <div className="relative mb-2 shrink-0 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div
                  ref={subStripRef}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseDown={handleSubStripMouseDown}
                  onMouseMove={handleSubStripMouseMove}
                  onMouseUp={handleSubStripMouseEnd}
                  onMouseLeave={handleSubStripMouseEnd}
                  className="no-scrollbar flex cursor-grab touch-pan-x select-none items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 active:cursor-grabbing"
                >
                  <button
                    type="button"
                    aria-pressed={activeSubKey === null}
                    onClick={() => {
                      if (!wasSubStripDraggingRef.current) {
                        setSelectedSubCategory(null);
                        setOpenTxId(null);
                      }
                    }}
                    className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] ${
                      activeSubKey === null
                        ? isExpenseStyle
                          ? 'bg-[#D94848] text-white shadow-sm dark:bg-rose-600'
                          : 'bg-[#16845B] text-white shadow-sm dark:bg-emerald-600'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{t.common.all}</span>
                    <span aria-hidden="true" className="opacity-70">
                      ·
                    </span>
                    <span className="font-mono-num">{formatMoney(categoryTotal, currency)}</span>
                  </button>
                  {subCategoryBuckets.map((bucket) => {
                    const isSelected = activeSubKey === bucket.key;
                    return (
                      <button
                        key={bucket.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (!wasSubStripDraggingRef.current) {
                            setSelectedSubCategory(bucket.key);
                            setOpenTxId(null);
                          }
                        }}
                        className={`inline-flex min-h-[36px] shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] ${
                          isSelected
                            ? isExpenseStyle
                              ? 'bg-[#D94848] text-white shadow-sm dark:bg-rose-600'
                              : 'bg-[#16845B] text-white shadow-sm dark:bg-emerald-600'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="max-w-[140px] truncate">{bucket.label}</span>
                        <span aria-hidden="true" className="opacity-70">
                          ·
                        </span>
                        <span className="font-mono-num">{formatMoney(bucket.total, currency)}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 bottom-3 w-4 bg-gradient-to-r from-white to-transparent dark:from-slate-900"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 bottom-3 w-4 bg-gradient-to-l from-white to-transparent dark:from-slate-900"
                />
              </div>
            )}

            {(drilldownType === 'wallet' || drilldownType === 'savings') &&
              drilldownKey &&
              !isReadOnly && (
                <div className="mb-3 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onStartBalanceCorrection(drilldownKey)}
                    className="min-h-[40px] flex-1 cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
                  >
                    {t.modals.correctAccountBalance}
                  </button>
                  {onEditAccount && (
                    <button
                      type="button"
                      onClick={() => onEditAccount(drilldownType, drilldownKey)}
                      aria-label={`${t.common.edit} ${drilldownKey}`}
                      title={t.common.edit}
                      className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                      <span>{t.common.edit}</span>
                    </button>
                  )}
                </div>
              )}

            <div className="no-scrollbar min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t.modals.noTxForFilter}
                </p>
              ) : (
                filtered.map((tx) => (
                  <DrilldownTxRow
                    key={tx.id}
                    tx={tx}
                    currency={currency}
                    isReadOnly={isReadOnly}
                    isOpen={openTxId === tx.id}
                    onToggleOpen={setOpenTxId}
                    onInspectDebt={(item) => {
                      onClose();
                      onInspectDebt(item);
                    }}
                    onEdit={onEditTransaction}
                    onDelete={onDeleteTransaction}
                  />
                ))
              )}
            </div>
          </>
        )}

        {!isReadOnly &&
        ((drilldownPeriodContext?.budgetGoalId && onEditBudgetGoal) ||
          (drilldownPeriodContext?.savingGoalId && onEditSavingGoal)) ? (
          <div className="mt-4 flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (drilldownPeriodContext?.budgetGoalId && onEditBudgetGoal) {
                  onEditBudgetGoal(drilldownPeriodContext.budgetGoalId);
                } else if (drilldownPeriodContext?.savingGoalId && onEditSavingGoal) {
                  onEditSavingGoal(drilldownPeriodContext.savingGoalId);
                }
              }}
              className="min-h-[42px] flex-1 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
            >
              {drilldownPeriodContext?.budgetGoalId
                ? t.modals.editBudgetGoal
                : t.modals.editSavingGoal}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] flex-1 cursor-pointer rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
            >
              {t.common.close}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-[42px] w-full shrink-0 rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
          >
            {t.common.close}
          </button>
        )}
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
              className="font-mono-num no-spinner w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
            className="font-mono-num no-spinner w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#102A43] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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

/* --- Add New Wallet / Savings Account Modal (Home Quick Add) --- */
export const AddAccountModal: React.FC<{
  accountType: 'wallet' | 'savings' | null;
  currency: CurrencySymbol;
  onSave: (
    type: 'wallet' | 'savings',
    name: string,
    openingBalance: number | null,
    style?: CategoryStyle
  ) => Promise<boolean>;
  onClose: () => void;
}> = ({ accountType, currency, onSave, onClose }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [customStyle, setCustomStyle] = useState<CategoryStyle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (accountType) {
      setName('');
      setOpeningBalance('');
      setShowStylePicker(false);
      setCustomStyle(null);
      setIsSaving(false);
    }
  }, [accountType]);

  if (!accountType) return null;

  const isSavings = accountType === 'savings';
  const kind: CategoryKind = isSavings ? 'sav' : 'wal';
  const defaultStyle = getCategoryStyle(
    undefined,
    kind,
    name.trim() || (isSavings ? 'Saving' : 'Wallet')
  );
  const activeStyle = customStyle || defaultStyle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName || isSaving) return;

    const rawBal = openingBalance.trim();
    const parsedBal = rawBal === '' ? null : Number.parseFloat(rawBal);
    if (rawBal !== '' && (parsedBal === null || !Number.isFinite(parsedBal))) {
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onSave(accountType, cleanName, parsedBal, customStyle || undefined);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[88vh] w-full max-w-sm flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isSavings ? (
              <PiggyBank className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            ) : (
              <Wallet className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
            )}
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {isSavings ? t.modals.addSavingsTitle : t.modals.addWalletTitle}
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

        <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto pr-0.5">
          {/* Account Name + Live Icon Preview */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.accountNameLabel}
            </label>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowStylePicker((prev) => !prev)}
                title={t.modals.customizeIconColor}
                aria-label={t.modals.customizeIconColor}
                className="shrink-0 cursor-pointer rounded-xl transition-transform hover:scale-105 active:scale-95"
              >
                <CategoryIconBadge style={activeStyle} size="md" />
              </button>
              <input
                type="text"
                autoFocus
                maxLength={100}
                placeholder={
                  isSavings ? t.settings.newSavingsPlaceholder : t.settings.newWalletPlaceholder
                }
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Optional Opening Balance */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.openingBalanceLabel} ({currency})
            </label>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="font-mono-num w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
              {t.modals.openingBalanceHint}
            </p>
          </div>

          {/* Expandable Icon & Color Customizer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/50">
            <button
              type="button"
              onClick={() => setShowStylePicker((prev) => !prev)}
              aria-expanded={showStylePicker}
              className="flex min-h-[40px] w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-[#102A43] dark:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-[#16845B] dark:text-emerald-400" />
                <span>{t.modals.customizeIconColor}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showStylePicker ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showStylePicker && (
              <div className="space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_COLORS.map((hex) => {
                    const selected = activeStyle.color.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() =>
                          setCustomStyle({ icon: activeStyle.icon, color: hex })
                        }
                        aria-label={`Color ${hex}`}
                        style={{ backgroundColor: hex }}
                        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-transform ${
                          selected ? 'scale-110 ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900' : 'hover:scale-105'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
                <div className="grid max-h-36 grid-cols-6 gap-1.5 overflow-y-auto pr-0.5">
                  {CATEGORY_ICONS.map((opt) => {
                    const IconComp = opt.icon;
                    const selected = activeStyle.icon === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        title={opt.label}
                        onClick={() =>
                          setCustomStyle({ icon: opt.key, color: activeStyle.color })
                        }
                        className={`flex h-9 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                          selected
                            ? 'border-[#16845B] bg-emerald-50 text-[#16845B] dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSaving}
            className={`min-h-[40px] cursor-pointer rounded-xl px-5 py-2 text-xs font-bold text-white disabled:opacity-50 ${
              isSavings
                ? 'bg-sky-600 hover:bg-sky-700'
                : 'bg-[#16845B] hover:bg-[#126B4A]'
            }`}
          >
            {t.modals.addAccountBtn}
          </button>
        </div>
      </form>
    </div>
  );
};

/* --- Merge / Move Category & Sub-category Modal --- */
export const MergeCategoryModal: React.FC<{
  mergeTarget: {
    listType: 'exp_cat' | 'inc_cat' | 'sub_cat';
    categoryName: string;
    parentCategory?: string;
    txCount: number;
    triggeredByDelete?: boolean;
  } | null;
  mergeMode: 'merge' | 'as_sub';
  setMergeMode: (mode: 'merge' | 'as_sub') => void;
  targetCategory: string;
  setTargetCategory: (cat: string) => void;
  targetSubCategory: string;
  setTargetSubCategory: (sub: string) => void;
  availableCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  categoryStyles?: Record<string, CategoryStyle>;
  onConfirmMerge: () => void;
  onClose: () => void;
}> = ({
  mergeTarget,
  mergeMode,
  setMergeMode,
  targetCategory,
  setTargetCategory,
  targetSubCategory,
  setTargetSubCategory,
  availableCategories,
  expenseSubCategories = {},
  categoryStyles,
  onConfirmMerge,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!mergeTarget) return null;

  const isSub = mergeTarget.listType === 'sub_cat';
  const isExp = mergeTarget.listType === 'exp_cat';
  const isInc = mergeTarget.listType === 'inc_cat';
  const parentCat = mergeTarget.parentCategory || '';

  const sourceStyle = isSub
    ? getCategoryStyle(
        categoryStyles,
        'sub',
        getSubCategoryTargetName(parentCat, mergeTarget.categoryName)
      )
    : getCategoryStyle(categoryStyles, isExp ? 'exp' : 'inc', mergeTarget.categoryName);

  const canSaveAsSub =
    (isExp && availableCategories.some((c) => c !== mergeTarget.categoryName)) ||
    (isSub && availableCategories.some((c) => c !== parentCat));

  const effectiveMode: 'merge' | 'as_sub' = !isInc && canSaveAsSub ? mergeMode : 'merge';

  const selectableCategories = availableCategories.filter((cat) => {
    if (isExp || isInc) return cat !== mergeTarget.categoryName;
    if (isSub && effectiveMode === 'as_sub') return cat !== parentCat;
    return true;
  });

  const resolvedTargetCategory = selectableCategories.includes(targetCategory)
    ? targetCategory
    : selectableCategories[0] || '';

  const targetSubOptions =
    isSub && effectiveMode === 'merge' && resolvedTargetCategory
      ? (expenseSubCategories[resolvedTargetCategory] || []).filter(
          (sub) => !(resolvedTargetCategory === parentCat && sub === mergeTarget.categoryName)
        )
      : [];

  const destinationKind: CategoryKind = isInc ? 'inc' : 'exp';
  const destinationStyle = resolvedTargetCategory
    ? isSub && effectiveMode === 'merge' && targetSubCategory
      ? getCategoryStyle(
          categoryStyles,
          'sub',
          getSubCategoryTargetName(resolvedTargetCategory, targetSubCategory)
        )
      : getCategoryStyle(categoryStyles, destinationKind, resolvedTargetCategory)
    : null;

  const isInvalidAction =
    !resolvedTargetCategory ||
    ((isExp || isInc) && resolvedTargetCategory === mergeTarget.categoryName) ||
    (isSub && effectiveMode === 'as_sub' && resolvedTargetCategory === parentCat) ||
    (isSub &&
      effectiveMode === 'merge' &&
      resolvedTargetCategory === parentCat &&
      targetSubCategory === mergeTarget.categoryName);

  const handleModeSwitch = (nextMode: 'merge' | 'as_sub') => {
    setMergeMode(nextMode);
    setTargetSubCategory('');
    const nextValidCats = availableCategories.filter((cat) => {
      if (isExp || isInc) return cat !== mergeTarget.categoryName;
      if (isSub && nextMode === 'as_sub') return cat !== parentCat;
      return true;
    });
    if (!nextValidCats.includes(targetCategory)) {
      setTargetCategory(nextValidCats[0] || '');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {effectiveMode === 'as_sub' ? (
              <CornerDownRight className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
            ) : (
              <GitMerge className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            )}
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {isSub ? t.modals.mergeSubCategoryTitle : t.modals.mergeCategoryTitle}
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

        {/* Source Badge */}
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <CategoryIconBadge style={sourceStyle} size="sm" />
            <div className="min-w-0">
              {isSub && parentCat && (
                <div className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {parentCat}
                </div>
              )}
              <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                {mergeTarget.categoryName}
              </div>
            </div>
          </div>
          {mergeTarget.txCount > 0 && (
            <span className="font-mono-num shrink-0 rounded-lg bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {mergeTarget.txCount} {t.settings.transactionsCount}
            </span>
          )}
        </div>

        {/* Mode Switcher: Merge into Category vs Save as Sub-category */}
        {!isInc && canSaveAsSub && (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => handleModeSwitch('merge')}
              className={`min-h-[34px] cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                effectiveMode === 'merge'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.modals.mergeModeMergeTab}
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('as_sub')}
              className={`min-h-[34px] cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                effectiveMode === 'as_sub'
                  ? 'bg-white text-[#16845B] shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.modals.mergeModeAsSubTab}
            </button>
          </div>
        )}

        {mergeTarget.triggeredByDelete && mergeTarget.txCount > 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>"{mergeTarget.categoryName}"</strong> {t.modals.mergeInUseWarningPrefix}{' '}
            <strong>{mergeTarget.txCount}</strong> {t.modals.mergeInUseWarningSuffix}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {isSub ? (
              effectiveMode === 'as_sub' ? (
                t.modals.mergeSubMoveDesc
              ) : (
                t.modals.mergeSubIntoDesc
              )
            ) : effectiveMode === 'as_sub' ? (
              <>
                {t.modals.mergeAsSubDesc} <strong>"{mergeTarget.categoryName}"</strong>.
              </>
            ) : (
              <>
                {t.modals.mergeGenericDesc} <strong>"{mergeTarget.categoryName}"</strong>.
              </>
            )}
          </p>
        )}

        {/* Target Category Selector */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
            {effectiveMode === 'as_sub'
              ? t.modals.saveUnderCategoryLabel
              : t.modals.mergeIntoLabel}
          </label>
          <div className="flex items-center gap-2">
            {destinationStyle && <CategoryIconBadge style={destinationStyle} size="md" />}
            <select
              value={resolvedTargetCategory}
              onChange={(e) => {
                setTargetCategory(e.target.value);
                setTargetSubCategory('');
              }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {selectableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Optional Target Sub-category when merging a sub-category */}
        {isSub && effectiveMode === 'merge' && targetSubOptions.length > 0 && (
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.targetSubCategoryLabel}
            </label>
            <select
              value={targetSubCategory}
              onChange={(e) => setTargetSubCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">{t.modals.targetSubNoneOption}</option>
              {targetSubOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Result Preview */}
        {effectiveMode === 'as_sub' && resolvedTargetCategory && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-[#16845B] dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {resolvedTargetCategory} › {mergeTarget.categoryName}
            </span>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={isInvalidAction}
            onClick={onConfirmMerge}
            className={`min-h-[42px] w-full cursor-pointer rounded-xl py-2 text-xs font-bold text-white disabled:opacity-50 ${
              effectiveMode === 'as_sub'
                ? 'bg-[#16845B] hover:bg-[#126B4A]'
                : 'bg-sky-700 hover:bg-sky-800'
            }`}
          >
            {effectiveMode === 'as_sub' ? t.modals.saveAsSubBtn : t.modals.mergeAndDeleteBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] w-full cursor-pointer rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
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
  categoryStyles?: Record<string, CategoryStyle>;
  monthlySpentByCategory: Record<string, number>;
  currency: CurrencySymbol;
  onAddListItem?: (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    name: string,
    style?: CategoryStyle
  ) => Promise<boolean>;
  onSaveGoal: (category: string, monthlyLimit: number, editId?: string) => Promise<boolean>;
  onDeleteGoal: (id: string) => Promise<void>;
  onClose: () => void;
}> = ({
  open,
  initialGoal,
  budgetGoals,
  expenseCategories,
  categoryStyles,
  monthlySpentByCategory,
  currency,
  onAddListItem,
  onSaveGoal,
  onDeleteGoal,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCategoryPickerOpen(false);
      return;
    }
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
        <div className="mb-1 flex shrink-0 items-center justify-between">
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
        <p className="mb-4 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          {t.modals.budgetModalDesc}
        </p>

        <div ref={bodyRef} className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
          >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.modals.expenseCategory}
            </label>
            <button
              type="button"
              onClick={() => setCategoryPickerOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <CategoryIconBadge
                  style={getCategoryStyle(
                    categoryStyles,
                    'exp',
                    selectedCategory || categoryOptions[0] || 'Others'
                  )}
                  size="sm"
                />
                <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {selectedCategory}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
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
              className="font-mono-num no-spinner w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

          <div>
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
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CategoryIconBadge
                        style={getCategoryStyle(categoryStyles, 'exp', goal.category)}
                        size="sm"
                      />
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
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${goal.category} budget`}
                        onClick={() => {
                          setSelectedCategory(goal.category);
                          setLimitInput(String(goal.monthlyLimit));
                          setEditingGoalId(goal.id);
                          bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[40px] w-full shrink-0 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t.common.close}
        </button>
      </div>

      {categoryPickerOpen && (
        <TransactionPickerDrawer
          open={true}
          mode="exp_cat"
          title={t.txForm.drawerChooseExpCategory}
          selectedValue={selectedCategory}
          expenseCategories={categoryOptions}
          incomeCategories={[]}
          subCategories={[]}
          wallets={[]}
          savingsList={[]}
          allAccountOptions={[]}
          categoryStyles={categoryStyles}
          canCreate={Boolean(onAddListItem)}
          onSelect={(val) => handleCategoryChange(val)}
          onCreateItem={async (kind: AddableItemKind, name, _parent, style) => {
            if (!onAddListItem || kind !== 'exp_cat') return false;
            return onAddListItem('exp_cat', name, style);
          }}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </div>
  );
};

/* --- Saving Goals Modal (Monthly or Certain Period) --- */
export const SavingGoalsModal: React.FC<{
  open: boolean;
  initialGoal: SavingGoal | null;
  savingGoals: SavingGoal[];
  savingsList: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  transactions: Transaction[];
  currency: CurrencySymbol;
  onAddListItem?: (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    name: string,
    style?: CategoryStyle
  ) => Promise<boolean>;
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
  categoryStyles,
  transactions,
  currency,
  onAddListItem,
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
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const getDefaultEndDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (!open) {
      setAccountPickerOpen(false);
      return;
    }
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
        <div className="mb-3 flex shrink-0 items-center justify-between">
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

        <div ref={bodyRef} className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto">
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
              <button
                type="button"
                onClick={() => setAccountPickerOpen(true)}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/80"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedAccount ? (
                    <CategoryIconBadge
                      style={getCategoryStyle(categoryStyles, 'sav', selectedAccount)}
                      size="xs"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                      <PiggyBank className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {selectedAccount || t.modals.allSavingsOption}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </button>
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
              className="font-mono-num no-spinner w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-sky-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

          <div>
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
                    <div className="flex min-w-0 items-center gap-2.5">
                      {goal.account ? (
                        <CategoryIconBadge
                          style={getCategoryStyle(categoryStyles, 'sav', goal.account)}
                          size="sm"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                          <PiggyBank className="h-4 w-4" />
                        </span>
                      )}
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
                          bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-[40px] w-full shrink-0 rounded-xl bg-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t.common.close}
        </button>
      </div>

      {accountPickerOpen && (
        <TransactionPickerDrawer
          open={true}
          mode="sav_account"
          title={t.modals.linkedAccountLabel}
          selectedValue={selectedAccount}
          expenseCategories={[]}
          incomeCategories={[]}
          subCategories={[]}
          wallets={[]}
          savingsList={accountOptions}
          allAccountOptions={accountOptions}
          categoryStyles={categoryStyles}
          canCreate={Boolean(onAddListItem)}
          onSelect={(val) => setSelectedAccount(val)}
          onCreateItem={async (kind: AddableItemKind, name, _parent, style) => {
            if (!onAddListItem || kind !== 'savings') return false;
            return onAddListItem('savings', name, style);
          }}
          onClose={() => setAccountPickerOpen(false)}
        />
      )}
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
  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    if (target) {
      setSelectedIcon(initialStyle.icon);
      setSelectedColor(initialStyle.color);
      setIconSearch('');
    }
  }, [target, initialStyle.icon, initialStyle.color]);

  if (!target) return null;

  const draftStyle: CategoryStyle = {
    icon: selectedIcon,
    color: selectedColor,
  };

  const searchNeedle = iconSearch.trim().toLowerCase();
  const filteredIcons = searchNeedle
    ? CATEGORY_ICONS.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchNeedle) ||
          opt.key.toLowerCase().includes(searchNeedle)
      )
    : CATEGORY_ICONS;

  const targetDisplayLabel = formatCategoryStyleTargetLabel(target.kind, target.name);
  const isPresetColor = CATEGORY_COLORS.some(
    (hex) => hex.toLowerCase() === selectedColor.toLowerCase()
  );

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
              {targetDisplayLabel}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Icon Picker with Search */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {t.modals.chooseIcon}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {filteredIcons.length} / {CATEGORY_ICONS.length}
              </span>
            </div>

            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder={t.modals.searchIconsPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-8 pl-8 text-xs text-[#102A43] placeholder:text-slate-400 focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {iconSearch && (
                <button
                  type="button"
                  onClick={() => setIconSearch('')}
                  aria-label={t.common.close}
                  className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {filteredIcons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {t.modals.noIconsMatch}
              </div>
            ) : (
              <div className="grid max-h-52 grid-cols-7 gap-2 overflow-y-auto p-0.5">
                {filteredIcons.map((opt) => {
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
            )}
          </div>

          {/* Color Swatch Picker + Custom Color */}
          <div>
            <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {t.modals.chooseColor}
            </div>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
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
                    className={`flex h-9 items-center justify-center rounded-xl transition-transform active:scale-95 ${
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

            {/* Custom Color Input */}
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800/80">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/10 dark:border-white/15 ${
                    !isPresetColor
                      ? 'ring-2 ring-[#102A43] ring-offset-1 dark:ring-slate-100 dark:ring-offset-slate-900'
                      : ''
                  }`}
                  style={{ backgroundColor: selectedColor }}
                >
                  {!isPresetColor && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
                </span>
                <span className="truncate text-xs font-semibold text-[#102A43] dark:text-slate-200">
                  {t.modals.customColorLabel}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  {selectedColor}
                </span>
                <input
                  type="color"
                  aria-label={t.modals.customColorLabel}
                  value={/^#[0-9a-fA-F]{6}$/.test(selectedColor) ? selectedColor : '#16845B'}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-6 w-8 cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0"
                />
              </div>
            </label>
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

/* --- Recurring Bills & 1-Tap Log Modal --- */
export const RecurringBillsModal: React.FC<{
  open: boolean;
  bills: RecurringBill[];
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  allAccountOptions: string[];
  wallets?: string[];
  savingsList?: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  isReadOnly?: boolean;
  onAddListItem?: (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    name: string,
    style?: CategoryStyle
  ) => Promise<boolean>;
  onAddSubCategory?: (
    parentCat: string,
    subName: string,
    style?: CategoryStyle
  ) => Promise<boolean>;
  onSaveBill: (payload: RecurringBillSavePayload, editId?: string) => Promise<boolean>;
  onDeleteBill: (id: string) => Promise<void>;
  onOneTapLog: (bill: RecurringBill) => Promise<void>;
  onAdjustAndLog: (bill: RecurringBill) => void;
  onClose: () => void;
}> = ({
  open,
  bills,
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  allAccountOptions,
  wallets = [],
  savingsList = [],
  categoryStyles,
  currency,
  isReadOnly = false,
  onAddListItem,
  onAddSubCategory,
  onSaveBill,
  onDeleteBill,
  onOneTapLog,
  onAdjustAndLog,
  onClose,
}) => {
  const { t } = useTranslation();
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    if (open) setResetTick((c) => c + 1);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-[#F6F8F7] p-4 shadow-xl sm:p-5 dark:border-slate-800 dark:bg-slate-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 items-center gap-2">
            <Repeat className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.recurring.modalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto">
          <RecurringBillsPanel
            bills={bills}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            expenseSubCategories={expenseSubCategories}
            allAccountOptions={allAccountOptions}
            wallets={wallets}
            savingsList={savingsList}
            categoryStyles={categoryStyles}
            currency={currency}
            isReadOnly={isReadOnly}
            resetTrigger={resetTick}
            onAddListItem={onAddListItem}
            onAddSubCategory={onAddSubCategory}
            onSaveBill={onSaveBill}
            onDeleteBill={onDeleteBill}
            onOneTapLog={onOneTapLog}
            onAdjustAndLog={onAdjustAndLog}
          />
        </div>
      </div>
    </div>
  );
};

/* --- Goals Overview Modal (Budget & Saving Goals Detail Sheet) --- */
export const GoalsOverviewModal: React.FC<{
  activeTab: 'budget' | 'saving' | null;
  setActiveTab: (tab: 'budget' | 'saving') => void;
  budgetGoals: BudgetGoal[];
  savingGoals: SavingGoal[];
  monthlySpentByCategory: Record<string, number>;
  transactions: Transaction[];
  savingsList: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  isReadOnly?: boolean;
  onInspectBudgetGoal: (goal: BudgetGoal) => void;
  onInspectSavingGoal: (
    goal: SavingGoal,
    progress: ReturnType<typeof computeSavingGoalProgress>
  ) => void;
  onEditBudgetGoal: (goal?: BudgetGoal) => void;
  onEditSavingGoal: (goal?: SavingGoal) => void;
  onClose: () => void;
}> = ({
  activeTab,
  setActiveTab,
  budgetGoals,
  savingGoals,
  monthlySpentByCategory,
  transactions,
  savingsList,
  categoryStyles,
  currency,
  isReadOnly = false,
  onInspectBudgetGoal,
  onInspectSavingGoal,
  onEditBudgetGoal,
  onEditSavingGoal,
  onClose,
}) => {
  const { lang, t } = useTranslation();
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    if (!activeTab) {
      setBarsReady(false);
      return;
    }
    setBarsReady(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarsReady(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  if (!activeTab) return null;

  const isBudgetTab = activeTab === 'budget';
  const fmtPlainAmount = (val: number) =>
    Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayPacePct = Math.min(100, Math.max(0, (now.getDate() / daysInMonth) * 100));

  const sortedBudgetItems = [...budgetGoals]
    .map((goal) => {
      const spent = monthlySpentByCategory[goal.category] || 0;
      const pct = goal.monthlyLimit > 0 ? (spent / goal.monthlyLimit) * 100 : 0;
      return { goal, spent, pct };
    })
    .sort((a, b) => b.pct - a.pct);

  const totalBudgetLimit = budgetGoals.reduce((sum, g) => sum + g.monthlyLimit, 0);
  const totalBudgetSpent = budgetGoals.reduce(
    (sum, g) => sum + (monthlySpentByCategory[g.category] || 0),
    0
  );
  const totalBudgetPct = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;
  const budgetOverCount = sortedBudgetItems.filter((item) => item.pct > 100).length;
  const budgetIsOver = totalBudgetPct > 100 || budgetOverCount > 0;
  const budgetIsNear = !budgetIsOver && totalBudgetPct >= 80;

  const sortedSavingItems = savingGoals
    .map((goal) => ({
      goal,
      progress: computeSavingGoalProgress(goal, transactions, savingsList, lang),
    }))
    .sort((a, b) => b.progress.pct - a.progress.pct);

  const totalSavingTarget = savingGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSavingSaved = sortedSavingItems.reduce(
    (sum, item) => sum + Math.max(0, item.progress.savedAmount),
    0
  );
  const totalSavingPct =
    totalSavingTarget > 0 ? (totalSavingSaved / totalSavingTarget) * 100 : 0;
  const savingReachedCount = sortedSavingItems.filter((item) => item.progress.pct >= 100).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[min(84vh,640px)] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {isBudgetTab ? (
              <Target className="h-4 w-4 shrink-0 text-[#1E9E6A] dark:text-emerald-400" />
            ) : (
              <PiggyBank className="h-4 w-4 shrink-0 text-[#10B981] dark:text-emerald-400" />
            )}
            <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.dashboard.goalsOverview}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="mb-3.5 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all ${
              isBudgetTab
                ? 'bg-white text-[#102A43] shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Target
              className={`h-3.5 w-3.5 shrink-0 ${
                isBudgetTab ? 'text-sky-600 dark:text-sky-400' : ''
              }`}
            />
            <span className="truncate">{t.dashboard.monthlyBudgetGoals}</span>
            {budgetGoals.length > 0 && (
              <span className="font-mono-num shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                ({budgetGoals.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saving')}
            className={`flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all ${
              !isBudgetTab
                ? 'bg-white text-[#102A43] shadow-sm dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <PiggyBank
              className={`h-3.5 w-3.5 shrink-0 ${
                !isBudgetTab ? 'text-[#10B981] dark:text-emerald-400' : ''
              }`}
            />
            <span className="truncate">{t.dashboard.savingGoalsTitle}</span>
            {savingGoals.length > 0 && (
              <span className="font-mono-num shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                ({savingGoals.length})
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {isBudgetTab ? (
            sortedBudgetItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
                <Target className="mx-auto mb-2.5 h-7 w-7 text-[#1E9E6A]/70 dark:text-emerald-400/70" />
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t.dashboard.emptyBudgetDesc}
                </p>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onEditBudgetGoal()}
                    className="mt-4 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>{t.dashboard.setFirstBudget}</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Overall Monthly Budget Summary Banner */}
                <div className="mb-3 rounded-2xl border border-[#E3E9EC] bg-[#F4F7F6] p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                  <span className="block text-[11px] font-semibold text-[#5B6B7F] dark:text-slate-400">
                    {t.dashboard.totalBudgetedSpend}
                  </span>

                  {/* Same-line Spent / Expected */}
                  <div className="font-mono-num mt-1 flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-lg font-extrabold text-[#112A46] dark:text-slate-100">
                      {formatMoney(totalBudgetSpent, currency)}
                    </span>
                    <span className="text-xs font-medium text-[#5B6B7F] dark:text-slate-400">
                      / {fmtPlainAmount(totalBudgetLimit)}
                    </span>
                  </div>

                  {/* Animated Bar + Inline Percentage */}
                  <div className="mt-2.5 flex items-center gap-2.5">
                    <div className="relative h-2 flex-1 rounded-full bg-[#E3E9EC] dark:bg-slate-700">
                      <div
                        className={`goal-bar-fill h-full rounded-full ${
                          budgetIsOver
                            ? 'bg-[#EF4444] dark:bg-rose-400'
                            : budgetIsNear
                            ? 'bg-[#E8A317] dark:bg-amber-400'
                            : 'bg-[#10B981] dark:bg-emerald-400'
                        }`}
                        style={{
                          width: `${
                            barsReady ? Math.min(100, Math.max(0, totalBudgetPct)) : 0
                          }%`,
                        }}
                      />
                      <span
                        aria-hidden="true"
                        style={{ left: `${todayPacePct}%` }}
                        className="pointer-events-none absolute -top-[2px] h-3 w-[2px] -translate-x-1/2 rounded-full bg-[#112A46]/70 dark:bg-slate-200/80"
                      />
                    </div>
                    <span
                      className={`font-mono-num shrink-0 text-xs font-bold tabular-nums ${
                        budgetIsOver
                          ? 'text-[#B42318] dark:text-rose-400'
                          : budgetIsNear
                          ? 'text-[#8A5300] dark:text-amber-400'
                          : 'text-[#0F6B45] dark:text-emerald-400'
                      }`}
                    >
                      {Math.round(totalBudgetPct)}%
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`font-medium ${
                        budgetOverCount > 0 || totalBudgetPct > 100
                          ? 'text-[#B42318] dark:text-rose-400'
                          : 'text-[#5B6B7F] dark:text-slate-400'
                      }`}
                    >
                      {totalBudgetPct > 100
                        ? `${t.dashboard.exceededLimitBy} ${formatMoney(
                            totalBudgetSpent - totalBudgetLimit,
                            currency
                          )}`
                        : `${formatMoney(
                            Math.max(0, totalBudgetLimit - totalBudgetSpent),
                            currency
                          )} ${t.dashboard.remainingMonth}`}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-[#5B6B7F] dark:text-slate-400">
                      {t.dashboard.todayLabel} {Math.round(todayPacePct)}%
                    </span>
                  </div>
                </div>

                {/* Per-Category Budget Rows */}
                <div className="space-y-1.5">
                  {sortedBudgetItems.map(({ goal, spent, pct }) => {
                    const roundedPct = Math.round(pct);
                    const isOver = pct > 100;
                    const isNear = !isOver && pct >= 80;
                    const remaining = Math.max(0, goal.monthlyLimit - spent);
                    const exceeded = Math.max(0, spent - goal.monthlyLimit);

                    return (
                      <div
                        key={goal.id}
                        className="flex items-stretch gap-1 rounded-xl border border-slate-100 bg-white transition-colors hover:border-slate-200 hover:bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"
                      >
                        <button
                          type="button"
                          onClick={() => onInspectBudgetGoal(goal)}
                          className="min-w-0 flex-1 cursor-pointer p-3 text-left"
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
                                {fmtPlainAmount(goal.monthlyLimit)}
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-1.5 flex-1 overflow-hidden rounded-full ${
                                isOver
                                  ? 'bg-rose-500/15 dark:bg-rose-400/20'
                                  : isNear
                                  ? 'bg-amber-500/15 dark:bg-amber-400/20'
                                  : 'bg-emerald-500/12 dark:bg-emerald-400/15'
                              }`}
                            >
                              <div
                                className={`goal-bar-fill h-full rounded-full ${
                                  isOver
                                    ? 'bg-[#EF4444] dark:bg-rose-400'
                                    : isNear
                                    ? 'bg-[#E8A317] dark:bg-amber-400'
                                    : 'bg-[#10B981] dark:bg-emerald-400'
                                }`}
                                style={{
                                  width: `${barsReady ? Math.min(100, Math.max(0, pct)) : 0}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`font-mono-num w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums ${
                                isOver
                                  ? 'text-[#B42318] dark:text-rose-400'
                                  : isNear
                                  ? 'text-[#8A5300] dark:text-amber-400'
                                  : 'text-[#0F6B45] dark:text-emerald-400'
                              }`}
                            >
                              {roundedPct}%
                            </span>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={`font-mono-num font-medium ${
                                isOver
                                  ? 'text-[#B42318] dark:text-rose-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {isOver
                                ? `+${formatMoney(exceeded, currency)} ${t.dashboard.overBudget}`
                                : `${formatMoney(remaining, currency)} ${t.modals.remainingShort}`}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                          </div>
                        </button>

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditBudgetGoal(goal);
                            }}
                            aria-label={`${t.modals.editBudgetGoal} ${goal.category}`}
                            title={t.modals.editBudgetGoal}
                            className="flex w-10 shrink-0 cursor-pointer items-center justify-center rounded-r-xl border-l border-slate-100 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#102A43] dark:border-slate-800/80 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : sortedSavingItems.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
              <PiggyBank className="mx-auto mb-2.5 h-7 w-7 text-[#10B981]/70 dark:text-emerald-400/70" />
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t.dashboard.emptySavingDesc}
              </p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onEditSavingGoal()}
                  className="mt-4 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>{t.dashboard.setFirstSaving}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Overall Saving Goals Summary Banner */}
              <div className="mb-3 rounded-2xl border border-[#E3E9EC] bg-[#F4F7F6] p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                <span className="block text-[11px] font-semibold text-[#5B6B7F] dark:text-slate-400">
                  {t.dashboard.totalSavedTowardGoals}
                </span>

                {/* Same-line Saved / Target */}
                <div className="font-mono-num mt-1 flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-lg font-extrabold text-[#112A46] dark:text-slate-100">
                    {formatMoney(totalSavingSaved, currency)}
                  </span>
                  <span className="text-xs font-medium text-[#5B6B7F] dark:text-slate-400">
                    / {fmtPlainAmount(totalSavingTarget)}
                  </span>
                </div>

                {/* Animated Bar + Inline Percentage */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E3E9EC] dark:bg-slate-700">
                    <div
                      className="goal-bar-fill h-full rounded-full bg-[#10B981] dark:bg-emerald-400"
                      style={{
                        width: `${
                          barsReady ? Math.min(100, Math.max(0, totalSavingPct)) : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="font-mono-num shrink-0 text-xs font-bold tabular-nums text-[#0F6B45] dark:text-emerald-400">
                    {Math.round(totalSavingPct)}%
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[#5B6B7F] dark:text-slate-400">
                  <span className="font-medium">
                    {savingReachedCount === sortedSavingItems.length
                      ? t.dashboard.allGoalsReached
                      : savingReachedCount > 0
                      ? `${savingReachedCount}/${sortedSavingItems.length} ${t.dashboard.reachedLabel}`
                      : `${sortedSavingItems.length} ${
                          sortedSavingItems.length === 1
                            ? t.dashboard.activeGoalsSingular
                            : t.dashboard.activeGoalsPlural
                        }`}
                  </span>
                  {totalSavingTarget > totalSavingSaved && (
                    <span className="font-mono-num shrink-0 font-medium">
                      {formatMoney(totalSavingTarget - totalSavingSaved, currency)}{' '}
                      {t.modals.remainingShort}
                    </span>
                  )}
                </div>
              </div>

              {/* Per-Saving-Goal Rows */}
              <div className="space-y-1.5">
                {sortedSavingItems.map(({ goal, progress }) => {
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
                    <div
                      key={goal.id}
                      className="flex items-stretch gap-1 rounded-xl border border-slate-100 bg-white transition-colors hover:border-slate-200 hover:bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"
                    >
                      <button
                        type="button"
                        onClick={() => onInspectSavingGoal(goal, progress)}
                        className="min-w-0 flex-1 cursor-pointer p-3 text-left"
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
                              {fmtPlainAmount(goal.targetAmount)}
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-500/12 dark:bg-emerald-400/15">
                            <div
                              className="goal-bar-fill h-full rounded-full bg-[#10B981] dark:bg-emerald-400"
                              style={{
                                width: `${
                                  barsReady ? Math.min(100, Math.max(0, progress.pct)) : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="font-mono-num w-9 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[#0F6B45] dark:text-emerald-400">
                            {roundedPct}%
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                          <span
                            className={`truncate font-medium ${
                              reached
                                ? 'text-[#0F6B45] dark:text-emerald-400'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {reached
                              ? t.dashboard.goalReached
                              : daysText
                              ? `${daysText} · ${formatMoney(progress.remaining, currency)} ${t.modals.remainingShort}`
                              : `${formatMoney(progress.remaining, currency)} ${t.modals.remainingShort}`}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                        </div>
                      </button>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSavingGoal(goal);
                          }}
                          aria-label={`${t.modals.editSavingGoal} ${goal.title}`}
                          title={t.modals.editSavingGoal}
                          className="flex w-10 shrink-0 cursor-pointer items-center justify-center rounded-r-xl border-l border-slate-100 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#102A43] dark:border-slate-800/80 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex shrink-0 items-center gap-2.5">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => (isBudgetTab ? onEditBudgetGoal() : onEditSavingGoal())}
              className="inline-flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/80"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{isBudgetTab ? t.modals.addBudgetBtn : t.modals.addSavingGoalBtn}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] flex-1 cursor-pointer rounded-xl bg-[#16845B] py-2 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
};

