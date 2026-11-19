import React from 'react';
import {
  Award,
  Baby,
  BadgePercent,
  Banknote,
  BarChart3,
  BedDouble,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  Camera,
  Car,
  Clock,
  Cloud,
  Coffee,
  Coins,
  Compass,
  CreditCard,
  Dog,
  DollarSign,
  Droplets,
  Dumbbell,
  FileText,
  Film,
  Flame,
  Fuel,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  Hammer,
  HandHeart,
  Headphones,
  Heart,
  HeartPulse,
  Home,
  Key,
  Landmark,
  Laptop,
  type LucideIcon,
  MapPin,
  Music,
  Package,
  Palette,
  PartyPopper,
  Percent,
  PieChart,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Scale,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  Tag,
  TrainFront,
  TrendingUp,
  Trophy,
  Tv,
  Umbrella,
  User,
  Users,
  Utensils,
  Vault,
  Wallet,
  Wifi,
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
  // Home & Family
  { key: 'home', label: 'Home', icon: Home },
  { key: 'sofa', label: 'Living / Furniture', icon: Sofa },
  { key: 'bed-double', label: 'Rent / Bedroom', icon: BedDouble },
  { key: 'users', label: 'Family', icon: Users },
  { key: 'user', label: 'Personal', icon: User },
  { key: 'baby', label: 'Baby / Kids', icon: Baby },
  { key: 'heart', label: 'Care / Love', icon: Heart },
  { key: 'hand-heart', label: 'Charity / Sadakah', icon: HandHeart },
  { key: 'dog', label: 'Pets', icon: Dog },

  // Food & Shopping
  { key: 'utensils', label: 'Food & Dining', icon: Utensils },
  { key: 'coffee', label: 'Coffee / Snacks', icon: Coffee },
  { key: 'shopping-cart', label: 'Groceries / Bazar', icon: ShoppingCart },
  { key: 'shopping-bag', label: 'Shopping', icon: ShoppingBag },
  { key: 'store', label: 'Store / Market', icon: Store },
  { key: 'package', label: 'Delivery / Parcel', icon: Package },
  { key: 'shirt', label: 'Clothing', icon: Shirt },
  { key: 'scissors', label: 'Salon / Grooming', icon: Scissors },

  // Transport & Travel
  { key: 'car', label: 'Car / Ride', icon: Car },
  { key: 'bus', label: 'Bus / Transit', icon: Bus },
  { key: 'train-front', label: 'Train / Metro', icon: TrainFront },
  { key: 'bike', label: 'Bike / Scooter', icon: Bike },
  { key: 'fuel', label: 'Fuel / Gas', icon: Fuel },
  { key: 'plane', label: 'Flight / Travel', icon: Plane },
  { key: 'map-pin', label: 'Location / Trip', icon: MapPin },
  { key: 'compass', label: 'Explore', icon: Compass },

  // Utilities, Tech & Repairs
  { key: 'zap', label: 'Electricity', icon: Zap },
  { key: 'droplets', label: 'Water Bill', icon: Droplets },
  { key: 'flame', label: 'Gas / Heating', icon: Flame },
  { key: 'wifi', label: 'Internet / Wi-Fi', icon: Wifi },
  { key: 'smartphone', label: 'Mobile / Recharge', icon: Smartphone },
  { key: 'tv', label: 'TV / Streaming', icon: Tv },
  { key: 'laptop', label: 'Tech / Freelance', icon: Laptop },
  { key: 'headphones', label: 'Audio / Media', icon: Headphones },
  { key: 'cloud', label: 'Cloud / Software', icon: Cloud },
  { key: 'wrench', label: 'Repair / Service', icon: Wrench },
  { key: 'hammer', label: 'Renovation', icon: Hammer },

  // Health & Wellness
  { key: 'heart-pulse', label: 'Health / Medical', icon: HeartPulse },
  { key: 'pill', label: 'Medicine / Pharmacy', icon: Pill },
  { key: 'stethoscope', label: 'Doctor / Clinic', icon: Stethoscope },
  { key: 'dumbbell', label: 'Gym / Fitness', icon: Dumbbell },
  { key: 'umbrella', label: 'Insurance / Safety', icon: Umbrella },

  // Money, Wallets, Banks & Investments
  { key: 'wallet', label: 'Wallet', icon: Wallet },
  { key: 'credit-card', label: 'Card / Bank Card', icon: CreditCard },
  { key: 'landmark', label: 'Bank / Deposit', icon: Landmark },
  { key: 'piggy-bank', label: 'Savings', icon: PiggyBank },
  { key: 'shield-check', label: 'Emergency Fund', icon: ShieldCheck },
  { key: 'vault', label: 'Vault / Locker', icon: Vault },
  { key: 'trending-up', label: 'Invest / Growth', icon: TrendingUp },
  { key: 'bar-chart-3', label: 'Stocks / Portfolio', icon: BarChart3 },
  { key: 'pie-chart', label: 'Mutual Fund / Share', icon: PieChart },
  { key: 'gem', label: 'Gold / Jewelry', icon: Gem },
  { key: 'key', label: 'Property / Asset', icon: Key },

  // Work, Income & Bills
  { key: 'banknote', label: 'Cash / Salary', icon: Banknote },
  { key: 'coins', label: 'Coins / Income', icon: Coins },
  { key: 'dollar-sign', label: 'Currency / Fee', icon: DollarSign },
  { key: 'briefcase', label: 'Career / Job', icon: Briefcase },
  { key: 'building-2', label: 'Business / Office', icon: Building2 },
  { key: 'receipt', label: 'Bills / Receipt', icon: Receipt },
  { key: 'file-text', label: 'Tax / Documents', icon: FileText },
  { key: 'percent', label: 'Interest / Rate', icon: Percent },
  { key: 'badge-percent', label: 'Discount / Cashback', icon: BadgePercent },
  { key: 'scale', label: 'Legal / Taxes', icon: Scale },
  { key: 'repeat', label: 'Subscription / EMI', icon: Repeat },
  { key: 'calendar', label: 'Monthly / Rent', icon: Calendar },
  { key: 'clock', label: 'Hourly / Overtime', icon: Clock },

  // Education, Gifts & Lifestyle
  { key: 'graduation-cap', label: 'Education', icon: GraduationCap },
  { key: 'book-open', label: 'Books / Tuition', icon: BookOpen },
  { key: 'gamepad-2', label: 'Games / Hobby', icon: Gamepad2 },
  { key: 'film', label: 'Entertainment / Movies', icon: Film },
  { key: 'music', label: 'Music / Events', icon: Music },
  { key: 'camera', label: 'Photo / Hobby', icon: Camera },
  { key: 'palette', label: 'Art / Design', icon: Palette },
  { key: 'gift', label: 'Gift', icon: Gift },
  { key: 'party-popper', label: 'Festival / Bonus', icon: PartyPopper },
  { key: 'award', label: 'Bonus / Reward', icon: Award },
  { key: 'trophy', label: 'Achievement / Prize', icon: Trophy },
  { key: 'star', label: 'Favorite / Priority', icon: Star },
  { key: 'sparkles', label: 'Lifestyle', icon: Sparkles },
  { key: 'tag', label: 'Category / Other', icon: Tag },
];

export const CATEGORY_COLORS: string[] = [
  '#16845B', // Brand Emerald
  '#059669', // Emerald
  '#15803D', // Forest Green
  '#65A30D', // Olive Lime
  '#0D9488', // Teal
  '#0891B2', // Cyan
  '#0284C7', // Sky Blue
  '#2563EB', // Royal Blue
  '#1D4ED8', // Deep Blue
  '#102A43', // Midnight Navy
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#9333EA', // Purple
  '#C026D3', // Fuchsia
  '#DB2777', // Pink
  '#E11D48', // Rose
  '#D94848', // Crimson Red
  '#DC2626', // Scarlet
  '#EA580C', // Burnt Orange
  '#F97316', // Tangerine
  '#D97706', // Amber
  '#CA8A04', // Ochre Gold
  '#92400E', // Warm Bronze
  '#475569', // Cool Slate
];

const ICON_MAP: Record<string, LucideIcon> = CATEGORY_ICONS.reduce(
  (acc, item) => {
    acc[item.key] = item.icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

export const DEFAULT_CATEGORY_STYLES: Record<string, CategoryStyle> = {
  // Wallets
  'wal:Cash': { icon: 'banknote', color: '#16845B' },
  'wal:Bkash': { icon: 'wallet', color: '#DB2777' },
  'wal:Nagad': { icon: 'smartphone', color: '#EA580C' },
  'wal:Bank': { icon: 'landmark', color: '#2563EB' },

  // Savings & Investments
  'sav:Emergency Fund': { icon: 'shield-check', color: '#D94848' },
  'sav:Hobby/Want': { icon: 'gamepad-2', color: '#7C3AED' },
  'sav:Invest': { icon: 'trending-up', color: '#16845B' },
  'sav:Saving': { icon: 'piggy-bank', color: '#0D9488' },
  'sav:Samity': { icon: 'users', color: '#2563EB' },
  // Legacy savings fallbacks
  'sav:Deposit': { icon: 'landmark', color: '#0284C7' },
  'sav:Hobby': { icon: 'gamepad-2', color: '#7C3AED' },
  'sav:Savings': { icon: 'piggy-bank', color: '#0D9488' },
  'sav:Investment': { icon: 'trending-up', color: '#059669' },

  // Expense Categories
  'exp:Family Maintenance': { icon: 'home', color: '#EA580C' },
  'exp:Relative': { icon: 'users', color: '#7C3AED' },
  'exp:Personal': { icon: 'user', color: '#0284C7' },
  'exp:Sadakah': { icon: 'hand-heart', color: '#16845B' },
  'exp:Entertainment': { icon: 'film', color: '#E11D48' },
  'exp:Others': { icon: 'tag', color: '#475569' },
  // Legacy expense fallback
  'exp:Career': { icon: 'briefcase', color: '#4F46E5' },

  // Expense Sub-categories — Family Maintenance
  'sub:Family Maintenance::Groceries': { icon: 'shopping-cart', color: '#15803D' },
  'sub:Family Maintenance::Utilities & Bill': { icon: 'zap', color: '#D97706' },
  'sub:Family Maintenance::Utilities & Bills': { icon: 'zap', color: '#D97706' },
  'sub:Family Maintenance::Rent & Housing': { icon: 'key', color: '#2563EB' },
  'sub:Family Maintenance::Household': { icon: 'sofa', color: '#0D9488' },
  'sub:Family Maintenance::Healthcare': { icon: 'heart-pulse', color: '#DC2626' },
  'sub:Family Maintenance::Education': { icon: 'graduation-cap', color: '#4F46E5' },

  // Expense Sub-categories — Personal
  'sub:Personal::Food': { icon: 'utensils', color: '#F97316' },
  'sub:Personal::Apparel': { icon: 'shirt', color: '#DB2777' },
  'sub:Personal::Career': { icon: 'briefcase', color: '#4F46E5' },

  // Income Categories
  'inc:Salary': { icon: 'banknote', color: '#16845B' },
  'inc:Business': { icon: 'building-2', color: '#2563EB' },
  'inc:Investment Return': { icon: 'trending-up', color: '#059669' },
  'inc:Freelance': { icon: 'laptop', color: '#4F46E5' },
  'inc:Rental': { icon: 'key', color: '#0D9488' },
  'inc:Festival Bonus': { icon: 'party-popper', color: '#D97706' },
  'inc:Gift': { icon: 'gift', color: '#DB2777' },
  'inc:Others': { icon: 'coins', color: '#475569' },
  // Legacy income fallback
  'inc:Bonus': { icon: 'award', color: '#D97706' },
};

export function getCategoryStyleKey(kind: CategoryKind, name: string): string {
  return `${kind}:${name}`;
}

export function getSubCategoryTargetName(parentCategory: string, subCategory: string): string {
  return `${parentCategory}::${subCategory}`;
}

export function formatCategoryStyleTargetLabel(kind: CategoryKind, name: string): string {
  if (kind === 'sub' && name.includes('::')) {
    const [parent, sub] = name.split('::');
    return `${parent} › ${sub}`;
  }
  return name;
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

  if (kind === 'sub' && name.includes('::')) {
    const [parentCategory] = name.split('::');
    if (parentCategory) {
      return getCategoryStyle(categoryStyles, 'exp', parentCategory);
    }
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

export function getExpenseOrSubCategoryStyle(
  categoryStyles: Record<string, CategoryStyle> | undefined,
  category: string,
  subCategory?: string
): CategoryStyle {
  const cleanCat = (category || 'Others').trim() || 'Others';
  const cleanSub = (subCategory || '').trim();
  if (cleanSub) {
    const subKey = getCategoryStyleKey('sub', getSubCategoryTargetName(cleanCat, cleanSub));
    const resolvedSub = categoryStyles?.[subKey] || DEFAULT_CATEGORY_STYLES[subKey];
    if (resolvedSub && resolvedSub.icon && resolvedSub.color) {
      return resolvedSub;
    }
  }
  return getCategoryStyle(categoryStyles, 'exp', cleanCat);
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
