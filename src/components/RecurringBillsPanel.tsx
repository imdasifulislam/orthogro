import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Repeat, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  CategoryStyle,
  CurrencySymbol,
  RecurringBill,
  RecurringBillType,
} from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';
import { formatMoney } from '../utils/format';
import { formatDueDayLabel, sortRecurringBills } from '../utils/recurringBills';

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
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  isReadOnly?: boolean;
  resetTrigger?: number;
  onSaveBill: (payload: RecurringBillSavePayload, editId?: string) => Promise<boolean>;
  onDeleteBill: (id: string) => Promise<void>;
  onOneTapLog: (bill: RecurringBill) => Promise<void>;
  onAdjustAndLog: (bill: RecurringBill) => void;
}

export const RecurringBillsPanel: React.FC<RecurringBillsPanelProps> = ({
  bills,
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  allAccountOptions,
  categoryStyles,
  currency,
  isReadOnly = false,
  resetTrigger = 0,
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
  };

  useEffect(() => {
    setMode('list');
    setLoggingBillId(null);
    resetForm('expense');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  const evaluatedBills = sortRecurringBills(bills);
  const attentionCount = evaluatedBills.filter((item) => item.needsAttention).length;

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

  if (mode === 'form') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {/* Minimal Inline Metadata Header (matches New Transaction form) */}
          <div className="border-b border-slate-100 px-5 pt-4 pb-3.5 dark:border-slate-800">
            {/* Row 1: Expense | Income segmented switcher */}
            <div
              role="tablist"
              aria-label={t.recurring.typeLabel}
              className="flex w-full items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
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
                        ? 'bg-white text-[#16845B] shadow-xs dark:bg-slate-900 dark:text-emerald-400'
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
                  className="min-h-[36px] shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                >
                  {Array.from({ length: 31 }, (_, idx) => idx + 1).map((dayNum) => (
                    <option key={dayNum} value={dayNum}>
                      {formatDueDayLabel(dayNum, lang)}
                    </option>
                  ))}
                </select>

                <div className="flex min-h-[36px] min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-slate-100 pl-1.5 pr-1 dark:bg-slate-800">
                  <CategoryIconBadge
                    style={getCategoryStyle(
                      categoryStyles,
                      billType === 'income' ? 'inc' : 'exp',
                      categoryInput
                    )}
                    size="sm"
                  />
                  <select
                    aria-label={t.recurring.categoryLabel}
                    value={categoryInput}
                    onChange={(e) => {
                      setCategoryInput(e.target.value);
                      setSubCategoryInput('');
                    }}
                    className="min-h-[34px] min-w-0 flex-1 truncate bg-transparent pr-1.5 text-xs font-medium text-[#102A43] focus:outline-none dark:text-slate-200"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Sub-Category (when available) + Wallet */}
              <div className="flex items-center gap-2">
                {billType === 'expense' && subCategoryOptions.length > 0 && (
                  <select
                    aria-label={t.recurring.subCategoryLabel}
                    value={subCategoryInput}
                    onChange={(e) => setSubCategoryInput(e.target.value)}
                    className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                  >
                    <option value="">{t.recurring.subCategoryOptional}</option>
                    {subCategoryOptions.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  aria-label={t.recurring.walletLabel}
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                >
                  {walletOptions.map((wal) => (
                    <option key={wal} value={wal}>
                      {wal}
                    </option>
                  ))}
                </select>
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
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>
                {evaluatedBills.length}{' '}
                {evaluatedBills.length === 1 ? t.settings.billSingular : t.settings.billsPlural}
              </span>
              {attentionCount > 0 && (
                <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">
                  · {attentionCount} {t.settings.recurringDueSuffix}
                </span>
              )}
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-[#16845B] px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
              >
                <Plus className="h-3.5 w-3.5" />
                {t.recurring.addNewBtn}
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {evaluatedBills.map((item) => {
              const { bill, status, isPaidThisMonth, daysUntilDue } = item;
              const catStyle = getCategoryStyle(
                categoryStyles,
                bill.type === 'income' ? 'inc' : 'exp',
                bill.category
              );

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
