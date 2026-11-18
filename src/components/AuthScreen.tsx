import React, { useEffect, useRef, useState } from 'react';
import {
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
  User,
  Users,
} from 'lucide-react';
import { useTranslation } from '../i18n';

export interface LastUserHint {
  name?: string;
  email?: string;
}

interface AuthScreenProps {
  isReturningUser: boolean;
  lastUserHint: LastUserHint | null;
  onClearLastUserHint: () => void;
  onGoogleLogin: () => void;
  onGuestLogin: () => void;
  isSigningIn: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  isReturningUser,
  lastUserHint,
  onClearLastUserHint,
  onGoogleLogin,
  onGuestLogin,
  isSigningIn,
}) => {
  const { lang, t, setLanguage } = useTranslation();
  const [mode, setMode] = useState<'onboarding' | 'login'>(() =>
    isReturningUser ? 'login' : 'onboarding'
  );
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSlidePaused, setIsSlidePaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

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

  useEffect(() => {
    if (mode !== 'onboarding' || isSlidePaused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [mode, isSlidePaused, totalSlides]);

  const goToPrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setIsSlidePaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
      const diff = touchStartX.current - endX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          goToNextSlide();
        } else {
          goToPrevSlide();
        }
      }
    }
    touchStartX.current = null;
    setIsSlidePaused(false);
  };

  const renderSlideScene = (slideId: string) => {
    switch (slideId) {
      case 'wallets': {
        const bars = [
          { height: 'h-7', delay: '0ms' },
          { height: 'h-12', delay: '180ms' },
          { height: 'h-9', delay: '360ms' },
          { height: 'h-14', delay: '540ms' },
          { height: 'h-10', delay: '720ms' },
          { height: 'h-12', delay: '900ms' },
        ];
        return (
          <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
            <div className="animate-onboard-float rounded-2xl bg-white px-4 py-3 text-left shadow-lg shadow-black/15">
              <div className="text-[11px] font-semibold text-slate-500">
                {lang === 'bn' ? 'প্রকৃত ব্যালেন্স' : 'True Balance'}
              </div>
              <div className="font-mono-num mt-0.5 text-xl font-extrabold tracking-tight text-[#102A43]">
                ৳ 84,500
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[#16845B]">
                {lang === 'bn' ? 'নগদ · আয়-ব্যয় · ধার-দেনা' : 'Cash · Inc/Exp · Debt'}
              </div>
            </div>

            <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
              {bars.map((bar, idx) => (
                <span
                  key={idx}
                  style={{ animationDelay: bar.delay }}
                  className={`animate-onboard-bar w-2.5 rounded-full bg-emerald-100/90 ${bar.height}`}
                />
              ))}
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
                <span className="font-mono-num text-sm font-extrabold text-[#16845B]">৳ 180</span>
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
                <span className="font-mono-num font-bold text-[#102A43]">৳ 1,240</span>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[#102A43]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-100 text-[#16845B]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {lang === 'bn' ? 'চাল ও তেল' : 'Rice & Oil'}
                  </span>
                  <span className="font-mono-num text-[10px] text-slate-500">৳ 820</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#102A43]">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-100 text-[#16845B]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {lang === 'bn' ? 'সবজি ও মাছ' : 'Fresh Veg'}
                  </span>
                  <span className="font-mono-num text-[10px] text-slate-500">৳ 420</span>
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
              <div className="font-mono-num mt-0.5 text-sm font-extrabold text-[#102A43]">৳ 500</div>
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
              <div className="font-mono-num mt-0.5 text-xs font-extrabold text-[#102A43]">
                ৳ 1,500 / 2,000
              </div>
              <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                <div className="animate-onboard-bar-x h-full w-3/4 rounded-full bg-amber-500" />
              </div>
            </div>
          </div>
        );
      }

      case 'analytics_goals': {
        const legendBars = [
          { color: '#FB923C', width: 'w-14', delay: '0ms' },
          { color: '#EC4899', width: 'w-12', delay: '220ms' },
          { color: '#8B5CF6', width: 'w-10', delay: '440ms' },
          { color: '#2DD4BF', width: 'w-14', delay: '660ms' },
        ];
        return (
          <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 80 80" className="animate-onboard-pie-spin h-20 w-20">
                <circle
                  cx="40"
                  cy="40"
                  r="28"
                  fill="none"
                  stroke="#FB923C"
                  strokeWidth="12"
                  strokeDasharray="52 124"
                  strokeDashoffset="0"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="28"
                  fill="none"
                  stroke="#EC4899"
                  strokeWidth="12"
                  strokeDasharray="44 132"
                  strokeDashoffset="-52"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="28"
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="12"
                  strokeDasharray="42 134"
                  strokeDashoffset="-96"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="28"
                  fill="none"
                  stroke="#2DD4BF"
                  strokeWidth="12"
                  strokeDasharray="38 138"
                  strokeDashoffset="-138"
                />
              </svg>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5" aria-hidden="true">
                {legendBars.map((bar, idx) => (
                  <div
                    key={idx}
                    className="h-2 w-24 overflow-hidden rounded-full bg-white/15"
                  >
                    <div
                      style={{
                        backgroundColor: bar.color,
                        animationDelay: bar.delay,
                      }}
                      className={`animate-onboard-bar-x h-full rounded-full ${bar.width}`}
                    />
                  </div>
                ))}
              </div>
              <div className="animate-onboard-float rounded-xl bg-white px-2.5 py-1.5 text-left shadow-md shadow-black/15">
                <div className="font-mono-num text-xs font-extrabold text-[#0E6042]">
                  {lang === 'bn' ? 'সঞ্চয় লক্ষ্য · 78%' : 'Goal · 78%'}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'family_security':
      default: {
        return (
          <div className="flex w-full items-center justify-center gap-3.5 sm:gap-5">
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0E6042] shadow-md shadow-black/15">
                <Users className="h-5 w-5" />
              </div>
              <div className="relative flex h-2 w-10 items-center justify-center" aria-hidden="true">
                <span className="h-0.5 w-full rounded-full bg-emerald-200/40" />
                <span className="animate-onboard-sync-pulse absolute h-2 w-2 rounded-full bg-emerald-200" />
              </div>
            </div>

            <div className="animate-onboard-float flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 text-left shadow-lg shadow-black/15">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#16845B]">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-extrabold text-[#102A43]">
                  {lang === 'bn' ? 'জুলাই–জুন PDF' : 'Jul–Jun PDF'}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#16845B]">
                  <Lock className="h-2.5 w-2.5" />
                  {lang === 'bn' ? 'পিন সুরক্ষিত' : 'PIN Locked'}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  };

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
              onClick={() => setLanguage('en')}
              className={`min-h-[30px] shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                lang === 'en'
                  ? 'bg-[#16845B] text-white'
                  : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              EN
            </button>
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
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.auth.subtitle}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
              {lastUserHint?.email && (
                <div className="mb-5 flex items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs dark:border-slate-800">
                  <div className="min-w-0">
                    <div className="text-slate-400 dark:text-slate-500">{t.auth.lastSignedIn}</div>
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
                  onClick={onGoogleLogin}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-[#16845B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>{isSigningIn ? t.auth.signingIn : t.auth.signInGoogle}</span>
                </button>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGuestLogin}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <User className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                  <span>{t.auth.continueGuest}</span>
                </button>
              </div>

              <p className="mt-4 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
                {t.auth.footnote}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t.auth.newToApp}</span>
                <button
                  type="button"
                  onClick={() => setMode('onboarding')}
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

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#083B29] via-[#0E5E42] to-[#16845B] text-white lg:bg-[#F6F8F7] lg:bg-none lg:text-[#102A43] dark:lg:bg-slate-950 dark:lg:text-slate-100">
      {/* Top Bar */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-4 pb-2 sm:px-8 sm:pt-5 lg:py-4">
        <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <img
            src="/orthogro-mark.png"
            alt="OrthoGro"
            className="h-9 w-9 rounded-xl border border-white/25 bg-white object-contain p-0.5 shadow-sm lg:border-slate-200/80 dark:lg:border-slate-700"
          />
          <span className="text-lg font-extrabold tracking-tight text-white lg:text-[#0E6042] dark:lg:text-emerald-200">
            OrthoGro
          </span>
        </div>

        <div
          role="group"
          aria-label="Language"
          className="flex shrink-0 items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-sm lg:border-slate-200 lg:bg-white lg:shadow-xs dark:lg:border-slate-800 dark:lg:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
              lang === 'en'
                ? 'bg-white text-[#0E6042] lg:bg-[#16845B] lg:text-white'
                : 'text-emerald-50/85 hover:text-white lg:text-slate-600 lg:hover:text-[#102A43] dark:lg:text-slate-400 dark:lg:hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('bn')}
            className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
              lang === 'bn'
                ? 'bg-white text-[#0E6042] lg:bg-[#16845B] lg:text-white'
                : 'text-emerald-50/85 hover:text-white lg:text-slate-600 lg:hover:text-[#102A43] dark:lg:text-slate-400 dark:lg:hover:text-slate-200'
            }`}
          >
            BN
          </button>
        </div>
      </header>

      {/* Main Responsive Layout: Mobile = Hero Top + Action Bottom Sheet; Desktop = Balanced 2-Column Showcase + Get Started */}
      <main className="flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-6xl lg:grid-cols-12 lg:items-center lg:gap-10 lg:px-8 lg:py-8">
        {/* Left / Top: Lively Animated 6-Slide Emerald Showcase */}
        <div className="flex flex-1 flex-col justify-center px-5 pt-2 pb-4 sm:px-8 lg:col-span-7 lg:rounded-3xl lg:bg-gradient-to-br lg:from-[#083B29] lg:via-[#0E5E42] lg:to-[#16845B] lg:p-8 lg:text-white lg:shadow-xl lg:shadow-emerald-950/15">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-3 hidden items-center justify-between lg:flex">
              <span className="text-xs font-semibold tracking-wide text-emerald-100/90">
                {t.app.tagline}
              </span>
              <span className="text-xs font-medium text-emerald-100/80">{t.auth.subtitle}</span>
            </div>

            <section
              aria-roledescription="carousel"
              aria-label={t.auth.slideLabel}
              onMouseEnter={() => setIsSlidePaused(true)}
              onMouseLeave={() => setIsSlidePaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.10] p-4 backdrop-blur-md sm:p-5"
            >
              <div
                className="flex items-stretch transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {slides.map((slide) => (
                  <div key={slide.id} className="w-full shrink-0 px-0.5">
                    {/* Animated Visual Stage */}
                    <div className="flex min-h-[126px] w-full items-center justify-center rounded-2xl bg-white/[0.09] px-4 py-4 sm:min-h-[148px]">
                      {renderSlideScene(slide.id)}
                    </div>

                    {/* Slide Copy (No Numbering) */}
                    <div className="mt-4 px-1 pb-1 text-center">
                      <h2 className="text-lg font-extrabold leading-snug tracking-tight text-white text-balance sm:text-xl">
                        {slide.title}
                      </h2>
                      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-emerald-50/85 sm:text-sm">
                        {slide.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Indicator Bar + Optional Desktop / Tablet Arrow Controls */}
            <div className="mt-2.5 flex items-center justify-center gap-3 sm:justify-between">
              <button
                type="button"
                onClick={goToPrevSlide}
                aria-label={t.auth.slidePrev}
                className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
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
                className="hidden h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right / Bottom Sheet: Start Workspace & Auth Actions */}
        <section className="rounded-t-[28px] bg-white px-5 pt-6 pb-7 text-[#102A43] shadow-[0_-12px_36px_rgba(0,0,0,0.18)] sm:px-8 sm:pb-8 lg:col-span-5 lg:rounded-3xl lg:border lg:border-slate-200/90 lg:p-7 lg:shadow-lg lg:shadow-slate-900/[0.06] dark:bg-slate-900 dark:text-slate-100 dark:lg:border-slate-800 dark:lg:shadow-black/35">
          <div className="mx-auto max-w-md">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#0E6042] text-balance sm:text-[26px] dark:text-emerald-200">
                OrthoGro
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-300">
                {t.auth.subtitle}
              </p>
              <p className="mt-1.5 text-xs font-bold tracking-wide text-[#16845B] dark:text-emerald-400">
                {lang === 'bn' ? t.app.tagline : 'Track • Save • Grow'}
              </p>
            </div>

            <div className="mt-5 space-y-2.5 sm:space-y-3">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onGoogleLogin}
                className="flex min-h-[48px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-[#16845B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>{isSigningIn ? t.auth.signingIn : t.auth.getStartedGoogle}</span>
              </button>

              <button
                type="button"
                disabled={isSigningIn}
                onClick={onGuestLogin}
                className="flex min-h-[46px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <User className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                <span>{t.auth.tryGuest}</span>
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
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
        </section>
      </main>
    </div>
  );
};
