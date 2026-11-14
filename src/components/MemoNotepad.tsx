import React, { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { BazarMemo, CurrencySymbol, UserNote } from '../types';
import { formatMoney, getTodayISO } from '../utils/format';

interface MemoNotepadProps {
  memos: BazarMemo[];
  notes: UserNote[];
  expenseCategories: string[];
  allAccountOptions: string[];
  currency: CurrencySymbol;
  onSaveMemo: (
    memo: Omit<BazarMemo, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => Promise<void>;
  onDeleteMemo: (id: string) => void;
  onAddMemoAsExpense: (payload: {
    title: string;
    amount: number;
    category: string;
    wallet: string;
    rawDate: string;
    note: string;
  }) => Promise<void>;
  onSaveNote: (
    note: { title: string; content: string; date: string },
    editId?: string
  ) => Promise<void>;
  onDeleteNote: (id: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  navigationRequest?: { tab: 'memo' | 'notepad'; scrollToSaved?: boolean; seq: number } | null;
  onNoteModalOpenChange?: (open: boolean) => void;
  closeNoteModalSeq?: number;
}

export const MemoNotepad: React.FC<MemoNotepadProps> = ({
  memos,
  notes,
  expenseCategories,
  allAccountOptions,
  currency,
  onSaveMemo,
  onDeleteMemo,
  onAddMemoAsExpense,
  onSaveNote,
  onDeleteNote,
  onNotify,
  navigationRequest,
  onNoteModalOpenChange,
  closeNoteModalSeq = 0,
}) => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<'memo' | 'notepad'>('memo');

  React.useEffect(() => {
    if (!navigationRequest) return;
    setActiveSubTab(navigationRequest.tab);
    window.setTimeout(() => {
      if (navigationRequest.tab === 'memo' && navigationRequest.scrollToSaved) {
        document
          .getElementById('saved-memos-section')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 80);
  }, [navigationRequest]);

  // Bazar Memo form state
  const [memoDate, setMemoDate] = useState(getTodayISO());
  const [memoCategory, setMemoCategory] = useState(expenseCategories[0] || 'Others');
  const [memoWallet, setMemoWallet] = useState(allAccountOptions[0] || 'Cash');
  const [memoNoteText, setMemoNoteText] = useState('');
  const [memoRows, setMemoRows] = useState<Array<{ name: string; price: string }>>([
    { name: '', price: '' },
    { name: '', price: '' },
    { name: '', price: '' },
  ]);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);

  // Sync default selectors if lists change
  React.useEffect(() => {
    if (!expenseCategories.includes(memoCategory)) {
      setMemoCategory(expenseCategories[0] || 'Others');
    }
  }, [expenseCategories, memoCategory]);

  React.useEffect(() => {
    if (!allAccountOptions.includes(memoWallet)) {
      setMemoWallet(allAccountOptions[0] || 'Cash');
    }
  }, [allAccountOptions, memoWallet]);

  // Notepad modal state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');

  React.useEffect(() => {
    onNoteModalOpenChange?.(Boolean(isAddingNote || selectedNote));
  }, [isAddingNote, selectedNote, onNoteModalOpenChange]);

  React.useEffect(() => {
    return () => {
      onNoteModalOpenChange?.(false);
    };
  }, [onNoteModalOpenChange]);

  React.useEffect(() => {
    if (closeNoteModalSeq > 0) {
      setIsAddingNote(false);
      setSelectedNote(null);
    }
  }, [closeNoteModalSeq]);

  const memoTotal = memoRows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);

  const resetMemoForm = () => {
    setMemoRows([
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' },
    ]);
    setMemoNoteText('');
    setEditingMemoId(null);
  };

  const getSaveableItems = () =>
    memoRows
      .filter((r) => r.name.trim() !== '')
      .map((r) => {
        const parsed = parseFloat(r.price);
        return {
          name: r.name.trim(),
          price: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
        };
      });

  const handleSaveMemoClick = async () => {
    const valid = getSaveableItems();
    if (valid.length === 0) {
      onNotify('error', t.toasts.needMemoItem);
      return;
    }
    const total = valid.reduce((s, item) => s + item.price, 0);
    await onSaveMemo(
      {
        date: memoDate,
        category: memoCategory,
        wallet: memoWallet,
        items: valid,
        total,
        note: memoNoteText.trim(),
      },
      editingMemoId || undefined
    );
    resetMemoForm();
  };

  const handleAddAsExpenseClick = async () => {
    const valid = getSaveableItems();
    if (valid.length === 0) {
      onNotify('error', t.toasts.needMemoItem);
      return;
    }
    const total = valid.reduce((s, item) => s + item.price, 0);
    if (total <= 0) {
      onNotify('error', t.toasts.needMemoPriceForExpense);
      return;
    }
    const itemsDescription = valid
      .map((i) => (i.price > 0 ? `${i.name}: ${formatMoney(i.price, currency)}` : i.name))
      .join(', ');
    const title = memoNoteText.trim() || `${t.memo.bazarMemoPrefix} (${memoDate})`;

    await onAddMemoAsExpense({
      title,
      amount: total,
      category: memoCategory,
      wallet: memoWallet,
      rawDate: memoDate,
      note: itemsDescription,
    });
    resetMemoForm();
  };

  const handleSaveNoteClick = async () => {
    if (!currentContent.trim() && !currentTitle.trim()) {
      onNotify('error', t.toasts.needNoteContent);
      return;
    }
    await onSaveNote(
      {
        title: currentTitle.trim() || t.common.untitled,
        content: currentContent.trim(),
        date: getTodayISO(),
      },
      selectedNote?.id
    );
    setIsAddingNote(false);
    setSelectedNote(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Sub-tab segmented selector */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setActiveSubTab('memo')}
          className={`min-h-[42px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'memo'
              ? 'bg-white text-[#16845B] shadow-sm dark:bg-slate-900 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t.memo.bazarMemoTab}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('notepad')}
          className={`min-h-[42px] rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            activeSubTab === 'notepad'
              ? 'bg-white text-[#16845B] shadow-sm dark:bg-slate-900 dark:text-emerald-400'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t.memo.notepadTab} ({notes.length})
        </button>
      </div>

      {activeSubTab === 'memo' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Builder column */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                  {editingMemoId ? t.memo.editMemo : t.memo.newMemo}
                </h2>
                {editingMemoId && (
                  <button
                    type="button"
                    onClick={resetMemoForm}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
                  >
                    {t.memo.cancelEdit}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.memo.dateLabel}
                  </label>
                  <input
                    type="date"
                    value={memoDate}
                    onChange={(e) => setMemoDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t.memo.categoryLabel}
                    </label>
                    <select
                      value={memoCategory}
                      onChange={(e) => setMemoCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {expenseCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {t.memo.walletLabel}
                    </label>
                    <select
                      value={memoWallet}
                      onChange={(e) => setMemoWallet(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.memo.memoNoteLabel}
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    placeholder={t.memo.memoNotePlaceholder}
                    value={memoNoteText}
                    onChange={(e) => setMemoNoteText(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="pt-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t.memo.itemsPrices}
                    </span>
                    <span className="font-mono-num text-base font-extrabold text-[#16845B] dark:text-emerald-400">
                      {t.common.total}: {formatMoney(memoTotal, currency)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {memoRows.map((row, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`${t.memo.itemPlaceholder} ${idx + 1}`}
                          value={row.name}
                          onChange={(e) => {
                            const updated = [...memoRows];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setMemoRows(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setMemoRows((prev) => [...prev, { name: '', price: '' }]);
                            }
                          }}
                          className="min-w-0 flex-[2] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={t.memo.pricePlaceholder}
                          value={row.price}
                          onChange={(e) => {
                            const updated = [...memoRows];
                            updated[idx] = { ...updated[idx], price: e.target.value };
                            setMemoRows(updated);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setMemoRows((prev) => [...prev, { name: '', price: '' }]);
                            }
                          }}
                          className="font-mono-num min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMemoRows((prev) => [...prev, { name: '', price: '' }])}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.memo.addRow}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveMemoClick}
                    className="min-h-[44px] rounded-xl bg-[#16845B] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#126B4A]"
                  >
                    {editingMemoId ? t.memo.updateMemo : t.memo.saveMemo}
                  </button>
                  <button
                    type="button"
                    onClick={handleAddAsExpenseClick}
                    className="min-h-[44px] rounded-xl bg-[#102A43] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 dark:bg-sky-700 dark:hover:bg-sky-600"
                  >
                    {t.memo.addAsExpense}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Saved memos list column */}
          <div id="saved-memos-section" className="space-y-3 lg:col-span-6 scroll-mt-20">
            <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-200">
              {t.memo.savedMemos} ({memos.length})
            </h3>
            {memos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                {t.memo.noSavedMemos}
              </div>
            ) : (
              memos.map((memo) => (
                <div
                  key={memo.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                        {memo.note ? memo.note : `${t.memo.bazarMemoPrefix} (${memo.date})`}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {memo.date} · {memo.category} · {memo.wallet}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={t.common.edit}
                        onClick={() => {
                          setEditingMemoId(memo.id);
                          setMemoDate(memo.date);
                          setMemoCategory(memo.category);
                          setMemoWallet(memo.wallet);
                          setMemoNoteText(memo.note || '');
                          const padded = memo.items.map((it) => ({
                            name: it.name,
                            price: it.price > 0 ? String(it.price) : '',
                          }));
                          while (padded.length < 3) padded.push({ name: '', price: '' });
                          setMemoRows(padded);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={t.common.delete}
                        onClick={() => onDeleteMemo(memo.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100 text-xs dark:divide-slate-800">
                    {memo.items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 text-slate-600 dark:text-slate-300">
                        <span>{item.name}</span>
                        <span className="font-mono-num font-semibold">
                          {item.price > 0 ? formatMoney(item.price, currency) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2.5 text-sm font-bold text-[#16845B] dark:border-slate-800 dark:text-emerald-400">
                    <span>{t.common.total}</span>
                    <span className="font-mono-num">
                      {memo.total > 0 ? formatMoney(memo.total, currency) : t.memo.plannedNoPrice}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Notepad */
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.memo.personalNotes} ({notes.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setSelectedNote(null);
                setCurrentTitle('');
                setCurrentContent('');
                setIsAddingNote(true);
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#126B4A]"
            >
              <Plus className="h-4 w-4" />
              {t.memo.newNote}
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
              {t.memo.noNotesYet}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => {
                    setSelectedNote(note);
                    setCurrentTitle(note.title);
                    setCurrentContent(note.content);
                  }}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#16845B]/50 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <h4 className="line-clamp-1 text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {note.title}
                    </h4>
                    <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {note.content || t.memo.emptyNote}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    <span>{note.date}</span>
                    <span>{t.memo.tapToOpen}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(isAddingNote || selectedNote) && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={() => {
                setIsAddingNote(false);
                setSelectedNote(null);
              }}
            >
              <div
                className="flex h-[82vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                    {selectedNote ? t.memo.editNote : t.memo.newNote}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNote(false);
                      setSelectedNote(null);
                    }}
                    aria-label={t.common.close}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={200}
                  placeholder={t.memo.noteTitlePlaceholder}
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />

                <textarea
                  maxLength={20000}
                  placeholder={t.memo.noteContentPlaceholder}
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  className="mb-4 w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />

                <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  {selectedNote ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteNote(selectedNote.id);
                        setSelectedNote(null);
                      }}
                      className="min-h-[42px] rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                    >
                      {t.common.delete}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNote(false);
                        setSelectedNote(null);
                      }}
                      className="min-h-[42px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNoteClick}
                      className="min-h-[42px] rounded-xl bg-[#16845B] px-5 py-2 text-xs font-bold text-white hover:bg-[#126B4A]"
                    >
                      {selectedNote ? t.common.update : t.common.save}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
