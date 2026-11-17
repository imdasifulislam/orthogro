import React, { useEffect, useMemo, useState } from 'react';
import { Check, Landmark, Plus, Search, Sparkles, Wallet, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CategoryKind, CategoryStyle } from '../types';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIconBadge,
  getCategoryStyle,
  getSubCategoryTargetName,
} from '../utils/categoryVisuals';

export type TransactionPickerMode =
  | 'exp_cat'
  | 'inc_cat'
  | 'sub_cat'
  | 'account';

export type AddableItemKind = 'exp_cat' | 'inc_cat' | 'sub_cat' | 'wallet' | 'savings';

interface TransactionPickerDrawerProps {
  open: boolean;
  mode: TransactionPickerMode;
  title: string;
  selectedValue: string;
  parentCategory?: string;
  expenseCategories: string[];
  incomeCategories: string[];
  subCategories: string[];
  wallets: string[];
  savingsList: string[];
  allAccountOptions: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  isReadOnly?: boolean;
  onSelect: (value: string) => void;
  onCreateItem: (
    kind: AddableItemKind,
    name: string,
    parentCategory?: string,
    style?: CategoryStyle
  ) => Promise<boolean>;
  onClose: () => void;
}

const QUICK_ICON_KEYS: Record<AddableItemKind, string[]> = {
  exp_cat: [
    'utensils',
    'shopping-cart',
    'home',
    'car',
    'zap',
    'heart-pulse',
    'graduation-cap',
    'shopping-bag',
    'coffee',
    'tag',
  ],
  inc_cat: [
    'banknote',
    'briefcase',
    'laptop',
    'trending-up',
    'building-2',
    'gift',
    'award',
    'coins',
    'home',
    'sparkles',
  ],
  sub_cat: [
    'shopping-cart',
    'utensils',
    'coffee',
    'car',
    'fuel',
    'zap',
    'wifi',
    'pill',
    'shirt',
    'tag',
  ],
  wallet: [
    'wallet',
    'banknote',
    'landmark',
    'credit-card',
    'smartphone',
    'coins',
    'store',
    'briefcase',
  ],
  savings: [
    'piggy-bank',
    'landmark',
    'shield-check',
    'trending-up',
    'vault',
    'gem',
    'bar-chart-3',
    'key',
  ],
};

export const TransactionPickerDrawer: React.FC<TransactionPickerDrawerProps> = ({
  open,
  mode,
  title,
  selectedValue,
  parentCategory = '',
  expenseCategories,
  incomeCategories,
  subCategories,
  wallets,
  savingsList,
  allAccountOptions,
  categoryStyles,
  isReadOnly = false,
  onSelect,
  onCreateItem,
  onClose,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingKind, setCreatingKind] = useState<AddableItemKind | null>(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('tag');
  const [newColor, setNewColor] = useState('#16845B');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setCreatingKind(null);
      setNewName('');
      setShowStylePicker(false);
      setIsCreating(false);
    }
  }, [open, mode, title]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const savingsSet = useMemo(() => new Set(savingsList), [savingsList]);
  const walletSet = useMemo(() => new Set(wallets), [wallets]);
  const extraAccounts = useMemo(
    () => allAccountOptions.filter((acc) => !walletSet.has(acc) && !savingsSet.has(acc)),
    [allAccountOptions, walletSet, savingsSet]
  );

  const totalItemCount =
    mode === 'exp_cat'
      ? expenseCategories.length
      : mode === 'inc_cat'
      ? incomeCategories.length
      : mode === 'sub_cat'
      ? subCategories.length
      : wallets.length + savingsList.length + extraAccounts.length;

  const needle = searchQuery.trim().toLowerCase();

  const filterList = (list: string[]) =>
    needle ? list.filter((item) => item.toLowerCase().includes(needle)) : list;

  if (!open) return null;

  const startCreate = (kind: AddableItemKind) => {
    setCreatingKind(kind);
    setNewName('');
    setShowStylePicker(false);
    const defaultIcon =
      kind === 'wallet'
        ? 'wallet'
        : kind === 'savings'
        ? 'piggy-bank'
        : kind === 'inc_cat'
        ? 'coins'
        : kind === 'sub_cat' && parentCategory
        ? getCategoryStyle(categoryStyles, 'exp', parentCategory).icon
        : 'tag';
    const defaultColor =
      kind === 'sub_cat' && parentCategory
        ? getCategoryStyle(categoryStyles, 'exp', parentCategory).color
        : kind === 'savings'
        ? '#0284C7'
        : '#16845B';
    setNewIcon(defaultIcon);
    setNewColor(defaultColor);
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingKind || isCreating) return;
    const clean = newName.trim();
    if (!clean) return;
    setIsCreating(true);
    try {
      const styleToSave = showStylePicker ? { icon: newIcon, color: newColor } : undefined;
      const ok = await onCreateItem(creatingKind, clean, parentCategory, styleToSave);
      if (ok) {
        onSelect(clean);
        onClose();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getCreateLabel = (kind: AddableItemKind) => {
    if (kind === 'exp_cat' || kind === 'inc_cat') return t.txForm.drawerAddCategory;
    if (kind === 'sub_cat') return t.txForm.drawerAddSubCategory;
    if (kind === 'wallet') return t.txForm.drawerAddWallet;
    return t.txForm.drawerAddSavings;
  };

  const getCreatePlaceholder = (kind: AddableItemKind) => {
    if (kind === 'exp_cat' || kind === 'inc_cat') return t.txForm.drawerCategoryPlaceholder;
    if (kind === 'sub_cat') return t.txForm.drawerSubCategoryPlaceholder;
    if (kind === 'wallet') return t.txForm.drawerWalletPlaceholder;
    return t.txForm.drawerSavingsPlaceholder;
  };

  const renderTile = (
    item: string,
    kind: CategoryKind,
    styleName: string,
    keyPrefix: string
  ) => {
    const style = getCategoryStyle(categoryStyles, kind, styleName);
    const isSelected = selectedValue === item;
    return (
      <button
        key={`${keyPrefix}-${item}`}
        type="button"
        onClick={() => {
          onSelect(item);
          onClose();
        }}
        className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.98] ${
          isSelected
            ? 'border-[#16845B] bg-emerald-50/80 ring-1 ring-[#16845B]/30 dark:border-emerald-400 dark:bg-emerald-950/40'
            : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700 dark:hover:bg-slate-800/80'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <CategoryIconBadge style={style} size="sm" />
          <span
            className={`truncate text-xs font-bold ${
              isSelected
                ? 'text-[#16845B] dark:text-emerald-300'
                : 'text-[#102A43] dark:text-slate-100'
            }`}
          >
            {item}
          </span>
        </span>
        {isSelected && (
          <Check className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
        )}
      </button>
    );
  };

  const renderAddTile = (kind: AddableItemKind) => {
    if (isReadOnly) return null;
    return (
      <button
        type="button"
        onClick={() => startCreate(kind)}
        className="flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#16845B]/45 bg-emerald-50/40 px-3 py-2 text-xs font-bold text-[#16845B] transition-colors hover:bg-emerald-50 active:scale-[0.98] dark:border-emerald-500/40 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
      >
        <Plus className="h-4 w-4 shrink-0" />
        <span className="truncate">{getCreateLabel(kind)}</span>
      </button>
    );
  };

  const quickIconOptions = creatingKind
    ? CATEGORY_ICONS.filter((opt) => QUICK_ICON_KEYS[creatingKind].includes(opt.key))
    : [];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[84vh] w-full max-w-lg flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h3 className="truncate text-base font-bold text-[#102A43] dark:text-slate-100">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Optional Search when lists are large */}
        {!creatingKind && totalItemCount > 8 && (
          <div className="border-b border-slate-100 px-5 py-2.5 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.txForm.drawerSearchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-8 pl-8 text-xs text-[#102A43] placeholder:text-slate-400 focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t.common.close}
                  className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {creatingKind ? (
            <form onSubmit={handleConfirmCreate} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#102A43] dark:text-slate-100">
                  <CategoryIconBadge style={{ icon: newIcon, color: newColor }} size="sm" />
                  <span>{getCreateLabel(creatingKind)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingKind(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {t.common.cancel}
                </button>
              </div>

              <div>
                <input
                  type="text"
                  autoFocus
                  maxLength={100}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={getCreatePlaceholder(creatingKind)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-[#102A43] placeholder:text-slate-400 focus:border-[#16845B] focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowStylePicker((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16845B] hover:underline dark:text-emerald-400"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    {showStylePicker
                      ? t.txForm.drawerHideStylePick
                      : t.txForm.drawerCustomizeStyle}
                  </span>
                </button>

                {showStylePicker && (
                  <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex flex-wrap gap-1.5">
                      {quickIconOptions.map((opt) => {
                        const Icon = opt.icon;
                        const active = newIcon === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setNewIcon(opt.key)}
                            aria-label={opt.label}
                            title={opt.label}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                              active
                                ? 'border-[#16845B] bg-emerald-50 text-[#16845B] dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_COLORS.slice(0, 12).map((hex) => {
                        const active = newColor.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            type="button"
                            aria-label={`Color ${hex}`}
                            onClick={() => setNewColor(hex)}
                            style={{ backgroundColor: hex }}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                              active
                                ? 'ring-2 ring-[#102A43] ring-offset-1 dark:ring-slate-100 dark:ring-offset-slate-900'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                          >
                            {active && <Check className="h-3.5 w-3.5 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isCreating || !newName.trim()}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#16845B] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] disabled:opacity-50"
              >
                {isCreating ? t.common.saving : t.txForm.drawerCreateAndSelect}
              </button>
            </form>
          ) : mode === 'account' ? (
            <div className="space-y-5">
              {/* Wallets Group */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Wallet className="h-3.5 w-3.5 text-[#16845B] dark:text-emerald-400" />
                  <span>{t.dashboard.wallets}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filterList([...wallets, ...extraAccounts]).map((wal) =>
                    renderTile(wal, 'wal', wal, 'wal')
                  )}
                  {renderAddTile('wallet')}
                </div>
              </div>

              {/* Savings & Investments Group */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Landmark className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t.dashboard.savingsInvestments}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filterList(savingsList).map((sav) => renderTile(sav, 'sav', sav, 'sav'))}
                  {renderAddTile('savings')}
                </div>
              </div>
            </div>
          ) : mode === 'sub_cat' ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  onClose();
                }}
                className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left transition-all ${
                  selectedValue === ''
                    ? 'border-[#16845B] bg-emerald-50/80 ring-1 ring-[#16845B]/30 dark:border-emerald-400 dark:bg-emerald-950/40'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:bg-slate-800/80'
                }`}
              >
                <span
                  className={`text-xs font-bold ${
                    selectedValue === ''
                      ? 'text-[#16845B] dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.txForm.subCategoryOptional}
                </span>
                {selectedValue === '' && (
                  <Check className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {filterList(subCategories).map((sub) =>
                  renderTile(
                    sub,
                    'sub',
                    getSubCategoryTargetName(parentCategory, sub),
                    'sub'
                  )
                )}
                {renderAddTile('sub_cat')}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filterList(mode === 'exp_cat' ? expenseCategories : incomeCategories).map((cat) =>
                renderTile(cat, mode === 'exp_cat' ? 'exp' : 'inc', cat, mode)
              )}
              {renderAddTile(mode === 'exp_cat' ? 'exp_cat' : 'inc_cat')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
