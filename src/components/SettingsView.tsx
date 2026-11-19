import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Cloud,
  Coins,
  CornerDownRight,
  ExternalLink,
  FileBarChart2,
  FolderKanban,
  GripVertical,
  Landmark,
  Languages,
  Lock,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  PiggyBank,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  SunMoon,
  Target,
  Trash2,
  TrendingUp,
  User as UserIcon,
  Users,
  Wallet,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type {
  ActiveSharedWorkspace,
  AppLanguage,
  CategoryKind,
  CategoryStyle,
  CurrencySymbol,
  SettingsView as SettingsViewType,
  ShareInvite,
  ShareRole,
  ThemeMode,
  Transaction,
} from '../types';
import {
  CategoryIconBadge,
  getCategoryStyle,
  getSubCategoryTargetName,
} from '../utils/categoryVisuals';
import { PWAInstallButton } from './PWAInstallButton';
import { SharedAccessView } from './SharedAccessView';
import { TaxReportView } from './TaxReportView';
import type { PinLength } from '../utils/appPin';

interface SettingsViewProps {
  settingsView: SettingsViewType;
  setSettingsView: (view: SettingsViewType) => void;
  currentUser: User | null;
  isGuest: boolean;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  currency: CurrencySymbol;
  setCurrency: (c: CurrencySymbol) => void;
  wallets: string[];
  savingsList: string[];
  transactions: Transaction[];
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories: Record<string, string[]>;
  categoryStyles: Record<string, CategoryStyle>;
  txCountByWallet: Record<string, number>;
  txCountByExpCategory: Record<string, number>;
  txCountByIncCategory: Record<string, number>;
  budgetGoalsCount: number;
  savingGoalsCount: number;
  recurringBillsCount: number;
  dueRecurringCount: number;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onAddListItem: (type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat', name: string) => void;
  onReorderList: (type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat', updated: string[]) => void;
  onDeleteListItem: (type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat', item: string) => void;
  onEditListItem: (type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat', item: string) => void;
  onOpenCategoryStyle: (kind: CategoryKind, name: string) => void;
  onAddSubCategory: (parentCat: string, subName: string) => void;
  onRenameSubCategory: (parentCat: string, oldSub: string) => void;
  onDeleteSubCategory: (parentCat: string, subName: string) => void;
  onOpenBudgetGoals: () => void;
  onOpenSavingGoals: () => void;
  onOpenRecurringBills: () => void;
  appPinEnabled: boolean;
  appPinLength?: PinLength;
  onOpenAppLock: () => void;
  onResetAllData: () => void;
  activeSharedWorkspace: ActiveSharedWorkspace | null;
  isReadOnlyPartner: boolean;
  outgoingInvites: ShareInvite[];
  pendingIncomingInvites: ShareInvite[];
  acceptedSharedWorkspaces: ShareInvite[];
  onSwitchToOwn: () => void;
  onSwitchToShared: (invite: ShareInvite) => void;
  onCreateEmailInvite: (email: string, role: ShareRole) => Promise<boolean>;
  onCreateCodeInvite: (role: ShareRole) => Promise<string | null>;
  onJoinByCode: (code: string) => Promise<boolean>;
  onAcceptInvite: (invite: ShareInvite) => Promise<void>;
  onDeclineInvite: (invite: ShareInvite) => Promise<void>;
  onUpdateInviteRole: (invite: ShareInvite, role: ShareRole) => Promise<void>;
  onRevokeInvite: (invite: ShareInvite) => Promise<void>;
  onDeleteInvite: (invite: ShareInvite) => Promise<void>;
  onLeaveSharedWorkspace: (invite: ShareInvite) => Promise<void>;
  onOpenShareApp: () => void;
  onOpenVideoTutorial: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settingsView,
  setSettingsView,
  currentUser,
  isGuest,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  currency,
  setCurrency,
  wallets,
  savingsList,
  transactions,
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  categoryStyles,
  txCountByWallet,
  txCountByExpCategory,
  txCountByIncCategory,
  budgetGoalsCount,
  savingGoalsCount,
  recurringBillsCount,
  dueRecurringCount,
  onGoogleLogin,
  onGoogleLogout,
  onAddListItem,
  onReorderList,
  onDeleteListItem,
  onEditListItem,
  onOpenCategoryStyle,
  onAddSubCategory,
  onRenameSubCategory,
  onDeleteSubCategory,
  onOpenBudgetGoals,
  onOpenSavingGoals,
  onOpenRecurringBills,
  appPinEnabled,
  appPinLength,
  onOpenAppLock,
  onResetAllData,
  activeSharedWorkspace,
  isReadOnlyPartner,
  outgoingInvites,
  pendingIncomingInvites,
  acceptedSharedWorkspaces,
  onSwitchToOwn,
  onSwitchToShared,
  onCreateEmailInvite,
  onCreateCodeInvite,
  onJoinByCode,
  onAcceptInvite,
  onDeclineInvite,
  onUpdateInviteRole,
  onRevokeInvite,
  onDeleteInvite,
  onLeaveSharedWorkspace,
  onOpenShareApp,
  onOpenVideoTutorial,
}) => {
  const { t } = useTranslation();
  const [newItemInput, setNewItemInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedExpCat, setExpandedExpCat] = useState<string | null>('Family Maintenance');
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});

  const cycleTheme = () => {
    const next: ThemeMode =
      themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(next);
  };

  const themeLabel =
    themeMode === 'dark'
      ? t.settings.themeDark
      : themeMode === 'light'
      ? t.settings.themeLight
      : t.settings.themeSystem;

  const kindByListType: Record<'wallet' | 'savings' | 'exp_cat' | 'inc_cat', CategoryKind> = {
    wallet: 'wal',
    savings: 'sav',
    exp_cat: 'exp',
    inc_cat: 'inc',
  };

  const renderReorderableList = (
    type: 'wallet' | 'savings' | 'exp_cat' | 'inc_cat',
    title: string,
    placeholder: string,
    items: string[],
    countMap: Record<string, number>
  ) => {
    const styleKind = kindByListType[type];

    const commitReorder = (fromIndex: number | null, toIndex: number | null) => {
      if (
        fromIndex === null ||
        toIndex === null ||
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= items.length ||
        toIndex >= items.length
      ) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }
      const copy = [...items];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      onReorderList(type, copy);
      setDraggedIndex(null);
      setDragOverIndex(null);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (draggedIndex === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const row = el?.closest('[data-reorder-idx]') as HTMLElement | null;
      if (row) {
        const idxAttr = Number(row.dataset.reorderIdx);
        if (Number.isInteger(idxAttr)) {
          setDragOverIndex(idxAttr);
        }
      }
    };

    const sectionIconMeta = {
      wallet: {
        icon: Wallet,
        iconBg: 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400',
      },
      savings: {
        icon: Landmark,
        iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      },
      exp_cat: {
        icon: ShoppingBag,
        iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
      },
      inc_cat: {
        icon: TrendingUp,
        iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
      },
    }[type];
    const SectionIcon = sectionIconMeta.icon;

    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => {
            setNewItemInput('');
            setSettingsView('accounts_categories');
          }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.settings.backToAccountsCategories}
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${sectionIconMeta.iconBg}`}
          >
            <SectionIcon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.settings.reorderHint}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const itemStyle = getCategoryStyle(categoryStyles, styleKind, item);
            const subCats = type === 'exp_cat' ? expenseSubCategories[item] || [] : [];
            const isExpanded = type === 'exp_cat' && expandedExpCat === item;
            const isDragging = draggedIndex === idx;
            const isDragTarget = dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;

            return (
              <div
                key={item}
                data-reorder-idx={idx}
                draggable
                onDragStart={() => {
                  setDraggedIndex(idx);
                  setDragOverIndex(idx);
                }}
                onDragEnter={() => {
                  if (draggedIndex !== null) setDragOverIndex(idx);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  commitReorder(draggedIndex, idx);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className={`rounded-xl border px-3 py-2.5 transition-all dark:bg-slate-950/60 ${
                  isDragTarget
                    ? 'border-[#16845B] bg-emerald-50/50 ring-2 ring-[#16845B]/30 dark:border-emerald-400 dark:bg-emerald-950/30'
                    : isDragging
                    ? 'border-slate-300 bg-slate-100 opacity-60 dark:border-slate-700 dark:bg-slate-900'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={`${t.settings.dragToReorderAria}: ${item}`}
                      title={t.settings.dragToReorderAria}
                      onTouchStart={() => {
                        setDraggedIndex(idx);
                        setDragOverIndex(idx);
                      }}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => commitReorder(draggedIndex, dragOverIndex)}
                      onTouchCancel={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className="flex h-9 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenCategoryStyle(styleKind, item)}
                      title={t.settings.editIconColorAria}
                      aria-label={`${t.settings.editIconColorAria}: ${item}`}
                      className="shrink-0 rounded-xl transition-transform hover:scale-105 active:scale-95"
                    >
                      <CategoryIconBadge style={itemStyle} size="md" />
                    </button>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                        {item}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          {countMap[item] || 0} {t.settings.transactionsCount}
                        </span>
                        {type === 'exp_cat' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExpCat((prev) => (prev === item ? null : item))
                              }
                              aria-expanded={isExpanded}
                              className="inline-flex items-center gap-1 font-semibold text-[#16845B] hover:underline dark:text-emerald-400"
                            >
                              <span>
                                {subCats.length > 0
                                  ? `${subCats.length} ${
                                      subCats.length === 1
                                        ? t.settings.subCategorySingular
                                        : t.settings.subCategoriesLabel.toLowerCase()
                                    }`
                                  : t.settings.addSubCategoryAction}
                              </span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditListItem(type, item)}
                      aria-label={`${t.common.edit} ${item}`}
                      title={t.common.edit}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteListItem(type, item)}
                      aria-label={`${t.common.delete} ${item}`}
                      title={t.common.delete}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable Sub-Categories for Expense Categories */}
                {isExpanded && (
                  <div className="mt-3 border-t border-slate-200 pt-3 pl-2 sm:pl-9 dark:border-slate-800">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <CornerDownRight className="h-3.5 w-3.5 text-[#16845B] dark:text-emerald-400" />
                      <span>
                        {t.settings.subCategoriesLabel} ({subCats.length})
                      </span>
                    </div>

                    {subCats.length === 0 ? (
                      <p className="mb-2.5 text-xs text-slate-400 dark:text-slate-500">
                        {t.settings.noSubCategories}
                      </p>
                    ) : (
                      <div className="mb-2.5 space-y-1.5">
                        {subCats.map((sub) => {
                          const subTargetName = getSubCategoryTargetName(item, sub);
                          const subStyle = getCategoryStyle(categoryStyles, 'sub', subTargetName);
                          return (
                            <div
                              key={sub}
                              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-900"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenCategoryStyle('sub', subTargetName)}
                                  title={t.settings.editIconColorAria}
                                  aria-label={`${t.settings.editIconColorAria}: ${sub}`}
                                  className="shrink-0 rounded-lg transition-transform hover:scale-105 active:scale-95"
                                >
                                  <CategoryIconBadge style={subStyle} size="sm" />
                                </button>
                                <span className="truncate text-xs font-semibold text-[#102A43] dark:text-slate-200">
                                  {sub}
                                </span>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onRenameSubCategory(item, sub)}
                                  aria-label={`Rename ${sub}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteSubCategory(item, sub)}
                                  aria-label={`Delete ${sub}`}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const val = (newSubInputs[item] || '').trim();
                        if (!val) return;
                        onAddSubCategory(item, val);
                        setNewSubInputs((prev) => ({ ...prev, [item]: '' }));
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        maxLength={100}
                        placeholder={t.settings.addSubCategoryPlaceholder}
                        value={newSubInputs[item] || ''}
                        onChange={(e) =>
                          setNewSubInputs((prev) => ({ ...prev, [item]: e.target.value }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-[#16845B] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#126B4A] whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t.common.add}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newItemInput.trim()) return;
            onAddListItem(type, newItemInput.trim());
            setNewItemInput('');
          }}
          className="mt-4 flex gap-2"
        >
          <input
            type="text"
            maxLength={100}
            placeholder={placeholder}
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-[#16845B] px-4 py-2 text-sm font-bold text-white hover:bg-[#126B4A] whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            {t.common.add}
          </button>
        </form>
      </div>
    );
  };

  const accountsAndCategoriesItems = [
    {
      key: 'wallets',
      label: t.settings.manageWallets,
      count: wallets.length,
      icon: Wallet,
      iconBg: 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400',
    },
    {
      key: 'savings',
      label: t.settings.savingsInvestments,
      count: savingsList.length,
      icon: Landmark,
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
    },
    {
      key: 'exp_cat',
      label: t.settings.expenseCategories,
      count: expenseCategories.length,
      icon: ShoppingBag,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    },
    {
      key: 'inc_cat',
      label: t.settings.incomeCategories,
      count: incomeCategories.length,
      icon: TrendingUp,
      iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400',
    },
  ] as const;

  if (settingsView === 'accounts_categories') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setSettingsView('menu')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.settings.backToSettings}
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <FolderKanban className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.settings.accountsAndCategories}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.settings.accountsAndCategoriesDesc}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {accountsAndCategoriesItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSettingsView(item.key)}
                className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.iconBg}`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.count} {t.settings.configured}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (settingsView === 'pro_features') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setSettingsView('menu')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#16845B] hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.settings.backToSettings}
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#102A43] dark:text-slate-100">
              {t.settings.proFeatures}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.settings.proFeaturesDesc}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {!isReadOnlyPartner && (
            <>
              {/* Monthly Budget Goals */}
              <button
                type="button"
                onClick={onOpenBudgetGoals}
                className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Target className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {t.settings.monthlyBudgetGoals}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {budgetGoalsCount}{' '}
                      {budgetGoalsCount === 1 ? t.common.categorySingular : t.common.categories}{' '}
                      {t.settings.tracked}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>

              {/* Saving Goals */}
              <button
                type="button"
                onClick={onOpenSavingGoals}
                className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                    <PiggyBank className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {t.settings.savingGoals}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {savingGoalsCount}{' '}
                      {savingGoalsCount === 1 ? t.settings.goalSingular : t.settings.goalsPlural}{' '}
                      {t.settings.tracked}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>

              {/* Recurring Bills */}
              <button
                type="button"
                onClick={onOpenRecurringBills}
                className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                    <Repeat className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {t.settings.recurringBills}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {recurringBillsCount}{' '}
                      {recurringBillsCount === 1
                        ? t.settings.billSingular
                        : t.settings.billsPlural}{' '}
                      {t.settings.tracked}
                      {dueRecurringCount > 0 && (
                        <span className="ml-1.5 font-bold text-amber-600 dark:text-amber-400">
                          · {dueRecurringCount} {t.settings.recurringDueSuffix}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </>
          )}

          {/* Tax Year Report (July 1 – June 30) */}
          <button
            type="button"
            onClick={() => setSettingsView('tax_report')}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                <FileBarChart2 className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.settings.taxYearReport}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {t.settings.taxYearReportDesc}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {/* App Lock (Optional Startup PIN) */}
          <button
            type="button"
            onClick={onOpenAppLock}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  appPinEnabled
                    ? 'bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                }`}
              >
                {appPinEnabled ? (
                  <ShieldCheck className="h-[18px] w-[18px]" />
                ) : (
                  <Lock className="h-[18px] w-[18px]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.settings.appLockTitle}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {appPinEnabled
                    ? appPinLength === 6
                      ? t.settings.appLockDescOn6
                      : t.settings.appLockDescOn4
                    : t.settings.appLockDescOff}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  if (settingsView === 'wallets') {
    return renderReorderableList(
      'wallet',
      t.settings.manageWallets,
      t.settings.newWalletPlaceholder,
      wallets,
      txCountByWallet
    );
  }
  if (settingsView === 'savings') {
    return renderReorderableList(
      'savings',
      t.settings.savingsInvestments,
      t.settings.newSavingsPlaceholder,
      savingsList,
      txCountByWallet
    );
  }
  if (settingsView === 'exp_cat') {
    return renderReorderableList(
      'exp_cat',
      t.settings.expenseCategories,
      t.settings.newExpCatPlaceholder,
      expenseCategories,
      txCountByExpCategory
    );
  }
  if (settingsView === 'inc_cat') {
    return renderReorderableList(
      'inc_cat',
      t.settings.incomeCategories,
      t.settings.newIncCatPlaceholder,
      incomeCategories,
      txCountByIncCategory
    );
  }
  if (settingsView === 'tax_report') {
    return (
      <TaxReportView
        transactions={transactions}
        wallets={wallets}
        savingsList={savingsList}
        categoryStyles={categoryStyles}
        currency={currency}
        onBack={() => setSettingsView('pro_features')}
        backLabel={t.settings.backToProFeatures}
      />
    );
  }
  if (settingsView === 'shared_access') {
    return (
      <SharedAccessView
        currentUser={currentUser}
        activeSharedWorkspace={activeSharedWorkspace}
        outgoingInvites={outgoingInvites}
        pendingIncomingInvites={pendingIncomingInvites}
        acceptedSharedWorkspaces={acceptedSharedWorkspaces}
        onBack={() => setSettingsView('menu')}
        onGoogleLogin={onGoogleLogin}
        onSwitchToOwn={onSwitchToOwn}
        onSwitchToShared={onSwitchToShared}
        onCreateEmailInvite={onCreateEmailInvite}
        onCreateCodeInvite={onCreateCodeInvite}
        onJoinByCode={onJoinByCode}
        onAcceptInvite={onAcceptInvite}
        onDeclineInvite={onDeclineInvite}
        onUpdateInviteRole={onUpdateInviteRole}
        onRevokeInvite={onRevokeInvite}
        onDeleteInvite={onDeleteInvite}
        onLeaveSharedWorkspace={onLeaveSharedWorkspace}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#102A43] dark:text-slate-100">
            {t.settings.title}
          </h2>
          <PWAInstallButton />
        </div>

        <div className="space-y-3">
          {/* Account card */}
          {currentUser ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex min-w-0 items-center gap-3">
                <Cloud className="h-5 w-5 shrink-0 text-[#16845B] dark:text-emerald-400" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#16845B] dark:text-emerald-400">
                    {t.settings.cloudSyncActive}
                  </div>
                  <div className="truncate text-xs text-slate-600 dark:text-slate-300">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoogleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400 whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t.settings.signOut}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
                <div>
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {isGuest ? t.settings.guestModeTitle : t.settings.notSignedIn}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    {t.settings.syncHint}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3 py-2 text-xs font-bold text-white hover:bg-[#126B4A] whitespace-nowrap shrink-0"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  {t.settings.connectGoogle}
                </button>
                {isGuest && (
                  <button
                    type="button"
                    onClick={onGoogleLogout}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 whitespace-nowrap shrink-0"
                  >
                    {t.settings.exitGuest}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Language (BN / EN) */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
                <Languages className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.settings.languageLabel}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'bn' ? t.settings.languageDescBn : t.settings.languageDescEn}
                </div>
              </div>
            </div>

            <div
              role="group"
              aria-label={t.settings.languageLabel}
              className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={`min-h-[34px] rounded-lg px-3.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  language === 'en'
                    ? 'bg-[#16845B] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                aria-pressed={language === 'bn'}
                className={`min-h-[34px] rounded-lg px-3.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  language === 'bn'
                    ? 'bg-[#16845B] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                BN
              </button>
            </div>
          </div>

          {/* Theme Mode */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-[#102A43] dark:bg-slate-800 dark:text-slate-200">
                {themeMode === 'dark' ? (
                  <Moon className="h-[18px] w-[18px]" />
                ) : themeMode === 'light' ? (
                  <Sun className="h-[18px] w-[18px]" />
                ) : (
                  <Monitor className="h-[18px] w-[18px]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                  {t.settings.themeMode}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{themeLabel}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={t.settings.switchTheme}
              title={`${t.settings.switchTheme} (${themeLabel})`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#102A43] transition-colors hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <SunMoon className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Coins className="h-[18px] w-[18px]" />
              </div>
              <div className="truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                {t.settings.displayCurrency}
              </div>
            </div>
            <select
              value={currency}
              disabled={isReadOnlyPartner}
              onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#102A43] focus:border-[#16845B] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="৳">৳ BDT</option>
              <option value="$">$ USD</option>
              <option value="€">€ EUR</option>
              <option value="£">£ GBP</option>
              <option value="SAR">SAR</option>
              <option value="₹">₹ INR</option>
            </select>
          </div>

          {!isReadOnlyPartner && (
            /* Parent menu for Wallets, Savings & Categories */
            <button
              type="button"
              onClick={() => setSettingsView('accounts_categories')}
              className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <FolderKanban className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                    {t.settings.accountsAndCategories}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {t.settings.accountsAndCategoriesDesc}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          )}

          {/* Parent menu for Pro Features (Budget Goals, Saving Goals, Recurring Bills, Tax Report) */}
          <button
            type="button"
            onClick={() => setSettingsView('pro_features')}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                <Sparkles className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                    {t.settings.proFeatures}
                  </span>
                  {!isReadOnlyPartner && dueRecurringCount > 0 && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                      {dueRecurringCount} {t.settings.recurringDueSuffix}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {t.settings.proFeaturesDesc}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          {/* Shared Access (Live Partner Sharing) */}
          <button
            type="button"
            onClick={() => setSettingsView('shared_access')}
            className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                    {t.settings.sharedAccess}
                  </span>
                  {pendingIncomingInvites.length > 0 && (
                    <span className="rounded-md bg-[#16845B] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {pendingIncomingInvites.length}
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {t.settings.sharedAccessDesc}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {/* Data Reset */}
        {!activeSharedWorkspace && (
          <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onResetAllData}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
            >
              <RotateCcw className="h-4 w-4" />
              {t.settings.resetAllData}
            </button>
          </div>
        )}
      </div>

      {/* Social Media */}
      <section
        aria-labelledby="settings-social-media-heading"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3.5">
          <h3
            id="settings-social-media-heading"
            className="text-sm font-bold text-[#102A43] dark:text-slate-100"
          >
            {t.settings.socialMedia}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {t.settings.socialMediaDesc}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <a
            href="https://www.facebook.com/OrthoGro"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-[#1877F2]/40 hover:bg-[#1877F2]/[0.05] sm:gap-3 sm:px-4 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-[#1877F2]/50 dark:hover:bg-[#1877F2]/10"
          >
            <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1877F2] text-white shadow-xs sm:h-9 sm:w-9">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-[17px] w-[17px] fill-current sm:h-[18px] sm:w-[18px]"
                >
                  <path d="M13.5 21v-7.5h2.52l.38-2.93H13.5V8.7c0-.85.24-1.43 1.45-1.43h1.55V4.64A20.7 20.7 0 0 0 14.24 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.19H8v2.93h2.47V21h3.03Z" />
                </svg>
              </span>
              <span className="truncate text-xs font-bold text-[#102A43] whitespace-nowrap sm:text-sm dark:text-slate-100">
                {t.settings.facebook}
              </span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
          </a>

          <a
            href="https://www.instagram.com/orthogro/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-pink-400/50 hover:bg-pink-500/[0.05] sm:gap-3 sm:px-4 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10"
          >
            <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-xs sm:h-9 sm:w-9">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]"
                >
                  <rect width="18" height="18" x="3" y="3" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="truncate text-xs font-bold text-[#102A43] whitespace-nowrap sm:text-sm dark:text-slate-100">
                {t.settings.instagram}
              </span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:h-4 sm:w-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={onOpenVideoTutorial}
          className="mt-2.5 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left transition-colors hover:border-rose-300/70 hover:bg-rose-50/40 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/20"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shadow-xs dark:bg-rose-950/60 dark:text-rose-400">
              <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                {t.settings.appGuideBtn}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t.settings.appGuideDesc}
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onOpenShareApp}
          className="mt-2.5 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-2.5 text-left transition-colors hover:border-[#16845B]/50 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:border-emerald-700/60 dark:hover:bg-emerald-950/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#16845B] text-white shadow-xs">
              <Share2 className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#102A43] dark:text-slate-100">
                {t.settings.shareAppBtn}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {t.settings.shareAppBtnDesc}
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </section>
    </div>
  );
};
