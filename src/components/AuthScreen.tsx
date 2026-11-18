import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  HandCoins,
  LogIn,
  Mic,
  Target,
  User,
  Wallet,
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
      num: '01',
      title: t.auth.feature1Title,
      desc: t.auth.feature1Desc,
      Icon: Wallet,
    },
    {
      num: '02',
      title: t.auth.feature2Title,
      desc: t.auth.feature2Desc,
      Icon: HandCoins,
    },
    {
      num: '03',
      title: t.auth.feature3Title,
      desc: t.auth.feature3Desc,
      Icon: Mic,
    },
    {
      num: '04',
      title: t.auth.feature4Title,
      desc: t.auth.feature4Desc,
      Icon: FileSpreadsheet,
    },
    {
      num: '05',
      title: t.auth.feature5Title,
      desc: t.auth.feature5Desc,
      Icon: Target,
    },
  ];

  const totalSlides = slides.length;

  useEffect(() => {
    if (mode !== 'onboarding' || isSlidePaused) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);
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

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8F7] text-[#102A43] dark:bg-slate-950 dark:text-slate-100">
      {/* Clean Top Bar: Wordmark left, EN/BN switcher right */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-3 sm:px-8 sm:py-4">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
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
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
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
            className={`min-h-[30px] rounded-lg px-2.5 py-1 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              lang === 'bn'
                ? 'bg-[#16845B] text-white'
                : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            BN
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center px-5 py-2 sm:px-8 sm:py-4">
        {mode === 'onboarding' ? (
          /* --- NEW USER OPENING PAGE: Taller Balanced Feature Slide + Minimal Login Grid --- */
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            {/* Top Feature Slide Carousel (+50% height, vertically balanced content) */}
            <section
              aria-roledescription="carousel"
              aria-label={t.auth.slideLabel}
              onMouseEnter={() => setIsSlidePaused(true)}
              onMouseLeave={() => setIsSlidePaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Slide Track */}
              <div className="overflow-hidden">
                <div
                  className="flex items-stretch transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {slides.map((slide) => {
                    const SlideIcon = slide.Icon;
                    return (
                      <div
                        key={slide.num}
                        className="flex min-h-[164px] w-full shrink-0 flex-col items-center justify-center px-2 py-2 text-center sm:min-h-[184px] sm:px-6"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#16845B]/10 text-[#16845B] sm:h-16 sm:w-16 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <SlideIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                        </div>
                        <h2 className="mt-3.5 text-lg font-extrabold leading-snug tracking-tight text-[#102A43] text-balance sm:text-xl dark:text-slate-100">
                          {slide.title}
                        </h2>
                        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
                          {slide.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Slide Controls: Step Indicators + Prev/Next Arrows */}
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="flex items-center gap-1.5" role="tablist" aria-label={t.auth.slideLabel}>
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.num}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeSlide}
                      aria-label={slide.title}
                      onClick={() => setActiveSlide(idx)}
                      className="flex h-7 items-center px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B]"
                    >
                      <span
                        className={`block h-1.5 rounded-full transition-all ${
                          idx === activeSlide
                            ? 'w-6 bg-[#16845B] dark:bg-emerald-400'
                            : 'w-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={goToPrevSlide}
                    aria-label={t.auth.slidePrev}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextSlide}
                    aria-label={t.auth.slideNext}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#102A43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Below Floating Grid: App Title & Subtitle + Google & Guest Login Options */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-lg shadow-slate-900/[0.06] sm:rounded-3xl sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/35">
              <div className="text-center">
                <h1 className="text-xl font-extrabold tracking-tight text-[#0E6042] sm:text-2xl dark:text-emerald-200">
                  OrthoGro
                </h1>
                <p className="mt-0.5 text-xs font-medium text-slate-600 sm:text-sm dark:text-slate-300">
                  {t.auth.subtitle}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-[#16845B] sm:text-xs dark:text-emerald-400">
                  {t.app.tagline}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGoogleLogin}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#16845B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2 whitespace-nowrap"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>{isSigningIn ? t.auth.signingIn : t.auth.getStartedGoogle}</span>
                </button>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGuestLogin}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <User className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                  <span>{t.auth.tryGuest}</span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {t.auth.alreadyHaveAccount}
                </span>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center gap-1 font-bold text-[#16845B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-emerald-400 whitespace-nowrap shrink-0"
                >
                  <span>{t.auth.goToSignIn}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* --- EXISTING / RETURNING USER LOGIN PAGE --- */
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 text-center">
              <p className="text-xs font-semibold tracking-wide text-[#16845B] dark:text-emerald-400">
                {t.app.tagline}
              </p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#102A43] sm:text-3xl dark:text-slate-100">
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
                  className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#16845B] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#126B4A] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2 whitespace-nowrap"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  <span>{isSigningIn ? t.auth.signingIn : t.auth.signInGoogle}</span>
                </button>

                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={onGuestLogin}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#102A43] transition-colors hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 whitespace-nowrap"
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
                  className="inline-flex items-center gap-1 font-bold text-[#16845B] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] dark:text-emerald-400 whitespace-nowrap shrink-0"
                >
                  <span>{t.auth.goToOpening}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
