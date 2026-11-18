import React, { useEffect, useState } from 'react';
import { Delete, Lock, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { PinLength } from '../utils/appPin';

interface PinKeypadProps {
  length: PinLength;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  error?: string | null;
  enableKeyboard?: boolean;
}

export const PinKeypad: React.FC<PinKeypadProps> = ({
  length,
  value,
  onChange,
  disabled = false,
  error = null,
  enableKeyboard = true,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!enableKeyboard || disabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (value.length < length) {
          onChange(`${value}${e.key}`);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (value.length > 0) {
          onChange(value.slice(0, -1));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (value.length > 0) {
          onChange('');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableKeyboard, disabled, value, length, onChange]);

  const handleDigit = (digit: string) => {
    if (disabled || value.length >= length) return;
    onChange(`${value}${digit}`);
  };

  const handleBackspace = () => {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    if (disabled || value.length === 0) return;
    onChange('');
  };

  return (
    <div className="w-full">
      {/* PIN Dot Indicators */}
      <div className="mb-4 flex items-center justify-center gap-3.5" aria-live="polite">
        {Array.from({ length }).map((_, idx) => {
          const filled = idx < value.length;
          return (
            <span
              key={idx}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150 ${
                error
                  ? filled
                    ? 'scale-110 border-[#D94848] bg-[#D94848] dark:border-rose-400 dark:bg-rose-400'
                    : 'border-[#D94848]/60 bg-transparent dark:border-rose-500/60'
                  : filled
                  ? 'scale-110 border-[#16845B] bg-[#16845B] dark:border-emerald-400 dark:bg-emerald-400'
                  : 'border-slate-300 bg-transparent dark:border-slate-700'
              }`}
            />
          );
        })}
      </div>

      {/* Fixed height error slot to prevent layout shift */}
      <div className="mb-4 min-h-[20px] text-center">
        {error && (
          <p className="text-xs font-bold text-[#D94848] dark:text-rose-400">{error}</p>
        )}
      </div>

      {/* Tactile 3x4 Keypad */}
      <div className="mx-auto grid max-w-[276px] grid-cols-3 gap-2.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(digit)}
            className="font-mono-num flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-bold tabular-nums text-[#102A43] transition-transform hover:bg-slate-100 active:scale-95 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={handleClear}
          className="flex h-14 items-center justify-center rounded-2xl border border-transparent text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-35 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {t.appLock.clearKey}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDigit('0')}
          className="font-mono-num flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-bold tabular-nums text-[#102A43] transition-transform hover:bg-slate-100 active:scale-95 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled || value.length === 0}
          aria-label={t.appLock.backspaceAria}
          onClick={handleBackspace}
          className="flex h-14 items-center justify-center rounded-2xl border border-transparent text-slate-600 transition-colors hover:bg-slate-100 active:scale-95 disabled:opacity-35 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

interface AppPinLockScreenProps {
  pinLength: PinLength;
  accountLabel: string;
  isGuest: boolean;
  onVerifyPin: (candidate: string) => Promise<boolean>;
  onForgotReset: () => Promise<string | null | void> | string | null | void;
  onSignOutReset?: () => Promise<void> | void;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export const AppPinLockScreen: React.FC<AppPinLockScreenProps> = ({
  pinLength,
  accountLabel,
  isGuest,
  onVerifyPin,
  onForgotReset,
  onSignOutReset,
}) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  const handlePinChange = async (next: string) => {
    if (cooldownLeft > 0 || isVerifying) return;
    setErrorMsg(null);
    setPin(next);

    if (next.length === pinLength) {
      setIsVerifying(true);
      try {
        const ok = await onVerifyPin(next);
        if (!ok) {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);
          setPin('');
          if (nextAttempts >= MAX_ATTEMPTS) {
            setCooldownLeft(COOLDOWN_SECONDS);
            setFailedAttempts(0);
          } else {
            setErrorMsg(t.appLock.wrongPinError);
          }
        }
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const activeError =
    cooldownLeft > 0
      ? `${t.appLock.cooldownPrefix} ${cooldownLeft}${t.appLock.secondsSuffix}`
      : errorMsg;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F8F7] px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#16845B] dark:bg-emerald-950/60 dark:text-emerald-400">
            <Lock className="h-6 w-6" />
          </div>

          <h1 className="mt-3 text-xl font-extrabold tracking-tight text-[#0E6042] dark:text-emerald-200">
            OrthoGro
          </h1>
          <p className="mt-0.5 max-w-full truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {accountLabel}
          </p>
          <p className="mt-3 text-sm font-bold text-[#102A43] dark:text-slate-100">
            {pinLength === 6 ? t.appLock.enterUnlockPin6 : t.appLock.enterUnlockPin4}
          </p>
        </div>

        <div className="mt-5">
          <PinKeypad
            length={pinLength}
            value={pin}
            onChange={(next) => void handlePinChange(next)}
            disabled={cooldownLeft > 0 || isVerifying || showForgotConfirm}
            error={activeError}
            enableKeyboard={!showForgotConfirm}
          />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
          {!showForgotConfirm ? (
            <button
              type="button"
              onClick={() => {
                setResetError(null);
                setShowForgotConfirm(true);
              }}
              className="text-xs font-bold text-slate-500 hover:text-[#16845B] hover:underline dark:text-slate-400 dark:hover:text-emerald-400"
            >
              {isGuest ? t.appLock.forgotPinGuest : t.appLock.forgotPinGoogle}
            </button>
          ) : (
            <div
              className={`rounded-2xl border p-3.5 text-left ${
                isGuest
                  ? 'border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/25'
                  : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/25'
              }`}
            >
              <div className="flex items-start gap-2">
                <ShieldAlert
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    isGuest
                      ? 'text-[#D94848] dark:text-rose-400'
                      : 'text-[#16845B] dark:text-emerald-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                    {isGuest ? t.appLock.forgotConfirmGuestTitle : t.appLock.forgotConfirmGoogleTitle}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {isGuest ? t.appLock.forgotConfirmGuestMsg : t.appLock.forgotConfirmGoogleMsg}
                  </p>
                  {!isGuest && (
                    <p className="mt-1 truncate text-[11px] font-bold text-[#102A43] dark:text-slate-200">
                      {accountLabel}
                    </p>
                  )}
                </div>
              </div>

              {resetError && (
                <p className="mt-2.5 rounded-xl bg-rose-100/80 px-2.5 py-1.5 text-[11px] font-semibold text-[#D94848] dark:bg-rose-950/60 dark:text-rose-300">
                  {resetError}
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => {
                    setResetError(null);
                    setShowForgotConfirm(false);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    setResetError(null);
                    try {
                      const err = await onForgotReset();
                      if (typeof err === 'string' && err) {
                        setResetError(err);
                      }
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${
                    isGuest
                      ? 'bg-[#D94848] hover:bg-rose-700'
                      : 'bg-[#16845B] hover:bg-[#126B4A]'
                  }`}
                >
                  {isGuest
                    ? t.appLock.confirmResetBtn
                    : isResetting
                    ? t.appLock.verifyingGoogleBtn
                    : t.appLock.verifyGoogleBtn}
                </button>
              </div>

              {!isGuest && onSignOutReset && (
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={async () => {
                    setIsResetting(true);
                    setResetError(null);
                    try {
                      await onSignOutReset();
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  className="mt-2.5 block w-full text-center text-[11px] font-semibold text-slate-500 hover:text-[#D94848] hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-rose-400"
                >
                  {t.appLock.signOutInsteadBtn}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
