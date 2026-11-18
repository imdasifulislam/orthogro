import React, { useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Repeat,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';

export type SelectableTransactionType = 'expense' | 'income' | 'transfer' | 'lend' | 'borrow';

interface TransactionTypeDrawerProps {
  open: boolean;
  dueRecurringCount?: number;
  onSelectType: (type: SelectableTransactionType) => void;
  onOpenRecurring?: () => void;
  onClose: () => void;
}

export const TransactionTypeDrawer: React.FC<TransactionTypeDrawerProps> = ({
  open,
  dueRecurringCount = 0,
  onSelectType,
  onOpenRecurring,
  onClose,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const actionItems: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    badgeCount?: number;
    onClick: () => void;
  }> = [
    {
      key: 'income',
      label: t.common.income,
      icon: TrendingUp,
      badgeClass:
        'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400',
      onClick: () => onSelectType('income'),
    },
    {
      key: 'expense',
      label: t.common.expense,
      icon: TrendingDown,
      badgeClass:
        'bg-rose-50 text-[#D94848] dark:bg-rose-950/60 dark:text-rose-400',
      onClick: () => onSelectType('expense'),
    },
    {
      key: 'transfer',
      label: t.common.transfer,
      icon: ArrowLeftRight,
      badgeClass:
        'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      onClick: () => onSelectType('transfer'),
    },
    {
      key: 'lend',
      label: t.common.lend,
      icon: ArrowUpRight,
      badgeClass:
        'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
      onClick: () => onSelectType('lend'),
    },
    {
      key: 'borrow',
      label: t.common.borrow,
      icon: ArrowDownLeft,
      badgeClass:
        'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
      onClick: () => onSelectType('borrow'),
    },
    ...(onOpenRecurring
      ? [
          {
            key: 'recurring',
            label: t.txForm.recurringShort,
            icon: Repeat,
            badgeClass:
              'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
            badgeCount: dueRecurringCount,
            onClick: onOpenRecurring,
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/45 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.txForm.drawerChooseTypeTitle}
        className="animate-drawer-up flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border border-slate-200/80 bg-white pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6 dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 pt-3 pb-5">
          <h3 className="truncate text-lg font-extrabold tracking-tight text-[#102A43] dark:text-slate-100">
            {t.txForm.drawerChooseTypeTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Column Squircle Quick Action Grid */}
        <div className="overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-3 gap-x-4 gap-y-5">
            {actionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  className="group flex min-h-[84px] flex-col items-center justify-start gap-2 rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                >
                  <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-150 group-hover:scale-105 group-active:scale-95 ${item.badgeClass}`}
                  >
                    <Icon className="h-6 w-6" />
                    {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
                        {item.badgeCount}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
