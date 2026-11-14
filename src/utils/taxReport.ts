import { jsPDF } from 'jspdf';
import { getTranslations } from '../i18n';
import type { AppLanguage, CategoryStyle, CurrencySymbol, Transaction } from '../types';
import { getCategoryStyle } from './categoryVisuals';
import { formatDisplayDate, formatMoney, getTodayISO } from './format';

export interface TaxCategorySlice {
  category: string;
  amount: number;
  count: number;
  pct: number;
  color: string;
  subCategories: Array<{ name: string; amount: number; count: number }>;
}

export interface TaxLedgerRow {
  id: string;
  rawDate: string;
  displayDate: string;
  type: 'income' | 'expense';
  category: string;
  subCategory: string;
  title: string;
  account: string;
  amount: number;
  note: string;
}

export interface TaxAccountBalanceRow {
  name: string;
  balance: number;
}

export interface TaxOpenDebtRow {
  id: string;
  title: string;
  date: string;
  account: string;
  originalAmount: number;
  dueAmount: number;
}

export interface TaxLendBorrowSummary {
  lentInYear: number;
  lentRecoveredInYear: number;
  borrowedInYear: number;
  repaidInYear: number;
  outstandingReceivableAsOfJune30: number;
  outstandingPayableAsOfJune30: number;
  openReceivables: TaxOpenDebtRow[];
  openPayables: TaxOpenDebtRow[];
}

export interface TaxYearReportData {
  startYear: number;
  endYear: number;
  fyCode: string;
  fyLabel: string;
  startDate: string;
  endDate: string;
  periodDisplay: string;
  totalIncome: number;
  totalExpense: number;
  netSurplus: number;
  savingsRatePct: number;
  incomeCategories: TaxCategorySlice[];
  expenseCategories: TaxCategorySlice[];
  incomeTransactions: TaxLedgerRow[];
  expenseTransactions: TaxLedgerRow[];
  closingWallets: TaxAccountBalanceRow[];
  closingSavings: TaxAccountBalanceRow[];
  totalClosingWallets: number;
  totalClosingSavings: number;
  totalClosingAssets: number;
  lendBorrow: TaxLendBorrowSummary;
}

export function getTaxYearStartYear(isoDate: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month >= 7 ? year : year - 1;
}

export function getAvailableTaxYears(transactions: Transaction[]): number[] {
  const currentStartYear = getTaxYearStartYear(getTodayISO());
  const years = new Set<number>([currentStartYear, currentStartYear - 1]);
  transactions.forEach((tx) => {
    if (tx.rawDate && /^\d{4}-\d{2}-\d{2}$/.test(tx.rawDate)) {
      years.add(getTaxYearStartYear(tx.rawDate));
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function formatTaxYearOptionLabel(startYear: number, lang: AppLanguage): string {
  const endYear = startYear + 1;
  const startLabel = formatDisplayDate(`${startYear}-07-01`, lang);
  const endLabel = formatDisplayDate(`${endYear}-06-30`, lang);
  const fyWord = lang === 'bn' ? 'অর্থবছর' : 'FY';
  return `${fyWord} ${startYear}–${endYear} (${startLabel} – ${endLabel})`;
}

export function computeTaxYearReportData(params: {
  startYear: number;
  transactions: Transaction[];
  wallets: string[];
  savingsList: string[];
  categoryStyles?: Record<string, CategoryStyle>;
  lang: AppLanguage;
}): TaxYearReportData {
  const { startYear, transactions, wallets, savingsList, categoryStyles, lang } = params;
  const endYear = startYear + 1;
  const startDate = `${startYear}-07-01`;
  const endDate = `${endYear}-06-30`;
  const fyCode = `${startYear}-${endYear}`;
  const fyWord = lang === 'bn' ? 'অর্থবছর' : 'FY';
  const fyLabel = `${fyWord} ${startYear}–${endYear}`;
  const periodDisplay = `${formatDisplayDate(startDate, lang)} – ${formatDisplayDate(endDate, lang)}`;

  const incMap: Record<
    string,
    { amount: number; count: number; subs: Record<string, { amount: number; count: number }> }
  > = {};
  const expMap: Record<
    string,
    { amount: number; count: number; subs: Record<string, { amount: number; count: number }> }
  > = {};

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeTransactions: TaxLedgerRow[] = [];
  const expenseTransactions: TaxLedgerRow[] = [];

  // 1. Income & Expense within Jul 01 .. Jun 30
  transactions.forEach((tx) => {
    if (!tx.rawDate || tx.rawDate < startDate || tx.rawDate > endDate) return;

    const addBucket = (
      target: typeof incMap,
      cat: string,
      subCat: string,
      amt: number
    ) => {
      if (!target[cat]) {
        target[cat] = { amount: 0, count: 0, subs: {} };
      }
      target[cat].amount += amt;
      target[cat].count += 1;
      if (subCat) {
        if (!target[cat].subs[subCat]) {
          target[cat].subs[subCat] = { amount: 0, count: 0 };
        }
        target[cat].subs[subCat].amount += amt;
        target[cat].subs[subCat].count += 1;
      }
    };

    if (tx.type === 'income' || (tx.type === 'adjustment' && tx.amount > 0)) {
      const cat = tx.category || (tx.type === 'adjustment' ? 'Adjustment' : 'Others');
      const amt = tx.amount;
      totalIncome += amt;
      addBucket(incMap, cat, tx.subCategory || '', amt);
      incomeTransactions.push({
        id: tx.id,
        rawDate: tx.rawDate,
        displayDate: tx.date || formatDisplayDate(tx.rawDate, lang),
        type: 'income',
        category: cat,
        subCategory: tx.subCategory || '',
        title: tx.title || cat,
        account: tx.wallet || '—',
        amount: amt,
        note: tx.note || '',
      });
    } else if (tx.type === 'expense' || (tx.type === 'adjustment' && tx.amount < 0)) {
      const cat = tx.category || (tx.type === 'adjustment' ? 'Adjustment' : 'Others');
      const amt = Math.abs(tx.amount);
      totalExpense += amt;
      addBucket(expMap, cat, tx.subCategory || '', amt);
      expenseTransactions.push({
        id: tx.id,
        rawDate: tx.rawDate,
        displayDate: tx.date || formatDisplayDate(tx.rawDate, lang),
        type: 'expense',
        category: cat,
        subCategory: tx.subCategory || '',
        title: tx.title || cat,
        account: tx.wallet || '—',
        amount: amt,
        note: tx.note || '',
      });
    }
  });

  const sortChronological = (a: TaxLedgerRow, b: TaxLedgerRow) => {
    if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
    return a.title.localeCompare(b.title);
  };
  incomeTransactions.sort(sortChronological);
  expenseTransactions.sort(sortChronological);

  const toCategorySlices = (
    map: typeof incMap,
    total: number,
    kind: 'inc' | 'exp'
  ): TaxCategorySlice[] =>
    Object.entries(map)
      .sort((a, b) => b[1].amount - a[1].amount)
      .map(([category, info]) => ({
        category,
        amount: info.amount,
        count: info.count,
        pct: total > 0 ? (info.amount / total) * 100 : 0,
        color: getCategoryStyle(categoryStyles, kind, category).color,
        subCategories: Object.entries(info.subs)
          .sort((a, b) => b[1].amount - a[1].amount)
          .map(([name, subInfo]) => ({
            name,
            amount: subInfo.amount,
            count: subInfo.count,
          })),
      }));

  const incomeCategories = toCategorySlices(incMap, totalIncome, 'inc');
  const expenseCategories = toCategorySlices(expMap, totalExpense, 'exp');

  // 2. Closing balances as of June 30 (endDate)
  const balancesAsOfJune30: Record<string, number> = {};
  wallets.forEach((w) => {
    balancesAsOfJune30[w] = 0;
  });
  savingsList.forEach((s) => {
    balancesAsOfJune30[s] = 0;
  });

  transactions.forEach((tx) => {
    if (tx.rawDate && tx.rawDate > endDate) return;

    if (tx.type === 'income' && tx.wallet) {
      balancesAsOfJune30[tx.wallet] = (balancesAsOfJune30[tx.wallet] || 0) + tx.amount;
    } else if (tx.type === 'expense' && tx.wallet) {
      balancesAsOfJune30[tx.wallet] = (balancesAsOfJune30[tx.wallet] || 0) - tx.amount;
    } else if (tx.type === 'transfer' && tx.fromWallet && tx.toWallet) {
      const deduction = tx.amount + (tx.charge || 0);
      balancesAsOfJune30[tx.fromWallet] = (balancesAsOfJune30[tx.fromWallet] || 0) - deduction;
      balancesAsOfJune30[tx.toWallet] = (balancesAsOfJune30[tx.toWallet] || 0) + tx.amount;
    } else if (tx.type === 'lend' && tx.wallet) {
      balancesAsOfJune30[tx.wallet] = (balancesAsOfJune30[tx.wallet] || 0) - tx.amount;
    } else if (tx.type === 'borrow' && tx.wallet) {
      balancesAsOfJune30[tx.wallet] = (balancesAsOfJune30[tx.wallet] || 0) + tx.amount;
    } else if (tx.type === 'partial_payment' && tx.wallet) {
      balancesAsOfJune30[tx.wallet] =
        (balancesAsOfJune30[tx.wallet] || 0) + (tx.isLendPay ? tx.amount : -tx.amount);
    } else if ((tx.type === 'correction' || tx.type === 'adjustment') && tx.wallet) {
      balancesAsOfJune30[tx.wallet] = (balancesAsOfJune30[tx.wallet] || 0) + tx.amount;
    }
  });

  const closingWallets = wallets.map((name) => ({
    name,
    balance: balancesAsOfJune30[name] || 0,
  }));
  const closingSavings = savingsList.map((name) => ({
    name,
    balance: balancesAsOfJune30[name] || 0,
  }));
  const totalClosingWallets = closingWallets.reduce((sum, item) => sum + item.balance, 0);
  const totalClosingSavings = closingSavings.reduce((sum, item) => sum + item.balance, 0);
  const totalClosingAssets = totalClosingWallets + totalClosingSavings;

  // 3. Lent & Borrowed summary (year activity + outstanding as of June 30)
  let lentInYear = 0;
  let lentRecoveredInYear = 0;
  let borrowedInYear = 0;
  let repaidInYear = 0;

  const hasAnyPartialPaymentForParent = new Set<string>();
  const paidByParentAsOfJune30: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (tx.type === 'partial_payment' && tx.parentId) {
      hasAnyPartialPaymentForParent.add(tx.parentId);
      if (!tx.rawDate || tx.rawDate <= endDate) {
        paidByParentAsOfJune30[tx.parentId] =
          (paidByParentAsOfJune30[tx.parentId] || 0) + tx.amount;
      }
    }

    if (tx.rawDate && tx.rawDate >= startDate && tx.rawDate <= endDate) {
      if (tx.type === 'lend') lentInYear += tx.amount;
      else if (tx.type === 'borrow') borrowedInYear += tx.amount;
      else if (tx.type === 'partial_payment') {
        if (tx.isLendPay) lentRecoveredInYear += tx.amount;
        else repaidInYear += tx.amount;
      }
    }
  });

  const openReceivables: TaxOpenDebtRow[] = [];
  const openPayables: TaxOpenDebtRow[] = [];
  let outstandingReceivableAsOfJune30 = 0;
  let outstandingPayableAsOfJune30 = 0;

  transactions.forEach((tx) => {
    if (tx.type !== 'lend' && tx.type !== 'borrow') return;
    if (tx.rawDate && tx.rawDate > endDate) return;

    let dueAmount: number;
    if (hasAnyPartialPaymentForParent.has(tx.id)) {
      dueAmount = Math.max(0, tx.amount - (paidByParentAsOfJune30[tx.id] || 0));
    } else if (tx.resolved) {
      dueAmount = 0;
    } else {
      dueAmount =
        tx.remainingBalance !== undefined ? Math.max(0, tx.remainingBalance) : tx.amount;
    }

    if (dueAmount <= 0.0001) return;

    const debtRow: TaxOpenDebtRow = {
      id: tx.id,
      title: tx.title,
      date: tx.date || (tx.rawDate ? formatDisplayDate(tx.rawDate, lang) : '—'),
      account: tx.wallet || '—',
      originalAmount: tx.amount,
      dueAmount,
    };

    if (tx.type === 'lend') {
      outstandingReceivableAsOfJune30 += dueAmount;
      openReceivables.push(debtRow);
    } else {
      outstandingPayableAsOfJune30 += dueAmount;
      openPayables.push(debtRow);
    }
  });

  const netSurplus = totalIncome - totalExpense;
  const savingsRatePct = totalIncome > 0 ? (netSurplus / totalIncome) * 100 : 0;

  return {
    startYear,
    endYear,
    fyCode,
    fyLabel,
    startDate,
    endDate,
    periodDisplay,
    totalIncome,
    totalExpense,
    netSurplus,
    savingsRatePct,
    incomeCategories,
    expenseCategories,
    incomeTransactions,
    expenseTransactions,
    closingWallets,
    closingSavings,
    totalClosingWallets,
    totalClosingSavings,
    totalClosingAssets,
    lendBorrow: {
      lentInYear,
      lentRecoveredInYear,
      borrowedInYear,
      repaidInYear,
      outstandingReceivableAsOfJune30,
      outstandingPayableAsOfJune30,
      openReceivables,
      openPayables,
    },
  };
}

function csvCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Number(value.toFixed(2))) : '0';
  }
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function downloadTaxYearCsv(
  report: TaxYearReportData,
  currency: CurrencySymbol,
  lang: AppLanguage
): void {
  const t = getTranslations(lang);
  const tr = t.taxReport;
  const rows: string[] = [];
  const pushRow = (...cells: Array<string | number>) => {
    rows.push(cells.map(csvCell).join(','));
  };

  pushRow(`OrthoGro - ${tr.title}`, report.fyLabel, report.periodDisplay);
  pushRow(tr.generatedOn, formatDisplayDate(getTodayISO(), lang), `Currency: ${currency}`);
  pushRow('');

  // Summary
  pushRow('=== SUMMARY ===');
  pushRow(tr.totalIncome, report.totalIncome);
  pushRow(tr.totalExpense, report.totalExpense);
  pushRow(report.netSurplus >= 0 ? tr.netSurplus : tr.netDeficit, report.netSurplus);
  pushRow(`${tr.savingsRate} (%)`, `${report.savingsRatePct.toFixed(1)}%`);
  pushRow(tr.closingAssetsJune30, report.totalClosingAssets);
  pushRow('');

  // Income by Category
  pushRow(`=== ${tr.incomePieTitle.toUpperCase()} ===`);
  pushRow(tr.categoryHeader, tr.entriesCount, `${tr.amountHeader} (${currency})`, tr.shareHeader);
  if (report.incomeCategories.length === 0) {
    pushRow(tr.noIncomeInYear);
  } else {
    report.incomeCategories.forEach((c) => {
      pushRow(c.category, c.count, c.amount, `${c.pct.toFixed(1)}%`);
    });
  }
  pushRow('');

  // Expense by Category
  pushRow(`=== ${tr.expensePieTitle.toUpperCase()} ===`);
  pushRow(tr.categoryHeader, tr.entriesCount, `${tr.amountHeader} (${currency})`, tr.shareHeader);
  if (report.expenseCategories.length === 0) {
    pushRow(tr.noExpenseInYear);
  } else {
    report.expenseCategories.forEach((c) => {
      pushRow(c.category, c.count, c.amount, `${c.pct.toFixed(1)}%`);
      c.subCategories.forEach((sub) => {
        pushRow(`  > ${sub.name}`, sub.count, sub.amount, '');
      });
    });
  }
  pushRow('');

  // Detailed Income & Expense
  pushRow(`=== ${tr.detailedLedgerTitle.toUpperCase()} ===`);
  pushRow(
    tr.dateCol,
    tr.typeCol,
    tr.catCol,
    t.txForm.subCategoryLabel,
    tr.titleCol,
    tr.accountCol,
    `${tr.amountHeader} (${currency})`,
    t.txForm.optionalNote
  );
  const allLedger = [...report.incomeTransactions, ...report.expenseTransactions].sort((a, b) =>
    a.rawDate.localeCompare(b.rawDate)
  );
  if (allLedger.length === 0) {
    pushRow(tr.noLedgerRows);
  } else {
    allLedger.forEach((item) => {
      pushRow(
        item.rawDate,
        item.type === 'income' ? t.common.income : t.common.expense,
        item.category,
        item.subCategory,
        item.title,
        item.account,
        item.amount,
        item.note
      );
    });
  }
  pushRow('');

  // Closing Balances as of June 30
  pushRow(`=== ${tr.closingBalancesTitle.toUpperCase()} (${report.endDate}) ===`);
  pushRow('Group', tr.accountCol, `Balance (${currency})`);
  report.closingWallets.forEach((w) => pushRow(tr.walletsGroup, w.name, w.balance));
  report.closingSavings.forEach((s) => pushRow(tr.savingsGroup, s.name, s.balance));
  pushRow(tr.totalWallets, '', report.totalClosingWallets);
  pushRow(tr.totalSavings, '', report.totalClosingSavings);
  pushRow(tr.totalClosingLabel, '', report.totalClosingAssets);
  pushRow('');

  // Lent & Borrowed Summary
  pushRow(`=== ${tr.lendBorrowTitle.toUpperCase()} ===`);
  pushRow(tr.lentInYear, report.lendBorrow.lentInYear);
  pushRow(tr.recoveredInYear, report.lendBorrow.lentRecoveredInYear);
  pushRow(tr.borrowedInYear, report.lendBorrow.borrowedInYear);
  pushRow(tr.repaidInYear, report.lendBorrow.repaidInYear);
  pushRow(tr.receivableJune30, report.lendBorrow.outstandingReceivableAsOfJune30);
  pushRow(tr.payableJune30, report.lendBorrow.outstandingPayableAsOfJune30);

  if (report.lendBorrow.openReceivables.length > 0) {
    pushRow('');
    pushRow(tr.openReceivables, tr.dateCol, tr.accountCol, tr.originalAmt, tr.dueAmt);
    report.lendBorrow.openReceivables.forEach((d) =>
      pushRow(d.title, d.date, d.account, d.originalAmount, d.dueAmount)
    );
  }
  if (report.lendBorrow.openPayables.length > 0) {
    pushRow('');
    pushRow(tr.openPayables, tr.dateCol, tr.accountCol, tr.originalAmt, tr.dueAmt);
    report.lendBorrow.openPayables.forEach((d) =>
      pushRow(d.title, d.date, d.account, d.originalAmount, d.dueAmount)
    );
  }

  const csvContent = `\uFEFF${rows.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OrthoGro-Tax-Report-FY${report.fyCode}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Canvas2D A4 Multi-Page PDF Composer ----------
// Uses native browser font shaping so both English and Bangla render crisply in PDF.

const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN_X = 68;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 76;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const FONT_STACK =
  '"Noto Sans Bengali", "Hind Siliguri", "Inter", system-ui, -apple-system, sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (!text) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const slice = text.slice(0, mid) + ellipsis;
    if (ctx.measureText(slice).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, Math.max(1, lo)) + ellipsis;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawDonutChartOnCanvas(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  slices: TaxCategorySlice[],
  total: number,
  centerTitle: string,
  centerValue: string
) {
  if (slices.length === 0 || total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = outerR - innerR;
    ctx.stroke();
  } else if (slices.length === 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = slices[0].color;
    ctx.lineWidth = outerR - innerR;
    ctx.stroke();
  } else {
    let startAngle = -Math.PI / 2;
    slices.forEach((slice) => {
      const sweep = (slice.amount / total) * Math.PI * 2;
      const endAngle = startAngle + sweep;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      startAngle = endAngle;
    });
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#64748B';
  ctx.font = `600 15px ${FONT_STACK}`;
  ctx.fillText(fitText(ctx, centerTitle, innerR * 1.75), cx, cy - 13);

  ctx.fillStyle = '#102A43';
  ctx.font = `800 19px ${FONT_STACK}`;
  ctx.fillText(fitText(ctx, centerValue, innerR * 1.85), cx, cy + 14);
}

export async function downloadTaxYearPdf(
  report: TaxYearReportData,
  currency: CurrencySymbol,
  lang: AppLanguage
): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const t = getTranslations(lang);
  const tr = t.taxReport;
  const pages: HTMLCanvasElement[] = [];

  const createPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    pages.push(canvas);
    return { canvas, ctx };
  };

  let { ctx } = createPage();
  let y = MARGIN_TOP;

  const ensureSpace = (neededH: number, onNewPage?: () => void) => {
    if (y + neededH > PAGE_H - MARGIN_BOTTOM) {
      ({ ctx } = createPage());
      y = MARGIN_TOP;
      if (onNewPage) onNewPage();
    }
  };

  const drawSectionHeading = (title: string, accentColor = '#16845B') => {
    ensureSpace(58);
    ctx.fillStyle = accentColor;
    drawRoundedRect(ctx, MARGIN_X, y + 4, 6, 26, 3);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#102A43';
    ctx.font = `700 24px ${FONT_STACK}`;
    ctx.fillText(title, MARGIN_X + 18, y);
    y += 42;
  };

  // --- PAGE 1 HEADER BANNER ---
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, 126, 18);
  ctx.fillStyle = '#0F766E';
  ctx.fill();
  ctx.fillStyle = '#16845B';
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W * 0.65, 126, 18);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#D1FAE5';
  ctx.font = `700 17px ${FONT_STACK}`;
  ctx.fillText(`OrthoGro · ${t.app.tagline}`, MARGIN_X + 28, y + 22);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 32px ${FONT_STACK}`;
  ctx.fillText(tr.title, MARGIN_X + 28, y + 48);

  ctx.fillStyle = '#ECFDF5';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.fillText(`${report.fyLabel}  ·  ${report.periodDisplay}`, MARGIN_X + 28, y + 89);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#D1FAE5';
  ctx.font = `500 16px ${FONT_STACK}`;
  ctx.fillText(
    `${tr.generatedOn}: ${formatDisplayDate(getTodayISO(), lang)}`,
    MARGIN_X + CONTENT_W - 28,
    y + 24
  );
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(report.fyLabel, MARGIN_X + CONTENT_W - 28, y + 54);
  y += 150;

  // --- KPI SUMMARY CARDS (4-up) ---
  const kpiGap = 16;
  const kpiW = (CONTENT_W - kpiGap * 3) / 4;
  const kpiH = 98;
  const kpis = [
    {
      label: tr.totalIncome,
      value: formatMoney(report.totalIncome, currency),
      bg: '#ECFDF5',
      border: '#A7F3D0',
      valColor: '#16845B',
    },
    {
      label: tr.totalExpense,
      value: formatMoney(report.totalExpense, currency),
      bg: '#FFF1F2',
      border: '#FECDD3',
      valColor: '#D94848',
    },
    {
      label: report.netSurplus >= 0 ? tr.netSurplus : tr.netDeficit,
      value: formatMoney(report.netSurplus, currency),
      bg: '#F8FAFC',
      border: '#CBD5E1',
      valColor: report.netSurplus >= 0 ? '#102A43' : '#D94848',
    },
    {
      label: tr.closingAssetsJune30,
      value: formatMoney(report.totalClosingAssets, currency),
      bg: '#EFF6FF',
      border: '#BFDBFE',
      valColor: '#1D4ED8',
    },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = MARGIN_X + idx * (kpiW + kpiGap);
    drawRoundedRect(ctx, kx, y, kpiW, kpiH, 14);
    ctx.fillStyle = kpi.bg;
    ctx.fill();
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#475569';
    ctx.font = `600 15px ${FONT_STACK}`;
    ctx.fillText(fitText(ctx, kpi.label, kpiW - 28), kx + 14, y + 18);

    ctx.fillStyle = kpi.valColor;
    ctx.font = `800 22px ${FONT_STACK}`;
    ctx.fillText(fitText(ctx, kpi.value, kpiW - 28), kx + 14, y + 50);
  });
  y += kpiH + 34;

  // --- PIE CHARTS SECTION (Income & Expense side by side) ---
  drawSectionHeading(tr.chartsTitle);

  const chartBoxGap = 20;
  const chartBoxW = (CONTENT_W - chartBoxGap) / 2;
  const maxLegendRows = Math.max(
    Math.min(report.incomeCategories.length, 8),
    Math.min(report.expenseCategories.length, 8),
    1
  );
  const chartBoxH = 264 + maxLegendRows * 30 + 24;
  ensureSpace(chartBoxH + 24);

  const drawPieCard = (
    x: number,
    cardY: number,
    title: string,
    slices: TaxCategorySlice[],
    total: number,
    emptyMsg: string,
    accent: string
  ) => {
    drawRoundedRect(ctx, x, cardY, chartBoxW, chartBoxH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#102A43';
    ctx.font = `700 20px ${FONT_STACK}`;
    ctx.fillText(title, x + 22, cardY + 20);

    ctx.textAlign = 'right';
    ctx.fillStyle = accent;
    ctx.font = `800 20px ${FONT_STACK}`;
    ctx.fillText(formatMoney(total, currency), x + chartBoxW - 22, cardY + 20);

    const pieCx = x + chartBoxW / 2;
    const pieCy = cardY + 152;
    drawDonutChartOnCanvas(
      ctx,
      pieCx,
      pieCy,
      90,
      50,
      slices,
      total,
      t.common.total,
      formatMoney(total, currency)
    );

    let ly = cardY + 266;
    if (slices.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.font = `500 16px ${FONT_STACK}`;
      ctx.fillText(emptyMsg, pieCx, ly + 8);
      return;
    }

    slices.slice(0, 8).forEach((slice) => {
      ctx.fillStyle = slice.color;
      drawRoundedRect(ctx, x + 22, ly + 5, 13, 13, 4);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#1E293B';
      ctx.font = `600 16px ${FONT_STACK}`;
      ctx.fillText(fitText(ctx, slice.category, chartBoxW - 225), x + 44, ly);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748B';
      ctx.font = `600 15px ${FONT_STACK}`;
      ctx.fillText(`${slice.pct.toFixed(1)}%`, x + chartBoxW - 140, ly + 1);

      ctx.fillStyle = '#102A43';
      ctx.font = `700 16px ${FONT_STACK}`;
      ctx.fillText(formatMoney(slice.amount, currency), x + chartBoxW - 22, ly);

      ly += 30;
    });
  };

  drawPieCard(
    MARGIN_X,
    y,
    tr.incomePieTitle,
    report.incomeCategories,
    report.totalIncome,
    tr.noIncomeInYear,
    '#16845B'
  );
  drawPieCard(
    MARGIN_X + chartBoxW + chartBoxGap,
    y,
    tr.expensePieTitle,
    report.expenseCategories,
    report.totalExpense,
    tr.noExpenseInYear,
    '#D94848'
  );

  y += chartBoxH + 34;

  // --- HELPER: PAGINATED TABLE RENDERER ---
  interface TableCol {
    label: string;
    width: number;
    align?: 'left' | 'right';
  }

  const drawPaginatedTable = (
    heading: string,
    accent: string,
    cols: TableCol[],
    rowsData: Array<Array<{ text: string; color?: string; bold?: boolean }>>,
    emptyText: string
  ) => {
    drawSectionHeading(heading, accent);

    const headerH = 40;
    const rowH = 36;

    const drawHeader = () => {
      drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, headerH, 8);
      ctx.fillStyle = '#F1F5F9';
      ctx.fill();

      let cx = MARGIN_X + 14;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#334155';
      ctx.font = `700 15px ${FONT_STACK}`;
      cols.forEach((col, i) => {
        const isLast = i === cols.length - 1;
        const usableW = col.width - (i === 0 ? 14 : 8) - (isLast ? 14 : 8);
        if (col.align === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(fitText(ctx, col.label, usableW), cx + col.width - (isLast ? 28 : 10), y + headerH / 2);
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(fitText(ctx, col.label, usableW), cx, y + headerH / 2);
        }
        cx += col.width;
      });
      y += headerH;
    };

    if (rowsData.length === 0) {
      ensureSpace(headerH + 46);
      drawHeader();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748B';
      ctx.font = `500 16px ${FONT_STACK}`;
      ctx.fillText(emptyText, MARGIN_X + 14, y + 22);
      y += 52;
      return;
    }

    ensureSpace(headerH + rowH);
    drawHeader();

    rowsData.forEach((rowCells, rIdx) => {
      ensureSpace(rowH, () => {
        drawHeader();
      });

      if (rIdx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(MARGIN_X, y, CONTENT_W, rowH);
      }

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, y + rowH);
      ctx.lineTo(MARGIN_X + CONTENT_W, y + rowH);
      ctx.stroke();

      let cx = MARGIN_X + 14;
      ctx.textBaseline = 'middle';
      cols.forEach((col, cIdx) => {
        const cell = rowCells[cIdx] || { text: '' };
        const isLast = cIdx === cols.length - 1;
        const usableW = col.width - (cIdx === 0 ? 14 : 8) - (isLast ? 14 : 8);
        ctx.fillStyle = cell.color || '#1E293B';
        ctx.font = `${cell.bold ? '700' : '500'} 15px ${FONT_STACK}`;

        if (col.align === 'right') {
          ctx.textAlign = 'right';
          ctx.fillText(
            fitText(ctx, cell.text, usableW),
            cx + col.width - (isLast ? 28 : 10),
            y + rowH / 2
          );
        } else {
          ctx.textAlign = 'left';
          ctx.fillText(fitText(ctx, cell.text, usableW), cx, y + rowH / 2);
        }
        cx += col.width;
      });
      y += rowH;
    });

    y += 28;
  };

  // --- CATEGORY BREAKDOWN TABLES ---
  const catCols: TableCol[] = [
    { label: tr.categoryHeader, width: 540 },
    { label: tr.entriesCount, width: 140, align: 'right' },
    { label: tr.shareHeader, width: 160, align: 'right' },
    { label: tr.amountHeader, width: CONTENT_W - 840, align: 'right' },
  ];

  drawPaginatedTable(
    tr.incomePieTitle,
    '#16845B',
    catCols,
    report.incomeCategories.map((c) => [
      { text: c.category, bold: true },
      { text: String(c.count), color: '#475569' },
      { text: `${c.pct.toFixed(1)}%`, color: '#475569' },
      { text: formatMoney(c.amount, currency), color: '#16845B', bold: true },
    ]),
    tr.noIncomeInYear
  );

  const expenseCatRows: Array<Array<{ text: string; color?: string; bold?: boolean }>> = [];
  report.expenseCategories.forEach((c) => {
    expenseCatRows.push([
      { text: c.category, bold: true },
      { text: String(c.count), color: '#475569' },
      { text: `${c.pct.toFixed(1)}%`, color: '#475569' },
      { text: formatMoney(c.amount, currency), color: '#D94848', bold: true },
    ]);
    c.subCategories.forEach((sub) => {
      expenseCatRows.push([
        { text: `   ↳ ${sub.name}`, color: '#64748B' },
        { text: String(sub.count), color: '#64748B' },
        { text: '—', color: '#94A3B8' },
        { text: formatMoney(sub.amount, currency), color: '#475569' },
      ]);
    });
  });

  drawPaginatedTable(
    tr.expensePieTitle,
    '#D94848',
    catCols,
    expenseCatRows,
    tr.noExpenseInYear
  );

  // --- DETAILED INCOME & EXPENSE LEDGERS ---
  const ledgerCols: TableCol[] = [
    { label: tr.dateCol, width: 145 },
    { label: tr.catCol, width: 250 },
    { label: tr.titleCol, width: 325 },
    { label: tr.accountCol, width: 170 },
    { label: tr.amountHeader, width: CONTENT_W - 890, align: 'right' },
  ];

  drawPaginatedTable(
    `${tr.detailedLedgerTitle} · ${tr.incomeTab}`,
    '#16845B',
    ledgerCols,
    report.incomeTransactions.map((tx) => [
      { text: tx.displayDate, color: '#475569' },
      { text: tx.subCategory ? `${tx.category} (${tx.subCategory})` : tx.category },
      { text: tx.title, bold: true },
      { text: tx.account, color: '#475569' },
      { text: formatMoney(tx.amount, currency), color: '#16845B', bold: true },
    ]),
    tr.noIncomeInYear
  );

  drawPaginatedTable(
    `${tr.detailedLedgerTitle} · ${tr.expenseTab}`,
    '#D94848',
    ledgerCols,
    report.expenseTransactions.map((tx) => [
      { text: tx.displayDate, color: '#475569' },
      { text: tx.subCategory ? `${tx.category} (${tx.subCategory})` : tx.category },
      { text: tx.title, bold: true },
      { text: tx.account, color: '#475569' },
      { text: formatMoney(tx.amount, currency), color: '#D94848', bold: true },
    ]),
    tr.noExpenseInYear
  );

  // --- CLOSING BALANCES AS OF JUNE 30 ---
  const closingCols: TableCol[] = [
    { label: tr.typeCol, width: 280 },
    { label: tr.accountCol, width: 520 },
    { label: tr.amountHeader, width: CONTENT_W - 800, align: 'right' },
  ];

  const closingRows: Array<Array<{ text: string; color?: string; bold?: boolean }>> = [
    ...report.closingWallets.map((w) => [
      { text: tr.walletsGroup, color: '#475569' },
      { text: w.name, bold: true },
      { text: formatMoney(w.balance, currency), color: '#102A43', bold: true },
    ]),
    ...report.closingSavings.map((s) => [
      { text: tr.savingsGroup, color: '#475569' },
      { text: s.name, bold: true },
      { text: formatMoney(s.balance, currency), color: '#1D4ED8', bold: true },
    ]),
    [
      { text: tr.totalClosingLabel, bold: true, color: '#16845B' },
      {
        text: `${tr.walletsGroup}: ${formatMoney(report.totalClosingWallets, currency)}  |  ${tr.savingsGroup}: ${formatMoney(report.totalClosingSavings, currency)}`,
        color: '#475569',
      },
      { text: formatMoney(report.totalClosingAssets, currency), color: '#16845B', bold: true },
    ],
  ];

  drawPaginatedTable(
    `${tr.closingBalancesTitle} (${formatDisplayDate(report.endDate, lang)})`,
    '#1D4ED8',
    closingCols,
    closingRows,
    '—'
  );

  // --- LENT & BORROWED SUMMARY ---
  const lbCols: TableCol[] = [
    { label: tr.catCol, width: 760 },
    { label: tr.amountHeader, width: CONTENT_W - 760, align: 'right' },
  ];
  const lbSummaryRows: Array<Array<{ text: string; color?: string; bold?: boolean }>> = [
    [
      { text: tr.lentInYear },
      { text: formatMoney(report.lendBorrow.lentInYear, currency), color: '#0284C7', bold: true },
    ],
    [
      { text: tr.recoveredInYear },
      { text: formatMoney(report.lendBorrow.lentRecoveredInYear, currency), color: '#16845B', bold: true },
    ],
    [
      { text: tr.borrowedInYear },
      { text: formatMoney(report.lendBorrow.borrowedInYear, currency), color: '#D97706', bold: true },
    ],
    [
      { text: tr.repaidInYear },
      { text: formatMoney(report.lendBorrow.repaidInYear, currency), color: '#16845B', bold: true },
    ],
    [
      { text: tr.receivableJune30, bold: true },
      {
        text: formatMoney(report.lendBorrow.outstandingReceivableAsOfJune30, currency),
        color: '#0284C7',
        bold: true,
      },
    ],
    [
      { text: tr.payableJune30, bold: true },
      {
        text: formatMoney(report.lendBorrow.outstandingPayableAsOfJune30, currency),
        color: '#D97706',
        bold: true,
      },
    ],
  ];

  drawPaginatedTable(tr.lendBorrowTitle, '#0284C7', lbCols, lbSummaryRows, '—');

  const openDebtRows: Array<Array<{ text: string; color?: string; bold?: boolean }>> = [
    ...report.lendBorrow.openReceivables.map((d) => [
      { text: tr.openReceivables, color: '#0284C7', bold: true },
      { text: `${d.title} (${d.date})`, bold: true },
      { text: d.account, color: '#475569' },
      { text: formatMoney(d.originalAmount, currency), color: '#64748B' },
      { text: formatMoney(d.dueAmount, currency), color: '#0284C7', bold: true },
    ]),
    ...report.lendBorrow.openPayables.map((d) => [
      { text: tr.openPayables, color: '#D97706', bold: true },
      { text: `${d.title} (${d.date})`, bold: true },
      { text: d.account, color: '#475569' },
      { text: formatMoney(d.originalAmount, currency), color: '#64748B' },
      { text: formatMoney(d.dueAmount, currency), color: '#D97706', bold: true },
    ]),
  ];

  if (openDebtRows.length > 0) {
    const openDebtCols: TableCol[] = [
      { label: tr.typeCol, width: 255 },
      { label: tr.titleCol, width: 325 },
      { label: tr.accountCol, width: 170 },
      { label: tr.originalAmt, width: 165, align: 'right' },
      { label: tr.dueAmt, width: CONTENT_W - 915, align: 'right' },
    ];
    drawPaginatedTable(
      `${tr.openReceivables} / ${tr.openPayables}`,
      '#D97706',
      openDebtCols,
      openDebtRows,
      tr.noOpenLendBorrow
    );
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = pages.length;
  pages.forEach((canvas, idx) => {
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return;
    pCtx.strokeStyle = '#E2E8F0';
    pCtx.lineWidth = 1;
    pCtx.beginPath();
    pCtx.moveTo(MARGIN_X, PAGE_H - 52);
    pCtx.lineTo(MARGIN_X + CONTENT_W, PAGE_H - 52);
    pCtx.stroke();

    pCtx.textBaseline = 'middle';
    pCtx.fillStyle = '#64748B';
    pCtx.font = `500 14px ${FONT_STACK}`;
    pCtx.textAlign = 'left';
    pCtx.fillText(`OrthoGro · ${tr.title} (${report.fyLabel})`, MARGIN_X, PAGE_H - 30);

    pCtx.textAlign = 'right';
    pCtx.fillText(
      `${tr.pageLabel} ${idx + 1} ${tr.ofLabel} ${totalPages}`,
      MARGIN_X + CONTENT_W,
      PAGE_H - 30
    );
  });

  // Assemble A4 PDF with jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();

  pages.forEach((canvas, idx) => {
    if (idx > 0) doc.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    doc.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  });

  doc.save(`OrthoGro-Tax-Report-FY${report.fyCode}.pdf`);
}
