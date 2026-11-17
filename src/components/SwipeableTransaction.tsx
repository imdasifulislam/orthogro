import React, { useEffect, useRef } from 'react';
import { Banknote, CheckCircle2, History, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryStyle, CurrencySymbol, Transaction } from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';
import { formatMoney } from '../utils/format';
import { getTransactionHierarchy } from '../utils/transactionDisplay';

interface SwipeableTransactionProps {
  tx: Transaction;
  currency: CurrencySymbol;
  categoryStyles?: Record<string, CategoryStyle>;
  isOpen: boolean;
  onToggleOpen: (id: string | null) => void;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onResolveDebt: (tx: Transaction) => void;
  onInspectDebt?: (tx: Transaction) => void;
  isSwipeBlocked?: () => boolean;
}

export const SwipeableTransaction: React.FC<SwipeableTransactionProps> = ({
  tx,
  currency,
  categoryStyles,
  isOpen,
  onToggleOpen,
  onDelete,
  onEdit,
  onResolveDebt,
  onInspectDebt,
  isSwipeBlocked,
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
  const canEdit = !isSystemTx;
  const hasInspectDebt = isDebt && Boolean(onInspectDebt);
  const revealWidth = hasInspectDebt && canEdit ? 144 : canEdit ? 112 : 56;
  const trayWidthClass = hasInspectDebt && canEdit ? 'w-36' : canEdit ? 'w-28' : 'w-14';
  const dueAmount = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressOriginRef.current = null;
  };

  useEffect(() => clearPressTimer, []);

  const toggleTray = () => {
    onToggleOpen(isOpen ? null : tx.id);
  };

  const startLongPress = (clientX: number, clientY: number) => {
    clearPressTimer();
    didLongPressRef.current = false;
    pressOriginRef.current = { x: clientX, y: clientY };
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      pressOriginRef.current = null;
      if (isSwipeBlocked?.()) return;
      didLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
      toggleTray();
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

  const amountColorClass = () => {
    if (tx.type === 'income') return 'text-[#16845B] dark:text-emerald-400';
    if (tx.type === 'expense') return 'text-[#D94848] dark:text-rose-400';
    if (tx.type === 'lend') return 'text-blue-700 dark:text-blue-400';
    if (tx.type === 'borrow') return 'text-purple-700 dark:text-purple-400';
    if (tx.type === 'partial_payment') return 'text-amber-700 dark:text-amber-400';
    return 'text-sky-700 dark:text-sky-400';
  };

  const amountPrefix = () => {
    if (tx.resolved && isDebt) {
      return `${t.txItem.settledPrefix} `;
    }
    if (tx.type === 'income' || tx.type === 'borrow') return '+';
    if (tx.type === 'expense' || tx.type === 'lend') return '-';
    if (tx.type === 'partial_payment') return tx.isLendPay ? '+' : '-';
    if (tx.type === 'transfer') return '⇄ ';
    return tx.amount >= 0 ? '+' : '';
  };

  const hierarchy = getTransactionHierarchy(tx, {
    expense: t.common.expense,
    income: t.common.income,
    transfer: t.common.transfer,
    lend: t.common.lend,
    borrow: t.common.borrow,
    general: t.common.general,
  });

  const renderMetaParts = (parts: Array<string | undefined>) => {
    const cleanParts = parts.filter((part): part is string => Boolean(part && part.trim()));
    return cleanParts.map((part, idx) => (
      <React.Fragment key={`${idx}-${part}`}>
        {idx > 0 && <span aria-hidden="true">·</span>}
        <span>{part}</span>
      </React.Fragment>
    ));
  };

  const renderMetaLine = () => {
    if (tx.type === 'transfer') {
      return (
        <>
          <span>
            {tx.fromWallet} → {tx.toWallet}
          </span>
          {tx.charge ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {t.txItem.fee}: {formatMoney(tx.charge, currency)}
              </span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{tx.date}</span>
        </>
      );
    }

    if (isDebt) {
      return (
        <>
          <span>{tx.wallet}</span>
          <span aria-hidden="true">·</span>
          <span>{tx.type === 'lend' ? t.txItem.lent : t.txItem.borrowed}</span>
          <span aria-hidden="true">·</span>
          <span className={tx.resolved ? 'font-semibold text-[#16845B] dark:text-emerald-400' : ''}>
            {tx.resolved ? t.txItem.paidInFull : `${t.txItem.due} ${formatMoney(dueAmount, currency)}`}
          </span>
          <span aria-hidden="true">·</span>
          <span>{tx.date}</span>
        </>
      );
    }

    if (tx.type === 'partial_payment') {
      return (
        <>
          <span>{t.txItem.partialSettlement}</span>
          <span aria-hidden="true">·</span>
          <span>{tx.wallet}</span>
          {tx.parentTitle ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {t.txItem.ref}: {tx.parentTitle}
              </span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span>{tx.date}</span>
        </>
      );
    }

    if (hierarchy.titleSource === 'custom') {
      const categorySegment = hierarchy.subCategoryLabel
        ? `${hierarchy.categoryLabel} › ${hierarchy.subCategoryLabel}`
        : hierarchy.categoryLabel;
      return renderMetaParts([categorySegment, tx.wallet, tx.date]);
    }

    if (hierarchy.titleSource === 'subCategory') {
      return renderMetaParts([hierarchy.categoryLabel, tx.wallet, tx.date]);
    }

    return renderMetaParts([tx.wallet, tx.date]);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* Revealed action tray (slide style) */}
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
              onInspectDebt?.(tx);
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

      {/* Foreground card */}
      <div
        role="button"
        tabIndex={0}
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
          if (didLongPressRef.current || isSwipeBlocked?.()) return;
          toggleTray();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTray();
          }
        }}
        style={{
          transform: `translateX(${isOpen ? -revealWidth : 0}px)`,
        }}
        className="relative z-10 flex cursor-pointer items-center justify-between gap-3 bg-white px-4 py-3.5 transition-transform duration-200 ease-out select-none hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isDebt ? (
            <button
              type="button"
              onTouchStart={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isOpen) {
                  onToggleOpen(null);
                  return;
                }
                onResolveDebt(tx);
              }}
              title={tx.resolved ? t.txItem.settledTitle : t.txItem.recordPaymentTitle}
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                tx.resolved
                  ? 'bg-[#16845B] text-white'
                  : 'bg-emerald-50 text-[#16845B] hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {tx.resolved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Banknote className="h-4 w-4" />
              )}
            </button>
          ) : tx.type === 'expense' || tx.type === 'income' ? (
            <CategoryIconBadge
              style={getCategoryStyle(
                categoryStyles,
                tx.type === 'income' ? 'inc' : 'exp',
                tx.category || 'Others'
              )}
              size="md"
              className="mt-0.5"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
              {hierarchy.mainTitle}
            </h4>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              {renderMetaLine()}
            </p>
            {hierarchy.extraNote && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {hierarchy.extraNote}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`font-mono-num text-right text-sm font-bold sm:text-base ${amountColorClass()}`}
          >
            {amountPrefix()}
            {formatMoney(Math.abs(tx.amount), currency)}
          </div>

          {/* Desktop quick action buttons */}
          <div
            className={`hidden items-center gap-1 transition-opacity sm:flex ${
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
