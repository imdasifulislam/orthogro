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
          if (!isEditing) {
            updated.title = '';
          }
        } else if (field === 'category') {
          updated.subCategory = '';
        }
        return updated;
      })
    );
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
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

          return (
            <div
              key={index}
              className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-[#16845B] dark:text-emerald-400">
                  {t.txForm.entryLabel} #{index + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t.common.remove}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.txForm.typeLabel}
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={entry.type}
                    onChange={(e) =>
                      handleEntryChange(
                        index,
                        'type',
                        e.target.value as TransactionDraft['type']
                      )
                    }
                  >
                    <option value="expense">{t.common.expense}</option>
                    <option value="income">{t.common.income}</option>
                    <option value="transfer">{t.common.transfer}</option>
                    <option value="lend">{t.common.lend}</option>
                    <option value="borrow">{t.common.borrow}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.txForm.dateLabel}
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    value={entry.date}
                    onChange={(e) => handleEntryChange(index, 'date', e.target.value)}
                  />
                </div>
              </div>

              {entry.type === 'transfer' ? (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t.txForm.fromAccount}
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={entry.fromWallet}
                        onChange={(e) => handleEntryChange(index, 'fromWallet', e.target.value)}
                      >
                        {allAccountOptions.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t.txForm.toAccount}
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        value={entry.toWallet}
                        onChange={(e) => handleEntryChange(index, 'toWallet', e.target.value)}
                      >
                        {allAccountOptions.map((acc) => (
                          <option key={acc} value={acc}>
                            {acc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={entry.useCharge}
                        onChange={(e) => handleEntryChange(index, 'useCharge', e.target.checked)}
                        className="h-4 w-4 rounded accent-[#16845B]"
                      />
                      {t.txForm.applyCharge}
                    </label>
                    {entry.useCharge && (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder={`${t.txForm.chargePlaceholder} (${currency})`}
                        value={entry.charge}
                        onChange={(e) => handleEntryChange(index, 'charge', e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t.txForm.walletAccount}
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      value={entry.wallet}
                      onChange={(e) => handleEntryChange(index, 'wallet', e.target.value)}
                    >
                      {allAccountOptions.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {entry.type !== 'lend' && entry.type !== 'borrow' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {t.common.category}
                      </label>
                      <div className="flex items-center gap-2">
                        <CategoryIconBadge
                          style={getCategoryStyle(
                            categoryStyles,
                            entry.type === 'income' ? 'inc' : 'exp',
                            entry.category
                          )}
                          size="md"
                        />
                        <select
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={entry.category}
                          onChange={(e) => handleEntryChange(index, 'category', e.target.value)}
                        >
                          {currentCategories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {entry.type === 'expense' &&
                    ((expenseSubCategories?.[entry.category] || []).length > 0 ||
                      entry.subCategory) && (
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {t.txForm.subCategoryLabel}
                        </label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          value={entry.subCategory}
                          onChange={(e) =>
                            handleEntryChange(index, 'subCategory', e.target.value)
                          }
                        >
                          <option value="">{t.txForm.subCategoryOptional}</option>
                          {Array.from(
                            new Set([
                              ...(expenseSubCategories?.[entry.category] || []),
                              ...(entry.subCategory ? [entry.subCategory] : []),
                            ])
                          ).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.txForm.titleLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder={
                      entry.type === 'lend'
                        ? t.txForm.phLend
                        : entry.type === 'borrow'
                        ? t.txForm.phBorrow
                        : entry.type === 'income'
                        ? t.txForm.phIncome
                        : entry.type === 'transfer'
                        ? t.txForm.phTransfer
                        : t.txForm.phExpense
                    }
                    value={entry.title}
                    onChange={(e) => handleEntryChange(index, 'title', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.txForm.amountLabel} ({currency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder={t.txForm.amountPlaceholder}
                    value={entry.amount}
                    onChange={(e) => handleEntryChange(index, 'amount', e.target.value)}
                    className="font-mono-num w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.txForm.optionalNote}
                </label>
                <input
                  type="text"
                  maxLength={1000}
                  placeholder={t.txForm.notePlaceholder}
                  value={entry.note}
                  onChange={(e) => handleEntryChange(index, 'note', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          );
        })}

        {!isEditing && (
          <button
            type="button"
            onClick={() => setEntries((prev) => [...prev, { ...defaultEntry }])}
            className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800"
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
