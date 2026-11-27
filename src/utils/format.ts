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

type SavingGoalAllocatable = Pick<
  SavingGoal,
  'id' | 'title' | 'account' | 'periodType' | 'targetAmount' | 'startDate' | 'endDate' | 'createdAt'
>;

function getGoalTimestampMs(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (val && typeof val === 'object') {
    const maybeTs = val as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      const ms = maybeTs.toMillis();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof maybeTs.seconds === 'number' && Number.isFinite(maybeTs.seconds)) {
      return maybeTs.seconds * 1000;
    }
  }
  return null;
}

function getGoalPeriodBounds(
  goal: Pick<SavingGoal, 'periodType' | 'startDate' | 'endDate'>,
  now: Date
): { start: string; end: string } {
  if (goal.periodType === 'monthly') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${lastDay}` };
  }
  return {
    start: goal.startDate || '0000-01-01',
    end: goal.endDate || '9999-12-31',
  };
}

function isTxInSavingGoalPeriod(
  goal: Pick<SavingGoal, 'periodType' | 'startDate' | 'endDate'>,
  rawDate: string,
  now: Date
): boolean {
  if (goal.periodType === 'monthly') {
    const d = parseLocalDate(rawDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (goal.startDate && rawDate < goal.startDate) return false;
  if (goal.endDate && rawDate > goal.endDate) return false;
  return true;
}

function savingGoalsSharePool(
  a: Pick<SavingGoal, 'account' | 'periodType' | 'startDate' | 'endDate'>,
  b: Pick<SavingGoal, 'account' | 'periodType' | 'startDate' | 'endDate'>,
  savingsSet: Set<string>,
  now: Date
): boolean {
  const boundsA = getGoalPeriodBounds(a, now);
  const boundsB = getGoalPeriodBounds(b, now);
  if (boundsA.start > boundsB.end || boundsB.start > boundsA.end) {
    return false;
  }
  if (!a.account && !b.account) return true;
  if (a.account && b.account) return a.account === b.account;
  if (!a.account && b.account) return savingsSet.has(b.account);
  if (a.account && !b.account) return savingsSet.has(a.account);
  return false;
}

function buildSavingGoalMeta(
  goal: Pick<SavingGoal, 'periodType' | 'startDate' | 'endDate'>,
  now: Date,
  todayMidnight: Date,
  lang: AppLanguage
): { periodLabel: string; daysLeft: number | null } {
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

  return { periodLabel, daysLeft };
}

/**
 * Computes progress for all Saving Goals together, allocating net deposits in
 * shared accounts / overlapping periods sequentially (waterfall) so the same
 * deposit is never double-counted across multiple goals.
 */
export function computeAllSavingGoalProgress(
  goals: SavingGoalAllocatable[],
  transactions: Transaction[],
  savingsList: string[],
  lang: AppLanguage = 'en'
): Map<string, SavingGoalProgress> {
  const result = new Map<string, SavingGoalProgress>();
  if (goals.length === 0) return result;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const savingsSet = new Set(savingsList);

  // Specific-account goals allocate first (they can only draw from their own account),
  // then earlier deadline, then earlier creation time, then title/id for stability.
  const orderedGoals = [...goals].sort((a, b) => {
    const aSpecific = a.account ? 0 : 1;
    const bSpecific = b.account ? 0 : 1;
    if (aSpecific !== bSpecific) return aSpecific - bSpecific;

    const aEnd = getGoalPeriodBounds(a, now).end;
    const bEnd = getGoalPeriodBounds(b, now).end;
    if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);

    const aTs = getGoalTimestampMs(a.createdAt);
    const bTs = getGoalTimestampMs(b.createdAt);
    if (aTs !== null && bTs !== null && aTs !== bTs) return aTs - bTs;
    if (aTs !== null && bTs === null) return -1;
    if (aTs === null && bTs !== null) return 1;

    const titleCmp = a.title.localeCompare(b.title);
    if (titleCmp !== 0) return titleCmp;
    return a.id.localeCompare(b.id);
  });

  // Tracks how much of each positive deposit transaction on a given account
  // has already been allocated to higher-priority goals.
  const claimedByTxAccount = new Map<string, number>();

  for (const goal of orderedGoals) {
    const targetAccounts = goal.account ? new Set([goal.account]) : savingsSet;
    const hasCompetitor = orderedGoals.some(
      (other) => other.id !== goal.id && savingGoalsSharePool(goal, other, savingsSet, now)
    );

    let rawNet = 0;
    let alreadyClaimed = 0;
    const positiveSources: Array<{
      txIdx: number;
      acc: string;
      rawDate: string;
      remaining: number;
    }> = [];

    transactions.forEach((t, txIdx) => {
      if (!t.rawDate) return;
      if (!isTxInSavingGoalPeriod(goal, t.rawDate, now)) return;

      let delta = 0;
      let inflowAcc: string | null = null;

      if (t.type === 'transfer') {
        const toTarget = t.toWallet ? targetAccounts.has(t.toWallet) : false;
        const fromTarget = t.fromWallet ? targetAccounts.has(t.fromWallet) : false;
        if (toTarget && !fromTarget && t.toWallet) {
          delta = t.amount;
          inflowAcc = t.toWallet;
        } else if (fromTarget && !toTarget) {
          delta = -(t.amount + (t.charge || 0));
        }
      } else if (t.type === 'income' && t.wallet && targetAccounts.has(t.wallet)) {
        delta = t.amount;
        inflowAcc = t.wallet;
      } else if (t.type === 'expense' && t.wallet && targetAccounts.has(t.wallet)) {
        delta = -t.amount;
      }
      // Note: 'correction' and 'adjustment' entries (e.g., setting an existing opening balance)
      // update the account's total balance and Net Worth, but are intentionally excluded from
      // periodic Saving Goal progress so pre-existing savings do not inflate goal percentages.

      if (delta === 0) return;
      rawNet += delta;

      if (delta > 0 && inflowAcc) {
        const key = `${txIdx}::${inflowAcc}`;
        const claimed = claimedByTxAccount.get(key) || 0;
        const effectiveClaimed = Math.min(claimed, delta);
        alreadyClaimed += effectiveClaimed;
        const avail = delta - effectiveClaimed;
        if (avail > 0) {
          positiveSources.push({
            txIdx,
            acc: inflowAcc,
            rawDate: t.rawDate,
            remaining: avail,
          });
        }
      }
    });

    const available = rawNet - alreadyClaimed;
    let savedAmount: number;
    if (!hasCompetitor) {
      savedAmount = available;
    } else if (available <= 0) {
      savedAmount = 0;
    } else {
      savedAmount = Math.min(available, Math.max(0, goal.targetAmount));
    }

    const toClaim = Math.max(0, savedAmount);
    if (toClaim > 0 && positiveSources.length > 0) {
      positiveSources.sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      let leftToClaim = toClaim;
      for (const src of positiveSources) {
        if (leftToClaim <= 0) break;
        const take = Math.min(leftToClaim, src.remaining);
        if (take > 0) {
          const key = `${src.txIdx}::${src.acc}`;
          claimedByTxAccount.set(key, (claimedByTxAccount.get(key) || 0) + take);
          leftToClaim -= take;
        }
      }
    }

    const pct = goal.targetAmount > 0 ? (savedAmount / goal.targetAmount) * 100 : 0;
    const remaining = Math.max(0, goal.targetAmount - savedAmount);
    const { periodLabel, daysLeft } = buildSavingGoalMeta(goal, now, todayMidnight, lang);

    result.set(goal.id, {
      savedAmount,
      pct,
      remaining,
      periodLabel,
      daysLeft,
    });
  }

  return result;
}

export function computeSavingGoalProgress(
  goal: Pick<SavingGoal, 'account' | 'periodType' | 'targetAmount' | 'startDate' | 'endDate'>,
  transactions: Transaction[],
  savingsList: string[],
  lang: AppLanguage = 'en'
): SavingGoalProgress {
  const singleId = '__single__';
  const progressMap = computeAllSavingGoalProgress(
    [{ id: singleId, title: '', ...goal }],
    transactions,
    savingsList,
    lang
  );
  return (
    progressMap.get(singleId) || {
      savedAmount: 0,
      pct: 0,
      remaining: Math.max(0, goal.targetAmount),
      periodLabel: '',
      daysLeft: null,
    }
  );
}
