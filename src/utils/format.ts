import type { AppLanguage, CurrencySymbol, PeriodFilter, SavingGoal, Transaction } from '../types';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(isoDate: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return new Date();
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day);
}

export function formatDisplayDate(isoDate: string, lang: AppLanguage = 'en'): string {
  const d = parseLocalDate(isoDate);
  return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMoney(
  amount: number,
  currency: CurrencySymbol,
  hidden = false
): string {
  if (hidden) {
    return `${currency} ••••`;
  }
  const absFormatted = Math.abs(amount).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? '-' : '';
  return `${sign}${currency} ${absFormatted}`;
}

export function getFilterName(key: PeriodFilter, lang: AppLanguage = 'en'): string {
  const mapEn: Record<PeriodFilter, string> = {
    all: 'All Time',
    monthly: 'This Month',
    previous_month: 'Previous Month',
    yearly: 'This Year',
    custom: 'Custom Range',
  };
  const mapBn: Record<PeriodFilter, string> = {
    all: 'সব সময়',
    monthly: 'এই মাস',
    previous_month: 'গত মাস',
    yearly: 'এই বছর',
    custom: 'নির্দিষ্ট তারিখ',
  };
  const map = lang === 'bn' ? mapBn : mapEn;
  return map[key] || map.all;
}

export function getPeriodLabel(
  filterKey: PeriodFilter,
  customFrom: string,
  customTo: string,
  lang: AppLanguage = 'en'
): string {
  const now = new Date();
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';

  if (filterKey === 'monthly') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthName = now.toLocaleDateString(locale, { month: 'long' });
    return lang === 'bn' ? `১ – ${lastDay} ${monthName}` : `01 – ${lastDay} ${monthName}`;
  }
  if (filterKey === 'previous_month') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate();
    const monthName = prev.toLocaleDateString(locale, { month: 'long' });
    return lang === 'bn' ? `১ – ${lastDay} ${monthName}` : `01 – ${lastDay} ${monthName}`;
  }
  if (filterKey === 'yearly') {
    return lang === 'bn'
      ? `জানুয়ারি – ডিসেম্বর ${now.getFullYear()}`
      : `Jan – Dec ${now.getFullYear()}`;
  }
  if (filterKey === 'custom' && customFrom && customTo) {
    return lang === 'bn' ? `${customFrom} থেকে ${customTo}` : `${customFrom} to ${customTo}`;
  }
  return lang === 'bn' ? 'সকল সংরক্ষিত সময়কাল' : 'All recorded periods';
}

export function filterTransactionsByPeriod(
  txList: Transaction[],
  filterKey: PeriodFilter,
  customFrom: string,
  customTo: string
): Transaction[] {
  if (filterKey === 'all') return txList;

  const now = new Date();
  return txList.filter((t) => {
    if (!t.rawDate) return true;
    const tDate = parseLocalDate(t.rawDate);

    if (filterKey === 'monthly') {
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    }
    if (filterKey === 'previous_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return tDate.getMonth() === prev.getMonth() && tDate.getFullYear() === prev.getFullYear();
    }
    if (filterKey === 'yearly') {
      return tDate.getFullYear() === now.getFullYear();
    }
    if (filterKey === 'custom' && customFrom && customTo) {
      return t.rawDate >= customFrom && t.rawDate <= customTo;
    }
    return true;
  });
}

export function addDaysISO(isoDate: string, deltaDays: number): string {
  const d = parseLocalDate(isoDate);
  d.setDate(d.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getShiftedCustomRange(
  baseFrom: string,
  baseTo: string,
  offset: number
): { from: string; to: string; spanDays: number } {
  const [normFrom, normTo] = baseFrom <= baseTo ? [baseFrom, baseTo] : [baseTo, baseFrom];
  const dStart = parseLocalDate(normFrom);
  const dEnd = parseLocalDate(normTo);
  const spanDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / 86400000) + 1);
  if (offset === 0) {
    return { from: normFrom, to: normTo, spanDays };
  }
  const shift = offset * spanDays;
  return {
    from: addDaysISO(normFrom, shift),
    to: addDaysISO(normTo, shift),
    spanDays,
  };
}

export function formatShortRangeLabel(
  from: string,
  to: string,
  lang: AppLanguage = 'en'
): string {
  const d1 = parseLocalDate(from);
  const d2 = parseLocalDate(to);
  const locale = lang === 'bn' ? 'bn-BD' : 'en-US';
  const nowYear = new Date().getFullYear();

  if (from === to) {
    return d1.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      ...(d1.getFullYear() !== nowYear ? { year: '2-digit' } : {}),
    });
  }

  if (d1.getFullYear() === d2.getFullYear()) {
    const startPart = d1.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    const endPart = d2.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      ...(d1.getFullYear() !== nowYear ? { year: '2-digit' } : {}),
    });
    return `${startPart} – ${endPart}`;
  }

  const startPart = d1.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  const endPart = d2.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
  return `${startPart} – ${endPart}`;
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Deterministic arithmetic evaluator supporting +, -, *, /, decimals, and unary minus.
 * Avoids eval() and Function() completely.
 */
export function safeEvaluateExpression(rawExpr: string): number | null {
  const normalized = rawExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  if (!normalized) return null;

  // Tokenize numbers and operators
  const tokens: Array<number | string> = [];
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    const isUnaryMinus =
      ch === '-' &&
      (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string');

    if ((ch >= '0' && ch <= '9') || ch === '.' || isUnaryMinus) {
      let numStr = ch;
      i++;
      let dotCount = ch === '.' ? 1 : 0;
      while (
        i < normalized.length &&
        ((normalized[i] >= '0' && normalized[i] <= '9') || normalized[i] === '.')
      ) {
        if (normalized[i] === '.') {
          dotCount++;
          if (dotCount > 1) return null;
        }
        numStr += normalized[i];
        i++;
      }
      if (numStr === '-' || numStr === '.' || numStr === '-.') return null;
      const parsed = Number(numStr);
      if (!Number.isFinite(parsed)) return null;
      tokens.push(parsed);
    } else if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      if (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string') {
        return null;
      }
      tokens.push(ch);
      i++;
    } else {
      return null;
    }
  }

  if (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string') {
    return null;
  }

  // First pass: * and /
  const pass1: Array<number | string> = [tokens[0]];
  for (let idx = 1; idx < tokens.length; idx += 2) {
    const op = tokens[idx];
    const rhs = tokens[idx + 1] as number;
    if (op === '*' || op === '/') {
      const lhs = pass1.pop() as number;
      if (op === '/' && rhs === 0) return null;
      pass1.push(op === '*' ? lhs * rhs : lhs / rhs);
    } else {
      pass1.push(op, rhs);
    }
  }

  // Second pass: + and -
  let result = pass1[0] as number;
  for (let idx = 1; idx < pass1.length; idx += 2) {
    const op = pass1[idx];
    const rhs = pass1[idx + 1] as number;
    result = op === '+' ? result + rhs : result - rhs;
  }

  if (!Number.isFinite(result)) return null;
  return Number(result.toPrecision(12));
}

export interface SavingGoalProgress {
  savedAmount: number;
  pct: number;
  remaining: number;
  periodLabel: string;
  daysLeft: number | null;
}

export function computeSavingGoalProgress(
  goal: Pick<SavingGoal, 'account' | 'periodType' | 'targetAmount' | 'startDate' | 'endDate'>,
  transactions: Transaction[],
  savingsList: string[],
  lang: AppLanguage = 'en'
): SavingGoalProgress {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const savingsSet = new Set(savingsList);
  const targetAccounts = goal.account ? new Set([goal.account]) : savingsSet;

  let savedAmount = 0;

  transactions.forEach((t) => {
    if (!t.rawDate) return;

    if (goal.periodType === 'monthly') {
      const d = parseLocalDate(t.rawDate);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) {
        return;
      }
    } else {
      if (goal.startDate && t.rawDate < goal.startDate) return;
      if (goal.endDate && t.rawDate > goal.endDate) return;
    }

    if (t.type === 'transfer') {
      const toTarget = t.toWallet ? targetAccounts.has(t.toWallet) : false;
      const fromTarget = t.fromWallet ? targetAccounts.has(t.fromWallet) : false;
      if (toTarget && !fromTarget) {
        savedAmount += t.amount;
      } else if (fromTarget && !toTarget) {
        savedAmount -= t.amount + (t.charge || 0);
      }
    } else if (t.type === 'income' && t.wallet && targetAccounts.has(t.wallet)) {
      savedAmount += t.amount;
    } else if (t.type === 'expense' && t.wallet && targetAccounts.has(t.wallet)) {
      savedAmount -= t.amount;
    }
    // Note: 'correction' and 'adjustment' entries (e.g., setting an existing opening balance)
    // update the account's total balance and Net Worth, but are intentionally excluded from
    // periodic Saving Goal progress so pre-existing savings do not inflate goal percentages.
  });

  const pct = goal.targetAmount > 0 ? (savedAmount / goal.targetAmount) * 100 : 0;
  const remaining = Math.max(0, goal.targetAmount - savedAmount);

  let periodLabel = '';
  let daysLeft: number | null = null;

  if (goal.periodType === 'monthly') {
    periodLabel = now.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      year: 'numeric',
    });
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysLeft = Math.max(0, lastDay - now.getDate());
  } else {
    if (goal.startDate && goal.endDate) {
      periodLabel = `${formatDisplayDate(goal.startDate, lang)} – ${formatDisplayDate(
        goal.endDate,
        lang
      )}`;
    } else if (goal.endDate) {
      periodLabel = formatDisplayDate(goal.endDate, lang);
    } else if (goal.startDate) {
      periodLabel = formatDisplayDate(goal.startDate, lang);
    }

    if (goal.endDate) {
      const endMidnight = parseLocalDate(goal.endDate);
      daysLeft = Math.round((endMidnight.getTime() - todayMidnight.getTime()) / 86400000);
    }
  }

  return {
    savedAmount,
    pct,
    remaining,
    periodLabel,
    daysLeft,
  };
}
