import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  CategoryStyle,
  CurrencySymbol,
  RecurringBill,
  RecurringBillType,
} from '../types';
import {
  CategoryIconBadge,
  getCategoryStyle,
  getExpenseOrSubCategoryStyle,
} from '../utils/categoryVisuals';
import { formatMoney } from '../utils/format';
import { formatDueDayLabel, sortRecurringBills } from '../utils/recurringBills';
import {
  type AddableItemKind,
  TransactionPickerDrawer,
  type TransactionPickerMode,
} from './TransactionPickerDrawer';

export interface RecurringBillSavePayload {
  title: string;
  type: RecurringBillType;
  amount: number;
  category: string;
  subCategory?: string;
  wallet: string;
  dueDay: number;
}

export interface RecurringBillsPanelProps {
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
  resetTrigger?: number;
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
}

type RecurringPickerField = 'category' | 'subCategory' | 'wallet';

export const RecurringBillsPanel: React.FC<RecurringBillsPanelProps> = ({
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
  resetTrigger = 0,
  onAddListItem,
  onAddSubCategory,
  onSaveBill,
  onDeleteBill,
  onOneTapLog,
  onAdjustAndLog,
}) => {
  const { lang, t } = useTranslation();
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [billType, setBillType] = useState<RecurringBillType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [categoryInput, setCategoryInput] = useState(expenseCategories[0] || 'Others');
  const [subCategoryInput, setSubCategoryInput] = useState('');
  const [walletInput, setWalletInput] = useState(allAccountOptions[0] || 'Cash');
  const [dueDayInput, setDueDayInput] = useState<number>(() => new Date().getDate());
  const [isSaving, setIsSaving] = useState(false);
  const [loggingBillId, setLoggingBillId] = useState<string | null>(null);
  const [activePickerField, setActivePickerField] = useState<RecurringPickerField | null>(null);

  const resetForm = (nextType: RecurringBillType = 'expense') => {
    setEditingBillId(null);
    setTitleInput('');
    setBillType(nextType);
    setAmountInput('');
    setCategoryInput(
      nextType === 'expense' ? expenseCategories[0] || 'Others' : incomeCategories[0] || 'Salary'
    );
    setSubCategoryInput('');
    setWalletInput(allAccountOptions[0] || 'Cash');
    setDueDayInput(new Date().getDate());
    setActivePickerField(null);
  };

  useEffect(() => {
    setMode('list');
    setLoggingBillId(null);
    resetForm('expense');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  const evaluatedBills = sortRecurringBills(bills);
  const unpaidThisMonth = evaluatedBills.filter((item) => !item.isPaidThisMonth);
  const unpaidExpenseThisMonth = unpaidThisMonth.filter((item) => item.bill.type === 'expense');
  const unpaidIncomeThisMonth = unpaidThisMonth.filter((item) => item.bill.type === 'income');
  const isIncomeOnlyList =
    evaluatedBills.length > 0 && evaluatedBills.every((item) => item.bill.type === 'income');
  const dueBillCount = isIncomeOnlyList
    ? unpaidIncomeThisMonth.length
    : unpaidExpenseThisMonth.length;
  const dueBillTotal = (isIncomeOnlyList ? unpaidIncomeThisMonth : unpaidExpenseThisMonth).reduce(
    (sum, item) => sum + item.bill.amount,
    0
  );

  const currentCategories = billType === 'expense' ? expenseCategories : incomeCategories;
  const categoryOptions = Array.from(
    new Set([...currentCategories, ...(categoryInput ? [categoryInput] : [])])
  ).filter(Boolean);
  const availableSubCategories =
    billType === 'expense' ? expenseSubCategories?.[categoryInput] || [] : [];
  const subCategoryOptions = Array.from(
    new Set([...availableSubCategories, ...(subCategoryInput ? [subCategoryInput] : [])])
  ).filter(Boolean);
  const walletOptions = Array.from(
    new Set([...allAccountOptions, ...(walletInput ? [walletInput] : [])])
  ).filter(Boolean);

  const openCreateForm = () => {
    resetForm('expense');
    setMode('form');
  };

  const openEditForm = (bill: RecurringBill) => {
    setEditingBillId(bill.id);
    setTitleInput(bill.title);
    setBillType(bill.type);
    setAmountInput(String(bill.amount));
    setCategoryInput(bill.category);
    setSubCategoryInput(bill.subCategory || '');
    setWalletInput(bill.wallet);
    setDueDayInput(Math.min(31, Math.max(1, Math.round(bill.dueDay || 1))));
    setMode('form');
  };

  const handleTypeSwitch = (nextType: RecurringBillType) => {
    if (nextType === billType) return;
    setBillType(nextType);
    const nextCats = nextType === 'expense' ? expenseCategories : incomeCategories;
    setCategoryInput(nextCats[0] || 'Others');
    setSubCategoryInput('');
  };

  const parsedAmount = parseFloat(amountInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isReadOnly) return;
    const cleanTitle = titleInput.trim();
    if (!cleanTitle || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    setIsSaving(true);
    try {
      const ok = await onSaveBill(
        {
          title: cleanTitle,
          type: billType,
          amount: parsedAmount,
          category: categoryInput || categoryOptions[0] || 'Others',
          subCategory:
            billType === 'expense' && subCategoryInput.trim()
              ? subCategoryInput.trim()
              : undefined,
          wallet: walletInput || walletOptions[0] || 'Cash',
          dueDay: dueDayInput,
        },
        editingBillId || undefined
      );
      if (ok) {
        resetForm('expense');
        setMode('list');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTapLog = async (bill: RecurringBill) => {
    if (isReadOnly || loggingBillId) return;
    setLoggingBillId(bill.id);
    try {
      await onOneTapLog(bill);
    } finally {
      setLoggingBillId(null);
    }
  };

  const getAccountStyle = (accountName: string) =>
    getCategoryStyle(
      categoryStyles,
      savingsList.includes(accountName) ? 'sav' : 'wal',
      accountName
    );

  if (mode === 'form') {
    const pickerMode: TransactionPickerMode | null =
      activePickerField === 'category'
        ? billType === 'income'
          ? 'inc_cat'
          : 'exp_cat'
        : activePickerField === 'subCategory'
        ? 'sub_cat'
        : activePickerField === 'wallet'
        ? 'account'
        : null;

    const pickerTitle =
      pickerMode === 'exp_cat'
        ? t.txForm.drawerChooseExpCategory
        : pickerMode === 'inc_cat'
        ? t.txForm.drawerChooseIncCategory
        : pickerMode === 'sub_cat'
        ? `${t.txForm.drawerChooseSubCategory} · ${categoryInput}`
        : t.txForm.drawerChooseAccount;

    const pickerSelectedValue =
      activePickerField === 'category'
        ? categoryInput
        : activePickerField === 'subCategory'
        ? subCategoryInput
        : walletInput;

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
      <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Minimal Inline Metadata Header (matches New Transaction form) */}
          <div className="border-b border-slate-100 px-5 pt-4 pb-3.5 dark:border-slate-800">
            {/* Row 1: Expense | Income segmented switcher */}
            <div
              role="tablist"
              aria-label={t.recurring.typeLabel}
              className="flex w-full items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-950/60"
            >
              {(['expense', 'income'] as const).map((typeOpt) => {
                const active = billType === typeOpt;
                return (
                  <button
                    key={typeOpt}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleTypeSwitch(typeOpt)}
                    className={`min-h-[38px] flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${
                      active
                        ? 'bg-white text-[#16845B] shadow-xs ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-emerald-400 dark:ring-slate-700'
                        : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {typeOpt === 'expense' ? t.common.expense : t.common.income}
                  </button>
                );
              })}
            </div>

            {/* Row 2: Due Day + Category */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  aria-label={t.recurring.dueDayLabel}
                  value={dueDayInput}
                  onChange={(e) => setDueDayInput(Number(e.target.value))}
                  className="min-h-[44px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                >
                  {Array.from({ length: 31 }, (_, idx) => idx + 1).map((dayNum) => (
                    <option key={dayNum} value={dayNum}>
                      {formatDueDayLabel(dayNum, lang)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  aria-label={t.recurring.categoryLabel}
                  onClick={() => setActivePickerField('category')}
                  className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryIconBadge
                      style={
                        billType === 'income'
                          ? getCategoryStyle(categoryStyles, 'inc', categoryInput)
                          : getCategoryStyle(categoryStyles, 'exp', categoryInput)
                      }
                      size="sm"
                    />
                    <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                      {categoryInput}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              </div>

              {/* Row 3: Sub-Category (Expense) + Wallet */}
              <div className="flex items-center gap-2">
                {billType === 'expense' && (
                  <button
                    type="button"
                    aria-label={t.recurring.subCategoryLabel}
                    onClick={() => setActivePickerField('subCategory')}
                    className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <CategoryIconBadge
                        style={getExpenseOrSubCategoryStyle(
                          categoryStyles,
                          categoryInput,
                          subCategoryInput
                        )}
                        size="sm"
                      />
                      <span
                        className={`truncate text-xs ${
                          subCategoryInput
                            ? 'font-bold text-[#102A43] dark:text-slate-100'
                            : 'font-semibold text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {subCategoryInput || t.txForm.subCategoryChipPlaceholder}
                      </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </button>
                )}

                <button
                  type="button"
                  aria-label={t.recurring.walletLabel}
                  onClick={() => setActivePickerField('wallet')}
                  className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryIconBadge
                      style={getAccountStyle(walletInput)}
                      size="sm"
                    />
                    <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                      {walletInput}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Hairline Rows: Title & Usual Amount */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            <div className="px-5 py-2.5 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20">
              <input
                type="text"
                maxLength={100}
                required
                aria-label={t.recurring.titleLabel}
                placeholder={t.recurring.titlePlaceholder}
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full bg-transparent py-1 text-sm font-semibold text-[#102A43] placeholder:font-normal placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="flex min-h-[54px] items-center justify-between gap-3 px-5 py-2 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/20">
              <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {t.recurring.amountLabel}
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
                  required
                  aria-label={`${t.recurring.amountLabel} (${currency})`}
                  placeholder="0"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="no-spinner w-full max-w-[180px] bg-transparent py-1 text-right text-xl font-extrabold tabular-nums text-[#102A43] placeholder:font-normal placeholder:text-slate-300 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetForm('expense');
              setMode('list');
            }}
            className="min-h-[48px] rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t.recurring.backToListBtn}
          </button>
          <button
            type="submit"
            disabled={
              isSaving ||
              !titleInput.trim() ||
              !Number.isFinite(parsedAmount) ||
              parsedAmount <= 0
            }
            className="flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] disabled:opacity-50"
          >
            {isSaving
              ? t.common.saving
              : editingBillId
              ? t.recurring.updateBtn
              : t.recurring.saveBtn}
          </button>
        </div>
      </form>

      {pickerMode && activePickerField && (
        <TransactionPickerDrawer
          open={true}
          mode={pickerMode}
          title={pickerTitle}
          selectedValue={pickerSelectedValue}
          parentCategory={categoryInput}
          expenseCategories={
            billType === 'expense' ? categoryOptions : expenseCategories
          }
          incomeCategories={
            billType === 'income' ? categoryOptions : incomeCategories
          }
          subCategories={subCategoryOptions}
          wallets={wallets}
          savingsList={savingsList}
          allAccountOptions={walletOptions}
          categoryStyles={categoryStyles}
          isReadOnly={isReadOnly}
          onSelect={(val) => {
            if (activePickerField === 'category') {
              setCategoryInput(val);
              setSubCategoryInput('');
            } else if (activePickerField === 'subCategory') {
              setSubCategoryInput(val);
            } else {
              setWalletInput(val);
            }
          }}
          onCreateItem={handleCreateFromDrawer}
          onClose={() => setActivePickerField(null)}
        />
      )}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {isReadOnly && (
        <div className="border-b border-sky-100 bg-sky-50/70 px-5 py-2.5 text-xs font-medium text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
          {t.recurring.readOnlyHint}
        </div>
      )}

      {evaluatedBills.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#16845B] dark:bg-slate-800 dark:text-emerald-400">
            <Repeat className="h-5 w-5" />
          </div>
          <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
            {t.recurring.emptyTitle}
          </div>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            {t.recurring.emptyDesc}
          </p>
          {!isReadOnly && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-5 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A]"
            >
              <Plus className="h-4 w-4" />
              {t.recurring.createFirstBtn}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="whitespace-nowrap">
                {evaluatedBills.length}{' '}
                {evaluatedBills.length === 1
                  ? t.recurring.billHeaderSingular
                  : t.recurring.billHeaderPlural}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`whitespace-nowrap font-bold ${
                  dueBillCount > 0
                    ? isIncomeOnlyList
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                    : 'text-[#16845B] dark:text-emerald-400'
                }`}
              >
                {t.recurring.totalDueLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-mono-num whitespace-nowrap font-bold ${
                  dueBillCount > 0
                    ? isIncomeOnlyList
                      ? 'text-[#16845B] dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                    : 'text-[#16845B] dark:text-emerald-400'
                }`}
              >
                {formatMoney(dueBillTotal, currency)}
              </span>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-[32px] shrink-0 whitespace-nowrap items-center gap-1 rounded-lg bg-[#16845B] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.recurring.addNewBtn}
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {evaluatedBills.map((item) => {
              const { bill, status, isPaidThisMonth, daysUntilDue } = item;
              const catStyle =
                bill.type === 'income'
                  ? getCategoryStyle(categoryStyles, 'inc', bill.category)
                  : getExpenseOrSubCategoryStyle(categoryStyles, bill.category, bill.subCategory);

              const statusLabel =
                status === 'paid'
                  ? `${t.recurring.statusLogged} ✓`
                  : status === 'overdue'
                  ? `${t.recurring.statusOverdue} · ${Math.abs(daysUntilDue)}${t.recurring.daysLateSuffix}`
                  : status === 'due_today'
                  ? t.recurring.statusDueToday
                  : status === 'due_soon'
                  ? `${t.recurring.statusDueSoon} · ${t.recurring.inDaysPrefix ? `${t.recurring.inDaysPrefix} ` : ''}${daysUntilDue}${t.recurring.inDaysSuffix}`
                  : t.recurring.statusUpcoming;

              const statusTextClass =
                status === 'paid'
                  ? 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-300'
                  : status === 'overdue'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : status === 'due_today' || status === 'due_soon'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

              const isLoggingThis = loggingBillId === bill.id;

              return (
                <div
                  key={bill.id}
                  className="px-5 py-3.5 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <CategoryIconBadge style={catStyle} size="sm" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                            {bill.title}
                          </span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${statusTextClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                          {bill.category}
                          {bill.subCategory ? ` · ${bill.subCategory}` : ''} · {bill.wallet} ·{' '}
                          {formatDueDayLabel(bill.dueDay, lang)}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`font-mono-num mr-1 text-sm font-extrabold tabular-nums ${
                          bill.type === 'income'
                            ? 'text-[#16845B] dark:text-emerald-400'
                            : 'text-[#102A43] dark:text-slate-100'
                        }`}
                      >
                        {bill.type === 'income' ? '+' : ''}
                        {formatMoney(bill.amount, currency)}
                      </span>
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            aria-label={t.recurring.editBillAria}
                            onClick={() => openEditForm(bill)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={t.recurring.deleteBillAria}
                            onClick={() => void onDeleteBill(bill.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!isReadOnly && (
                    <div className="mt-2.5 flex items-center gap-2 pl-[34px]">
                      <button
                        type="button"
                        disabled={Boolean(loggingBillId)}
                        onClick={() => void handleTapLog(bill)}
                        className={`inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
                          isPaidThisMonth
                            ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                            : 'bg-[#16845B] text-white hover:bg-[#126B4A]'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isLoggingThis
                          ? t.common.saving
                          : isPaidThisMonth
                          ? t.recurring.logAgainBtn
                          : t.recurring.logNowBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustAndLog(bill)}
                        className="min-h-[32px] rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {t.recurring.adjustLogBtn}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
