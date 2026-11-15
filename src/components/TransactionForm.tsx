import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryStyle, CurrencySymbol, TransactionDraft } from '../types';
import { CategoryIconBadge, getCategoryStyle } from '../utils/categoryVisuals';

interface TransactionFormProps {
  entries: TransactionDraft[];
  setEntries: React.Dispatch<React.SetStateAction<TransactionDraft[]>>;
  defaultEntry: TransactionDraft;
  allAccountOptions: string[];
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  entries,
  setEntries,
  defaultEntry,
  allAccountOptions,
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  categoryStyles,
  currency,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(entries[0]?.id);

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
      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">
          {isEditing ? t.txForm.editTitle : t.txForm.newTitle}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {t.common.cancel}
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {entries.map((entry, index) => {
          const currentCategories =
            entry.type === 'expense' ? expenseCategories : incomeCategories;
          const showCategoryAndSub = entry.type === 'expense' || entry.type === 'income';
          const availableSubCategories =
            entry.type === 'expense' ? expenseSubCategories?.[entry.category] || [] : [];
          const showSubCategory =
            entry.type === 'expense' &&
            (availableSubCategories.length > 0 || Boolean(entry.subCategory));

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
                  className="flex w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
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
                            ? 'bg-white text-[#16845B] shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                            : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Row 2 & Row 3: Date + Category on same line, then Sub-Category + Wallet */}
                {entry.type === 'transfer' ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="date"
                      aria-label={t.txForm.dateLabel}
                      value={entry.date}
                      onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                      className="min-h-[36px] w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none sm:w-auto dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={t.txForm.fromAccount}
                        value={entry.fromWallet}
                        onChange={(e) => handleEntryChange(index, 'fromWallet', e.target.value)}
                        className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                      >
                        {allAccountOptions.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500"
                      >
                        →
                      </span>
                      <select
                        aria-label={t.txForm.toAccount}
                        value={entry.toWallet}
                        onChange={(e) => handleEntryChange(index, 'toWallet', e.target.value)}
                        className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                      >
                        {allAccountOptions.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
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
                        className="min-h-[36px] shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                      />

                      {showCategoryAndSub ? (
                        <div className="flex min-h-[36px] min-w-0 flex-1 items-center gap-1.5 rounded-lg bg-slate-100 pl-1.5 pr-1 dark:bg-slate-800">
                          <CategoryIconBadge
                            style={getCategoryStyle(
                              categoryStyles,
                              entry.type === 'income' ? 'inc' : 'exp',
                              entry.category
                            )}
                            size="sm"
                          />
                          <select
                            aria-label={t.common.category}
                            value={entry.category}
                            onChange={(e) => handleEntryChange(index, 'category', e.target.value)}
                            className="min-h-[34px] min-w-0 flex-1 truncate bg-transparent pr-1.5 text-xs font-medium text-[#102A43] focus:outline-none dark:text-slate-200"
                          >
                            {currentCategories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <select
                          aria-label={t.txForm.walletAccount}
                          value={entry.wallet}
                          onChange={(e) => handleEntryChange(index, 'wallet', e.target.value)}
                          className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                        >
                          {allAccountOptions.map((acc) => (
                            <option key={acc} value={acc}>
                              {acc}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Following line: Sub-Category (if available) + Wallet */}
                    {showCategoryAndSub && (
                      <div className="flex items-center gap-2">
                        {showSubCategory && (
                          <select
                            aria-label={t.txForm.subCategoryLabel}
                            value={entry.subCategory}
                            onChange={(e) =>
                              handleEntryChange(index, 'subCategory', e.target.value)
                            }
                            className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                          >
                            <option value="">{t.txForm.subCategoryOptional}</option>
                            {Array.from(
                              new Set([
                                ...availableSubCategories,
                                ...(entry.subCategory ? [entry.subCategory] : []),
                              ])
                            ).map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                          </select>
                        )}

                        <select
                          aria-label={t.txForm.walletAccount}
                          value={entry.wallet}
                          onChange={(e) => handleEntryChange(index, 'wallet', e.target.value)}
                          className="min-h-[36px] min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-[#102A43] transition-colors focus:bg-slate-200/70 focus:outline-none dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-700"
                        >
                          {allAccountOptions.map((acc) => (
                            <option key={acc} value={acc}>
                              {acc}
                            </option>
                          ))}
                        </select>
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
    </div>
  );
};
