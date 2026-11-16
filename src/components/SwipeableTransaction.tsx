import React, { useRef, useState } from 'react';
import { Banknote, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryStyle, CurrencySymbol, Transaction } from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';
import { formatMoney } from '../utils/format';
import { getTransactionHierarchy } from '../utils/transactionDisplay';

interface SwipeableTransactionProps {
  tx: Transaction;
  currency: CurrencySymbol;
  categoryStyles?: Record<string, CategoryStyle>;
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onResolveDebt: (tx: Transaction) => void;
  onInspectDebt?: (tx: Transaction) => void;
  onRowSwipeClaim?: () => void;
}

export const SwipeableTransaction: React.FC<SwipeableTransactionProps> = ({
  tx,
  currency,
  categoryStyles,
  onDelete,
  onEdit,
  onResolveDebt,
  onInspectDebt,
  onRowSwipeClaim,
}) => {
  const { t } = useTranslation();
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const axisRef = useRef<'x' | 'y' | null>(null);
  const claimedRef = useRef(false);
  const draggingRef = useRef(false);

  const handleStart = (clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    axisRef.current = null;
    claimedRef.current = false;
    draggingRef.current = true;
  };

  const handleMove = (
    clientX: number,
    clientY: number,
    stopPropagation: () => void
  ) => {
    if (!draggingRef.current) return;
    const diffX = clientX - startXRef.current;
    const diffY = clientY - startYRef.current;

    if (!axisRef.current && (Math.abs(diffX) > 7 || Math.abs(diffY) > 7)) {
      axisRef.current = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
    }
    if (axisRef.current !== 'x') return;

    if ((!isSwiped && diffX < -5) || (isSwiped && diffX > 5)) {
      if (!claimedRef.current) {
        claimedRef.current = true;
        onRowSwipeClaim?.();
      }
      stopPropagation();
      if (diffX < -5 && diffX > -130) {
        setOffsetX(diffX);
      } else if (diffX > 5 && isSwiped) {
        setOffsetX(0);
        setIsSwiped(false);
      }
    }
  };

  const handleEnd = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    axisRef.current = null;
    claimedRef.current = false;
    if (offsetX < -55) {
      setIsSwiped(true);
      setOffsetX(-112);
    } else {
      setIsSwiped(false);
      setOffsetX(0);
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
    if (tx.resolved && (tx.type === 'lend' || tx.type === 'borrow')) {
      return `${t.txItem.settledPrefix} `;
    }
    if (tx.type === 'income' || tx.type === 'borrow') return '+';
    if (tx.type === 'expense' || tx.type === 'lend') return '-';
    if (tx.type === 'partial_payment') return tx.isLendPay ? '+' : '-';
    if (tx.type === 'transfer') return '⇄ ';
    return tx.amount >= 0 ? '+' : '';
  };

  const isDebt = tx.type === 'lend' || tx.type === 'borrow';
  const dueAmount = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;

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
      {/* Swipe revealed actions */}
      <div className="absolute inset-y-0 right-0 flex w-28 bg-slate-100 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => {
            setIsSwiped(false);
            setOffsetX(0);
            onDelete(tx.id);
          }}
          aria-label={t.txItem.deleteAria}
          className="flex flex-1 items-center justify-center text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSwiped(false);
            setOffsetX(0);
            onEdit(tx);
          }}
          aria-label={t.txItem.editAria}
          className="flex flex-1 items-center justify-center text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      {/* Foreground card */}
      <div
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) =>
          handleMove(e.touches[0].clientX, e.touches[0].clientY, () => e.stopPropagation())
        }
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onMouseDown={(e) => {
          if (e.button === 0) handleStart(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleMove(e.clientX, e.clientY, () => e.stopPropagation());
        }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        style={{
          transform: `translateX(${isSwiped ? -112 : offsetX < 0 ? offsetX : 0}px)`,
        }}
        className={`relative z-10 flex items-center justify-between gap-3 bg-white px-4 py-3.5 select-none dark:bg-slate-900 ${
          isSwiped || offsetX === 0 ? 'transition-transform duration-200 ease-out' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isDebt ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
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
          ) : (tx.type === 'expense' || tx.type === 'income') ? (
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

          <div
            className={`min-w-0 flex-1 ${isDebt && onInspectDebt ? 'cursor-pointer' : ''}`}
            onClick={() => {
              if (isDebt && onInspectDebt && !isSwiped) {
                onInspectDebt(tx);
              }
            }}
          >
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
          <div className={`font-mono-num text-right text-sm font-bold sm:text-base ${amountColorClass()}`}>
            {amountPrefix()}
            {formatMoney(Math.abs(tx.amount), currency)}
          </div>

          {/* Desktop / accessible action buttons */}
          <div className="hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tx);
              }}
              aria-label={t.txItem.editAria}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
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
