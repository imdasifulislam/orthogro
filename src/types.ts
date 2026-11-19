export type TransactionType =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'lend'
  | 'borrow'
  | 'partial_payment'
  | 'correction'
  | 'adjustment';

export type CurrencySymbol = '৳' | '$' | '€' | '£' | 'SAR' | '₹';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AppLanguage = 'en' | 'bn';

export type PeriodFilter = 'all' | 'monthly' | 'previous_month' | 'yearly' | 'custom';

export type GridKey =
  | 'netWorth'
  | 'wallets'
  | 'savings'
  | 'incExp'
  | 'lendBorrow'
  | 'budgetGoals'
  | 'categoryReport'
  | 'categoryPieChart'
  | 'transactions';

export type ActiveTab = 'home' | 'memo' | 'transactions' | 'calculator' | 'settings';

export type SettingsView =
  | 'menu'
  | 'accounts_categories'
  | 'pro_features'
  | 'wallets'
  | 'savings'
  | 'exp_cat'
  | 'inc_cat'
  | 'tax_report'
  | 'shared_access';

export type CategoryKind = 'exp' | 'inc' | 'sav' | 'wal' | 'sub';

export interface CategoryStyle {
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  ownerId?: string;
  title: string;
  amount: number;
  type: TransactionType;
  category?: string;
  subCategory?: string;
  wallet?: string;
  fromWallet?: string;
  toWallet?: string;
  charge?: number;
  remainingBalance?: number;
  parentId?: string;
  parentTitle?: string;
  isLendPay?: boolean;
  note?: string;
  date: string;
  rawDate: string;
  resolved: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TransactionDraft {
  id: string | null;
  title: string;
  amount: string;
  type: 'expense' | 'income' | 'transfer' | 'lend' | 'borrow';
  category: string;
  subCategory: string;
  wallet: string;
  fromWallet: string;
  toWallet: string;
  useCharge: boolean;
  charge: string;
  date: string;
  note: string;
}

export interface BazarMemoItem {
  name: string;
  price: number;
  qty?: string;
  checked?: boolean;
}

export interface BazarMemo {
  id: string;
  ownerId?: string;
  date: string;
  category: string;
  subCategory?: string;
  wallet: string;
  note?: string;
  items: BazarMemoItem[];
  total: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserNote {
  id: string;
  ownerId?: string;
  title: string;
  content: string;
  date: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetGoal {
  id: string;
  ownerId?: string;
  category: string;
  monthlyLimit: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SavingGoalPeriodType = 'monthly' | 'period';

export interface SavingGoal {
  id: string;
  ownerId?: string;
  title: string;
  account?: string;
  periodType: SavingGoalPeriodType;
  targetAmount: number;
  startDate?: string;
  endDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type RecurringBillType = 'expense' | 'income';

export interface RecurringBill {
  id: string;
  ownerId?: string;
  title: string;
  type: RecurringBillType;
  amount: number;
  category: string;
  subCategory?: string;
  wallet: string;
  dueDay: number;
  lastPaidMonth?: string;
  lastPaidDate?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WorkspaceSettings {
  wallets: string[];
  savingsList: string[];
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  categoryStyles?: Record<string, CategoryStyle>;
  currency: CurrencySymbol;
  themeMode: ThemeMode;
  language?: AppLanguage;
  gridOrder: GridKey[];
  visibleGrids: Record<GridKey, boolean>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  requireConfirmationText?: string;
  confirmationHint?: string;
  keepOpenOnConfirm?: boolean;
  onConfirm: () => void | Promise<void>;
}

export type FilterCardKey =
  | 'netWorth'
  | 'lendBorrow'
  | 'incExp'
  | 'categoryReport'
  | 'categoryPieChart';

export type DrilldownType =
  | 'netWorth'
  | 'wallet'
  | 'savings'
  | 'income'
  | 'expense'
  | 'expense_category'
  | 'income_category'
  | 'lend'
  | 'borrow';

export interface DrilldownPeriodContext {
  monthOffset?: number;
  yearOffset?: number;
  customOffset?: number;
  periodLabel?: string;
}

export type ShareRole = 'viewer' | 'editor';
export type ShareInviteType = 'email' | 'code';
export type ShareInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface ShareInvite {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  inviteType: ShareInviteType;
  targetEmail: string;
  code: string;
  role: ShareRole;
  status: ShareInviteStatus;
  partnerUid: string;
  partnerEmail: string;
  partnerName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActiveSharedWorkspace {
  inviteId: string;
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  role: ShareRole;
}

export type FeatureTipId =
  | 'saving_goals'
  | 'bazar_memo'
  | 'budget_goals'
  | 'recurring_bills'
  | 'floating_assistant'
  | 'category_pie_chart'
  | 'tax_report'
  | 'shared_access';

export interface SavingsMilestoneEvent {
  id: string;
  kind: 'amount' | 'goal';
  threshold?: number;
  goalTitle?: string;
}
