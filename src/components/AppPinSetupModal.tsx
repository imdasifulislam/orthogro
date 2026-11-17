import React, { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, Lock, ShieldCheck, Unlock, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { AppPinRecord, PinLength } from '../utils/appPin';
import { PinKeypad } from './AppPinLockScreen';

type SetupFlowStep =
  | 'overview'
  | 'verify_for_change'
  | 'verify_for_disable'
  | 'create'
  | 'confirm';

interface AppPinSetupModalProps {
  open: boolean;
  pinRecord: AppPinRecord | null;
  onClose: () => void;
  onVerifyPin: (candidate: string) => Promise<boolean>;
  onSaveNewPin: (pin: string, lockOnBackground: boolean) => Promise<void>;
  onDisablePin: () => void;
  onToggleLockOnBackground: (enabled: boolean) => void;
  onLockNow: () => void;
}

export const AppPinSetupModal: React.FC<AppPinSetupModalProps> = ({
  open,
  pinRecord,
  onClose,
  onVerifyPin,
  onSaveNewPin,
  onDisablePin,
  onToggleLockOnBackground,
  onLockNow,
}) => {
  const { t } = useTranslation();
  const al = t.appLock;

  const [step, setStep] = useState<SetupFlowStep>('overview');
  const [pinLength, setPinLength] = useState<PinLength>(4);
  const [lockOnBg, setLockOnBg] = useState<boolean>(false);
  const [draftPin, setDraftPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftPin('');
    setFirstPin('');
    setErrorMsg(null);
    setIsBusy(false);
    if (pinRecord) {
      setStep('overview');
      setPinLength(pinRecord.length);
      setLockOnBg(pinRecord.lockOnBackground);
    } else {
      setStep('create');
      setPinLength(4);
      setLockOnBg(false);
    }
  }, [open, pinRecord]);

  if (!open) return null;

  const activeLength: PinLength =
    step === 'verify_for_change' || step === 'verify_for_disable'
      ? pinRecord?.length ?? 4
      : pinLength;

  const handlePinInput = async (next: string) => {
    if (isBusy) return;
    setErrorMsg(null);
    setDraftPin(next);

    if (next.length < activeLength) return;

    if (step === 'verify_for_change' || step === 'verify_for_disable') {
      setIsBusy(true);
      try {
        const ok = await onVerifyPin(next);
        if (!ok) {
          setDraftPin('');
          setErrorMsg(al.wrongPinError);
          return;
        }
        if (step === 'verify_for_disable') {
          onDisablePin();
          onClose();
          return;
        }
        setDraftPin('');
        setFirstPin('');
        setStep('create');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (step === 'create') {
      setFirstPin(next);
      setDraftPin('');
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (next !== firstPin) {
        setDraftPin('');
        setErrorMsg(al.pinMismatchError);
        return;
      }
      setIsBusy(true);
      try {
        await onSaveNewPin(next, lockOnBg);
        onClose();
      } finally {
        setIsBusy(false);
      }
    }
  };

  const stepPrompt = (() => {
    if (step === 'verify_for_change' || step === 'verify_for_disable') {
      return al.enterCurrentPin;
    }
    if (step === 'confirm') {
      return al.confirmPinPrompt;
    }
    return pinLength === 6 ? al.enterNewPin6 : al.enterNewPin4;
  })();

  const canGoBackToOverview =
    Boolean(pinRecord) && (step === 'verify_for_change' || step === 'verify_for_disable' || step === 'create' || step === 'confirm');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={al.title}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              {pinRecord ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#102A43] dark:text-slate-100">
                {al.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {pinRecord ? al.subtitleOn : al.subtitleOff}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'overview' && pinRecord ? (
          <div className="space-y-4">
            {/* Active Status Box */}
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#16845B] dark:text-emerald-400" />
                <span className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                  {pinRecord.length === 6 ? al.statusOn6 : al.statusOn4}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLockNow();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#16845B] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#126B4A]"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{al.lockNowBtn}</span>
              </button>
            </div>

            {/* Auto-lock background toggle */}
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#102A43] dark:text-slate-100">
                  {al.autoLockLabel}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {al.autoLockDesc}
                </div>
              </div>
              <input
                type="checkbox"
                checked={lockOnBg}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setLockOnBg(checked);
                  onToggleLockOnBackground(checked);
                }}
                className="h-5 w-5 shrink-0 accent-[#16845B]"
              />
            </label>

            {/* Change / Disable actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setDraftPin('');
                  setErrorMsg(null);
                  setStep('verify_for_change');
                }}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-[#102A43] transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{al.changePinBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftPin('');
                  setErrorMsg(null);
                  setStep('verify_for_disable');
                }}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-xs font-bold text-[#D94848] transition-colors hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60"
              >
                <Unlock className="h-4 w-4" />
                <span>{al.disablePinBtn}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back button during multi-step */}
            {(canGoBackToOverview || step === 'confirm') && (
              <button
                type="button"
                onClick={() => {
                  setDraftPin('');
                  setErrorMsg(null);
                  if (step === 'confirm') {
                    setFirstPin('');
                    setStep('create');
                  } else if (pinRecord) {
                    setStep('overview');
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{al.backBtn}</span>
              </button>
            )}

            {/* Length selector during initial PIN creation */}
            {step === 'create' && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {al.pinLengthLabel}
                </span>
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
                  {([4, 6] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => {
                        setPinLength(len);
                        setDraftPin('');
                        setErrorMsg(null);
                      }}
                      className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                        pinLength === len
                          ? 'bg-[#16845B] text-white'
                          : 'text-slate-600 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {len === 4 ? al.digits4 : al.digits6}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Auto-lock toggle shown during initial setup too */}
            {!pinRecord && step === 'create' && (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {al.autoLockLabel}
                </span>
                <input
                  type="checkbox"
                  checked={lockOnBg}
                  onChange={(e) => setLockOnBg(e.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[#16845B]"
                />
              </label>
            )}

            {/* Step Title */}
            <div className="pt-1 text-center text-sm font-bold text-[#102A43] dark:text-slate-100">
              {stepPrompt}
            </div>

            <PinKeypad
              length={activeLength}
              value={draftPin}
              onChange={(next) => void handlePinInput(next)}
              disabled={isBusy}
              error={errorMsg}
              enableKeyboard={open}
            />
          </div>
        )}
      </div>
    </div>
  );
};
