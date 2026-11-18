import React, { useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { BazarMemo, CategoryStyle, CurrencySymbol, UserNote } from '../types';
import {
  CategoryIconBadge,
  getCategoryStyle,
  getExpenseOrSubCategoryStyle,
} from '../utils/categoryVisuals';
import { formatMoney, getTodayISO } from '../utils/format';
import {
  type AddableItemKind,
  TransactionPickerDrawer,
  type TransactionPickerMode,
} from './TransactionPickerDrawer';

interface MemoNotepadProps {
  memos: BazarMemo[];
  notes: UserNote[];
  expenseCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  allAccountOptions: string[];
  wallets?: string[];
  savingsList?: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
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
  onSaveMemo: (
    memo: Omit<BazarMemo, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => Promise<void>;
  onDeleteMemo: (id: string) => void;
  onAddMemoAsExpense: (payload: {
    title: string;
    amount: number;
    category: string;
    subCategory?: string;
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

const pickDefaultMemoWallet = (options: string[]) =>
  options.find((acc) => acc.trim().toLowerCase() === 'cash') || options[0] || 'Cash';

export const MemoNotepad: React.FC<MemoNotepadProps> = ({
  memos,
  notes,
  expenseCategories,
  expenseSubCategories,
  allAccountOptions,
  wallets = [],
  savingsList = [],
  categoryStyles,
  currency,
  isReadOnly = false,
  onAddListItem,
  onAddSubCategory,
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
  const [tabSwipeX, setTabSwipeX] = useState(0);
  const [isSwipingTab, setIsSwipingTab] = useState(false);
  const tabSwipeRef = React.useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const didTabSwipeRef = React.useRef(false);

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
  const [memoSubCategory, setMemoSubCategory] = useState('');
  const [memoWallet, setMemoWallet] = useState(() => pickDefaultMemoWallet(allAccountOptions));
  const [memoNoteText, setMemoNoteText] = useState('');
  const [memoRows, setMemoRows] = useState<Array<{ name: string; price: string }>>([
    { name: '', price: '' },
  ]);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const itemInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const priceInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const noteContentRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Sync default selectors if lists change
  React.useEffect(() => {
    if (!expenseCategories.includes(memoCategory)) {
      setMemoCategory(expenseCategories[0] || 'Others');
      setMemoSubCategory('');
    }
  }, [expenseCategories, memoCategory]);

  React.useEffect(() => {
    if (!allAccountOptions.includes(memoWallet)) {
      setMemoWallet(pickDefaultMemoWallet(allAccountOptions));
    }
  }, [allAccountOptions, memoWallet]);

  // Notepad modal & picker drawer state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [activeMemoPicker, setActiveMemoPicker] = useState<
    'category' | 'subCategory' | 'wallet' | null
  >(null);
  const [showMemoDetails, setShowMemoDetails] = useState(false);
  const [loggingMemoId, setLoggingMemoId] = useState<string | null>(null);

  React.useEffect(() => {
    onNoteModalOpenChange?.(Boolean(isAddingNote || selectedNote || activeMemoPicker));
  }, [isAddingNote, selectedNote, activeMemoPicker, onNoteModalOpenChange]);

  React.useEffect(() => {
    return () => {
      onNoteModalOpenChange?.(false);
    };
  }, [onNoteModalOpenChange]);

  React.useEffect(() => {
    if (closeNoteModalSeq > 0) {
      if (activeMemoPicker) {
        setActiveMemoPicker(null);
        return;
      }
      setIsAddingNote(false);
      setSelectedNote(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeNoteModalSeq]);

  const memoTotal = memoRows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);

  const resetMemoForm = () => {
    setMemoRows([{ name: '', price: '' }]);
    setMemoNoteText('');
    setMemoSubCategory('');
    setMemoWallet(pickDefaultMemoWallet(allAccountOptions));
    setEditingMemoId(null);
    setShowMemoDetails(false);
  };

  const handleRowChange = (idx: number, field: 'name' | 'price', value: string) => {
    setMemoRows((prev) => {
      const updated = prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
      const editedRow = updated[idx];
      if (
        idx === updated.length - 1 &&
        (editedRow.name.trim() !== '' || editedRow.price.trim() !== '')
      ) {
        updated.push({ name: '', price: '' });
      }
      return updated;
    });
  };

  const handleRemoveRow = (idx: number) => {
    setMemoRows((prev) => {
      if (prev.length <= 1) return [{ name: '', price: '' }];
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [{ name: '', price: '' }];
    });
  };

  const appendAndFocusRow = () => {
    setMemoRows((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.name.trim() === '' && last.price.trim() === '') {
        window.requestAnimationFrame(() => itemInputRefs.current[prev.length - 1]?.focus());
        return prev;
      }
      const nextIndex = prev.length;
      window.requestAnimationFrame(() => itemInputRefs.current[nextIndex]?.focus());
      return [...prev, { name: '', price: '' }];
    });
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
        ...(memoSubCategory ? { subCategory: memoSubCategory } : {}),
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
      ...(memoSubCategory ? { subCategory: memoSubCategory } : {}),
      wallet: memoWallet,
      rawDate: memoDate,
      note: itemsDescription,
    });
    resetMemoForm();
  };

  const handleQuickLogSavedMemo = async (memo: BazarMemo) => {
    if (isReadOnly || loggingMemoId || memo.total <= 0) return;
    const itemsDescription = memo.items
      .map((i) => (i.price > 0 ? `${i.name}: ${formatMoney(i.price, currency)}` : i.name))
      .join(', ');
    const title = memo.note?.trim() || `${t.memo.bazarMemoPrefix} (${memo.date})`;
    setLoggingMemoId(memo.id);
    try {
      await onAddMemoAsExpense({
        title,
        amount: memo.total,
        category: memo.category,
        ...(memo.subCategory ? { subCategory: memo.subCategory } : {}),
        wallet: memo.wallet,
        rawDate: memo.date,
        note: itemsDescription,
      });
    } finally {
      setLoggingMemoId(null);
    }
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

  const handleTabSwipeStart = (
    clientX: number,
    clientY: number,
    target: EventTarget | null
  ) => {
    didTabSwipeRef.current = false;
    const el = target instanceof HTMLElement ? target : null;
    if (
      isAddingNote ||
      selectedNote ||
      activeMemoPicker ||
      el?.closest('input, textarea, select, [contenteditable="true"]')
    ) {
      return;
    }
    tabSwipeRef.current = {
      startX: clientX,
      startY: clientY,
      dragging: true,
      axis: null,
    };
    setIsSwipingTab(true);
  };

  const handleTabSwipeMove = (clientX: number, clientY: number) => {
    const state = tabSwipeRef.current;
    if (!state.dragging) return;
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;

    if (!state.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      state.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (state.axis !== 'x') return;

    if (Math.abs(dx) > 12) {
      didTabSwipeRef.current = true;
    }

    if (activeSubTab === 'memo') {
      setTabSwipeX(dx > 0 ? Math.min(24, dx * 0.25) : Math.max(-180, dx));
    } else {
      setTabSwipeX(dx < 0 ? Math.max(-24, dx * 0.25) : Math.min(180, dx));
    }
  };

  const handleTabSwipeEnd = () => {
    const state = tabSwipeRef.current;
    if (!state.dragging) return;
    state.dragging = false;
    setIsSwipingTab(false);

    if (state.axis === 'x') {
      if (activeSubTab === 'memo' && tabSwipeX < -48) {
        setActiveSubTab('notepad');
      } else if (activeSubTab === 'notepad' && tabSwipeX > 48) {
        setActiveSubTab('memo');
      }
    }
    state.axis = null;
    setTabSwipeX(0);
    if (didTabSwipeRef.current) {
      window.setTimeout(() => {
        didTabSwipeRef.current = false;
      }, 120);
    }
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
          {t.memo.notepadTab}
        </button>
      </div>

      {/* Swipeable Two-Pane Viewport (Bazar Memo <-> Notepad) */}
      <div
        onTouchStart={(e) =>
          handleTabSwipeStart(e.touches[0].clientX, e.touches[0].clientY, e.target)
        }
        onTouchMove={(e) => handleTabSwipeMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleTabSwipeEnd}
        onTouchCancel={handleTabSwipeEnd}
        onMouseDown={(e) => {
          if (e.button === 0) handleTabSwipeStart(e.clientX, e.clientY, e.target);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) handleTabSwipeMove(e.clientX, e.clientY);
        }}
        onMouseUp={handleTabSwipeEnd}
        onMouseLeave={handleTabSwipeEnd}
        className={`overflow-hidden ${isSwipingTab && Math.abs(tabSwipeX) > 10 ? 'select-none' : ''}`}
      >
        <div
          style={{
            transform: `translateX(calc(${
              activeSubTab === 'memo' ? '0%' : '-50%'
            } + ${tabSwipeX}px))`,
          }}
          className={`flex w-[200%] items-start ${
            !isSwipingTab ? 'transition-transform duration-300 ease-out' : ''
          }`}
        >
          {/* Pane 1: Bazar Memo */}
          <div
            aria-hidden={activeSubTab !== 'memo'}
            className={`w-1/2 shrink-0 ${
              !isSwipingTab && activeSubTab !== 'memo'
                ? 'pointer-events-none max-h-0 overflow-hidden'
                : ''
            }`}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Builder column — Clutter-free Open Note Canvas */}
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Minimal Note Title & Collapsible Metadata */}
              <div className="px-5 pt-4 pb-1">
                {editingMemoId && (
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#16845B] dark:text-emerald-400">
                      {t.memo.editMemo}
                    </span>
                    <button
                      type="button"
                      onClick={resetMemoForm}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      {t.memo.cancelEdit}
                    </button>
                  </div>
                )}

                {/* Borderless Memo Title / Note */}
                <input
                  type="text"
                  maxLength={500}
                  aria-label={t.memo.memoNoteLabel}
                  placeholder={t.memo.memoNotePlaceholder}
                  value={memoNoteText}
                  onChange={(e) => setMemoNoteText(e.target.value)}
                  className="w-full bg-transparent text-base font-bold text-[#102A43] placeholder:font-medium placeholder:text-slate-400 focus:outline-none sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                />

                {/* Collapsible Details Summary Strip */}
                <button
                  type="button"
                  onClick={() => setShowMemoDetails((prev) => !prev)}
                  aria-expanded={showMemoDetails}
                  className="mt-1.5 flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <CategoryIconBadge
                      style={getExpenseOrSubCategoryStyle(
                        categoryStyles,
                        memoCategory,
                        memoSubCategory
                      )}
                      size="sm"
                    />
                    <span className="truncate font-medium">
                      {memoDate === getTodayISO() ? t.memo.todayLabel : memoDate}
                      {' · '}
                      {memoCategory}
                      {memoSubCategory ? ` / ${memoSubCategory}` : ''}
                      {' · '}
                      {memoWallet}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-[#16845B] dark:text-emerald-400">
                    <span>{showMemoDetails ? t.memo.hideDetails : t.memo.editDetails}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        showMemoDetails ? 'rotate-180' : ''
                      }`}
                    />
                  </span>
                </button>

                {/* Expandable Date / Category / Sub-category / Wallet Pickers */}
                {showMemoDetails && (
                  <div className="mt-2 space-y-2 pb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        aria-label={t.memo.dateLabel}
                        value={memoDate}
                        onChange={(e) => setMemoDate(e.target.value)}
                        className="min-h-[44px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                      />

                      <button
                        type="button"
                        aria-label={t.memo.categoryLabel}
                        onClick={() => setActiveMemoPicker('category')}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryIconBadge
                            style={getCategoryStyle(categoryStyles, 'exp', memoCategory)}
                            size="sm"
                          />
                          <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                            {memoCategory}
                          </span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={t.txForm.subCategoryLabel}
                        onClick={() => setActiveMemoPicker('subCategory')}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryIconBadge
                            style={getExpenseOrSubCategoryStyle(
                              categoryStyles,
                              memoCategory,
                              memoSubCategory
                            )}
                            size="sm"
                          />
                          <span
                            className={`truncate text-xs ${
                              memoSubCategory
                                ? 'font-bold text-[#102A43] dark:text-slate-100'
                                : 'font-semibold text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {memoSubCategory || t.txForm.subCategoryChipPlaceholder}
                          </span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        aria-label={t.memo.walletLabel}
                        onClick={() => setActiveMemoPicker('wallet')}
                        className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CategoryIconBadge
                            style={getCategoryStyle(
                              categoryStyles,
                              savingsList.includes(memoWallet) ? 'sav' : 'wal',
                              memoWallet
                            )}
                            size="sm"
                          />
                          <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                            {memoWallet}
                          </span>
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Open Canvas Item + Inline Price Rows (Zero lines, zero columns) */}
              <div className="px-5 pt-2 pb-3 space-y-0.5">
                {memoRows.map((row, idx) => {
                  const canRemove =
                    memoRows.length > 1 || row.name.trim() !== '' || row.price.trim() !== '';
                  return (
                    <div
                      key={idx}
                      className="group flex min-h-[44px] items-center gap-2 rounded-xl px-1.5 transition-colors focus-within:bg-emerald-50/35 dark:focus-within:bg-emerald-950/20"
                    >
                      <input
                        ref={(el) => {
                          itemInputRefs.current[idx] = el;
                        }}
                        type="text"
                        placeholder={t.memo.addItemPlaceholder}
                        value={row.name}
                        onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            priceInputRefs.current[idx]?.focus();
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent py-2 text-sm leading-relaxed text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <span
                          className={`select-none text-xs transition-colors ${
                            row.price.trim() !== ''
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-slate-300 group-focus-within:text-slate-400 dark:text-slate-600 dark:group-focus-within:text-slate-500'
                          }`}
                        >
                          {currency}
                        </span>
                        <input
                          ref={(el) => {
                            priceInputRefs.current[idx] = el;
                          }}
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={row.price}
                          onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (idx < memoRows.length - 1) {
                                itemInputRefs.current[idx + 1]?.focus();
                              } else {
                                appendAndFocusRow();
                              }
                            }
                          }}
                          className="no-spinner w-20 bg-transparent py-2 text-right font-mono-num text-sm font-semibold tabular-nums text-[#102A43] placeholder:font-normal placeholder:text-slate-300 focus:outline-none sm:w-24 dark:text-slate-100 dark:placeholder:text-slate-600"
                        />
                        {canRemove ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            aria-label={t.common.delete}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="h-8 w-8 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={appendAndFocusRow}
                    className="inline-flex min-h-[44px] items-center gap-1.5 px-1.5 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.memo.addItemBtn}
                  </button>
                </div>
              </div>

              {/* Quiet Total & Actions Footer */}
              <div className="border-t border-dashed border-slate-200/90 bg-slate-50/50 px-5 pt-3.5 pb-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-3.5 flex items-baseline justify-between">
                  <span className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
                    {t.common.total}
                  </span>
                  <span className="font-mono-num text-lg font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                    {formatMoney(memoTotal, currency)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={handleSaveMemoClick}
                    className="min-h-[44px] rounded-xl bg-[#16845B] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-50"
                  >
                    {editingMemoId ? t.memo.updateMemo : t.memo.saveMemo}
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={handleAddAsExpenseClick}
                    className="min-h-[44px] rounded-xl bg-[#102A43] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
                  >
                    {t.memo.addAsExpense}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Saved memos list column — Clean Borderless Note Cards with Quick Log */}
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
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                        {memo.note ? memo.note : `${t.memo.bazarMemoPrefix} (${memo.date})`}
                      </h4>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {memo.date} · {memo.category}
                        {memo.subCategory ? ` / ${memo.subCategory}` : ''} · {memo.wallet}
                      </p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={t.common.edit}
                          onClick={() => {
                            setEditingMemoId(memo.id);
                            setMemoDate(memo.date);
                            setMemoCategory(memo.category);
                            setMemoSubCategory(memo.subCategory || '');
                            setMemoWallet(memo.wallet);
                            setMemoNoteText(memo.note || '');
                            const loadedRows = memo.items.map((it) => ({
                              name: it.name,
                              price: it.price > 0 ? String(it.price) : '',
                            }));
                            loadedRows.push({ name: '', price: '' });
                            setMemoRows(loadedRows);
                            setShowMemoDetails(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t.common.delete}
                          onClick={() => onDeleteMemo(memo.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-950"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Borderless Item List */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    {memo.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between gap-3 text-slate-700 dark:text-slate-300"
                      >
                        <span className="min-w-0 truncate">{item.name}</span>
                        <span className="font-mono-num shrink-0 font-semibold tabular-nums text-[#102A43] dark:text-slate-200">
                          {item.price > 0 ? formatMoney(item.price, currency) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t.common.total}
                      </span>
                      <span className="font-mono-num text-sm font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                        {memo.total > 0 ? formatMoney(memo.total, currency) : t.memo.plannedNoPrice}
                      </span>
                    </div>

                    {memo.total > 0 && !isReadOnly && (
                      <button
                        type="button"
                        disabled={loggingMemoId === memo.id}
                        onClick={() => void handleQuickLogSavedMemo(memo)}
                        className="min-h-[40px] shrink-0 whitespace-nowrap rounded-xl bg-[#102A43] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
                      >
                        {loggingMemoId === memo.id ? t.memo.loggingExpense : t.memo.logAsExpense}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
          </div>

          {/* Pane 2: Notepad */}
          <div
            aria-hidden={activeSubTab !== 'notepad'}
            className={`w-1/2 shrink-0 ${
              !isSwipingTab && activeSubTab !== 'notepad'
                ? 'pointer-events-none max-h-0 overflow-hidden'
                : ''
            }`}
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                  {t.memo.personalNotes} ({notes.length})
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (didTabSwipeRef.current) return;
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
                        if (didTabSwipeRef.current) return;
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
            </div>
          </div>
        </div>
      </div>

      {(isAddingNote || selectedNote) && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={() => {
                setIsAddingNote(false);
                setSelectedNote(null);
              }}
            >
              <div
                className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Unified Note Header + Title + Body */}
                <div className="flex items-center justify-between px-5 pt-4 pb-1">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {selectedNote ? `${t.memo.editNote} · ${selectedNote.date}` : t.memo.newNote}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNote(false);
                      setSelectedNote(null);
                    }}
                    aria-label={t.common.close}
                    className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="text"
                  maxLength={200}
                  aria-label={t.memo.noteTitlePlaceholder}
                  placeholder={t.memo.noteTitlePlaceholder}
                  value={currentTitle}
                  onChange={(e) => setCurrentTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      noteContentRef.current?.focus();
                    }
                  }}
                  className="w-full bg-transparent px-5 pt-1.5 pb-3 text-base font-bold text-[#102A43] placeholder:font-medium placeholder:text-slate-400 focus:outline-none sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
                />

                <div className="mx-5 border-b border-slate-100 dark:border-slate-800" />

                <textarea
                  ref={noteContentRef}
                  maxLength={20000}
                  aria-label={t.memo.noteContentPlaceholder}
                  placeholder={t.memo.noteContentPlaceholder}
                  value={currentContent}
                  onChange={(e) => setCurrentContent(e.target.value)}
                  className="w-full flex-1 resize-none bg-transparent px-5 py-3.5 text-sm leading-relaxed text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                />

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/40">
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
      {activeMemoPicker && (() => {
        const pickerMode: TransactionPickerMode =
          activeMemoPicker === 'category'
            ? 'exp_cat'
            : activeMemoPicker === 'subCategory'
            ? 'sub_cat'
            : 'account';

        const pickerTitle =
          pickerMode === 'exp_cat'
            ? t.txForm.drawerChooseExpCategory
            : pickerMode === 'sub_cat'
            ? `${t.txForm.drawerChooseSubCategory} · ${memoCategory}`
            : t.txForm.drawerChooseAccount;

        const selectedValue =
          activeMemoPicker === 'category'
            ? memoCategory
            : activeMemoPicker === 'subCategory'
            ? memoSubCategory
            : memoWallet;

        const pickerSubs = Array.from(
          new Set([
            ...(expenseSubCategories?.[memoCategory] || []),
            ...(memoSubCategory ? [memoSubCategory] : []),
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
            parentCategory={memoCategory}
            expenseCategories={expenseCategories}
            incomeCategories={[]}
            subCategories={pickerSubs}
            wallets={wallets}
            savingsList={savingsList}
            allAccountOptions={allAccountOptions}
            categoryStyles={categoryStyles}
            isReadOnly={isReadOnly}
            onSelect={(val) => {
              if (activeMemoPicker === 'category') {
                setMemoCategory(val);
                if (!(expenseSubCategories?.[val] || []).includes(memoSubCategory)) {
                  setMemoSubCategory('');
                }
              } else if (activeMemoPicker === 'subCategory') {
                setMemoSubCategory(val);
              } else {
                setMemoWallet(val);
              }
            }}
            onCreateItem={handleCreateFromDrawer}
            onClose={() => setActiveMemoPicker(null)}
          />
        );
      })()}
    </div>
  );
};
