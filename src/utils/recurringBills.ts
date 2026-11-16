import type { AppLanguage, RecurringBill } from '../types';

export type RecurringBillStatus = 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'paid';

export interface RecurringBillEvaluation {
  bill: RecurringBill;
  status: RecurringBillStatus;
  isPaidThisMonth: boolean;
  effectiveDueDay: number;
  daysUntilDue: number;
  needsAttention: boolean;
}

export function getCurrentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getEffectiveDueDay(dueDay: number, year: number, monthIndex0: number): number {
  const clampedDay = Math.min(31, Math.max(1, Math.round(dueDay || 1)));
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(clampedDay, daysInMonth);
}

export function evaluateRecurringBill(
  bill: RecurringBill,
  now = new Date()
): RecurringBillEvaluation {
  const currentMonth = getCurrentMonthKey(now);
  const isPaidThisMonth = bill.lastPaidMonth === currentMonth;
  const effectiveDueDay = getEffectiveDueDay(bill.dueDay, now.getFullYear(), now.getMonth());
  const daysUntilDue = effectiveDueDay - now.getDate();

  let status: RecurringBillStatus;
  if (isPaidThisMonth) {
    status = 'paid';
  } else if (daysUntilDue < 0) {
    status = 'overdue';
  } else if (daysUntilDue === 0) {
    status = 'due_today';
  } else if (daysUntilDue <= 3) {
    status = 'due_soon';
  } else {
    status = 'upcoming';
  }

  return {
    bill,
    status,
    isPaidThisMonth,
    effectiveDueDay,
    daysUntilDue,
    needsAttention: !isPaidThisMonth && (status === 'overdue' || status === 'due_today' || status === 'due_soon'),
  };
}

const STATUS_PRIORITY: Record<RecurringBillStatus, number> = {
  overdue: 0,
  due_today: 1,
  due_soon: 2,
  upcoming: 3,
  paid: 4,
};

export function sortRecurringBills(
  bills: RecurringBill[],
  now = new Date()
): RecurringBillEvaluation[] {
  return bills
    .map((bill) => evaluateRecurringBill(bill, now))
    .sort((a, b) => {
      const pDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (pDiff !== 0) return pDiff;
      if (a.effectiveDueDay !== b.effectiveDueDay) {
        return a.effectiveDueDay - b.effectiveDueDay;
      }
      return a.bill.title.localeCompare(b.bill.title);
    });
}

export function formatDueDayLabel(dueDay: number, lang: AppLanguage = 'en'): string {
  const d = Math.min(31, Math.max(1, Math.round(dueDay || 1)));
  if (lang === 'bn') {
    const bnDigits = String(d).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
    return `প্রতি মাসের ${bnDigits} তারিখ`;
  }
  const mod100 = d % 100;
  let suffix = 'th';
  if (mod100 < 11 || mod100 > 13) {
    if (d % 10 === 1) suffix = 'st';
    else if (d % 10 === 2) suffix = 'nd';
    else if (d % 10 === 3) suffix = 'rd';
  }
  return `${d}${suffix} of month`;
}
