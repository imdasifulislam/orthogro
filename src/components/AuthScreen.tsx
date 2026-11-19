import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  HandCoins,
  Lock,
  LogIn,
  Mic,
  ReceiptText,
  Repeat,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import type { CurrencySymbol } from '../types';

export interface LastUserHint {
  name?: string;
  email?: string;
}

interface AuthScreenProps {
  isReturningUser: boolean;
  lastUserHint: LastUserHint | null;
  currency: CurrencySymbol;
  onCurrencyChange: (currency: CurrencySymbol) => void;
  onClearLastUserHint: () => void;
  onGoogleLogin: (fromNewUserOnboarding?: boolean) => void;
  onGuestLogin: (fromNewUserOnboarding?: boolean) => void;
  isSigningIn: boolean;
}

type OnboardingStage = 'setup' | 'features' | 'signup';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isReturningUser,
  lastUserHint,
  currency,
  onCurrencyChange,
  onClearLastUserHint,
  onGoogleLogin,
  onGuestLogin,
  isSigningIn,
}) => {
  const { lang, t, setLanguage } = useTranslation();
  const [mode, setMode] = useState<'onboarding' | 'login'>(() =>
    isReturningUser ? 'login' : 'onboarding'
  );
  const [stage, setStage] = useState<OnboardingStage>('setup');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setMode(isReturningUser ? 'login' : 'onboarding');
  }, [isReturningUser]);

  const slides = [
    {
      id: 'wallets',
      title: t.auth.feature1Title,
      desc: t.auth.feature1Desc,
    },
    {
      id: 'voice',
      title: t.auth.feature2Title,
      desc: t.auth.feature2Desc,
    },
    {
      id: 'memo',
      title: t.auth.feature3Title,
      desc: t.auth.feature3Desc,
    },
    {
      id: 'bills_debt',
      title: t.auth.feature4Title,
      desc: t.auth.feature4Desc,
    },
    {
      id: 'analytics_goals',
      title: t.auth.feature5Title,
      desc: t.auth.feature5Desc,
    },
    {
      id: 'family_security',
      title: t.auth.feature6Title,
      desc: t.auth.feature6Desc,
    },
  ];

  const totalSlides = slides.length;
  const isLastSlide = activeSlide === totalSlides - 1;

  // Auto-advance feature slides until reaching the final slide
  useEffect(() => {
    if (mode !== 'onboarding' || stage !== 'features' || isSlidePaused || isLastSlide) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => Math.min(totalSlides - 1, prev + 1));
    }, 4800);
    return () => window.clearInterval(timer);
  }, [mode, stage, isSlidePaused, isLastSlide, totalSlides]);

  const goToPrevSlide = () => {
    if (activeSlide === 0) {
      setStage('setup');
    } else {
      setActiveSlide((prev) => prev - 1);
    }
  };

  const goToNextSlide = () => {
    if (isLastSlide) {
      setStage('signup');
    } else {
      setActiveSlide((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchStartY.current = e.touches[0]?.clientY ?? null;
    if (stage === 'features') {
      setIsSlidePaused(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null && touchStartY.current !== null) {
      const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
      const diffX = touchStartX.current - endX;
      const diffY = touchStartY.current - endY;

      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        if (stage === 'setup') {
          if (diffX > 0) {
            setActiveSlide(0);
            setStage('features');
          }
        } else if (stage === 'features') {
          if (diffX > 0) {
            goToNextSlide();
          } else {
            goToPrevSlide();
          }
        } else if (stage === 'signup') {
          if (diffX < 0) {
            setStage('features');
          }
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    if (stage === 'features') {
      setIsSlidePaused(false);
    }
  };

  const currencyOptions: Array<{ symbol: CurrencySymbol; label: string }> = [
    { symbol: '৳', label: t.auth.currencyBdt },
    { symbol: '$', label: t.auth.currencyUsd },
    { symbol: 'SAR', label: t.auth.currencySar },
    { symbol: '₹', label: t.auth.currencyInr },
    { symbol: '£', label: t.auth.currencyGbp },
    { symbol: '€', label: t.auth.currencyEur },
  ];

  const renderSlideScene = (slideId: string) => {
    switch (slideId) {
      case 'wallets': {
        return (
          <div className="w-full max-w-[290px] space-y-2.5 text-left">
            {/* Primary True Balance Card */}
            <div className="animate-onboard-float rounded-2xl bg-white px-4 py-3 shadow-lg shadow-black/15">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {lang === 'bn' ? 'প্রকৃত ব্যালেন্স' : 'True Balance'}
                </span>
                <span className="text-[10px] font-bold text-[#16845B]">
                  {lang === 'bn' ? 'ব্যাংক · বিকাশ · নগদ' : 'Bank · Bkash · Cash'}
                </span>
              </div>
              <div className="font-mono-num mt-0.5 text-xl font-extrabold tracking-tight tabular-nums text-[#102A43]">
                {currency} 84,500
              </div>
              {/* Proportional Income vs Expense Ratio Bar */}
              <div
                className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                aria-hidden="true"
              >
                <span className="h-full w-[65%] rounded-l-full bg-[#16845B]" />
                <span className="h-full w-[35%] rounded-r-full bg-rose-500" />
              </div>
            </div>

            {/* Paired Income & Expense Summary Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#16845B]">
                  <TrendingUp className="h-3 w-3 shrink-0" />
                  <span>{lang === 'bn' ? 'মোট আয়' : 'Income'}</span>
                </div>
                <div className="font-mono-num mt-0.5 text-sm font-extrabold tabular-nums text-[#102A43]">
                  +{currency} 52,000
                </div>
              </div>

              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600">
                  <TrendingDown className="h-3 w-3 shrink-0" />
                  <span>{lang === 'bn' ? 'মোট ব্যয়' : 'Expense'}</span>
                </div>
                <div className="font-mono-num mt-0.5 text-sm font-extrabold tabular-nums text-[#102A43]">
                  -{currency} 28,400
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'voice': {
        const waveBars = [
          { height: 'h-5', delay: '0ms' },
          { height: 'h-9', delay: '140ms' },
          { height: 'h-6', delay: '280ms' },
          { height: 'h-10', delay: '420ms' },
        ];
        return (
          <div className="flex w-full items-center justify-center gap-4 sm:gap-5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <span
                aria-hidden="true"
                className="animate-onboard-voice-ring absolute inset-1 rounded-full border-2 border-emerald-200/70"
              />
              <span
                aria-hidden="true"
                style={{ animationDelay: '900ms' }}
                className="animate-onboard-voice-ring absolute inset-1 rounded-full border-2 border-emerald-200/50"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#0E6042] shadow-lg shadow-black/15">
                <Mic className="h-6 w-6" />
              </div>
            </div>

            <div className="flex h-10 items-center gap-1" aria-hidden="true">
              {waveBars.map((bar, idx) => (
                <span
                  key={idx}
                  style={{ animationDelay: bar.delay }}
                  className={`animate-onboard-bar w-1.5 rounded-full bg-emerald-200 ${bar.height}`}
                />
              ))}
            </div>

            <div className="animate-onboard-float rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-lg shadow-black/15">
              <div className="text-[11px] font-bold text-[#102A43]">
                {lang === 'bn' ? 'দুপুরের খাবার' : 'Lunch Expense'}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="font-mono-num text-sm font-extrabold tabular-nums text-[#16845B]">
                  {currency} 180
                </span>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[#16845B]">
                  <Check className="h-2.5 w-2.5" />
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'memo': {
        return (
          <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
            <div className="animate-onboard-float w-44 rounded-2xl bg-white p-3 text-left shadow-lg shadow-black/15">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1 text-[#0E6042]">
                  <ReceiptText className="h-3 w-3" />
                  {lang === 'bn' ? 'বাজার মেমো' : 'Bazar Memo'}
                </span>
                <span className="font-mono-num font-bold tabular-nums text-[#102A43]">
                  {currency} 1,240
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#102A43]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-100 text-[#16845B]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {lang === 'bn' ? 'চাল ও তেল' : 'Rice & Oil'}
                  </span>
                  <span className="font-mono-num text-[10px] tabular-nums text-slate-500">
                    {currency} 820
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#102A43]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-100 text-[#16845B]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {lang === 'bn' ? 'সবজি ও মাছ' : 'Fresh Veg'}
                  </span>
                  <span className="font-mono-num text-[10px] tabular-nums text-slate-500">
                    {currency} 420
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[#A7F3D0] px-3 py-2 text-center text-xs font-extrabold text-[#064E3B] shadow-md shadow-black/10">
              {lang === 'bn' ? '১-ট্যাপ খরচ' : '1-Tap Expense'}
            </div>
          </div>
        );
      }

      case 'bills_debt': {
        return (
          <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
            <div className="animate-onboard-float rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-lg shadow-black/15">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#0E6042]">
                <Repeat className="h-3 w-3" />
                <span>{lang === 'bn' ? 'ওয়াইফাই বিল' : 'Wifi Bill'}</span>
              </div>
              <div className="font-mono-num mt-0.5 text-sm font-extrabold tabular-nums text-[#102A43]">
                {currency} 500
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#16845B] px-2 py-0.5 text-[10px] font-bold text-white">
                <Check className="h-2.5 w-2.5" />
                <span>{lang === 'bn' ? '১-ট্যাপ লগ' : '1-Tap Log'}</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/95 px-3.5 py-2.5 text-left shadow-lg shadow-black/15">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700">
                <HandCoins className="h-3 w-3" />
                <span>{lang === 'bn' ? 'ধার আদায়' : 'Partial Repay'}</span>
              </div>
              <div className="font-mono-num mt-0.5 text-xs font-extrabold tabular-nums text-[#102A43]">
                {currency} 1,500 / 2,000
              </div>
              <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                <div className="animate-onboard-bar-x h-full w-3/4 rounded-full bg-amber-500" />
              </div>
            </div>
          </div>
        );
      }

      case 'analytics_goals': {
        const categories = [
          {
            label: lang === 'bn' ? 'খাবার' : 'Food',
            pct: '42%',
            color: '#16845B',
          },
          {
            label: lang === 'bn' ? 'বিল' : 'Bills',
            pct: '28%',
            color: '#F59E0B',
          },
          {
            label: lang === 'bn' ? 'সংসার' : 'Family',
            pct: '30%',
            color: '#6366F1',
          },
        ];
        return (
          <div className="w-full max-w-[290px] space-y-2.5 text-left">
            {/* Top Card: Visual Expense Breakdown Donut + Labeled Categories */}
            <div className="animate-onboard-float flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-black/15">
              <div
                className="relative flex h-14 w-14 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="20"
                    fill="none"
                    stroke="#16845B"
                    strokeWidth="8"
                    strokeDasharray="52.8 72.9"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="20"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeDasharray="35.2 90.5"
                    strokeDashoffset="-52.8"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="20"
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="8"
                    strokeDasharray="37.7 88.0"
                    strokeDashoffset="-88.0"
                  />
                </svg>
                <span className="font-mono-num absolute text-[10px] font-extrabold tabular-nums text-[#102A43]">
                  100%
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.label}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-600">
                      <span
                        aria-hidden="true"
                        style={{ backgroundColor: cat.color }}
                        className="h-2 w-2 shrink-0 rounded-xs"
                      />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="font-mono-num shrink-0 font-extrabold tabular-nums text-[#102A43]">
                      {cat.pct}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row: Monthly Budget & Saving Goal Progress Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="truncate text-[10px] font-bold text-[#16845B]">
                  {lang === 'bn' ? 'মাসিক বাজেট' : 'Monthly Budget'}
                </div>
                <div className="font-mono-num mt-0.5 truncate text-[11px] font-extrabold tabular-nums text-[#102A43]">
                  {currency} 12k / 18k
                </div>
                <div
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  aria-hidden="true"
                >
                  <div className="h-full w-[66%] rounded-full bg-[#16845B]" />
                </div>
              </div>

              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="truncate text-[10px] font-bold text-indigo-600">
                  {lang === 'bn' ? 'সঞ্চয় লক্ষ্য' : 'Saving Goal'}
                </div>
                <div className="font-mono-num mt-0.5 truncate text-[11px] font-extrabold tabular-nums text-[#102A43]">
                  78%
                </div>
                <div
                  className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  aria-hidden="true"
                >
                  <div className="h-full w-[78%] rounded-full bg-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'family_security':
      default: {
        return (
          <div className="w-full max-w-[290px] space-y-2.5 text-left">
            {/* Primary App Lock Card */}
            <div className="animate-onboard-float flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg shadow-black/15">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#16845B]">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-extrabold text-[#102A43]">
                    {lang === 'bn' ? 'অ্যাপ লক' : 'App Lock'}
                  </div>
                  <div className="truncate text-[10px] font-semibold text-[#16845B]">
                    {lang === 'bn' ? 'পিন সুরক্ষিত' : 'PIN Protected'}
                  </div>
                </div>
              </div>

              <div
                className="flex shrink-0 items-center gap-1.5"
                aria-hidden="true"
              >
                <span className="h-2 w-2 rounded-full bg-[#0E6042]" />
                <span className="h-2 w-2 rounded-full bg-[#0E6042]" />
                <span className="h-2 w-2 rounded-full bg-[#0E6042]" />
                <span className="h-2 w-2 rounded-full bg-[#0E6042]" />
              </div>
            </div>

            {/* Paired Family Sharing & Tax Report Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#16845B]">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {lang === 'bn' ? 'ফ্যামিলি শেয়ার' : 'Family Sync'}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] font-extrabold text-[#102A43]">
                  {lang === 'bn' ? '২ জন · লাইভ' : '2 Members · Live'}
                </div>
              </div>

              <div className="rounded-xl bg-white/95 px-3 py-2.5 shadow-md shadow-black/10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700">
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {lang === 'bn' ? 'ট্যাক্স রিপোর্ট' : 'Tax Report'}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] font-extrabold text-[#102A43]">
                  {lang === 'bn' ? 'জুলাই–জুন · PDF' : 'Jul–Jun · PDF'}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  // Returning-user Sign In view
  if (mode === 'login') {
    return (
      <div className="flex min-h-screen flex-col bg-[#F6F8F7] text-[#102A43] dark:bg-slate-950 dark:text-slate-100">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 sm:py-4">
          <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
            <img
              src="/orthogro-mark.png"
              alt="OrthoGro"
              className="h-9 w-9 rounded-xl border border-slate-200/80 bg-white object-contain p-0.5 shadow-xs dark:border-slate-700"
            />
            <span className="text-base font-extrabold tracking-tight text-[#0E6042] sm:text-lg dark:text-emerald-200">
              OrthoGro
            </span>
          </div>

          <div
            role="group"
            aria-label="Language"
            className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`min-h-[30px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                lang === 'bn'
                  ? 'bg-[#16845B] text-white'
                  : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              BN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`min-h-[30px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                lang === 'en'
                  ? 'bg-[#16845B] text-white'
                  : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-4 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold tracking-wide text-[#16845B] dark:text-emerald-400">
                {t.app.tagline}
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#102A43] text-balance sm:text-3xl dark:text-slate-100">
                {t.auth.welcomeBack}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t.auth.subtitle}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
              {lastUserHint?.email && (
                <div className="mb-5 flex items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="text-slate-400 dark:text-slate-500">
                      {t.auth.lastSignedIn}
                    </div>
                    <div className="mt-0.5 truncate font-semibold text-[#102A43] dark:text-slate-200">
                      {lastUserHint.name ? `${lastUserHint.name} · ` : ''}
                      {lastUserHint.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClearLastUserHint}
                    className="shrink-0 font-semibold text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {t.auth.clearHint}
                  </button>
                </div>
              )}

              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t.auth.desc}
              </p>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => onGoogleLogin(false)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-[#16845B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>{isSigningIn ? t.auth.signingIn : t.auth.signInGoogle}</span>
                </button>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => onGuestLogin(false)}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <User className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                  <span>{t.auth.continueGuest}</span>
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t.auth.newToApp}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStage('setup');
                    setActiveSlide(0);
                    setMode('onboarding');
                  }}
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-[#16845B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-emerald-400"
                >
                  <span>{t.auth.goToOpening}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // STEP 1: Language & Currency Setup Card (Default Bangla + BDT ৳)
  if (stage === 'setup') {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8F7] px-4 py-6 text-[#102A43] sm:px-6 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
            {/* Brand Mark */}
            <div className="flex flex-col items-center text-center">
              <img
                src="/orthogro-mark.png"
                alt="OrthoGro"
                className="h-14 w-14 rounded-2xl border border-slate-200/80 bg-white object-contain p-1.5 shadow-xs dark:border-slate-700"
              />
              <h1 className="mt-3.5 text-lg font-extrabold tracking-tight text-[#102A43] sm:text-xl dark:text-slate-100">
                {t.auth.setupLangTitle}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                {t.auth.setupLangSub}
              </p>
            </div>

            {/* Language Selector (Bangla default + English) */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                aria-pressed={lang === 'bn'}
                onClick={() => setLanguage('bn')}
                className={`flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
                  lang === 'bn'
                    ? 'border-[#16845B] bg-[#16845B] text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 text-[#102A43] hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-extrabold ${
                    lang === 'bn'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  BN
                </span>
                <span>বাংলা</span>
              </button>

              <button
                type="button"
                aria-pressed={lang === 'en'}
                onClick={() => setLanguage('en')}
                className={`flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.98] ${
                  lang === 'en'
                    ? 'border-[#16845B] bg-[#16845B] text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 text-[#102A43] hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-extrabold ${
                    lang === 'en'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  EN
                </span>
                <span>English</span>
              </button>
            </div>

            <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

            {/* Currency Selector */}
            <div className="text-center">
              <h2 className="text-base font-extrabold tracking-tight text-[#102A43] dark:text-slate-100">
                {t.auth.setupCurrencyTitle}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                {t.auth.setupCurrencySub}
              </p>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2">
              {currencyOptions.map((opt) => {
                const isSelected = currency === opt.symbol;
                return (
                  <button
                    key={opt.symbol}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onCurrencyChange(opt.symbol)}
                    className={`flex min-h-[48px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#16845B] bg-[#16845B] text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 text-[#102A43] hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-lg px-1.5 font-mono-num text-xs font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/80 text-[#102A43] dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {opt.symbol}
                    </span>
                    <span className="truncate text-xs font-bold">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Continue CTA */}
            <button
              type="button"
              onClick={() => {
                setActiveSlide(0);
                setStage('features');
              }}
              className="mt-6 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.98]"
            >
              <span>{t.auth.setupStartBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Returning User Shortcut */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {t.auth.alreadyHaveAccount}
            </span>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-bold text-[#16845B] hover:underline dark:text-emerald-400"
            >
              {t.auth.goToSignIn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Full-Screen Feature Walkthrough (6 Slides, No Signup Clutter)
  if (stage === 'features') {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex min-h-screen flex-col bg-gradient-to-b from-[#083B29] via-[#0E5E42] to-[#16845B] text-white"
      >
        {/* Top Bar: Brand + Skip */}
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 pt-4 pb-2 sm:px-8 sm:pt-6">
          <button
            type="button"
            onClick={() => setStage('setup')}
            className="flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-white/10"
            aria-label={t.auth.backBtn}
          >
            <img
              src="/orthogro-mark.png"
              alt="OrthoGro"
              className="h-9 w-9 rounded-xl border border-white/25 bg-white object-contain p-0.5 shadow-sm"
            />
            <span className="text-lg font-extrabold tracking-tight text-white">OrthoGro</span>
          </button>

          <button
            type="button"
            onClick={() => setStage('signup')}
            className="min-h-[40px] shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-100 transition-colors hover:bg-white/15 hover:text-white sm:text-sm"
          >
            {t.auth.skipBtn}
          </button>
        </header>

        {/* Full-Focus Centered Feature Carousel */}
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-6 sm:px-8">
          <section
            aria-roledescription="carousel"
            aria-label={t.auth.slideLabel}
            onMouseEnter={() => setIsSlidePaused(true)}
            onMouseLeave={() => setIsSlidePaused(false)}
            className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.10] p-5 backdrop-blur-md sm:p-7"
          >
            <div
              className="flex items-stretch transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {slides.map((slide) => (
                <div key={slide.id} className="w-full shrink-0 px-0.5">
                  <div className="flex min-h-[168px] w-full items-center justify-center rounded-2xl bg-white/[0.09] px-4 py-6 sm:min-h-[200px]">
                    {renderSlideScene(slide.id)}
                  </div>

                  <div className="mt-6 px-1 pb-1 text-center">
                    <h2 className="text-xl font-extrabold leading-snug tracking-tight text-white text-balance sm:text-2xl">
                      {slide.title}
                    </h2>
                    <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-emerald-50/85 sm:text-base">
                      {slide.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Indicator Dots + Prev/Next Controls */}
          <div className="mt-5 flex items-center justify-center gap-3 sm:justify-between">
            <button
              type="button"
              onClick={goToPrevSlide}
              aria-label={activeSlide === 0 ? t.auth.backBtn : t.auth.slidePrev}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div
              className="flex items-center justify-center gap-0.5"
              role="tablist"
              aria-label={t.auth.slideLabel}
            >
              {slides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeSlide}
                  aria-label={slide.title}
                  onClick={() => setActiveSlide(idx)}
                  className="flex min-h-[44px] min-w-[22px] items-center justify-center px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeSlide
                        ? 'w-7 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={goToNextSlide}
              aria-label={t.auth.slideNext}
              className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 sm:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </main>

        {/* Bottom Primary Progression CTA */}
        <footer className="mx-auto w-full max-w-md px-5 pt-2 pb-8 sm:px-8">
          <button
            type="button"
            onClick={goToNextSlide}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#0E6042] shadow-lg shadow-black/15 transition-colors hover:bg-emerald-50 active:scale-[0.98]"
          >
            <span>{isLastSlide ? t.auth.getStartedBtn : t.auth.nextBtn}</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-100/85">
            <span>{t.auth.alreadyHaveAccount}</span>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="font-bold text-white underline-offset-2 hover:underline"
            >
              {t.auth.goToSignIn}
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // STEP 3: Dedicated Clean Sign-Up / Start Workspace Screen
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex min-h-screen flex-col bg-[#F6F8F7] text-[#102A43] dark:bg-slate-950 dark:text-slate-100"
    >
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8 sm:py-4">
        <button
          type="button"
          onClick={() => setStage('features')}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-200/70 sm:text-sm dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.auth.backBtn}</span>
        </button>

        <div
          role="group"
          aria-label="Language"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => setLanguage('bn')}
            className={`min-h-[30px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              lang === 'bn'
                ? 'bg-[#16845B] text-white'
                : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            BN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`min-h-[30px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
              lang === 'en'
                ? 'bg-[#16845B] text-white'
                : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <img
                src="/orthogro-mark.png"
                alt="OrthoGro"
                className="h-14 w-14 rounded-2xl border border-slate-200/80 bg-white object-contain p-1.5 shadow-xs dark:border-slate-700"
              />
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#0E6042] sm:text-[28px] dark:text-emerald-200">
                OrthoGro
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-300">
                {t.auth.subtitle}
              </p>
              <p className="mt-1.5 text-xs font-bold tracking-wide text-[#16845B] dark:text-emerald-400">
                {lang === 'bn' ? t.app.tagline : 'Track • Save • Grow'}
              </p>
            </div>

            <p className="mt-5 text-center text-xs leading-relaxed text-slate-500 sm:text-sm dark:text-slate-400">
              {t.auth.signupReadyDesc}
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => onGoogleLogin(true)}
                className="flex min-h-[50px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-[#16845B] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#126B4A] active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>{isSigningIn ? t.auth.signingIn : t.auth.getStartedGoogle}</span>
              </button>

              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => onGuestLogin(true)}
                className="flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <User className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                <span>{t.auth.tryGuest}</span>
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">
                {t.auth.alreadyHaveAccount}
              </span>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-[#16845B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-emerald-400"
              >
                <span>{t.auth.goToSignIn}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
