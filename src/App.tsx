import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Calculator,
  Eye,
  Home,
  MoreVertical,
  Pencil,
  Plus,
  ReceiptText,
  Settings,
  Users,
} from 'lucide-react';
import { AssistantDrawer } from './components/AssistantDrawer';
import { AuthScreen, type LastUserHint } from './components/AuthScreen';
import { CalculatorView } from './components/CalculatorView';
import { HomeDashboard } from './components/HomeDashboard';
import { MemoNotepad } from './components/MemoNotepad';
import {
  BudgetGoalsModal,
  CategoryStyleModal,
  ConfirmModal,
  CorrectBalanceModal,
  CustomizeGridsModal,
  DebtHistoryModal,
  DrilldownModal,
  EditNameModal,
  FilterPeriodModal,
  MergeCategoryModal,
  ResolveDebtModal,
  SavingGoalsModal,
  ToastContainer,
  TransferDeleteModal,
} from './components/Modals';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsView as SettingsPanel } from './components/SettingsView';
import { TransactionForm } from './components/TransactionForm';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  legacyDefaultDb,
  OperationType,
} from './firebase';
import {
  getTranslations,
  LANGUAGE_STORAGE_KEY,
  LanguageProvider,
  readStoredLanguage,
} from './i18n';
import type {
  ActiveSharedWorkspace,
  ActiveTab,
  AppLanguage,
  BazarMemo,
  BudgetGoal,
  CategoryKind,
  CategoryStyle,
  ConfirmDialogState,
  CurrencySymbol,
  DrilldownType,
  FilterCardKey,
  GridKey,
  PeriodFilter,
  SavingGoal,
  SavingGoalPeriodType,
  SettingsView,
  ShareInvite,
  ShareRole,
  ThemeMode,
  ToastMessage,
  Transaction,
  TransactionDraft,
  TransactionType,
  UserNote,
  WorkspaceSettings,
} from './types';
import {
  DEFAULT_CATEGORY_STYLES,
  getCategoryStyle,
  getCategoryStyleKey,
} from './utils/categoryVisuals';
import {
  filterTransactionsByPeriod,
  formatDisplayDate,
  generateSafeId,
  getTodayISO,
} from './utils/format';

const DEFAULT_WALLETS = ['Bank', 'Bkash', 'Nagad', 'Cash'];
const DEFAULT_SAVINGS = [
  'Emergency Fund',
  'Deposit',
  'Hobby',
  'Invest',
  'Savings',
  'Samity',
];
const LEGACY_DEFAULT_SAVINGS = ['Savings', 'Samity', 'Investment'];
const DEFAULT_EXPENSE_CATS = [
  'Family Maintenance',
  'Relative',
  'Personal',
  'Career',
  'Sadakah',
  'Others',
];
const DEFAULT_INCOME_CATS = [
  'Salary',
  'Business',
  'Freelance',
  'Investment Return',
  'Rental',
  'Gift',
  'Bonus',
  'Others',
];
const LEGACY_DEFAULT_INCOME_CATS = ['Salary', 'Business', 'Gift', 'Others'];
const DEFAULT_EXPENSE_SUBCATEGORIES: Record<string, string[]> = {
  'Family Maintenance': [
    'Groceries',
    'Utilities & Bills',
    'Rent & Housing',
    'Healthcare',
    'Education',
    'Household',
  ],
};

function isExactStringArray(a: unknown, b: string[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);
}

function normalizeSavingsList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return DEFAULT_SAVINGS;
  if (isExactStringArray(raw, LEGACY_DEFAULT_SAVINGS)) return DEFAULT_SAVINGS;
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function normalizeIncomeCats(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_INCOME_CATS;
  if (isExactStringArray(raw, LEGACY_DEFAULT_INCOME_CATS)) return DEFAULT_INCOME_CATS;
  const cleaned = raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  return cleaned.length > 0 ? cleaned : DEFAULT_INCOME_CATS;
}

function normalizeExpenseSubCategories(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_EXPENSE_SUBCATEGORIES };
  }
  const result: Record<string, string[]> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([cat, list]) => {
    if (Array.isArray(list)) {
      result[cat] = list.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    }
  });
  return result;
}

function normalizeCategoryStyles(raw: unknown): Record<string, CategoryStyle> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CATEGORY_STYLES };
  }
  const merged: Record<string, CategoryStyle> = { ...DEFAULT_CATEGORY_STYLES };
  Object.entries(raw as Record<string, unknown>).forEach(([key, val]) => {
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof (val as CategoryStyle).icon === 'string' &&
      typeof (val as CategoryStyle).color === 'string'
    ) {
      merged[key] = {
        icon: (val as CategoryStyle).icon,
        color: (val as CategoryStyle).color,
      };
    }
  });
  return merged;
}

const DEFAULT_GRID_ORDER: GridKey[] = [
  'netWorth',
  'wallets',
  'savings',
  'incExp',
  'lendBorrow',
  'budgetGoals',
  'categoryReport',
  'categoryPieChart',
  'transactions',
];
const DEFAULT_VISIBLE_GRIDS: Record<GridKey, boolean> = {
  netWorth: true,
  wallets: true,
  savings: true,
  incExp: true,
  lendBorrow: true,
  budgetGoals: false,
  categoryReport: false,
  categoryPieChart: false,
  transactions: true,
};

function normalizeGridOrder(raw?: GridKey[]): GridKey[] {
  const validSet = new Set<GridKey>(DEFAULT_GRID_ORDER);
  const cleaned = Array.isArray(raw) ? raw.filter((k): k is GridKey => validSet.has(k)) : [];
  const unique = Array.from(new Set(cleaned));
  if (unique.length === 0) return DEFAULT_GRID_ORDER;
  if (!unique.includes('budgetGoals')) {
    const catIdx = unique.indexOf('categoryReport');
    if (catIdx >= 0) {
      unique.splice(catIdx, 0, 'budgetGoals');
    } else {
      unique.push('budgetGoals');
    }
  }
  if (!unique.includes('categoryPieChart')) {
    const catIdx = unique.indexOf('categoryReport');
    if (catIdx >= 0) {
      unique.splice(catIdx + 1, 0, 'categoryPieChart');
    } else {
      unique.push('categoryPieChart');
    }
  }
  DEFAULT_GRID_ORDER.forEach((k) => {
    if (!unique.includes(k)) unique.push(k);
  });
  return unique;
}

function normalizeVisibleGrids(
  raw?: Partial<Record<GridKey, boolean>>
): Record<GridKey, boolean> {
  return {
    ...DEFAULT_VISIBLE_GRIDS,
    ...(raw || {}),
    budgetGoals: raw?.budgetGoals ?? false,
    categoryReport: raw?.categoryReport ?? false,
    categoryPieChart: raw?.categoryPieChart ?? false,
  };
}

const GUEST_STORAGE_KEYS = {
  mode: 'orthogro_guest_mode',
  workspace: 'orthogro_guest_workspace_v2',
  transactions: 'orthogro_guest_transactions_v2',
  memos: 'orthogro_guest_memos_v2',
  notes: 'orthogro_guest_notes_v2',
  budgets: 'orthogro_guest_budgets_v2',
  savingGoals: 'orthogro_guest_saving_goals_v1',
};

const RETURNING_USER_STORAGE_KEY = 'orthogro_returning_user_v1';
const LAST_USER_HINT_STORAGE_KEY = 'orthogro_last_user_hint_v1';

function readGuestJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Unexpected application error' };
  }

  render() {
    if (this.state.hasError) {
      const errT = getTranslations(readStoredLanguage());
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F6F8F7] p-6 dark:bg-slate-950">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-900 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">
              {errT.app.somethingWrong}
            </h2>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-[#16845B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#126B4A]"
            >
              {errT.app.reloadApp}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function OrthoGroApp() {
  // Auth & Guest state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGuest, setIsGuest] = useState<boolean>(
    () => localStorage.getItem(GUEST_STORAGE_KEYS.mode) === 'true'
  );
  const [isReturningUser, setIsReturningUser] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RETURNING_USER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [lastUserHint, setLastUserHint] = useState<LastUserHint | null>(() =>
    readGuestJSON<LastUserHint | null>(LAST_USER_HINT_STORAGE_KEY, null)
  );

  // Live Partner Sharing state
  const [activeSharedWorkspace, setActiveSharedWorkspace] = useState<ActiveSharedWorkspace | null>(
    null
  );
  const [outgoingInvites, setOutgoingInvites] = useState<ShareInvite[]>([]);
  const [incomingEmailInvites, setIncomingEmailInvites] = useState<ShareInvite[]>([]);
  const [acceptedShareDocs, setAcceptedShareDocs] = useState<ShareInvite[]>([]);

  const activeOwnerId = activeSharedWorkspace
    ? activeSharedWorkspace.ownerUid
    : currentUser?.uid || null;
  const isReadOnlyPartner = Boolean(
    activeSharedWorkspace && activeSharedWorkspace.role === 'viewer'
  );

  const pendingIncomingInvites = useMemo(
    () => incomingEmailInvites.filter((inv) => inv.status === 'pending'),
    [incomingEmailInvites]
  );

  const acceptedSharedWorkspaces = useMemo(
    () => acceptedShareDocs.filter((inv) => inv.status === 'accepted'),
    [acceptedShareDocs]
  );

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [settingsView, setSettingsView] = useState<SettingsView>('menu');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Workspace preferences & lists
  const [workspace, setWorkspace] = useState<WorkspaceSettings>(() => {
    const stored = readGuestJSON<WorkspaceSettings>(GUEST_STORAGE_KEYS.workspace, {
      wallets: DEFAULT_WALLETS,
      savingsList: DEFAULT_SAVINGS,
      expenseCategories: DEFAULT_EXPENSE_CATS,
      incomeCategories: DEFAULT_INCOME_CATS,
      expenseSubCategories: DEFAULT_EXPENSE_SUBCATEGORIES,
      categoryStyles: DEFAULT_CATEGORY_STYLES,
      currency: '৳',
      themeMode: 'system',
      language: readStoredLanguage(),
      gridOrder: DEFAULT_GRID_ORDER,
      visibleGrids: DEFAULT_VISIBLE_GRIDS,
    });
    let nextVisible = normalizeVisibleGrids(stored.visibleGrids);
    try {
      const guestMigKey = 'orthogro_default_hidden_grids_v1_guest';
      if (!localStorage.getItem(guestMigKey)) {
        localStorage.setItem(guestMigKey, '1');
        nextVisible = {
          ...nextVisible,
          budgetGoals: false,
          categoryReport: false,
          categoryPieChart: false,
        };
      }
    } catch {
      // ignore storage errors
    }
    return {
      ...stored,
      savingsList: normalizeSavingsList(stored.savingsList),
      incomeCategories: normalizeIncomeCats(stored.incomeCategories),
      expenseSubCategories: normalizeExpenseSubCategories(stored.expenseSubCategories),
      categoryStyles: normalizeCategoryStyles(stored.categoryStyles),
      language: stored.language === 'bn' || stored.language === 'en' ? stored.language : readStoredLanguage(),
      gridOrder: normalizeGridOrder(stored.gridOrder),
      visibleGrids: nextVisible,
    };
  });

  const currentLanguage: AppLanguage = workspace.language === 'bn' ? 'bn' : 'en';
  const t = useMemo(() => getTranslations(currentLanguage), [currentLanguage]);

  // Collections
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    readGuestJSON<Transaction[]>(GUEST_STORAGE_KEYS.transactions, [])
  );
  const [memos, setMemos] = useState<BazarMemo[]>(() =>
    readGuestJSON<BazarMemo[]>(GUEST_STORAGE_KEYS.memos, [])
  );
  const [notes, setNotes] = useState<UserNote[]>(() =>
    readGuestJSON<UserNote[]>(GUEST_STORAGE_KEYS.notes, [])
  );
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>(() =>
    readGuestJSON<BudgetGoal[]>(GUEST_STORAGE_KEYS.budgets, [])
  );
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() =>
    readGuestJSON<SavingGoal[]>(GUEST_STORAGE_KEYS.savingGoals, [])
  );

  // Filters & Modals
  const [filters, setFilters] = useState<Record<FilterCardKey, PeriodFilter>>({
    netWorth: 'all',
    lendBorrow: 'all',
    incExp: 'monthly',
  });
  const [activeFilterCard, setActiveFilterCard] = useState<FilterCardKey | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  const [drilldownType, setDrilldownType] = useState<DrilldownType | null>(null);
  const [drilldownKey, setDrilldownKey] = useState<string | null>(null);
  const [drilldownFilter, setDrilldownFilter] = useState<PeriodFilter>('all');

  const [historyModalItem, setHistoryModalItem] = useState<Transaction | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [closeNoteModalSeq, setCloseNoteModalSeq] = useState(0);
  const [showAssistantButton, setShowAssistantButton] = useState<boolean>(() => {
    try {
      return localStorage.getItem('orthogro_show_assistant_v1') !== 'false';
    } catch {
      return true;
    }
  });
  const [memoNavigationRequest, setMemoNavigationRequest] = useState<{
    tab: 'memo' | 'notepad';
    scrollToSaved?: boolean;
    seq: number;
  } | null>(null);
  const [showBudgetGoalsModal, setShowBudgetGoalsModal] = useState(false);
  const [editingBudgetGoal, setEditingBudgetGoal] = useState<BudgetGoal | null>(null);
  const [showSavingGoalsModal, setShowSavingGoalsModal] = useState(false);
  const [editingSavingGoal, setEditingSavingGoal] = useState<SavingGoal | null>(null);

  const [resolvingTx, setResolvingTx] = useState<Transaction | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [partialDate, setPartialDate] = useState('');
  const [resolveWallet, setResolveWallet] = useState('');

  const [editingItem, setEditingItem] = useState<{
    listType: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat' | 'sub_cat';
    oldName: string;
    parentCategory?: string;
  } | null>(null);
  const [editInputVal, setEditInputVal] = useState('');
  const [editingStyleTarget, setEditingStyleTarget] = useState<{
    kind: CategoryKind;
    name: string;
  } | null>(null);

  const [walletToCorrect, setWalletToCorrect] = useState<string | null>(null);
  const [correctBalanceInput, setCorrectBalanceInput] = useState('');

  const [accountToDelete, setAccountToDelete] = useState<{
    name: string;
    isSavings: boolean;
  } | null>(null);
  const [transferTargetAccount, setTransferTargetAccount] = useState('');

  const [mergeCategoryTarget, setMergeCategoryTarget] = useState<{
    listType: 'exp_cat' | 'inc_cat';
    categoryName: string;
    txCount: number;
  } | null>(null);
  const [mergeIntoCategory, setMergeIntoCategory] = useState('');

  const notify = useCallback((type: ToastMessage['type'], message: string) => {
    const id = generateSafeId('toast');
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  // Theme application
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        workspace.themeMode === 'dark' ||
        (workspace.themeMode === 'system' && prefersDark);
      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [workspace.themeMode]);

  // Language persistence & document lang attribute sync
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    } catch {
      // ignore storage errors
    }
  }, [currentLanguage]);

  // Persist Guest Data locally when in Guest Mode
  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.workspace, JSON.stringify(workspace));
    }
  }, [workspace, currentUser, isGuest]);

  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.transactions, JSON.stringify(transactions));
    }
  }, [transactions, currentUser, isGuest]);

  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.memos, JSON.stringify(memos));
    }
  }, [memos, currentUser, isGuest]);

  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.notes, JSON.stringify(notes));
    }
  }, [notes, currentUser, isGuest]);

  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.budgets, JSON.stringify(budgetGoals));
    }
  }, [budgetGoals, currentUser, isGuest]);

  useEffect(() => {
    if (!currentUser && isGuest) {
      localStorage.setItem(GUEST_STORAGE_KEYS.savingGoals, JSON.stringify(savingGoals));
    }
  }, [savingGoals, currentUser, isGuest]);

  // Auth listener & initial cloud workspace bootstrap
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          setIsGuest(false);
          localStorage.removeItem(GUEST_STORAGE_KEYS.mode);
          const hint: LastUserHint = {
            name: user.displayName || '',
            email: user.email || '',
          };
          setIsReturningUser(true);
          setLastUserHint(hint);
          try {
            localStorage.setItem(RETURNING_USER_STORAGE_KEY, 'true');
            localStorage.setItem(LAST_USER_HINT_STORAGE_KEY, JSON.stringify(hint));
          } catch {
            // ignore storage errors
          }

          const userDocRef = doc(db, 'users', user.uid);
          let snap;
          try {
            snap = await getDoc(userDocRef);
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          }

          if (snap && !snap.exists()) {
            let legacyData: Record<string, unknown> | null = null;
            try {
              const legacySnap = await getDoc(doc(legacyDefaultDb, 'users', user.uid));
              if (legacySnap.exists()) {
                legacyData = legacySnap.data() as Record<string, unknown>;
              }
            } catch {
              // Ignore if the legacy (default) database has no data or restricts read
            }

            const sanitizeLegacyList = (raw: unknown, fallback: string[], allowEmpty = false): string[] => {
              if (!Array.isArray(raw)) return fallback;
              const cleaned = raw
                .filter((x): x is string => typeof x === 'string')
                .map((x) => x.trim().slice(0, 100))
                .filter(Boolean)
                .slice(0, 50);
              if (cleaned.length === 0 && !allowEmpty) return fallback;
              return cleaned;
            };

            const guestWorkspace = readGuestJSON<WorkspaceSettings | null>(
              GUEST_STORAGE_KEYS.workspace,
              null
            );
            const initialWs: WorkspaceSettings = legacyData
              ? {
                  wallets: sanitizeLegacyList(legacyData.wallets, DEFAULT_WALLETS),
                  savingsList: sanitizeLegacyList(legacyData.savingsList, DEFAULT_SAVINGS, true),
                  expenseCategories: sanitizeLegacyList(
                    legacyData.expenseCategories,
                    DEFAULT_EXPENSE_CATS
                  ),
                  incomeCategories: sanitizeLegacyList(
                    legacyData.incomeCategories,
                    DEFAULT_INCOME_CATS
                  ),
                  expenseSubCategories: DEFAULT_EXPENSE_SUBCATEGORIES,
                  categoryStyles: DEFAULT_CATEGORY_STYLES,
                  currency: '৳',
                  themeMode: 'system',
                  language: readStoredLanguage(),
                  gridOrder: DEFAULT_GRID_ORDER,
                  visibleGrids: DEFAULT_VISIBLE_GRIDS,
                }
              : guestWorkspace || {
                  wallets: DEFAULT_WALLETS,
                  savingsList: DEFAULT_SAVINGS,
                  expenseCategories: DEFAULT_EXPENSE_CATS,
                  incomeCategories: DEFAULT_INCOME_CATS,
                  expenseSubCategories: DEFAULT_EXPENSE_SUBCATEGORIES,
                  categoryStyles: DEFAULT_CATEGORY_STYLES,
                  currency: '৳',
                  themeMode: 'system',
                  language: readStoredLanguage(),
                  gridOrder: DEFAULT_GRID_ORDER,
                  visibleGrids: DEFAULT_VISIBLE_GRIDS,
                };
            const initialLang: AppLanguage =
              initialWs.language === 'bn' || initialWs.language === 'en'
                ? initialWs.language
                : readStoredLanguage();

            try {
              await setDoc(userDocRef, {
                ownerId: user.uid,
                wallets: initialWs.wallets.slice(0, 50),
                savingsList: normalizeSavingsList(initialWs.savingsList).slice(0, 50),
                expenseCategories: initialWs.expenseCategories.slice(0, 50),
                incomeCategories: normalizeIncomeCats(initialWs.incomeCategories).slice(0, 50),
                expenseSubCategories: normalizeExpenseSubCategories(initialWs.expenseSubCategories),
                categoryStyles: normalizeCategoryStyles(initialWs.categoryStyles),
                currency: initialWs.currency,
                themeMode: initialWs.themeMode,
                language: initialLang,
                gridOrder: normalizeGridOrder(initialWs.gridOrder),
                visibleGrids: normalizeVisibleGrids(initialWs.visibleGrids),
                updatedAt: serverTimestamp(),
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
            }

            // Migrate legacy v2.0.0 cloud transactions (stored as an array on users/{uid} in default DB)
            const legacyRawTxs =
              legacyData && Array.isArray(legacyData.transactions)
                ? (legacyData.transactions as Array<Record<string, unknown>>)
                : [];
            if (legacyRawTxs.length > 0) {
              const allowedTypes = new Set<TransactionType>([
                'expense',
                'income',
                'transfer',
                'lend',
                'borrow',
                'partial_payment',
                'correction',
                'adjustment',
              ]);
              const legacyIdMap = new Map<string, string>();
              legacyRawTxs.forEach((rawTx, idx) => {
                const rawKey = rawTx?.id !== undefined && rawTx?.id !== null ? String(rawTx.id) : '';
                const safeSuffix = rawKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 90);
                const mappedId = safeSuffix ? `legacy_${safeSuffix}` : generateSafeId(`legacy_${idx}`);
                if (rawKey) {
                  legacyIdMap.set(rawKey, mappedId);
                }
              });

              const CHUNK_SIZE = 400;
              for (let start = 0; start < legacyRawTxs.length; start += CHUNK_SIZE) {
                const chunk = legacyRawTxs.slice(start, start + CHUNK_SIZE);
                const legacyBatch = writeBatch(db);
                chunk.forEach((rawTx, offset) => {
                  const rawKey =
                    rawTx?.id !== undefined && rawTx?.id !== null ? String(rawTx.id) : '';
                  const id =
                    (rawKey && legacyIdMap.get(rawKey)) ||
                    generateSafeId(`legacy_${start + offset}`);
                  const rawType = String(rawTx?.type || 'expense') as TransactionType;
                  const type: TransactionType = allowedTypes.has(rawType) ? rawType : 'expense';
                  const rawDateStr =
                    typeof rawTx?.rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawTx.rawDate)
                      ? rawTx.rawDate
                      : getTodayISO();
                  const displayDateStr =
                    typeof rawTx?.date === 'string' && rawTx.date.trim()
                      ? rawTx.date.trim().slice(0, 40)
                      : formatDisplayDate(rawDateStr, initialLang);
                  const numericAmt = Number(rawTx?.amount);

                  const payload: Record<string, unknown> = {
                    ownerId: user.uid,
                    title: String(rawTx?.title || 'Transaction').trim().slice(0, 200) || 'Transaction',
                    amount: Number.isFinite(numericAmt) ? numericAmt : 0,
                    type,
                    rawDate: rawDateStr,
                    date: displayDateStr,
                    resolved: Boolean(rawTx?.resolved),
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  };

                  if (typeof rawTx?.category === 'string' && rawTx.category.trim()) {
                    payload.category = rawTx.category.trim().slice(0, 100);
                  }
                  if (typeof rawTx?.subCategory === 'string' && rawTx.subCategory.trim()) {
                    payload.subCategory = rawTx.subCategory.trim().slice(0, 100);
                  }
                  if (typeof rawTx?.wallet === 'string' && rawTx.wallet.trim()) {
                    payload.wallet = rawTx.wallet.trim().slice(0, 100);
                  }
                  if (typeof rawTx?.fromWallet === 'string' && rawTx.fromWallet.trim()) {
                    payload.fromWallet = rawTx.fromWallet.trim().slice(0, 100);
                  }
                  if (typeof rawTx?.toWallet === 'string' && rawTx.toWallet.trim()) {
                    payload.toWallet = rawTx.toWallet.trim().slice(0, 100);
                  }
                  const chargeVal = Number(rawTx?.charge);
                  if (rawTx?.charge !== undefined && Number.isFinite(chargeVal) && chargeVal >= 0) {
                    payload.charge = chargeVal;
                  }
                  const remVal = Number(rawTx?.remainingBalance);
                  if (
                    rawTx?.remainingBalance !== undefined &&
                    Number.isFinite(remVal) &&
                    remVal >= 0
                  ) {
                    payload.remainingBalance = remVal;
                  }
                  if (rawTx?.parentId !== undefined && rawTx?.parentId !== null) {
                    const parentKey = String(rawTx.parentId);
                    const mappedParent =
                      legacyIdMap.get(parentKey) ||
                      parentKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
                    if (/^[a-zA-Z0-9_-]{1,128}$/.test(mappedParent)) {
                      payload.parentId = mappedParent;
                    }
                  }
                  if (typeof rawTx?.parentTitle === 'string' && rawTx.parentTitle.trim()) {
                    payload.parentTitle = rawTx.parentTitle.trim().slice(0, 200);
                  }
                  if (typeof rawTx?.isLendPay === 'boolean') {
                    payload.isLendPay = rawTx.isLendPay;
                  }
                  if (typeof rawTx?.note === 'string' && rawTx.note.trim()) {
                    payload.note = rawTx.note.trim().slice(0, 2000);
                  }

                  legacyBatch.set(doc(db, 'users', user.uid, 'transactions', id), payload);
                });

                try {
                  await legacyBatch.commit();
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                }
              }
            }

            // Migrate any guest records created before signing in
            const guestTxs = readGuestJSON<Transaction[]>(GUEST_STORAGE_KEYS.transactions, []);
            const guestMemos = readGuestJSON<BazarMemo[]>(GUEST_STORAGE_KEYS.memos, []);
            const guestNotes = readGuestJSON<UserNote[]>(GUEST_STORAGE_KEYS.notes, []);
            const guestBudgets = readGuestJSON<BudgetGoal[]>(GUEST_STORAGE_KEYS.budgets, []);
            const guestSavingGoals = readGuestJSON<SavingGoal[]>(
              GUEST_STORAGE_KEYS.savingGoals,
              []
            );

            if (
              guestTxs.length > 0 ||
              guestMemos.length > 0 ||
              guestNotes.length > 0 ||
              guestBudgets.length > 0 ||
              guestSavingGoals.length > 0
            ) {
              const batch = writeBatch(db);
              let count = 0;

              guestTxs.slice(0, 200).forEach((t) => {
                const id = generateSafeId('tx');
                const payload: Record<string, unknown> = {
                  ownerId: user.uid,
                  title: String(t.title || 'Transaction').slice(0, 200),
                  amount: Number(t.amount) || 0,
                  type: t.type,
                  rawDate: t.rawDate || getTodayISO(),
                  date: t.date || formatDisplayDate(getTodayISO(), initialLang),
                  resolved: Boolean(t.resolved),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                };
                if (t.category) payload.category = String(t.category).slice(0, 100);
                if (t.subCategory) payload.subCategory = String(t.subCategory).slice(0, 100);
                if (t.wallet) payload.wallet = String(t.wallet).slice(0, 100);
                if (t.fromWallet) payload.fromWallet = String(t.fromWallet).slice(0, 100);
                if (t.toWallet) payload.toWallet = String(t.toWallet).slice(0, 100);
                if (typeof t.charge === 'number' && t.charge >= 0) payload.charge = t.charge;
                if (typeof t.remainingBalance === 'number' && t.remainingBalance >= 0) {
                  payload.remainingBalance = t.remainingBalance;
                }
                if (t.note) payload.note = String(t.note).slice(0, 2000);
                batch.set(doc(db, 'users', user.uid, 'transactions', id), payload);
                count++;
              });

              guestMemos.slice(0, 100).forEach((m) => {
                if (!m.items || m.items.length === 0) return;
                const id = generateSafeId('memo');
                batch.set(doc(db, 'users', user.uid, 'memos', id), {
                  ownerId: user.uid,
                  date: m.date || getTodayISO(),
                  category: m.category || 'Others',
                  wallet: m.wallet || 'Cash',
                  note: (m.note || '').slice(0, 500),
                  items: m.items.slice(0, 200),
                  total: Number(m.total) || 0,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                count++;
              });

              guestNotes.slice(0, 100).forEach((n) => {
                const id = generateSafeId('note');
                batch.set(doc(db, 'users', user.uid, 'notes', id), {
                  ownerId: user.uid,
                  title: (n.title || 'Untitled').slice(0, 200),
                  content: (n.content || '').slice(0, 20000),
                  date: n.date || getTodayISO(),
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                count++;
              });

              guestBudgets.slice(0, 50).forEach((b) => {
                const limit = Number(b.monthlyLimit);
                const category = String(b.category || '').trim().slice(0, 100);
                if (!category || !Number.isFinite(limit) || limit <= 0) return;
                const id = generateSafeId('budget');
                batch.set(doc(db, 'users', user.uid, 'budgets', id), {
                  ownerId: user.uid,
                  category,
                  monthlyLimit: limit,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                count++;
              });

              guestSavingGoals.slice(0, 50).forEach((sg) => {
                const targetAmount = Number(sg.targetAmount);
                const title = String(sg.title || '').trim().slice(0, 100);
                const periodType: SavingGoalPeriodType =
                  sg.periodType === 'period' ? 'period' : 'monthly';
                if (!title || !Number.isFinite(targetAmount) || targetAmount <= 0) return;
                const id = generateSafeId('savgoal');
                const payload: Record<string, unknown> = {
                  ownerId: user.uid,
                  title,
                  periodType,
                  targetAmount,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                };
                if (sg.account && typeof sg.account === 'string') {
                  payload.account = sg.account.slice(0, 100);
                }
                if (periodType === 'period' && sg.startDate && /^\d{4}-\d{2}-\d{2}$/.test(sg.startDate)) {
                  payload.startDate = sg.startDate;
                }
                if (periodType === 'period' && sg.endDate && /^\d{4}-\d{2}-\d{2}$/.test(sg.endDate)) {
                  payload.endDate = sg.endDate;
                }
                batch.set(doc(db, 'users', user.uid, 'savingGoals', id), payload);
                count++;
              });

              if (count > 0) {
                try {
                  await batch.commit();
                  localStorage.removeItem(GUEST_STORAGE_KEYS.transactions);
                  localStorage.removeItem(GUEST_STORAGE_KEYS.memos);
                  localStorage.removeItem(GUEST_STORAGE_KEYS.notes);
                  localStorage.removeItem(GUEST_STORAGE_KEYS.budgets);
                  localStorage.removeItem(GUEST_STORAGE_KEYS.savingGoals);
                  localStorage.removeItem(GUEST_STORAGE_KEYS.workspace);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
                }
              }
            }
          }
        } else {
          setCurrentUser(null);
          const guestActive = localStorage.getItem(GUEST_STORAGE_KEYS.mode) === 'true';
          setIsGuest(guestActive);
        }
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync active shared workspace if owner changes role or revokes access
  useEffect(() => {
    if (!activeSharedWorkspace) return;
    const match = acceptedSharedWorkspaces.find(
      (inv) => inv.ownerUid === activeSharedWorkspace.ownerUid
    );
    if (!match) {
      setActiveSharedWorkspace(null);
      return;
    }
    if (match.role !== activeSharedWorkspace.role) {
      setActiveSharedWorkspace((prev) => (prev ? { ...prev, role: match.role } : null));
    }
  }, [acceptedSharedWorkspaces, activeSharedWorkspace]);

  useEffect(() => {
    if (isReadOnlyPartner && activeTab === 'transactions') {
      setActiveTab('home');
    }
  }, [isReadOnlyPartner, activeTab]);

  // Share invites real-time listeners (authenticated only)
  useEffect(() => {
    if (authLoading || !currentUser) {
      setOutgoingInvites([]);
      setIncomingEmailInvites([]);
      setAcceptedShareDocs([]);
      return;
    }

    const uid = currentUser.uid;
    const emailLower = (currentUser.email || '').trim().toLowerCase();

    const outgoingQuery = query(
      collection(db, 'shareInvites'),
      where('ownerUid', '==', uid)
    );
    const unsubOutgoing = onSnapshot(
      outgoingQuery,
      (snap) => {
        const list: ShareInvite[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShareInvite, 'id'>),
        }));
        setOutgoingInvites(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'shareInvites')
    );

    const acceptedQuery = query(
      collection(db, 'shareInvites'),
      where('partnerUid', '==', uid)
    );
    const unsubAccepted = onSnapshot(
      acceptedQuery,
      (snap) => {
        const list: ShareInvite[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShareInvite, 'id'>),
        }));
        setAcceptedShareDocs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'shareInvites')
    );

    let unsubIncoming = () => {};
    if (emailLower) {
      const incomingQuery = query(
        collection(db, 'shareInvites'),
        where('targetEmail', '==', emailLower)
      );
      unsubIncoming = onSnapshot(
        incomingQuery,
        (snap) => {
          const list: ShareInvite[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ShareInvite, 'id'>),
          }));
          setIncomingEmailInvites(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'shareInvites')
      );
    } else {
      setIncomingEmailInvites([]);
    }

    return () => {
      unsubOutgoing();
      unsubAccepted();
      unsubIncoming();
    };
  }, [authLoading, currentUser]);

  // Firestore real-time listeners for active workspace (own or shared partner)
  useEffect(() => {
    if (authLoading || !currentUser || !activeOwnerId) return;
    const uid = activeOwnerId;

    const unsubWorkspace = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let nextVisible = normalizeVisibleGrids(
            data.visibleGrids as Partial<Record<GridKey, boolean>> | undefined
          );
          const migKey = `orthogro_default_hidden_grids_v1_${uid}`;
          let needsMigration = false;
          try {
            if (!localStorage.getItem(migKey)) {
              localStorage.setItem(migKey, '1');
              if (
                nextVisible.budgetGoals ||
                nextVisible.categoryReport ||
                nextVisible.categoryPieChart
              ) {
                nextVisible = {
                  ...nextVisible,
                  budgetGoals: false,
                  categoryReport: false,
                  categoryPieChart: false,
                };
                needsMigration = true;
              }
            }
          } catch {
            // ignore storage errors
          }
          setWorkspace({
            wallets: Array.isArray(data.wallets) && data.wallets.length > 0 ? data.wallets : DEFAULT_WALLETS,
            savingsList: normalizeSavingsList(data.savingsList),
            expenseCategories:
              Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0
                ? data.expenseCategories
                : DEFAULT_EXPENSE_CATS,
            incomeCategories: normalizeIncomeCats(data.incomeCategories),
            expenseSubCategories: normalizeExpenseSubCategories(data.expenseSubCategories),
            categoryStyles: normalizeCategoryStyles(data.categoryStyles),
            currency: (data.currency as CurrencySymbol) || '৳',
            themeMode: (data.themeMode as ThemeMode) || 'system',
            language:
              data.language === 'bn' || data.language === 'en'
                ? (data.language as AppLanguage)
                : readStoredLanguage(),
            gridOrder: normalizeGridOrder(data.gridOrder as GridKey[] | undefined),
            visibleGrids: nextVisible,
          });
          if (needsMigration && !isReadOnlyPartner) {
            void updateDoc(doc(db, 'users', uid), {
              visibleGrids: nextVisible,
              updatedAt: serverTimestamp(),
            }).catch(() => {});
          }
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
    );

    const txQuery = query(
      collection(db, 'users', uid, 'transactions'),
      where('ownerId', '==', uid)
    );
    const unsubTxs = onSnapshot(
      txQuery,
      (snap) => {
        const list: Transaction[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Transaction, 'id'>),
        }));
        list.sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''));
        setTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`)
    );

    const memosQuery = query(
      collection(db, 'users', uid, 'memos'),
      where('ownerId', '==', uid)
    );
    const unsubMemos = onSnapshot(
      memosQuery,
      (snap) => {
        const list: BazarMemo[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BazarMemo, 'id'>),
        }));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setMemos(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/memos`)
    );

    const notesQuery = query(
      collection(db, 'users', uid, 'notes'),
      where('ownerId', '==', uid)
    );
    const unsubNotes = onSnapshot(
      notesQuery,
      (snap) => {
        const list: UserNote[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UserNote, 'id'>),
        }));
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setNotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/notes`)
    );

    const budgetsQuery = query(
      collection(db, 'users', uid, 'budgets'),
      where('ownerId', '==', uid)
    );
    const unsubBudgets = onSnapshot(
      budgetsQuery,
      (snap) => {
        const list: BudgetGoal[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<BudgetGoal, 'id'>),
        }));
        list.sort((a, b) => a.category.localeCompare(b.category));
        setBudgetGoals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/budgets`)
    );

    const savingGoalsQuery = query(
      collection(db, 'users', uid, 'savingGoals'),
      where('ownerId', '==', uid)
    );
    const unsubSavingGoals = onSnapshot(
      savingGoalsQuery,
      (snap) => {
        const list: SavingGoal[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SavingGoal, 'id'>),
        }));
        list.sort((a, b) => a.title.localeCompare(b.title));
        setSavingGoals(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingGoals`)
    );

    return () => {
      unsubWorkspace();
      unsubTxs();
      unsubMemos();
      unsubNotes();
      unsubBudgets();
      unsubSavingGoals();
    };
  }, [authLoading, currentUser, activeOwnerId]);

  // Derived account options and balances
  const allAccountOptions = useMemo(
    () => [...workspace.wallets, ...workspace.savingsList],
    [workspace.wallets, workspace.savingsList]
  );

  const defaultEntry = useMemo<TransactionDraft>(
    () => ({
      id: null,
      title: '',
      amount: '',
      type: 'expense',
      category: workspace.expenseCategories[0] || 'Personal',
      subCategory: '',
      wallet: allAccountOptions[0] || 'Cash',
      fromWallet: workspace.wallets[0] || 'Bank',
      toWallet: workspace.wallets[1] || workspace.wallets[0] || 'Cash',
      useCharge: false,
      charge: '',
      date: getTodayISO(),
      note: '',
    }),
    [workspace.expenseCategories, workspace.wallets, allAccountOptions]
  );

  const [entries, setEntries] = useState<TransactionDraft[]>([defaultEntry]);

  // Hardware/Browser Back button navigation: step back overlays -> Settings -> Home, then exit from Home
  const isWorkspaceActive = Boolean(currentUser || isGuest) && !authLoading;
  const hasOpenOverlay = Boolean(
    confirmDialog ||
      editingStyleTarget ||
      showSavingGoalsModal ||
      showBudgetGoalsModal ||
      mergeCategoryTarget ||
      editingItem ||
      accountToDelete ||
      walletToCorrect ||
      resolvingTx ||
      historyModalItem ||
      drilldownType ||
      activeFilterCard ||
      showCustomizeModal ||
      isAssistantOpen ||
      isNoteModalOpen
  );
  const isNonRootView =
    isWorkspaceActive && (activeTab !== 'home' || settingsView !== 'menu' || hasOpenOverlay);

  const ignoreNextPopCountRef = useRef(0);
  const navStateRef = useRef({
    isNonRootView,
    activeTab,
    settingsView,
    confirmDialog,
    editingStyleTarget,
    showSavingGoalsModal,
    showBudgetGoalsModal,
    mergeCategoryTarget,
    editingItem,
    accountToDelete,
    walletToCorrect,
    resolvingTx,
    historyModalItem,
    drilldownType,
    activeFilterCard,
    showCustomizeModal,
    isAssistantOpen,
    isNoteModalOpen,
    defaultEntry,
  });
  navStateRef.current = {
    isNonRootView,
    activeTab,
    settingsView,
    confirmDialog,
    editingStyleTarget,
    showSavingGoalsModal,
    showBudgetGoalsModal,
    mergeCategoryTarget,
    editingItem,
    accountToDelete,
    walletToCorrect,
    resolvingTx,
    historyModalItem,
    drilldownType,
    activeFilterCard,
    showCustomizeModal,
    isAssistantOpen,
    isNoteModalOpen,
    defaultEntry,
  };

  useEffect(() => {
    const hasGuard = Boolean(
      (window.history.state as { __orthogroGuard?: boolean } | null)?.__orthogroGuard
    );
    if (isNonRootView) {
      if (!hasGuard && ignoreNextPopCountRef.current === 0) {
        window.history.pushState({ __orthogroGuard: true }, '');
      }
    } else if (hasGuard) {
      ignoreNextPopCountRef.current += 1;
      window.history.back();
    }
  }, [
    isNonRootView,
    activeTab,
    settingsView,
    confirmDialog,
    editingStyleTarget,
    showSavingGoalsModal,
    showBudgetGoalsModal,
    mergeCategoryTarget,
    editingItem,
    accountToDelete,
    walletToCorrect,
    resolvingTx,
    historyModalItem,
    drilldownType,
    activeFilterCard,
    showCustomizeModal,
    isAssistantOpen,
    isNoteModalOpen,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      if (ignoreNextPopCountRef.current > 0) {
        ignoreNextPopCountRef.current -= 1;
        const curr = navStateRef.current;
        const hasGuard = Boolean(
          (window.history.state as { __orthogroGuard?: boolean } | null)?.__orthogroGuard
        );
        if (curr.isNonRootView && !hasGuard && ignoreNextPopCountRef.current === 0) {
          window.history.pushState({ __orthogroGuard: true }, '');
        }
        return;
      }

      const state = navStateRef.current;
      if (!state.isNonRootView) return;

      if (state.confirmDialog) {
        setConfirmDialog(null);
        return;
      }
      if (state.editingStyleTarget) {
        setEditingStyleTarget(null);
        return;
      }
      if (state.showSavingGoalsModal) {
        setShowSavingGoalsModal(false);
        setEditingSavingGoal(null);
        return;
      }
      if (state.showBudgetGoalsModal) {
        setShowBudgetGoalsModal(false);
        setEditingBudgetGoal(null);
        return;
      }
      if (state.mergeCategoryTarget) {
        setMergeCategoryTarget(null);
        setMergeIntoCategory('');
        return;
      }
      if (state.editingItem) {
        setEditingItem(null);
        return;
      }
      if (state.accountToDelete) {
        setAccountToDelete(null);
        return;
      }
      if (state.walletToCorrect) {
        setWalletToCorrect(null);
        return;
      }
      if (state.resolvingTx) {
        setResolvingTx(null);
        return;
      }
      if (state.historyModalItem) {
        setHistoryModalItem(null);
        return;
      }
      if (state.drilldownType) {
        setDrilldownType(null);
        return;
      }
      if (state.activeFilterCard) {
        setActiveFilterCard(null);
        return;
      }
      if (state.showCustomizeModal) {
        setShowCustomizeModal(false);
        return;
      }
      if (state.isAssistantOpen) {
        setIsAssistantOpen(false);
        return;
      }
      if (state.isNoteModalOpen) {
        setCloseNoteModalSeq((prev) => prev + 1);
        return;
      }

      if (state.activeTab === 'settings' && state.settingsView !== 'menu') {
        if (
          state.settingsView === 'wallets' ||
          state.settingsView === 'savings' ||
          state.settingsView === 'exp_cat' ||
          state.settingsView === 'inc_cat'
        ) {
          setSettingsView('accounts_categories');
        } else {
          setSettingsView('menu');
        }
        return;
      }

      if (state.activeTab !== 'home') {
        if (state.activeTab === 'transactions') {
          setEntries([state.defaultEntry]);
        }
        setSettingsView('menu');
        setActiveTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const {
    walletBalances,
    txCountByWallet,
    txCountByExpCategory,
    txCountByIncCategory,
  } = useMemo(() => {
    const balances: Record<string, number> = {};
    workspace.wallets.forEach((w) => (balances[w] = 0));
    workspace.savingsList.forEach((s) => (balances[s] = 0));

    const wCounts: Record<string, number> = {};
    const expCounts: Record<string, number> = {};
    const incCounts: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'income' && t.wallet) {
        balances[t.wallet] = (balances[t.wallet] || 0) + t.amount;
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      } else if (t.type === 'expense' && t.wallet) {
        balances[t.wallet] = (balances[t.wallet] || 0) - t.amount;
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      } else if (t.type === 'transfer' && t.fromWallet && t.toWallet) {
        const deduction = t.amount + (t.charge || 0);
        balances[t.fromWallet] = (balances[t.fromWallet] || 0) - deduction;
        balances[t.toWallet] = (balances[t.toWallet] || 0) + t.amount;
        wCounts[t.fromWallet] = (wCounts[t.fromWallet] || 0) + 1;
        wCounts[t.toWallet] = (wCounts[t.toWallet] || 0) + 1;
      } else if (t.type === 'lend' && t.wallet) {
        balances[t.wallet] = (balances[t.wallet] || 0) - t.amount;
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      } else if (t.type === 'borrow' && t.wallet) {
        balances[t.wallet] = (balances[t.wallet] || 0) + t.amount;
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      } else if (t.type === 'partial_payment' && t.wallet) {
        balances[t.wallet] =
          (balances[t.wallet] || 0) + (t.isLendPay ? t.amount : -t.amount);
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      } else if ((t.type === 'correction' || t.type === 'adjustment') && t.wallet) {
        balances[t.wallet] = (balances[t.wallet] || 0) + t.amount;
        wCounts[t.wallet] = (wCounts[t.wallet] || 0) + 1;
      }

      if (t.type === 'expense' && t.category) {
        expCounts[t.category] = (expCounts[t.category] || 0) + 1;
      } else if (t.type === 'income' && t.category) {
        incCounts[t.category] = (incCounts[t.category] || 0) + 1;
      }
    });

    return {
      walletBalances: balances,
      txCountByWallet: wCounts,
      txCountByExpCategory: expCounts,
      txCountByIncCategory: incCounts,
    };
  }, [transactions, workspace.wallets, workspace.savingsList]);

  const monthlySpentByCategory = useMemo(() => {
    const monthlyTxs = filterTransactionsByPeriod(transactions, 'monthly', '', '');
    const map: Record<string, number> = {};
    monthlyTxs.forEach((t) => {
      if (t.type === 'expense') {
        const cat = t.category || 'Others';
        map[cat] = (map[cat] || 0) + t.amount;
      }
    });
    return map;
  }, [transactions]);

  const assistantNetWorth = useMemo(() => {
    let total = 0;
    workspace.wallets.forEach((w) => {
      total += walletBalances[w] || 0;
    });
    workspace.savingsList.forEach((s) => {
      total += walletBalances[s] || 0;
    });
    transactions.forEach((tx) => {
      if (tx.resolved) return;
      const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;
      if (tx.type === 'lend') total += due;
      else if (tx.type === 'borrow') total -= due;
    });
    return total;
  }, [workspace.wallets, workspace.savingsList, walletBalances, transactions]);

  // Workspace update helper
  const updateWorkspace = async (patch: Partial<WorkspaceSettings>) => {
    if (isReadOnlyPartner) {
      const isLocalUiOnly = Object.keys(patch).every((k) => k === 'language' || k === 'themeMode');
      setWorkspace((prev) => ({ ...prev, ...patch }));
      if (!isLocalUiOnly) {
        notify('info', t.sharing.readOnlyToast);
      }
      return;
    }

    const next: WorkspaceSettings = { ...workspace, ...patch };
    setWorkspace(next);

    if (currentUser && activeOwnerId) {
      const path = `users/${activeOwnerId}`;
      try {
        await updateDoc(doc(db, 'users', activeOwnerId), {
          ...patch,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  };

  const handleLanguageChange = async (nextLang: AppLanguage, showToast = false) => {
    if (nextLang === currentLanguage) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage errors
    }
    document.documentElement.lang = nextLang;
    await updateWorkspace({ language: nextLang });
    if (showToast) {
      const nextT = getTranslations(nextLang);
      notify(
        'success',
        nextLang === 'bn' ? nextT.toasts.languageSwitchedBn : nextT.toasts.languageSwitchedEn
      );
    }
  };

  // Auth actions
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      notify('success', `${t.toasts.signedInAs} ${result.user.email}`);
    } catch (error) {
      notify(
        'error',
        error instanceof Error ? error.message : t.toasts.googleSignInFailed
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem(GUEST_STORAGE_KEYS.mode, 'true');
    setIsGuest(true);
    notify('info', t.toasts.guestModeStarted);
  };

  const handleGoogleLogout = () => {
    setConfirmDialog({
      title: isGuest ? t.toasts.exitGuestTitle : t.toasts.signOutTitle,
      message: isGuest ? t.toasts.exitGuestMsg : t.toasts.signOutMsg,
      confirmLabel: isGuest ? t.settings.exitGuest : t.settings.signOut,
      onConfirm: async () => {
        if (isGuest) {
          localStorage.removeItem(GUEST_STORAGE_KEYS.mode);
          setIsGuest(false);
          setCurrentUser(null);
        } else {
          await signOut(auth);
          setActiveSharedWorkspace(null);
          setOutgoingInvites([]);
          setIncomingEmailInvites([]);
          setAcceptedShareDocs([]);
          setTransactions([]);
          setMemos([]);
          setNotes([]);
          setBudgetGoals([]);
        }
      },
    });
  };

  // Live Partner Sharing handlers
  const handleCreateEmailInvite = async (
    rawEmail: string,
    role: ShareRole
  ): Promise<boolean> => {
    if (!currentUser) return false;
    const normalizedEmail = rawEmail.trim().toLowerCase();
    const ownEmail = (currentUser.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail === ownEmail) {
      notify('error', t.sharing.invalidEmailMsg);
      return false;
    }
    const existingActive = outgoingInvites.find(
      (inv) =>
        (inv.status === 'pending' || inv.status === 'accepted') &&
        (inv.targetEmail === normalizedEmail || inv.partnerEmail === normalizedEmail)
    );
    if (existingActive) {
      notify('info', t.sharing.alreadyConnectedMsg);
      return false;
    }

    const id = generateSafeId('inv');
    try {
      await setDoc(doc(db, 'shareInvites', id), {
        ownerUid: currentUser.uid,
        ownerEmail: ownEmail.slice(0, 200),
        ownerName: (currentUser.displayName || ownEmail || 'Partner').slice(0, 200),
        inviteType: 'email',
        targetEmail: normalizedEmail.slice(0, 200),
        code: '',
        role,
        status: 'pending',
        partnerUid: '',
        partnerEmail: '',
        partnerName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      notify('success', t.sharing.inviteSentMsg);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shareInvites/${id}`);
      return false;
    }
  };

  const handleCreateCodeInvite = async (role: ShareRole): Promise<string | null> => {
    if (!currentUser) return null;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'OG';
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const ownEmail = (currentUser.email || '').trim().toLowerCase();

    try {
      await setDoc(doc(db, 'shareInvites', code), {
        ownerUid: currentUser.uid,
        ownerEmail: ownEmail.slice(0, 200),
        ownerName: (currentUser.displayName || ownEmail || 'Partner').slice(0, 200),
        inviteType: 'code',
        targetEmail: '',
        code,
        role,
        status: 'pending',
        partnerUid: '',
        partnerEmail: '',
        partnerName: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      notify('success', t.sharing.codeCreatedMsg);
      return code;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `shareInvites/${code}`);
      return null;
    }
  };

  const handleAcceptInvite = async (invite: ShareInvite) => {
    if (!currentUser) return;
    if (invite.ownerUid === currentUser.uid) {
      notify('error', t.sharing.ownCodeErrorMsg);
      return;
    }
    if (acceptedSharedWorkspaces.some((w) => w.ownerUid === invite.ownerUid)) {
      notify('info', t.sharing.alreadyConnectedMsg);
      return;
    }

    const partnerEmail = (currentUser.email || '').trim().toLowerCase().slice(0, 200);
    const partnerName = (currentUser.displayName || partnerEmail || 'Partner').slice(0, 200);
    const batch = writeBatch(db);
    batch.update(doc(db, 'shareInvites', invite.id), {
      status: 'accepted',
      partnerUid: currentUser.uid,
      partnerEmail,
      partnerName,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'users', invite.ownerUid, 'members', currentUser.uid), {
      ownerUid: invite.ownerUid,
      ownerEmail: (invite.ownerEmail || '').slice(0, 200),
      ownerName: (invite.ownerName || invite.ownerEmail || 'Partner').slice(0, 200),
      memberUid: currentUser.uid,
      memberEmail: partnerEmail,
      memberName: partnerName,
      role: invite.role,
      inviteId: invite.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setActiveSharedWorkspace({
        inviteId: invite.id,
        ownerUid: invite.ownerUid,
        ownerName: invite.ownerName || invite.ownerEmail,
        ownerEmail: invite.ownerEmail,
        role: invite.role,
      });
      notify('success', t.sharing.joinedWorkspaceMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `shareInvites/${invite.id}`);
    }
  };

  const handleJoinByCode = async (rawCode: string): Promise<boolean> => {
    if (!currentUser) return false;
    const cleanCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 6) {
      notify('error', t.sharing.invalidCodeMsg);
      return false;
    }

    let snap;
    try {
      snap = await getDoc(doc(db, 'shareInvites', cleanCode));
    } catch {
      notify('error', t.sharing.invalidCodeMsg);
      return false;
    }

    if (!snap.exists()) {
      notify('error', t.sharing.invalidCodeMsg);
      return false;
    }

    const data = snap.data() as Omit<ShareInvite, 'id'>;
    if (data.status !== 'pending') {
      notify('error', t.sharing.invalidCodeMsg);
      return false;
    }
    if (data.ownerUid === currentUser.uid) {
      notify('error', t.sharing.ownCodeErrorMsg);
      return false;
    }

    await handleAcceptInvite({ id: snap.id, ...data });
    return true;
  };

  const handleDeclineInvite = async (invite: ShareInvite) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'shareInvites', invite.id), {
        status: 'declined',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shareInvites/${invite.id}`);
    }
  };

  const handleUpdateInviteRole = async (invite: ShareInvite, role: ShareRole) => {
    if (!currentUser || invite.role === role) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'shareInvites', invite.id), {
      role,
      updatedAt: serverTimestamp(),
    });
    if (invite.status === 'accepted' && invite.partnerUid) {
      batch.update(doc(db, 'users', currentUser.uid, 'members', invite.partnerUid), {
        role,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      notify('success', t.sharing.roleUpdatedMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shareInvites/${invite.id}`);
    }
  };

  const handleRevokeInvite = async (invite: ShareInvite) => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'shareInvites', invite.id), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
    if (invite.status === 'accepted' && invite.partnerUid) {
      batch.delete(doc(db, 'users', currentUser.uid, 'members', invite.partnerUid));
    }
    try {
      await batch.commit();
      notify('info', t.sharing.revokedMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `shareInvites/${invite.id}`);
    }
  };

  const handleDeleteInvite = async (invite: ShareInvite) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'shareInvites', invite.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `shareInvites/${invite.id}`);
    }
  };

  const handleLeaveSharedWorkspace = async (invite: ShareInvite) => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    batch.update(doc(db, 'shareInvites', invite.id), {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'users', invite.ownerUid, 'members', currentUser.uid));
    try {
      await batch.commit();
      if (activeSharedWorkspace?.ownerUid === invite.ownerUid) {
        setActiveSharedWorkspace(null);
      }
      notify('info', t.sharing.leftWorkspaceMsg);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `shareInvites/${invite.id}`);
    }
  };

  // Transaction CRUD
  const saveTransactionDrafts = async (
    draftList: TransactionDraft[],
    navigateHome: boolean
  ): Promise<boolean> => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return false;
    }

    for (let i = 0; i < draftList.length; i++) {
      const amt = parseFloat(draftList[i].amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        notify('error', `${t.toasts.invalidAmountPrefix}${i + 1}`);
        return false;
      }
      if (
        draftList[i].type === 'transfer' &&
        draftList[i].fromWallet === draftList[i].toWallet
      ) {
        notify('error', `${t.txForm.entryLabel} #${i + 1}: ${t.toasts.sameAccountTransfer}`);
        return false;
      }
    }

    const buildTxPayload = (entry: TransactionDraft, id: string): Transaction => {
      const defaultTitle =
        entry.type === 'transfer'
          ? t.common.transfer
          : entry.type === 'lend'
          ? t.common.lend
          : entry.type === 'borrow'
          ? t.common.borrow
          : entry.type === 'income'
          ? entry.category || t.common.income
          : entry.category || t.common.expense;
      const amt = parseFloat(entry.amount);
      const rawDate = entry.date || getTodayISO();

      const tx: Transaction = {
        id,
        title: (entry.title.trim() || defaultTitle).slice(0, 200),
        amount: amt,
        type: entry.type,
        date: formatDisplayDate(rawDate, currentLanguage),
        rawDate,
        resolved: false,
      };

      if (entry.type === 'transfer') {
        tx.fromWallet = entry.fromWallet;
        tx.toWallet = entry.toWallet;
        tx.category = 'General';
        if (entry.useCharge && entry.charge) {
          tx.charge = Math.max(0, parseFloat(entry.charge) || 0);
        }
      } else if (entry.type === 'lend' || entry.type === 'borrow') {
        tx.wallet = entry.wallet;
        tx.category = 'General';
        tx.remainingBalance = amt;
      } else {
        tx.wallet = entry.wallet;
        tx.category = entry.category;
        if (entry.type === 'expense' && entry.subCategory.trim()) {
          tx.subCategory = entry.subCategory.trim().slice(0, 100);
        }
      }

      if (entry.note.trim()) {
        tx.note = entry.note.trim().slice(0, 2000);
      }
      return tx;
    };

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const batch = writeBatch(db);

      draftList.forEach((entry) => {
        const isEdit = Boolean(entry.id);
        const id = entry.id || generateSafeId('tx');
        const tx = buildTxPayload(entry, id);
        const ref = doc(db, 'users', uid, 'transactions', id);

        if (isEdit) {
          const updateData: Record<string, unknown> = {
            title: tx.title,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            rawDate: tx.rawDate,
            resolved: transactions.find((t) => t.id === id)?.resolved ?? false,
            updatedAt: serverTimestamp(),
            category: tx.category !== undefined ? tx.category : deleteField(),
            subCategory: tx.subCategory !== undefined ? tx.subCategory : deleteField(),
            wallet: tx.wallet !== undefined ? tx.wallet : deleteField(),
            fromWallet: tx.fromWallet !== undefined ? tx.fromWallet : deleteField(),
            toWallet: tx.toWallet !== undefined ? tx.toWallet : deleteField(),
            charge: tx.charge !== undefined ? tx.charge : deleteField(),
            remainingBalance:
              tx.remainingBalance !== undefined ? tx.remainingBalance : deleteField(),
            note: tx.note !== undefined ? tx.note : deleteField(),
          };
          batch.update(ref, updateData);
        } else {
          const createData: Record<string, unknown> = {
            ownerId: uid,
            title: tx.title,
            amount: tx.amount,
            type: tx.type,
            date: tx.date,
            rawDate: tx.rawDate,
            resolved: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (tx.category !== undefined) createData.category = tx.category;
          if (tx.subCategory !== undefined) createData.subCategory = tx.subCategory;
          if (tx.wallet !== undefined) createData.wallet = tx.wallet;
          if (tx.fromWallet !== undefined) createData.fromWallet = tx.fromWallet;
          if (tx.toWallet !== undefined) createData.toWallet = tx.toWallet;
          if (tx.charge !== undefined) createData.charge = tx.charge;
          if (tx.remainingBalance !== undefined) {
            createData.remainingBalance = tx.remainingBalance;
          }
          if (tx.note !== undefined) createData.note = tx.note;
          batch.set(ref, createData);
        }
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/transactions`);
      }
    } else {
      const built = draftList.map((entry) =>
        buildTxPayload(entry, entry.id || generateSafeId('tx'))
      );
      const editedIds = new Set(draftList.filter((x) => x.id).map((x) => x.id as string));
      const next = [...built, ...transactions.filter((t) => !editedIds.has(t.id))].sort((a, b) =>
        b.rawDate.localeCompare(a.rawDate)
      );
      setTransactions(next);
    }

    notify('success', draftList[0]?.id ? t.toasts.txUpdated : t.toasts.txSaved);
    if (navigateHome) {
      setEntries([defaultEntry]);
      setActiveTab('home');
    }
    return true;
  };

  const handleSubmitTransactions = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTransactionDrafts(entries, true);
  };

  const handleDeleteTx = async (id: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const batch = writeBatch(db);

      if (target.type === 'lend' || target.type === 'borrow') {
        batch.delete(doc(db, 'users', uid, 'transactions', id));
        transactions
          .filter((t) => t.parentId === id)
          .forEach((child) => {
            batch.delete(doc(db, 'users', uid, 'transactions', child.id));
          });
      } else if (target.type === 'partial_payment' && target.parentId) {
        const parent = transactions.find((t) => t.id === target.parentId);
        if (parent) {
          const currentDue =
            parent.remainingBalance !== undefined ? parent.remainingBalance : parent.amount;
          batch.update(doc(db, 'users', uid, 'transactions', parent.id), {
            remainingBalance: currentDue + target.amount,
            resolved: false,
            updatedAt: serverTimestamp(),
          });
        }
        batch.delete(doc(db, 'users', uid, 'transactions', id));
      } else {
        batch.delete(doc(db, 'users', uid, 'transactions', id));
      }

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/transactions/${id}`);
      }
    } else {
      if (target.type === 'lend' || target.type === 'borrow') {
        setTransactions((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
      } else if (target.type === 'partial_payment' && target.parentId) {
        setTransactions((prev) =>
          prev
            .map((t) => {
              if (t.id !== target.parentId) return t;
              const currentDue =
                t.remainingBalance !== undefined ? t.remainingBalance : t.amount;
              return {
                ...t,
                remainingBalance: currentDue + target.amount,
                resolved: false,
              };
            })
            .filter((t) => t.id !== id)
        );
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    }

    notify('info', t.toasts.txDeleted);
  };

  const handleEditTx = (tx: Transaction) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (tx.type === 'partial_payment' || tx.type === 'correction' || tx.type === 'adjustment') {
      notify('info', t.toasts.cannotEditSpecialTx);
      return;
    }

    setEntries([
      {
        id: tx.id,
        title: tx.title,
        amount: String(tx.amount),
        type: tx.type,
        category: tx.category || workspace.expenseCategories[0] || 'Personal',
        subCategory: tx.subCategory || '',
        wallet: tx.wallet || allAccountOptions[0] || 'Cash',
        fromWallet: tx.fromWallet || workspace.wallets[0] || 'Bank',
        toWallet: tx.toWallet || workspace.wallets[1] || 'Cash',
        useCharge: Boolean(tx.charge),
        charge: tx.charge ? String(tx.charge) : '',
        date: tx.rawDate || getTodayISO(),
        note: tx.note || '',
      },
    ]);
    setActiveTab('transactions');
  };

  const handleConfirmPartialPayment = async () => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!resolvingTx || !partialAmount || !partialDate) {
      notify('error', t.toasts.enterPaymentAndDate);
      return;
    }
    const payAmt = parseFloat(partialAmount);
    const currentDue =
      resolvingTx.remainingBalance !== undefined
        ? resolvingTx.remainingBalance
        : resolvingTx.amount;

    if (!Number.isFinite(payAmt) || payAmt <= 0 || payAmt > currentDue) {
      notify('error', t.toasts.invalidPaymentAmount);
      return;
    }

    const newDue = Number((currentDue - payAmt).toPrecision(12));
    const isFullyPaid = newDue <= 0;
    const isLendPay = resolvingTx.type === 'lend';
    const paymentId = generateSafeId('pay');
    const formattedDate = formatDisplayDate(partialDate, currentLanguage);
    const payTitle = `${isLendPay ? t.toasts.receivedFrom : t.toasts.paidTo} ${resolvingTx.title}`.slice(
      0,
      200
    );

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'transactions', paymentId), {
        ownerId: uid,
        title: payTitle,
        amount: payAmt,
        type: 'partial_payment',
        category: 'General',
        wallet: resolveWallet,
        parentId: resolvingTx.id,
        parentTitle: resolvingTx.title.slice(0, 200),
        isLendPay,
        date: formattedDate,
        rawDate: partialDate,
        resolved: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', uid, 'transactions', resolvingTx.id), {
        remainingBalance: Math.max(0, newDue),
        resolved: isFullyPaid,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/transactions`);
      }
    } else {
      const paymentTx: Transaction = {
        id: paymentId,
        title: payTitle,
        amount: payAmt,
        type: 'partial_payment',
        category: 'General',
        wallet: resolveWallet,
        parentId: resolvingTx.id,
        parentTitle: resolvingTx.title,
        isLendPay,
        date: formattedDate,
        rawDate: partialDate,
        resolved: true,
      };
      setTransactions((prev) => [
        paymentTx,
        ...prev.map((t) =>
          t.id === resolvingTx.id
            ? { ...t, remainingBalance: Math.max(0, newDue), resolved: isFullyPaid }
            : t
        ),
      ]);
    }

    setResolvingTx(null);
    setPartialAmount('');
    setPartialDate('');
    notify('success', isFullyPaid ? t.toasts.debtSettledFull : t.toasts.partialPaymentSaved);
  };

  const handleBalanceCorrection = async () => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!walletToCorrect || correctBalanceInput === '') return;
    const newBal = parseFloat(correctBalanceInput);
    if (!Number.isFinite(newBal)) {
      notify('error', t.toasts.enterValidBalance);
      return;
    }

    const currentBal = walletBalances[walletToCorrect] || 0;
    const diff = Number((newBal - currentBal).toPrecision(12));
    if (diff === 0) {
      setWalletToCorrect(null);
      setCorrectBalanceInput('');
      return;
    }

    const id = generateSafeId('corr');
    const rawDate = getTodayISO();
    const date = formatDisplayDate(rawDate, currentLanguage);
    const title = `${t.toasts.balanceCorrection} (${walletToCorrect})`.slice(0, 200);

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      try {
        await setDoc(doc(db, 'users', uid, 'transactions', id), {
          ownerId: uid,
          title,
          amount: diff,
          type: 'correction',
          category: 'General',
          wallet: walletToCorrect,
          date,
          rawDate,
          resolved: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/transactions/${id}`);
      }
    } else {
      setTransactions((prev) => [
        {
          id,
          title,
          amount: diff,
          type: 'correction',
          category: 'General',
          wallet: walletToCorrect,
          date,
          rawDate,
          resolved: true,
        },
        ...prev,
      ]);
    }

    setWalletToCorrect(null);
    setCorrectBalanceInput('');
    setDrilldownType(null);
    notify('success', t.toasts.accountBalanceUpdated);
  };

  // List item management (Wallets, Savings, Categories)
  const handleAddListItem = async (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    name: string
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const clean = name.slice(0, 100);
    if (type === 'wallet') {
      if (allAccountOptions.includes(clean)) {
        notify('error', t.toasts.accountExists);
        return;
      }
      await updateWorkspace({ wallets: [...workspace.wallets, clean] });
    } else if (type === 'savings') {
      if (allAccountOptions.includes(clean)) {
        notify('error', t.toasts.accountExists);
        return;
      }
      await updateWorkspace({ savingsList: [...workspace.savingsList, clean] });
    } else if (type === 'exp_cat') {
      if (workspace.expenseCategories.includes(clean)) {
        notify('error', t.toasts.categoryExists);
        return;
      }
      await updateWorkspace({
        expenseCategories: [...workspace.expenseCategories, clean],
      });
    } else {
      if (workspace.incomeCategories.includes(clean)) {
        notify('error', t.toasts.categoryExists);
        return;
      }
      await updateWorkspace({
        incomeCategories: [...workspace.incomeCategories, clean],
      });
    }
    notify('success', `${t.toasts.addedItem} "${clean}".`);
  };

  const handleReorderList = async (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    updated: string[]
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (type === 'wallet') await updateWorkspace({ wallets: updated });
    else if (type === 'savings') await updateWorkspace({ savingsList: updated });
    else if (type === 'exp_cat') await updateWorkspace({ expenseCategories: updated });
    else await updateWorkspace({ incomeCategories: updated });
  };

  const handleSaveCategoryStyle = async (
    kind: CategoryKind,
    name: string,
    style: CategoryStyle
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const key = getCategoryStyleKey(kind, name);
    const nextStyles = {
      ...normalizeCategoryStyles(workspace.categoryStyles),
      [key]: style,
    };
    setEditingStyleTarget(null);
    await updateWorkspace({ categoryStyles: nextStyles });
    notify('success', `${t.toasts.styleUpdated} "${name}".`);
  };

  const handleAddSubCategory = async (parentCat: string, subName: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const clean = subName.trim().slice(0, 100);
    if (!clean) return;
    const currentSubsMap = normalizeExpenseSubCategories(workspace.expenseSubCategories);
    const currentList = currentSubsMap[parentCat] || [];
    if (currentList.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      notify('error', t.toasts.subCatExists);
      return;
    }
    await updateWorkspace({
      expenseSubCategories: {
        ...currentSubsMap,
        [parentCat]: [...currentList, clean],
      },
    });
    notify('success', `${t.toasts.subCatAdded} "${clean}".`);
  };

  const handleDeleteSubCategory = async (parentCat: string, subName: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const currentSubsMap = normalizeExpenseSubCategories(workspace.expenseSubCategories);
    const currentList = currentSubsMap[parentCat] || [];
    await updateWorkspace({
      expenseSubCategories: {
        ...currentSubsMap,
        [parentCat]: currentList.filter((s) => s !== subName),
      },
    });
    notify('info', `${t.toasts.subCatDeleted} "${subName}".`);
  };

  const handleDeleteListItem = (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    item: string
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const kind: CategoryKind =
      type === 'wallet'
        ? 'wal'
        : type === 'savings'
        ? 'sav'
        : type === 'exp_cat'
        ? 'exp'
        : 'inc';

    if (type === 'wallet' || type === 'savings') {
      if (type === 'wallet' && workspace.wallets.length <= 1) {
        notify('error', t.toasts.walletRequired);
        return;
      }
      const cnt = txCountByWallet[item] || 0;
      if (cnt > 0) {
        setAccountToDelete({ name: item, isSavings: type === 'savings' });
        setTransferTargetAccount(allAccountOptions.find((a) => a !== item) || '');
        return;
      }
      setConfirmDialog({
        title: `${t.toasts.noTxAccountTitle} "${item}"?`,
        message: t.toasts.noTxAccountMsg,
        destructive: true,
        confirmLabel: t.common.delete,
        onConfirm: async () => {
          const nextStyles = { ...normalizeCategoryStyles(workspace.categoryStyles) };
          delete nextStyles[getCategoryStyleKey(kind, item)];
          if (type === 'wallet') {
            await updateWorkspace({
              wallets: workspace.wallets.filter((w) => w !== item),
              categoryStyles: nextStyles,
            });
          } else {
            await updateWorkspace({
              savingsList: workspace.savingsList.filter((s) => s !== item),
              categoryStyles: nextStyles,
            });
            const linkedGoals = savingGoals.filter((sg) => sg.account === item);
            if (linkedGoals.length > 0) {
              if (currentUser && activeOwnerId) {
                const uid = activeOwnerId;
                await Promise.all(
                  linkedGoals.map((sg) =>
                    updateDoc(doc(db, 'users', uid, 'savingGoals', sg.id), {
                      account: deleteField(),
                      updatedAt: serverTimestamp(),
                    }).catch((err) =>
                      handleFirestoreError(
                        err,
                        OperationType.UPDATE,
                        `users/${uid}/savingGoals/${sg.id}`
                      )
                    )
                  )
                );
              } else {
                setSavingGoals((prev) =>
                  prev.map((sg) =>
                    sg.account === item ? { ...sg, account: undefined } : sg
                  )
                );
              }
            }
          }
          notify('info', `${t.toasts.deletedItem} "${item}".`);
        },
      });
      return;
    }

    const list = type === 'exp_cat' ? workspace.expenseCategories : workspace.incomeCategories;
    if (list.length <= 1) {
      notify('error', t.toasts.categoryRequired);
      return;
    }

    const cnt =
      type === 'exp_cat'
        ? txCountByExpCategory[item] || 0
        : txCountByIncCategory[item] || 0;
    if (cnt > 0) {
      setMergeCategoryTarget({ listType: type, categoryName: item, txCount: cnt });
      setMergeIntoCategory(list.find((c) => c !== item) || '');
      return;
    }

    setConfirmDialog({
      title: `${t.toasts.deleteCatTitle} "${item}"?`,
      message: t.toasts.noTxCatMsg,
      destructive: true,
      confirmLabel: t.common.delete,
      onConfirm: async () => {
        const nextStyles = { ...normalizeCategoryStyles(workspace.categoryStyles) };
        delete nextStyles[getCategoryStyleKey(kind, item)];
        if (type === 'exp_cat') {
          const nextSubs = { ...normalizeExpenseSubCategories(workspace.expenseSubCategories) };
          delete nextSubs[item];
          await updateWorkspace({
            expenseCategories: workspace.expenseCategories.filter((c) => c !== item),
            expenseSubCategories: nextSubs,
            categoryStyles: nextStyles,
          });
          const matchingGoals = budgetGoals.filter((g) => g.category === item);
          if (matchingGoals.length > 0) {
            if (currentUser && activeOwnerId) {
              const uid = activeOwnerId;
              await Promise.all(
                matchingGoals.map((g) =>
                  deleteDoc(doc(db, 'users', uid, 'budgets', g.id)).catch((err) =>
                    handleFirestoreError(err, OperationType.DELETE, `users/${uid}/budgets/${g.id}`)
                  )
                )
              );
            } else {
              setBudgetGoals((prev) => prev.filter((g) => g.category !== item));
            }
          }
        } else {
          await updateWorkspace({
            incomeCategories: workspace.incomeCategories.filter((c) => c !== item),
            categoryStyles: nextStyles,
          });
        }
        notify('info', `${t.toasts.deletedItem} "${item}".`);
      },
    });
  };

  const handleSaveEditedListItem = async () => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!editingItem || !editInputVal.trim()) return;
    const newName = editInputVal.trim().slice(0, 100);
    const { listType, oldName, parentCategory } = editingItem;
    if (newName === oldName) {
      setEditingItem(null);
      return;
    }

    if (listType === 'sub_cat' && parentCategory) {
      const currentSubsMap = normalizeExpenseSubCategories(workspace.expenseSubCategories);
      const currentList = currentSubsMap[parentCategory] || [];
      if (currentList.some((s) => s !== oldName && s.toLowerCase() === newName.toLowerCase())) {
        notify('error', t.toasts.subCatExists);
        return;
      }
      const nextSubsMap = {
        ...currentSubsMap,
        [parentCategory]: currentList.map((s) => (s === oldName ? newName : s)),
      };

      if (currentUser && activeOwnerId) {
        const uid = activeOwnerId;
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid), {
          expenseSubCategories: nextSubsMap,
          updatedAt: serverTimestamp(),
        });
        transactions.forEach((tx) => {
          if (
            tx.type === 'expense' &&
            tx.category === parentCategory &&
            tx.subCategory === oldName
          ) {
            batch.update(doc(db, 'users', uid, 'transactions', tx.id), {
              subCategory: newName,
              updatedAt: serverTimestamp(),
            });
          }
        });
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      } else {
        await updateWorkspace({ expenseSubCategories: nextSubsMap });
        setTransactions((prev) =>
          prev.map((tx) =>
            tx.type === 'expense' &&
            tx.category === parentCategory &&
            tx.subCategory === oldName
              ? { ...tx, subCategory: newName }
              : tx
          )
        );
      }

      setEditingItem(null);
      setEditInputVal('');
      notify('success', `${t.toasts.subCatRenamed} "${oldName}" ${t.toasts.renamedTo} "${newName}".`);
      return;
    }

    const kind: CategoryKind =
      listType === 'wallet'
        ? 'wal'
        : listType === 'savings'
        ? 'sav'
        : listType === 'exp_cat'
        ? 'exp'
        : 'inc';
    const nextStyles = { ...normalizeCategoryStyles(workspace.categoryStyles) };
    const oldStyleKey = getCategoryStyleKey(kind, oldName);
    const newStyleKey = getCategoryStyleKey(kind, newName);
    nextStyles[newStyleKey] = getCategoryStyle(workspace.categoryStyles, kind, oldName);
    delete nextStyles[oldStyleKey];

    if (listType === 'wallet' || listType === 'savings') {
      if (allAccountOptions.includes(newName)) {
        notify('error', t.toasts.accountExists);
        return;
      }
      const wsPatch =
        listType === 'wallet'
          ? {
              wallets: workspace.wallets.map((w) => (w === oldName ? newName : w)),
              categoryStyles: nextStyles,
            }
          : {
              savingsList: workspace.savingsList.map((s) => (s === oldName ? newName : s)),
              categoryStyles: nextStyles,
            };

      if (currentUser && activeOwnerId) {
        const uid = activeOwnerId;
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid), {
          ...wsPatch,
          updatedAt: serverTimestamp(),
        });
        transactions.forEach((t) => {
          if (t.wallet === oldName || t.fromWallet === oldName || t.toWallet === oldName) {
            const txPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
            if (t.wallet === oldName) txPatch.wallet = newName;
            if (t.fromWallet === oldName) txPatch.fromWallet = newName;
            if (t.toWallet === oldName) txPatch.toWallet = newName;
            batch.update(doc(db, 'users', uid, 'transactions', t.id), txPatch);
          }
        });
        if (listType === 'savings') {
          savingGoals.forEach((sg) => {
            if (sg.account === oldName) {
              batch.update(doc(db, 'users', uid, 'savingGoals', sg.id), {
                account: newName,
                updatedAt: serverTimestamp(),
              });
            }
          });
        }
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      } else {
        await updateWorkspace(wsPatch);
        setTransactions((prev) =>
          prev.map((t) => ({
            ...t,
            wallet: t.wallet === oldName ? newName : t.wallet,
            fromWallet: t.fromWallet === oldName ? newName : t.fromWallet,
            toWallet: t.toWallet === oldName ? newName : t.toWallet,
          }))
        );
        if (listType === 'savings') {
          setSavingGoals((prev) =>
            prev.map((sg) => (sg.account === oldName ? { ...sg, account: newName } : sg))
          );
        }
      }
    } else {
      const targetList =
        listType === 'exp_cat' ? workspace.expenseCategories : workspace.incomeCategories;
      if (targetList.includes(newName)) {
        notify('error', t.toasts.categoryExists);
        return;
      }

      const nextSubsMap = { ...normalizeExpenseSubCategories(workspace.expenseSubCategories) };
      if (listType === 'exp_cat' && nextSubsMap[oldName]) {
        nextSubsMap[newName] = nextSubsMap[oldName];
        delete nextSubsMap[oldName];
      }

      const wsPatch =
        listType === 'exp_cat'
          ? {
              expenseCategories: workspace.expenseCategories.map((c) =>
                c === oldName ? newName : c
              ),
              expenseSubCategories: nextSubsMap,
              categoryStyles: nextStyles,
            }
          : {
              incomeCategories: workspace.incomeCategories.map((c) =>
                c === oldName ? newName : c
              ),
              categoryStyles: nextStyles,
            };

      const isExp = listType === 'exp_cat';
      if (currentUser && activeOwnerId) {
        const uid = activeOwnerId;
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', uid), {
          ...wsPatch,
          updatedAt: serverTimestamp(),
        });
        transactions.forEach((t) => {
          if ((isExp ? t.type === 'expense' : t.type === 'income') && t.category === oldName) {
            batch.update(doc(db, 'users', uid, 'transactions', t.id), {
              category: newName,
              updatedAt: serverTimestamp(),
            });
          }
        });
        if (isExp) {
          memos.forEach((m) => {
            if (m.category === oldName) {
              batch.update(doc(db, 'users', uid, 'memos', m.id), {
                category: newName,
                updatedAt: serverTimestamp(),
              });
            }
          });
          budgetGoals.forEach((g) => {
            if (g.category === oldName) {
              batch.update(doc(db, 'users', uid, 'budgets', g.id), {
                category: newName,
                updatedAt: serverTimestamp(),
              });
            }
          });
        }
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
      } else {
        await updateWorkspace(wsPatch);
        setTransactions((prev) =>
          prev.map((t) =>
            (isExp ? t.type === 'expense' : t.type === 'income') && t.category === oldName
              ? { ...t, category: newName }
              : t
          )
        );
        if (isExp) {
          setMemos((prev) =>
            prev.map((m) => (m.category === oldName ? { ...m, category: newName } : m))
          );
          setBudgetGoals((prev) =>
            prev.map((g) => (g.category === oldName ? { ...g, category: newName } : g))
          );
        }
      }
    }

    setEditingItem(null);
    setEditInputVal('');
    notify('success', `${t.toasts.renamedPrefix} "${oldName}" ${t.toasts.renamedTo} "${newName}".`);
  };

  const handleConfirmTransferAndDeleteAccount = async () => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!accountToDelete || !transferTargetAccount) return;
    const oldAcc = accountToDelete.name;
    const newAcc = transferTargetAccount;
    const wsPatch = accountToDelete.isSavings
      ? { savingsList: workspace.savingsList.filter((s) => s !== oldAcc) }
      : { wallets: workspace.wallets.filter((w) => w !== oldAcc) };

    const nextLinkedSavingAccount =
      accountToDelete.isSavings && workspace.savingsList.includes(newAcc) && newAcc !== oldAcc
        ? newAcc
        : undefined;

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', uid), {
        ...wsPatch,
        updatedAt: serverTimestamp(),
      });
      transactions.forEach((t) => {
        if (t.wallet === oldAcc || t.fromWallet === oldAcc || t.toWallet === oldAcc) {
          const txPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
          if (t.wallet === oldAcc) txPatch.wallet = newAcc;
          if (t.fromWallet === oldAcc) txPatch.fromWallet = newAcc;
          if (t.toWallet === oldAcc) txPatch.toWallet = newAcc;
          batch.update(doc(db, 'users', uid, 'transactions', t.id), txPatch);
        }
      });
      if (accountToDelete.isSavings) {
        savingGoals.forEach((sg) => {
          if (sg.account === oldAcc) {
            batch.update(doc(db, 'users', uid, 'savingGoals', sg.id), {
              account: nextLinkedSavingAccount ? nextLinkedSavingAccount : deleteField(),
              updatedAt: serverTimestamp(),
            });
          }
        });
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    } else {
      await updateWorkspace(wsPatch);
      setTransactions((prev) =>
        prev.map((t) => ({
          ...t,
          wallet: t.wallet === oldAcc ? newAcc : t.wallet,
          fromWallet: t.fromWallet === oldAcc ? newAcc : t.fromWallet,
          toWallet: t.toWallet === oldAcc ? newAcc : t.toWallet,
        }))
      );
      if (accountToDelete.isSavings) {
        setSavingGoals((prev) =>
          prev.map((sg) =>
            sg.account === oldAcc ? { ...sg, account: nextLinkedSavingAccount } : sg
          )
        );
      }
    }

    setAccountToDelete(null);
    notify('success', `${t.toasts.movedHistoryTo} ${newAcc} ${t.toasts.andDeleted} "${oldAcc}".`);
  };

  const handleConfirmMergeCategory = async () => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!mergeCategoryTarget || !mergeIntoCategory) return;
    const { listType, categoryName: sourceCat } = mergeCategoryTarget;
    const targetCat = mergeIntoCategory;
    if (sourceCat === targetCat) return;

    const isExp = listType === 'exp_cat';
    const kind: CategoryKind = isExp ? 'exp' : 'inc';
    const nextStyles = { ...normalizeCategoryStyles(workspace.categoryStyles) };
    delete nextStyles[getCategoryStyleKey(kind, sourceCat)];

    const nextSubsMap = { ...normalizeExpenseSubCategories(workspace.expenseSubCategories) };
    if (isExp) {
      const sourceSubs = nextSubsMap[sourceCat] || [];
      const targetSubs = nextSubsMap[targetCat] || [];
      if (sourceSubs.length > 0) {
        const mergedSubs = [...targetSubs];
        sourceSubs.forEach((sub) => {
          if (!mergedSubs.some((s) => s.toLowerCase() === sub.toLowerCase())) {
            mergedSubs.push(sub);
          }
        });
        nextSubsMap[targetCat] = mergedSubs;
      }
      delete nextSubsMap[sourceCat];
    }

    const wsPatch = isExp
      ? {
          expenseCategories: workspace.expenseCategories.filter((c) => c !== sourceCat),
          expenseSubCategories: nextSubsMap,
          categoryStyles: nextStyles,
        }
      : {
          incomeCategories: workspace.incomeCategories.filter((c) => c !== sourceCat),
          categoryStyles: nextStyles,
        };

    const matchingTxs = transactions.filter(
      (tx) => (isExp ? tx.type === 'expense' : tx.type === 'income') && tx.category === sourceCat
    );
    const matchingMemos = isExp ? memos.filter((m) => m.category === sourceCat) : [];
    const sourceGoals = isExp ? budgetGoals.filter((g) => g.category === sourceCat) : [];
    const hasTargetGoal = isExp && budgetGoals.some((g) => g.category === targetCat);

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      type BatchOp = (batch: ReturnType<typeof writeBatch>) => void;
      const ops: BatchOp[] = [
        (batch) =>
          batch.update(doc(db, 'users', uid), {
            ...wsPatch,
            updatedAt: serverTimestamp(),
          }),
      ];

      matchingTxs.forEach((tx) => {
        ops.push((batch) =>
          batch.update(doc(db, 'users', uid, 'transactions', tx.id), {
            category: targetCat,
            updatedAt: serverTimestamp(),
          })
        );
      });

      matchingMemos.forEach((memo) => {
        ops.push((batch) =>
          batch.update(doc(db, 'users', uid, 'memos', memo.id), {
            category: targetCat,
            updatedAt: serverTimestamp(),
          })
        );
      });

      sourceGoals.forEach((goal, index) => {
        if (hasTargetGoal || index > 0) {
          ops.push((batch) => batch.delete(doc(db, 'users', uid, 'budgets', goal.id)));
        } else {
          ops.push((batch) =>
            batch.update(doc(db, 'users', uid, 'budgets', goal.id), {
              category: targetCat,
              updatedAt: serverTimestamp(),
            })
          );
        }
      });

      try {
        for (let i = 0; i < ops.length; i += 400) {
          const batch = writeBatch(db);
          ops.slice(i, i + 400).forEach((applyOp) => applyOp(batch));
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      }
    } else {
      await updateWorkspace(wsPatch);
      if (matchingTxs.length > 0) {
        setTransactions((prev) =>
          prev.map((tx) =>
            (isExp ? tx.type === 'expense' : tx.type === 'income') && tx.category === sourceCat
              ? { ...tx, category: targetCat }
              : tx
          )
        );
      }
      if (matchingMemos.length > 0) {
        setMemos((prev) =>
          prev.map((m) => (m.category === sourceCat ? { ...m, category: targetCat } : m))
        );
      }
      if (sourceGoals.length > 0) {
        setBudgetGoals((prev) => {
          if (hasTargetGoal) {
            return prev.filter((g) => g.category !== sourceCat);
          }
          let migratedFirst = false;
          return prev.reduce<BudgetGoal[]>((acc, g) => {
            if (g.category === sourceCat) {
              if (!migratedFirst) {
                migratedFirst = true;
                acc.push({ ...g, category: targetCat });
              }
            } else {
              acc.push(g);
            }
            return acc;
          }, []);
        });
      }
    }

    setMergeCategoryTarget(null);
    setMergeIntoCategory('');
    notify('success', `${t.toasts.mergedPrefix} "${sourceCat}" ${t.toasts.mergedIntoText} "${targetCat}".`);
  };

  // Memos & Notes handlers
  const handleSaveMemo = async (
    memoData: Omit<BazarMemo, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const id = editId || generateSafeId('memo');
    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const ref = doc(db, 'users', uid, 'memos', id);
      try {
        if (editId) {
          await updateDoc(ref, {
            date: memoData.date,
            category: memoData.category,
            wallet: memoData.wallet,
            items: memoData.items.slice(0, 200),
            total: memoData.total,
            note: (memoData.note || '').slice(0, 500),
            updatedAt: serverTimestamp(),
          });
        } else {
          const payload: Record<string, unknown> = {
            ownerId: uid,
            date: memoData.date,
            category: memoData.category,
            wallet: memoData.wallet,
            items: memoData.items.slice(0, 200),
            total: memoData.total,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (memoData.note) payload.note = memoData.note.slice(0, 500);
          await setDoc(ref, payload);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/memos/${id}`);
      }
    } else {
      if (editId) {
        setMemos((prev) => prev.map((m) => (m.id === editId ? { ...m, ...memoData } : m)));
      } else {
        setMemos((prev) => [{ id, ...memoData }, ...prev]);
      }
    }
    notify('success', editId ? t.toasts.memoUpdated : t.toasts.memoSaved);
  };

  const handleDeleteMemo = (id: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    setConfirmDialog({
      title: t.toasts.deleteMemoTitle,
      message: t.toasts.deleteMemoMsg,
      destructive: true,
      confirmLabel: t.common.delete,
      onConfirm: async () => {
        if (currentUser && activeOwnerId) {
          const uid = activeOwnerId;
          try {
            await deleteDoc(doc(db, 'users', uid, 'memos', id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${uid}/memos/${id}`);
          }
        } else {
          setMemos((prev) => prev.filter((m) => m.id !== id));
        }
        notify('info', t.toasts.memoDeleted);
      },
    });
  };

  const handleAddMemoAsExpense = async (payload: {
    title: string;
    amount: number;
    category: string;
    wallet: string;
    rawDate: string;
    note: string;
  }) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const id = generateSafeId('tx');
    const date = formatDisplayDate(payload.rawDate, currentLanguage);

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      try {
        await setDoc(doc(db, 'users', uid, 'transactions', id), {
          ownerId: uid,
          title: payload.title.slice(0, 200),
          amount: payload.amount,
          type: 'expense',
          category: payload.category,
          wallet: payload.wallet,
          note: payload.note.slice(0, 2000),
          date,
          rawDate: payload.rawDate,
          resolved: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/transactions/${id}`);
      }
    } else {
      setTransactions((prev) => [
        {
          id,
          title: payload.title,
          amount: payload.amount,
          type: 'expense',
          category: payload.category,
          wallet: payload.wallet,
          note: payload.note,
          date,
          rawDate: payload.rawDate,
          resolved: true,
        },
        ...prev,
      ]);
    }
    notify('success', t.toasts.memoLoggedExpense);
  };

  const handleSaveNote = async (
    noteData: { title: string; content: string; date: string },
    editId?: string
  ) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    const id = editId || generateSafeId('note');
    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const ref = doc(db, 'users', uid, 'notes', id);
      try {
        if (editId) {
          await updateDoc(ref, {
            title: noteData.title.slice(0, 200),
            content: noteData.content.slice(0, 20000),
            date: noteData.date,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ownerId: uid,
            title: noteData.title.slice(0, 200),
            content: noteData.content.slice(0, 20000),
            date: noteData.date,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/notes/${id}`);
      }
    } else {
      if (editId) {
        setNotes((prev) => prev.map((n) => (n.id === editId ? { ...n, ...noteData } : n)));
      } else {
        setNotes((prev) => [{ id, ...noteData }, ...prev]);
      }
    }
    notify('success', editId ? t.toasts.noteUpdated : t.toasts.noteSaved);
  };

  const handleDeleteNote = (id: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    setConfirmDialog({
      title: t.toasts.deleteNoteTitle,
      message: t.toasts.deleteNoteMsg,
      destructive: true,
      confirmLabel: t.common.delete,
      onConfirm: async () => {
        if (currentUser && activeOwnerId) {
          const uid = activeOwnerId;
          try {
            await deleteDoc(doc(db, 'users', uid, 'notes', id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `users/${uid}/notes/${id}`);
          }
        } else {
          setNotes((prev) => prev.filter((n) => n.id !== id));
        }
        notify('info', t.toasts.noteDeleted);
      },
    });
  };

  // Budget Goals handlers
  const handleSaveBudgetGoal = async (
    category: string,
    monthlyLimit: number,
    editId?: string
  ): Promise<boolean> => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return false;
    }
    const cleanCategory = category.trim().slice(0, 100);
    if (!cleanCategory || !Number.isFinite(monthlyLimit) || monthlyLimit <= 0) {
      notify('error', t.toasts.invalidBudgetInput);
      return false;
    }

    const existingForCategory = budgetGoals.find((g) => g.category === cleanCategory);
    const targetId = editId || existingForCategory?.id;

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const id = targetId || generateSafeId('budget');
      const ref = doc(db, 'users', uid, 'budgets', id);
      try {
        if (targetId) {
          await updateDoc(ref, {
            category: cleanCategory,
            monthlyLimit,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            ownerId: uid,
            category: cleanCategory,
            monthlyLimit,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/budgets/${id}`);
        return false;
      }
    } else {
      if (targetId) {
        setBudgetGoals((prev) =>
          prev
            .map((g) =>
              g.id === targetId ? { ...g, category: cleanCategory, monthlyLimit } : g
            )
            .sort((a, b) => a.category.localeCompare(b.category))
        );
      } else {
        const id = generateSafeId('budget');
        setBudgetGoals((prev) =>
          [...prev, { id, category: cleanCategory, monthlyLimit }].sort((a, b) =>
            a.category.localeCompare(b.category)
          )
        );
      }
    }

    notify(
      'success',
      targetId
        ? `${t.toasts.budgetUpdated} "${cleanCategory}".`
        : `${t.toasts.budgetSet} "${cleanCategory}".`
    );
    return true;
  };

  const handleDeleteBudgetGoal = async (id: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      try {
        await deleteDoc(doc(db, 'users', uid, 'budgets', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/budgets/${id}`);
        return;
      }
    } else {
      setBudgetGoals((prev) => prev.filter((g) => g.id !== id));
    }
    notify('info', t.toasts.budgetDeleted);
  };

  // Saving Goals handlers
  const handleSaveSavingGoal = async (
    payload: {
      title: string;
      account?: string;
      periodType: SavingGoalPeriodType;
      targetAmount: number;
      startDate?: string;
      endDate?: string;
    },
    editId?: string
  ): Promise<boolean> => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return false;
    }
    const cleanTitle = payload.title.trim().slice(0, 100);
    if (!cleanTitle || !Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) {
      notify('error', t.toasts.invalidSavingGoalInput);
      return false;
    }
    if (
      payload.periodType === 'period' &&
      (!payload.startDate || !payload.endDate || payload.endDate < payload.startDate)
    ) {
      notify('error', t.toasts.invalidSavingDateRange);
      return false;
    }

    const cleanAccount = payload.account ? payload.account.trim().slice(0, 100) : undefined;
    const startDate = payload.periodType === 'period' ? payload.startDate : undefined;
    const endDate = payload.periodType === 'period' ? payload.endDate : undefined;

    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      const id = editId || generateSafeId('savgoal');
      const ref = doc(db, 'users', uid, 'savingGoals', id);
      try {
        if (editId) {
          const updateData: Record<string, unknown> = {
            title: cleanTitle,
            periodType: payload.periodType,
            targetAmount: payload.targetAmount,
            account: cleanAccount || deleteField(),
            startDate: startDate || deleteField(),
            endDate: endDate || deleteField(),
            updatedAt: serverTimestamp(),
          };
          await updateDoc(ref, updateData);
        } else {
          const docData: Record<string, unknown> = {
            ownerId: uid,
            title: cleanTitle,
            periodType: payload.periodType,
            targetAmount: payload.targetAmount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (cleanAccount) docData.account = cleanAccount;
          if (startDate) docData.startDate = startDate;
          if (endDate) docData.endDate = endDate;
          await setDoc(ref, docData);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/savingGoals/${id}`);
        return false;
      }
    } else {
      if (editId) {
        setSavingGoals((prev) =>
          prev
            .map((g) =>
              g.id === editId
                ? {
                    ...g,
                    title: cleanTitle,
                    account: cleanAccount,
                    periodType: payload.periodType,
                    targetAmount: payload.targetAmount,
                    startDate,
                    endDate,
                  }
                : g
            )
            .sort((a, b) => a.title.localeCompare(b.title))
        );
      } else {
        const id = generateSafeId('savgoal');
        setSavingGoals((prev) =>
          [
            ...prev,
            {
              id,
              title: cleanTitle,
              account: cleanAccount,
              periodType: payload.periodType,
              targetAmount: payload.targetAmount,
              startDate,
              endDate,
            },
          ].sort((a, b) => a.title.localeCompare(b.title))
        );
      }
    }

    notify(
      'success',
      editId
        ? `${t.toasts.savingGoalUpdated} "${cleanTitle}".`
        : `${t.toasts.savingGoalSet} "${cleanTitle}".`
    );
    return true;
  };

  const handleDeleteSavingGoal = async (id: string) => {
    if (isReadOnlyPartner) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    if (currentUser && activeOwnerId) {
      const uid = activeOwnerId;
      try {
        await deleteDoc(doc(db, 'users', uid, 'savingGoals', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/savingGoals/${id}`);
        return;
      }
    } else {
      setSavingGoals((prev) => prev.filter((g) => g.id !== id));
    }
    notify('info', t.toasts.savingGoalDeleted);
  };

  const handleExportBackup = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      workspace,
      transactions,
      memos,
      notes,
      budgetGoals,
      savingGoals,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orthogro-backup-${getTodayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', t.toasts.backupDownloaded);
  };

  const handleResetAllData = () => {
    if (activeSharedWorkspace) {
      notify('info', t.sharing.readOnlyToast);
      return;
    }
    setConfirmDialog({
      title: t.toasts.resetTitle,
      message: t.toasts.resetMsg,
      destructive: true,
      confirmLabel: t.toasts.resetConfirm,
      onConfirm: async () => {
        const defaultWs: WorkspaceSettings = {
          wallets: DEFAULT_WALLETS,
          savingsList: DEFAULT_SAVINGS,
          expenseCategories: DEFAULT_EXPENSE_CATS,
          incomeCategories: DEFAULT_INCOME_CATS,
          expenseSubCategories: DEFAULT_EXPENSE_SUBCATEGORIES,
          categoryStyles: DEFAULT_CATEGORY_STYLES,
          currency: '৳',
          themeMode: workspace.themeMode,
          language: currentLanguage,
          gridOrder: DEFAULT_GRID_ORDER,
          visibleGrids: DEFAULT_VISIBLE_GRIDS,
        };

        if (currentUser) {
          const uid = currentUser.uid;
          const batch = writeBatch(db);
          batch.update(doc(db, 'users', uid), {
            ...defaultWs,
            updatedAt: serverTimestamp(),
          });
          transactions.forEach((t) =>
            batch.delete(doc(db, 'users', uid, 'transactions', t.id))
          );
          memos.forEach((m) => batch.delete(doc(db, 'users', uid, 'memos', m.id)));
          notes.forEach((n) => batch.delete(doc(db, 'users', uid, 'notes', n.id)));
          budgetGoals.forEach((b) => batch.delete(doc(db, 'users', uid, 'budgets', b.id)));
          savingGoals.forEach((sg) => batch.delete(doc(db, 'users', uid, 'savingGoals', sg.id)));
          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          }
        } else {
          setTransactions([]);
          setMemos([]);
          setNotes([]);
          setBudgetGoals([]);
          setSavingGoals([]);
          setWorkspace(defaultWs);
        }
        notify('info', t.toasts.resetDone);
      },
    });
  };

  if (authLoading) {
    return (
      <LanguageProvider lang={currentLanguage} setLanguage={(l) => void handleLanguageChange(l, false)}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8F7] p-6 text-center dark:bg-slate-950">
          <div className="text-3xl font-extrabold tracking-tight text-[#102A43] dark:text-slate-100">
            OrthoGro
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-widest text-[#16845B] dark:text-emerald-400">
            {t.app.tagline}
          </div>
          <div className="mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#16845B] dark:border-slate-800 dark:border-t-emerald-400" />
        </div>
      </LanguageProvider>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <LanguageProvider lang={currentLanguage} setLanguage={(l) => void handleLanguageChange(l, false)}>
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((p) => p.filter((x) => x.id !== id))}
        />
        <AuthScreen
          isReturningUser={isReturningUser}
          lastUserHint={lastUserHint}
          onClearLastUserHint={() => {
            setLastUserHint(null);
            setIsReturningUser(false);
            try {
              localStorage.removeItem(LAST_USER_HINT_STORAGE_KEY);
              localStorage.removeItem(RETURNING_USER_STORAGE_KEY);
            } catch {
              // ignore storage errors
            }
          }}
          onGoogleLogin={handleGoogleLogin}
          onGuestLogin={handleGuestLogin}
          isSigningIn={isSigningIn}
        />
      </LanguageProvider>
    );
  }

  const navItems: Array<{
    key: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: 'home', label: t.app.navHome, icon: Home },
    { key: 'memo', label: t.app.navMemo, icon: ReceiptText },
    { key: 'transactions', label: t.app.navAdd, icon: Plus },
    { key: 'calculator', label: t.app.navCalc, icon: Calculator },
    { key: 'settings', label: t.app.navSettings, icon: Settings },
  ];

  return (
    <LanguageProvider lang={currentLanguage} setLanguage={(l) => void handleLanguageChange(l, true)}>
      <div className="flex min-h-screen bg-[#F6F8F7] text-[#102A43] dark:bg-slate-950 dark:text-slate-100">
        <ToastContainer
          toasts={toasts}
          onDismiss={(id) => setToasts((p) => p.filter((x) => x.id !== id))}
        />
        <OfflineIndicator />

        {/* Desktop Left Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:flex">
          <div>
            <div className="px-2 pb-6">
              <div className="inline-flex w-fit flex-col items-stretch">
                <div className="text-[26px] font-extrabold leading-none tracking-tight text-[#102A43] dark:text-slate-100">
                  OrthoGro
                </div>
                <p
                  aria-label="Track • Save • Grow"
                  className="mt-1.5 flex w-full items-center justify-between gap-1 text-[11px] font-semibold leading-none text-[#16845B] dark:text-emerald-400"
                >
                  <span>Track</span>
                  <span aria-hidden="true">•</span>
                  <span>Save</span>
                  <span aria-hidden="true">•</span>
                  <span>Grow</span>
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                      onClick={() => {
                        if (item.key === 'transactions' && isReadOnlyPartner) {
                          notify('info', t.sharing.readOnlyToast);
                          return;
                        }
                        setActiveTab(item.key);
                        if (item.key === 'transactions') setEntries([defaultEntry]);
                        if (item.key === 'settings') setSettingsView('menu');
                      }}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#16845B] text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#102A43] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.key === 'transactions' ? t.app.navNewEntry : item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4">
            <PWAInstallButton />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Sticky Compact Header */}
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200 bg-[#F6F8F7]/90 px-4 py-1.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="inline-flex w-fit flex-col items-stretch lg:hidden">
                <div className="text-[22px] font-extrabold leading-none tracking-tight text-[#102A43] dark:text-slate-100">
                  OrthoGro
                </div>
                <p
                  aria-label="Track • Save • Grow"
                  className="mt-1 flex w-full items-center justify-between gap-1 text-[9.5px] font-semibold leading-none text-[#16845B] dark:text-emerald-400"
                >
                  <span>Track</span>
                  <span aria-hidden="true">•</span>
                  <span>Save</span>
                  <span aria-hidden="true">•</span>
                  <span>Grow</span>
                </p>
              </div>
              <span className="hidden text-sm font-bold text-[#102A43] dark:text-slate-100 lg:inline">
                {activeTab === 'home'
                  ? t.app.headerOverview
                  : activeTab === 'memo'
                  ? t.app.headerMemo
                  : activeTab === 'transactions'
                  ? t.app.headerTransactions
                  : activeTab === 'calculator'
                  ? t.app.headerCalc
                  : t.app.headerSettings}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {currentUser &&
                (acceptedSharedWorkspaces.length > 0 || pendingIncomingInvites.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('settings');
                      setSettingsView('shared_access');
                    }}
                    aria-label={t.sharing.title}
                    title={t.sharing.title}
                    className={`relative flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors ${
                      activeSharedWorkspace
                        ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-300'
                        : 'text-[#102A43] hover:bg-slate-200/70 dark:text-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    {activeSharedWorkspace && (
                      <span className="hidden max-w-[110px] truncate sm:inline">
                        {activeSharedWorkspace.ownerName}
                      </span>
                    )}
                    {pendingIncomingInvites.length > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#16845B] px-1 text-[10px] font-bold text-white">
                        {pendingIncomingInvites.length}
                      </span>
                    )}
                  </button>
                )}
              <div className="lg:hidden">
                <PWAInstallButton compact />
              </div>
              {activeTab === 'home' && (
                <button
                  type="button"
                  onClick={() => setShowCustomizeModal(true)}
                  aria-label={t.app.layoutAria}
                  title={t.app.layoutAria}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#102A43] transition-colors hover:bg-slate-200/70 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
              )}
            </div>
          </header>

        {/* Scrollable Workspace */}
        <main className="w-full min-w-0 flex-1 px-4 pt-5 pb-24 lg:px-8 lg:pb-10">
          {activeSharedWorkspace && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-2.5 text-xs dark:border-sky-900/60 dark:bg-sky-950/35">
              <div className="flex min-w-0 items-center gap-2">
                {isReadOnlyPartner ? (
                  <Eye className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                ) : (
                  <Pencil className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                )}
                <span className="truncate font-bold text-[#102A43] dark:text-slate-100">
                  {isReadOnlyPartner ? t.sharing.bannerViewing : t.sharing.bannerManaging}{' '}
                  {activeSharedWorkspace.ownerName || activeSharedWorkspace.ownerEmail}
                </span>
                <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-300">
                  {isReadOnlyPartner ? t.sharing.roleViewer : t.sharing.roleEditor}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSharedWorkspace(null)}
                className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-[#102A43] shadow-xs hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {t.sharing.bannerBackBtn}
              </button>
            </div>
          )}
          {activeTab === 'home' && (
            <HomeDashboard
              transactions={transactions}
              wallets={workspace.wallets}
              savingsList={workspace.savingsList}
              walletBalances={walletBalances}
              budgetGoals={budgetGoals}
              savingGoals={savingGoals}
              monthlySpentByCategory={monthlySpentByCategory}
              categoryStyles={normalizeCategoryStyles(workspace.categoryStyles)}
              currency={workspace.currency}
              gridOrder={workspace.gridOrder}
              visibleGrids={workspace.visibleGrids}
              filters={filters}
              customDateFrom={customDateFrom}
              customDateTo={customDateTo}
              onOpenFilterCard={(card) => setActiveFilterCard(card)}
              onOpenDrilldown={(type, key, defaultFilter) => {
                setDrilldownType(type);
                setDrilldownKey(key);
                setDrilldownFilter(defaultFilter);
              }}
              onOpenBudgetGoalsModal={(goal) => {
                if (isReadOnlyPartner) {
                  notify('info', t.sharing.readOnlyToast);
                  return;
                }
                setEditingBudgetGoal(goal || null);
                setShowBudgetGoalsModal(true);
              }}
              onOpenSavingGoalsModal={(goal) => {
                if (isReadOnlyPartner) {
                  notify('info', t.sharing.readOnlyToast);
                  return;
                }
                setEditingSavingGoal(goal || null);
                setShowSavingGoalsModal(true);
              }}
              onDeleteTx={handleDeleteTx}
              onEditTx={handleEditTx}
              onResolveDebt={(tx) => {
                if (isReadOnlyPartner) {
                  notify('info', t.sharing.readOnlyToast);
                  return;
                }
                setResolvingTx(tx);
                setResolveWallet(allAccountOptions[0] || 'Cash');
                setPartialAmount(
                  String(tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount)
                );
                setPartialDate(getTodayISO());
              }}
              onInspectDebt={(tx) => setHistoryModalItem(tx)}
              onStartAddingTx={() => {
                if (isReadOnlyPartner) {
                  notify('info', t.sharing.readOnlyToast);
                  return;
                }
                setEntries([defaultEntry]);
                setActiveTab('transactions');
              }}
            />
          )}

          {activeTab === 'memo' && (
            <MemoNotepad
              memos={memos}
              notes={notes}
              expenseCategories={workspace.expenseCategories}
              allAccountOptions={allAccountOptions}
              currency={workspace.currency}
              onSaveMemo={handleSaveMemo}
              onDeleteMemo={handleDeleteMemo}
              onAddMemoAsExpense={handleAddMemoAsExpense}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onNotify={notify}
              navigationRequest={memoNavigationRequest}
              onNoteModalOpenChange={setIsNoteModalOpen}
              closeNoteModalSeq={closeNoteModalSeq}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionForm
              entries={entries}
              setEntries={setEntries}
              defaultEntry={defaultEntry}
              allAccountOptions={allAccountOptions}
              expenseCategories={workspace.expenseCategories}
              incomeCategories={workspace.incomeCategories}
              expenseSubCategories={normalizeExpenseSubCategories(workspace.expenseSubCategories)}
              categoryStyles={normalizeCategoryStyles(workspace.categoryStyles)}
              currency={workspace.currency}
              onSubmit={handleSubmitTransactions}
              onCancel={() => {
                setEntries([defaultEntry]);
                setActiveTab('home');
              }}
            />
          )}

          {activeTab === 'calculator' && <CalculatorView />}

          {activeTab === 'settings' && (
            <SettingsPanel
              settingsView={settingsView}
              setSettingsView={setSettingsView}
              currentUser={currentUser}
              isGuest={isGuest}
              language={currentLanguage}
              setLanguage={(l) => void handleLanguageChange(l, true)}
              themeMode={workspace.themeMode}
              setThemeMode={(mode) => updateWorkspace({ themeMode: mode })}
              currency={workspace.currency}
              setCurrency={(c) => updateWorkspace({ currency: c })}
              wallets={workspace.wallets}
              savingsList={workspace.savingsList}
              transactions={transactions}
              expenseCategories={workspace.expenseCategories}
              incomeCategories={workspace.incomeCategories}
              expenseSubCategories={normalizeExpenseSubCategories(workspace.expenseSubCategories)}
              categoryStyles={normalizeCategoryStyles(workspace.categoryStyles)}
              txCountByWallet={txCountByWallet}
              txCountByExpCategory={txCountByExpCategory}
              txCountByIncCategory={txCountByIncCategory}
              budgetGoalsCount={budgetGoals.length}
              savingGoalsCount={savingGoals.length}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onAddListItem={handleAddListItem}
              onReorderList={handleReorderList}
              onDeleteListItem={handleDeleteListItem}
              onEditListItem={(type, item) => {
                setEditingItem({ listType: type, oldName: item });
                setEditInputVal(item);
              }}
              onOpenCategoryStyle={(kind, name) => setEditingStyleTarget({ kind, name })}
              onAddSubCategory={handleAddSubCategory}
              onRenameSubCategory={(parentCat, oldSub) => {
                setEditingItem({ listType: 'sub_cat', oldName: oldSub, parentCategory: parentCat });
                setEditInputVal(oldSub);
              }}
              onDeleteSubCategory={handleDeleteSubCategory}
              onOpenBudgetGoals={() => {
                setEditingBudgetGoal(null);
                setShowBudgetGoalsModal(true);
              }}
              onOpenSavingGoals={() => {
                setEditingSavingGoal(null);
                setShowSavingGoalsModal(true);
              }}
              onExportBackup={handleExportBackup}
              onResetAllData={handleResetAllData}
              activeSharedWorkspace={activeSharedWorkspace}
              isReadOnlyPartner={isReadOnlyPartner}
              outgoingInvites={outgoingInvites}
              pendingIncomingInvites={pendingIncomingInvites}
              acceptedSharedWorkspaces={acceptedSharedWorkspaces}
              onSwitchToOwn={() => setActiveSharedWorkspace(null)}
              onSwitchToShared={(inv) => {
                setActiveSharedWorkspace({
                  inviteId: inv.id,
                  ownerUid: inv.ownerUid,
                  ownerName: inv.ownerName || inv.ownerEmail,
                  ownerEmail: inv.ownerEmail,
                  role: inv.role,
                });
                setActiveTab('home');
                setSettingsView('menu');
              }}
              onCreateEmailInvite={handleCreateEmailInvite}
              onCreateCodeInvite={handleCreateCodeInvite}
              onJoinByCode={handleJoinByCode}
              onAcceptInvite={handleAcceptInvite}
              onDeclineInvite={handleDeclineInvite}
              onUpdateInviteRole={handleUpdateInviteRole}
              onRevokeInvite={handleRevokeInvite}
              onDeleteInvite={handleDeleteInvite}
              onLeaveSharedWorkspace={handleLeaveSharedWorkspace}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;

          if (item.key === 'transactions') {
            return (
              <button
                key={item.key}
                type="button"
                aria-label={t.app.addTxAria}
                onClick={() => {
                  if (isReadOnlyPartner) {
                    notify('info', t.sharing.readOnlyToast);
                    return;
                  }
                  setEntries([defaultEntry]);
                  setActiveTab('transactions');
                }}
                className="flex h-full items-center justify-center"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full bg-[#16845B] text-white shadow-md transition-transform active:scale-95 ${
                    isReadOnlyPartner ? 'opacity-50' : ''
                  }`}
                >
                  <Plus className="h-5 w-5" />
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveTab(item.key);
                if (item.key === 'settings') setSettingsView('menu');
              }}
              className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                isActive
                  ? 'text-[#16845B] dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <FilterPeriodModal
        activeFilterCard={activeFilterCard}
        filters={filters}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        setCustomDateFrom={setCustomDateFrom}
        setCustomDateTo={setCustomDateTo}
        onSelectPeriod={(card, period) => {
          setFilters((prev) => ({ ...prev, [card]: period }));
          setActiveFilterCard(null);
        }}
        onApplyCustom={(card) => {
          if (!customDateFrom || !customDateTo) {
            notify('error', t.toasts.selectStartEndDates);
            return;
          }
          setFilters((prev) => ({ ...prev, [card]: 'custom' }));
          setActiveFilterCard(null);
        }}
        onClose={() => setActiveFilterCard(null)}
      />

      <DrilldownModal
        drilldownType={drilldownType}
        drilldownKey={drilldownKey}
        drilldownFilter={drilldownFilter}
        setDrilldownFilter={setDrilldownFilter}
        transactions={transactions}
        currency={workspace.currency}
        customDateFrom={customDateFrom}
        customDateTo={customDateTo}
        onStartBalanceCorrection={(accountName) => {
          if (isReadOnlyPartner) {
            notify('info', t.sharing.readOnlyToast);
            return;
          }
          setWalletToCorrect(accountName);
          setCorrectBalanceInput(String(walletBalances[accountName] || 0));
        }}
        onInspectDebt={(tx) => setHistoryModalItem(tx)}
        onClose={() => setDrilldownType(null)}
      />

      <DebtHistoryModal
        item={historyModalItem}
        allTransactions={transactions}
        currency={workspace.currency}
        onStartPayment={(tx) => {
          if (isReadOnlyPartner) {
            notify('info', t.sharing.readOnlyToast);
            return;
          }
          setResolvingTx(tx);
          setResolveWallet(allAccountOptions[0] || 'Cash');
          setPartialAmount(
            String(tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount)
          );
          setPartialDate(getTodayISO());
        }}
        onClose={() => setHistoryModalItem(null)}
      />

      <ResolveDebtModal
        resolvingTx={resolvingTx}
        partialDate={partialDate}
        setPartialDate={setPartialDate}
        partialAmount={partialAmount}
        setPartialAmount={setPartialAmount}
        resolveWallet={resolveWallet}
        setResolveWallet={setResolveWallet}
        allAccountOptions={allAccountOptions}
        currency={workspace.currency}
        onConfirm={handleConfirmPartialPayment}
        onClose={() => setResolvingTx(null)}
      />

      <CorrectBalanceModal
        accountName={walletToCorrect}
        previousBalance={walletToCorrect ? walletBalances[walletToCorrect] || 0 : 0}
        inputVal={correctBalanceInput}
        setInputVal={setCorrectBalanceInput}
        currency={workspace.currency}
        onSave={handleBalanceCorrection}
        onClose={() => setWalletToCorrect(null)}
      />

      <EditNameModal
        editingItem={editingItem}
        val={editInputVal}
        setVal={setEditInputVal}
        previewStyle={
          editingItem && editingItem.listType !== 'sub_cat'
            ? getCategoryStyle(
                workspace.categoryStyles,
                editingItem.listType === 'wallet'
                  ? 'wal'
                  : editingItem.listType === 'savings'
                  ? 'sav'
                  : editingItem.listType === 'exp_cat'
                  ? 'exp'
                  : 'inc',
                editingItem.oldName
              )
            : undefined
        }
        onEditStyle={
          editingItem && editingItem.listType !== 'sub_cat'
            ? () => {
                const kind: CategoryKind =
                  editingItem.listType === 'wallet'
                    ? 'wal'
                    : editingItem.listType === 'savings'
                    ? 'sav'
                    : editingItem.listType === 'exp_cat'
                    ? 'exp'
                    : 'inc';
                const name = editingItem.oldName;
                setEditingItem(null);
                setEditingStyleTarget({ kind, name });
              }
            : undefined
        }
        onStartMerge={
          editingItem &&
          (editingItem.listType === 'exp_cat' || editingItem.listType === 'inc_cat') &&
          (editingItem.listType === 'exp_cat'
            ? workspace.expenseCategories.length > 1
            : workspace.incomeCategories.length > 1)
            ? () => {
                const listType = editingItem.listType as 'exp_cat' | 'inc_cat';
                const catName = editingItem.oldName;
                const list =
                  listType === 'exp_cat'
                    ? workspace.expenseCategories
                    : workspace.incomeCategories;
                const txCount =
                  listType === 'exp_cat'
                    ? txCountByExpCategory[catName] || 0
                    : txCountByIncCategory[catName] || 0;
                setEditingItem(null);
                setMergeCategoryTarget({ listType, categoryName: catName, txCount });
                setMergeIntoCategory(list.find((c) => c !== catName) || '');
              }
            : undefined
        }
        onSave={handleSaveEditedListItem}
        onClose={() => setEditingItem(null)}
      />

      <MergeCategoryModal
        mergeTarget={mergeCategoryTarget}
        targetCategory={mergeIntoCategory}
        setTargetCategory={setMergeIntoCategory}
        availableCategories={
          mergeCategoryTarget?.listType === 'exp_cat'
            ? workspace.expenseCategories
            : workspace.incomeCategories
        }
        categoryStyles={workspace.categoryStyles}
        onConfirmMerge={handleConfirmMergeCategory}
        onClose={() => {
          setMergeCategoryTarget(null);
          setMergeIntoCategory('');
        }}
      />

      <TransferDeleteModal
        accountToDelete={accountToDelete}
        targetAccount={transferTargetAccount}
        setTargetAccount={setTransferTargetAccount}
        allAccountOptions={allAccountOptions}
        onConfirmTransferDelete={handleConfirmTransferAndDeleteAccount}
        onClose={() => setAccountToDelete(null)}
      />

      <CustomizeGridsModal
        open={showCustomizeModal}
        gridOrder={workspace.gridOrder}
        visibleGrids={workspace.visibleGrids}
        showAssistantButton={showAssistantButton}
        onToggleGrid={(key) =>
          updateWorkspace({
            visibleGrids: {
              ...workspace.visibleGrids,
              [key]: !workspace.visibleGrids[key],
            },
          })
        }
        onToggleAssistantButton={() => {
          setShowAssistantButton((prev) => {
            const next = !prev;
            try {
              localStorage.setItem('orthogro_show_assistant_v1', String(next));
            } catch {
              // ignore storage errors
            }
            return next;
          });
        }}
        onReorderGrids={(newOrder) => updateWorkspace({ gridOrder: newOrder })}
        onClose={() => setShowCustomizeModal(false)}
      />

      <BudgetGoalsModal
        open={showBudgetGoalsModal}
        initialGoal={editingBudgetGoal}
        budgetGoals={budgetGoals}
        expenseCategories={workspace.expenseCategories}
        monthlySpentByCategory={monthlySpentByCategory}
        currency={workspace.currency}
        onSaveGoal={handleSaveBudgetGoal}
        onDeleteGoal={handleDeleteBudgetGoal}
        onClose={() => {
          setShowBudgetGoalsModal(false);
          setEditingBudgetGoal(null);
        }}
      />

      <SavingGoalsModal
        open={showSavingGoalsModal}
        initialGoal={editingSavingGoal}
        savingGoals={savingGoals}
        savingsList={workspace.savingsList}
        transactions={transactions}
        currency={workspace.currency}
        onSaveGoal={handleSaveSavingGoal}
        onDeleteGoal={handleDeleteSavingGoal}
        onClose={() => {
          setShowSavingGoalsModal(false);
          setEditingSavingGoal(null);
        }}
      />

      <CategoryStyleModal
        target={editingStyleTarget}
        initialStyle={
          editingStyleTarget
            ? getCategoryStyle(
                workspace.categoryStyles,
                editingStyleTarget.kind,
                editingStyleTarget.name
              )
            : { icon: 'tag', color: '#16845B' }
        }
        onSave={handleSaveCategoryStyle}
        onClose={() => setEditingStyleTarget(null)}
      />

      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

      <AssistantDrawer
        isOpen={isAssistantOpen}
        onOpenChange={setIsAssistantOpen}
        showButton={
          showAssistantButton &&
          !showCustomizeModal &&
          !activeFilterCard &&
          !drilldownType &&
          !historyModalItem &&
          !resolvingTx &&
          !walletToCorrect &&
          !editingItem &&
          !mergeCategoryTarget &&
          !accountToDelete &&
          !showBudgetGoalsModal &&
          !showSavingGoalsModal &&
          !editingStyleTarget &&
          !confirmDialog
        }
        isReadOnlyPartner={isReadOnlyPartner}
        transactions={transactions}
        wallets={workspace.wallets}
        savingsList={workspace.savingsList}
        walletBalances={walletBalances}
        netWorth={assistantNetWorth}
        expenseCategories={workspace.expenseCategories}
        incomeCategories={workspace.incomeCategories}
        expenseSubCategories={workspace.expenseSubCategories}
        defaultEntry={defaultEntry}
        currency={workspace.currency}
        onSaveTransactions={(drafts) => saveTransactionDrafts(drafts, false)}
        onOpenTransactionsInForm={(drafts) => {
          setEntries(drafts);
          setActiveTab('transactions');
        }}
        onSaveMemo={(memoData) => handleSaveMemo(memoData)}
        onAddMemoAsExpense={handleAddMemoAsExpense}
        onSaveNote={(noteData) => handleSaveNote(noteData)}
        onNotify={notify}
        onNavigateAfterSave={(target) => {
          if (target === 'recent_transactions') {
            setActiveTab('home');
            window.setTimeout(() => {
              document
                .getElementById('recent-transactions-section')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 90);
          } else if (target === 'saved_memos') {
            setMemoNavigationRequest((prev) => ({
              tab: 'memo',
              scrollToSaved: true,
              seq: (prev?.seq || 0) + 1,
            }));
            setActiveTab('memo');
          } else if (target === 'saved_notes') {
            setMemoNavigationRequest((prev) => ({
              tab: 'notepad',
              scrollToSaved: false,
              seq: (prev?.seq || 0) + 1,
            }));
            setActiveTab('memo');
          }
        }}
      />
      </div>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <OrthoGroApp />
    </AppErrorBoundary>
  );
}
