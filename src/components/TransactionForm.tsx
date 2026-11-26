import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChevronDown,
  Plus,
  Repeat,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  CategoryStyle,
  CurrencySymbol,
  RecurringBill,
  TransactionDraft,
  TransactionType,
} from '../types';
import {
  CategoryIconBadge,
  getCategoryStyle,
  getExpenseOrSubCategoryStyle,
} from '../utils/categoryVisuals';
import {
  RecurringBillsPanel,
  type RecurringBillSavePayload,
} from './RecurringBillsPanel';
import {
  type AddableItemKind,
  TransactionPickerDrawer,
  type TransactionPickerMode,
} from './TransactionPickerDrawer';

export type TransactionPageSubTab = 'new' | 'recurring';

type DrawerField = 'category' | 'subCategory' | 'wallet' | 'fromWallet' | 'toWallet';

interface ActivePickerState {
  entryIndex: number;
  field: DrawerField;
}

interface TransactionFormProps {
  open: boolean;
  entries: TransactionDraft[];
  setEntries: React.Dispatch<React.SetStateAction<TransactionDraft[]>>;
  defaultEntry: TransactionDraft;
  allAccountOptions: string[];
  wallets?: string[];
  savingsList?: string[];
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  activeSubTab?: TransactionPageSubTab;
  onSubTabChange?: (tab: TransactionPageSubTab) => void;
  recurringBills?: RecurringBill[];
  dueRecurringCount?: number;
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
  onSaveRecurringBill?: (
    payload: RecurringBillSavePayload,
    editId?: string
  ) => Promise<boolean>;
  onDeleteRecurringBill?: (id: string) => Promise<void>;
  onOneTapLogRecurringBill?: (bill: RecurringBill) => Promise<void>;
  onAdjustAndLogRecurringBill?: (bill: RecurringBill) => void;
  onOpenTypeDrawer?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

function getTypeVisualMeta(type: TransactionType): {
  Icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
} {
  switch (type) {
    case 'income':
      return {
        Icon: TrendingUp,
        badgeClass: 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400',
      };
    case 'transfer':
      return {
        Icon: ArrowLeftRight,
        badgeClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
      };
    case 'lend':
      return {
        Icon: ArrowUpRight,
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
      };
    case 'borrow':
      return {
        Icon: ArrowDownLeft,
        badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
      };
    case 'expense':
    default:
      return {
        Icon: TrendingDown,
        badgeClass: 'bg-rose-50 text-[#D94848] dark:bg-rose-950/60 dark:text-rose-400',
      };
  }
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  entries,
  setEntries,
  defaultEntry,
  allAccountOptions,
  wallets = [],
  savingsList = [],
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  categoryStyles,
  currency,
  activeSubTab = 'new',
  recurringBills = [],
  dueRecurringCount = 0,
  isReadOnly = false,
  onAddListItem,
  onAddSubCategory,
  onSaveRecurringBill,
  onDeleteRecurringBill,
  onOneTapLogRecurringBill,
  onAdjustAndLogRecurringBill,
  onOpenTypeDrawer,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(entries[0]?.id);
  const editingId = entries[0]?.id || null;
  const currentSubTab: TransactionPageSubTab = isEditing ? 'new' : activeSubTab;
  const [showLegacyTitleInput, setShowLegacyTitleInput] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePickerState | null>(null);

  useEffect(() => {
    setShowLegacyTitleInput(Boolean(editingId && entries[0]?.title.trim()));
    // Only evaluate when entering edit mode for a specific transaction ID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (!open) {
      setActivePicker(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || activePicker || !onCancel) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, activePicker, onCancel]);

  if (!open) return null;

  const primaryType = entries[0]?.type || defaultEntry.type;
  const hasMixedTypes =
    entries.length > 1 && entries.some((entry) => entry.type !== primaryType);

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return t.common.income;
      case 'transfer':
        return t.common.transfer;
      case 'lend':
        return t.common.lend;
      case 'borrow':
        return t.common.borrow;
      case 'expense':
      default:
        return t.common.expense;
    }
  };

  const getFocusedTitle = () => {
    if (currentSubTab === 'recurring') {
      return t.txForm.recurringBtnLabel;
    }
    if (isEditing) {
      switch (primaryType) {
        case 'income':
          return t.txForm.editIncomeTitle;
        case 'transfer':
          return t.txForm.editTransferTitle;
        case 'lend':
          return t.txForm.editLendTitle;
        case 'borrow':
          return t.txForm.editBorrowTitle;
        case 'expense':
          return t.txForm.editExpenseTitle;
        default:
          return t.txForm.editTitle;
      }
    }
    if (hasMixedTypes) {
      return t.txForm.newTitle;
    }
    switch (primaryType) {
      case 'income':
        return t.txForm.addIncomeTitle;
      case 'transfer':
        return t.txForm.addTransferTitle;
      case 'lend':
        return t.txForm.addLendTitle;
      case 'borrow':
        return t.txForm.addBorrowTitle;
      case 'expense':
      default:
        return t.txForm.addExpenseTitle;
    }
  };

  const getSubmitButtonLabel = () => {
    if (isEditing) return t.txForm.saveChanges;
    if (entries.length > 1) return t.txForm.saveTransaction;
    switch (primaryType) {
      case 'income':
        return t.txForm.saveIncome;
      case 'transfer':
        return t.txForm.saveTransfer;
      case 'lend':
        return t.txForm.saveLend;
      case 'borrow':
        return t.txForm.saveBorrow;
      case 'expense':
      default:
        return t.txForm.saveExpense;
    }
  };

  const handleEntryChange = <K extends keyof TransactionDraft>(
    index: number,
    field: K,
    value: TransactionDraft[K]
  ) => {
    setEntries((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'category') {
          updated.subCategory = '';
          updated.title = '';
        } else if (field === 'subCategory') {
          updated.title = '';
        }
        return updated;
      })
    );
  };

  const handleAddAnotherEntry = () => {
    const nextType = primaryType;
    setEntries((prev) => [
      ...prev,
      {
        ...defaultEntry,
        type: nextType,
        category:
          nextType === 'income'
            ? incomeCategories[0] || 'Others'
            : expenseCategories[0] || 'Personal',
        subCategory: '',
        title: '',
      },
    ]);
  };

  const headerVisual =
    currentSubTab === 'recurring'
      ? {
          Icon: Repeat,
          badgeClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
        }
      : getTypeVisualMeta(primaryType);
  const HeaderIcon = headerVisual.Icon;
  const focusedTitle = getFocusedTitle();

  return (
    <>
      <div
        className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/45 backdrop-blur-xs sm:items-center sm:p-4"
        onClick={onCancel}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={focusedTitle}
          className="animate-drawer-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Grab Handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Drawer Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-2.5">
              {!hasMixedTypes && (
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${headerVisual.badgeClass}`}
                >
                  <HeaderIcon className="h-4.5 w-4.5" />
                </span>
              )}
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-extrabold tracking-tight text-[#102A43] sm:text-lg dark:text-slate-100">
                  {focusedTitle}
                </h2>
                {currentSubTab === 'recurring' && dueRecurringCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold leading-none text-white">
                    {dueRecurringCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!isEditing && onOpenTypeDrawer && (
                <button
                  type="button"
                  onClick={onOpenTypeDrawer}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-[#102A43] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                >
                  <span>{t.txForm.changeType}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  aria-label={t.common.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {currentSubTab === 'recurring' &&
          onSaveRecurringBill &&
          onDeleteRecurringBill &&
          onOneTapLogRecurringBill &&
          onAdjustAndLogRecurringBill ? (
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <RecurringBillsPanel
                bills={recurringBills}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                expenseSubCategories={expenseSubCategories}
                allAccountOptions={allAccountOptions}
                wallets={wallets}
                savingsList={savingsList}
                categoryStyles={categoryStyles}
                currency={currency}
                isReadOnly={isReadOnly}
                onAddListItem={onAddListItem}
                onAddSubCategory={onAddSubCategory}
                onSaveBill={onSaveRecurringBill}
                onDeleteBill={onDeleteRecurringBill}
                onOneTapLog={onOneTapLogRecurringBill}
                onAdjustAndLog={onAdjustAndLogRecurringBill}
              />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {entries.map((entry, index) => {
                  const showCategoryAndSub = entry.type === 'expense' || entry.type === 'income';
                  const showSubCategory = entry.type === 'expense';
                  const getAccountStyle = (accountName: string) =>
                    getCategoryStyle(
                      categoryStyles,
                      savingsList.includes(accountName) ? 'sav' : 'wal',
                      accountName
                    );
                  const isMulti = entries.length > 1;

                  return (
                    <div
                      key={index}
                      className={
                        isMulti
                          ? 'overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-950/30'
                          : ''
                      }
                    >
                      {/* Date + Drawer Pickers */}
                      <div
                        className={
                          isMulti
                            ? 'border-b border-slate-100 px-4 pt-3.5 pb-3 dark:border-slate-800'
                            : 'pb-3.5'
                        }
                      >
                        {isMulti && (
                          <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {t.txForm.entryLabel} #{index + 1}
                              {hasMixedTypes ? ` · ${getTypeLabel(entry.type)}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setEntries((prev) => prev.filter((_, i) => i !== index))
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t.common.remove}
                            </button>
                          </div>
                        )}

                        {entry.type === 'transfer' ? (
                          <div className="space-y-2.5">
                            <input
                              type="date"
                              aria-label={t.txForm.dateLabel}
                              value={entry.date}
                              onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none sm:w-auto dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={t.txForm.fromAccount}
                                onClick={() =>
                                  setActivePicker({ entryIndex: index, field: 'fromWallet' })
                                }
                                className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <CategoryIconBadge
                                    style={getAccountStyle(entry.fromWallet)}
                                    size="sm"
                                  />
                                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                    {entry.fromWallet}
                                  </span>
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </button>

                              <span
                                aria-hidden="true"
                                className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500"
                              >
                                →
                              </span>

                              <button
                                type="button"
                                aria-label={t.txForm.toAccount}
                                onClick={() =>
                                  setActivePicker({ entryIndex: index, field: 'toWallet' })
                                }
                                className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                              >
                                <span className="flex min-w-0 items-center gap-2">
                                  <CategoryIconBadge
                                    style={getAccountStyle(entry.toWallet)}
                                    size="sm"
                                  />
                                  <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                    {entry.toWallet}
                                  </span>
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {/* Same-line Date + Category (or Date + Wallet for Lend/Borrow) */}
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                aria-label={t.txForm.dateLabel}
                                value={entry.date}
                                onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                                className="min-h-[46px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                              />

                              {showCategoryAndSub ? (
                                <button
                                  type="button"
                                  aria-label={t.common.category}
                                  onClick={() =>
                                    setActivePicker({ entryIndex: index, field: 'category' })
                                  }
                                  className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <CategoryIconBadge
                                      style={
                                        entry.type === 'income'
                                          ? getCategoryStyle(categoryStyles, 'inc', entry.category)
                                          : getCategoryStyle(categoryStyles, 'exp', entry.category)
                                      }
                                      size="sm"
                                    />
                                    <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                      {entry.category}
                                    </span>
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={t.txForm.walletAccount}
                                  onClick={() =>
                                    setActivePicker({ entryIndex: index, field: 'wallet' })
                                  }
                                  className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <CategoryIconBadge
                                      style={getAccountStyle(entry.wallet)}
                                      size="sm"
                                    />
                                    <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                      {entry.wallet}
                                    </span>
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </button>
                              )}
                            </div>

                            {/* Following line: Sub-Category (Expense) + Wallet */}
                            {showCategoryAndSub && (
                              <div className="flex items-center gap-2">
                                {showSubCategory && (
                                  <button
                                    type="button"
                                    aria-label={t.txForm.subCategoryLabel}
                                    onClick={() =>
                                      setActivePicker({ entryIndex: index, field: 'subCategory' })
                                    }
                                    className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <CategoryIconBadge
                                        style={getExpenseOrSubCategoryStyle(
                                          categoryStyles,
                                          entry.category,
                                          entry.subCategory
                                        )}
                                        size="sm"
                                      />
                                      <span
                                        className={`truncate text-xs ${
                                          entry.subCategory
                                            ? 'font-bold text-[#102A43] dark:text-slate-100'
                                            : 'font-semibold text-slate-500 dark:text-slate-400'
                                        }`}
                                      >
                                        {entry.subCategory || t.txForm.subCategoryChipPlaceholder}
                                      </span>
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  aria-label={t.txForm.walletAccount}
                                  onClick={() =>
                                    setActivePicker({ entryIndex: index, field: 'wallet' })
                                  }
                                  className="flex min-h-[46px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <CategoryIconBadge
                                      style={getAccountStyle(entry.wallet)}
                                      size="sm"
                                    />
                                    <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                                      {entry.wallet}
                                    </span>
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Amount, Optional Transfer Charge & Optional Note */}
                      <div
                        className={`divide-y divide-slate-100 dark:divide-slate-800/80 ${
                          isMulti ? '' : 'border-t border-slate-100 dark:border-slate-800/80'
                        }`}
                      >
                        <label
                          className={`flex min-h-[54px] cursor-text items-center justify-between gap-3 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20 ${
                            isMulti ? 'px-4' : 'px-1'
                          }`}
                        >
                          <span className="shrink-0 text-base font-semibold leading-6 text-slate-500 dark:text-slate-400">
                            {t.txForm.amountLabel}
                          </span>
                          <div className="flex min-w-0 flex-1 items-center justify-end">
                            <span
                              className={`shrink-0 select-none text-base font-bold leading-6 ${
                                entry.amount
                                  ? 'text-[#102A43] dark:text-slate-100'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {currency}
                            </span>
                            <span className="inline-grid min-w-0 max-w-full items-center">
                              <span
                                aria-hidden="true"
                                className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre py-1 pl-1.5 pr-0.5 text-base font-bold leading-6 tabular-nums"
                              >
                                {entry.amount || '0'}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0.01"
                                aria-label={`${t.txForm.amountLabel} (${currency})`}
                                placeholder="0"
                                value={entry.amount}
                                onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
                                className="no-spinner col-start-1 row-start-1 w-full min-w-[1ch] bg-transparent py-1 pr-0.5 text-right text-base font-bold leading-6 tabular-nums text-[#102A43] placeholder:font-bold placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                              />
                            </span>
                          </div>
                        </label>

                        {entry.type === 'transfer' && (
                          <div className={`py-2.5 ${isMulti ? 'px-4' : 'px-1'}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={entry.useCharge}
                                  onChange={(e) =>
                                    handleEntryChange(index, 'useCharge', e.target.checked)
                                  }
                                  className="h-4 w-4 rounded accent-[#16845B]"
                                />
                                {t.txForm.applyCharge}
                              </label>
                              {entry.useCharge && (
                                <label className="flex min-w-0 cursor-text items-center justify-end">
                                  <span
                                    className={`shrink-0 select-none text-sm font-semibold leading-5 ${
                                      entry.charge
                                        ? 'text-[#102A43] dark:text-slate-100'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {currency}
                                  </span>
                                  <span className="inline-grid min-w-0 max-w-[140px] items-center">
                                    <span
                                      aria-hidden="true"
                                      className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre py-1 pl-1.5 pr-0.5 text-sm font-semibold leading-5 tabular-nums"
                                    >
                                      {entry.charge || '0'}
                                    </span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="any"
                                      min="0"
                                      aria-label={`${t.txForm.chargePlaceholder} (${currency})`}
                                      placeholder="0"
                                      value={entry.charge}
                                      onChange={(e) =>
                                        handleEntryChange(index, 'charge', e.target.value)
                                      }
                                      className="no-spinner col-start-1 row-start-1 w-full min-w-[1ch] bg-transparent py-1 pr-0.5 text-right text-sm font-semibold leading-5 tabular-nums text-[#102A43] placeholder:font-semibold placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                                    />
                                  </span>
                                </label>
                              )}
                            </div>
                          </div>
                        )}

                        {isEditing && showLegacyTitleInput && (
                          <div
                            className={`flex items-center gap-2 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20 ${
                              isMulti ? 'px-4' : 'px-1'
                            }`}
                          >
                            <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {t.txForm.titleLabel}
                            </span>
                            <input
                              type="text"
                              maxLength={200}
                              aria-label={t.txForm.titleLabel}
                              placeholder={t.txForm.titleLabel}
                              value={entry.title}
                              onChange={(e) => handleEntryChange(index, 'title', e.target.value)}
                              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm font-semibold text-[#102A43] placeholder:font-normal placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                            />
                            {entry.title.trim() && (
                              <button
                                type="button"
                                onClick={() => handleEntryChange(index, 'title', '')}
                                aria-label={t.common.remove}
                                title={t.common.remove}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        <div
                          className={`py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20 ${
                            isMulti ? 'px-4' : 'px-1'
                          }`}
                        >
                          <input
                            type="text"
                            maxLength={1000}
                            aria-label={t.txForm.optionalNote}
                            placeholder={
                              entry.type === 'lend'
                                ? t.txForm.phLend
                                : entry.type === 'borrow'
                                ? t.txForm.phBorrow
                                : t.txForm.optionalNote
                            }
                            value={entry.note}
                            onChange={(e) => handleEntryChange(index, 'note', e.target.value)}
                            className="w-full bg-transparent py-1.5 text-xs text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleAddAnotherEntry}
                    className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:bg-slate-800/70"
                  >
                    <Plus className="h-4 w-4" />
                    {t.txForm.addAnotherEntry}
                  </button>
                )}
              </div>

              {/* Pinned Thumb-Friendly Bottom Save Bar */}
              <div className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-b-3xl dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="submit"
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.99]"
                >
                  {getSubmitButtonLabel()}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {activePicker && entries[activePicker.entryIndex] && (() => {
        const pickerEntry = entries[activePicker.entryIndex];
        const pickerMode: TransactionPickerMode =
          activePicker.field === 'category'
            ? pickerEntry.type === 'income'
              ? 'inc_cat'
              : 'exp_cat'
            : activePicker.field === 'subCategory'
            ? 'sub_cat'
            : 'account';

        const pickerTitle =
          pickerMode === 'exp_cat'
            ? t.txForm.drawerChooseExpCategory
            : pickerMode === 'inc_cat'
            ? t.txForm.drawerChooseIncCategory
            : pickerMode === 'sub_cat'
            ? `${t.txForm.drawerChooseSubCategory} · ${pickerEntry.category}`
            : activePicker.field === 'fromWallet'
            ? t.txForm.drawerChooseFromAccount
            : activePicker.field === 'toWallet'
            ? t.txForm.drawerChooseToAccount
            : t.txForm.drawerChooseAccount;

        const selectedValue =
          activePicker.field === 'category'
            ? pickerEntry.category
            : activePicker.field === 'subCategory'
            ? pickerEntry.subCategory
            : activePicker.field === 'fromWallet'
            ? pickerEntry.fromWallet
            : activePicker.field === 'toWallet'
            ? pickerEntry.toWallet
            : pickerEntry.wallet;

        const pickerSubs = Array.from(
          new Set([
            ...(expenseSubCategories?.[pickerEntry.category] || []),
            ...(pickerEntry.subCategory ? [pickerEntry.subCategory] : []),
          ])
        );

        const handleCreateFromDrawer = async (
          kind: AddableItemKind,
          name: string,
          parentCat?: string,
          style?: CategoryStyle
        ): Promise<boolean> => {
          if (kind === 'sub_cat') {
            if (!onAddSubCategory || !parentCat) return false;
            return onAddSubCategory(parentCat, name, style);
          }
          if (!onAddListItem) return false;
          return onAddListItem(kind, name, style);
        };

        return (
          <TransactionPickerDrawer
            open={true}
            mode={pickerMode}
            title={pickerTitle}
            selectedValue={selectedValue}
            parentCategory={pickerEntry.category}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            subCategories={pickerSubs}
            wallets={wallets}
            savingsList={savingsList}
            allAccountOptions={allAccountOptions}
            categoryStyles={categoryStyles}
            isReadOnly={isReadOnly}
            onSelect={(val) =>
              handleEntryChange(activePicker.entryIndex, activePicker.field, val)
            }
            onCreateItem={handleCreateFromDrawer}
            onClose={() => setActivePicker(null)}
          />
        );
      })()}
    </>
  );
};
