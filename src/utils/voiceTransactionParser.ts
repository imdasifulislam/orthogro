import type { TransactionDraft } from '../types';
import { getTodayISO } from './format';

export interface VoiceParseResult {
  drafts: TransactionDraft[];
  matchedFieldsCount: number;
}

const BENGALI_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export function normalizeSpokenNumbers(input: string): string {
  return input.replace(/[০-৯]/g, (d) => BENGALI_DIGITS[d] || d);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getOffsetDateISO(deltaDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ACCOUNT_ALIASES: Record<string, string[]> = {
  bank: ['bank', 'ব্যাংক', 'ব্যাংকে', 'ব্যাংক থেকে'],
  bkash: ['bkash', 'bKash', 'b cash', 'bikash', 'বিকাশ', 'বিকাশে', 'বিকাশ থেকে'],
  nagad: ['nagad', 'nogod', 'নগদ', 'নগদে', 'নগদ থেকে'],
  cash: ['cash', 'hand cash', 'pocket', 'ক্যাশ', 'নগদ টাকা', 'হাতে'],
  rocket: ['rocket', 'রকেট'],
  upay: ['upay', 'উপায়'],
  'emergency fund': ['emergency fund', 'emergency', 'জরুরি তহবিল'],
  deposit: ['deposit', 'dps', 'fdr', 'ডিপোজিট'],
  'hobby/want': ['hobby/want', 'hobby', 'want', 'wishlist', 'হবি'],
  hobby: ['hobby', 'want', 'হবি'],
  invest: ['invest', 'investment', 'বিনিয়োগ', 'ইনভেস্ট'],
  saving: ['saving', 'savings', 'সঞ্চয়'],
  savings: ['savings', 'saving', 'সঞ্চয়'],
  samity: ['samity', 'somiti', 'সমিতি'],
};

const SUBCATEGORY_KEYWORDS: Array<{ subKeywords: string[]; matchers: string[] }> = [
  {
    subKeywords: ['groceries', 'grocery', 'bazar'],
    matchers: [
      'groceries',
      'grocery',
      'bazar',
      'bazaar',
      'supermarket',
      'market',
      'vegetable',
      'vegetables',
      'fish',
      'meat',
      'chicken',
      'rice',
      'milk',
      'fruit',
      'fruits',
      'বাজার',
      'সবজি',
      'মাছ',
      'মাংস',
      'চাল',
      'দুধ',
      'ফল',
      'মুদি',
    ],
  },
  {
    subKeywords: ['utilities', 'bills', 'bill'],
    matchers: [
      'utility',
      'utilities',
      'electricity',
      'electric',
      'gas',
      'water',
      'internet',
      'wifi',
      'broadband',
      'mobile recharge',
      'recharge',
      'bill',
      'bills',
      'current bill',
      'বিদ্যুৎ',
      'গ্যাস',
      'পানি',
      'ইন্টারনেট',
      'ওয়াইফাই',
      'বিল',
      'রিচার্জ',
    ],
  },
  {
    subKeywords: ['rent', 'housing'],
    matchers: ['house rent', 'flat rent', 'apartment', 'rent', 'housing', 'বাসা ভাড়া', 'বাড়ি ভাড়া'],
  },
  {
    subKeywords: ['healthcare', 'health', 'medical'],
    matchers: [
      'healthcare',
      'health',
      'doctor',
      'medicine',
      'pharmacy',
      'hospital',
      'clinic',
      'medical',
      'test',
      'ডাক্তার',
      'ওষুধ',
      'হাসপাতাল',
      'চিকিৎসা',
    ],
  },
  {
    subKeywords: ['education', 'school', 'tuition'],
    matchers: [
      'education',
      'school',
      'college',
      'university',
      'tuition',
      'exam',
      'stationery',
      'স্কুল',
      'কলেজ',
      'টিউশন',
      'পড়াশোনা',
    ],
  },
  {
    subKeywords: ['household', 'home'],
    matchers: ['household', 'furniture', 'detergent', 'cleaning', 'repair', 'সংসার', 'গৃহস্থালি'],
  },
  {
    subKeywords: ['food', 'dining'],
    matchers: ['food', 'lunch', 'dinner', 'breakfast', 'coffee', 'tea', 'snack', 'snacks', 'restaurant', 'cafe', 'খাবার', 'নাস্তা', 'চা', 'কফি'],
  },
  {
    subKeywords: ['apparel', 'clothing', 'clothes'],
    matchers: ['apparel', 'clothes', 'clothing', 'shirt', 'pant', 'pants', 'shoes', 'dress', 'jacket', 'panjabi', 'saree', 'পোশাক', 'জামা', 'জুতা'],
  },
  {
    subKeywords: ['career', 'work', 'study'],
    matchers: ['career', 'course', 'book', 'books', 'training', 'certification', 'laptop', 'software', 'ক্যারিয়ার', 'কোর্স', 'বই'],
  },
];

const EXPENSE_CAT_SYNONYMS: Array<{ catKeywords: string[]; matchers: string[] }> = [
  {
    catKeywords: ['family maintenance', 'family'],
    matchers: [
      'family',
      'home',
      'grocery',
      'groceries',
      'bazar',
      'utility',
      'electricity',
      'rent',
      'household',
      'doctor',
      'medicine',
      'education',
      'school',
      'tuition',
      'পরিবার',
      'বাজার',
    ],
  },
  {
    catKeywords: ['relative', 'relatives'],
    matchers: ['relative', 'relatives', 'parents', 'mother', 'father', 'brother', 'sister', 'আত্মীয়', 'বাবা', 'মা'],
  },
  {
    catKeywords: ['personal'],
    matchers: [
      'personal',
      'food',
      'lunch',
      'dinner',
      'breakfast',
      'coffee',
      'tea',
      'snack',
      'snacks',
      'shopping',
      'apparel',
      'clothes',
      'shirt',
      'shoes',
      'career',
      'course',
      'book',
      'books',
      'training',
      'haircut',
      'rickshaw',
      'uber',
      'pathao',
      'bus',
      'cng',
      'transport',
      'travel',
      'fuel',
      'ব্যক্তিগত',
      'খাবার',
      'চা',
      'কফি',
      'নাস্তা',
      'পোশাক',
      'জামা',
      'ক্যারিয়ার',
      'কোর্স',
      'রিকশা',
      'বাস',
      'ভাড়া',
      'শপিং',
    ],
  },
  {
    catKeywords: ['sadakah', 'charity', 'donation'],
    matchers: ['sadakah', 'sadaka', 'zakat', 'charity', 'donation', 'donate', 'poor', 'দান', 'সদকা', 'যাকাত'],
  },
  {
    catKeywords: ['entertainment', 'fun', 'leisure'],
    matchers: ['entertainment', 'movie', 'cinema', 'netflix', 'spotify', 'game', 'games', 'concert', 'outing', 'tour', 'hangout', 'বিনোদন', 'সিনেমা', 'মুভি', 'গেম'],
  },
];

const INCOME_CAT_SYNONYMS: Array<{ catKeywords: string[]; matchers: string[] }> = [
  { catKeywords: ['salary'], matchers: ['salary', 'paycheck', 'wage', 'wages', 'বেতন'] },
  { catKeywords: ['business'], matchers: ['business', 'sales', 'client', 'profit', 'revenue', 'ব্যবসা', 'লাভ'] },
  {
    catKeywords: ['investment return', 'investment'],
    matchers: ['investment return', 'dividend', 'interest', 'return', 'stock', 'mutual fund', 'মুনাফা', 'লভ্যাংশ'],
  },
  { catKeywords: ['freelance'], matchers: ['freelance', 'freelancing', 'fiverr', 'upwork', 'project', 'ফ্রিল্যান্স', 'প্রজেক্ট'] },
  { catKeywords: ['rental', 'rent'], matchers: ['rental', 'tenant', 'rent received', 'ভাড়া পেয়েছি'] },
  { catKeywords: ['festival bonus', 'bonus'], matchers: ['festival bonus', 'eid bonus', 'puja bonus', 'bonus', 'incentive', 'উৎসব বোনাস', 'ঈদ বোনাস', 'বোনাস'] },
  { catKeywords: ['gift'], matchers: ['gift', 'salami', 'present', 'উপহার', 'সালামি'] },
];

interface AccountMatch {
  account: string;
  index: number;
  matchedText: string;
}

function findAccountMatches(text: string, allAccountOptions: string[]): AccountMatch[] {
  const lower = text.toLowerCase();
  const matches: AccountMatch[] = [];

  for (const acc of allAccountOptions) {
    const accLower = acc.toLowerCase();
    const candidates = new Set<string>([accLower]);

    for (const [aliasKey, aliases] of Object.entries(ACCOUNT_ALIASES)) {
      if (accLower === aliasKey || accLower.includes(aliasKey)) {
        aliases.forEach((a) => candidates.add(a.toLowerCase()));
      }
    }

    let bestIdx = -1;
    let bestToken = '';

    for (const token of candidates) {
      if (!token) continue;
      const idx = lower.indexOf(token);
      if (idx !== -1) {
        // Prefer word-boundary-like matches for ASCII words to avoid partial false positives
        const isAscii = /^[a-z0-9\s]+$/.test(token);
        if (isAscii) {
          const re = new RegExp(`(?:^|\\s)${escapeRegExp(token)}(?:$|\\s|[.,!?])`, 'i');
          const m = re.exec(lower);
          if (m) {
            const actualIdx = m.index + (m[0].startsWith(' ') ? 1 : 0);
            if (bestIdx === -1 || actualIdx < bestIdx) {
              bestIdx = actualIdx;
              bestToken = token;
            }
          }
        } else if (bestIdx === -1 || idx < bestIdx) {
          bestIdx = idx;
          bestToken = token;
        }
      }
    }

    if (bestIdx !== -1) {
      matches.push({ account: acc, index: bestIdx, matchedText: bestToken });
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

function includesKeyword(lowerText: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const isAscii = /^[a-z0-9\s]+$/.test(kw);
    if (isAscii) {
      return new RegExp(`(?:^|\\s)${escapeRegExp(kw)}(?:$|\\s|[.,!?])`, 'i').test(lowerText);
    }
    return lowerText.includes(kw);
  });
}

function cleanAndCapitalizeTitle(raw: string): string {
  const trimmed = raw
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–—:;•]+|[\s,.\-–—:;•]+$/g, '')
    .trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function parseSingleClause(
  clause: string,
  options: {
    allAccountOptions: string[];
    expenseCategories: string[];
    incomeCategories: string[];
    expenseSubCategories?: Record<string, string[]>;
    defaultEntry: TransactionDraft;
  }
): { draft: TransactionDraft; matchedFieldsCount: number } {
  const {
    allAccountOptions,
    expenseCategories,
    incomeCategories,
    expenseSubCategories,
    defaultEntry,
  } = options;

  const normalized = normalizeSpokenNumbers(clause).trim();
  const lower = normalized.toLowerCase();
  let matchedFieldsCount = 0;

  // 1. Detect date
  let date = defaultEntry.date || getTodayISO();
  if (
    includesKeyword(lower, ['day before yesterday', 'পরশু'])
  ) {
    date = getOffsetDateISO(-2);
    matchedFieldsCount += 1;
  } else if (includesKeyword(lower, ['yesterday', 'গতকাল', 'কালকে'])) {
    date = getOffsetDateISO(-1);
    matchedFieldsCount += 1;
  } else if (includesKeyword(lower, ['today', 'আজ', 'আজকে'])) {
    date = getTodayISO();
    matchedFieldsCount += 1;
  }

  // 2. Detect optional transfer fee/charge first
  let chargeStr = '';
  let useCharge = false;
  let workingForAmount = normalized;
  const chargeRegex = /(?:charge|fee|চার্জ|ফি)\s*(?:of|:)?\s*(\d[\d,]*(?:\.\d+)?)/i;
  const chargeMatch = chargeRegex.exec(workingForAmount);
  if (chargeMatch) {
    chargeStr = chargeMatch[1].replace(/,/g, '');
    useCharge = Number(chargeStr) > 0;
    workingForAmount = workingForAmount.replace(chargeMatch[0], ' ');
  }

  // 3. Detect main numeric amount
  let amount = '';
  const amountMatches = Array.from(workingForAmount.matchAll(/(?:৳|\$|€|£|₹)?\s*(\d[\d,]*(?:\.\d+)?)/g));
  if (amountMatches.length > 0) {
    amount = amountMatches[0][1].replace(/,/g, '');
    matchedFieldsCount += 1;
  }

  // 4. Detect account matches
  const accountMatches = findAccountMatches(normalized, allAccountOptions);
  if (accountMatches.length > 0) matchedFieldsCount += 1;

  // 5. Detect transaction type
  const hasTransferWords = includesKeyword(lower, [
    'transfer',
    'transferred',
    'move',
    'moved',
    'send',
    'sent',
    'cash out',
    'ট্রান্সফার',
    'পাঠিয়েছি',
    'পাঠালাম',
    'পাঠিয়েছি',
  ]);
  const hasLendWords = includesKeyword(lower, [
    'lend',
    'lent',
    'loaned',
    'gave loan',
    'ধার দিয়েছি',
    'ধার দিলাম',
    'ধার দিয়েছি',
  ]);
  const hasBorrowWords = includesKeyword(lower, [
    'borrow',
    'borrowed',
    'took loan',
    'ধার নিয়েছি',
    'ধার নিলাম',
    'ধার নিয়েছি',
  ]);
  const hasIncomeWords = includesKeyword(lower, [
    'income',
    'received',
    'earned',
    'salary',
    'bonus',
    'freelance',
    'dividend',
    'profit',
    'refund',
    'আয়',
    'আয়',
    'বেতন',
    'পেয়েছি',
    'পেলাম',
    'পেয়েছি',
    'বোনাস',
  ]);

  let type: TransactionDraft['type'] = 'expense';
  if (hasTransferWords || (accountMatches.length >= 2 && (lower.includes(' to ') || lower.includes(' থেকে ')))) {
    type = 'transfer';
    matchedFieldsCount += 1;
  } else if (hasLendWords) {
    type = 'lend';
    matchedFieldsCount += 1;
  } else if (hasBorrowWords) {
    type = 'borrow';
    matchedFieldsCount += 1;
  } else if (hasIncomeWords) {
    type = 'income';
    matchedFieldsCount += 1;
  }

  // 6. Assign wallets
  let wallet = defaultEntry.wallet || allAccountOptions[0] || 'Cash';
  let fromWallet = defaultEntry.fromWallet || allAccountOptions[0] || 'Bank';
  let toWallet = defaultEntry.toWallet || allAccountOptions[1] || allAccountOptions[0] || 'Cash';

  if (type === 'transfer') {
    if (accountMatches.length >= 2) {
      fromWallet = accountMatches[0].account;
      toWallet = accountMatches[1].account;
    } else if (accountMatches.length === 1) {
      const only = accountMatches[0];
      const beforeText = lower.slice(0, only.index);
      if (/\bto\b\s*$/i.test(beforeText) || /এ\s*$/.test(beforeText) || /তে\s*$/.test(beforeText)) {
        toWallet = only.account;
        if (fromWallet === toWallet) {
          fromWallet = allAccountOptions.find((a) => a !== toWallet) || fromWallet;
        }
      } else {
        fromWallet = only.account;
        if (toWallet === fromWallet) {
          toWallet = allAccountOptions.find((a) => a !== fromWallet) || toWallet;
        }
      }
    }
  } else if (accountMatches.length >= 1) {
    wallet = accountMatches[0].account;
  }

  // 7. Match category & sub-category
  let category =
    type === 'income'
      ? incomeCategories[0] || 'Others'
      : expenseCategories[0] || 'Others';
  let subCategory = '';

  if (type === 'expense') {
    let matchedSub = false;

    // 7a. Direct match against user's configured expenseSubCategories
    if (expenseSubCategories) {
      for (const parentCat of expenseCategories) {
        const subs = expenseSubCategories[parentCat] || [];
        for (const sub of subs) {
          if (includesKeyword(lower, [sub.toLowerCase()])) {
            category = parentCat;
            subCategory = sub;
            matchedSub = true;
            matchedFieldsCount += 1;
            break;
          }
        }
        if (matchedSub) break;
      }

      // 7b. Synonym match against user's configured expenseSubCategories
      if (!matchedSub) {
        for (const rule of SUBCATEGORY_KEYWORDS) {
          if (includesKeyword(lower, rule.matchers)) {
            for (const parentCat of expenseCategories) {
              const subs = expenseSubCategories[parentCat] || [];
              const foundSub = subs.find((s) =>
                rule.subKeywords.some((kw) => s.toLowerCase().includes(kw))
              );
              if (foundSub) {
                category = parentCat;
                subCategory = foundSub;
                matchedSub = true;
                matchedFieldsCount += 1;
                break;
              }
            }
          }
          if (matchedSub) break;
        }
      }
    }

    // 7c. Direct match against expenseCategories
    if (!matchedSub) {
      const directExp = expenseCategories.find((c) => includesKeyword(lower, [c.toLowerCase()]));
      if (directExp) {
        category = directExp;
        matchedFieldsCount += 1;
      } else {
        // 7d. Synonym match against expenseCategories
        for (const rule of EXPENSE_CAT_SYNONYMS) {
          if (includesKeyword(lower, rule.matchers)) {
            const matchedCat = expenseCategories.find((c) =>
              rule.catKeywords.some((kw) => c.toLowerCase().includes(kw))
            );
            if (matchedCat) {
              category = matchedCat;
              matchedFieldsCount += 1;
              break;
            }
          }
        }
      }
    }
  } else if (type === 'income') {
    const directInc = incomeCategories.find((c) => includesKeyword(lower, [c.toLowerCase()]));
    if (directInc) {
      category = directInc;
      matchedFieldsCount += 1;
    } else {
      for (const rule of INCOME_CAT_SYNONYMS) {
        if (includesKeyword(lower, rule.matchers)) {
          const matchedCat = incomeCategories.find((c) =>
            rule.catKeywords.some((kw) => c.toLowerCase().includes(kw))
          );
          if (matchedCat) {
            category = matchedCat;
            matchedFieldsCount += 1;
            break;
          }
        }
      }
    }
  }

  // 8. Extract clean Title
  let titleText = normalized;
  if (chargeMatch) {
    titleText = titleText.replace(chargeMatch[0], ' ');
  }
  if (amountMatches.length > 0) {
    titleText = titleText.replace(amountMatches[0][0], ' ');
  }
  for (const am of accountMatches) {
    titleText = titleText.replace(new RegExp(escapeRegExp(am.matchedText), 'ig'), ' ');
    titleText = titleText.replace(new RegExp(escapeRegExp(am.account), 'ig'), ' ');
  }

  // Strip filler command words, currency words, date words, and prepositions
  const fillerAscii = [
    'spent',
    'spend',
    'paid',
    'pay',
    'bought',
    'buy',
    'received',
    'receive',
    'earned',
    'earn',
    'transfer',
    'transferred',
    'move',
    'moved',
    'send',
    'sent',
    'lent',
    'lend',
    'loaned',
    'borrowed',
    'borrow',
    'expense',
    'income',
    'taka',
    'tk',
    'bdt',
    'usd',
    'dollar',
    'dollars',
    'euro',
    'inr',
    'rupees',
    'today',
    'yesterday',
    'day before yesterday',
    'for',
    'on',
    'from',
    'to',
    'in',
    'into',
    'via',
    'using',
    'by',
    'at',
    'with',
    'a',
    'an',
    'the',
    'my',
  ];
  const fillerPattern = new RegExp(`\\b(?:${fillerAscii.join('|')})\\b`, 'gi');
  titleText = titleText.replace(fillerPattern, ' ');

  const fillerBn = [
    'টাকা',
    'খরচ',
    'করেছি',
    'করলাম',
    'দিয়েছি',
    'দিয়েছি',
    'দিলাম',
    'কিনেছি',
    'কিনলাম',
    'পেয়েছি',
    'পেয়েছি',
    'পেলাম',
    'পাঠিয়েছি',
    'পাঠিয়েছি',
    'পাঠালাম',
    'ট্রান্সফার',
    'ধার দিয়েছি',
    'ধার দিলাম',
    'ধার দিয়েছি',
    'ধার নিয়েছি',
    'ধার নিয়েছি',
    'ধার নিলাম',
    'আজকে',
    'আজ',
    'গতকাল',
    'কালকে',
    'পরশু',
    'থেকে',
    'দিয়ে',
    'দিয়ে',
    'জন্য',
    'বাবদ',
    'তে',
  ];
  for (const bnWord of fillerBn) {
    titleText = titleText.split(bnWord).join(' ');
  }

  let title = cleanAndCapitalizeTitle(titleText);
  if (!title) {
    if (type === 'transfer') {
      title = `${fromWallet} → ${toWallet}`;
    } else if (type === 'income') {
      title = category;
    } else if (type === 'expense') {
      title = subCategory || category;
    }
  }

  return {
    draft: {
      ...defaultEntry,
      id: null,
      type,
      date,
      wallet,
      fromWallet,
      toWallet,
      useCharge,
      charge: chargeStr,
      category,
      subCategory,
      title,
      amount,
      note: '',
    },
    matchedFieldsCount,
  };
}

export function parseVoiceTransactionCommand(
  transcript: string,
  options: {
    allAccountOptions: string[];
    expenseCategories: string[];
    incomeCategories: string[];
    expenseSubCategories?: Record<string, string[]>;
    defaultEntry: TransactionDraft;
  }
): VoiceParseResult {
  const cleaned = normalizeSpokenNumbers(transcript).trim();
  if (!cleaned) {
    return { drafts: [], matchedFieldsCount: 0 };
  }

  // Split into multiple clauses if user spoke multiple transactions connected by "and" / ";" / "এবং" / "আর"
  // only when at least 2 parts contain a numeric amount
  const candidateParts = cleaned
    .split(/\s*(?:;|\band\b|&|এবং|আর)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const partsWithAmounts = candidateParts.filter((part) => /\d/.test(part));
  const clauses = partsWithAmounts.length >= 2 ? partsWithAmounts : [cleaned];

  const results = clauses.map((clause) => parseSingleClause(clause, options));
  const totalMatched = results.reduce((sum, r) => sum + r.matchedFieldsCount, 0);

  return {
    drafts: results.map((r) => r.draft),
    matchedFieldsCount: totalMatched,
  };
}
