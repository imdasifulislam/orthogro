import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  Copy,
  MessageSquare,
  Plus,
  Share2,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  BazarMemo,
  BazarMemoItem,
  CategoryStyle,
  CurrencySymbol,
  UserNote,
} from '../types';
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

interface DraftMemoRow {
  name: string;
  qty: string;
  price: string;
  checked: boolean;
}

interface ExpenseDrawerTarget {
  source: 'active' | 'saved';
  defaultTitle: string;
  amount: number;
  items: BazarMemoItem[];
  date: string;
  category: string;
  subCategory: string;
  wallet: string;
}

interface ShareSheetState {
  kind: 'memo' | 'note';
  title: string;
  text: string;
}

const createEmptyRow = (): DraftMemoRow => ({
  name: '',
  qty: '',
  price: '',
  checked: false,
});

const pickDefaultMemoWallet = (options: string[]) =>
  options.find((acc) => acc.trim().toLowerCase() === 'cash') || options[0] || 'Cash';

function extractSaveableItems(rows: DraftMemoRow[]): BazarMemoItem[] {
  return rows
    .filter((r) => r.name.trim() !== '')
    .map((r) => {
      const parsed = parseFloat(r.price);
      const cleanQty = r.qty.trim().slice(0, 40);
      const item: BazarMemoItem = {
        name: r.name.trim().slice(0, 120),
        price: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
      };
      if (cleanQty) item.qty = cleanQty;
      if (r.checked) item.checked = true;
      return item;
    });
}

function serializeMemoSnapshot(note: string, items: BazarMemoItem[]): string {
  return JSON.stringify({
    note: note.trim(),
    items: items.map((it) => ({
      name: it.name.trim(),
      price: Number.isFinite(it.price) && it.price > 0 ? it.price : 0,
      qty: (it.qty || '').trim(),
      checked: Boolean(it.checked),
    })),
  });
}

function serializeNoteSnapshot(title: string, content: string): string {
  return JSON.stringify({
    title: title.trim(),
    content: content.trim(),
  });
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall back to execCommand below
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function formatMemoShareText(
  title: string,
  items: Array<{ name: string; qty?: string }>
): string {
  const lines = items
    .filter((item) => item.name.trim() !== '')
    .map((item) => {
      const cleanName = item.name.trim();
      const cleanQty = (item.qty || '').trim();
      return cleanQty ? `• ${cleanName} - ${cleanQty}` : `• ${cleanName}`;
    });
  const body = lines.join('\n');
  const trimmedTitle = title.trim();
  const header = trimmedTitle ? `${trimmedTitle}\n\n` : '';
  return `${header}${body}\n\n— OrthoGro`;
}

function formatNoteShareText(title: string, content: string): string {
  const cleanTitle = title.trim();
  const cleanContent = content.trim();
  const parts: string[] = [];
  if (cleanTitle) parts.push(cleanTitle);
  if (cleanContent) parts.push(cleanContent);
  return `${parts.join('\n\n')}\n\n— OrthoGro`;
}

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
  const tabSwipeRef = useRef<{
    startX: number;
    startY: number;
    dragging: boolean;
    axis: 'x' | 'y' | null;
  }>({ startX: 0, startY: 0, dragging: false, axis: null });
  const didTabSwipeRef = useRef(false);

  // Dedicated Bazar Memo Editor state (false = Saved Memos list, true = dedicated Add/Edit page)
  const [isMemoEditorOpen, setIsMemoEditorOpen] = useState(false);
  const [memoDate, setMemoDate] = useState(getTodayISO());
  const [memoCategory, setMemoCategory] = useState(expenseCategories[0] || 'Others');
  const [memoSubCategory, setMemoSubCategory] = useState('');
  const [memoWallet, setMemoWallet] = useState(() => pickDefaultMemoWallet(allAccountOptions));
  const [memoNoteText, setMemoNoteText] = useState('');
  const [memoRows, setMemoRows] = useState<DraftMemoRow[]>([createEmptyRow()]);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);

  const initialMemoSnapshotRef = useRef<string>(serializeMemoSnapshot('', []));
  const isSavingMemoRef = useRef(false);

  const itemInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const qtyInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const priceInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const noteContentRef = useRef<HTMLTextAreaElement | null>(null);

  // Notepad modal state
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const initialNoteSnapshotRef = useRef<string>(serializeNoteSnapshot('', ''));
  const isSavingNoteRef = useRef(false);

  // Expense bottom drawer & pickers
  const [expenseDrawer, setExpenseDrawer] = useState<ExpenseDrawerTarget | null>(null);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerDate, setDrawerDate] = useState(getTodayISO());
  const [drawerCategory, setDrawerCategory] = useState(expenseCategories[0] || 'Others');
  const [drawerSubCategory, setDrawerSubCategory] = useState('');
  const [drawerWallet, setDrawerWallet] = useState(() =>
    pickDefaultMemoWallet(allAccountOptions)
  );
  const [isLoggingExpense, setIsLoggingExpense] = useState(false);
  const [activeMemoPicker, setActiveMemoPicker] = useState<
    'category' | 'subCategory' | 'wallet' | null
  >(null);

  // Share bottom sheet
  const [shareSheet, setShareSheet] = useState<ShareSheetState | null>(null);
  const [shareTextDraft, setShareTextDraft] = useState('');
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  // Keep latest state in a ref for unmount auto-save safety (e.g. tapping bottom nav tab directly)
  const latestRef = useRef({
    isMemoEditorOpen,
    isReadOnly,
    memoNoteText,
    memoRows,
    memoDate,
    memoCategory,
    memoSubCategory,
    memoWallet,
    editingMemoId,
    onSaveMemo,
    isAddingNote,
    selectedNote,
    currentTitle,
    currentContent,
    onSaveNote,
    untitled: t.common.untitled,
  });

  latestRef.current = {
    isMemoEditorOpen,
    isReadOnly,
    memoNoteText,
    memoRows,
    memoDate,
    memoCategory,
    memoSubCategory,
    memoWallet,
    editingMemoId,
    onSaveMemo,
    isAddingNote,
    selectedNote,
    currentTitle,
    currentContent,
    onSaveNote,
    untitled: t.common.untitled,
  };

  // Auto-save dirty memo or note if component unmounts while editor is open
  useEffect(() => {
    return () => {
      const s = latestRef.current;
      if (s.isMemoEditorOpen && !s.isReadOnly && !isSavingMemoRef.current) {
        const valid = extractSaveableItems(s.memoRows);
        const currentSnap = serializeMemoSnapshot(s.memoNoteText, valid);
        if (valid.length > 0 && currentSnap !== initialMemoSnapshotRef.current) {
          isSavingMemoRef.current = true;
          initialMemoSnapshotRef.current = currentSnap;
          const total = valid.reduce((sum, it) => sum + it.price, 0);
          void s.onSaveMemo(
            {
              date: s.memoDate,
              category: s.memoCategory,
              ...(s.memoSubCategory ? { subCategory: s.memoSubCategory } : {}),
              wallet: s.memoWallet,
              items: valid,
              total,
              note: s.memoNoteText.trim(),
            },
            s.editingMemoId || undefined
          );
        }
      }
      if ((s.isAddingNote || s.selectedNote) && !s.isReadOnly && !isSavingNoteRef.current) {
        const hasText = Boolean(s.currentTitle.trim() || s.currentContent.trim());
        const noteSnap = serializeNoteSnapshot(s.currentTitle, s.currentContent);
        if (hasText && noteSnap !== initialNoteSnapshotRef.current) {
          isSavingNoteRef.current = true;
          initialNoteSnapshotRef.current = noteSnap;
          void s.onSaveNote(
            {
              title: s.currentTitle.trim() || s.untitled,
              content: s.currentContent.trim(),
              date: getTodayISO(),
            },
            s.selectedNote?.id
          );
        }
      }
    };
  }, []);

  // Close editor automatically if the currently-edited memo was deleted
  useEffect(() => {
    if (isMemoEditorOpen && editingMemoId && !memos.some((m) => m.id === editingMemoId)) {
      initialMemoSnapshotRef.current = serializeMemoSnapshot('', []);
      setIsMemoEditorOpen(false);
      setEditingMemoId(null);
      setMemoRows([createEmptyRow()]);
      setMemoNoteText('');
    }
  }, [memos, isMemoEditorOpen, editingMemoId]);

  useEffect(() => {
    if (!navigationRequest) return;
    setActiveSubTab(navigationRequest.tab);
    setIsMemoEditorOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);
  }, [navigationRequest]);

  // Sync default selectors if lists change
  useEffect(() => {
    if (!expenseCategories.includes(memoCategory)) {
      setMemoCategory(expenseCategories[0] || 'Others');
      setMemoSubCategory('');
    }
  }, [expenseCategories, memoCategory]);

  useEffect(() => {
    if (!allAccountOptions.includes(memoWallet)) {
      setMemoWallet(pickDefaultMemoWallet(allAccountOptions));
    }
  }, [allAccountOptions, memoWallet]);

  useEffect(() => {
    if (!copiedJustNow) return;
    const timer = window.setTimeout(() => setCopiedJustNow(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copiedJustNow]);

  useEffect(() => {
    onNoteModalOpenChange?.(
      Boolean(
        isMemoEditorOpen ||
          isAddingNote ||
          selectedNote ||
          activeMemoPicker ||
          expenseDrawer ||
          shareSheet
      )
    );
  }, [
    isMemoEditorOpen,
    isAddingNote,
    selectedNote,
    activeMemoPicker,
    expenseDrawer,
    shareSheet,
    onNoteModalOpenChange,
  ]);

  useEffect(() => {
    return () => {
      onNoteModalOpenChange?.(false);
    };
  }, [onNoteModalOpenChange]);

  const memoTotal = memoRows.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);

  const resetMemoFields = () => {
    setMemoRows([createEmptyRow()]);
    setMemoNoteText('');
    setMemoDate(getTodayISO());
    setMemoCategory(expenseCategories[0] || 'Others');
    setMemoSubCategory('');
    setMemoWallet(pickDefaultMemoWallet(allAccountOptions));
    setEditingMemoId(null);
    initialMemoSnapshotRef.current = serializeMemoSnapshot('', []);
  };

  const openNewMemoEditor = () => {
    if (isReadOnly) return;
    resetMemoFields();
    setIsMemoEditorOpen(true);
  };

  const openSavedMemoEditor = (memo: BazarMemo) => {
    setEditingMemoId(memo.id);
    setMemoDate(memo.date || getTodayISO());
    setMemoCategory(
      expenseCategories.includes(memo.category)
        ? memo.category
        : expenseCategories[0] || 'Others'
    );
    setMemoSubCategory(memo.subCategory || '');
    setMemoWallet(
      allAccountOptions.includes(memo.wallet)
        ? memo.wallet
        : pickDefaultMemoWallet(allAccountOptions)
    );
    setMemoNoteText(memo.note || '');
    const loadedRows: DraftMemoRow[] = memo.items.map((it) => ({
      name: it.name,
      qty: it.qty || '',
      price: it.price > 0 ? String(it.price) : '',
      checked: Boolean(it.checked),
    }));
    if (loadedRows.length === 0) {
      loadedRows.push(createEmptyRow());
    }
    setMemoRows(loadedRows);
    initialMemoSnapshotRef.current = serializeMemoSnapshot(
      memo.note || '',
      extractSaveableItems(loadedRows)
    );
    setIsMemoEditorOpen(true);
  };

  // Auto-save on Back / Exit without requiring explicit Save tap
  const handleExitMemoEditor = async () => {
    if (isSavingMemoRef.current) return;
    const valid = extractSaveableItems(memoRows);
    const currentSnap = serializeMemoSnapshot(memoNoteText, valid);

    if (!isReadOnly && valid.length > 0 && currentSnap !== initialMemoSnapshotRef.current) {
      isSavingMemoRef.current = true;
      initialMemoSnapshotRef.current = currentSnap;
      const total = valid.reduce((sum, item) => sum + item.price, 0);
      try {
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
      } finally {
        isSavingMemoRef.current = false;
      }
    }

    resetMemoFields();
    setIsMemoEditorOpen(false);
  };

  // Auto-save on Notepad Close / Back / Backdrop click
  const handleCloseNoteModal = async () => {
    if (isSavingNoteRef.current) return;
    const hasText = Boolean(currentTitle.trim() || currentContent.trim());
    const currentSnap = serializeNoteSnapshot(currentTitle, currentContent);

    if (!isReadOnly && hasText && currentSnap !== initialNoteSnapshotRef.current) {
      isSavingNoteRef.current = true;
      initialNoteSnapshotRef.current = currentSnap;
      try {
        await onSaveNote(
          {
            title: currentTitle.trim() || t.common.untitled,
            content: currentContent.trim(),
            date: getTodayISO(),
          },
          selectedNote?.id
        );
      } finally {
        isSavingNoteRef.current = false;
      }
    }

    setIsAddingNote(false);
    setSelectedNote(null);
  };

  // Hardware / Browser Back button handler
  useEffect(() => {
    if (closeNoteModalSeq > 0) {
      if (activeMemoPicker) {
        setActiveMemoPicker(null);
        return;
      }
      if (shareSheet) {
        setShareSheet(null);
        return;
      }
      if (expenseDrawer) {
        setExpenseDrawer(null);
        return;
      }
      if (isAddingNote || selectedNote) {
        void handleCloseNoteModal();
        return;
      }
      if (isMemoEditorOpen) {
        void handleExitMemoEditor();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeNoteModalSeq]);

  // Escape key closes top-most sheet/drawer/modal
  useEffect(() => {
    if (!shareSheet && !expenseDrawer && !isAddingNote && !selectedNote && !isMemoEditorOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeMemoPicker) return;
      if (shareSheet) {
        setShareSheet(null);
      } else if (expenseDrawer) {
        setExpenseDrawer(null);
      } else if (isAddingNote || selectedNote) {
        void handleCloseNoteModal();
      } else if (isMemoEditorOpen) {
        void handleExitMemoEditor();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareSheet, expenseDrawer, activeMemoPicker, isAddingNote, selectedNote, isMemoEditorOpen]);

  const handleRowChange = (
    idx: number,
    field: 'name' | 'qty' | 'price',
    value: string
  ) => {
    setMemoRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === 'price') {
          const parsed = parseFloat(value);
          const hasAmount = value.trim() !== '' && Number.isFinite(parsed) && parsed > 0;
          return { ...row, price: value, checked: hasAmount };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleToggleRowChecked = (idx: number) => {
    setMemoRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, checked: !row.checked } : row))
    );
  };

  const handleRemoveRow = (idx: number) => {
    setMemoRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      const next = prev.filter((_, i) => i !== idx);
      return next.length > 0 ? next : [createEmptyRow()];
    });
  };

  const appendAndFocusRow = () => {
    setMemoRows((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.name.trim() === '' &&
        last.qty.trim() === '' &&
        last.price.trim() === ''
      ) {
        window.requestAnimationFrame(() => itemInputRefs.current[prev.length - 1]?.focus());
        return prev;
      }
      const nextIndex = prev.length;
      window.requestAnimationFrame(() => itemInputRefs.current[nextIndex]?.focus());
      return [...prev, createEmptyRow()];
    });
  };

  const openExpenseDrawerForActive = () => {
    if (isReadOnly) return;
    const valid = extractSaveableItems(memoRows);
    if (valid.length === 0) {
      onNotify('error', t.toasts.needMemoItem);
      return;
    }
    const total = valid.reduce((s, item) => s + item.price, 0);
    if (total <= 0) {
      onNotify('error', t.toasts.needMemoPriceForExpense);
      return;
    }
    const defaultTitle =
      memoNoteText.trim() || `${t.memo.bazarMemoPrefix} (${memoDate})`;
    setDrawerTitle(defaultTitle);
    setDrawerDate(memoDate);
    setDrawerCategory(
      expenseCategories.includes(memoCategory)
        ? memoCategory
        : expenseCategories[0] || 'Others'
    );
    setDrawerSubCategory(memoSubCategory);
    setDrawerWallet(
      allAccountOptions.includes(memoWallet)
        ? memoWallet
        : pickDefaultMemoWallet(allAccountOptions)
    );
    setExpenseDrawer({
      source: 'active',
      defaultTitle,
      amount: total,
      items: valid,
      date: memoDate,
      category: memoCategory,
      subCategory: memoSubCategory,
      wallet: memoWallet,
    });
  };

  const openExpenseDrawerForSaved = (memo: BazarMemo) => {
    if (isReadOnly) return;
    if (memo.total <= 0) {
      onNotify('error', t.toasts.needMemoPriceForExpense);
      return;
    }
    const defaultTitle =
      memo.note?.trim() || `${t.memo.bazarMemoPrefix} (${memo.date})`;
    const safeCat = expenseCategories.includes(memo.category)
      ? memo.category
      : expenseCategories[0] || 'Others';
    const safeWallet = allAccountOptions.includes(memo.wallet)
      ? memo.wallet
      : pickDefaultMemoWallet(allAccountOptions);
    setDrawerTitle(defaultTitle);
    setDrawerDate(memo.date || getTodayISO());
    setDrawerCategory(safeCat);
    setDrawerSubCategory(memo.subCategory || '');
    setDrawerWallet(safeWallet);
    setExpenseDrawer({
      source: 'saved',
      defaultTitle,
      amount: memo.total,
      items: memo.items,
      date: memo.date || getTodayISO(),
      category: safeCat,
      subCategory: memo.subCategory || '',
      wallet: safeWallet,
    });
  };

  const handleConfirmLogExpense = async () => {
    if (!expenseDrawer || isLoggingExpense || isReadOnly) return;
    setIsLoggingExpense(true);
    try {
      const itemsDescription = expenseDrawer.items
        .map((i) => {
          const label = i.qty ? `${i.name} (${i.qty})` : i.name;
          return i.price > 0 ? `${label}: ${formatMoney(i.price, currency)}` : label;
        })
        .join(', ');
      const finalTitle =
        drawerTitle.trim() || `${t.memo.bazarMemoPrefix} (${drawerDate})`;

      await onAddMemoAsExpense({
        title: finalTitle,
        amount: expenseDrawer.amount,
        category: drawerCategory,
        ...(drawerSubCategory ? { subCategory: drawerSubCategory } : {}),
        wallet: drawerWallet,
        rawDate: drawerDate,
        note: itemsDescription,
      });

      const wasActive = expenseDrawer.source === 'active';
      // If user edited an existing saved memo (e.g. entered prices at the market) and logged it,
      // persist those item price/check updates silently on the saved memo too
      if (wasActive && editingMemoId) {
        const valid = extractSaveableItems(memoRows);
        const currentSnap = serializeMemoSnapshot(memoNoteText, valid);
        if (valid.length > 0 && currentSnap !== initialMemoSnapshotRef.current) {
          initialMemoSnapshotRef.current = currentSnap;
          await onSaveMemo(
            {
              date: drawerDate,
              category: drawerCategory,
              ...(drawerSubCategory ? { subCategory: drawerSubCategory } : {}),
              wallet: drawerWallet,
              items: valid,
              total: expenseDrawer.amount,
              note: memoNoteText.trim(),
            },
            editingMemoId
          );
        }
      }

      setExpenseDrawer(null);
      if (wasActive) {
        resetMemoFields();
        setIsMemoEditorOpen(false);
      }
    } finally {
      setIsLoggingExpense(false);
    }
  };

  const openShareSheetForActiveMemo = () => {
    const valid = extractSaveableItems(memoRows);
    if (valid.length === 0) {
      onNotify('info', t.memo.needItemToShare);
      return;
    }
    const text = formatMemoShareText(memoNoteText, valid);
    setShareTextDraft(text);
    setCopiedJustNow(false);
    setShareSheet({
      kind: 'memo',
      title: memoNoteText.trim() || t.memo.bazarMemoTab,
      text,
    });
  };

  const openShareSheetForSavedMemo = (memo: BazarMemo) => {
    if (!memo.items || memo.items.length === 0) {
      onNotify('info', t.memo.needItemToShare);
      return;
    }
    const text = formatMemoShareText(memo.note || '', memo.items);
    setShareTextDraft(text);
    setCopiedJustNow(false);
    setShareSheet({
      kind: 'memo',
      title: memo.note?.trim() || `${t.memo.bazarMemoPrefix} (${memo.date})`,
      text,
    });
  };

  const openShareSheetForNote = (title: string, content: string) => {
    if (!title.trim() && !content.trim()) {
      onNotify('info', t.memo.needNoteToShare);
      return;
    }
    const text = formatNoteShareText(title, content);
    setShareTextDraft(text);
    setCopiedJustNow(false);
    setShareSheet({
      kind: 'note',
      title: title.trim() || t.memo.notepadTab,
      text,
    });
  };

  const handleTabSwipeStart = (
    clientX: number,
    clientY: number,
    target: EventTarget | null
  ) => {
    didTabSwipeRef.current = false;
    const el = target instanceof HTMLElement ? target : null;
    if (
      isMemoEditorOpen ||
      isAddingNote ||
      selectedNote ||
      activeMemoPicker ||
      expenseDrawer ||
      shareSheet ||
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

  // Share Sheet derived helpers
  const trimmedShareText = shareTextDraft.trim();
  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const isAndroid =
    typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const encodedShareText = encodeURIComponent(trimmedShareText);
  const whatsappWebUrl = `https://wa.me/?text=${encodedShareText}`;
  const whatsappHref = isAndroid
    ? `intent://send?text=${encodedShareText}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${encodeURIComponent(
        whatsappWebUrl
      )};end`
    : whatsappWebUrl;
  const telegramHref = `https://t.me/share/url?url=%20&text=${encodedShareText}`;
  const smsHref = `sms:?body=${encodedShareText}`;

  const handleCopyShareText = async () => {
    if (!trimmedShareText) {
      onNotify('info', t.shareApp.emptyWarning);
      return;
    }
    const ok = await copyTextToClipboard(trimmedShareText);
    if (ok) {
      setCopiedJustNow(true);
      onNotify('success', t.memo.copiedToast);
    }
  };

  const handleNativeShareText = async () => {
    if (!trimmedShareText) {
      onNotify('info', t.shareApp.emptyWarning);
      return;
    }
    if (!supportsNativeShare) {
      await handleCopyShareText();
      return;
    }
    try {
      await navigator.share({
        title: shareSheet?.title || 'OrthoGro',
        text: trimmedShareText,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const ok = await copyTextToClipboard(trimmedShareText);
      if (ok) {
        setCopiedJustNow(true);
        onNotify('success', t.memo.copiedToast);
      }
    }
  };

  const handleCopyAndOpenMessenger = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!trimmedShareText) {
      e.preventDefault();
      onNotify('info', t.shareApp.emptyWarning);
      return;
    }
    const ok = await copyTextToClipboard(trimmedShareText);
    if (ok) {
      setCopiedJustNow(true);
      onNotify('info', t.shareApp.messengerCopiedToast);
    }
  };

  const handleExternalSocialClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!trimmedShareText) {
      e.preventDefault();
      onNotify('info', t.shareApp.emptyWarning);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Bazar Memo Editor Modal (Auto-saves on Back / Close / Backdrop tap) */}
      {isMemoEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => void handleExitMemoEditor()}
        >
          <div
            className="flex max-h-[84vh] min-h-[54vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Unified Memo Header + Auto-save Hint + Compact Icons */}
            <div className="flex shrink-0 items-center justify-between gap-2 px-5 pt-4 pb-1">
              <span className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                {editingMemoId ? `${t.memo.bazarMemoTab} · ${memoDate}` : t.memo.newMemoBtn}
              </span>
              <div className="-mr-1 flex shrink-0 items-center gap-1.5">
                {!isReadOnly && (
                  <span className="mr-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {t.memo.autoSaveHint}
                  </span>
                )}
                {editingMemoId && !isReadOnly && (
                  <button
                    type="button"
                    aria-label={t.common.delete}
                    title={t.common.delete}
                    onClick={() => onDeleteMemo(editingMemoId)}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={openShareSheetForActiveMemo}
                  aria-label={t.memo.shareMemo}
                  title={t.memo.shareMemo}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-sky-950/60 dark:hover:text-sky-400"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={t.common.close}
                  title={t.common.close}
                  onClick={() => void handleExitMemoEditor()}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Optional Memo Title */}
            <div className="shrink-0 px-5 pt-1.5 pb-2.5">
              <input
                type="text"
                maxLength={500}
                readOnly={isReadOnly}
                aria-label={t.memo.memoNoteLabel}
                placeholder={t.memo.memoNotePlaceholder}
                value={memoNoteText}
                onChange={(e) => setMemoNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    itemInputRefs.current[0]?.focus();
                  }
                }}
                className="w-full bg-transparent text-base font-bold text-[#102A43] placeholder:font-medium placeholder:text-slate-400 focus:outline-none sm:text-lg dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <div className="mx-5 shrink-0 border-b border-slate-100 dark:border-slate-800" />

            {/* Scrollable Tight Flat Item Rows (Zero inner borders, zero column boxes) */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-1.5 pb-3 sm:px-4">
              <div className="space-y-0">
                {memoRows.map((row, idx) => {
                  const hasRowContent =
                    row.name.trim() !== '' ||
                    row.qty.trim() !== '' ||
                    row.price.trim() !== '';
                  const canRemove = !isReadOnly && (memoRows.length > 1 || hasRowContent);

                  return (
                    <div
                      key={idx}
                      className="group flex items-center gap-1 rounded-lg px-1 py-0.5 transition-colors focus-within:bg-emerald-50/40 dark:focus-within:bg-emerald-950/25"
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={row.checked}
                        aria-label={t.memo.toggleCheckAria}
                        disabled={isReadOnly}
                        onClick={() => handleToggleRowChecked(idx)}
                        className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B]/50 disabled:opacity-60"
                      >
                        <span
                          className={`flex h-[18px] w-[18px] items-center justify-center rounded-md border transition-colors ${
                            row.checked
                              ? 'border-[#16845B] bg-[#16845B] text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-slate-950'
                              : 'border-slate-300 bg-transparent group-hover:border-slate-400 dark:border-slate-600 dark:group-hover:border-slate-500'
                          }`}
                        >
                          {row.checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                      </button>

                      {/* Item Name */}
                      <input
                        ref={(el) => {
                          itemInputRefs.current[idx] = el;
                        }}
                        type="text"
                        enterKeyHint="next"
                        readOnly={isReadOnly}
                        placeholder={t.memo.addItemPlaceholder}
                        value={row.name}
                        onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (idx < memoRows.length - 1) {
                              itemInputRefs.current[idx + 1]?.focus();
                            } else if (!isReadOnly) {
                              appendAndFocusRow();
                            }
                          }
                        }}
                        className={`min-w-0 flex-1 bg-transparent py-1 text-sm leading-snug focus:outline-none ${
                          row.checked
                            ? 'text-slate-400 line-through dark:text-slate-500'
                            : 'text-[#102A43] placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500'
                        }`}
                      />

                      {/* Quantity / Unit (kg/pc) */}
                      <input
                        ref={(el) => {
                          qtyInputRefs.current[idx] = el;
                        }}
                        type="text"
                        enterKeyHint="next"
                        maxLength={40}
                        readOnly={isReadOnly}
                        aria-label={t.memo.qtyPlaceholder}
                        placeholder={t.memo.qtyPlaceholder}
                        value={row.qty}
                        onChange={(e) => handleRowChange(idx, 'qty', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (idx < memoRows.length - 1) {
                              itemInputRefs.current[idx + 1]?.focus();
                            } else if (!isReadOnly) {
                              appendAndFocusRow();
                            }
                          }
                        }}
                        className={`w-14 shrink-0 bg-transparent py-1 text-right text-xs font-medium focus:outline-none sm:w-16 ${
                          row.checked
                            ? 'text-slate-400 line-through dark:text-slate-500'
                            : 'text-slate-600 placeholder:text-slate-300 dark:text-slate-300 dark:placeholder:text-slate-600'
                        }`}
                      />

                      {/* Price */}
                      <div
                        onClick={() => priceInputRefs.current[idx]?.focus()}
                        className="ml-2 flex min-w-[68px] max-w-[104px] shrink-0 cursor-text items-baseline justify-end sm:min-w-[84px] sm:max-w-[118px]"
                      >
                        <span
                          className={`mr-0.5 shrink-0 select-none text-base font-normal leading-snug transition-colors ${
                            row.price.trim() !== ''
                              ? row.checked
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-[#102A43] dark:text-slate-100'
                              : 'text-slate-300 group-focus-within:text-slate-400 dark:text-slate-600 dark:group-focus-within:text-slate-500'
                          }`}
                        >
                          {currency}
                        </span>
                        <span className="relative inline-block min-w-[1ch] max-w-full overflow-hidden align-baseline">
                          <span
                            aria-hidden="true"
                            className="invisible block whitespace-pre py-1 pr-0.5 text-sm font-normal leading-snug tabular-nums"
                          >
                            {row.price || '0'}
                          </span>
                          <input
                            ref={(el) => {
                              priceInputRefs.current[idx] = el;
                            }}
                            type="number"
                            inputMode="decimal"
                            enterKeyHint="next"
                            step="any"
                            min="0"
                            readOnly={isReadOnly}
                            aria-label={t.memo.pricePlaceholder}
                            placeholder="0"
                            value={row.price}
                            onChange={(e) => handleRowChange(idx, 'price', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (idx < memoRows.length - 1) {
                                  priceInputRefs.current[idx + 1]?.focus();
                                } else if (!isReadOnly) {
                                  appendAndFocusRow();
                                }
                              }
                            }}
                            className={`no-spinner absolute inset-0 h-full w-full bg-transparent py-1 pr-0.5 text-right text-sm font-normal leading-snug tabular-nums focus:outline-none ${
                              row.checked
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-[#102A43] placeholder:font-normal placeholder:text-slate-300 dark:text-slate-100 dark:placeholder:text-slate-600'
                            }`}
                          />
                        </span>
                      </div>

                      {/* Subtle Delete Row Button */}
                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          aria-label={t.common.delete}
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 ${
                            hasRowContent
                              ? 'text-slate-300 dark:text-slate-600'
                              : 'text-slate-200 group-focus-within:text-slate-400 dark:text-slate-700 dark:group-focus-within:text-slate-500'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="h-7 w-7 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add item trigger */}
              {!isReadOnly && (
                <div className="pt-1 pl-1">
                  <button
                    type="button"
                    onClick={appendAndFocusRow}
                    className="inline-flex min-h-[36px] items-center gap-1.5 px-1 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.memo.addItemBtn}
                  </button>
                </div>
              )}
            </div>

            {/* Compact Summary & Icon Action Buttons Footer */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {t.common.total}
                </p>
                <p className="truncate font-mono-num text-lg font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                  {formatMoney(memoTotal, currency)}
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={openExpenseDrawerForActive}
                  title={t.memo.addAsExpense}
                  aria-label={t.memo.addAsExpense}
                  className="inline-flex min-h-[40px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50 px-3.5 py-2 text-xs font-bold text-[#D94848] shadow-xs transition-colors hover:border-rose-300 hover:bg-rose-100/80 active:scale-[0.97] whitespace-nowrap dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950"
                >
                  <TrendingDown className="h-4 w-4 shrink-0" />
                  <span>{t.memo.expenseShort}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab segmented selector */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800">
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

          {/* Swipeable Two-Pane Viewport (Saved Bazar Memos <-> Personal Notes) */}
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
              {/* Pane 1: Saved Bazar Memos List */}
              <div
                aria-hidden={activeSubTab !== 'memo'}
                className={`w-1/2 shrink-0 ${
                  !isSwipingTab && activeSubTab !== 'memo'
                    ? 'pointer-events-none max-h-0 overflow-hidden'
                    : ''
                }`}
              >
                <div id="saved-memos-section" className="scroll-mt-20">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                      {t.memo.savedMemos} ({memos.length})
                    </h2>
                    <button
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => {
                        if (didTabSwipeRef.current) return;
                        openNewMemoEditor();
                      }}
                      className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      {t.memo.newMemoBtn}
                    </button>
                  </div>

                  {memos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
                      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                        {t.memo.noSavedMemos}
                      </p>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={openNewMemoEditor}
                          className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A]"
                        >
                          <Plus className="h-4 w-4" />
                          {t.memo.newMemoBtn}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {memos.map((memo) => (
                        <div
                          key={memo.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (didTabSwipeRef.current) return;
                            openSavedMemoEditor(memo);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openSavedMemoEditor(memo);
                            }
                          }}
                          className="flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#16845B]/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500/40"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                                  {memo.note
                                    ? memo.note
                                    : `${t.memo.bazarMemoPrefix} (${memo.date})`}
                                </h4>
                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {memo.date} · {memo.items.length} {t.memo.itemsCountSuffix}
                                </p>
                              </div>
                              <div className="-mt-1 -mr-1 flex shrink-0 items-center gap-1">
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    aria-label={t.common.delete}
                                    title={t.common.delete}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteMemo(memo.id);
                                    }}
                                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label={t.memo.shareMemo}
                                  title={t.memo.shareMemo}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShareSheetForSavedMemo(memo);
                                  }}
                                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-sky-950/60 dark:hover:text-sky-400"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Tight Borderless Item Preview */}
                            <div className="mt-2.5 space-y-0.5 text-xs">
                              {memo.items.slice(0, 6).map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-baseline justify-between gap-3 text-slate-700 dark:text-slate-300"
                                >
                                  <span className="min-w-0 truncate">
                                    <span
                                      className={
                                        item.checked
                                          ? 'text-slate-400 line-through dark:text-slate-500'
                                          : ''
                                      }
                                    >
                                      {item.name}
                                    </span>
                                    {item.qty && (
                                      <span
                                        className={`ml-1.5 text-[11px] text-slate-400 dark:text-slate-500 ${
                                          item.checked ? 'line-through' : ''
                                        }`}
                                      >
                                        · {item.qty}
                                      </span>
                                    )}
                                  </span>
                                  <span className="shrink-0 font-normal tabular-nums text-[#102A43] dark:text-slate-200">
                                    {item.price > 0 ? formatMoney(item.price, currency) : '—'}
                                  </span>
                                </div>
                              ))}
                              {memo.items.length > 6 && (
                                <p className="pt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                  +{memo.items.length - 6} {t.memo.itemsCountSuffix}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {t.common.total}
                              </p>
                              <p className="truncate font-mono-num text-sm font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                                {memo.total > 0
                                  ? formatMoney(memo.total, currency)
                                  : t.memo.plannedNoPrice}
                              </p>
                            </div>

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openExpenseDrawerForSaved(memo);
                                }}
                                title={t.memo.addAsExpense}
                                aria-label={t.memo.addAsExpense}
                                className="inline-flex min-h-[38px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#D94848] shadow-xs transition-colors hover:border-rose-300 hover:bg-rose-100/80 active:scale-[0.97] whitespace-nowrap dark:border-rose-900/60 dark:bg-rose-950/60 dark:text-rose-400 dark:hover:border-rose-800 dark:hover:bg-rose-950"
                              >
                                <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                                <span>{t.memo.expenseShort}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      disabled={isReadOnly}
                      onClick={() => {
                        if (didTabSwipeRef.current) return;
                        setSelectedNote(null);
                        setCurrentTitle('');
                        setCurrentContent('');
                        initialNoteSnapshotRef.current = serializeNoteSnapshot('', '');
                        setIsAddingNote(true);
                      }}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#126B4A] disabled:opacity-50"
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
                        <div
                          key={note.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (didTabSwipeRef.current) return;
                            setSelectedNote(note);
                            setCurrentTitle(note.title);
                            setCurrentContent(note.content);
                            initialNoteSnapshotRef.current = serializeNoteSnapshot(
                              note.title,
                              note.content
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedNote(note);
                              setCurrentTitle(note.title);
                              setCurrentContent(note.content);
                              initialNoteSnapshotRef.current = serializeNoteSnapshot(
                                note.title,
                                note.content
                              );
                            }
                          }}
                          className="flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-[#16845B]/50 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="line-clamp-1 text-sm font-bold text-[#102A43] dark:text-slate-100">
                                {note.title}
                              </h4>
                              <div className="-mt-1 -mr-1 flex shrink-0 items-center gap-1">
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    aria-label={t.common.delete}
                                    title={t.common.delete}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteNote(note.id);
                                    }}
                                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label={t.memo.shareNote}
                                  title={t.memo.shareNote}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openShareSheetForNote(note.title, note.content);
                                  }}
                                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-sky-950/60 dark:hover:text-sky-400"
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              {note.content || t.memo.emptyNote}
                            </p>
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
                            <span>{note.date}</span>
                            <span>{t.memo.tapToOpen}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

      {/* Notepad Editor Modal (Auto-saves on Back / Close / Backdrop tap) */}
      {(isAddingNote || selectedNote) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => void handleCloseNoteModal()}
        >
          <div
            className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Unified Note Header + Auto-save Hint + Compact Icons */}
            <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-1">
              <span className="truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
                {selectedNote ? `${t.memo.editNote} · ${selectedNote.date}` : t.memo.newNote}
              </span>
              <div className="-mr-1 flex shrink-0 items-center gap-1.5">
                {!isReadOnly && (
                  <span className="mr-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {t.memo.autoSaveHint}
                  </span>
                )}
                {selectedNote && !isReadOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      // Bypass auto-save when deleting
                      initialNoteSnapshotRef.current = serializeNoteSnapshot(
                        currentTitle,
                        currentContent
                      );
                      onDeleteNote(selectedNote.id);
                      setSelectedNote(null);
                    }}
                    aria-label={t.common.delete}
                    title={t.common.delete}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openShareSheetForNote(currentTitle, currentContent)}
                  aria-label={t.memo.shareNote}
                  title={t.memo.shareNote}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-sky-950/60 dark:hover:text-sky-400"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCloseNoteModal()}
                  aria-label={t.common.close}
                  title={t.common.close}
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <input
              type="text"
              maxLength={200}
              readOnly={isReadOnly}
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
              readOnly={isReadOnly}
              aria-label={t.memo.noteContentPlaceholder}
              placeholder={t.memo.noteContentPlaceholder}
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              className="w-full flex-1 resize-none bg-transparent px-5 pt-3.5 pb-5 text-sm leading-relaxed text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      )}

      {/* Slide-Up Add as Expense Bottom Drawer (Portal z-55) */}
      {expenseDrawer &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={() => setExpenseDrawer(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="expense-drawer-title"
              onClick={(e) => e.stopPropagation()}
              className="animate-drawer-up flex max-h-[90vh] w-full max-w-md flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Mobile Drag Handle */}
              <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#D94848] dark:bg-rose-950/60 dark:text-rose-400">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      id="expense-drawer-title"
                      className="text-base font-extrabold text-[#102A43] dark:text-slate-100"
                    >
                      {t.memo.expenseDrawerTitle}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t.memo.expenseDrawerSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpenseDrawer(null)}
                  aria-label={t.common.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5 overflow-y-auto px-5 pb-5">
                {/* Total Summary Card */}
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 dark:bg-slate-950/70">
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      maxLength={200}
                      value={drawerTitle}
                      onChange={(e) => setDrawerTitle(e.target.value)}
                      placeholder={t.memo.memoNotePlaceholder}
                      className="w-full bg-transparent text-sm font-bold text-[#102A43] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {expenseDrawer.items.length} {t.memo.itemsCountSuffix}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t.common.total}
                    </p>
                    <p className="font-mono-num text-xl font-extrabold tabular-nums text-[#16845B] dark:text-emerald-400">
                      {formatMoney(expenseDrawer.amount, currency)}
                    </p>
                  </div>
                </div>

                {/* Date & Category Row */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t.memo.dateLabel}
                    </label>
                    <input
                      type="date"
                      value={drawerDate}
                      onChange={(e) => setDrawerDate(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-[#102A43] transition-colors hover:border-slate-300 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-slate-700 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t.memo.categoryLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveMemoPicker('category')}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIconBadge
                          style={getCategoryStyle(categoryStyles, 'exp', drawerCategory)}
                          size="sm"
                        />
                        <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {drawerCategory}
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Sub-Category & Wallet Row */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t.txForm.subCategoryLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveMemoPicker('subCategory')}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIconBadge
                          style={getExpenseOrSubCategoryStyle(
                            categoryStyles,
                            drawerCategory,
                            drawerSubCategory
                          )}
                          size="sm"
                        />
                        <span
                          className={`truncate text-xs ${
                            drawerSubCategory
                              ? 'font-bold text-[#102A43] dark:text-slate-100'
                              : 'font-semibold text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {drawerSubCategory || t.txForm.subCategoryChipPlaceholder}
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t.memo.walletLabel}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveMemoPicker('wallet')}
                      className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition-all hover:border-slate-300 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <CategoryIconBadge
                          style={getCategoryStyle(
                            categoryStyles,
                            savingsList.includes(drawerWallet) ? 'sav' : 'wal',
                            drawerWallet
                          )}
                          size="sm"
                        />
                        <span className="truncate text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {drawerWallet}
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Confirm & Log CTA */}
                <button
                  type="button"
                  disabled={isLoggingExpense}
                  onClick={() => void handleConfirmLogExpense()}
                  className="mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.99] disabled:opacity-60"
                >
                  {isLoggingExpense ? t.memo.loggingExpense : t.memo.confirmLogExpense}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Slide-Up Share Sheet (Social Apps + Native Share + Copy) (Portal z-55) */}
      {shareSheet &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[55] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
            onClick={() => setShareSheet(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="memo-share-sheet-title"
              onClick={(e) => e.stopPropagation()}
              className="animate-drawer-up w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Mobile Drag Handle */}
              <div className="mb-3 flex justify-center sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      id="memo-share-sheet-title"
                      className="text-base font-extrabold text-[#102A43] dark:text-slate-100"
                    >
                      {shareSheet.kind === 'memo'
                        ? t.memo.shareListTitle
                        : t.memo.shareNoteTitle}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {shareSheet.kind === 'memo'
                        ? t.memo.shareListSubtitle
                        : t.memo.shareNoteSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShareSheet(null)}
                  aria-label={t.common.close}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Editable Formatted Message Preview */}
              <div className="mt-4">
                <textarea
                  rows={5}
                  value={shareTextDraft}
                  onChange={(e) => setShareTextDraft(e.target.value)}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-[#102A43] outline-none transition-colors focus:border-[#16845B] focus:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-950"
                />
              </div>

              {/* Primary Actions: Copy & System Share */}
              <div className="mt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => void handleCopyShareText()}
                  className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-colors whitespace-nowrap ${
                    copiedJustNow
                      ? 'bg-emerald-600 dark:bg-emerald-600'
                      : 'bg-[#16845B] hover:bg-[#126B4A]'
                  }`}
                >
                  {copiedJustNow ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedJustNow ? t.memo.copiedListBtn : t.memo.copyListBtn}
                </button>

                {supportsNativeShare && (
                  <button
                    type="button"
                    onClick={() => void handleNativeShareText()}
                    className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 whitespace-nowrap dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    <Share2 className="h-4 w-4 text-[#16845B] dark:text-emerald-400" />
                    {t.shareApp.nativeShareBtn}
                  </button>
                )}
              </div>

              {/* Direct Social Share Row */}
              <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t.shareApp.shareViaLabel}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {/* WhatsApp */}
                  <a
                    href={whatsappHref}
                    target={isAndroid ? undefined : '_blank'}
                    rel={isAndroid ? undefined : 'noopener noreferrer'}
                    onClick={handleExternalSocialClick}
                    className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#25D366]/50 dark:hover:bg-[#25D366]/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#25D366] text-white">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 fill-current"
                      >
                        <path d="M12.04 2a9.94 9.94 0 0 0-8.48 15.16L2 22l4.98-1.52A9.95 9.95 0 1 0 12.04 2Zm5.8 14.07c-.24.68-1.42 1.31-1.97 1.39-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07s.76-2.18 1.03-2.48c.27-.3.59-.38.79-.38h.57c.18 0 .43-.07.67.51.25.6.84 2.06.91 2.21.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.4-.45.54-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.89.96-1.19.2-.3.4-.25.68-.15.28.1 1.77.84 2.07.99.3.15.51.23.58.35.08.13.08.73-.17 1.4Z" />
                      </svg>
                    </span>
                    <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                      {t.shareApp.whatsapp}
                    </span>
                  </a>

                  {/* Messenger (Copy + Open) */}
                  <a
                    href="https://www.messenger.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => void handleCopyAndOpenMessenger(e)}
                    className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#0084FF]/50 hover:bg-[#0084FF]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#0084FF]/50 dark:hover:bg-[#0084FF]/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#0099FF] via-[#A033FF] to-[#FF5280] text-white">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 fill-current"
                      >
                        <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.9 1.44 5.49 3.7 7.19V22l3.36-1.85c.93.26 1.91.4 2.94.4 5.52 0 10-4.14 10-9.3C22 6.14 17.52 2 12 2Zm1.01 12.5-2.55-2.72-4.97 2.72 5.47-5.8 2.61 2.72 4.91-2.72-5.47 5.8Z" />
                      </svg>
                    </span>
                    <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                      {t.shareApp.messenger}
                    </span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleExternalSocialClick}
                    className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-[#229ED9]/50 hover:bg-[#229ED9]/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#229ED9]/50 dark:hover:bg-[#229ED9]/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#229ED9] text-white">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 fill-current"
                      >
                        <path d="M21.2 4.6 2.9 11.7c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 10.9-6.9c.5-.3 1-.1.6.2l-8.8 8-.3 4.8c.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.5-1.6Z" />
                      </svg>
                    </span>
                    <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                      {t.shareApp.telegram}
                    </span>
                  </a>

                  {/* SMS */}
                  <a
                    href={smsHref}
                    onClick={handleExternalSocialClick}
                    className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#102A43] text-white dark:bg-slate-700">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </span>
                    <span className="w-full truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                      {t.memo.sms}
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Visual Category / Sub-Category / Wallet Picker Drawer (z-65) */}
      {activeMemoPicker &&
        (() => {
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
              ? `${t.txForm.drawerChooseSubCategory} · ${drawerCategory}`
              : t.txForm.drawerChooseAccount;

          const selectedValue =
            activeMemoPicker === 'category'
              ? drawerCategory
              : activeMemoPicker === 'subCategory'
              ? drawerSubCategory
              : drawerWallet;

          const pickerSubs = Array.from(
            new Set([
              ...(expenseSubCategories?.[drawerCategory] || []),
              ...(drawerSubCategory ? [drawerSubCategory] : []),
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
              parentCategory={drawerCategory}
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
                  setDrawerCategory(val);
                  if (!(expenseSubCategories?.[val] || []).includes(drawerSubCategory)) {
                    setDrawerSubCategory('');
                  }
                } else if (activeMemoPicker === 'subCategory') {
                  setDrawerSubCategory(val);
                } else {
                  setDrawerWallet(val);
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
