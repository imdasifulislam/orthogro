import type { Translations } from '../i18n';
import type {
  AppLanguage,
  CurrencySymbol,
  Transaction,
  TransactionDraft,
} from '../types';
import { formatMoney, getTodayISO } from './format';
import {
  normalizeSpokenNumbers,
  parseVoiceTransactionCommand,
} from './voiceTransactionParser';

export interface AssistantMemoItemDraft {
  name: string;
  price: string; // blank string when 0 / pre-plan
}

export interface AssistantMemoDraft {
  date: string;
  category: string;
  wallet: string;
  note: string;
  items: AssistantMemoItemDraft[];
}

export interface AssistantNoteDraft {
  title: string;
  content: string;
  date: string;
}

export interface AssistantCalculationResult {
  expression: string;
  answerText: string;
  numericValue?: number;
  subtitle?: string;
}

export type AssistantIntent =
  | { kind: 'transaction'; drafts: TransactionDraft[] }
  | { kind: 'memo'; memo: AssistantMemoDraft }
  | { kind: 'note'; note: AssistantNoteDraft }
  | { kind: 'calculation'; calc: AssistantCalculationResult }
  | { kind: 'unknown' };

export interface AssistantContext {
  lang: AppLanguage;
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
  t: Translations;
}

function getOffsetDateISO(deltaDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WALLET_SYNONYMS: Record<string, string[]> = {
  bank: ['bank', 'ব্যাংক', 'ব্যাংকে', 'ব্যাংক থেকে'],
  bkash: ['bkash', 'b cash', 'bikash', 'বিকাশ', 'বিকাশে', 'বিকাশ থেকে'],
  nagad: ['nagad', 'nogod', 'নগদ', 'নগদে', 'নগদ থেকে'],
  cash: ['cash', 'hand cash', 'pocket', 'ক্যাশ', 'হাতে'],
  rocket: ['rocket', 'রকেট'],
  upay: ['upay', 'উপায়'],
};

function findMatchingAccount(text: string, accounts: string[]): string | null {
  const lower = text.toLowerCase();
  const sorted = [...accounts].sort((a, b) => b.length - a.length);
  for (const acc of sorted) {
    const accLower = acc.toLowerCase();
    const aliases = WALLET_SYNONYMS[accLower] || [accLower];
    for (const alias of aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return acc;
      }
    }
  }
  return null;
}

function findMatchingCategory(text: string, categories: string[]): string | null {
  const lower = text.toLowerCase();
  const sorted = [...categories].sort((a, b) => b.length - a.length);
  for (const cat of sorted) {
    if (lower.includes(cat.toLowerCase())) {
      return cat;
    }
  }
  // Common Bengali/English category hints
  const hints: Array<{ catKeys: string[]; words: string[] }> = [
    { catKeys: ['food', 'groceries', 'bazar', 'meal'], words: ['খাবার', 'বাজার', 'food', 'grocer'] },
    { catKeys: ['transport', 'travel'], words: ['যাতায়াত', 'ভাড়া', 'transport', 'uber', 'rickshaw'] },
    { catKeys: ['utilities', 'bills', 'bill'], words: ['বিল', 'বিদ্যুৎ', 'ইন্টারনেট', 'utility', 'bill'] },
    { catKeys: ['health', 'medical'], words: ['ডাক্তার', 'ওষুধ', 'স্বাস্থ্য', 'medical', 'health'] },
    { catKeys: ['shopping'], words: ['কেনাকাটা', 'শপিং', 'shopping'] },
    { catKeys: ['salary'], words: ['বেতন', 'স্যালারি', 'salary'] },
  ];
  for (const h of hints) {
    if (h.words.some((w) => lower.includes(w))) {
      const match = sorted.find((cat) => h.catKeys.some((k) => cat.toLowerCase().includes(k)));
      if (match) return match;
    }
  }
  return null;
}

/* --- Safe Recursive-Descent Math Evaluator --- */
function tryEvaluateArithmetic(raw: string): { expr: string; value: number } | null {
  let s = normalizeSpokenNumbers(raw.trim());
  s = s
    .replace(/^(?:calculate|calc|compute|evaluate|math|what is|whats|what's|হিসাব করো|হিসাব কর|হিসাব)\s*[:=-]?\s*/i, '')
    .replace(/\s*(?:যোগ|plus)\s*/gi, ' + ')
    .replace(/\s*(?:বিয়োগ|বিয়োগ|minus)\s*/gi, ' - ')
    .replace(/\s*(?:গুণ|multiply by|multiplied by|times)\s*/gi, ' * ')
    .replace(/\s*(?:ভাগ|divided by|divide by)\s*/gi, ' / ')
    .replace(/[×]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/(\d+(?:\.\d+)?)\s*%\s*(?:of|এর)\s*(\d+(?:\.\d+)?)/gi, '(($1/100)*$2)')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')
    .replace(/,/g, '')
    .replace(/\?+$/g, '')
    .trim();

  // Must contain at least one arithmetic operator and only valid math characters
  if (!/[+\-*/()]/.test(s)) return null;
  if (!/^[0-9+\-*/().\s]+$/.test(s)) return null;

  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      let dotCount = 0;
      while (i < s.length && /[0-9.]/.test(s[i])) {
        if (s[i] === '.') dotCount += 1;
        if (dotCount > 1) return null;
        num += s[i];
        i += 1;
      }
      if (num === '.') return null;
      tokens.push(num);
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    return null;
  }

  if (tokens.length === 0) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  const parseExpr = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseFactor();
      if (right === null) return null;
      if (op === '/' && right === 0) return null;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };

  const parseFactor = (): number | null => {
    if (peek() === '+') {
      consume();
      return parseFactor();
    }
    if (peek() === '-') {
      consume();
      const val = parseFactor();
      return val === null ? null : -val;
    }
    if (peek() === '(') {
      consume();
      const val = parseExpr();
      if (val === null || peek() !== ')') return null;
      consume();
      return val;
    }
    const tok = consume();
    if (!tok || !/^\d*(?:\.\d+)?$/.test(tok)) return null;
    const n = Number(tok);
    return Number.isFinite(n) ? n : null;
  };

  const result = parseExpr();
  if (result === null || pos !== tokens.length || !Number.isFinite(result)) {
    return null;
  }
  return { expr: s, value: Math.round(result * 10000) / 10000 };
}

/* --- Note Intent --- */
function tryParseNote(raw: string): AssistantNoteDraft | null {
  const trimmed = raw.trim();
  const notePrefix =
    /^(?:(?:add|create|make|save|write|new)\s+(?:a\s+)?note|note|remind me|reminder|নোট\s*(?:লিখো|লিখ|করো|সেভ করো|রাখো)?|লিখে\s*রাখো|মনে\s*রাখো)\s*[:\-–]?\s+(.+)$/is;
  const m = trimmed.match(notePrefix);
  if (!m) return null;

  const body = m[1].trim();
  if (!body) return null;

  let title = '';
  let content = body;

  // Split "Title: Body" or "Title - Body" if concise prefix exists
  const splitMatch = body.match(/^([^:\n\-–]{2,45})\s*[:\-–]\s+(.+)$/s);
  if (splitMatch) {
    title = splitMatch[1].trim();
    content = splitMatch[2].trim();
  } else {
    const words = body.split(/\s+/);
    title = words.slice(0, 5).join(' ');
    if (words.length > 5) title += '...';
  }

  return {
    title: title.slice(0, 200),
    content: content.slice(0, 20000),
    date: getTodayISO(),
  };
}

/* --- Bazar Memo Intent (Prices Optional) --- */
function tryParseMemo(raw: string, ctx: AssistantContext): AssistantMemoDraft | null {
  const normalized = normalizeSpokenNumbers(raw.trim());
  const lower = normalized.toLowerCase();

  const isExplicitMemo =
    /(?:\bbazar\s*memo\b|\bbazaar\s*memo\b|\bbazar\s*list\b|\bbazaar\s*list\b|\bshopping\s*list\b|\bmarket\s*list\b|\bpre[\s-]?plan\b|^memo\s*[:\-]|^(?:create|make|add|new|save)\s+(?:a\s+)?memo\b|বাজার\s*মেমো|বাজার\s*তালিকা|বাজারের\s*তালিকা|বাজার\s*লিস্ট|^মেমো\s*[:\-])/.test(
      lower
    );

  if (!isExplicitMemo) return null;

  const allAccounts = [...ctx.wallets, ...ctx.savingsList];
  let date = getTodayISO();
  if (/\b(?:yesterday|গতকাল)\b/i.test(normalized)) {
    date = getOffsetDateISO(-1);
  } else if (/\b(?:tomorrow|আগামীকাল)\b/i.test(normalized)) {
    date = getOffsetDateISO(1);
  }

  let body = normalized
    .replace(
      /^(?:(?:please\s+)?(?:create|make|add|new|save)\s+(?:a\s+)?)?(?:bazar\s*memo|bazaar\s*memo|bazar\s*list|bazaar\s*list|shopping\s*list|market\s*list|pre[\s-]?plan|memo|বাজার\s*মেমো|বাজার\s*তালিকা|বাজারের\s*তালিকা|বাজার\s*লিস্ট|মেমো)\s*[:\-–]?\s*/i,
      ''
    )
    .trim();

  // Detect optional wallet mention (e.g., "from Bkash", "via Cash", "বিকাশ থেকে")
  let wallet = ctx.wallets[0] || allAccounts[0] || 'Cash';
  const matchedWallet = findMatchingAccount(body, allAccounts);
  if (matchedWallet) {
    wallet = matchedWallet;
    const aliases = WALLET_SYNONYMS[matchedWallet.toLowerCase()] || [matchedWallet];
    for (const alias of aliases) {
      const re = new RegExp(
        `\\b(?:from|via|using|with|by)?\\s*${escapeRegExp(alias)}\\b|\\s*${escapeRegExp(alias)}\\s*(?:থেকে|দিয়ে|দিয়ে|এ)?`,
        'gi'
      );
      body = body.replace(re, ' ');
    }
  }

  // Detect optional category (prefer Grocery/Food/Bazar category if available)
  const matchedCat =
    findMatchingCategory(body, ctx.expenseCategories) ||
    ctx.expenseCategories.find((c) => /grocer|food|bazar|market/i.test(c)) ||
    ctx.expenseCategories[0] ||
    'Others';

  body = body
    .replace(/\b(?:today|yesterday|tomorrow|আজ|গতকাল|আগামীকাল)\b/gi, ' ')
    .trim();

  const segments = body
    .split(/(?:,|\n|;|\+|\band\b|\s+ও\s+|\s+আর\s+|\s+এবং\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const items: AssistantMemoItemDraft[] = [];
  for (const seg of segments) {
    // Strip currency tokens
    const cleanedSeg = seg
      .replace(/(?:৳|\$|€|£|₹|\btaka\b|\btk\b|\bbdt\b|টাকা)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanedSeg) continue;

    // Match "item 420" / "item - 420" / "item: 420"
    const trailingMatch = cleanedSeg.match(/^(.+?)\s*[:\-–]?\s*(\d+(?:\.\d+)?)$/);
    // Match "420 item" (when quantity isn't kg/gm/pcs)
    const leadingMatch = cleanedSeg.match(/^(\d+(?:\.\d+)?)\s+(?!kg\b|g\b|gm\b|pcs\b|pc\b|l\b|ltr\b|কেজি\b|গ্রাম\b|টা\b|টি\b)(.+)$/i);

    if (trailingMatch && trailingMatch[1].trim() && !/^\d+(?:\.\d+)?$/.test(trailingMatch[1].trim())) {
      items.push({
        name: trailingMatch[1].trim().replace(/[:\-–]+$/, '').trim(),
        price: Number(trailingMatch[2]) > 0 ? trailingMatch[2] : '',
      });
    } else if (leadingMatch && leadingMatch[2].trim()) {
      items.push({
        name: leadingMatch[2].trim(),
        price: Number(leadingMatch[1]) > 0 ? leadingMatch[1] : '',
      });
    } else {
      items.push({
        name: cleanedSeg,
        price: '',
      });
    }
  }

  if (items.length === 0) {
    items.push({ name: '', price: '' });
  }

  return {
    date,
    category: matchedCat,
    wallet,
    note: '',
    items,
  };
}

/* --- Live Financial Query Intent --- */
function tryParseLedgerQuery(
  raw: string,
  ctx: AssistantContext
): AssistantCalculationResult | null {
  const normalized = normalizeSpokenNumbers(raw.trim());
  const lower = normalized.toLowerCase();

  const looksLikeQuestion =
    /(?:\?|how much|what is|what's|whats|total|check|show|balance|net worth|owe|owes|due|কত|ব্যালেন্স|নিট সম্পদ|মোট|বাকি|পাবো|দিবো)/.test(
      lower
    );
  if (!looksLikeQuestion) return null;

  // Avoid stealing explicit write commands like "paid due 500" or "spent 450"
  if (
    /^(?:spent|paid|bought|add|received|got|transfer|lent|borrowed|দিয়েছি|খরচ করেছি|পেয়েছি)/.test(
      lower
    ) &&
    !/\bhow much\b|\bকত\b|\?/.test(lower)
  ) {
    return null;
  }

  const allAccounts = [...ctx.wallets, ...ctx.savingsList];

  // 1. Net Worth query
  if (/(?:net\s*worth|total\s*wealth|নিট\s*সম্পদ|মোট\s*সম্পদ)/i.test(lower)) {
    return {
      expression: raw.trim(),
      answerText: formatMoney(ctx.netWorth, ctx.currency),
      numericValue: ctx.netWorth,
      subtitle: ctx.t.assistant.netWorthQueryLabel,
    };
  }

  // 2. Balance query (specific wallet/savings or total)
  if (/(?:\bbalance\b|ব্যালেন্স|আছে\s*কত|টাকা\s*আছে)/i.test(lower)) {
    const acc = findMatchingAccount(normalized, allAccounts);
    if (acc) {
      const bal = ctx.walletBalances[acc] || 0;
      return {
        expression: raw.trim(),
        answerText: formatMoney(bal, ctx.currency),
        numericValue: bal,
        subtitle: acc,
      };
    }
    if (/(?:saving|savings|সঞ্চয়)/i.test(lower)) {
      const sum = ctx.savingsList.reduce((s, a) => s + (ctx.walletBalances[a] || 0), 0);
      return {
        expression: raw.trim(),
        answerText: formatMoney(sum, ctx.currency),
        numericValue: sum,
        subtitle: ctx.t.assistant.allSavingsLabel,
      };
    }
    const walletSum = ctx.wallets.reduce((s, a) => s + (ctx.walletBalances[a] || 0), 0);
    return {
      expression: raw.trim(),
      answerText: formatMoney(walletSum, ctx.currency),
      numericValue: walletSum,
      subtitle: ctx.t.assistant.allWalletsLabel,
    };
  }

  // 3. Lent / Borrowed due query
  if (/(?:\bowe\b|\bowes\b|\bdue\b|\blend\b|\blent\b|\bborrow\b|\bborrowed\b|ধার|বাকি|পাবো|দিবো)/i.test(lower)) {
    const isBorrowQuery = /(?:\bi\s+owe\b|\bborrow|\bborrowed\b|দিবো|দিতে হবে|ধার নেওয়া)/i.test(lower);
    const targetType = isBorrowQuery ? 'borrow' : 'lend';
    const openRecords = ctx.transactions.filter((tx) => {
      if (tx.type !== targetType) return false;
      const due = tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount;
      return !tx.resolved && due > 0;
    });

    // Check if any person's name from openRecords appears in the prompt
    const personMatches = openRecords.filter((tx) => {
      const titleLower = tx.title.toLowerCase().trim();
      return titleLower.length >= 2 && lower.includes(titleLower);
    });

    if (personMatches.length > 0) {
      const sum = personMatches.reduce(
        (s, tx) => s + (tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount),
        0
      );
      return {
        expression: raw.trim(),
        answerText: formatMoney(sum, ctx.currency),
        numericValue: sum,
        subtitle: `${ctx.t.assistant.dueForLabel} ${personMatches[0].title}`,
      };
    }

    const totalDue = openRecords.reduce(
      (s, tx) => s + (tx.remainingBalance !== undefined ? tx.remainingBalance : tx.amount),
      0
    );
    return {
      expression: raw.trim(),
      answerText: formatMoney(totalDue, ctx.currency),
      numericValue: totalDue,
      subtitle: isBorrowQuery ? ctx.t.assistant.borrowOpenLabel : ctx.t.assistant.lentOpenLabel,
    };
  }

  // 4. Expense / Income total query (with optional timeframe & category)
  const isIncomeQuery = /(?:\bincome\b|\bearn|\bearned\b|আয়|আয়|বেতন)/i.test(lower);
  const isExpenseQuery = /(?:\bspend\b|\bspent\b|\bexpense\b|খরচ|ব্যয়|ব্যয়)/i.test(lower);

  if (isIncomeQuery || isExpenseQuery) {
    const txType: 'income' | 'expense' = isIncomeQuery && !isExpenseQuery ? 'income' : 'expense';
    const now = new Date();
    const todayIso = getTodayISO();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(
      lastMonthDate.getMonth() + 1
    ).padStart(2, '0')}`;
    const thisYearPrefix = `${now.getFullYear()}-`;

    let periodLabel = ctx.t.common.thisMonth;
    let datePredicate = (rawDate: string) => rawDate.startsWith(thisMonthPrefix);

    if (/\b(?:today|আজ|আজকে)\b/i.test(lower)) {
      periodLabel = ctx.lang === 'bn' ? 'আজ' : 'Today';
      datePredicate = (d) => d === todayIso;
    } else if (/(?:last month|previous month|গত মাস|গতমাস)/i.test(lower)) {
      periodLabel = ctx.t.common.previousMonth;
      datePredicate = (d) => d.startsWith(lastMonthPrefix);
    } else if (/(?:this year|current year|এই বছর|চলতি বছর)/i.test(lower)) {
      periodLabel = ctx.t.common.thisYear;
      datePredicate = (d) => d.startsWith(thisYearPrefix);
    } else if (/(?:all time|ever|সব সময়|মোট সব)/i.test(lower)) {
      periodLabel = ctx.t.common.allTime;
      datePredicate = () => true;
    }

    const catList = txType === 'expense' ? ctx.expenseCategories : ctx.incomeCategories;
    const matchedCat = findMatchingCategory(normalized, catList);

    const sum = ctx.transactions.reduce((acc, tx) => {
      if (tx.type !== txType) return acc;
      if (!datePredicate(tx.rawDate)) return acc;
      if (matchedCat && tx.category !== matchedCat) return acc;
      return acc + tx.amount;
    }, 0);

    const prefix = txType === 'expense' ? ctx.t.assistant.spentPrefix : ctx.t.assistant.earnedPrefix;
    const sub = matchedCat ? `${prefix} · ${matchedCat} · ${periodLabel}` : `${prefix} · ${periodLabel}`;

    return {
      expression: raw.trim(),
      answerText: formatMoney(sum, ctx.currency),
      numericValue: sum,
      subtitle: sub,
    };
  }

  return null;
}

/* --- Main Command Interpreter --- */
export function interpretAssistantCommand(
  rawInput: string,
  ctx: AssistantContext
): AssistantIntent {
  const cleaned = rawInput.trim();
  if (!cleaned) return { kind: 'unknown' };

  // 1. Personal Note
  const noteDraft = tryParseNote(cleaned);
  if (noteDraft) {
    return { kind: 'note', note: noteDraft };
  }

  // 2. Bazar Memo (pre-plan without prices or itemized with prices)
  const memoDraft = tryParseMemo(cleaned, ctx);
  if (memoDraft) {
    return { kind: 'memo', memo: memoDraft };
  }

  // 3. Live Ledger Queries (Balances, Net Worth, Category Spend, Lent/Borrowed Dues)
  const ledgerAnswer = tryParseLedgerQuery(cleaned, ctx);
  if (ledgerAnswer) {
    return { kind: 'calculation', calc: ledgerAnswer };
  }

  // 4. Arithmetic Calculation
  const mathResult = tryEvaluateArithmetic(cleaned);
  if (mathResult) {
    return {
      kind: 'calculation',
      calc: {
        expression: mathResult.expr,
        answerText: String(mathResult.value),
        numericValue: mathResult.value,
      },
    };
  }

  // 5. Transactions (Expense, Income, Transfer, Lend, Borrow)
  const allAccounts = [...ctx.wallets, ...ctx.savingsList];
  const txParsed = parseVoiceTransactionCommand(cleaned, {
    allAccountOptions: allAccounts,
    expenseCategories: ctx.expenseCategories,
    incomeCategories: ctx.incomeCategories,
    expenseSubCategories: ctx.expenseSubCategories,
    defaultEntry: ctx.defaultEntry,
  });

  if (txParsed.drafts.length > 0 && txParsed.matchedFieldsCount > 0) {
    return { kind: 'transaction', drafts: txParsed.drafts };
  }

  return { kind: 'unknown' };
}
