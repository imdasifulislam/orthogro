import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Calculator,
  Check,
  FileText,
  HelpCircle,
  Mic,
  Plus,
  Send,
  ShoppingBasket,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { getTranslations, useTranslation } from '../i18n';
import type {
  AppLanguage,
  BazarMemo,
  CurrencySymbol,
  Transaction,
  TransactionDraft,
} from '../types';
import { formatMoney } from '../utils/format';
import {
  type AssistantCalculationResult,
  type AssistantMemoDraft,
  type AssistantNoteDraft,
  interpretAssistantCommand,
} from '../utils/localAssistant';

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface AssistantDrawerProps {
  showButton: boolean;
  isReadOnlyPartner: boolean;
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  walletBalances: Record<string, number>;
  netWorth: number;
  expenseCategories: string[];
  incomeCategories: string[];
  expenseSubCategories?: Record<string, string[]>;
  defaultEntry: TransactionDraft;
  currency: CurrencySymbol;
  onSaveTransactions: (drafts: TransactionDraft[]) => Promise<boolean>;
  onOpenTransactionsInForm: (drafts: TransactionDraft[]) => void;
  onSaveMemo: (
    memo: Omit<BazarMemo, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onAddMemoAsExpense: (payload: {
    title: string;
    amount: number;
    category: string;
    wallet: string;
    rawDate: string;
    note: string;
  }) => Promise<void>;
  onSaveNote: (note: { title: string; content: string; date: string }) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
  onNavigateAfterSave?: (
    target: 'recent_transactions' | 'saved_memos' | 'saved_notes'
  ) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type ActivePreview =
  | { kind: 'transaction'; drafts: TransactionDraft[] }
  | { kind: 'memo'; memo: AssistantMemoDraft }
  | { kind: 'note'; note: AssistantNoteDraft }
  | { kind: 'calculation'; calc: AssistantCalculationResult }
  | { kind: 'unknown' };

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  showButton,
  isReadOnlyPartner,
  transactions,
  wallets,
  savingsList,
  walletBalances,
  netWorth,
  expenseCategories,
  incomeCategories,
  expenseSubCategories,
  defaultEntry,
  currency,
  onSaveTransactions,
  onOpenTransactionsInForm,
  onSaveMemo,
  onAddMemoAsExpense,
  onSaveNote,
  onNotify,
  onNavigateAfterSave,
  isOpen: controlledIsOpen,
  onOpenChange,
}) => {
  const { lang, t } = useTranslation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (next: boolean) => {
    if (controlledIsOpen === undefined) {
      setInternalIsOpen(next);
    }
    onOpenChange?.(next);
  };
  const [showHelp, setShowHelp] = useState(false);
  const [inputText, setInputText] = useState('');
  const [speechLang, setSpeechLang] = useState<AppLanguage>(lang);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ActivePreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const speechSupported = Boolean(getSpeechRecognitionCtor());
  const allAccounts = [...wallets, ...savingsList];

  useEffect(() => {
    setSpeechLang(lang);
  }, [lang]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (!isOpen && isListening) {
      stopListening();
    }
  }, [isOpen, isListening]);

  const handleClose = () => {
    stopListening();
    setIsOpen(false);
  };

  const runCommand = (rawCommand: string) => {
    const cleaned = rawCommand.trim();
    if (!cleaned) return;
    setVoiceError(null);
    setShowHelp(false);

    const intent = interpretAssistantCommand(cleaned, {
      lang,
      transactions,
      wallets,
      savingsList,
      walletBalances,
      netWorth,
      expenseCategories,
      incomeCategories,
      expenseSubCategories,
      defaultEntry,
      currency,
      t,
    });

    setPreview(intent);
  };

  const runCommandRef = useRef(runCommand);
  runCommandRef.current = runCommand;

  const startListening = () => {
    const SpeechRecCtor = getSpeechRecognitionCtor();
    if (!SpeechRecCtor) {
      setVoiceError(getTranslations(speechLang).assistant.voiceUnsupported);
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setVoiceError(null);
    const recognition = new SpeechRecCtor();
    recognition.lang = speechLang === 'bn' ? 'bn-BD' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let fullText = '';
      let hasFinal = false;
      for (let i = 0; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (res?.[0]?.transcript) {
          fullText += res[0].transcript;
        }
        if (res?.isFinal) {
          hasFinal = true;
        }
      }
      const trimmed = fullText.trim();
      setInputText(trimmed);
      if (hasFinal && trimmed) {
        runCommandRef.current(trimmed);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const voiceA = getTranslations(speechLang).assistant;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceError(voiceA.voicePermissionDenied);
      } else if (event.error === 'no-speech') {
        setVoiceError(voiceA.voiceNoSpeech);
      } else if (event.error !== 'aborted') {
        setVoiceError(voiceA.voiceError);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError(getTranslations(speechLang).assistant.voiceError);
    }
  };

  const handleSaveTxPreview = async () => {
    if (preview?.kind !== 'transaction') return;
    if (isReadOnlyPartner) {
      onNotify('info', t.sharing.readOnlyToast);
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await onSaveTransactions(preview.drafts);
      if (ok) {
        setPreview(null);
        setInputText('');
        handleClose();
        onNavigateAfterSave?.('recent_transactions');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveMemoPreview = async (asExpense: boolean) => {
    if (preview?.kind !== 'memo') return;
    if (isReadOnlyPartner) {
      onNotify('info', t.sharing.readOnlyToast);
      return;
    }
    const validItems = preview.memo.items
      .filter((it) => it.name.trim() !== '')
      .map((it) => {
        const parsed = parseFloat(it.price);
        return {
          name: it.name.trim(),
          price: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
        };
      });

    if (validItems.length === 0) {
      onNotify('error', t.toasts.needMemoItem);
      return;
    }

    const total = validItems.reduce((s, it) => s + it.price, 0);
    if (asExpense && total <= 0) {
      onNotify('error', t.toasts.needMemoPriceForExpense);
      return;
    }

    setIsSubmitting(true);
    try {
      if (asExpense) {
        const itemsDescription = validItems
          .map((i) => (i.price > 0 ? `${i.name}: ${formatMoney(i.price, currency)}` : i.name))
          .join(', ');
        await onAddMemoAsExpense({
          title:
            preview.memo.note.trim() || `${t.memo.bazarMemoPrefix} (${preview.memo.date})`,
          amount: total,
          category: preview.memo.category,
          wallet: preview.memo.wallet,
          rawDate: preview.memo.date,
          note: itemsDescription,
        });
      } else {
        await onSaveMemo({
          date: preview.memo.date,
          category: preview.memo.category,
          wallet: preview.memo.wallet,
          items: validItems,
          total,
          note: preview.memo.note.trim(),
        });
      }
      setPreview(null);
      setInputText('');
      handleClose();
      onNavigateAfterSave?.(asExpense ? 'recent_transactions' : 'saved_memos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotePreview = async () => {
    if (preview?.kind !== 'note') return;
    if (isReadOnlyPartner) {
      onNotify('info', t.sharing.readOnlyToast);
      return;
    }
    if (!preview.note.title.trim() && !preview.note.content.trim()) {
      onNotify('error', t.toasts.needNoteContent);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSaveNote({
        title: preview.note.title.trim() || t.common.untitled,
        content: preview.note.content.trim(),
        date: preview.note.date,
      });
      setPreview(null);
      setInputText('');
      handleClose();
      onNavigateAfterSave?.('saved_notes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerExample = (example: string) => {
    setInputText(example);
    runCommand(example);
  };

  if (!showButton && !isOpen) return null;

  return (
    <>
      {/* Floating Assistant Trigger above bottom nav bar */}
      {showButton && !isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 60);
          }}
          aria-label={t.assistant.openAria}
          title={t.assistant.title}
          className="fixed right-4 bottom-20 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100 text-[#16845B] shadow-md shadow-slate-900/10 transition-transform hover:scale-105 hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16845B] focus-visible:ring-offset-2 lg:right-6 lg:bottom-6 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400 dark:shadow-black/35 dark:hover:bg-slate-700"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}

      {/* Assistant Command Sheet / Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
          onClick={handleClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header with Help/Info icon + EN/BN voice toggle + Close */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3.5 sm:px-5 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#16845B]/12 text-[#16845B] dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-extrabold text-[#102A43] sm:text-base dark:text-slate-100">
                    {t.assistant.title}
                  </h2>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {t.assistant.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {/* Speech recognition language toggle */}
                <div
                  role="group"
                  aria-label={t.txForm.voiceSpeechLangAria}
                  className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) stopListening();
                      setSpeechLang('en');
                    }}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                      speechLang === 'en'
                        ? 'bg-[#16845B] text-white'
                        : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isListening) stopListening();
                      setSpeechLang('bn');
                    }}
                    className={`rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
                      speechLang === 'bn'
                        ? 'bg-[#16845B] text-white'
                        : 'text-slate-500 hover:text-[#102A43] dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    BN
                  </button>
                </div>

                {/* Help / Instructions toggle button */}
                <button
                  type="button"
                  onClick={() => setShowHelp((prev) => !prev)}
                  aria-label={t.assistant.helpBtnAria}
                  title={t.assistant.helpBtnAria}
                  aria-pressed={showHelp}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    showHelp
                      ? 'bg-[#16845B] text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-[#102A43] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <HelpCircle className="h-4.5 w-4.5" />
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  aria-label={t.common.close}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-[#102A43] dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body: Help Guide OR Active Preview / Quick Starters */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {showHelp ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#102A43] dark:text-slate-100">
                      {t.assistant.helpTitle}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {t.assistant.helpIntro}
                    </p>
                  </div>

                  {/* Group 1: Transactions */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="text-xs font-bold text-[#16845B] dark:text-emerald-400">
                      {t.assistant.helpGroupTx}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[t.assistant.exTx1, t.assistant.exTx2, t.assistant.exTx3, t.assistant.exTx4].map(
                        (ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => triggerExample(ex)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#16845B] hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
                          >
                            {ex}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Group 2: Bazar Memo */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="text-xs font-bold text-[#16845B] dark:text-emerald-400">
                      {t.assistant.helpGroupMemo}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[t.assistant.exMemo1, t.assistant.exMemo2].map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => triggerExample(ex)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#16845B] hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Group 3: Personal Notes */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="text-xs font-bold text-[#16845B] dark:text-emerald-400">
                      {t.assistant.helpGroupNote}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => triggerExample(t.assistant.exNote1)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#16845B] hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
                      >
                        {t.assistant.exNote1}
                      </button>
                    </div>
                  </div>

                  {/* Group 4: Calculations & Queries */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="text-xs font-bold text-[#16845B] dark:text-emerald-400">
                      {t.assistant.helpGroupCalc}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[t.assistant.exCalc1, t.assistant.exCalc2, t.assistant.exCalc3].map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => triggerExample(ex)}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#16845B] hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : preview ? (
                /* --- ACTIVE PREVIEW CARD --- */
                <div className="space-y-3">
                  {preview.kind === 'calculation' && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#16845B] dark:text-emerald-400">
                        <Calculator className="h-4 w-4 shrink-0" />
                        <span>{t.assistant.calcResultTitle}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {preview.calc.subtitle || preview.calc.expression}
                      </p>
                      <div className="font-mono-num mt-2 text-2xl font-extrabold text-[#102A43] dark:text-slate-100">
                        {preview.calc.answerText}
                      </div>

                      {preview.calc.numericValue !== undefined &&
                        preview.calc.numericValue > 0 &&
                        !preview.calc.subtitle && (
                          <button
                            type="button"
                            onClick={() => {
                              onOpenTransactionsInForm([
                                {
                                  ...defaultEntry,
                                  type: 'expense',
                                  amount: String(preview.calc.numericValue),
                                  title: preview.calc.expression,
                                },
                              ]);
                              handleClose();
                            }}
                            className="mt-3 inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-[#102A43] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          >
                            <Plus className="h-3.5 w-3.5 text-[#16845B] dark:text-emerald-400" />
                            <span>{t.assistant.calcUseAsExpense}</span>
                          </button>
                        )}
                    </div>
                  )}

                  {preview.kind === 'transaction' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-[#16845B] dark:text-emerald-400">
                        {t.assistant.previewTxTitle} ({preview.drafts.length})
                      </div>

                      {preview.drafts.map((draft, idx) => {
                        const cats =
                          draft.type === 'income' ? incomeCategories : expenseCategories;
                        const updateDraft = (patch: Partial<TransactionDraft>) => {
                          setPreview((prev) => {
                            if (prev?.kind !== 'transaction') return prev;
                            return {
                              kind: 'transaction',
                              drafts: prev.drafts.map((d, i) =>
                                i === idx ? { ...d, ...patch } : d
                              ),
                            };
                          });
                        };

                        return (
                          <div
                            key={idx}
                            className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                          >
                            {preview.drafts.length > 1 && (
                              <div className="text-[11px] font-bold text-slate-500">
                                {t.assistant.entryWord} #{idx + 1}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={draft.type}
                                onChange={(e) =>
                                  updateDraft({
                                    type: e.target.value as TransactionDraft['type'],
                                  })
                                }
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              >
                                <option value="expense">{t.common.expense}</option>
                                <option value="income">{t.common.income}</option>
                                <option value="transfer">{t.common.transfer}</option>
                                <option value="lend">{t.common.lend}</option>
                                <option value="borrow">{t.common.borrow}</option>
                              </select>

                              <input
                                type="date"
                                value={draft.date}
                                onChange={(e) => updateDraft({ date: e.target.value })}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder={t.txForm.titleLabel}
                                value={draft.title}
                                onChange={(e) => updateDraft({ title: e.target.value })}
                                className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                placeholder={`${t.txForm.amountLabel} (${currency})`}
                                value={draft.amount}
                                onChange={(e) => updateDraft({ amount: e.target.value })}
                                className="font-mono-num rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </div>

                            {draft.type === 'transfer' ? (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={draft.fromWallet}
                                  onChange={(e) => updateDraft({ fromWallet: e.target.value })}
                                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                  {allAccounts.map((a) => (
                                    <option key={a} value={a}>
                                      {a}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={draft.toWallet}
                                  onChange={(e) => updateDraft({ toWallet: e.target.value })}
                                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                  {allAccounts.map((a) => (
                                    <option key={a} value={a}>
                                      {a}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={draft.wallet}
                                  onChange={(e) => updateDraft({ wallet: e.target.value })}
                                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                >
                                  {allAccounts.map((a) => (
                                    <option key={a} value={a}>
                                      {a}
                                    </option>
                                  ))}
                                </select>

                                {draft.type !== 'lend' && draft.type !== 'borrow' && (
                                  <select
                                    value={draft.category}
                                    onChange={(e) => updateDraft({ category: e.target.value })}
                                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                  >
                                    {cats.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSaveTxPreview}
                          className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#16845B] px-3 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-60"
                        >
                          <Check className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t.assistant.previewTxSave}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenTransactionsInForm(preview.drafts);
                            handleClose();
                          }}
                          className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-[#102A43] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          {t.assistant.previewTxOpenForm}
                        </button>
                      </div>
                    </div>
                  )}

                  {preview.kind === 'memo' && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#16845B] dark:text-emerald-400">
                          <ShoppingBasket className="h-4 w-4 shrink-0" />
                          <span>{t.assistant.previewMemoTitle}</span>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-[#102A43] dark:text-slate-100">
                          {(() => {
                            const sum = preview.memo.items.reduce(
                              (s, it) => s + (parseFloat(it.price) || 0),
                              0
                            );
                            return sum > 0
                              ? `${t.common.total}: ${formatMoney(sum, currency)}`
                              : t.memo.plannedNoPrice;
                          })()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={preview.memo.category}
                          onChange={(e) =>
                            setPreview((prev) =>
                              prev?.kind === 'memo'
                                ? { ...prev, memo: { ...prev.memo, category: e.target.value } }
                                : prev
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {expenseCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <select
                          value={preview.memo.wallet}
                          onChange={(e) =>
                            setPreview((prev) =>
                              prev?.kind === 'memo'
                                ? { ...prev, memo: { ...prev.memo, wallet: e.target.value } }
                                : prev
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {allAccounts.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        {preview.memo.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder={`${t.memo.itemPlaceholder} ${idx + 1}`}
                              value={item.name}
                              onChange={(e) =>
                                setPreview((prev) => {
                                  if (prev?.kind !== 'memo') return prev;
                                  const nextItems = prev.memo.items.map((it, i) =>
                                    i === idx ? { ...it, name: e.target.value } : it
                                  );
                                  return { ...prev, memo: { ...prev.memo, items: nextItems } };
                                })
                              }
                              className="min-w-0 flex-[2] rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder={t.memo.pricePlaceholder}
                              value={item.price}
                              onChange={(e) =>
                                setPreview((prev) => {
                                  if (prev?.kind !== 'memo') return prev;
                                  const nextItems = prev.memo.items.map((it, i) =>
                                    i === idx ? { ...it, price: e.target.value } : it
                                  );
                                  return { ...prev, memo: { ...prev.memo, items: nextItems } };
                                })
                              }
                              className="font-mono-num min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            {preview.memo.items.length > 1 && (
                              <button
                                type="button"
                                aria-label={t.common.remove}
                                onClick={() =>
                                  setPreview((prev) => {
                                    if (prev?.kind !== 'memo') return prev;
                                    return {
                                      ...prev,
                                      memo: {
                                        ...prev.memo,
                                        items: prev.memo.items.filter((_, i) => i !== idx),
                                      },
                                    };
                                  })
                                }
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPreview((prev) =>
                            prev?.kind === 'memo'
                              ? {
                                  ...prev,
                                  memo: {
                                    ...prev.memo,
                                    items: [...prev.memo.items, { name: '', price: '' }],
                                  },
                                }
                              : prev
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t.memo.addRow}</span>
                      </button>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSaveMemoPreview(false)}
                          className="min-h-[42px] rounded-xl bg-[#16845B] px-3 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-60"
                        >
                          {t.assistant.previewMemoSave}
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleSaveMemoPreview(true)}
                          className="min-h-[42px] rounded-xl bg-[#102A43] px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-sky-700 dark:hover:bg-sky-600"
                        >
                          {t.assistant.previewMemoSaveExpense}
                        </button>
                      </div>
                    </div>
                  )}

                  {preview.kind === 'note' && (
                    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#16845B] dark:text-emerald-400">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span>{t.assistant.previewNoteTitle}</span>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                          {t.assistant.noteTitleLabel}
                        </label>
                        <input
                          type="text"
                          value={preview.note.title}
                          onChange={(e) =>
                            setPreview((prev) =>
                              prev?.kind === 'note'
                                ? { ...prev, note: { ...prev.note, title: e.target.value } }
                                : prev
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                          {t.assistant.noteContentLabel}
                        </label>
                        <textarea
                          rows={3}
                          value={preview.note.content}
                          onChange={(e) =>
                            setPreview((prev) =>
                              prev?.kind === 'note'
                                ? { ...prev, note: { ...prev.note, content: e.target.value } }
                                : prev
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-[#102A43] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSaveNotePreview}
                        className="min-h-[42px] w-full rounded-xl bg-[#16845B] px-4 py-2 text-xs font-bold text-white hover:bg-[#126B4A] disabled:opacity-60"
                      >
                        {t.assistant.previewNoteSave}
                      </button>
                    </div>
                  )}

                  {preview.kind === 'unknown' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {t.assistant.unknownTitle}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                        {t.assistant.unknownDesc}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowHelp(true)}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#16845B] hover:underline dark:text-emerald-400"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>{t.assistant.openGuideBtn}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* --- INITIAL QUICK EXAMPLES --- */
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t.assistant.helpIntro}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      t.assistant.exTx1,
                      t.assistant.exMemo1,
                      t.assistant.exNote1,
                      t.assistant.exCalc2,
                    ].map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => triggerExample(ex)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-[#102A43] transition-colors hover:border-[#16845B] hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-500"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Input + Mic Bar */}
            <div className="border-t border-slate-200 bg-slate-50/70 p-3.5 sm:px-5 dark:border-slate-800 dark:bg-slate-950/50">
              {isListening && (
                <p className="mb-2 text-xs font-semibold text-[#16845B] dark:text-emerald-400">
                  {t.assistant.listening}
                </p>
              )}
              {voiceError && (
                <p className="mb-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {voiceError}
                </p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runCommand(inputText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.assistant.inputPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#102A43] focus:border-[#16845B] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />

                {inputText.trim() && (
                  <button
                    type="submit"
                    aria-label={t.assistant.runBtn}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102A43] text-white transition-colors hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}

                {speechSupported && (
                  <button
                    type="button"
                    onClick={startListening}
                    aria-label={isListening ? t.txForm.voiceStopBtn : t.txForm.voiceStartBtn}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-colors ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-[#16845B] hover:bg-[#126B4A]'
                    }`}
                  >
                    {isListening ? (
                      <Square className="h-4 w-4 fill-current" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
