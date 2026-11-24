import type { CurrencyCode, LanguageCode } from '../shared/types';

const RATES_FROM_INR: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
};

export function convertFromInr(amountInInr: number, to: CurrencyCode): number {
  if (to === 'INR') return Math.round(amountInInr);
  return Math.round(amountInInr * RATES_FROM_INR[to]);
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  sourceCurrency: CurrencyCode = 'INR',
): string {
  const inInr =
    sourceCurrency === 'INR' ? amount : Math.round(amount / RATES_FROM_INR[sourceCurrency]);
  const converted = convertFromInr(inInr, currency);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(converted);
}

export function safeExternalUrl(rawUrl: string | undefined | null, fallback = 'https://www.amazon.in'): string {
  if (!rawUrl || typeof rawUrl !== 'string') return fallback;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export const TRANSLATIONS = {
  en: {
    brand: 'BuySmart AI',
    tagline: 'Search smarter. Compare better. Buy confidently.',
    heroHeading: 'Buy better. Spend less.',
    heroSub: 'Your personal AI shopping assistant. Discover, compare and find the right products for your needs.',
    searchPlaceholder: 'Ask e.g. "Best smartphone under ₹20,000"',
    searchButton: 'Research',
    navExplore: 'Explore',
    navCompare: 'Compare',
    navPriceTracker: 'Price tracker',
    navCartOptimizer: 'Cart optimizer',
    navSaved: 'Saved',
    signIn: 'Sign in',
    signOut: 'Sign out',
    buySmartScore: 'BuySmart Score',
    compareBtn: 'Compare',
    comparedBtn: 'In compare',
    saveBtn: 'Save',
    savedBtn: 'Saved',
    alertBtn: 'Price alert',
    visitStore: 'Visit store',
    filters: 'Filters',
    sortRelevance: 'Relevance',
    sortScore: 'BuySmart Score',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortRating: 'Customer Rating',
    aiAssistant: 'AI Shopping Assistant',
    askFollowUp: 'Ask about trade-offs, cheaper alternatives, or specs...',
    howItWorksTitle: 'How BuySmart AI evaluates every option',
    dealsTitle: 'Recently verified deals',
    categoriesTitle: 'Explore categories',
    faqTitle: 'Frequently asked questions',
    safetyTitle: 'Shopping safety and verification',
  },
  hi: {
    brand: 'BuySmart AI',
    tagline: 'समझदारी से खोजें। बेहतर तुलना करें। भरोसे से खरीदें।',
    heroHeading: 'बेहतर खरीदें। कम खर्च करें।',
    heroSub: 'आपका पर्सनल AI शॉपिंग असिस्टेंट। अपनी ज़रूरत के अनुसार सही उत्पाद खोजें, तुलना करें और चुनें।',
    searchPlaceholder: 'सरल भाषा में पूछें, जैसे "₹20,000 से कम में बेस्ट स्मार्टफोन" या "₹80,000 में गेमिंग सेटअप"',
    searchButton: 'खोजें',
    navExplore: 'एक्सप्लोर',
    navCompare: 'तुलना',
    navPriceTracker: 'प्राइस ट्रैकर',
    navCartOptimizer: 'कार्ट ऑप्टिमाइज़र',
    navSaved: 'सेव किए गए',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    buySmartScore: 'BuySmart स्कोर',
    compareBtn: 'तुलना करें',
    comparedBtn: 'तुलना में',
    saveBtn: 'सेव करें',
    savedBtn: 'सेव किया गया',
    alertBtn: 'प्राइस अलर्ट',
    visitStore: 'स्टोर देखें',
    filters: 'फ़िल्टर',
    sortRelevance: 'प्रासंगिकता',
    sortScore: 'BuySmart स्कोर',
    sortPriceAsc: 'कीमत: कम से ज़्यादा',
    sortPriceDesc: 'कीमत: ज़्यादा से कम',
    sortRating: 'ग्राहक रेटिंग',
    aiAssistant: 'AI शॉपिंग असिस्टेंट',
    askFollowUp: 'तुलना, सस्ते विकल्प या स्पेसिफिकेशन के बारे में पूछें...',
    howItWorksTitle: 'BuySmart AI हर उत्पाद की जांच कैसे करता है',
    dealsTitle: 'हाल ही में सत्यापित डील्स',
    categoriesTitle: 'श्रेणियां देखें',
    faqTitle: 'अक्सर पूछे जाने वाले सवाल',
    safetyTitle: 'खरीदारी सुरक्षा और सत्यापन',
  },
} as const;
