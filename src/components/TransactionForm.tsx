import React, { useEffect, useState } from 'react';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  CategoryStyle,
  CurrencySymbol,
  RecurringBill,
  TransactionDraft,
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
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
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
  onSubTabChange,
  recurringBills = [],
  dueRecurringCount = 0,
  isReadOnly = false,
  onAddListItem,
  onAddSubCategory,
  onSaveRecurringBill,
  onDeleteRecurringBill,
  onOneTapLogRecurringBill,
  onAdjustAndLogRecurringBill,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(entries[0]?.id);
  const editingId = entries[0]?.id || null;
  const currentSubTab: TransactionPageSubTab = isEditing ? 'new' : activeSubTab;
  const showRecurringTab =
    !isEditing && (dueRecurringCount > 0 || currentSubTab === 'recurring');
  const [showLegacyTitleInput, setShowLegacyTitleInput] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePickerState | null>(null);

  useEffect(() => {
    setShowLegacyTitleInput(Boolean(editingId && entries[0]?.title.trim()));
    // Only evaluate when entering edit mode for a specific transaction ID
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const handleEntryChange = <K extends keyof TransactionDraft>(
    index: number,
    field: K,
    value: TransactionDraft[K]
  ) => {
    setEntries((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: value };
        if (field === 'type') {
          if (value === 'expense') {
            updated.category = expenseCategories[0] || 'Others';
          } else if (value === 'income') {
            updated.category = incomeCategories[0] || 'Others';
          }
          updated.subCategory = '';
          updated.title = '';
        } else if (field === 'category') {
          updated.subCategory = '';
          updated.title = '';
        } else if (field === 'subCategory') {
          updated.title = '';
        }
        return updated;
      })
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-2 px-1">
        {isEditing ? (
          <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">
            {t.txForm.editTitle}
          </h2>
        ) : !showRecurringTab ? (
          <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">
            {t.txForm.newTitle}
          </h2>
        ) : (
          <div
            role="tablist"
            aria-label={t.txForm.newTitle}
            className="flex min-w-0 items-baseline gap-4 sm:gap-5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={currentSubTab === 'new'}
              onClick={() => onSubTabChange?.('new')}
              className={`relative whitespace-nowrap pb-1.5 transition-colors ${
                currentSubTab === 'new'
                  ? 'text-lg font-bold text-[#102A43] dark:text-slate-100'
                  : 'text-sm font-semibold text-slate-400 hover:text-slate-600 sm:text-base dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <span>{t.txForm.newTitle}</span>
              {currentSubTab === 'new' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#16845B] dark:bg-emerald-400"
                />
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={currentSubTab === 'recurring'}
              onClick={() => onSubTabChange?.('recurring')}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap pb-1.5 transition-colors ${
                currentSubTab === 'recurring'
                  ? 'text-lg font-bold text-[#102A43] dark:text-slate-100'
                  : 'text-sm font-semibold text-slate-400 hover:text-slate-600 sm:text-base dark:text-slate-500 dark:hover:text-slate-300'
              }`}
            >
              <span>{t.txForm.recurringBtnLabel}</span>
              {dueRecurringCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white">
                  {dueRecurringCount}
                </span>
              )}
              {currentSubTab === 'recurring' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#16845B] dark:bg-emerald-400"
                />
              )}
            </button>
          </div>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[34px] shrink-0 px-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t.common.cancel}
          </button>
        )}
      </div>

      {currentSubTab === 'recurring' &&
      onSaveRecurringBill &&
      onDeleteRecurringBill &&
      onOneTapLogRecurringBill &&
      onAdjustAndLogRecurringBill ? (
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
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
        {entries.map((entry, index) => {
          const showCategoryAndSub = entry.type === 'expense' || entry.type === 'income';
          const showSubCategory = entry.type === 'expense';
          const getAccountStyle = (accountName: string) =>
            getCategoryStyle(
              categoryStyles,
              savingsList.includes(accountName) ? 'sav' : 'wal',
              accountName
            );

          return (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Compact Inline Metadata Header (Bazar Memo style) */}
              <div className="border-b border-slate-100 px-5 pt-4 pb-3.5 dark:border-slate-800">
                {entries.length > 1 && (
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {t.txForm.entryLabel} #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.common.remove}
                    </button>
                  </div>
                )}

                {/* Row 1: Full-width Transaction Types */}
                <div
                  role="tablist"
                  aria-label={t.txForm.typeLabel}
                  className="flex w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-slate-200 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-950/60"
                >
                  {(['expense', 'income', 'transfer', 'lend', 'borrow'] as const).map((txType) => {
                    const active = entry.type === txType;
                    const label =
                      txType === 'expense'
                        ? t.common.expense
                        : txType === 'income'
                        ? t.common.income
                        : txType === 'transfer'
                        ? t.common.transfer
                        : txType === 'lend'
                        ? t.common.lend
                        : t.common.borrow;
                    return (
                      <button
                        key={txType}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => handleEntryChange(index, 'type', txType)}
                        className={`min-h-[38px] min-w-fit flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
                          active
                            ? 'bg-white text-[#16845B] shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-emerald-400 dark:ring-slate-700'
                            : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Row 2 & Row 3: Date + Drawer Pickers */}
                {entry.type === 'transfer' ? (
                  <div className="mt-3 space-y-2">
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
                        onClick={() => setActivePicker({ entryIndex: index, field: 'fromWallet' })}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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
                        onClick={() => setActivePicker({ entryIndex: index, field: 'toWallet' })}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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
                  <div className="mt-3 space-y-2">
                    {/* Same-line Date + Category (or Date + Wallet for Lend/Borrow) */}
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        aria-label={t.txForm.dateLabel}
                        value={entry.date}
                        onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                        className="min-h-[44px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                      />

                      {showCategoryAndSub ? (
                        <button
                          type="button"
                          aria-label={t.common.category}
                          onClick={() => setActivePicker({ entryIndex: index, field: 'category' })}
                          className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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
                          onClick={() => setActivePicker({ entryIndex: index, field: 'wallet' })}
                          className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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
                            className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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
                          onClick={() => setActivePicker({ entryIndex: index, field: 'wallet' })}
                          className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
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

              {/* Amount, Optional Transfer Charge & Optional Note (Unified hairline rows) */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="flex min-h-[54px] items-center justify-between gap-3 px-5 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20">
                  <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {t.txForm.amountLabel}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className="select-none text-sm font-medium text-slate-400 dark:text-slate-500">
                      {currency}
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
                      className="no-spinner w-full max-w-[180px] bg-transparent py-1 text-right text-xl font-extrabold tabular-nums text-[#102A43] placeholder:font-normal placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {entry.type === 'transfer' && (
                  <div className="px-5 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={entry.useCharge}
                          onChange={(e) => handleEntryChange(index, 'useCharge', e.target.checked)}
                          className="h-4 w-4 rounded accent-[#16845B]"
                        />
                        {t.txForm.applyCharge}
                      </label>
                      {entry.useCharge && (
                        <div className="flex items-center gap-1.5">
                          <span className="select-none text-xs text-slate-400 dark:text-slate-500">
                            {currency}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min="0"
                            aria-label={`${t.txForm.chargePlaceholder} (${currency})`}
                            placeholder="0"
                            value={entry.charge}
                            onChange={(e) => handleEntryChange(index, 'charge', e.target.value)}
                            className="no-spinner w-24 bg-transparent py-1 text-right text-sm font-semibold tabular-nums text-[#102A43] placeholder:font-normal placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isEditing && showLegacyTitleInput && (
                  <div className="flex items-center gap-2 px-5 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20">
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

                <div className="px-5 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20">
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
                    className="w-full bg-transparent py-1.5 text-sm text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {!isEditing && (
          <button
            type="button"
            onClick={() => setEntries((prev) => [...prev, { ...defaultEntry }])}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <Plus className="h-4 w-4" />
            {t.txForm.addAnotherEntry}
          </button>
        )}

        <button
          type="submit"
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A]"
        >
          {isEditing ? t.txForm.saveChanges : t.txForm.saveTransaction}
        </button>
      </form>
      )}

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
    </div>
  );
};
