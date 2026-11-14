import React from 'react';
import {
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Coins,
  Gamepad2,
  Gift,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  type LucideIcon,
  PiggyBank,
  Plane,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Users,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react';
import type { CategoryKind, CategoryStyle } from '../types';

export interface CategoryIconOption {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_ICONS: CategoryIconOption[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'shopping-cart', label: 'Shopping', icon: ShoppingCart },
  { key: 'utensils', label: 'Food', icon: Utensils },
  { key: 'zap', label: 'Utilities', icon: Zap },
  { key: 'heart-pulse', label: 'Health', icon: HeartPulse },
  { key: 'graduation-cap', label: 'Education', icon: GraduationCap },
  { key: 'users', label: 'Family', icon: Users },
  { key: 'user', label: 'Personal', icon: User },
  { key: 'briefcase', label: 'Career', icon: Briefcase },
  { key: 'laptop', label: 'Freelance', icon: Laptop },
  { key: 'hand-heart', label: 'Charity', icon: HandHeart },
  { key: 'tag', label: 'Category', icon: Tag },
  { key: 'shield-check', label: 'Emergency', icon: ShieldCheck },
  { key: 'piggy-bank', label: 'Savings', icon: PiggyBank },
  { key: 'landmark', label: 'Deposit', icon: Landmark },
  { key: 'gamepad-2', label: 'Hobby', icon: Gamepad2 },
  { key: 'trending-up', label: 'Invest', icon: TrendingUp },
  { key: 'banknote', label: 'Salary', icon: Banknote },
  { key: 'building-2', label: 'Business', icon: Building2 },
  { key: 'gift', label: 'Gift', icon: Gift },
  { key: 'award', label: 'Bonus', icon: Award },
  { key: 'coins', label: 'Income', icon: Coins },
  { key: 'car', label: 'Transport', icon: Car },
  { key: 'plane', label: 'Travel', icon: Plane },
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'wrench', label: 'Maintenance', icon: Wrench },
  { key: 'book-open', label: 'Books', icon: BookOpen },
  { key: 'sparkles', label: 'Lifestyle', icon: Sparkles },
];

export const CATEGORY_COLORS: string[] = [
  '#16845B',
  '#059669',
  '#0D9488',
  '#0284C7',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
  '#D94848',
  '#EA580C',
  '#D97706',
  '#475569',
];

const ICON_MAP: Record<string, LucideIcon> = CATEGORY_ICONS.reduce(
  (acc, item) => {
    acc[item.key] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

export const DEFAULT_CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'sav:Emergency Fund': { icon: 'shield-check', color: '#D94848' },
  'sav:Deposit': { icon: 'landmark', color: '#0284C7' },
  'sav:Hobby': { icon: 'gamepad-2', color: '#7C3AED' },
  'sav:Invest': { icon: 'trending-up', color: '#16845B' },
  'sav:Savings': { icon: 'piggy-bank', color: '#0D9488' },
  'sav:Samity': { icon: 'users', color: '#2563EB' },
  'sav:Investment': { icon: 'trending-up', color: '#059669' },

  'exp:Family Maintenance': { icon: 'home', color: '#EA580C' },
  'exp:Relative': { icon: 'users', color: '#7C3AED' },
  'exp:Personal': { icon: 'user', color: '#0284C7' },
  'exp:Career': { icon: 'briefcase', color: '#4F46E5' },
  'exp:Sadakah': { icon: 'hand-heart', color: '#16845B' },
  'exp:Others': { icon: 'tag', color: '#475569' },

  'inc:Salary': { icon: 'banknote', color: '#16845B' },
  'inc:Business': { icon: 'building-2', color: '#0284C7' },
  'inc:Freelance': { icon: 'laptop', color: '#4F46E5' },
  'inc:Investment Return': { icon: 'trending-up', color: '#059669' },
  'inc:Rental': { icon: 'home', color: '#0D9488' },
  'inc:Gift': { icon: 'gift', color: '#DB2777' },
  'inc:Bonus': { icon: 'award', color: '#D97706' },
  'inc:Others': { icon: 'coins', color: '#475569' },

  'wal:Bank': { icon: 'landmark', color: '#2563EB' },
  'wal:Bkash': { icon: 'wallet', color: '#DB2777' },
  'wal:Nagad': { icon: 'wallet', color: '#EA580C' },
  'wal:Cash': { icon: 'banknote', color: '#16845B' },
};

export function getCategoryStyleKey(kind: CategoryKind, name: string): string {
  return `${kind}:${name}`;
}

function hashCategoryName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getCategoryStyle(
  categoryStyles: Record<string, CategoryStyle> | undefined,
  kind: CategoryKind,
  name: string
): CategoryStyle {
  const scopedKey = getCategoryStyleKey(kind, name);
  const custom = categoryStyles?.[scopedKey] || categoryStyles?.[name];
  if (custom && custom.icon && custom.color) {
    return custom;
  }

  const preset = DEFAULT_CATEGORY_STYLES[scopedKey];
  if (preset) {
    return preset;
  }

  const fallbackIcon =
    kind === 'sav'
      ? 'piggy-bank'
      : kind === 'wal'
      ? 'wallet'
      : kind === 'inc'
      ? 'coins'
      : 'tag';
  const fallbackColor =
    CATEGORY_COLORS[hashCategoryName(scopedKey) % CATEGORY_COLORS.length];

  return { icon: fallbackIcon, color: fallbackColor };
}

export function getCategoryIconComponent(iconKey: string): LucideIcon {
  return ICON_MAP[iconKey] || Tag;
}

export const CategoryIconBadge: React.FC<{
  style: CategoryStyle;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ style, size = 'sm', className = '' }) => {
  const Icon = getCategoryIconComponent(style.icon);
  const boxSize =
    size === 'xs'
      ? 'h-5 w-5 rounded-md'
      : size === 'md'
      ? 'h-9 w-9 rounded-xl'
      : 'h-7 w-7 rounded-lg';
  const iconSize =
    size === 'xs' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${boxSize} ${className}`}
      style={{
        backgroundColor: `${style.color}1C`,
        color: style.color,
      }}
    >
      <Icon className={iconSize} />
    </span>
  );
};
